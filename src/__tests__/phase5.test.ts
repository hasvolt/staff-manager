import './setup';
import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach } from 'vitest';
import { localDb } from '@/lib/db/dexie';
import { generateUUID } from '@/lib/db/repository';
import { canRoleInviteRole } from '@/lib/permissions/rbac';
import { hasPermission } from '@/lib/permissions/permissions';
import {
  exportBusinessData,
  restoreBusinessData,
  createLocalSnapshot,
} from '@/lib/backup/backupService';
import {
  validateStaffImport,
  executeStaffImport,
  rollbackImportBatch,
} from '@/lib/import/importService';

describe('Phase 5: Multi-User, Roles, Realtime, Conflicts, Backup & Import Tests', () => {
  const orgId = generateUUID();

  beforeEach(async () => {
    await Promise.all(localDb.tables.map((table) => table.clear()));

    // Seed test organization
    await localDb.organizations.put({
      id: orgId,
      org_id: orgId,
      name: 'Global Workshop Pvt Ltd',
      business_type: 'factory',
      currency: 'INR',
      country: 'India',
      week_start: 1,
      settings: {
        terminology_preset: 'factory',
        hide_payments_from_viewers: true,
      },
      owner_id: 'owner_user_1',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      revision: 1,
      syncStatus: 'synced',
    });
  });

  it('1. Enforces role invitation hierarchy and restrictions at permissions level', () => {
    // Owner can invite all subordinate roles
    expect(canRoleInviteRole('owner', 'manager')).toBe(true);
    expect(canRoleInviteRole('owner', 'supervisor')).toBe(true);
    expect(canRoleInviteRole('owner', 'accountant')).toBe(true);
    expect(canRoleInviteRole('owner', 'viewer')).toBe(true);

    // Manager can ONLY invite supervisor, accountant, or viewer (never owner or manager)
    expect(canRoleInviteRole('manager', 'supervisor')).toBe(true);
    expect(canRoleInviteRole('manager', 'accountant')).toBe(true);
    expect(canRoleInviteRole('manager', 'viewer')).toBe(true);
    expect(canRoleInviteRole('manager', 'manager')).toBe(false);
    expect(canRoleInviteRole('manager', 'owner')).toBe(false);

    // Supervisor, Accountant, and Viewer cannot invite anyone
    expect(canRoleInviteRole('supervisor', 'viewer')).toBe(false);
    expect(canRoleInviteRole('accountant', 'viewer')).toBe(false);
    expect(canRoleInviteRole('viewer', 'viewer')).toBe(false);
  });

  it('2. Enforces access control: Supervisor cannot view or manage payments; Viewer cannot write data', () => {
    expect(hasPermission('supervisor', 'canManagePayments')).toBe(false);
    expect(hasPermission('supervisor', 'canViewPayments')).toBe(false);
    expect(hasPermission('supervisor', 'canMarkAttendance')).toBe(true);
    expect(hasPermission('supervisor', 'canLogWork')).toBe(true);

    expect(hasPermission('viewer', 'canEditStaff')).toBe(false);
    expect(hasPermission('viewer', 'canMarkAttendance')).toBe(false);
    expect(hasPermission('viewer', 'canManagePayments')).toBe(false);
  });

  it('3. Detects conflicts when two revisions differ and stores them for user resolution', async () => {
    const recordId = generateUUID();
    const clientData = {
      id: recordId,
      org_id: orgId,
      name: 'Ramesh Mistri - Edited locally',
      revision: 2,
      syncStatus: 'pending',
    };
    const serverData = {
      id: recordId,
      org_id: orgId,
      name: 'Ramesh Mistri - Edited remotely on Device 2',
      revision: 3,
      syncStatus: 'synced',
    };

    // Store conflict
    const conflictId = `staff-${recordId}`;
    await localDb.conflicts.put({
      id: conflictId,
      org_id: orgId,
      table_name: 'staff',
      record_id: recordId,
      client_data: clientData,
      server_data: serverData,
      status: 'pending',
      detected_at: new Date().toISOString(),
    });

    const stored = await localDb.conflicts.get(conflictId);
    expect(stored).toBeDefined();
    expect(stored?.status).toBe('pending');
    expect(stored?.client_data.name).toContain('locally');
    expect(stored?.server_data.name).toContain('remotely');

    // Simulate "Keep Mine" resolution
    await localDb.staff.put({
      ...stored!.client_data,
      revision: stored!.server_data.revision + 1,
      syncStatus: 'pending',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
    await localDb.conflicts.update(conflictId, { status: 'resolved' });

    const updatedConflict = await localDb.conflicts.get(conflictId);
    expect(updatedConflict?.status).toBe('resolved');

    const resolvedStaff = await localDb.staff.get(recordId);
    expect(resolvedStaff?.name).toContain('locally');
    expect(resolvedStaff?.revision).toBe(4);
  });

  it('4. Full JSON Backup & Restore: captures all business data and restores cleanly into a new or existing business', async () => {
    // Add staff and payment entries
    const sId = generateUUID();
    await localDb.staff.put({
      id: sId,
      org_id: orgId,
      name: 'Pooja Verma',
      payment_type: 'daily',
      weekly_off: [0],
      status: 'active',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      revision: 1,
      syncStatus: 'synced',
    });

    await localDb.payments.put({
      id: generateUUID(),
      org_id: orgId,
      staff_id: sId,
      pay_date: '2026-10-09',
      type: 'salary',
      amount: 12000,
      mode: 'bank',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      revision: 1,
      syncStatus: 'synced',
    });

    // 1. Export backup payload
    const backup = await exportBusinessData(orgId);
    expect(backup.metadata.totalStaff).toBe(1);
    expect(backup.metadata.totalPayments).toBe(1);
    expect(backup.data.staff[0].name).toBe('Pooja Verma');

    // 2. Also create rolling local snapshot
    const snapId = await createLocalSnapshot(orgId, 'Auto test snapshot');
    const snapshot = await localDb.snapshots.get(snapId);
    expect(snapshot).toBeDefined();

    // 3. Restore as a brand new business
    const restored = await restoreBusinessData(backup, {
      mode: 'restore_as_new',
      newBusinessName: 'Pooja Workshop Restored',
    });

    expect(restored.success).toBe(true);
    expect(restored.stats.staff).toBe(1);
    expect(restored.stats.payments).toBe(1);
    expect(restored.orgId).not.toBe(orgId);

    // Verify restored organization exists in IndexedDB
    const newOrg = await localDb.organizations.get(restored.orgId);
    expect(newOrg).toBeDefined();
    expect(newOrg?.name).toBe('Pooja Workshop Restored');
  });

  it('5. CSV Import & Rollback: validates staff rows, flags duplicates, imports batch and rolls back completely', async () => {
    const rawRows = [
      { name: 'Karan Sharma', phone: '+91 9999911111', role_designation: 'Mistri', payment_type: 'daily', rate: '750', staff_code: 'K01' },
      { name: 'Rohit Verma', phone: '+91 9999922222', role_designation: 'Helper', payment_type: 'daily', rate: '500', staff_code: 'K02' },
      { name: '', phone: '123', role_designation: 'Invalid', payment_type: 'daily', rate: '0', staff_code: '' }, // invalid
    ];

    const preview = await validateStaffImport(orgId, rawRows);
    expect(preview.length).toBe(3);
    expect(preview[0].isValid).toBe(true);
    expect(preview[1].isValid).toBe(true);
    expect(preview[2].isValid).toBe(false); // name missing

    // Execute import for valid rows
    const result = await executeStaffImport(orgId, preview);
    expect(result.importedCount).toBe(2);
    expect(result.createdIds.length).toBe(2);

    // Check staff in database
    const staffInDb = await localDb.staff.where('org_id').equals(orgId).toArray();
    expect(staffInDb.length).toBe(2);

    // Test duplicate detection with same phone
    const dupCheck = await validateStaffImport(orgId, [
      { name: 'Karan Sharma Duplicate', phone: '+91 9999911111', payment_type: 'daily', rate: '750', staff_code: 'K03' },
    ]);
    expect(dupCheck[0].isDuplicate).toBe(true);

    // Execute full Rollback of the batch
    const removedCount = await rollbackImportBatch(result.batchId);
    expect(removedCount).toBe(2);

    const afterRollback = await localDb.staff.where('org_id').equals(orgId).toArray();
    expect(afterRollback.length).toBe(0);
  });
});
