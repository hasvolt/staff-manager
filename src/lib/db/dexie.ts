import Dexie, { Table } from 'dexie';
import { SyncedEntity, SyncStatus } from '@/lib/sync/types';

export interface LocalProfile {
  id: string;
  full_name?: string;
  phone?: string;
  language?: string;
  created_at: string;
  updated_at: string;
}

export interface LocalOrganization extends SyncedEntity {
  name: string;
  business_type: string;
  currency: string;
  country?: string | null;
  week_start: number;
  settings: Record<string, any>;
  logo_path?: string | null;
  owner_id: string;
}

export interface LocalMembership {
  id: string;
  org_id: string;
  user_id: string;
  role: 'owner' | 'manager' | 'supervisor' | 'accountant' | 'viewer';
  assigned_site_ids: string[];
  status: 'active' | 'suspended';
  created_at: string;
  syncStatus?: SyncStatus;
}

export interface LocalSite extends SyncedEntity {
  name: string;
  address?: string | null;
  note?: string | null;
  status: string;
  custom?: Record<string, any>;
}

export interface LocalWorkType extends SyncedEntity {
  name: string;
  unit_name?: string | null;
  default_rate?: number | null;
  custom?: Record<string, any>;
}

export interface LocalCustomFieldDef extends SyncedEntity {
  entity: 'staff' | 'attendance' | 'work' | 'payment';
  label: string;
  field_type: 'text' | 'number' | 'date' | 'dropdown' | 'boolean';
  options?: any[];
  sort_order: number;
}

export interface LocalStaffCompensation extends SyncedEntity {
  staff_id: string;
  rate: number;
  overtime_rate?: number | null;
  rate_history: any[];
  payment_note?: string | null;
}

export interface LocalStaff extends SyncedEntity {
  name: string;
  staff_code?: string | null;
  phone?: string | null;
  alt_phone?: string | null;
  photo_path?: string | null;
  role_title?: string | null;
  joining_date?: string | null;
  status: 'active' | 'inactive' | 'left';
  address?: string | null;
  emergency_contact?: string | null;
  id_proof_note?: string | null;
  notes?: string | null;
  payment_type: 'daily' | 'monthly' | 'hourly' | 'piece';
  hours_per_day?: number | null;
  unit_name?: string | null;
  weekly_off: number[];
  default_site_id?: string | null;
  custom?: Record<string, any>;
  // Sensitive compensation stored in separate staff_compensation table
  compensation?: LocalStaffCompensation;
  rate?: number;
  overtime_rate?: number | null;
  rate_history?: any[];
  payment_note?: string | null;
}

export interface LocalAttendanceEntry extends SyncedEntity {
  staff_id: string;
  work_date: string;
  status: 'present' | 'absent' | 'half' | 'leave_paid' | 'leave_unpaid' | 'holiday';
  overtime_hours: number;
  site_id?: string | null;
  note?: string | null;
  custom?: Record<string, any>;
}

export interface LocalWorkEntry extends SyncedEntity {
  staff_id: string;
  work_date: string;
  work_type_id?: string | null;
  site_id?: string | null;
  description?: string | null;
  quantity?: number | null;
  hours?: number | null;
  start_time?: string | null;
  end_time?: string | null;
  photo_path?: string | null;
  note?: string | null;
  custom?: Record<string, any>;
}

export interface LocalPayment extends SyncedEntity {
  staff_id: string;
  pay_date: string;
  type: 'salary' | 'advance' | 'bonus' | 'deduction' | 'penalty' | 'reimbursement' | 'loan' | 'loan_repayment';
  amount: number;
  mode?: 'cash' | 'upi' | 'bank' | 'cheque' | 'other' | null;
  reference?: string | null;
  note?: string | null;
  period_start?: string | null;
  period_end?: string | null;
  receipt_path?: string | null;
  linked_period_id?: string | null;
  override_note?: string | null;
  custom?: Record<string, any>;
}

