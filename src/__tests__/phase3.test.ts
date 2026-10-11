import './setup';
import { describe, it, expect, beforeEach } from 'vitest';
import { localDb, LocalStaff, LocalAttendanceEntry, LocalWorkEntry, LocalPayment, LocalPeriodClosing } from '@/lib/db/dexie';
import {
  staffRepo,
  attendanceRepo,
  paymentRepo,
  periodClosingRepo,
  generateUUID,
} from '@/lib/db/repository';
import {
  calculateStaffEarnings,
  calculateStaffNetDues,
  getEffectiveRate,
  isDateInClosedPeriod,
  roundMoney,
} from '@/lib/calculations/salaryCalculations';
import { canUserPerformAction, ROLE_PERMISSIONS } from '@/lib/permissions/rbac';

describe('Phase 3: Payments, Advances, Ledger, Calculations & Month Settlement Tests', () => {
  const orgId = generateUUID();

  beforeEach(async () => {
    await localDb.staff.clear();
    await localDb.attendance_entries.clear();
    await localDb.work_entries.clear();
    await localDb.payments.clear();
    await localDb.period_closings.clear();
    await localDb.outbox.clear();
  });

  it('1. Daily wage with half day and overtime calculation', () => {
    const staff: LocalStaff = {
      id: generateUUID(),
      org_id: orgId,
      name: 'Ramesh Kumar',
      payment_type: 'daily',
      rate: 500,
      overtime_rate: 70,
      hours_per_day: 8,
      status: 'active',
      weekly_off: [0],
      created_at: '2026-10-01T00:00:00Z',
      updated_at: '2026-10-01T00:00:00Z',
      revision: 1,
    };

    // 20 present days, 2 half days, 10 hours overtime
    const attendanceEntries: LocalAttendanceEntry[] = [];
    for (let i = 1; i <= 20; i++) {
      attendanceEntries.push({
        id: generateUUID(),
        org_id: orgId,
        staff_id: staff.id,
        work_date: `2026-10-${String(i).padStart(2, '0')}`,
        status: 'present',
        overtime_hours: i <= 2 ? 5 : 0, // 2 days * 5 hrs = 10 hrs OT
        created_at: '2026-10-01T00:00:00Z',
        updated_at: '2026-10-01T00:00:00Z',
        revision: 1,
      });
    }
    // 2 half days
    attendanceEntries.push(
      {
        id: generateUUID(),
        org_id: orgId,
        staff_id: staff.id,
        work_date: '2026-10-21',
        status: 'half',
        overtime_hours: 0,
        created_at: '2026-10-01T00:00:00Z',
        updated_at: '2026-10-01T00:00:00Z',
        revision: 1,
      },
      {
        id: generateUUID(),
        org_id: orgId,
        staff_id: staff.id,
        work_date: '2026-10-22',
        status: 'half',
        overtime_hours: 0,
        created_at: '2026-10-01T00:00:00Z',
        updated_at: '2026-10-01T00:00:00Z',
        revision: 1,
      }
    );

    const result = calculateStaffEarnings({
      staff,
      startDate: '2026-10-01',
      endDate: '2026-10-31',
      attendanceEntries,
      workEntries: [],
    });

    // P: 20 * 500 = 10000; H: 2 * (500 / 2) = 500; OT: 10 * 70 = 700 => Total = 11200
    expect(result.totalPresent).toBe(20);
    expect(result.totalHalf).toBe(2);
    expect(result.overtimeHours).toBe(10);
    expect(result.basePay).toBe(10500);
    expect(result.overtimePay).toBe(700);
    expect(result.totalEarned).toBe(11200);
  });

  it('2. Monthly prorated salary (fixed 30 days and actual calendar days)', () => {
    const staff: LocalStaff = {
      id: generateUUID(),
      org_id: orgId,
      name: 'Sunita Sharma',
      payment_type: 'monthly',
      rate: 30000,
      status: 'active',
      weekly_off: [0],
      created_at: '2026-10-01T00:00:00Z',
      updated_at: '2026-10-01T00:00:00Z',
      revision: 1,
    };

    // 24 present, 2 half days = 25 payable days in October (31 days)
    const attendanceEntries: LocalAttendanceEntry[] = [];
    for (let i = 1; i <= 24; i++) {
      attendanceEntries.push({
        id: generateUUID(),
        org_id: orgId,
        staff_id: staff.id,
        work_date: `2026-10-${String(i).padStart(2, '0')}`,
        status: 'present',
        overtime_hours: 0,
        created_at: '2026-10-01T00:00:00Z',
        updated_at: '2026-10-01T00:00:00Z',
        revision: 1,
      });
    }
    attendanceEntries.push(
      {
        id: generateUUID(),
        org_id: orgId,
        staff_id: staff.id,
        work_date: '2026-10-25',
        status: 'half',
        overtime_hours: 0,
        created_at: '2026-10-01T00:00:00Z',
        updated_at: '2026-10-01T00:00:00Z',
        revision: 1,
      },
      {
        id: generateUUID(),
        org_id: orgId,
        staff_id: staff.id,
        work_date: '2026-10-26',
        status: 'half',
        overtime_hours: 0,
        created_at: '2026-10-01T00:00:00Z',
        updated_at: '2026-10-01T00:00:00Z',
        revision: 1,
      }
    );

    // Fixed 30 mode: (30000 / 30) * 25 = 25000
    const fixed30 = calculateStaffEarnings({
      staff,
      startDate: '2026-10-01',
      endDate: '2026-10-31',
      attendanceEntries,
      workEntries: [],
      monthMode: 'fixed_30',
    });
    expect(fixed30.totalPayableDays).toBe(25);
    expect(fixed30.totalEarned).toBe(25000);

    // Calendar 31 mode for October: (30000 / 31) * 25 = 24193.55
    const calendarMode = calculateStaffEarnings({
      staff,
      startDate: '2026-10-01',
      endDate: '2026-10-31',
      attendanceEntries,
      workEntries: [],
      monthMode: 'calendar_days',
    });
    expect(calendarMode.totalEarned).toBe(24193.55);
  });

  it('3. Per-piece work earnings calculation', () => {
    const staff: LocalStaff = {
      id: generateUUID(),
      org_id: orgId,
      name: 'Mohammad Ali',
      payment_type: 'piece',
      unit_name: 'piece',
      rate: 45,
      status: 'active',
      weekly_off: [0],
      created_at: '2026-10-01T00:00:00Z',
      updated_at: '2026-10-01T00:00:00Z',
      revision: 1,
    };

    const workEntries: LocalWorkEntry[] = [
      {
        id: generateUUID(),
        org_id: orgId,
        staff_id: staff.id,
        work_date: '2026-10-05',
        quantity: 120,
        created_at: '2026-10-05T00:00:00Z',
        updated_at: '2026-10-05T00:00:00Z',
        revision: 1,
      },
      {
        id: generateUUID(),
        org_id: orgId,
        staff_id: staff.id,
        work_date: '2026-10-12',
        quantity: 80,
        created_at: '2026-10-12T00:00:00Z',
        updated_at: '2026-10-12T00:00:00Z',
        revision: 1,
      },
    ];

    const result = calculateStaffEarnings({
      staff,
      startDate: '2026-10-01',
      endDate: '2026-10-31',
      attendanceEntries: [],
      workEntries,
    });

    // 200 pieces * 45 = 9000
    expect(result.pieceCount).toBe(200);
    expect(result.totalEarned).toBe(9000);
  });

  it('4. Advance recovery and net dues calculation', () => {
    const staffId = generateUUID();
    const payments: LocalPayment[] = [
      // Advance taken (Peshgi): 4,000
      {
        id: generateUUID(),
        org_id: orgId,
        staff_id: staffId,
        amount: 4000,
        pay_date: '2026-10-05',
        type: 'advance',
        created_at: '2026-10-05T00:00:00Z',
        updated_at: '2026-10-05T00:00:00Z',
        revision: 1,
      },
      // Repaid / deduction from salary: 1,500
      {
        id: generateUUID(),
        org_id: orgId,
        staff_id: staffId,
        amount: 1500,
        pay_date: '2026-10-20',
        type: 'loan_repayment',
        created_at: '2026-10-20T00:00:00Z',
        updated_at: '2026-10-20T00:00:00Z',
        revision: 1,
      },
    ];

    // Earned: 15,000
    const net = calculateStaffNetDues({
      staffId,
      totalEarned: 15000,
      payments,
    });

    // Advances outstanding = 4000 - 1500 = 2500
    // Net payable = 15000 - 2500 = 12500
    expect(net.advancesTaken).toBe(4000);
    expect(net.advancesRecovered).toBe(1500);
    expect(net.advancesOutstanding).toBe(2500);
    expect(net.netPayable).toBe(12500);
    expect(net.status).toBe('owed_to_staff');
  });

  it('5. Partial payment handling and settlement', () => {
    const staffId = generateUUID();
    const payments: LocalPayment[] = [
      // First partial payment: 8,000
      {
        id: generateUUID(),
        org_id: orgId,
        staff_id: staffId,
        amount: 8000,
        pay_date: '2026-10-25',
        type: 'salary',
        created_at: '2026-10-25T00:00:00Z',
        updated_at: '2026-10-25T00:00:00Z',
        revision: 1,
      },
    ];

    const afterFirst = calculateStaffNetDues({
      staffId,
      totalEarned: 12000,
      payments,
    });
    expect(afterFirst.salaryPaid).toBe(8000);
    expect(afterFirst.netPayable).toBe(4000);
    expect(afterFirst.status).toBe('owed_to_staff');

    // Second partial payment: 4,000
    payments.push({
      id: generateUUID(),
      org_id: orgId,
      staff_id: staffId,
      amount: 4000,
      pay_date: '2026-10-31',
      type: 'salary',
      created_at: '2026-10-31T00:00:00Z',
      updated_at: '2026-10-31T00:00:00Z',
      revision: 1,
    });

    const settled = calculateStaffNetDues({
      staffId,
      totalEarned: 12000,
      payments,
    });
    expect(settled.salaryPaid).toBe(12000);
    expect(settled.netPayable).toBe(0);
    expect(settled.status).toBe('settled');
  });

  it('6. Correction after edit on payment record', async () => {
    const staffId = generateUUID();
    // Payment created with mistake (5000 instead of 3000)
    const payment = await paymentRepo.create({
      org_id: orgId,
      staff_id: staffId,
      amount: 5000,
      pay_date: '2026-10-10',
      type: 'advance',
    });

    let currentPayments = await localDb.payments.where('org_id').equals(orgId).toArray();
    let dues = calculateStaffNetDues({
      staffId,
      totalEarned: 10000,
      payments: currentPayments,
    });
    expect(dues.advancesOutstanding).toBe(5000);
    expect(dues.netPayable).toBe(5000);

    // Edit and correct to 3000
    await paymentRepo.update(payment.id, {
      amount: 3000,
      note: 'Corrected amount from 5000 to 3000',
    });

    currentPayments = await localDb.payments.where('org_id').equals(orgId).toArray();
    dues = calculateStaffNetDues({
      staffId,
      totalEarned: 10000,
      payments: currentPayments,
    });
    expect(dues.advancesOutstanding).toBe(3000);
    expect(dues.netPayable).toBe(7000);
  });

  it('7. Rate change with effective-from date preserves historical periods (and supports legacy "from" key)', () => {
    const staff: LocalStaff = {
      id: generateUUID(),
      org_id: orgId,
      name: 'Vikas Patel',
      payment_type: 'daily',
      rate: 600, // Current rate
      rate_history: [
        { from: '2026-08-01', rate: 450 }, // Legacy format using 'from'
        { effective_from: '2026-10-15', from: '2026-10-15', rate: 600 },
      ],
      status: 'active',
      weekly_off: [0],
      created_at: '2026-08-01T00:00:00Z',
      updated_at: '2026-10-15T00:00:00Z',
      revision: 2,
    };

    // Past date before Oct 15 -> should resolve legacy 'from' and return 450
    const pastRate = getEffectiveRate(staff, undefined, '2026-09-20');
    expect(pastRate.rate).toBe(450);

    // Current date on or after Oct 15 -> should use 600
    const currentRate = getEffectiveRate(staff, undefined, '2026-10-20');
    expect(currentRate.rate).toBe(600);
  });

  it('8. Closed period blocks edits and allows unlocking by owner', async () => {
    const closing = await periodClosingRepo.create({
      org_id: orgId,
      period_start: '2026-10-01',
      period_end: '2026-10-31',
      status: 'closed',
      note: 'October 2026 settled and locked',
    });

    const activeClosings = await localDb.period_closings
      .where('org_id')
      .equals(orgId)
      .toArray();

    // Check date inside locked period
    const isLocked = isDateInClosedPeriod('2026-10-15', activeClosings);
    expect(isLocked).toBeDefined();
    expect(isLocked?.status).toBe('closed');

    // Date outside locked period
    const isNovLocked = isDateInClosedPeriod('2026-11-05', activeClosings);
    expect(isNovLocked).toBeUndefined();

    // Owner unlocks period
    await periodClosingRepo.update(closing.id, {
      status: 'reopened',
      note: 'Reopened for manual correction',
    });

    const updatedClosings = await localDb.period_closings
      .where('org_id')
      .equals(orgId)
      .toArray();

    const isAfterReopenLocked = isDateInClosedPeriod('2026-10-15', updatedClosings);
    expect(isAfterReopenLocked).toBeUndefined();
  });

  it('9. Delete payment to Trash then restore keeps ledger accurate', async () => {
    const staffId = generateUUID();

    const payment = await paymentRepo.create({
      org_id: orgId,
      staff_id: staffId,
      amount: 4500,
      pay_date: '2026-10-18',
      type: 'salary',
    });

    let currentPayments = await localDb.payments.where('org_id').equals(orgId).toArray();
    let dues = calculateStaffNetDues({
      staffId,
      totalEarned: 10000,
      payments: currentPayments,
    });
    expect(dues.salaryPaid).toBe(4500);
    expect(dues.netPayable).toBe(5500);

    // Soft delete to Trash
    await paymentRepo.softDelete(payment.id);

    currentPayments = await localDb.payments.where('org_id').equals(orgId).toArray();
    dues = calculateStaffNetDues({
      staffId,
      totalEarned: 10000,
      payments: currentPayments,
    });
    // Ledger ignores soft-deleted payment
    expect(dues.salaryPaid).toBe(0);
    expect(dues.netPayable).toBe(10000);

    // Restore from Trash
    await paymentRepo.restore(payment.id);

    currentPayments = await localDb.payments.where('org_id').equals(orgId).toArray();
    dues = calculateStaffNetDues({
      staffId,
      totalEarned: 10000,
      payments: currentPayments,
    });
    expect(dues.salaryPaid).toBe(4500);
    expect(dues.netPayable).toBe(5500);
  });

  it('10. Role-based permissions matrix for payments and attendance', () => {
    // Accountant: can manage and view payments, cannot mark attendance
    expect(canUserPerformAction('accountant', 'make_payments')).toBe(true);
    expect(canUserPerformAction('accountant', 'view_payments')).toBe(true);
    expect(canUserPerformAction('accountant', 'mark_attendance')).toBe(false);

    // Supervisor: can mark attendance, cannot view or manage payments
    expect(canUserPerformAction('supervisor', 'mark_attendance')).toBe(true);
    expect(canUserPerformAction('supervisor', 'view_payments')).toBe(false);
    expect(canUserPerformAction('supervisor', 'make_payments')).toBe(false);

    // Owner: can do all operations
    expect(canUserPerformAction('owner', 'make_payments')).toBe(true);
    expect(canUserPerformAction('owner', 'mark_attendance')).toBe(true);
    expect(canUserPerformAction('owner', 'permanent_delete')).toBe(true);
  });
});
