import { localDb } from '@/lib/db/dexie';
import { generateUUID } from '@/lib/db/repository';

export interface BusinessBackupPayload {
  version: number;
  timestamp: string;
  sourceOrgId: string;
  sourceOrgName: string;
  metadata: {
    exportedAt: string;
    totalStaff: number;
    totalAttendance: number;
    totalPayments: number;
  };
  data: {
    organization: any;
    sites: any[];
    work_types: any[];
    custom_field_defs: any[];
    staff: any[];
    staff_compensation: any[];
    attendance_entries: any[];
    work_entries: any[];
    payments: any[];
    period_closings: any[];
    app_settings: any[];
  };
}

export async function createLocalSnapshot(orgId: string, note?: string): Promise<string> {
  const snapshotData = await exportBusinessData(orgId);
  const snapshotId = generateUUID();
  const timestamp = new Date().toISOString();

  await localDb.snapshots.put({
    id: snapshotId,
    timestamp,
    data_json: JSON.stringify(snapshotData),
    note: note || `Auto snapshot ${new Date().toLocaleString()}`,
  });

  // Keep rolling last 10 snapshots per database
  const all = await localDb.snapshots.orderBy('timestamp').toArray();
  if (all.length > 10) {
    const toRemove = all.slice(0, all.length - 10);
    for (const snap of toRemove) {
      await localDb.snapshots.delete(snap.id);
    }
  }

  return snapshotId;
}

export async function exportBusinessData(orgId: string): Promise<BusinessBackupPayload> {
  const org = await localDb.organizations.get(orgId);
  const sites = await localDb.sites.where('org_id').equals(orgId).toArray();
  const workTypes = await localDb.work_types.where('org_id').equals(orgId).toArray();
  const customFields = await localDb.custom_field_defs.where('org_id').equals(orgId).toArray();
  const staff = await localDb.staff.where('org_id').equals(orgId).toArray();
  const compensation = await localDb.staff_compensation.where('org_id').equals(orgId).toArray();
  const attendance = await localDb.attendance_entries.where('org_id').equals(orgId).toArray();
  const work = await localDb.work_entries.where('org_id').equals(orgId).toArray();
  const payments = await localDb.payments.where('org_id').equals(orgId).toArray();
  const closings = await localDb.period_closings.where('org_id').equals(orgId).toArray();
  const settings = await localDb.app_settings.toArray();

  return {
    version: 1,
    timestamp: new Date().toISOString(),
    sourceOrgId: orgId,
    sourceOrgName: org?.name || 'Business',
    metadata: {
      exportedAt: new Date().toISOString(),
      totalStaff: staff.length,
      totalAttendance: attendance.length,
      totalPayments: payments.length,
    },
    data: {
      organization: org,
      sites,
      work_types: workTypes,
      custom_field_defs: customFields,
      staff,
      staff_compensation: compensation,
      attendance_entries: attendance,
      work_entries: work,
      payments,
      period_closings: closings,
      app_settings: settings,
    },
  };
}

export function downloadBackupFile(backup: BusinessBackupPayload, filename?: string) {
  const jsonStr = JSON.stringify(backup, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  const safeName = (filename || `${backup.sourceOrgName}_backup_${new Date().toISOString().split('T')[0]}`)
    .replace(/[^a-z0-9_-]/gi, '_');
  link.setAttribute('download', `${safeName}.json`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export interface RestoreOptions {
  mode: 'merge' | 'restore_as_new';
  targetOrgId?: string;
  newBusinessName?: string;
}

export async function restoreBusinessData(
  payload: BusinessBackupPayload,
  options: RestoreOptions
): Promise<{ success: boolean; orgId: string; stats: Record<string, number> }> {
  if (!payload || !payload.data) {
    throw new Error('Invalid backup file format.');
  }

  const isNewOrg = options.mode === 'restore_as_new';
  const targetOrgId = isNewOrg ? generateUUID() : options.targetOrgId || payload.sourceOrgId;
  const now = new Date().toISOString();

  // If restoring as new business
  if (isNewOrg) {
    const originalOrg = payload.data.organization || {};
    await localDb.organizations.put({
      id: targetOrgId,
      org_id: targetOrgId,
      name: options.newBusinessName || `${payload.sourceOrgName} (Restored)`,
      business_type: originalOrg.business_type || 'other',
      currency: originalOrg.currency || 'INR',
      country: originalOrg.country || 'India',
      week_start: originalOrg.week_start || 1,
      settings: originalOrg.settings || {},
      owner_id: originalOrg.owner_id || 'restored_user',
      created_at: now,
      updated_at: now,
      revision: 1,
      syncStatus: 'local-only',
    });
  }

  const idMap = new Map<string, string>();
  // If restoring as new, create fresh IDs to prevent collisions
  const remapId = (oldId: string): string => {
    if (!isNewOrg) return oldId;
    if (!idMap.has(oldId)) {
      idMap.set(oldId, generateUUID());
    }
    return idMap.get(oldId)!;
  };

  let siteCount = 0;
  for (const item of payload.data.sites || []) {
    await localDb.sites.put({
      ...item,
      id: remapId(item.id),
      org_id: targetOrgId,
      updated_at: now,
      syncStatus: 'pending',
    });
    siteCount++;
  }

  let workTypeCount = 0;
  for (const item of payload.data.work_types || []) {
    await localDb.work_types.put({
      ...item,
      id: remapId(item.id),
      org_id: targetOrgId,
      updated_at: now,
      syncStatus: 'pending',
    });
    workTypeCount++;
  }

  let staffCount = 0;
  for (const item of payload.data.staff || []) {
    await localDb.staff.put({
      ...item,
      id: remapId(item.id),
      org_id: targetOrgId,
      default_site_id: item.default_site_id ? remapId(item.default_site_id) : undefined,
      updated_at: now,
      syncStatus: 'pending',
    });
    staffCount++;
  }

  for (const item of payload.data.staff_compensation || []) {
    await localDb.staff_compensation.put({
      ...item,
      id: remapId(item.id),
      org_id: targetOrgId,
      staff_id: remapId(item.staff_id),
      updated_at: now,
      syncStatus: 'pending',
    });
  }

  let attendanceCount = 0;
  for (const item of payload.data.attendance_entries || []) {
    await localDb.attendance_entries.put({
      ...item,
      id: remapId(item.id),
      org_id: targetOrgId,
      staff_id: remapId(item.staff_id),
      updated_at: now,
      syncStatus: 'pending',
    });
    attendanceCount++;
  }

  let workCount = 0;
  for (const item of payload.data.work_entries || []) {
    await localDb.work_entries.put({
      ...item,
      id: remapId(item.id),
      org_id: targetOrgId,
      staff_id: remapId(item.staff_id),
      site_id: item.site_id ? remapId(item.site_id) : undefined,
      work_type_id: item.work_type_id ? remapId(item.work_type_id) : undefined,
      updated_at: now,
      syncStatus: 'pending',
    });
    workCount++;
  }

  let paymentCount = 0;
  for (const item of payload.data.payments || []) {
    await localDb.payments.put({
      ...item,
      id: remapId(item.id),
      org_id: targetOrgId,
      staff_id: remapId(item.staff_id),
      updated_at: now,
      syncStatus: 'pending',
    });
    paymentCount++;
  }

  return {
    success: true,
    orgId: targetOrgId,
    stats: {
      staff: staffCount,
      attendance: attendanceCount,
      work: workCount,
      payments: paymentCount,
      sites: siteCount,
      workTypes: workTypeCount,
    },
  };
}
