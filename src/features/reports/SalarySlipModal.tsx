import React, { useState, useEffect, useRef } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { FormField } from '@/components/ui/FormField';
import { Input } from '@/components/ui/Input';
import { TextArea } from '@/components/ui/TextArea';
import { useToast } from '@/components/ui/Toast';
import { useOrg } from '@/features/org/orgContext';
import { useI18n } from '@/lib/i18n/i18nContext';
import { localDb, LocalStaff, LocalAttendanceEntry, LocalWorkEntry, LocalPayment } from '@/lib/db/dexie';
import {
  calculateStaffPeriodEarnings,
  calculateStaffNetDues,
  roundMoney,
} from '@/lib/calculations/salaryCalculations';
import { formatCurrency, formatDate } from '@/lib/format/formatters';
import { exportToCSV, shareSummary } from '@/lib/export/csvExport';
import { exportToPdf } from '@/lib/export/pdfExport';
import { triggerPrint } from '@/lib/print/printUtils';
import {
  Printer,
  Download,
  Share2,
  FileSpreadsheet,
  FileText,
  Building,
  User,
  Calendar,
  DollarSign,
  CheckCircle2,
  Clock,
  Eye,
  EyeOff,
  Settings2,
} from 'lucide-react';

interface SalarySlipModalProps {
  isOpen: boolean;
  onClose: () => void;
  staffId?: string;
  initialMonth?: string; // YYYY-MM
}

