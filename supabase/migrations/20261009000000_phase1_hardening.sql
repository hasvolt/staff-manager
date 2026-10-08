-- ================================================================
-- STAFF MANAGER - SUPABASE SCHEMA (Migration 002: Phase 1 Hardening)
-- ================================================================

-- ---------------------------------------------------------------
-- 1. Account Deletion Cleanup (purge audit_log on business delete)
-- ---------------------------------------------------------------
create or replace function public.delete_my_account() returns void
language plpgsql security definer set search_path = public as $$
declare r record;
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  for r in select o.id from public.organizations o where o.owner_id = auth.uid() loop
    if exists (select 1 from public.memberships m where m.org_id = r.id and m.user_id <> auth.uid()) then
      raise exception 'transfer ownership or remove members of business % first', r.id;
    end if;
    -- Delete the organization, which cascades to synced tables and memberships
    delete from public.organizations where id = r.id;
    -- Delete all audit_log records holding staff personal data for this organization
    delete from public.audit_log where org_id = r.id;
  end loop;
  -- Delete user from auth.users
  delete from auth.users where id = auth.uid();
end $$;

-- ---------------------------------------------------------------
-- 2. Invite Role Restriction (Owner can invite any role; Manager cannot invite manager)
-- ---------------------------------------------------------------
drop policy if exists invites_insert on public.invites;
create policy invites_insert on public.invites for insert to authenticated
  with check (
    public.has_org_role(org_id, array['owner'])
    or (
      public.has_org_role(org_id, array['manager'])
      and role in ('supervisor', 'accountant', 'viewer')
    )
  );

drop policy if exists invites_update on public.invites;
create policy invites_update on public.invites for update to authenticated
  using (
    public.has_org_role(org_id, array['owner'])
    or (
      public.has_org_role(org_id, array['manager'])
      and role in ('supervisor', 'accountant', 'viewer')
    )
  )
  with check (
    public.has_org_role(org_id, array['owner'])
    or (
      public.has_org_role(org_id, array['manager'])
      and role in ('supervisor', 'accountant', 'viewer')
    )
  );

-- ---------------------------------------------------------------
-- 3. Hide Pay Data from Supervisors (move sensitive pay fields out of staff)
-- ---------------------------------------------------------------

-- 3a. Create staff_compensation table
create table if not exists public.staff_compensation (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  staff_id uuid not null references public.staff(id) on delete cascade,
  rate numeric(14,2) not null default 0,
  overtime_rate numeric(14,2),
  rate_history jsonb not null default '[]'::jsonb,
  payment_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid,
  updated_by uuid,
  device_id uuid,
  revision int not null default 1,
  deleted_at timestamptz,
  constraint staff_compensation_org_staff_unique unique (org_id, staff_id)
);

-- 3b. Drop moved columns from public.staff
alter table public.staff drop column if exists rate;
alter table public.staff drop column if exists overtime_rate;
alter table public.staff drop column if exists rate_history;
alter table public.staff drop column if exists payment_note;

-- 3c. Function can_view_money(p_org uuid)
create or replace function public.can_view_money(p_org uuid) returns boolean
language plpgsql stable security definer set search_path = public as $$
declare
  v_role text;
  v_hide text;
begin
  select m.role into v_role
  from public.memberships m
  where m.org_id = p_org and m.user_id = auth.uid() and m.status = 'active'
  limit 1;

  if v_role is null then
    return false;
  end if;

  if v_role in ('owner', 'manager', 'accountant') then
    return true;
  end if;

  if v_role = 'viewer' then
    select coalesce(
      o.settings->>'hide_payment_details_from_viewers',
      o.settings->>'hide_payments_from_viewers',
      'false'
    ) into v_hide
    from public.organizations o
    where o.id = p_org;

    return v_hide <> 'true';
  end if;

  return false;
end $$;

-- 3d. RLS for staff_compensation, payments, period_closings
alter table public.staff_compensation enable row level security;

drop policy if exists staff_compensation_select on public.staff_compensation;
create policy staff_compensation_select on public.staff_compensation for select to authenticated
  using (public.can_view_money(org_id));

drop policy if exists staff_compensation_insert on public.staff_compensation;
create policy staff_compensation_insert on public.staff_compensation for insert to authenticated
  with check (public.has_org_role(org_id, array['owner','manager']));

drop policy if exists staff_compensation_update on public.staff_compensation;
create policy staff_compensation_update on public.staff_compensation for update to authenticated
  using (public.has_org_role(org_id, array['owner','manager']))
  with check (public.has_org_role(org_id, array['owner','manager']));

drop policy if exists staff_compensation_delete on public.staff_compensation;
create policy staff_compensation_delete on public.staff_compensation for delete to authenticated
  using (public.has_org_role(org_id, array['owner']));

drop policy if exists payments_select on public.payments;
create policy payments_select on public.payments for select to authenticated
  using (public.can_view_money(org_id));

drop policy if exists period_closings_select on public.period_closings;
create policy period_closings_select on public.period_closings for select to authenticated
  using (public.can_view_money(org_id));

-- 3e. Triggers, indexes, and realtime for staff_compensation
drop trigger if exists staff_compensation_audit_fields on public.staff_compensation;
create trigger staff_compensation_audit_fields before insert or update on public.staff_compensation
  for each row execute function public.set_audit_fields();

