-- ================================================================
-- STAFF MANAGER - SUPABASE RLS & SECURITY TEST SUITE
-- Run this script in the Supabase SQL Editor.
-- It verifies multi-tenant isolation, role restrictions, invite limits,
-- last owner protection, same-business checks, and privileged RPCs.
-- All created test data is automatically cleaned up at the end.
-- ================================================================

do $$
declare
  -- Counters
  v_pass int := 0;
  v_fail int := 0;

  -- Test User UUIDs
  v_owner_a uuid := '11111111-1111-4111-8111-111111111111'::uuid;
  v_manager_a uuid := '22222222-2222-4222-8222-222222222222'::uuid;
  v_supervisor_a uuid := '33333333-3333-4333-8333-333333333333'::uuid;
  v_accountant_a uuid := '44444444-4444-4444-8444-444444444444'::uuid;
  v_viewer_a uuid := '55555555-5555-4555-8555-555555555555'::uuid;
  v_owner_b uuid := '66666666-6666-4666-8666-666666666666'::uuid;
  v_new_joiner uuid := '77777777-7777-4777-8777-777777777777'::uuid;
  v_to_delete uuid := '88888888-8888-4888-8888-888888888888'::uuid;

  -- Test Organization UUIDs
  v_org_a uuid := 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid;
  v_org_b uuid := 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'::uuid;
  v_temp_org uuid;

  -- Entity UUIDs
  v_staff_a uuid := 'a1111111-1111-4111-8111-111111111111'::uuid;
  v_staff_b uuid := 'b1111111-1111-4111-8111-111111111111'::uuid;
  v_site_a uuid := 'a2222222-2222-4222-8222-222222222222'::uuid;
  v_site_b uuid := 'b2222222-2222-4222-8222-222222222222'::uuid;
  v_work_type_a uuid := 'a3333333-3333-4333-8333-333333333333'::uuid;
  v_work_type_b uuid := 'b3333333-3333-4333-8333-333333333333'::uuid;

  -- Test helpers
  v_cnt int;
  v_err boolean;
  v_code text;
