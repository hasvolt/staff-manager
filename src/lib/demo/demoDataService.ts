import { localDb, LocalStaff, LocalAttendanceEntry, LocalPayment, LocalSite, LocalWorkType } from '@/lib/db/dexie';
import { generateUUID } from '@/lib/db/repository';

export async function insertDemoData(orgId: string): Promise<{
  staffCount: number;
  attendanceCount: number;
  paymentCount: number;
}> {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const todayStr = now.toISOString().split('T')[0];

  // 1. Create Demo Sites
  const siteMainId = generateUUID();
  const siteBranchId = generateUUID();

  await localDb.sites.put({
    id: siteMainId,
    org_id: orgId,
    name: 'Main Workshop & Plant',
    address: 'Industrial Area Phase 1',
    status: 'active',
    created_at: now.toISOString(),
    updated_at: now.toISOString(),
    revision: 1,
    syncStatus: 'local-only',
  });

  await localDb.sites.put({
    id: siteBranchId,
    org_id: orgId,
    name: 'South City Site',
    address: 'Sector 45 Commercial Complex',
    status: 'active',
    created_at: now.toISOString(),
    updated_at: now.toISOString(),
    revision: 1,
    syncStatus: 'local-only',
  });

  // 2. Create Demo Work Types
  const workMasonId = generateUUID();
  const workHelperId = generateUUID();

  await localDb.work_types.put({
    id: workMasonId,
    org_id: orgId,
    name: 'Masonry / Fabrication',
    unit_name: 'day',
    default_rate: 750,
    created_at: now.toISOString(),
    updated_at: now.toISOString(),
    revision: 1,
    syncStatus: 'local-only',
  });

  await localDb.work_types.put({
    id: workHelperId,
    org_id: orgId,
    name: 'General Assistance / Assembly',
    unit_name: 'day',
    default_rate: 500,
    created_at: now.toISOString(),
    updated_at: now.toISOString(),
    revision: 1,
    syncStatus: 'local-only',
  });

  // 3. Demo Staff
  const demoStaffList = [
    {
      name: 'Ramesh Mistri',
      role: 'Master Fabricator',
      payment_type: 'daily',
      rate: 800,
      phone: '+91 9876543201',
      staff_code: 'DEMO-01',
      site_id: siteMainId,
    },
    {
      name: 'Suresh Kumar',
      role: 'Helper / Assistant',
      payment_type: 'daily',
      rate: 500,
      phone: '+91 9876543202',
      staff_code: 'DEMO-02',
      site_id: siteMainId,
    },
    {
      name: 'Anita Devi',
      role: 'Supervisor / Quality Check',
      payment_type: 'monthly',
      rate: 22000,
      phone: '+91 9876543203',
      staff_code: 'DEMO-03',
      site_id: siteBranchId,
    },
    {
      name: 'Vikram Singh',
      role: 'Machine Operator',
      payment_type: 'hourly',
      rate: 120,
      phone: '+91 9876543204',
      staff_code: 'DEMO-04',
      site_id: siteMainId,
    },
  ];

  const createdStaffIds: string[] = [];

  for (const s of demoStaffList) {
    const sId = generateUUID();
    createdStaffIds.push(sId);

    const staffRecord: LocalStaff = {
      id: sId,
      org_id: orgId,
      name: s.name,
      staff_code: s.staff_code,
      phone: s.phone,
      role_title: s.role,
      payment_type: s.payment_type as any,
      weekly_off: [0],
      default_site_id: s.site_id,
      joining_date: `${year}-${month}-01`,
      status: 'active',
      notes: 'Demo sample staff record',
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
      revision: 1,
      syncStatus: 'local-only',
    };
    await localDb.staff.put(staffRecord);

    await localDb.staff_compensation.put({
      id: generateUUID(),
      org_id: orgId,
      staff_id: sId,
      rate: s.rate,
      overtime_rate: s.payment_type === 'daily' ? s.rate / 8 : null,
      rate_history: [],
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
      revision: 1,
      syncStatus: 'local-only',
    });
  }

  // 4. Create sample attendance for the last 5 days
  let attendanceCount = 0;
  for (let dayOffset = 1; dayOffset <= 5; dayOffset++) {
    const d = new Date(now);
    d.setDate(d.getDate() - dayOffset);
    const dateStr = d.toISOString().split('T')[0];

    for (let i = 0; i < createdStaffIds.length; i++) {
      const sId = createdStaffIds[i];
      const status = i === 1 && dayOffset === 2 ? 'half' : i === 3 && dayOffset === 4 ? 'leave_paid' : 'present';

      await localDb.attendance_entries.put({
        id: generateUUID(),
        org_id: orgId,
        staff_id: sId,
        work_date: dateStr,
        status: status as any,
        overtime_hours: dayOffset === 1 && i === 0 ? 2 : 0,
        note: status === 'half' ? 'Late arrival in morning' : undefined,
        created_at: now.toISOString(),
        updated_at: now.toISOString(),
        revision: 1,
        syncStatus: 'local-only',
      });
      attendanceCount++;
    }
  }

  // 5. Create sample payments
  let paymentCount = 0;
  // Advance for Ramesh
  await localDb.payments.put({
    id: generateUUID(),
    org_id: orgId,
    staff_id: createdStaffIds[0],
    pay_date: todayStr,
    type: 'advance',
    amount: 1500,
    mode: 'cash',
    reference: 'Urgent personal requirement',
    created_at: now.toISOString(),
    updated_at: now.toISOString(),
    revision: 1,
    syncStatus: 'local-only',
  });
  paymentCount++;

  // Wage payment for Suresh
  await localDb.payments.put({
    id: generateUUID(),
    org_id: orgId,
    staff_id: createdStaffIds[1],
    pay_date: todayStr,
    type: 'salary',
    amount: 2000,
    mode: 'upi',
    reference: 'Weekly payout',
    created_at: now.toISOString(),
    updated_at: now.toISOString(),
    revision: 1,
    syncStatus: 'local-only',
  });
  paymentCount++;

  // Store demo data marker
  await localDb.app_settings.put({
    key: `demo_data_${orgId}`,
    value: {
      staffIds: createdStaffIds,
      siteIds: [siteMainId, siteBranchId],
      created_at: now.toISOString(),
    },
  });

  return {
    staffCount: createdStaffIds.length,
    attendanceCount,
    paymentCount,
  };
}

export async function removeDemoData(orgId: string): Promise<boolean> {
  const setting = await localDb.app_settings.get(`demo_data_${orgId}`);
  if (!setting || !setting.value) {
    // If setting marker not found, check staff with DEMO code
    const demoStaff = await localDb.staff
      .where('org_id')
      .equals(orgId)
      .filter((s) => s.staff_code?.startsWith('DEMO-') || false)
      .toArray();

    for (const s of demoStaff) {
      await localDb.staff.delete(s.id);
      await localDb.attendance_entries.where('staff_id').equals(s.id).delete();
      await localDb.payments.where('staff_id').equals(s.id).delete();
      await localDb.staff_compensation.where('staff_id').equals(s.id).delete();
    }
    return demoStaff.length > 0;
  }

  const { staffIds, siteIds } = setting.value;
  for (const sId of staffIds || []) {
    await localDb.staff.delete(sId);
    await localDb.attendance_entries.where('staff_id').equals(sId).delete();
    await localDb.payments.where('staff_id').equals(sId).delete();
    await localDb.staff_compensation.where('staff_id').equals(sId).delete();
  }

  for (const siteId of siteIds || []) {
    await localDb.sites.delete(siteId);
  }

  await localDb.app_settings.delete(`demo_data_${orgId}`);
  return true;
}