export interface LocalPeriodClosing extends SyncedEntity {
  period_start: string;
  period_end: string;
  staff_id?: string | null;
  status: 'closed' | 'reopened';
  note?: string | null;
}

export interface LocalAuditLog {
  id?: number;
  org_id: string;
  entity_type: string;
  entity_id: string;
  action: string;
  before_data?: any;
  after_data?: any;
  user_id?: string | null;
  device_id?: string | null;
  created_at: string;
}

export interface OutboxItem {
  id: string;
  table_name: string;
  record_id: string;
  action: 'insert' | 'update' | 'delete';
  payload: any;
  base_revision: number;
  created_at: string;
  attempts: number;
  error?: string | null;
}

export interface SyncCursor {
  table_name: string;
  last_pulled_at: string;
}

export interface AppSetting {
  key: string;
  value: any;
}

export interface LocalDraft {
  form_key: string;
  data: any;
  updated_at: string;
}

export interface LocalSnapshot {
  id: string;
  timestamp: string;
  data_json: string;
  note?: string;
}

export interface ConflictItem {
  id: string;
  org_id: string;
  table_name: string;
  record_id: string;
  client_data: any;
  server_data: any;
  status: 'pending' | 'resolved';
  detected_at: string;
}

export class StaffManagerDatabase extends Dexie {
  profiles!: Table<LocalProfile, string>;
  organizations!: Table<LocalOrganization, string>;
  memberships!: Table<LocalMembership, string>;
  sites!: Table<LocalSite, string>;
  work_types!: Table<LocalWorkType, string>;
  custom_field_defs!: Table<LocalCustomFieldDef, string>;
  staff!: Table<LocalStaff, string>;
  staff_compensation!: Table<LocalStaffCompensation, string>;
  attendance_entries!: Table<LocalAttendanceEntry, string>;
  work_entries!: Table<LocalWorkEntry, string>;
  payments!: Table<LocalPayment, string>;
  period_closings!: Table<LocalPeriodClosing, string>;
  audit_log!: Table<LocalAuditLog, number>;
  outbox!: Table<OutboxItem, string>;
  sync_cursors!: Table<SyncCursor, string>;
  app_settings!: Table<AppSetting, string>;
  drafts!: Table<LocalDraft, string>;
  snapshots!: Table<LocalSnapshot, string>;
  conflicts!: Table<ConflictItem, string>;

  constructor() {
    super('staff_manager_db');
    this.version(1).stores({
      profiles: 'id, updated_at',
      organizations: 'id, owner_id, updated_at, deleted_at, syncStatus',
      memberships: 'id, org_id, user_id, role, status, syncStatus',
      sites: 'id, org_id, status, updated_at, deleted_at, syncStatus',
      work_types: 'id, org_id, updated_at, deleted_at, syncStatus',
      custom_field_defs: 'id, org_id, entity, updated_at, deleted_at, syncStatus',
      staff: 'id, org_id, name, staff_code, phone, status, payment_type, default_site_id, updated_at, deleted_at, syncStatus',
      staff_compensation: 'id, org_id, staff_id, updated_at, deleted_at, syncStatus',
      attendance_entries: 'id, org_id, staff_id, work_date, status, updated_at, deleted_at, syncStatus',
      work_entries: 'id, org_id, staff_id, work_date, work_type_id, site_id, updated_at, deleted_at, syncStatus',
      payments: 'id, org_id, staff_id, pay_date, type, mode, updated_at, deleted_at, syncStatus',
      period_closings: 'id, org_id, period_start, period_end, status, updated_at, deleted_at, syncStatus',
      audit_log: '++id, org_id, entity_type, entity_id, action, created_at',
      outbox: 'id, table_name, record_id, created_at, attempts',
      sync_cursors: 'table_name',
      app_settings: 'key',
      drafts: 'form_key, updated_at',
      snapshots: 'id, timestamp',
      conflicts: 'id, org_id, table_name, status, detected_at',
    });
  }
}

export const localDb = new StaffManagerDatabase();
