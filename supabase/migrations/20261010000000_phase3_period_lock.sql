-- ================================================================
-- STAFF MANAGER - SUPABASE SCHEMA (Migration 003: Phase 3 Period Lock)
-- ================================================================

-- ---------------------------------------------------------------
-- 1. Check Period Closed on Attendance Entries
-- ---------------------------------------------------------------
create or replace function public.check_period_closed_attendance() returns trigger
language plpgsql as $$
declare
  v_org_id uuid;
  v_staff_id uuid;
  v_date date;
  v_locked boolean;
begin
  v_org_id := coalesce(new.org_id, old.org_id);
  v_staff_id := coalesce(new.staff_id, old.staff_id);
  v_date := coalesce(new.work_date, old.work_date);

  select exists (
    select 1 from public.period_closings c
    where c.org_id = v_org_id
      and c.status = 'closed'
      and c.deleted_at is null
      and (c.staff_id is null or c.staff_id = v_staff_id)
      and v_date >= c.period_start
      and v_date <= c.period_end
  ) into v_locked;

  if v_locked then
    raise exception 'Period is closed and locked. Edits to attendance on % are not allowed.', v_date;
  end if;

  return coalesce(new, old);
end $$;

drop trigger if exists attendance_check_closed_period on public.attendance_entries;
create trigger attendance_check_closed_period
before insert or update or delete on public.attendance_entries
for each row execute function public.check_period_closed_attendance();

-- ---------------------------------------------------------------
-- 2. Check Period Closed on Payment Entries
-- ---------------------------------------------------------------
create or replace function public.check_period_closed_payment() returns trigger
language plpgsql as $$
declare
  v_org_id uuid;
  v_staff_id uuid;
  v_date date;
  v_locked boolean;
begin
  v_org_id := coalesce(new.org_id, old.org_id);
  v_staff_id := coalesce(new.staff_id, old.staff_id);
  v_date := coalesce(new.pay_date, old.pay_date);

  select exists (
    select 1 from public.period_closings c
    where c.org_id = v_org_id
      and c.status = 'closed'
      and c.deleted_at is null
      and (c.staff_id is null or c.staff_id = v_staff_id)
      and v_date >= c.period_start
      and v_date <= c.period_end
  ) into v_locked;

  if v_locked then
    raise exception 'Period is closed and locked. Edits to payments on % are not allowed.', v_date;
  end if;

  return coalesce(new, old);
end $$;

drop trigger if exists payment_check_closed_period on public.payments;
create trigger payment_check_closed_period
before insert or update or delete on public.payments
for each row execute function public.check_period_closed_payment();

-- ---------------------------------------------------------------
-- 3. Owner Only Unlock for Period Closings
-- ---------------------------------------------------------------
create or replace function public.protect_period_closing() returns trigger
language plpgsql as $$
declare
  v_org_id uuid;
begin
  v_org_id := coalesce(new.org_id, old.org_id);

  if tg_op = 'UPDATE' and old.status = 'closed' and new.status <> 'closed' then
    if not public.has_org_role(v_org_id, array['owner']) then
      raise exception 'Only organization owner can unlock a closed settlement period.';
    end if;
  end if;

  if tg_op = 'DELETE' and old.status = 'closed' then
    if not public.has_org_role(v_org_id, array['owner']) then
      raise exception 'Only organization owner can delete a closed settlement period.';
    end if;
  end if;

  return coalesce(new, old);
end $$;

drop trigger if exists period_closings_protect_unlock on public.period_closings;
create trigger period_closings_protect_unlock
before update or delete on public.period_closings
for each row execute function public.protect_period_closing();