begin
  raise notice '======================================================';
  raise notice 'STARTING STAFF MANAGER RLS & DATABASE SECURITY TESTS';
  raise notice '======================================================';

  -- -------------------------------------------------------------
  -- Step 0: Clean up any prior test artifacts
  -- -------------------------------------------------------------
  delete from public.organizations where id in (v_org_a, v_org_b);
  delete from public.audit_log where org_id in (v_org_a, v_org_b);
  delete from auth.users where id in (
    v_owner_a, v_manager_a, v_supervisor_a, v_accountant_a,
    v_viewer_a, v_owner_b, v_new_joiner, v_to_delete
  );

  -- -------------------------------------------------------------
  -- Step 1: Seed test users into auth.users and public.profiles
  -- -------------------------------------------------------------
  insert into auth.users (id, email, raw_user_meta_data)
  values
    (v_owner_a, 'owner_a@test.com', '{"full_name":"Owner A"}'::jsonb),
    (v_manager_a, 'manager_a@test.com', '{"full_name":"Manager A"}'::jsonb),
    (v_supervisor_a, 'supervisor_a@test.com', '{"full_name":"Supervisor A"}'::jsonb),
    (v_accountant_a, 'accountant_a@test.com', '{"full_name":"Accountant A"}'::jsonb),
    (v_viewer_a, 'viewer_a@test.com', '{"full_name":"Viewer A"}'::jsonb),
    (v_owner_b, 'owner_b@test.com', '{"full_name":"Owner B"}'::jsonb),
    (v_new_joiner, 'joiner@test.com', '{"full_name":"Joiner"}'::jsonb),
    (v_to_delete, 'todelete@test.com', '{"full_name":"ToDelete"}'::jsonb)
  on conflict (id) do nothing;

  -- -------------------------------------------------------------
  -- Step 2: Seed businesses and memberships
  -- -------------------------------------------------------------
  insert into public.organizations (id, name, owner_id, settings)
  values
    (v_org_a, 'Business A', v_owner_a, '{"hide_payment_details_from_viewers": true}'::jsonb),
    (v_org_b, 'Business B', v_owner_b, '{}'::jsonb);

  insert into public.memberships (org_id, user_id, role, status)
  values
    (v_org_a, v_owner_a, 'owner', 'active'),
    (v_org_a, v_manager_a, 'manager', 'active'),
    (v_org_a, v_supervisor_a, 'supervisor', 'active'),
    (v_org_a, v_accountant_a, 'accountant', 'active'),
    (v_org_a, v_viewer_a, 'viewer', 'active'),
    (v_org_b, v_owner_b, 'owner', 'active');

  -- Seed initial entities for Org A and Org B
  insert into public.sites (id, org_id, name) values
    (v_site_a, v_org_a, 'Site Alpha'),
    (v_site_b, v_org_b, 'Site Beta');

  insert into public.work_types (id, org_id, name) values
    (v_work_type_a, v_org_a, 'Masonry'),
    (v_work_type_b, v_org_b, 'Carpentry');

  insert into public.staff (id, org_id, name, payment_type) values
    (v_staff_a, v_org_a, 'Worker A', 'daily'),
    (v_staff_b, v_org_b, 'Worker B', 'daily');

  insert into public.staff_compensation (org_id, staff_id, rate) values
    (v_org_a, v_staff_a, 800),
    (v_org_b, v_staff_b, 900);

  insert into public.attendance_entries (org_id, staff_id, work_date, status) values
    (v_org_a, v_staff_a, '2026-10-08', 'present'),
    (v_org_b, v_staff_b, '2026-10-08', 'present');

  insert into public.work_entries (org_id, staff_id, work_date, hours) values
    (v_org_a, v_staff_a, '2026-10-08', 8),
    (v_org_b, v_staff_b, '2026-10-08', 8);

  insert into public.payments (org_id, staff_id, pay_date, type, amount) values
    (v_org_a, v_staff_a, '2026-10-08', 'salary', 800),
    (v_org_b, v_staff_b, '2026-10-08', 'salary', 900);

  insert into public.period_closings (org_id, period_start, period_end, status) values
    (v_org_a, '2026-09-01', '2026-09-30', 'closed'),
    (v_org_b, '2026-09-01', '2026-09-30', 'closed');

  -- =============================================================
  -- TEST GROUP 1: CROSS-TENANT ISOLATION (Business A vs Business B)
  -- =============================================================
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claims', json_build_object('sub', v_owner_a::text, 'role', 'authenticated')::text, true);

  -- 1.1 Owner A cannot read Org B organizations
  select count(*) into v_cnt from public.organizations where id = v_org_b;
  if v_cnt = 0 then
    v_pass := v_pass + 1;
    raise notice 'PASS: 1.1 Owner A cannot read Org B organization';
  else
    v_fail := v_fail + 1;
    raise notice 'FAIL: 1.1 Owner A read Org B organization';
  end if;

  -- 1.2 Owner A cannot read Org B staff
  select count(*) into v_cnt from public.staff where org_id = v_org_b;
  if v_cnt = 0 then
    v_pass := v_pass + 1;
    raise notice 'PASS: 1.2 Owner A cannot read Org B staff';
  else
    v_fail := v_fail + 1;
    raise notice 'FAIL: 1.2 Owner A read Org B staff';
  end if;

  -- 1.3 Owner A cannot read Org B payments
  select count(*) into v_cnt from public.payments where org_id = v_org_b;
  if v_cnt = 0 then
    v_pass := v_pass + 1;
    raise notice 'PASS: 1.3 Owner A cannot read Org B payments';
  else
    v_fail := v_fail + 1;
    raise notice 'FAIL: 1.3 Owner A read Org B payments';
  end if;

  -- 1.4 Owner A cannot insert staff into Org B
  v_err := false;
  begin
    insert into public.staff (org_id, name, payment_type) values (v_org_b, 'Intruder', 'daily');
  exception when others then
    v_err := true;
  end;
  if v_err then
    v_pass := v_pass + 1;
    raise notice 'PASS: 1.4 Owner A cannot insert staff into Org B';
  else
    v_fail := v_fail + 1;
    raise notice 'FAIL: 1.4 Owner A inserted staff into Org B';
  end if;

  -- =============================================================
  -- TEST GROUP 2: SUPERVISOR RESTRICTIONS (No Money Data)
  -- =============================================================
  perform set_config('request.jwt.claims', json_build_object('sub', v_supervisor_a::text, 'role', 'authenticated')::text, true);

  -- 2.1 Supervisor A CAN read staff and attendance in Org A
  select count(*) into v_cnt from public.staff where org_id = v_org_a;
  if v_cnt > 0 then
    v_pass := v_pass + 1;
    raise notice 'PASS: 2.1 Supervisor A can read staff in Org A';
  else
    v_fail := v_fail + 1;
    raise notice 'FAIL: 2.1 Supervisor A cannot read staff in Org A';
  end if;

  -- 2.2 Supervisor A CANNOT read staff_compensation in Org A
  select count(*) into v_cnt from public.staff_compensation where org_id = v_org_a;
  if v_cnt = 0 then
    v_pass := v_pass + 1;
    raise notice 'PASS: 2.2 Supervisor A cannot read staff_compensation in Org A';
  else
    v_fail := v_fail + 1;
    raise notice 'FAIL: 2.2 Supervisor A read staff_compensation in Org A';
  end if;

  -- 2.3 Supervisor A CANNOT read payments in Org A
  select count(*) into v_cnt from public.payments where org_id = v_org_a;
  if v_cnt = 0 then
    v_pass := v_pass + 1;
    raise notice 'PASS: 2.3 Supervisor A cannot read payments in Org A';
  else
    v_fail := v_fail + 1;
    raise notice 'FAIL: 2.3 Supervisor A read payments in Org A';
  end if;

  -- 2.4 Supervisor A CANNOT read period_closings in Org A
  select count(*) into v_cnt from public.period_closings where org_id = v_org_a;
  if v_cnt = 0 then
    v_pass := v_pass + 1;
    raise notice 'PASS: 2.4 Supervisor A cannot read period_closings in Org A';
  else
    v_fail := v_fail + 1;
    raise notice 'FAIL: 2.4 Supervisor A read period_closings in Org A';
  end if;

  -- 2.5 Supervisor A CAN mark attendance
  v_err := false;
  begin
    insert into public.attendance_entries (org_id, staff_id, work_date, status)
    values (v_org_a, v_staff_a, '2026-10-09', 'present');
  exception when others then
    v_err := true;
  end;
  if not v_err then
    v_pass := v_pass + 1;
    raise notice 'PASS: 2.5 Supervisor A can mark attendance in Org A';
  else
    v_fail := v_fail + 1;
    raise notice 'FAIL: 2.5 Supervisor A failed to mark attendance in Org A';
  end if;

  -- 2.6 Supervisor A CANNOT insert payments
  v_err := false;
  begin
    insert into public.payments (org_id, staff_id, pay_date, type, amount)
    values (v_org_a, v_staff_a, '2026-10-09', 'salary', 500);
  exception when others then
    v_err := true;
  end;
  if v_err then
    v_pass := v_pass + 1;
    raise notice 'PASS: 2.6 Supervisor A cannot insert payments in Org A';
  else
    v_fail := v_fail + 1;
    raise notice 'FAIL: 2.6 Supervisor A inserted payment in Org A';
  end if;

  -- =============================================================
  -- TEST GROUP 3: ACCOUNTANT RESTRICTIONS
  -- =============================================================
  perform set_config('request.jwt.claims', json_build_object('sub', v_accountant_a::text, 'role', 'authenticated')::text, true);

  -- 3.1 Accountant A CAN read staff_compensation, payments and period_closings
  select count(*) into v_cnt from public.payments where org_id = v_org_a;
  if v_cnt > 0 then
    v_pass := v_pass + 1;
    raise notice 'PASS: 3.1 Accountant A can read payments in Org A';
  else
    v_fail := v_fail + 1;
    raise notice 'FAIL: 3.1 Accountant A cannot read payments in Org A';
  end if;

  -- 3.2 Accountant A CANNOT insert attendance
  v_err := false;
  begin
    insert into public.attendance_entries (org_id, staff_id, work_date, status)
    values (v_org_a, v_staff_a, '2026-10-10', 'present');
  exception when others then
    v_err := true;
  end;
  if v_err then
    v_pass := v_pass + 1;
    raise notice 'PASS: 3.2 Accountant A cannot insert attendance entries';
  else
    v_fail := v_fail + 1;
    raise notice 'FAIL: 3.2 Accountant A inserted attendance entry';
  end if;

  -- =============================================================
  -- TEST GROUP 4: VIEWER RESTRICTIONS (Read-Only + Money Masking)
  -- =============================================================
  perform set_config('request.jwt.claims', json_build_object('sub', v_viewer_a::text, 'role', 'authenticated')::text, true);

  -- 4.1 Viewer A CAN read staff
  select count(*) into v_cnt from public.staff where org_id = v_org_a;
  if v_cnt > 0 then
    v_pass := v_pass + 1;
    raise notice 'PASS: 4.1 Viewer A can read staff in Org A';
  else
    v_fail := v_fail + 1;
    raise notice 'FAIL: 4.1 Viewer A cannot read staff in Org A';
  end if;

  -- 4.2 Viewer A CANNOT read payments when hide_payment_details_from_viewers is true
  select count(*) into v_cnt from public.payments where org_id = v_org_a;
  if v_cnt = 0 then
    v_pass := v_pass + 1;
    raise notice 'PASS: 4.2 Viewer A cannot read payments when hidden by setting';
  else
    v_fail := v_fail + 1;
    raise notice 'FAIL: 4.2 Viewer A read payments despite setting';
  end if;

  -- 4.3 Viewer A CANNOT insert attendance
  v_err := false;
  begin
    insert into public.attendance_entries (org_id, staff_id, work_date, status)
    values (v_org_a, v_staff_a, '2026-10-11', 'present');
  exception when others then
    v_err := true;
  end;
  if v_err then
    v_pass := v_pass + 1;
    raise notice 'PASS: 4.3 Viewer A cannot insert attendance';
  else
    v_fail := v_fail + 1;
    raise notice 'FAIL: 4.3 Viewer A inserted attendance';
  end if;

  -- =============================================================
  -- TEST GROUP 5: INVITE ROLE RESTRICTIONS
  -- =============================================================
  -- 5.1 Manager A CAN create invite for supervisor
  perform set_config('request.jwt.claims', json_build_object('sub', v_manager_a::text, 'role', 'authenticated')::text, true);
  v_err := false;
  begin
    insert into public.invites (org_id, role, code)
    values (v_org_a, 'supervisor', 'SUP123456789');
  exception when others then
    v_err := true;
  end;
  if not v_err then
    v_pass := v_pass + 1;
    raise notice 'PASS: 5.1 Manager A can create supervisor invite';
  else
    v_fail := v_fail + 1;
    raise notice 'FAIL: 5.1 Manager A could not create supervisor invite';
  end if;

  -- 5.2 Manager A CANNOT create invite for manager
  v_err := false;
  begin
    insert into public.invites (org_id, role, code)
    values (v_org_a, 'manager', 'MGR123456789');
  exception when others then
    v_err := true;
  end;
  if v_err then
    v_pass := v_pass + 1;
    raise notice 'PASS: 5.2 Manager A cannot create manager invite';
  else
    v_fail := v_fail + 1;
    raise notice 'FAIL: 5.2 Manager A created manager invite';
  end if;

  -- 5.3 Owner A CAN create invite for manager
  perform set_config('request.jwt.claims', json_build_object('sub', v_owner_a::text, 'role', 'authenticated')::text, true);
  v_err := false;
  begin
    insert into public.invites (org_id, role, code)
    values (v_org_a, 'manager', 'MGR999999999');
  exception when others then
    v_err := true;
  end;
  if not v_err then
    v_pass := v_pass + 1;
    raise notice 'PASS: 5.3 Owner A can create manager invite';
  else
    v_fail := v_fail + 1;
    raise notice 'FAIL: 5.3 Owner A could not create manager invite';
  end if;

  -- =============================================================
  -- TEST GROUP 6: LAST OWNER PROTECTION
  -- =============================================================
  -- 6.1 Cannot demote the last active owner of Org A
  v_err := false;
  begin
    update public.memberships set role = 'manager' where org_id = v_org_a and user_id = v_owner_a;
  exception when others then
    v_err := true;
  end;
  if v_err then
    v_pass := v_pass + 1;
    raise notice 'PASS: 6.1 Last owner cannot be demoted';
  else
    v_fail := v_fail + 1;
    raise notice 'FAIL: 6.1 Last owner was demoted';
  end if;

  -- 6.2 Cannot suspend the last active owner of Org A
  v_err := false;
  begin
    update public.memberships set status = 'suspended' where org_id = v_org_a and user_id = v_owner_a;
  exception when others then
    v_err := true;
  end;
  if v_err then
    v_pass := v_pass + 1;
    raise notice 'PASS: 6.2 Last owner cannot be suspended';
  else
    v_fail := v_fail + 1;
    raise notice 'FAIL: 6.2 Last owner was suspended';
  end if;

  -- 6.3 Cannot delete the last active owner's membership
  v_err := false;
  begin
    delete from public.memberships where org_id = v_org_a and user_id = v_owner_a;
  exception when others then
    v_err := true;
  end;
  if v_err then
    v_pass := v_pass + 1;
    raise notice 'PASS: 6.3 Last owner membership cannot be deleted';
  else
    v_fail := v_fail + 1;
    raise notice 'FAIL: 6.3 Last owner membership was deleted';
  end if;

  -- =============================================================
  -- TEST GROUP 7: SAME-BUSINESS CROSS-ENTITY ENFORCEMENT
  -- =============================================================
  -- 7.1 Cannot insert attendance in Org A with staff from Org B
  v_err := false;
  begin
    insert into public.attendance_entries (org_id, staff_id, work_date, status)
    values (v_org_a, v_staff_b, '2026-10-12', 'present');
  exception when others then
    v_err := true;
  end;
  if v_err then
    v_pass := v_pass + 1;
    raise notice 'PASS: 7.1 Cross-org staff attendance rejected';
  else
    v_fail := v_fail + 1;
    raise notice 'FAIL: 7.1 Cross-org staff attendance allowed';
  end if;

  -- 7.2 Cannot insert work entry in Org A with site from Org B
  v_err := false;
  begin
    insert into public.work_entries (org_id, staff_id, work_date, site_id)
    values (v_org_a, v_staff_a, '2026-10-12', v_site_b);
  exception when others then
    v_err := true;
  end;
  if v_err then
    v_pass := v_pass + 1;
    raise notice 'PASS: 7.2 Cross-org site in work entry rejected';
  else
    v_fail := v_fail + 1;
    raise notice 'FAIL: 7.2 Cross-org site in work entry allowed';
  end if;

  -- 7.3 Cannot insert payment in Org A with staff from Org B
  v_err := false;
  begin
    insert into public.payments (org_id, staff_id, pay_date, type, amount)
    values (v_org_a, v_staff_b, '2026-10-12', 'salary', 100);
  exception when others then
    v_err := true;
  end;
  if v_err then
    v_pass := v_pass + 1;
    raise notice 'PASS: 7.3 Cross-org staff payment rejected';
  else
    v_fail := v_fail + 1;
    raise notice 'FAIL: 7.3 Cross-org staff payment allowed';
  end if;

  -- =============================================================
  -- TEST GROUP 8: PRIVILEGED RPC FUNCTIONS
  -- =============================================================
  -- 8.1 create_organization RPC
  perform set_config('request.jwt.claims', json_build_object('sub', v_new_joiner::text, 'role', 'authenticated')::text, true);
  v_err := false;
  begin
    v_temp_org := public.create_organization('New Joiner Business', 'construction', 'INR', 'India');
  exception when others then
    v_err := true;
  end;
  if not v_err and v_temp_org is not null then
    v_pass := v_pass + 1;
    raise notice 'PASS: 8.1 create_organization created business %', v_temp_org;
  else
    v_fail := v_fail + 1;
    raise notice 'FAIL: 8.1 create_organization failed';
  end if;

  -- 8.2 accept_invite RPC (12-char code without pgcrypto)
  perform set_config('request.jwt.claims', json_build_object('sub', v_owner_a::text, 'role', 'authenticated')::text, true);
  insert into public.invites (org_id, role, max_uses)
  values (v_org_a, 'accountant', 5)
  returning code into v_code;

  perform set_config('request.jwt.claims', json_build_object('sub', v_new_joiner::text, 'role', 'authenticated')::text, true);
  v_err := false;
  begin
    perform public.accept_invite(v_code);
  exception when others then
    v_err := true;
  end;
  if not v_err then
    v_pass := v_pass + 1;
    raise notice 'PASS: 8.2 accept_invite joined business with code %', v_code;
  else
    v_fail := v_fail + 1;
    raise notice 'FAIL: 8.2 accept_invite failed';
  end if;

  -- 8.3 delete_my_account RPC (with audit_log purge)
  perform set_config('request.jwt.claims', json_build_object('sub', v_to_delete::text, 'role', 'authenticated')::text, true);
  v_temp_org := public.create_organization('Sole Owned Business', 'other', 'INR', 'India');

  -- Write dummy audit log row for this business
  insert into public.audit_log (org_id, entity_type, entity_id, action, user_id)
  values (v_temp_org, 'staff', gen_random_uuid(), 'create', v_to_delete);

  v_err := false;
  begin
    perform public.delete_my_account();
  exception when others then
    v_err := true;
  end;

  select count(*) into v_cnt from public.audit_log where org_id = v_temp_org;
  if not v_err and v_cnt = 0 then
    v_pass := v_pass + 1;
    raise notice 'PASS: 8.3 delete_my_account purged business and its audit log';
  else
    v_fail := v_fail + 1;
    raise notice 'FAIL: 8.3 delete_my_account failed or left audit log entries';
  end if;

  -- -------------------------------------------------------------
  -- Final Cleanup of all test artifacts
  -- -------------------------------------------------------------
  perform set_config('role', 'postgres', true);
  delete from public.organizations where id in (v_org_a, v_org_b) or owner_id in (v_owner_a, v_owner_b, v_new_joiner, v_to_delete);
  delete from public.audit_log where org_id in (v_org_a, v_org_b);
  delete from auth.users where id in (
    v_owner_a, v_manager_a, v_supervisor_a, v_accountant_a,
    v_viewer_a, v_owner_b, v_new_joiner, v_to_delete
  );

  raise notice '======================================================';
  raise notice 'TEST RESULTS: PASS = %, FAIL = %', v_pass, v_fail;
  raise notice '======================================================';

  if v_fail > 0 then
    raise exception 'TEST SUITE FAILED with % failure(s)', v_fail;
  end if;
end $$;
