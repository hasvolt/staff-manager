-- ================================================================
-- STAFF MANAGER - SUPABASE SCHEMA (Migration 004: Phase 5 Multi-User & Realtime)
-- ================================================================

-- 1. Tighten invite creation & role restriction:
-- Managers can invite only Supervisor, Accountant, or Viewer (NEVER Owner or Manager).
-- Owners can invite any role except Owner (Ownership is transferred via transfer_ownership).

create or replace function public.validate_invite_role() returns trigger
language plpgsql security definer as $$
declare
  v_caller_role text;
begin
  select role into v_caller_role from public.memberships
  where org_id = new.org_id and user_id = auth.uid() and status = 'active'
  limit 1;

  if v_caller_role is null then
    raise exception 'Not an active member of this organization';
  end if;

  if v_caller_role = 'manager' then
    if new.role not in ('supervisor', 'accountant', 'viewer') then
      raise exception 'Managers may only invite supervisors, accountants, or viewers';
    end if;
  elsif v_caller_role = 'owner' then
    if new.role not in ('manager', 'supervisor', 'accountant', 'viewer') then
      raise exception 'Invalid invite role for owner';
    end if;
  else
    raise exception 'Only owners and managers can create invites';
  end if;

  return new;
end $$;

drop trigger if exists check_invite_role_trigger on public.invites;
create trigger check_invite_role_trigger
before insert on public.invites
for each row execute function public.validate_invite_role();

-- 2. Prevent removing the last owner or demoting the owner without transfer
create or replace function public.validate_membership_change() returns trigger
language plpgsql security definer as $$
declare
  v_caller_role text;
  v_owner_count int;
begin
  select role into v_caller_role from public.memberships
  where org_id = coalesce(old.org_id, new.org_id) and user_id = auth.uid() and status = 'active'
  limit 1;

  -- If deleting or changing an owner
  if (TG_OP = 'DELETE' and old.role = 'owner') or (TG_OP = 'UPDATE' and old.role = 'owner' and new.role != 'owner') then
    select count(*) into v_owner_count from public.memberships
    where org_id = old.org_id and role = 'owner' and status = 'active';
    if v_owner_count <= 1 then
      raise exception 'Cannot remove or demote the only owner. Transfer ownership first.';
    end if;
  end if;

  -- Only owners can modify members with manager/owner roles
  if TG_OP = 'UPDATE' and old.role in ('owner', 'manager') and v_caller_role != 'owner' then
    raise exception 'Only the organization owner can modify managers or owners.';
  end if;

  return coalesce(new, old);
end $$;

drop trigger if exists check_membership_change_trigger on public.memberships;
create trigger check_membership_change_trigger
before update or delete on public.memberships
for each row execute function public.validate_membership_change();

-- 3. Atomic transfer ownership function
create or replace function public.transfer_organization_ownership(p_org uuid, p_target_user uuid)
returns boolean language plpgsql security definer set search_path = public as $$
declare
  v_caller_role text;
  v_target_exists boolean;
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;

  select role into v_caller_role from public.memberships
  where org_id = p_org and user_id = auth.uid() and status = 'active';

  if v_caller_role != 'owner' then
    raise exception 'Only current owner can transfer ownership.';
  end if;

  select exists (
    select 1 from public.memberships
    where org_id = p_org and user_id = p_target_user and status = 'active'
  ) into v_target_exists;

  if not v_target_exists then
    raise exception 'Target user must be an active member of this organization.';
  end if;

  -- Update target to owner
  update public.memberships set role = 'owner'
  where org_id = p_org and user_id = p_target_user;

  -- Demote previous owner to manager
  update public.memberships set role = 'manager'
  where org_id = p_org and user_id = auth.uid();

  -- Update organization owner_id
  update public.organizations set owner_id = p_target_user, updated_at = now()
  where id = p_org;

  -- Audit log entry
  insert into public.audit_log (org_id, entity_type, entity_id, action, before_data, after_data, user_id)
  values (
    p_org, 'organization', p_org, 'transfer_ownership',
    jsonb_build_object('previous_owner', auth.uid()),
    jsonb_build_object('new_owner', p_target_user),
    auth.uid()
  );

  return true;
end $$;

-- 4. Enable Supabase Realtime publication on primary collaboration tables (Idempotent)
do $$
declare
  tbl text;
  tables text[] := array[
    'staff',
    'attendance_entries',
    'work_entries',
    'payments',
    'period_closings',
    'memberships',
    'invites',
    'audit_log'
  ];
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    foreach tbl in array tables loop
      if not exists (
        select 1 from pg_publication_tables 
        where pubname = 'supabase_realtime' and tablename = tbl and schemaname = 'public'
      ) then
        execute format('alter publication supabase_realtime add table public.%I', tbl);
      end if;
    end loop;
  end if;
end $$;

