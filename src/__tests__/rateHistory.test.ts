import './setup';
import { describe, it, expect } from 'vitest';
import {
  getEffectiveRate,
  calculateStaffEarnings,
} from '@/lib/calculations/salaryCalculations';
import { LocalStaff, LocalAttendanceEntry } from '@/lib/db/dexie';

describe('Rate Revision History & Effective From Date Calculations', () => {
  const dummyStaff: LocalStaff = {
    id: 'staff-1',
    org_id: 'org-1',
    name: 'Suresh Patel',
    payment_type: 'daily',
    rate: 600,
    status: 'active',
    weekly_off: [0],
    rate_history: [
      { effective_from: '2026-04-01', rate: 600, type: 'daily' },
      { effective_from: '2026-01-01', rate: 500, type: 'daily' },
    ],
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-04-01T00:00:00Z',
    revision: 2,
  };

  it('1. Returns rate 500 for dates before April 1, 2026', () => {
    const marchRate = getEffectiveRate(dummyStaff, undefined, '2026-03-31');
    expect(marchRate.rate).toBe(500);

    const febRate = getEffectiveRate(dummyStaff, undefined, '2026-02-15');
    expect(febRate.rate).toBe(500);
  });

  it('2. Returns rate 600 for dates on or after April 1, 2026', () => {
    const april1Rate = getEffectiveRate(dummyStaff, undefined, '2026-04-01');
    expect(april1Rate.rate).toBe(600);

    const april15Rate = getEffectiveRate(dummyStaff, undefined, '2026-04-15');
    expect(april15Rate.rate).toBe(600);
  });

  it('3. Calculates March earnings at 500 and April earnings at 600 correctly', () => {
    // 5 days in March
    const marchAttendance: LocalAttendanceEntry[] = [
      { id: '1', org_id: 'org-1', staff_id: 'staff-1', work_date: '2026-03-25', status: 'present', overtime_hours: 0, created_at: '', updated_at: '', revision: 1 },
      { id: '2', org_id: 'org-1', staff_id: 'staff-1', work_date: '2026-03-26', status: 'present', overtime_hours: 0, created_at: '', updated_at: '', revision: 1 },
      { id: '3', org_id: 'org-1', staff_id: 'staff-1', work_date: '2026-03-27', status: 'present', overtime_hours: 0, created_at: '', updated_at: '', revision: 1 },
      { id: '4', org_id: 'org-1', staff_id: 'staff-1', work_date: '2026-03-28', status: 'present', overtime_hours: 0, created_at: '', updated_at: '', revision: 1 },
      { id: '5', org_id: 'org-1', staff_id: 'staff-1', work_date: '2026-03-29', status: 'present', overtime_hours: 0, created_at: '', updated_at: '', revision: 1 },
    ];
    const marchEarnings = calculateStaffEarnings({
      staff: dummyStaff,
      startDate: '2026-03-01',
      endDate: '2026-03-31',
      attendanceEntries: marchAttendance,
      workEntries: [],
    });
    expect(marchEarnings.totalEarned).toBe(2500); // 5 * 500

    // 5 days in April
    const aprilAttendance: LocalAttendanceEntry[] = [
      { id: '6', org_id: 'org-1', staff_id: 'staff-1', work_date: '2026-04-01', status: 'present', overtime_hours: 0, created_at: '', updated_at: '', revision: 1 },
      { id: '7', org_id: 'org-1', staff_id: 'staff-1', work_date: '2026-04-02', status: 'present', overtime_hours: 0, created_at: '', updated_at: '', revision: 1 },
      { id: '8', org_id: 'org-1', staff_id: 'staff-1', work_date: '2026-04-03', status: 'present', overtime_hours: 0, created_at: '', updated_at: '', revision: 1 },
      { id: '9', org_id: 'org-1', staff_id: 'staff-1', work_date: '2026-04-04', status: 'present', overtime_hours: 0, created_at: '', updated_at: '', revision: 1 },
      { id: '10', org_id: 'org-1', staff_id: 'staff-1', work_date: '2026-04-05', status: 'present', overtime_hours: 0, created_at: '', updated_at: '', revision: 1 },
    ];
    const aprilEarnings = calculateStaffEarnings({
      staff: dummyStaff,
      startDate: '2026-04-01',
      endDate: '2026-04-30',
      attendanceEntries: aprilAttendance,
      workEntries: [],
    });
    expect(aprilEarnings.totalEarned).toBe(3000); // 5 * 600

    // Combined period spanning March and April (5 days @ 500 + 5 days @ 600 = 5500)
    const combinedAttendance = [...marchAttendance, ...aprilAttendance];
    const combinedEarnings = calculateStaffEarnings({
      staff: dummyStaff,
      startDate: '2026-03-01',
      endDate: '2026-04-30',
      attendanceEntries: combinedAttendance,
      workEntries: [],
    });
    expect(combinedEarnings.totalEarned).toBe(5500);
  });

  it('4. Seamlessly supports legacy history entries stored with "from" instead of "effective_from"', () => {
    const legacyStaff: LocalStaff = {
      id: 'staff-legacy',
      org_id: 'org-1',
      name: 'Old Record',
      payment_type: 'daily',
      rate: 750,
      status: 'active',
      weekly_off: [0],
      rate_history: [
        { from: '2026-04-01', rate: 750, type: 'daily' },
        { from: '2026-01-01', rate: 650, type: 'daily' },
      ],
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-04-01T00:00:00Z',
      revision: 1,
    };

    const earlyRate = getEffectiveRate(legacyStaff, undefined, '2026-02-10');
    expect(earlyRate.rate).toBe(650);

    const laterRate = getEffectiveRate(legacyStaff, undefined, '2026-04-10');
    expect(laterRate.rate).toBe(750);
  });
});
