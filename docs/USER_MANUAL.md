# Rozfiber Staff Manager - Complete User Manual & System Guide
**Version:** 1.0.0  
**Target Audience:** Business Owners, Contractors, Factory/Workshop Owners, Shopkeepers, Accountants, HR & Supervisors  
**Official App URL:** [https://staff.rozfiber.com](https://staff.rozfiber.com)  
**Rozfiber Central Documentation Portal:** [https://docs.rozfiber.com/staff-manager/](https://docs.rozfiber.com/staff-manager/)  

---

## 1. Introduction & Overview

**Staff Manager** is an offline-first, enterprise-grade staff management and payroll record-keeping PWA (Progressive Web Application) designed for small to medium businesses, shops, contractors, workshops, farms, and households.

### Key Highlights:
- **Offline-First Resilience:** Operates completely offline with automatic cloud synchronization via Supabase and IndexedDB.
- **Multi-Device & Multi-User:** Role-Based Access Control (Owner, Manager, Supervisor, Accountant, Viewer) with real-time updates.
- **Universal Customization:** Supports 12 readable high-contrast themes and 16 Indian & Global languages (with RTL layout for Urdu/Arabic).
- **Zero Data Loss Guarantee:** Complete Soft-Delete architecture with Trash/Recycle Bin, undo actions, revision tracking, and automated audit logs.

---

## 2. Recommended Documentation Architecture: Where Should This Guide Live?

For maximum user convenience, SEO authority, and customer support efficiency, the recommended strategy is **Hybrid (Dual Integration)**:

| Location | Purpose | Best For |
|---|---|---|
| **docs.rozfiber.com/staff-manager/** *(Central Docs)* | Comprehensive, searchable, indexed documentation with deep-dives, API references, troubleshooting guides, and screenshots. | New visitors, Google search, company IT teams, customer support links. |
| **staff.rozfiber.com** *(In-App Help Center)* | Quick onboarding (3-Step Guide), contextual tooltips, interactive sample demo data generator, and quick how-tos. | Logged-in daily users who need answers inside the app without switching tabs. |

In the app, users can click **Help & Guides** in the side drawer menu, with a direct link:  
👉 *"Read Full Documentation on docs.rozfiber.com/staff-manager/"*

---

## 3. Complete Feature Breakdown & System Options

### 3.1. Authentication & Cloud Setup
1. **Sign Up & Sign In:**
   - Email + Password with password validation.
   - Password reset via secure magic link or recovery email.
   - Google Sign-In support (configurable via `VITE_ENABLE_GOOGLE_LOGIN`).
2. **Local Mode (No-Account Option):**
   - Start immediately without registration; all records are stored in browser IndexedDB.
   - Effortlessly "Upgrade to Cloud" at any time with a safe data preview and zero data overwrite.
3. **Multi-Organization Switcher:**
   - One user account can manage or join multiple businesses (e.g., Shop, Factory, Construction Site).
   - Instant business switcher in the top navigation header.

---

### 3.2. Staff Management (`/staff`)
- **Add Staff in Seconds:**
  - Name, Phone, Alternate Phone, Staff ID (auto-generated or customized), Designation/Role (Mistri, Helper, Driver, Accountant, etc.).
  - Joining Date, Address, Emergency Contact.
  - Safe free-text UPI / Bank Note (with built-in privacy protection).
- **Flexible Wage/Salary Models:**
  - **Daily Wage:** Full day rate + optional Half Day & Overtime hourly rates.
  - **Monthly Fixed Salary:** Prorated based on 30-day fixed or actual calendar days.
  - **Hourly Wage:** Total hours worked × hourly rate.
  - **Piece-Rate / Unit Worker:** Custom unit name (e.g., per sq ft, per bag, per point, per trip) × unit rate.
  - **Effective-From Date:** Changing a staff's wage rate automatically preserves older attendance and payroll calculations without altering historical data.
- **Custom Fields:**
  - Add custom attributes (Dropdown, Text, Number, Date, Yes/No) tailored to your industry.
- **Actions:**
  - Search, Filter by Site / Role / Status, Bulk Archive, Duplicate, and Move to Trash.

---

### 3.3. Daily Attendance (`/attendance`)
- **10-Second Mark-All Workflow:**
  - Tap **"Mark All Present"** for the selected date, then adjust exceptions with 1 tap.
- **Statuses Supported:**
  - **Present (P):** Full day attendance.
  - **Absent (A):** Unpaid absence.
  - **Half Day (HD):** Automatically calculated at 50% of the daily wage.
  - **Paid Leave (PL) / Unpaid Leave (UL):** Accurate wage tracking for monthly employees.
  - **Holiday (H):** Organization-wide off day.
  - **Overtime (OT):** Input overtime hours directly.
- **Calendar & Monthly View:**
  - Color-coded monthly calendar view per staff member.
  - Tap any past date to view or edit historical attendance.
- **Duplicate Protection:**
  - Unique database constraints prevent accidental double entries for the same employee on the same date.

---

### 3.4. Work Logs & Site Management (`/work`)
- **Job Tracking:**
  - Record daily work descriptions, assigned Site/Project, work type, and custom notes.
- **Piece-Rate Work Logging:**
  - Enter units completed (e.g., 250 sq ft of tiling) or machine hours for accurate wage settlement.
- **Managed Sites & Work Types:**
  - Add, edit, or archive Sites (e.g., "Site A - MG Road", "Warehouse 2") and Work Types.

---

### 3.5. Payments, Advances & Ledger (`/payments`)
- **Payment Categories:**
  - **Salary / Wage Settlement:** Regular earnings disbursement.
  - **Advance (Udhar / Peshgi):** Cash or UPI advance given to staff.
  - **Bonus:** Performance or festive incentives.
  - **Deduction & Penalty:** Late penalties, material damage, or loan adjustments.
  - **Reimbursement:** Fuel, materials, or out-of-pocket expenses paid by staff.
  - **Loan with Repayment Schedule:** Multi-month loan tracking.
- **Built-in Quick Calculator:**
  - Every amount input has a quick calculator popover (`+`, `-`, `×`, `÷`, `%`) with a 1-tap **"Use Result"** button.
  - Includes a link to **Daily Khata Pro Advanced Calculators** (`?amount=value`).
- **Staff Ledger (Khata):**
  - Instant ledger card for each employee: Total Earned, Total Paid, Advance Balance, Net Payable.
  - Clear color coding: Green (Owed to Staff) vs Red (Owed by Staff).

---

### 3.6. Month Settlement & Period Locking
- **Monthly Payout Flow:**
  - Select month & year to view pre-calculated earnings, advances recovered, deductions, and balance due.
  - One-click bulk payout or partial payment.
- **Period Locking (Tamper Protection):**
  - Lock closed accounting periods to prevent supervisors or accountants from modifying past attendance or wages.
  - Only Business Owners can unlock a closed period (with an automated audit log entry).

---

### 3.7. Reports, Statements & Export (`/reports`)
- **Reports Available:**
  1. **Salary Slips / Payment Statements:** Complete breakdown with company name, logo, attendance count, additions, deductions, net salary, and signature placeholders.
  2. **Attendance Register:** Monthly matrix of daily attendance for all employees.
  3. **Advances & Udhar Ledger:** Complete history of loans, advances, and recoveries.
  4. **Site-Wise Labour Cost Analysis:** Track spending per job site or client.
- **Export & Print Capabilities:**
  - **First-Attempt Instant Print:** CSS optimized for clean Black & White output on A4/Letter papers across mobile and desktop.
  - **PDF Download:** Generated via `jspdf` and `autotable` with full Unicode font support.
  - **Excel & CSV Export:** UTF-8 BOM encoding for proper character rendering in Microsoft Excel across all 16 languages.
  - **WhatsApp & Native Share:** Share salary summaries and receipts directly with staff.

---

### 3.8. Team Roles & Access Control (`/members`)
Staff Manager enforces 5 strict security roles at both UI and PostgreSQL Database (Row Level Security) levels:

1. **Owner:** Unrestricted access, billing, organization settings, role changes, trash purging, and period unlocking.
2. **Manager:** Can manage staff, attendance, work, payments, sites, reports, and invite junior members.
3. **Supervisor:** Limited to marking attendance and logging work (can be restricted to assigned sites only). **No access to payments or salary figures.**
4. **Accountant:** Manages payments, advances, settlements, ledgers, and reports. **Read-only access to staff profiles; cannot edit attendance.**
5. **Viewer:** Read-only viewing mode for auditors or partners.

---

### 3.9. Trash & Recycle Bin (`/trash`)
- Accidental deletions are impossible. Deleting staff, attendance, or payments moves records to the **Trash**.
- Tap **Restore** to bring back any item with all linked history completely intact.
- Permanent deletion requires Owner confirmation with double-check dialogs.

---

### 3.10. Offline Sync & Conflict Engine
- Works seamlessly without internet connectivity.
- When an internet connection is restored:
  - Changes queued in the local outbox are pushed automatically.
  - Real-time updates push edits across other connected devices.
  - In case of concurrent conflicting edits, payments and closed periods trigger a side-by-side **Conflict Resolution View** (Keep Mine / Keep Theirs / Merge).

---

## 4. Step-by-Step "How to Get Started" Guide

### Step 1: Add Your Staff
1. Go to the **Staff** tab.
2. Click **+ Add Staff**.
3. Enter the staff member's name, choose their wage type (Daily, Monthly, Hourly, or Per Piece), and enter their rate.
4. Click **Save Staff**.

### Step 2: Mark Daily Attendance
1. Go to the **Attendance** tab.
2. Pick today's date (or any past date).
3. Tap **Mark All Present**.
4. Tap on any staff member who took leave or worked a half-day to change their individual status.

### Step 3: Record Advances or Pay Salaries
1. Go to the **Payments** tab.
2. Click **+ Add Payment**.
3. Select the staff member, choose **Advance** (or **Salary**), enter the amount using the quick calculator, and save.

### Step 4: Generate Salary Slips & Reports
1. Go to **Reports**.
2. Select **Salary Slip** or **Attendance Register**.
3. Choose the date range or month.
4. Tap **Download PDF** or **Print** to share with the worker or keep for office records.

---

## 5. Contact & Support
- **Application URL:** [https://staff.rozfiber.com](https://staff.rozfiber.com)
- **Central Documentation:** [https://docs.rozfiber.com/staff-manager/](https://docs.rozfiber.com/staff-manager/)
- **Sister App:** [Daily Khata Pro](https://dailykhata.rozfiber.com)
- **Support Email:** support@rozfiber.com
