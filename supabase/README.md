# Supabase Migrations & Database Setup Guide

## Applying Migrations (Strict Order)

Migrations must be run in sequence:

1. **Migration 001 - Initial Schema**: `supabase/migrations/20261008000000_initial_schema.sql`
   - Provisions baseline tables (`profiles`, `organizations`, `memberships`, `invites`, `devices`, `sites`, `work_types`, `custom_field_defs`, `staff`, `attendance_entries`, `work_entries`, `payments`, `period_closings`, `audit_log`), standard synced triggers, RLS policies, RPC functions (`create_organization`, `accept_invite`, `delete_my_account`), and the private `org-files` storage bucket.

2. **Migration 002 - Phase 1 Hardening**: `supabase/migrations/20261009000000_phase1_hardening.sql`
   - Hardens all database constraints, isolates staff pay data, restricts invites, protects the last owner, and guarantees cross-tenant integrity.

### Applying in the Supabase SQL Editor
1. Open your Supabase Project Dashboard (`https://supabase.com/dashboard/project/<your-project-id>`).
2. Go to the **SQL Editor** tab on the left sidebar.
3. Open `supabase/migrations/20261008000000_initial_schema.sql`, copy all text, paste into the SQL Editor, and click **Run**.
4. Open `supabase/migrations/20261009000000_phase1_hardening.sql`, copy all text, paste into the SQL Editor, and click **Run**.
5. Verify in the **Table Editor** that `staff_compensation` exists and columns `rate`, `overtime_rate`, `rate_history`, and `payment_note` have been moved from `staff`.

### Applying with Supabase CLI
```bash
supabase link --project-ref <your-project-id>
supabase db push
```

---

## Running the Real Database RLS Test Script

A comprehensive, self-contained RLS test suite is provided at `supabase/tests/rls_test.sql`.

### Steps:
1. Open the Supabase **SQL Editor**.
2. Open `supabase/tests/rls_test.sql` in this repo and paste its contents into the editor.
3. Click **Run**.
4. The script creates two isolated test businesses (`Business A` and `Business B`), authenticates as each role (`owner`, `manager`, `supervisor`, `accountant`, `viewer`), verifies every read/write/delete permission and barrier, verifies error conditions, cleans up all test data, and prints:
   ```
   ======================================================
   TEST RESULTS: PASS = 23, FAIL = 0
   ======================================================
   ```

---

## Phase 1 Hardening Summary

1. **Account Deletion Cleanup (`delete_my_account`)**:
   - Deleting an owned business now cascades and explicitly purges all rows from `public.audit_log` belonging to that business (`org_id`), removing residual personal staff data from `before_data`/`after_data`.
   - Still enforces member safety check (refuses if other members belong to the organization).

2. **Invite Role Restriction (RLS Policy Enforcement)**:
   - Only an **Owner** can create or edit invites for any role (including `manager`).
   - A **Manager** can create or edit invites *only* for `supervisor`, `accountant`, or `viewer` (never `manager`). Enforced with `WITH CHECK` and `USING` policies on `public.invites`.

3. **Hide Pay Data from Supervisors (`public.staff_compensation`)**:
   - Sensitive financial compensation fields (`rate`, `overtime_rate`, `rate_history`, `payment_note`) are moved out of `public.staff` into `public.staff_compensation` (with unique `(org_id, staff_id)` constraint).
   - `public.staff` retains operational fields (`payment_type`, `unit_name`, `hours_per_day`, `weekly_off`).
   - Security helper function `public.can_view_money(p_org uuid)` returns true for `owner`, `manager`, `accountant`; returns true for `viewer` only if `organizations.settings->>'hide_payment_details_from_viewers'` is not true; and returns **false** for `supervisor`.
   - `staff_compensation`, `payments`, and `period_closings` SELECT policies use `can_view_money`.
   - The sync engine and UI skip and wipe compensation rows for supervisors so devices never leak pay data.

4. **Last Owner Protection (`memberships_protect_last_owner`)**:
   - `BEFORE UPDATE OR DELETE` trigger on `public.memberships` refuses to remove, suspend, or demote the last active owner of an organization.
   - Automatically permits foreign-key cascade when the parent organization itself is being deleted or during `delete_my_account()`.

5. **Same-Business Integrity Checks**:
   - `BEFORE INSERT OR UPDATE` triggers on `attendance_entries`, `work_entries`, `payments`, and `staff_compensation` enforce that `staff_id`, `site_id`, and `work_type_id` strictly belong to the same `org_id`. Raises a clear SQL exception otherwise.

6. **Invite Code without `pgcrypto`**:
   - `invites.code` default is now generated using native PostgreSQL 13+ `upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 12))` without dependency on `pgcrypto`.
   - `accept_invite` and the UI `JoinBusinessModal` accept the 12-character format.

7. **Storage Cleanup in the App**:
   - Before `delete_my_account` or business deletion runs, all files under `{org_id}/` in the private `org-files` bucket are listed and removed in batches via the Supabase Storage API.
   - If storage cleanup fails, the deletion RPC is **not** called, preserving database records and allowing the user to retry safely.
