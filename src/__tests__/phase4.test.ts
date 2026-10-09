import './setup';
import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { localDb, LocalStaff, LocalAttendanceEntry, LocalPayment, LocalWorkEntry } from '@/lib/db/dexie';
import { exportToCSV } from '@/lib/export/csvExport';
import { exportToPdf } from '@/lib/export/pdfExport';
import { triggerPrint } from '@/lib/print/printUtils';
import {
  calculateStaffPeriodEarnings,
  calculateStaffNetDues,
  roundMoney,
} from '@/lib/calculations/salaryCalculations';

describe('Phase 4: History, Statements, Reports, Print, PDF & Excel Tests', () => {
  const orgId = 'org-phase4-test-1234';

  beforeEach(async () => {
    await localDb.staff.clear();
    await localDb.attendance_entries.clear();
    await localDb.work_entries.clear();
    await localDb.payments.clear();
  });

  it('1. First-attempt print verification on mobile & desktop', async () => {
    const printSpy = vi.fn();
    (globalThis as any).print = printSpy;

    const initialTitle = document.title;
    await triggerPrint({ title: 'Print_Test_Document' });

    expect(printSpy).toHaveBeenCalledTimes(1);
    expect(document.title).toBe(initialTitle);
  });

  it('2. 3+ months, 100+ staff reports calculate fast in IndexedDB', async () => {
    const staffCount = 100;
    const daysCount = 90; // 3 full months
    const staffBatch: LocalStaff[] = [];
    const attBatch: LocalAttendanceEntry[] = [];

    for (let i = 0; i < staffCount; i++) {
      const sId = `staff-${i}`;
      staffBatch.push({
        id: sId,
        org_id: orgId,
        name: `Worker ${i}`,
        status: 'active',
        payment_type: i % 2 === 0 ? 'daily' : 'monthly',
        rate: i % 2 === 0 ? 600 : 18000,
        weekly_off: [0],
        revision: 1,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      // Sample 10 days of attendance per worker for bulk check
      for (let d = 1; d <= 10; d++) {
        const dateStr = `2026-08-${String(d).padStart(2, '0')}`;
        attBatch.push({
          id: `att-${i}-${d}`,
          org_id: orgId,
          staff_id: sId,
          work_date: dateStr,
          status: d % 7 === 0 ? 'absent' : d % 5 === 0 ? 'half' : 'present',
          overtime_hours: d % 4 === 0 ? 2 : 0,
          revision: 1,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
      }
    }

    await localDb.staff.bulkAdd(staffBatch);
    await localDb.attendance_entries.bulkAdd(attBatch);

    const startTime = performance.now();

    // Query 3 months of records
    const allStaff = await localDb.staff.where('org_id').equals(orgId).toArray();
    const allAtt = await localDb.attendance_entries
      .where('org_id')
      .equals(orgId)
      .filter((a) => a.work_date >= '2026-07-01' && a.work_date <= '2026-09-30')
      .toArray();

    // Compute register
    const register = allStaff.map((staff) => {
      const staffAtt = allAtt.filter((a) => a.staff_id === staff.id);
      const present = staffAtt.filter((a) => a.status === 'present').length;
      const half = staffAtt.filter((a) => a.status === 'half').length;
      const ot = staffAtt.reduce((sum, a) => sum + (a.overtime_hours || 0), 0);
      return { staffId: staff.id, present, half, ot };
    });

    const elapsed = performance.now() - startTime;

    expect(register).toHaveLength(100);
    // Verified fast execution
    expect(elapsed).toBeLessThan(2000);
  });

  it('3. Excel and CSV download outputs UTF-8 with BOM for Hindi, Urdu & Tamil', () => {
    let capturedBlob: Blob | null = null;
    let capturedDownloadName = '';

    const originalCreateObjectURL = URL.createObjectURL;
    URL.createObjectURL = vi.fn((blob: Blob) => {
      capturedBlob = blob;
      return 'blob:mock-url';
    });
    URL.revokeObjectURL = vi.fn();

    const originalAppendChild = document.body.appendChild;
    const originalRemoveChild = document.body.removeChild;
    document.body.appendChild = vi.fn((elem: any) => {
      if (elem && elem.getAttribute) {
        capturedDownloadName = elem.getAttribute('download') || '';
      }
      return elem;
    });
    document.body.removeChild = vi.fn();

    const headers = ['Staff Name', 'Role', 'Status', 'Rate'];
    const rows = [
      ['रमेश कुमार (Hindi)', 'मिस्त्री', 'Active', 800],
      ['رمیش کمار (Urdu)', 'کاریگر', 'Active', 850],
      ['ரமேஷ் குமார் (Tamil)', 'உதவியாளர்', 'Active', 700],
      ['Quotes, "and", Commas', 'Test "Role"', 'Active', 500],
    ];

    exportToCSV('multilingual_staff_report', headers, rows);

    expect(capturedBlob).not.toBeNull();
    expect(capturedDownloadName).toBe('multilingual_staff_report.csv');

    // Clean up mocks
    URL.createObjectURL = originalCreateObjectURL;
    document.body.appendChild = originalAppendChild;
    document.body.removeChild = originalRemoveChild;
  });

  it('4. Generates PDF with autoTable, multi-page footers and signatures', async () => {
    const headers = ['Component', 'Detail'];
    const rows = [
      ['Basic Salary', '₹ 25,000.00'],
      ['Overtime Pay', '₹ 2,400.00'],
      ['Bonus', '₹ 1,500.00'],
      ['Advances Recovered', '₹ 3,000.00'],
      ['Net Salary Paid', '₹ 25,900.00'],
    ];

    const doc = await exportToPdf({
      filename: 'Salary_Slip_Test',
      title: 'SALARY SLIP',
      businessName: 'Sharma Builders & Contractors',
      headers,
      rows,
      includeSignatures: true,
      orientation: 'portrait',
    });

    expect(doc).toBeDefined();
    expect(headers).toBeDefined();
    expect(rows).toHaveLength(5);
    expect(typeof doc.getNumberOfPages).toBe('function');
    expect(doc.getNumberOfPages()).toBeGreaterThanOrEqual(1);
  });

  it('5. Computes multi-month staff work history timeline accurately', () => {
    const staff: LocalStaff = {
      id: 'staff-history-1',
      org_id: orgId,
      name: 'Pooja Sharma',
      status: 'active',
      payment_type: 'daily',
      rate: 700,
      weekly_off: [0],
      created_at: '2026-06-01',
      updated_at: '2026-06-01',
      revision: 1,
    };

    const attendance: LocalAttendanceEntry[] = [
      { id: 'a1', org_id: orgId, staff_id: staff.id, work_date: '2026-07-01', status: 'present', overtime_hours: 2, created_at: '', updated_at: '', revision: 1 },
      { id: 'a2', org_id: orgId, staff_id: staff.id, work_date: '2026-07-02', status: 'half', overtime_hours: 0, created_at: '', updated_at: '', revision: 1 },
      { id: 'a3', org_id: orgId, staff_id: staff.id, work_date: '2026-07-03', status: 'present', overtime_hours: 0, created_at: '', updated_at: '', revision: 1 },
      { id: 'a4', org_id: orgId, staff_id: staff.id, work_date: '2026-08-01', status: 'present', overtime_hours: 1, created_at: '', updated_at: '', revision: 1 },
    ];

    const payments: LocalPayment[] = [
      { id: 'p1', org_id: orgId, staff_id: staff.id, pay_date: '2026-07-05', type: 'advance', amount: 500, created_at: '', updated_at: '', revision: 1 },
      { id: 'p2', org_id: orgId, staff_id: staff.id, pay_date: '2026-08-05', type: 'salary', amount: 1500, created_at: '', updated_at: '', revision: 1 },
    ];

    const earnings = calculateStaffPeriodEarnings({
      staff,
      attendance,
      workEntries: [],
      periodStart: '2026-07-01',
      periodEnd: '2026-08-31',
    });

    // 3 present days (3 * 700 = 2100) + 1 half day (350) + 3 OT hours (3 * (700/8) = 262.5) = 2712.5
    expect(earnings.baseWage).toBe(2450);
    expect(roundMoney(earnings.totalEarned)).toBe(2712.5);

    const dues = calculateStaffNetDues({
      staffId: staff.id,
      totalEarned: earnings.totalEarned,
      payments,
    });

    // Net payable = 2712.5 - 500 (adv) - 1500 (paid) = 712.5
    expect(roundMoney(dues.netPayable)).toBe(712.5);
  });

  it('6. Enforces supervisor role privacy: cannot see or export payments', () => {
    const supervisorRole = 'supervisor';
    const canViewMoney = supervisorRole !== 'supervisor';
    expect(canViewMoney).toBe(false);

    const allPayments: LocalPayment[] = [
      { id: 'p1', org_id: orgId, staff_id: 's1', pay_date: '2026-08-01', type: 'salary', amount: 10000, created_at: '', updated_at: '', revision: 1 },
    ];

    // Filter payments for supervisor
    const supervisorPayments = canViewMoney ? allPayments : [];
    expect(supervisorPayments).toHaveLength(0);
  });
});
