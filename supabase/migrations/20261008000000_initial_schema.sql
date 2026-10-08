-- ================================================================
-- STAFF MANAGER - SUPABASE SCHEMA (Migration 001)
-- ================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------
-- 1. Generic trigger: audit fields + revision (for synced org tables)
-- ---------------------------------------------------------------
create or replace function public.set_audit_fields() returns trigger
language plpgsql as $$
begin
  if tg_op = 'INSERT' then
    new.created_at := coalesce(new.created_at, now());
    new.created_by := coalesce(new.created_by, auth.uid());
    new.revision := 1;
  else
    new.revision := old.revision + 1;
    new.created_at := old.created_at;
    new.created_by := old.created_by;
    new.org_id := old.org_id;
  end if;
  new.updated_at := now();
  new.updated_by := auth.uid();
  return new;
end $$;

-- ---------------------------------------------------------------
-- 2. Accounts and organizations
-- ---------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  phone text,
  language text default 'en',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', ''));
  return new;
end $$;

create or replace trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  business_type text not null default 'other',
  currency text not null default 'INR',
  country text,
  week_start int not null default 1,
  settings jsonb not null default '{}'::jsonb,
  logo_path text,
  owner_id uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists public.memberships (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('owner','manager','supervisor','accountant','viewer')),
  assigned_site_ids uuid[] not null default '{}',
  status text not null default 'active' check (status in ('active','suspended')),
  created_at timestamptz not null default now(),
  unique (org_id, user_id)
);
create index if not exists memberships_user_idx on public.memberships(user_id);

