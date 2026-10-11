# Implementation Plan: Staff Manager Audit Report Fixes

This plan addresses all High, Medium, and Housekeeping findings from the static source audit report (`staff-manager-main.zip` v1.0.0 review) in prioritized sequential order.

---

## 1. High Priority: Rate History Calculation Bug (Financial Accuracy)
### Root Cause
- In `StaffFormModal.tsx`, editing compensation rates previously pushed history records using the key `from` (`{ from: 'YYYY-MM-DD', rate, ... }`).
- However, `salaryCalculations.ts` (`getEffectiveRate`) checked `h.effective_from`. Because `effective_from` was undefined, historical rate revisions were ignored, and all past periods were recalculated with the newest rate.
- Additionally, the form lacked a user-facing date selector for when the new rate takes effect.

### Planned Fixes
1. **`salaryCalculations.ts`:**
   - Update `getEffectiveRate` to support both `h.effective_from` and `h.from` as fallback (`const fromDate = h.effective_from || (h as any).from`).
   - Ensure `RateHistoryItem` interface type accepts both `effective_from` and optional `from`.
2. **`StaffFormModal.tsx`:**
   - Add an `effectiveFrom` date picker field when editing staff rates (defaulting to today's date `YYYY-MM-DD`).
   - Save both `effective_from` and `from` keys in `rate_history` for full forward and backward compatibility.
   - Display `effective_from` in the rate revision history list within `StaffDetailModal.tsx`.
3. **Automated Unit Tests (`src/__tests__/rateHistory.test.ts`):**
   - Test case: Staff with rate 500 until 31 March, updated to 600 effective 1 April.
   - Verify March salary uses 500, April salary uses 600.
   - Verify calculation across a period spanning both months calculates the correct prorated rate per day.
   - Verify legacy entries with only `from` key continue to work seamlessly.

---

## 2. High Priority: Database Migration 4 Idempotency Fix
### Root Cause
- In `supabase/migrations/20261011000000_phase5_multiuser_realtime.sql`, the commands `alter publication supabase_realtime add table public.staff;` etc. fail when tables are already members of `supabase_realtime` (added in migration 1).
- This failure rolls back the entire transaction, leaving `validate_invite_role`, owner protection triggers, and `transfer_organization_ownership` unapplied.

### Planned Fixes
1. **Migration Script Update:**
   - Wrap `alter publication supabase_realtime add table ...` inside an idempotent PL/pgSQL block that checks `pg_publication_tables` before adding.
   - Ensure migrations 1 through 4 can be run in sequence or re-run without throwing relation membership errors.
2. **Supabase Documentation:**
   - Update `supabase/README.md` to clearly document all migrations 001 to 004 and the execution order.

---

## 3. Medium Priority: Month Mode Synchronization & Settings Application
### Planned Fixes
1. **Month Settlement Mode Consistency:**
   - In Month Settlement (`MonthSettlementModal.tsx`), initialize the mode selector from `currentOrg.settings?.month_calculation_mode` (defaulting to "Actual calendar days") instead of hardcoding "Fixed 30 days".
2. **Settings Custom Labels Application:**
   - Apply `custom_site_label` (e.g., "Shop", "Project", "Field") across site selectors, filters, and tables.
   - Apply `custom_work_label` across work types and work entry dialogs.
   - Apply `terminology_preset` to adjust default placeholders and labels where appropriate.
   - Honor `require_owner_delete_approval` in staff deletion workflows.

---

## 4. Medium Priority: Role-Based Navigation & Permissions
### Planned Fixes
1. **Supervisor Tab Filtering in Navigation:**
   - Hide Payments and Reports tabs and routes in `AppShell.tsx` and mobile bottom navigation for users with the `supervisor` role.
   - Display a clean unauthorized / restricted view if a supervisor navigates directly to `/payments` or `/reports`.

---

## 5. Medium Priority: Multilingual Print-to-PDF Formatting
### Planned Fixes
1. **Browser Print View Optimization:**
   - Rely on high-fidelity, high-contrast black-and-white browser printing (`window.print()`) with explicit `@media print` CSS rules.
   - Ensure Hindi, Urdu (with RTL styling), Tamil, Telugu, and all 16 supported languages render natively using system fonts without missing glyphs or Helvetica font truncation.
   - Add a direct "Print Statement / Receipt" action that triggers the browser print dialog after ensuring all DOM elements and fonts are loaded.

---

## 6. Low Priority & Housekeeping Cleanup
### Planned Fixes
1. **Clean Unused Dependencies:**
   - Remove unused template leftovers from `package.json`: `@google/genai`, `dotenv`, `express`, `tsx`, `esbuild`, `@types/express`.
2. **Remove Repository Artifacts:**
   - Delete stray root test artifacts: `test.pdf` and `Salary_Slip_Test.pdf`.
3. **Verification:**
   - Run `npm run lint`, `npm run build`, and `npm test` to verify all 60+ tests pass with zero regressions.
