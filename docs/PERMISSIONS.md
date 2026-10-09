# Role-Based Access Control & Permissions Matrix

This document defines the permission matrix across all 5 user roles supported in **Staff Manager**.
The exact rules specified here are enforced in two places:
1. **Frontend / UI**: Central permission helper in `/src/lib/permissions/permissions.ts` and `/src/lib/permissions/rbac.ts`.
2. **Database Engine**: PostgreSQL Row Level Security (RLS) policies in `/supabase/migrations`.

---

## 1. Role Definitions

| Role | Target Persona | Description |
| :--- | :--- | :--- |
| **Owner** | Business Proprietor / Employer | Absolute administrative access. Manages business details, members, billing, permanent deletion, period unlocking, and ownership transfer. |
| **Manager** | Store Manager / Site In-Charge | Full operational access. Can add/edit staff, mark daily attendance, log work, create payments, export reports, and invite non-owner team members. |
| **Supervisor** | Site Supervisor / Field Foreman | Field attendance and daily work logging only. **Strictly prohibited from viewing or managing payments, wages, or financial balances.** |
| **Accountant** | Bookkeeper / Cashier / CA | Financial ledger, payment payouts, advance recovery, settlement, and report exports. Read-only access to staff profiles; cannot edit attendance. |
| **Viewer** | Auditor / Stakeholder / Partner | Read-only visibility. Cannot edit records. Financial payouts can be hidden by the Owner in Business Settings. |

---

## 2. Permissions Matrix

| Capability / Action | Owner | Manager | Supervisor | Accountant | Viewer |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **View Staff Profiles** | Yes | Yes | Yes | Yes | Yes |
| **Add / Edit Staff Profiles** | Yes | Yes | No | No | No |
| **View Hourly / Daily Rates** | Yes | Yes | **No** | Yes | Setting* |
| **Mark Daily Attendance** | Yes | Yes | Yes | No | No |
| **Log Work / Units / Overtime** | Yes | Yes | Yes | No | No |
| **View Payment & Ledger Totals** | Yes | Yes | **No** | Yes | Setting* |
| **Record Payments / Advances** | Yes | Yes | **No** | Yes | No |
| **Settle Month / Period Closing** | Yes | Yes | **No** | Yes | No |
| **Unlock Closed Settlement Period** | **Yes** | No | No | No | No |
| **Export Reports (PDF / Excel)** | Yes | Yes | Attendance only | Yes | Setting* |
| **Invite Team Members** | Anyone | Sup/Acc/View | No | No | No |
| **Change Member Roles** | Yes | No | No | No | No |
| **Transfer Ownership** | **Yes** | No | No | No | No |
| **Soft Delete to Trash** | Yes | Yes** | No | No | No |
| **Restore from Trash** | Yes | Yes | No | No | No |
| **Permanent Database Delete** | **Yes** | No | No | No | No |

*\* Setting: Owner can toggle `hide_payments_from_viewers` in Business Settings.*  
*\*\* Setting: Owner can require approval before Managers delete staff with history.*

---

## 3. Database Enforcement (RLS Policies)

- **`memberships`**: Only owners can update roles or transfer ownership. Managers can view team members but cannot promote anyone to Manager or Owner.
- **`invites`**: Trigger `check_invite_role_trigger` strictly restricts Manager invites to `supervisor`, `accountant`, or `viewer`.
- **`payments`**: RLS select & insert policies explicitly check `public.has_org_role(org_id, array['owner','manager','accountant'])`. Supervisors are barred at the PostgreSQL level.
- **`period_closings`**: Triggers `check_period_closed_attendance` and `check_period_closed_payment` abort transactions if an edit falls within a closed settlement period.