export const SalarySlipModal: React.FC<SalarySlipModalProps> = ({
  isOpen,
  onClose,
  staffId: initialStaffId,
  initialMonth: propMonth,
}) => {
  const { currentOrg, role } = useOrg();
  const { t, currency } = useI18n();
  const { success, error, info } = useToast();

  const printRef = useRef<HTMLDivElement>(null);

  const [staffList, setStaffList] = useState<LocalStaff[]>([]);
  const [selectedStaffId, setSelectedStaffId] = useState<string>(initialStaffId || '');
  const [monthStr, setMonthStr] = useState<string>(
    propMonth || new Date().toISOString().slice(0, 7)
  );

  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  const [attendanceEntries, setAttendanceEntries] = useState<LocalAttendanceEntry[]>([]);
  const [workEntries, setWorkEntries] = useState<LocalWorkEntry[]>([]);
  const [payments, setPayments] = useState<LocalPayment[]>([]);

  const [customHeader, setCustomHeader] = useState<string>(
    currentOrg?.settings?.print_header || ''
  );
  const [customFooter, setCustomFooter] = useState<string>(
    currentOrg?.settings?.print_footer || 'Thank you for your service.'
  );
  const [customNote, setCustomNote] = useState<string>('');
  const [includeSignatures, setIncludeSignatures] = useState<boolean>(true);
  const [includePhoto, setIncludePhoto] = useState<boolean>(false);
  const [isMasked, setIsMasked] = useState<boolean>(false);
  const [showOptions, setShowOptions] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Sync date range with selected month
  useEffect(() => {
    if (monthStr) {
      const [year, month] = monthStr.split('-').map(Number);
      const lastDay = new Date(year, month, 0).getDate();
      setStartDate(`${monthStr}-01`);
      setEndDate(`${monthStr}-${String(lastDay).padStart(2, '0')}`);
    }
  }, [monthStr]);

  // Load all staff for selector
  useEffect(() => {
    if (!currentOrg || !isOpen) return;
    localDb.staff
      .where('org_id')
      .equals(currentOrg.id)
      .filter((s) => !s.deleted_at)
      .toArray()
      .then((list) => {
        setStaffList(list);
        if (!selectedStaffId && list.length > 0) {
          setSelectedStaffId(initialStaffId || list[0].id);
        }
      });
  }, [currentOrg, isOpen, initialStaffId]);

  // Load entries for selected staff and date range
  useEffect(() => {
    if (!currentOrg || !selectedStaffId || !startDate || !endDate) return;

    setIsLoading(true);
    Promise.all([
      localDb.attendance_entries
        .where('staff_id')
        .equals(selectedStaffId)
        .filter((a) => !a.deleted_at && a.work_date >= startDate && a.work_date <= endDate)
        .toArray(),
      localDb.work_entries
        .where('staff_id')
        .equals(selectedStaffId)
        .filter((w) => !w.deleted_at && w.work_date >= startDate && w.work_date <= endDate)
        .toArray(),
      localDb.payments
        .where('staff_id')
        .equals(selectedStaffId)
        .filter((p) => !p.deleted_at && p.pay_date >= startDate && p.pay_date <= endDate)
        .toArray(),
    ])
      .then(([att, wrk, pym]) => {
        setAttendanceEntries(att);
        setWorkEntries(wrk);
        setPayments(pym);
      })
      .finally(() => setIsLoading(false));
  }, [currentOrg, selectedStaffId, startDate, endDate]);

  const selectedStaff = staffList.find((s) => s.id === selectedStaffId);

  // Calculations
  const calcMode = currentOrg?.settings?.month_calc_mode || 'actual';
  const earnings = selectedStaff
    ? calculateStaffPeriodEarnings({
        staff: selectedStaff,
        attendance: attendanceEntries,
        workEntries,
        periodStart: startDate,
        periodEnd: endDate,
        monthCalcMode: calcMode,
      })
    : { totalEarned: 0, baseWage: 0, overtimeEarned: 0, pieceRateEarned: 0, formulaBreakdown: [] };

  const dues = selectedStaff
    ? calculateStaffNetDues({
        staffId: selectedStaff.id,
        totalEarned: earnings.totalEarned,
        payments,
      })
    : {
        totalEarned: 0,
        bonus: 0,
        reimbursements: 0,
        advancesRecovered: 0,
        deductions: 0,
        penalties: 0,
        alreadyPaid: 0,
        netPayable: 0,
      };

  // Attendance metrics
  const presentDays = attendanceEntries.filter((a) => a.status === 'present').length;
  const halfDays = attendanceEntries.filter((a) => a.status === 'half').length;
  const absentDays = attendanceEntries.filter((a) => a.status === 'absent').length;
  const paidLeaves = attendanceEntries.filter((a) => a.status === 'leave_paid').length;
  const unpaidLeaves = attendanceEntries.filter((a) => a.status === 'leave_unpaid').length;
  const holidays = attendanceEntries.filter((a) => a.status === 'holiday').length;
  const totalOvertimeHours = attendanceEntries.reduce((sum, a) => sum + (a.overtime_hours || 0), 0);

  const displayMoney = (val: number) => {
    if (isMasked) return '••••••';
    return formatCurrency(val, currency);
  };

  const handlePrint = async () => {
    info('Preparing high-resolution print slip...');
    await triggerPrint({
      title: `Salary_Slip_${selectedStaff?.name || 'Staff'}_${monthStr}`,
    });
  };

  const handleExportPdf = async () => {
    if (!selectedStaff) return;
    info('Generating professional PDF salary slip...');

    const rows: (string | number)[][] = [
      ['Attendance: Present Days', `${presentDays} days`],
      ['Attendance: Half Days', `${halfDays} days`],
      ['Attendance: Absent Days', `${absentDays} days`],
      ['Attendance: Paid / Unpaid Leaves', `${paidLeaves} paid / ${unpaidLeaves} unpaid`],
      ['Attendance: Overtime Hours', `${totalOvertimeHours} hrs`],
      ['Basic Wage / Salary', displayMoney(earnings.baseWage)],
      ['Overtime Earnings', displayMoney(earnings.overtimeEarned)],
      ['Piece Rate / Task Work', displayMoney(earnings.pieceRateEarned)],
      ['Bonus Added', displayMoney(dues.bonus)],
      ['Reimbursements', displayMoney(dues.reimbursements)],
      ['Total Gross Earnings', displayMoney(dues.totalEarned + dues.bonus + dues.reimbursements)],
      ['Advances Recovered / Deducted', displayMoney(dues.advancesRecovered)],
      ['Other Deductions', displayMoney(dues.deductions)],
      ['Penalties', displayMoney(dues.penalties)],
      ['Already Disbursed / Paid', displayMoney(dues.alreadyPaid)],
      ['Net Outstanding Balance', displayMoney(dues.netPayable)],
    ];

    await exportToPdf({
      filename: `Salary_Slip_${selectedStaff.name.replace(/\s+/g, '_')}_${monthStr}`,
      title: 'PAYMENT STATEMENT / SALARY SLIP',
      subtitle: `Staff: ${selectedStaff.name} (${selectedStaff.staff_code || 'ID: -'}) | Role: ${selectedStaff.role_title || 'General'}`,
      businessName: currentOrg?.name || 'Staff Manager',
      periodText: `Period: ${formatDate(startDate)} to ${formatDate(endDate)}`,
      notes: customNote || undefined,
      headers: ['Description / Component', 'Amount / Detail'],
      rows,
      orientation: 'portrait',
      includeSignatures,
      employerLabel: 'Authorized Signatory',
      employeeLabel: 'Employee / Staff Signature',
    });

    success('PDF salary slip downloaded!');
  };

  const handleExportCsv = () => {
    if (!selectedStaff) return;
    const headers = ['Component', 'Detail / Amount'];
    const rows = [
      ['Business Name', currentOrg?.name || ''],
      ['Staff Name', selectedStaff.name],
      ['Staff Code', selectedStaff.staff_code || ''],
      ['Role / Designation', selectedStaff.role_title || ''],
      ['Period Start', startDate],
      ['Period End', endDate],
      ['Present Days', presentDays],
      ['Half Days', halfDays],
      ['Absent Days', absentDays],
      ['Overtime Hours', totalOvertimeHours],
      ['Gross Earnings', earnings.totalEarned],
      ['Bonus', dues.bonus],
      ['Advances Recovered', dues.advancesRecovered],
      ['Deductions', dues.deductions],
      ['Already Paid', dues.alreadyPaid],
      ['Net Payable Balance', dues.netPayable],
    ];

    exportToCSV(`Salary_Slip_${selectedStaff.name}_${monthStr}`, headers, rows);
    success('CSV slip downloaded!');
  };

  const handleShare = async () => {
    if (!selectedStaff) return;
    const summaryText = `*Salary Slip - ${currentOrg?.name || 'Staff Manager'}*\n` +
      `Staff: ${selectedStaff.name} (${selectedStaff.role_title || 'Worker'})\n` +
      `Period: ${startDate} to ${endDate}\n` +
      `Days Worked: ${presentDays + halfDays * 0.5} | OT: ${totalOvertimeHours}h\n` +
      `Total Earned: ${displayMoney(earnings.totalEarned)}\n` +
      `Paid: ${displayMoney(dues.alreadyPaid)}\n` +
      `*Balance Due: ${displayMoney(dues.netPayable)}*`;

    const res = await shareSummary(`Salary Slip - ${selectedStaff.name}`, summaryText);
    if (res.shared) {
      success(`Shared via ${res.method}!`);
    } else {
      success('Salary slip summary copied to clipboard!');
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Salary Slip & Payment Statement"
      maxWidth="2xl"
    >
      <div className="space-y-4 text-left">
        {/* Controls Bar (Hidden during print) */}
        <div className="no-print p-3 rounded-2xl bg-[var(--surface-2)] border border-[var(--border)] space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-[11px] font-semibold text-[var(--text-muted)] block mb-1">
                Select Staff
              </label>
              <select
                value={selectedStaffId}
                onChange={(e) => setSelectedStaffId(e.target.value)}
                className="w-full px-3 py-1.5 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--text)] text-xs font-medium focus:outline-none focus:border-[var(--accent)]"
              >
                {staffList.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.role_title || 'Worker'})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[11px] font-semibold text-[var(--text-muted)] block mb-1">
                Month Preset
              </label>
              <input
                type="month"
                value={monthStr}
                onChange={(e) => setMonthStr(e.target.value)}
                className="w-full px-3 py-1.5 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--text)] text-xs font-medium focus:outline-none focus:border-[var(--accent)]"
              />
            </div>

            <div className="flex items-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowOptions(!showOptions)}
                className="w-full"
              >
                <Settings2 className="w-3.5 h-3.5" />
                <span>{showOptions ? 'Hide Options' : 'Customize'}</span>
              </Button>

              <button
                type="button"
                onClick={() => setIsMasked(!isMasked)}
                title={isMasked ? 'Reveal amounts' : 'Mask amounts'}
                className="p-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--text-muted)] hover:text-[var(--text)] transition cursor-pointer"
              >
                {isMasked ? <EyeOff className="w-4 h-4 text-amber-400" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Collapsible Customization Options */}
          {showOptions && (
            <div className="pt-3 border-t border-[var(--border)] space-y-3 animate-in fade-in">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <FormField label="Custom Header Note">
                  <Input
                    value={customHeader}
                    onChange={(e) => setCustomHeader(e.target.value)}
                    placeholder="e.g. GSTIN / Registration No."
                  />
                </FormField>
                <FormField label="Custom Footer Note">
                  <Input
                    value={customFooter}
                    onChange={(e) => setCustomFooter(e.target.value)}
                    placeholder="e.g. Terms, signature disclaimers"
                  />
                </FormField>
              </div>

              <div className="flex flex-wrap items-center gap-4 text-xs text-[var(--text-muted)]">
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeSignatures}
                    onChange={(e) => setIncludeSignatures(e.target.checked)}
                    className="rounded text-[var(--accent)]"
                  />
                  <span>Include Signature Line</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includePhoto}
                    onChange={(e) => setIncludePhoto(e.target.checked)}
                    className="rounded text-[var(--accent)]"
                  />
                  <span>Include Staff Photo</span>
                </label>
              </div>
            </div>
          )}

          {/* Action Buttons Bar */}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <Button variant="primary" size="sm" onClick={handlePrint}>
              <Printer className="w-4 h-4" />
              <span>Print Slip</span>
            </Button>
            <Button variant="secondary" size="sm" onClick={handleExportPdf}>
              <Download className="w-4 h-4" />
              <span>Download PDF</span>
            </Button>
            <Button variant="outline" size="sm" onClick={handleExportCsv}>
              <FileSpreadsheet className="w-4 h-4" />
              <span>Excel/CSV</span>
            </Button>
            <Button variant="outline" size="sm" onClick={handleShare}>
              <Share2 className="w-4 h-4" />
              <span>Share</span>
            </Button>
          </div>
        </div>

        {/* Printable Salary Slip Canvas */}
        <div
          ref={printRef}
          className="printable-area p-6 rounded-2xl bg-white text-slate-900 border border-slate-200 shadow-sm space-y-5 print:shadow-none print:border-none print:p-0"
        >
          {/* Header */}
          <div className="flex items-start justify-between border-b border-slate-200 pb-4">
            <div className="flex items-center gap-3">
              {currentOrg?.logo_path && (
                <img
                  src={currentOrg.logo_path}
                  alt="Business Logo"
                  className="w-12 h-12 rounded-xl object-contain border border-slate-200 p-0.5 bg-white shrink-0"
                />
              )}
              <div>
                <h2 className="text-xl font-bold text-slate-900 tracking-tight">
                  {currentOrg?.name || 'Business Name'}
                </h2>
                {currentOrg?.settings?.address && (
                  <p className="text-xs text-slate-500 mt-0.5">{currentOrg.settings.address}</p>
                )}
                {currentOrg?.settings?.phone && (
                  <p className="text-xs text-slate-500">Phone: {currentOrg.settings.phone}</p>
                )}
                {customHeader && (
                  <p className="text-xs font-medium text-slate-600 mt-1">{customHeader}</p>
                )}
              </div>
            </div>

            <div className="text-right">
              <span className="inline-block px-2.5 py-1 rounded bg-slate-100 text-slate-800 text-xs font-bold uppercase tracking-wider">
                Salary Slip
              </span>
              <p className="text-xs text-slate-600 font-semibold mt-1.5">
                Period: {monthStr}
              </p>
              <p className="text-[11px] text-slate-400">
                {formatDate(startDate)} to {formatDate(endDate)}
              </p>
            </div>
          </div>

          {/* Staff Info Grid */}
          {selectedStaff && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 rounded-xl bg-slate-50 border border-slate-100 text-xs">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">
                  Staff Name
                </span>
                <span className="font-bold text-slate-900 text-sm mt-0.5 block">
                  {selectedStaff.name}
                </span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">
                  Role / Designation
                </span>
                <span className="font-medium text-slate-700 mt-0.5 block">
                  {selectedStaff.role_title || 'General Worker'}
                </span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">
                  Staff Code / ID
                </span>
                <span className="font-mono text-slate-700 mt-0.5 block">
                  {selectedStaff.staff_code || '-'}
                </span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">
                  Wage Type &amp; Rate
                </span>
                <span className="font-medium text-slate-700 mt-0.5 block capitalize">
                  {selectedStaff.payment_type} ({displayMoney(selectedStaff.rate || 0)})
                </span>
              </div>
            </div>
          )}

          {/* Attendance Summary */}
          <div>
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Attendance Summary
            </h4>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 text-center text-xs">
              <div className="p-2 rounded-lg bg-emerald-50 border border-emerald-100">
                <span className="text-[10px] uppercase font-bold text-emerald-700 block">Present</span>
                <span className="text-base font-extrabold text-emerald-800">{presentDays}</span>
              </div>
              <div className="p-2 rounded-lg bg-amber-50 border border-amber-100">
                <span className="text-[10px] uppercase font-bold text-amber-700 block">Half Day</span>
                <span className="text-base font-extrabold text-amber-800">{halfDays}</span>
              </div>
              <div className="p-2 rounded-lg bg-rose-50 border border-rose-100">
                <span className="text-[10px] uppercase font-bold text-rose-700 block">Absent</span>
                <span className="text-base font-extrabold text-rose-800">{absentDays}</span>
              </div>
              <div className="p-2 rounded-lg bg-blue-50 border border-blue-100">
                <span className="text-[10px] uppercase font-bold text-blue-700 block">Leaves</span>
                <span className="text-base font-extrabold text-blue-800">{paidLeaves + unpaidLeaves}</span>
              </div>
              <div className="p-2 rounded-lg bg-purple-50 border border-purple-100">
                <span className="text-[10px] uppercase font-bold text-purple-700 block">Holidays</span>
                <span className="text-base font-extrabold text-purple-800">{holidays}</span>
              </div>
              <div className="p-2 rounded-lg bg-slate-100 border border-slate-200">
                <span className="text-[10px] uppercase font-bold text-slate-700 block">Overtime</span>
                <span className="text-base font-extrabold text-slate-900">{totalOvertimeHours}h</span>
              </div>
            </div>
          </div>

          {/* Earnings vs Deductions Table */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Earnings Column */}
            <div className="rounded-xl border border-slate-200 overflow-hidden">
              <div className="bg-slate-100 px-3.5 py-2 font-bold text-xs text-slate-800 border-b border-slate-200 flex justify-between">
                <span>Earnings Description</span>
                <span>Amount</span>
              </div>
              <div className="divide-y divide-slate-100 text-xs p-1">
                <div className="px-3 py-1.5 flex justify-between">
                  <span className="text-slate-600">Base Salary / Wage</span>
                  <span className="font-semibold text-slate-900">{displayMoney(earnings.baseWage)}</span>
                </div>
                {earnings.overtimeEarned > 0 && (
                  <div className="px-3 py-1.5 flex justify-between">
                    <span className="text-slate-600">Overtime Pay ({totalOvertimeHours}h)</span>
                    <span className="font-semibold text-slate-900">{displayMoney(earnings.overtimeEarned)}</span>
                  </div>
                )}
                {earnings.pieceRateEarned > 0 && (
                  <div className="px-3 py-1.5 flex justify-between">
                    <span className="text-slate-600">Piece / Task Work</span>
                    <span className="font-semibold text-slate-900">{displayMoney(earnings.pieceRateEarned)}</span>
                  </div>
                )}
                {dues.bonus > 0 && (
                  <div className="px-3 py-1.5 flex justify-between">
                    <span className="text-slate-600">Bonus</span>
                    <span className="font-semibold text-emerald-700">{displayMoney(dues.bonus)}</span>
                  </div>
                )}
                {dues.reimbursements > 0 && (
                  <div className="px-3 py-1.5 flex justify-between">
                    <span className="text-slate-600">Reimbursements</span>
                    <span className="font-semibold text-slate-900">{displayMoney(dues.reimbursements)}</span>
                  </div>
                )}
                <div className="px-3 py-2 bg-slate-50 flex justify-between font-bold text-slate-900">
                  <span>Gross Earnings</span>
                  <span>{displayMoney(dues.totalEarned + dues.bonus + dues.reimbursements)}</span>
                </div>
              </div>
            </div>

            {/* Deductions & Payments Column */}
            <div className="rounded-xl border border-slate-200 overflow-hidden">
              <div className="bg-slate-100 px-3.5 py-2 font-bold text-xs text-slate-800 border-b border-slate-200 flex justify-between">
                <span>Deductions &amp; Payments</span>
                <span>Amount</span>
              </div>
              <div className="divide-y divide-slate-100 text-xs p-1">
                <div className="px-3 py-1.5 flex justify-between">
                  <span className="text-slate-600">Advances Recovered</span>
                  <span className="font-semibold text-slate-900">{displayMoney(dues.advancesRecovered)}</span>
                </div>
                {dues.deductions > 0 && (
                  <div className="px-3 py-1.5 flex justify-between">
                    <span className="text-slate-600">Deductions</span>
                    <span className="font-semibold text-slate-900">{displayMoney(dues.deductions)}</span>
                  </div>
                )}
                {dues.penalties > 0 && (
                  <div className="px-3 py-1.5 flex justify-between">
                    <span className="text-slate-600">Penalties</span>
                    <span className="font-semibold text-rose-600">{displayMoney(dues.penalties)}</span>
                  </div>
                )}
                <div className="px-3 py-1.5 flex justify-between">
                  <span className="text-slate-600">Salary Disbursed / Paid</span>
                  <span className="font-semibold text-slate-900">{displayMoney(dues.alreadyPaid)}</span>
                </div>
                <div className="px-3 py-2 bg-slate-50 flex justify-between font-bold text-slate-900">
                  <span>Total Deductions &amp; Paid</span>
                  <span>{displayMoney(dues.advancesRecovered + dues.deductions + dues.penalties + dues.alreadyPaid)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Net Settlement Banner */}
          <div className="p-4 rounded-xl bg-slate-900 text-white flex items-center justify-between">
            <div>
              <span className="text-[11px] uppercase font-bold text-slate-400 block">
                Net Balance Payable to Staff
              </span>
              <span className="text-xs text-slate-300">
                Gross Earnings minus advances, deductions and paid amounts
              </span>
            </div>
            <div className="text-2xl font-black text-emerald-400">
              {displayMoney(dues.netPayable)}
            </div>
          </div>

          {/* Footer & Signatures */}
          {includeSignatures && (
            <div className="pt-8 flex justify-between items-end text-xs text-slate-500">
              <div className="w-48 text-center border-t border-slate-300 pt-2">
                <p className="font-medium text-slate-700">Staff Signature</p>
                <p className="text-[10px] text-slate-400">Received above sum</p>
              </div>

              <div className="w-48 text-center border-t border-slate-300 pt-2">
                <p className="font-medium text-slate-700">Authorized Signatory</p>
                <p className="text-[10px] text-slate-400">{currentOrg?.name || 'Employer'}</p>
              </div>
            </div>
          )}

          {customFooter && (
            <div className="text-center text-[11px] text-slate-400 pt-3 border-t border-slate-100">
              {customFooter}
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
};
