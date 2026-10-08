# Supabase Migrations & Database Setup Guide

## Applying Migrations

### Option 1: Supabase Web Dashboard (Recommended for Quick Prototyping)
1. Go to your Supabase Project Dashboard (`https://supabase.com/dashboard/project/<your-project-id>`).
2. Navigate to the **SQL Editor** tab on the left sidebar.
3. Open `supabase/migrations/20261008000000_initial_schema.sql` from this repository.
4. Copy the entire SQL content and paste it into the SQL Editor.
5. Click **Run** (Cmd/Ctrl + Enter).
6. Verify in the **Table Editor** that all tables (`profiles`, `organizations`, `memberships`, `invites`, `devices`, `sites`, `work_types`, `custom_field_defs`, `staff`, `attendance_entries`, `work_entries`, `payments`, `period_closings`, `audit_log`) and bucket `org-files` are created.

### Option 2: Supabase CLI
```bash
supabase link --project-ref <your-project-id>
supabase db push
```

## Security & Verification

- **Row Level Security (RLS)**: Enforced on every public table. Anonymous requests are blocked; authenticated users can only access records in organizations where they have an active membership.
- **RPC Security Definer Functions**:
  - `create_organization`: creates an organization and assigns the caller as owner in an atomic transaction.
  - `accept_invite`: validates the 6-byte hex invite code, expiry, and max uses before creating the membership.
  - `delete_my_account`: deletes account and owned businesses provided no other members belong to them.
- **Private Storage**: `org-files` bucket is strictly non-public; signed URLs are required for avatars, logos, and receipt attachments.