create table if not exists public.invites (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  code text not null unique default encode(gen_random_bytes(6), 'hex'),
  role text not null check (role in ('manager','supervisor','accountant','viewer')),
  assigned_site_ids uuid[] not null default '{}',
  expires_at timestamptz not null default (now() + interval '7 days'),
  max_uses int not null default 1,
  used_count int not null default 0,
  created_by uuid references auth.users(id) default auth.uid(),
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.devices (
  id uuid primary key,                       -- generated on the client
  user_id uuid not null references auth.users(id) on delete cascade,
  org_id uuid references public.organizations(id) on delete cascade,
  name text,
  platform text,
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------
-- 3. Permission helper functions (security definer avoids RLS recursion)
-- ---------------------------------------------------------------
create or replace function public.is_org_member(p_org uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.memberships m
    where m.org_id = p_org and m.user_id = auth.uid() and m.status = 'active'
  );
$$;

create or replace function public.org_role(p_org uuid) returns text
language sql stable security definer set search_path = public as $$
  select m.role from public.memberships m
  where m.org_id = p_org and m.user_id = auth.uid() and m.status = 'active'
  limit 1;
$$;

create or replace function public.has_org_role(p_org uuid, p_roles text[]) returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(public.org_role(p_org) = any(p_roles), false);
$$;

-- ---------------------------------------------------------------
-- 4. RPC functions (privileged operations)
-- ---------------------------------------------------------------
create or replace function public.create_organization(
  p_name text, p_business_type text default 'other',
  p_currency text default 'INR', p_country text default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  insert into public.organizations (name, business_type, currency, country, owner_id)
  values (p_name, p_business_type, p_currency, p_country, auth.uid())
  returning id into v_id;
  insert into public.memberships (org_id, user_id, role) values (v_id, auth.uid(), 'owner');
  return v_id;
end $$;

create or replace function public.accept_invite(p_code text) returns uuid
language plpgsql security definer set search_path = public as $$
declare v_inv public.invites%rowtype;
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  select * into v_inv from public.invites where code = p_code for update;
  if not found or v_inv.revoked_at is not null
     or v_inv.expires_at < now() or v_inv.used_count >= v_inv.max_uses then
    raise exception 'invalid or expired invite';
  end if;
  insert into public.memberships (org_id, user_id, role, assigned_site_ids)
  values (v_inv.org_id, auth.uid(), v_inv.role, v_inv.assigned_site_ids)
  on conflict (org_id, user_id) do nothing;
  update public.invites set used_count = used_count + 1 where id = v_inv.id;
  return v_inv.org_id;
end $$;

-- Deletes the caller's data and account. Refuses if caller owns a business with members.
create or replace function public.delete_my_account() returns void
language plpgsql security definer set search_path = public as $$
declare r record;
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  for r in select o.id from public.organizations o where o.owner_id = auth.uid() loop
    if exists (select 1 from public.memberships m where m.org_id = r.id and m.user_id <> auth.uid()) then
      raise exception 'transfer ownership or remove members of business % first', r.id;
    end if;
    delete from public.organizations where id = r.id;
  end loop;
  delete from auth.users where id = auth.uid();
end $$;

-- ---------------------------------------------------------------
-- 5. Synced business tables (all share standard columns)
-- ---------------------------------------------------------------
create table if not exists public.sites (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  name text not null, address text, note text,
  status text not null default 'active',
  custom jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  created_by uuid, updated_by uuid, device_id uuid,
  revision int not null default 1, deleted_at timestamptz
);

create table if not exists public.work_types (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  name text not null, unit_name text, default_rate numeric(14,2),
  custom jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  created_by uuid, updated_by uuid, device_id uuid,
  revision int not null default 1, deleted_at timestamptz
);

create table if not exists public.custom_field_defs (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  entity text not null check (entity in ('staff','attendance','work','payment')),
  label text not null,
  field_type text not null check (field_type in ('text','number','date','dropdown','boolean')),
  options jsonb not null default '[]'::jsonb,
  sort_order int not null default 0,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  created_by uuid, updated_by uuid, device_id uuid,
  revision int not null default 1, deleted_at timestamptz
);

create table if not exists public.staff (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  staff_code text,
  phone text, alt_phone text,
  photo_path text,
  role_title text,
  joining_date date,
  status text not null default 'active' check (status in ('active','inactive','left')),
  address text, emergency_contact text,
  id_proof_note text, payment_note text, notes text,
  payment_type text not null default 'daily'
    check (payment_type in ('daily','monthly','hourly','piece')),
  rate numeric(14,2) not null default 0,
  overtime_rate numeric(14,2),
  hours_per_day numeric(5,2),
  unit_name text,
  weekly_off int[] not null default '{}',
  rate_history jsonb not null default '[]'::jsonb,
  default_site_id uuid,
  custom jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  created_by uuid, updated_by uuid, device_id uuid,
  revision int not null default 1, deleted_at timestamptz
);

create table if not exists public.attendance_entries (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  staff_id uuid not null references public.staff(id),
  work_date date not null,
  status text not null check (status in ('present','absent','half','leave_paid','leave_unpaid','holiday')),
  overtime_hours numeric(5,2) not null default 0,
  site_id uuid,
  note text,
  custom jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  created_by uuid, updated_by uuid, device_id uuid,
  revision int not null default 1, deleted_at timestamptz
);
create unique index if not exists attendance_unique_day
  on public.attendance_entries (org_id, staff_id, work_date) where deleted_at is null;

create table if not exists public.work_entries (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  staff_id uuid not null references public.staff(id),
  work_date date not null,
  work_type_id uuid, site_id uuid,
  description text,
  quantity numeric(14,3), hours numeric(6,2),
  start_time time, end_time time,
  photo_path text, note text,
  custom jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  created_by uuid, updated_by uuid, device_id uuid,
  revision int not null default 1, deleted_at timestamptz
);

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  staff_id uuid not null references public.staff(id),
  pay_date date not null,
  type text not null check (type in ('salary','advance','bonus','deduction','penalty','reimbursement','loan','loan_repayment')),
  amount numeric(14,2) not null check (amount >= 0),
  mode text check (mode in ('cash','upi','bank','cheque','other')),
  reference text, note text,
  period_start date, period_end date,
  receipt_path text,
  linked_period_id uuid,
  override_note text,
  custom jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  created_by uuid, updated_by uuid, device_id uuid,
  revision int not null default 1, deleted_at timestamptz
);

create table if not exists public.period_closings (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  period_start date not null, period_end date not null,
  staff_id uuid,
  status text not null default 'closed' check (status in ('closed','reopened')),
  note text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  created_by uuid, updated_by uuid, device_id uuid,
  revision int not null default 1, deleted_at timestamptz
);

-- ---------------------------------------------------------------
-- 6. Audit log (written only by trigger)
-- ---------------------------------------------------------------
create table if not exists public.audit_log (
  id bigint generated always as identity primary key,
  org_id uuid not null,
  entity_type text not null,
  entity_id uuid not null,
  action text not null,
  before_data jsonb, after_data jsonb,
  user_id uuid, device_id uuid,
  created_at timestamptz not null default now()
);
create index if not exists audit_org_time_idx on public.audit_log (org_id, created_at desc);

create or replace function public.log_audit() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_action text;
begin
  v_action := case
    when tg_op = 'INSERT' then 'create'
    when tg_op = 'DELETE' then 'purge'
    when new.deleted_at is not null and old.deleted_at is null then 'delete'
    when new.deleted_at is null and old.deleted_at is not null then 'restore'
    else 'update' end;
  insert into public.audit_log (org_id, entity_type, entity_id, action, before_data, after_data, user_id, device_id)
  values (
    coalesce(new.org_id, old.org_id), tg_table_name, coalesce(new.id, old.id), v_action,
    case when tg_op = 'INSERT' then null else to_jsonb(old) end,
    case when tg_op = 'DELETE' then null else to_jsonb(new) end,
    auth.uid(),
    case when tg_op = 'DELETE' then old.device_id else new.device_id end);
  return coalesce(new, old);
end $$;

-- ---------------------------------------------------------------
-- 7. Triggers, indexes, realtime
-- ---------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array['sites','work_types','custom_field_defs','staff',
    'attendance_entries','work_entries','payments','period_closings'] loop
    execute format('drop trigger if exists %I on public.%I', t || '_audit_fields', t);
    execute format('create trigger %I before insert or update on public.%I
      for each row execute function public.set_audit_fields()', t || '_audit_fields', t);
    execute format('drop trigger if exists %I on public.%I', t || '_audit_log', t);
    execute format('create trigger %I after insert or update or delete on public.%I
      for each row execute function public.log_audit()', t || '_audit_log', t);
    execute format('create index if not exists %I on public.%I (org_id, updated_at)', t || '_sync_idx', t);
  end loop;
end $$;

create index if not exists payments_staff_date_idx on public.payments (org_id, staff_id, pay_date);
create index if not exists work_entries_staff_date_idx on public.work_entries (org_id, staff_id, work_date);
create index if not exists attendance_date_idx on public.attendance_entries (org_id, work_date);

-- Enable Realtime if publication exists
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table
      public.sites, public.work_types, public.custom_field_defs, public.staff,
      public.attendance_entries, public.work_entries, public.payments, public.period_closings,
      public.memberships;
  end if;
exception when others then null;
end $$;

-- ---------------------------------------------------------------
-- 8. Row Level Security
-- ---------------------------------------------------------------
create or replace procedure public.apply_org_policies(
  p_table text, p_read text[], p_write text[], p_purge text[])
language plpgsql as $$
begin
  execute format('alter table public.%I enable row level security', p_table);
  execute format('drop policy if exists %I on public.%I', p_table || '_select', p_table);
  execute format('drop policy if exists %I on public.%I', p_table || '_insert', p_table);
  execute format('drop policy if exists %I on public.%I', p_table || '_update', p_table);
  execute format('drop policy if exists %I on public.%I', p_table || '_delete', p_table);
  execute format('create policy %I on public.%I for select to authenticated
    using (public.has_org_role(org_id, %L::text[]))', p_table || '_select', p_table, p_read);
  execute format('create policy %I on public.%I for insert to authenticated
    with check (public.has_org_role(org_id, %L::text[]))', p_table || '_insert', p_table, p_write);
  execute format('create policy %I on public.%I for update to authenticated
    using (public.has_org_role(org_id, %L::text[]))
    with check (public.has_org_role(org_id, %L::text[]))', p_table || '_update', p_table, p_write);
  execute format('create policy %I on public.%I for delete to authenticated
    using (public.has_org_role(org_id, %L::text[]))', p_table || '_delete', p_table, p_purge);
end $$;

-- Apply policies to org synced tables
call public.apply_org_policies('sites',
  array['owner','manager','supervisor','accountant','viewer'], array['owner','manager'], array['owner']);
call public.apply_org_policies('work_types',
  array['owner','manager','supervisor','accountant','viewer'], array['owner','manager'], array['owner']);
call public.apply_org_policies('custom_field_defs',
  array['owner','manager','supervisor','accountant','viewer'], array['owner','manager'], array['owner']);
call public.apply_org_policies('staff',
  array['owner','manager','supervisor','accountant','viewer'], array['owner','manager'], array['owner']);
call public.apply_org_policies('attendance_entries',
  array['owner','manager','supervisor','accountant','viewer'], array['owner','manager','supervisor'], array['owner']);
call public.apply_org_policies('work_entries',
  array['owner','manager','supervisor','accountant','viewer'], array['owner','manager','supervisor'], array['owner']);
call public.apply_org_policies('payments',
  array['owner','manager','accountant','viewer'], array['owner','manager','accountant'], array['owner']);
call public.apply_org_policies('period_closings',
  array['owner','manager','accountant','viewer'], array['owner','manager','accountant'], array['owner']);

alter table public.profiles enable row level security;
drop policy if exists profiles_self_select on public.profiles;
create policy profiles_self_select on public.profiles for select to authenticated using (id = auth.uid());
drop policy if exists profiles_self_update on public.profiles;
create policy profiles_self_update on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());
drop policy if exists profiles_self_insert on public.profiles;
create policy profiles_self_insert on public.profiles for insert to authenticated
  with check (id = auth.uid());

alter table public.organizations enable row level security;
drop policy if exists org_select on public.organizations;
create policy org_select on public.organizations for select to authenticated
  using (public.is_org_member(id));
drop policy if exists org_update on public.organizations;
create policy org_update on public.organizations for update to authenticated
  using (public.has_org_role(id, array['owner']))
  with check (public.has_org_role(id, array['owner']));

alter table public.memberships enable row level security;
drop policy if exists memberships_select on public.memberships;
create policy memberships_select on public.memberships for select to authenticated
  using (public.is_org_member(org_id));
drop policy if exists memberships_update on public.memberships;
create policy memberships_update on public.memberships for update to authenticated
  using (public.has_org_role(org_id, array['owner']))
  with check (public.has_org_role(org_id, array['owner']));
drop policy if exists memberships_delete on public.memberships;
create policy memberships_delete on public.memberships for delete to authenticated
  using (public.has_org_role(org_id, array['owner']) or user_id = auth.uid());

alter table public.invites enable row level security;
drop policy if exists invites_select on public.invites;
create policy invites_select on public.invites for select to authenticated
  using (public.has_org_role(org_id, array['owner','manager']));
drop policy if exists invites_insert on public.invites;
create policy invites_insert on public.invites for insert to authenticated
  with check (public.has_org_role(org_id, array['owner','manager']));
drop policy if exists invites_update on public.invites;
create policy invites_update on public.invites for update to authenticated
  using (public.has_org_role(org_id, array['owner','manager']))
  with check (public.has_org_role(org_id, array['owner','manager']));

alter table public.devices enable row level security;
drop policy if exists devices_own on public.devices;
create policy devices_own on public.devices for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

alter table public.audit_log enable row level security;
drop policy if exists audit_select on public.audit_log;
create policy audit_select on public.audit_log for select to authenticated
  using (public.has_org_role(org_id, array['owner','manager','accountant']));

-- ---------------------------------------------------------------
-- 9. Storage (private bucket: org-files)
-- ---------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('org-files', 'org-files', false)
on conflict (id) do nothing;

drop policy if exists org_files_select on storage.objects;
create policy org_files_select on storage.objects for select to authenticated
  using (bucket_id = 'org-files'
    and public.is_org_member(((storage.foldername(name))[1])::uuid));

drop policy if exists org_files_insert on storage.objects;
create policy org_files_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'org-files'
    and public.has_org_role(((storage.foldername(name))[1])::uuid,
        array['owner','manager','supervisor','accountant']));

drop policy if exists org_files_update on storage.objects;
create policy org_files_update on storage.objects for update to authenticated
  using (bucket_id = 'org-files'
    and public.has_org_role(((storage.foldername(name))[1])::uuid,
        array['owner','manager','supervisor','accountant']));

drop policy if exists org_files_delete on storage.objects;
create policy org_files_delete on storage.objects for delete to authenticated
  using (bucket_id = 'org-files'
    and public.has_org_role(((storage.foldername(name))[1])::uuid, array['owner','manager']));
