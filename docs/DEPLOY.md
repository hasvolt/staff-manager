# Deployment & Operations Guide - Staff Manager

This guide details how to deploy and operate **Staff Manager** in production on a custom domain / subdomain (such as `https://staff.rozfiber.com`).

---

## 1. Architecture Overview

- **Frontend**: Vite + React 19 + TypeScript + Tailwind CSS v4 PWA. Hosted on **Vercel** or any modern edge hosting.
- **Backend / Database**: **Supabase** (Managed PostgreSQL + GoTrue Auth + Realtime + Storage + Row Level Security).
- **Client Cache**: Local-First via **Dexie (IndexedDB)** with background outbox synchronization and conflict detection.
- **Sister Product**: Daily Khata Pro (`https://www.rozfiber.com`). Staff Manager operates independently on its own subdomain with optional payment export and shared calculator bridges.

---

## 2. Supabase Cloud Setup

1. **Create Supabase Project**:
   - Go to [Supabase Dashboard](https://supabase.com) and create a new project (e.g. `staff-manager-prod`).
   - Select your closest region (e.g., `ap-south-1` Mumbai or `eu-central-1` Frankfurt).
   - Set a strong database password and store it securely.

2. **Run Versioned Migrations**:
   Execute the migration SQL files located in `/supabase/migrations` in sequential order via the Supabase SQL Editor:
   - `20261008000000_initial_schema.sql` (Tables, profiles, organizations, memberships, invites, devices, RLS)
   - `20261009000000_phase1_hardening.sql` (Security definer RPCs, delete_my_account, session safeguards)
   - `20261010000000_phase3_period_lock.sql` (Settlement period locking triggers for attendance & payments)
   - `20261011000000_phase5_multiuser_realtime.sql` (Role invite validation, transfer ownership, realtime publication)

3. **Configure Authentication (GoTrue)**:
   - **Site URL**: `https://staff.rozfiber.com`
   - **Redirect URLs**:
     - `https://staff.rozfiber.com/**`
     - `https://staff.rozfiber.com/?invite=*`
   - **Email Provider**: Enable Email/Password. Configure your custom SMTP provider (e.g. Resend, SendGrid, or Amazon SES) for high delivery rates.
   - **Google OAuth (Optional)**: Enable under Auth Providers if `VITE_ENABLE_GOOGLE_LOGIN="true"`.

4. **Storage Bucket**:
   - Ensure the private bucket `org-files` exists (created automatically by migration 001).
   - Confirm public access is disabled; all file reads use signed URLs.

5. **Backups**:
   - Enable automated daily backups in Supabase Project Settings > Database > Backups.

---

## 3. Vercel Deployment

1. **Import Git Repository**:
   - Create a new project on Vercel and link your GitHub repository.
   - Framework preset: `Vite`.
   - Build command: `bun run build` (or `npm run build`).
   - Output directory: `dist`.

2. **Environment Variables**:
   Configure these in Vercel Project Settings > Environment Variables:
   ```env
   VITE_SUPABASE_URL="https://your-project-id.supabase.co"
   VITE_SUPABASE_ANON_KEY="your-supabase-anon-key"
   VITE_APP_NAME="Staff Manager"
   VITE_APP_URL="https://staff.rozfiber.com"
   VITE_DAILY_KHATA_URL="https://www.rozfiber.com"
   VITE_ADVANCED_CALCULATOR_URL="https://www.rozfiber.com/calculator"
   VITE_SUPPORT_EMAIL="support@rozfiber.com"
   VITE_ENABLE_GOOGLE_LOGIN="false"
   VITE_ENABLE_LOCAL_MODE="true"
   ```
   *Warning*: Never add the Supabase `service_role` secret to the frontend environment.

3. **Subdomain DNS Setup (e.g., `staff.rozfiber.com`)**:
   - In Vercel Project Settings > Domains, add `staff.rozfiber.com`.
   - In your DNS provider (Cloudflare, GoDaddy, Namecheap):
     - Type: `CNAME`
     - Name: `staff`
     - Value: `cname.vercel-dns.com`
   - Wait for DNS propagation and automatic SSL certificate generation (~5-10 minutes).

4. **Security Headers & SPA Routing**:
   Verify that `vercel.json` contains SPA route rewriting (`"source": "/(.*)", "destination": "/index.html"`) and strict security headers (`Content-Security-Policy`, `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`).

---

## 4. Operational Monitoring & Health Checks

1. **Offline & Sync Health**:
   - Test by opening the app, disconnecting network connectivity, marking attendance, and reconnecting. The sync badge will smoothly transition: `Offline` -> `Syncing...` -> `Synced`.
2. **Periodic Snapshots**:
   - Businesses automatically retain the last 10 rolling snapshots in IndexedDB.
   - Owners can download full JSON backups at any time from Menu > Backup & Restore Data.
