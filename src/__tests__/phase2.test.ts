import './setup';
import { describe, it, expect, beforeEach } from 'vitest';
import { localDb } from '@/lib/db/dexie';
import {
  staffRepo,
  attendanceRepo,
  workRepo,
  siteRepo,
  workTypeRepo,
  customFieldRepo,
  generateUUID,
} from '@/lib/db/repository';
import { canUserPerformAction } from '@/lib/permissions/rbac';

describe('Phase 2: Staff Profiles, Attendance, Work, Sites, & Trash Tests', () => {
  const orgId = generateUUID();

  beforeEach(async () => {
    await localDb.staff.clear();
    await localDb.attendance_entries.clear();
    await localDb.work_entries.clear();
    await localDb.sites.clear();
    await localDb.work_types.clear();
    await localDb.custom_field_defs.clear();
    await localDb.outbox.clear();
  });

  it('handles 1000 staff members efficiently in IndexedDB', async () => {
    const startTime = performance.now();
    const batch = [];
    for (let i = 1; i <= 1000; i++) {
      batch.push({
        id: generateUUID(),
        org_id: orgId,
        name: `Staff Worker ${i}`,
        staff_code: `STF-${1000 + i}`,
        role_title: i % 2 === 0 ? 'Mistri' : 'Helper',
        payment_type: 'daily' as const,
        rate: 600 + (i % 10) * 50,
        status: 'active' as const,
        weekly_off: [0],
        rate_history: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        revision: 1,
        deleted_at: null,
      });
    }

    await localDb.staff.bulkAdd(batch);
    const writeTime = performance.now() - startTime;
    expect(writeTime).toBeLessThan(3000); // 1000 staff added within 3s

    const queryStart = performance.now();
    const count = await localDb.staff
      .where('org_id')
      .equals(orgId)
      .filter((s) => !s.deleted_at && s.status === 'active')
      .count();
    const queryTime = performance.now() - queryStart;

    expect(count).toBe(1000);
    expect(queryTime).toBeLessThan(500); // Query completes under 500ms
  });

  it('enforces single attendance entry per staff per date and allows one-tap status updates', async () => {
    const staff = await staffRepo.create({
      org_id: orgId,
      name: 'Ramu Kaka',
      payment_type: 'daily',
      rate: 750,
      status: 'active',
      weekly_off: [0],
      rate_history: [],
    });

    const today = '2026-10-08';

    // 1. Mark present
    const entry = await attendanceRepo.create({
      org_id: orgId,
      staff_id: staff.id,
      work_date: today,
      status: 'present',
      overtime_hours: 0,
    });

    expect(entry.status).toBe('present');

    // 2. Update to Half Day
    const updated = await attendanceRepo.update(entry.id, {
      status: 'half',
      overtime_hours: 2,
    });

    expect(updated.status).toBe('half');
    expect(updated.overtime_hours).toBe(2);

    // 3. Verify exactly 1 attendance entry exists for this date
    const allForToday = await localDb.attendance_entries
      .where('org_id')
      .equals(orgId)
      .filter((a) => !a.deleted_at && a.staff_id === staff.id && a.work_date === today)
      .toArray();

    expect(allForToday).toHaveLength(1);
    expect(allForToday[0].status).toBe('half');
  });

  it('attaches custom field templates to staff profiles', async () => {
    // Create custom field template
    const customField = await customFieldRepo.create({
      org_id: orgId,
      entity: 'staff',
      label: 'Uniform Size',
      field_type: 'dropdown',
      options: ['S', 'M', 'L', 'XL', 'XXL'],
      sort_order: 1,
    });

    expect(customField.label).toBe('Uniform Size');
    expect(customField.options).toContain('XL');

    // Create staff with custom field value
    const staff = await staffRepo.create({
      org_id: orgId,
      name: 'Mohan Driver',
      payment_type: 'monthly',
      rate: 18000,
      status: 'active',
      weekly_off: [0],
      rate_history: [],
      custom: {
        [customField.id]: 'XL',
      },
    });

    expect(staff.custom?.[customField.id]).toBe('XL');
  });

  it('moves staff and linked work entries to trash with exact restore capability', async () => {
    const site = await siteRepo.create({
      org_id: orgId,
      name: 'City Mall Project',
      status: 'active',
    });

    const staff = await staffRepo.create({
      org_id: orgId,
      name: 'Pooja Painter',
      payment_type: 'daily',
      rate: 700,
      status: 'active',
      default_site_id: site.id,
      weekly_off: [0],
      rate_history: [],
    });

    const workEntry = await workRepo.create({
      org_id: orgId,
      staff_id: staff.id,
      work_date: '2026-10-08',
      description: 'First floor primer',
      site_id: site.id,
      hours: 8,
    });

    // Soft delete staff
    await staffRepo.softDelete(staff.id);
    await workRepo.softDelete(workEntry.id);

    // Verify both are soft-deleted
    const activeStaff = await staffRepo.list(orgId, false);
    expect(activeStaff.find((s) => s.id === staff.id)).toBeUndefined();

    const activeWork = await workRepo.list(orgId, false);
    expect(activeWork.find((w) => w.id === workEntry.id)).toBeUndefined();

    // Restore both from trash
    await staffRepo.restore(staff.id);
    await workRepo.restore(workEntry.id);

    // Verify restored records retain original properties and links
    const restoredStaff = await staffRepo.get(staff.id);
    expect(restoredStaff?.deleted_at).toBeNull();
    expect(restoredStaff?.default_site_id).toBe(site.id);

    const restoredWork = await workRepo.get(workEntry.id);
    expect(restoredWork?.deleted_at).toBeNull();
    expect(restoredWork?.staff_id).toBe(staff.id);
    expect(restoredWork?.site_id).toBe(site.id);
  });

  it('strictly isolates supervisor from payments while allowing attendance and work entries', () => {
    // Supervisor permissions
    expect(canUserPerformAction('supervisor', 'mark_attendance')).toBe(true);
    expect(canUserPerformAction('supervisor', 'add_work')).toBe(true);
    expect(canUserPerformAction('supervisor', 'view_staff')).toBe(true);
    expect(canUserPerformAction('supervisor', 'view_payments')).toBe(false);
    expect(canUserPerformAction('supervisor', 'make_payments')).toBe(false);
    expect(canUserPerformAction('supervisor', 'manage_settings')).toBe(false);

    // Accountant permissions
    expect(canUserPerformAction('accountant', 'view_payments')).toBe(true);
    expect(canUserPerformAction('accountant', 'make_payments')).toBe(true);
    expect(canUserPerformAction('accountant', 'mark_attendance')).toBe(false);
    expect(canUserPerformAction('accountant', 'add_work')).toBe(false);

    // Owner permissions
    expect(canUserPerformAction('owner', 'view_payments')).toBe(true);
    expect(canUserPerformAction('owner', 'mark_attendance')).toBe(true);
    expect(canUserPerformAction('owner', 'permanent_delete')).toBe(true);
  });
});