drop trigger if exists staff_compensation_audit_log on public.staff_compensation;
create trigger staff_compensation_audit_log after insert or update or delete on public.staff_compensation
  for each row execute function public.log_audit();

create index if not exists staff_compensation_sync_idx on public.staff_compensation (org_id, updated_at);
create index if not exists staff_compensation_staff_idx on public.staff_compensation (org_id, staff_id);

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.staff_compensation;
  end if;
exception when others then null;
end $$;

-- ---------------------------------------------------------------
-- 4. Last Owner Protection (protect last active owner from removal/demotion)
-- ---------------------------------------------------------------
create or replace function public.protect_last_owner() returns trigger
language plpgsql as $$
declare
  v_other_active_owners int;
begin
  if tg_op = 'DELETE' then
    -- Allow cascade deletion if parent organization is being deleted
    if not exists (select 1 from public.organizations where id = old.org_id) then
      return old;
    end if;

    if old.role = 'owner' and old.status = 'active' then
      select count(*) into v_other_active_owners
      from public.memberships
      where org_id = old.org_id
        and role = 'owner'
        and status = 'active'
        and id <> old.id;

      if v_other_active_owners = 0 then
        raise exception 'cannot delete the last active owner of an organization';
      end if;
    end if;
    return old;
  end if;

  if tg_op = 'UPDATE' then
    if old.role = 'owner' and old.status = 'active' and (new.role <> 'owner' or new.status <> 'active' or new.org_id <> old.org_id) then
      select count(*) into v_other_active_owners
      from public.memberships
      where org_id = old.org_id
        and role = 'owner'
        and status = 'active'
        and id <> old.id;

      if v_other_active_owners = 0 then
        raise exception 'cannot suspend or demote the last active owner of an organization';
      end if;
    end if;
    return new;
  end if;

  return coalesce(new, old);
end $$;

drop trigger if exists memberships_protect_last_owner on public.memberships;
create trigger memberships_protect_last_owner
before update or delete on public.memberships
for each row execute function public.protect_last_owner();

-- ---------------------------------------------------------------
-- 5. Same-Business Check (verify foreign entities belong to the same org)
-- ---------------------------------------------------------------
create or replace function public.check_attendance_same_org() returns trigger
language plpgsql as $$
begin
  if not exists (select 1 from public.staff s where s.id = new.staff_id and s.org_id = new.org_id) then
    raise exception 'staff % does not belong to organization %', new.staff_id, new.org_id;
  end if;
  if new.site_id is not null and not exists (select 1 from public.sites st where st.id = new.site_id and st.org_id = new.org_id) then
    raise exception 'site % does not belong to organization %', new.site_id, new.org_id;
  end if;
  return new;
end $$;

create or replace function public.check_work_entry_same_org() returns trigger
language plpgsql as $$
begin
  if not exists (select 1 from public.staff s where s.id = new.staff_id and s.org_id = new.org_id) then
    raise exception 'staff % does not belong to organization %', new.staff_id, new.org_id;
  end if;
  if new.site_id is not null and not exists (select 1 from public.sites st where st.id = new.site_id and st.org_id = new.org_id) then
    raise exception 'site % does not belong to organization %', new.site_id, new.org_id;
  end if;
  if new.work_type_id is not null and not exists (select 1 from public.work_types wt where wt.id = new.work_type_id and wt.org_id = new.org_id) then
    raise exception 'work type % does not belong to organization %', new.work_type_id, new.org_id;
  end if;
  return new;
end $$;

create or replace function public.check_payment_same_org() returns trigger
language plpgsql as $$
begin
  if not exists (select 1 from public.staff s where s.id = new.staff_id and s.org_id = new.org_id) then
    raise exception 'staff % does not belong to organization %', new.staff_id, new.org_id;
  end if;
  return new;
end $$;

create or replace function public.check_staff_compensation_same_org() returns trigger
language plpgsql as $$
begin
  if not exists (select 1 from public.staff s where s.id = new.staff_id and s.org_id = new.org_id) then
    raise exception 'staff % does not belong to organization %', new.staff_id, new.org_id;
  end if;
  return new;
end $$;

drop trigger if exists attendance_check_same_org on public.attendance_entries;
create trigger attendance_check_same_org
before insert or update on public.attendance_entries
for each row execute function public.check_attendance_same_org();

drop trigger if exists work_entry_check_same_org on public.work_entries;
create trigger work_entry_check_same_org
before insert or update on public.work_entries
for each row execute function public.check_work_entry_same_org();

drop trigger if exists payment_check_same_org on public.payments;
create trigger payment_check_same_org
before insert or update on public.payments
for each row execute function public.check_payment_same_org();

drop trigger if exists staff_compensation_check_same_org on public.staff_compensation;
create trigger staff_compensation_check_same_org
before insert or update on public.staff_compensation
for each row execute function public.check_staff_compensation_same_org();

-- ---------------------------------------------------------------
-- 6. Invite Code without pgcrypto (12 uppercase hex chars from gen_random_uuid)
-- ---------------------------------------------------------------
alter table public.invites
  alter column code set default upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 12));

create or replace function public.accept_invite(p_code text) returns uuid
language plpgsql security definer set search_path = public as $$
declare v_inv public.invites%rowtype;
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  select * into v_inv from public.invites
  where upper(code) = upper(trim(p_code))
  for update;

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
