import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Avatar } from '@/components/ui/Avatar';
import { FormField } from '@/components/ui/FormField';
import { Input } from '@/components/ui/Input';
import { useToast } from '@/components/ui/Toast';
import { useOrg } from '@/features/org/orgContext';
import { useI18n } from '@/lib/i18n/i18nContext';
import {
  localDb,
  LocalStaff,
  LocalAttendanceEntry,
  LocalWorkEntry,
  LocalPayment,
  LocalSite,
  LocalWorkType,
} from '@/lib/db/dexie';
import {
  calculateStaffPeriodEarnings,
  calculateStaffNetDues,
  roundMoney,
} from '@/lib/calculations/salaryCalculations';
import { formatCurrency, formatDate } from '@/lib/format/formatters';
import { exportToCSV, shareSummary } from '@/lib/export/csvExport';
import { exportToPdf } from '@/lib/export/pdfExport';
import { triggerPrint } from '@/lib/print/printUtils';
import { SalarySlipModal } from './SalarySlipModal';
import { PaymentReceiptModal } from './PaymentReceiptModal';
import { StaffHistoryModal } from '@/features/history/StaffHistoryModal';
import {
  FileText,
  Printer,
  Download,
  Share2,
  FileSpreadsheet,
  Filter,
  Users,
  Calendar,
  Briefcase,
  Building,
  DollarSign,
  Clock,
  Eye,
  EyeOff,
  Bookmark,
  CheckCircle2,
  Receipt,
  History,
  TrendingUp,
  Settings2,
} from 'lucide-react';

export type ReportType =
  | 'attendance'
  | 'payment_statement'
  | 'advances_ledger'
  | 'labour_by_site'
  | 'pending_dues'
  | 'staff_history'
  | 'work_summary';

export const ReportsPage: React.FC = () => {
  const { currentOrg, role } = useOrg();
  const { t, currency } = useI18n();
  const { success, error, info } = useToast();

  const isSupervisor = role === 'supervisor';
  const printAreaRef = useRef<HTMLDivElement>(null);

  // Active Report Type
  const [activeReport, setActiveReport] = useState<ReportType>('attendance');

  // Filter Presets: this month, last month, last 3 months, year, custom
  const [datePreset, setDatePreset] = useState<
    'this_month' | 'last_month' | 'last_3_months' | 'last_6_months' | 'this_year' | 'custom'
  >('this_month');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  // Filters
  const [staffFilter, setStaffFilter] = useState<string>('all'); // 'all' or specific staffId
  const [siteFilter, setSiteFilter] = useState<string>('all');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [workTypeFilter, setWorkTypeFilter] = useState<string>('all');
  const [isMasked, setIsMasked] = useState<boolean>(false);

  // Custom Print Options
  const [showOptions, setShowOptions] = useState<boolean>(false);
  const [includeSignatures, setIncludeSignatures] = useState<boolean>(true);
  const [customReportTitle, setCustomReportTitle] = useState<string>('');
  const [customNotes, setCustomNotes] = useState<string>('');
  const [includeSensitiveData, setIncludeSensitiveData] = useState<boolean>(false);

  // Saved Presets in App Settings
  const [savedPresetName, setSavedPresetName] = useState<string>('');

  // Data Stores
  const [staffList, setStaffList] = useState<LocalStaff[]>([]);
  const [attendanceList, setAttendanceList] = useState<LocalAttendanceEntry[]>([]);
  const [workList, setWorkList] = useState<LocalWorkEntry[]>([]);
  const [paymentList, setPaymentList] = useState<LocalPayment[]>([]);
  const [sites, setSites] = useState<LocalSite[]>([]);
  const [workTypes, setWorkTypes] = useState<LocalWorkType[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Sub-modal triggers
  const [salarySlipStaffId, setSalarySlipStaffId] = useState<string | null>(null);
  const [historyStaff, setHistoryStaff] = useState<LocalStaff | null>(null);

  // Compute preset dates
  useEffect(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();

    if (datePreset === 'this_month') {
      const first = new Date(year, month, 1).toISOString().slice(0, 10);
      const last = new Date(year, month + 1, 0).toISOString().slice(0, 10);
      setStartDate(first);
      setEndDate(last);
    } else if (datePreset === 'last_month') {
      const first = new Date(year, month - 1, 1).toISOString().slice(0, 10);
      const last = new Date(year, month, 0).toISOString().slice(0, 10);
      setStartDate(first);
      setEndDate(last);
    } else if (datePreset === 'last_3_months') {
      const first = new Date(year, month - 2, 1).toISOString().slice(0, 10);
      const last = new Date(year, month + 1, 0).toISOString().slice(0, 10);
      setStartDate(first);
      setEndDate(last);
    } else if (datePreset === 'last_6_months') {
      const first = new Date(year, month - 5, 1).toISOString().slice(0, 10);
      const last = new Date(year, month + 1, 0).toISOString().slice(0, 10);
      setStartDate(first);
      setEndDate(last);
    } else if (datePreset === 'this_year') {
      const first = `${year}-01-01`;
      const last = `${year}-12-31`;
      setStartDate(first);
      setEndDate(last);
    }
  }, [datePreset]);

  // Load all organization data
  useEffect(() => {
    if (!currentOrg) return;

    setIsLoading(true);
    Promise.all([
      localDb.staff.where('org_id').equals(currentOrg.id).filter((s) => !s.deleted_at).toArray(),
      localDb.attendance_entries
        .where('org_id')
        .equals(currentOrg.id)
        .filter((a) => !a.deleted_at)
        .toArray(),
      localDb.work_entries
        .where('org_id')
        .equals(currentOrg.id)
        .filter((w) => !w.deleted_at)
        .toArray(),
      isSupervisor
        ? Promise.resolve([])
        : localDb.payments
            .where('org_id')
            .equals(currentOrg.id)
            .filter((p) => !p.deleted_at)
            .toArray(),
      localDb.sites.where('org_id').equals(currentOrg.id).filter((s) => !s.deleted_at).toArray(),
      localDb.work_types.where('org_id').equals(currentOrg.id).filter((w) => !w.deleted_at).toArray(),
    ])
      .then(([stf, att, wrk, pym, sts, wts]) => {
        setStaffList(stf);
        setAttendanceList(att);
        setWorkList(wrk);
        setPaymentList(pym);
        setSites(sts);
        setWorkTypes(wts);
      })
      .finally(() => setIsLoading(false));
  }, [currentOrg, isSupervisor]);

  // Filtered staff list
  const filteredStaff = useMemo(() => {
    return staffList.filter((s) => {
      if (staffFilter !== 'all' && s.id !== staffFilter) return false;
      if (roleFilter !== 'all' && s.role_title !== roleFilter) return false;
      if (siteFilter !== 'all' && s.default_site_id !== siteFilter) return false;
      return true;
    });
  }, [staffList, staffFilter, roleFilter, siteFilter]);

  // Distinct roles
  const distinctRoles = useMemo(() => {
    const roles = new Set<string>();
    staffList.forEach((s) => {
      if (s.role_title) roles.add(s.role_title);
    });
    return Array.from(roles);
  }, [staffList]);

  // Filtered Attendance within range
  const rangeAttendance = useMemo(() => {
    return attendanceList.filter((a) => {
      if (startDate && a.work_date < startDate) return false;
      if (endDate && a.work_date > endDate) return false;
      if (siteFilter !== 'all' && a.site_id !== siteFilter) return false;
      return true;
    });
  }, [attendanceList, startDate, endDate, siteFilter]);

  // Filtered Work within range
  const rangeWork = useMemo(() => {
    return workList.filter((w) => {
      if (startDate && w.work_date < startDate) return false;
      if (endDate && w.work_date > endDate) return false;
      if (siteFilter !== 'all' && w.site_id !== siteFilter) return false;
      if (workTypeFilter !== 'all' && w.work_type_id !== workTypeFilter) return false;
      return true;
    });
  }, [workList, startDate, endDate, siteFilter, workTypeFilter]);

  // Filtered Payments within range
  const rangePayments = useMemo(() => {
    if (isSupervisor) return [];
    return paymentList.filter((p) => {
      if (startDate && p.pay_date < startDate) return false;
      if (endDate && p.pay_date > endDate) return false;
      return true;
    });
  }, [paymentList, startDate, endDate, isSupervisor]);

  const displayMoney = (val: number) => {
    if (isMasked) return '••••••';
    return formatCurrency(val, currency);
  };

  // 1. ATTENDANCE REGISTER DATA
  const attendanceRegisterData = useMemo(() => {
    return filteredStaff.map((staff) => {
      const staffAtt = rangeAttendance.filter((a) => a.staff_id === staff.id);
      const present = staffAtt.filter((a) => a.status === 'present').length;
      const half = staffAtt.filter((a) => a.status === 'half').length;
      const absent = staffAtt.filter((a) => a.status === 'absent').length;
      const paidLeave = staffAtt.filter((a) => a.status === 'leave_paid').length;
      const unpaidLeave = staffAtt.filter((a) => a.status === 'leave_unpaid').length;
      const holiday = staffAtt.filter((a) => a.status === 'holiday').length;
      const otHours = staffAtt.reduce((sum, a) => sum + (a.overtime_hours || 0), 0);
      const totalDaysWorked = present + half * 0.5;

      return {
        staff,
        present,
        half,
        absent,
        paidLeave,
        unpaidLeave,
        holiday,
        otHours,
        totalDaysWorked,
      };
    });
  }, [filteredStaff, rangeAttendance]);

  // 2. PAYMENT STATEMENT / PAYROLL SUMMARY DATA
  const payrollSummaryData = useMemo(() => {
    const calcMode = currentOrg?.settings?.month_calc_mode || 'actual';
    return filteredStaff.map((staff) => {
      const staffAtt = rangeAttendance.filter((a) => a.staff_id === staff.id);
      const staffWrk = rangeWork.filter((w) => w.staff_id === staff.id);
      const staffPym = rangePayments.filter((p) => p.staff_id === staff.id);

      const earnings = calculateStaffPeriodEarnings({
        staff,
        attendance: staffAtt,
        workEntries: staffWrk,
        periodStart: startDate || '2020-01-01',
        periodEnd: endDate || '2099-12-31',
        monthCalcMode: calcMode,
      });

      const dues = calculateStaffNetDues({
        staffId: staff.id,
        totalEarned: earnings.totalEarned,
        payments: staffPym,
      });

      return {
        staff,
        grossEarnings: dues.totalEarned + dues.bonus + dues.reimbursements,
        bonus: dues.bonus,
        advancesRecovered: dues.advancesRecovered,
        deductions: dues.deductions + dues.penalties,
        alreadyPaid: dues.alreadyPaid,
        netPayable: dues.netPayable,
      };
    });
  }, [filteredStaff, rangeAttendance, rangeWork, rangePayments, currentOrg, startDate, endDate]);

  // 3. ADVANCES LEDGER DATA
  const advancesLedgerData = useMemo(() => {
    if (isSupervisor) return [];
    return filteredStaff.map((staff) => {
      const staffPym = paymentList.filter((p) => p.staff_id === staff.id && !p.deleted_at);
      let totalTaken = 0;
      let totalRecovered = 0;

      staffPym.forEach((p) => {
        if (p.type === 'advance' || p.type === 'loan') {
          totalTaken = roundMoney(totalTaken + p.amount);
        } else if (p.type === 'loan_repayment') {
          totalRecovered = roundMoney(totalRecovered + p.amount);
        }
      });

      // Also add advances recovered recorded in regular payouts
      const rangePym = rangePayments.filter((p) => p.staff_id === staff.id);
      const rangeDues = calculateStaffNetDues({
        staffId: staff.id,
        totalEarned: 0,
        payments: rangePym,
      });

      const outstanding = roundMoney(totalTaken - totalRecovered);

      return {
        staff,
        totalTaken,
        totalRecovered,
        outstanding,
      };
    });
  }, [filteredStaff, paymentList, rangePayments, isSupervisor]);

  // 4. LABOUR COST BY SITE DATA
  const labourCostBySiteData = useMemo(() => {
    const siteMap: Record<
      string,
      { siteName: string; staffCount: Set<string>; totalHours: number; totalCost: number }
    > = {};

    sites.forEach((s) => {
      siteMap[s.id] = { siteName: s.name, staffCount: new Set(), totalHours: 0, totalCost: 0 };
    });
    siteMap['unassigned'] = {
      siteName: 'General / Unassigned',
      staffCount: new Set(),
      totalHours: 0,
      totalCost: 0,
    };

    filteredStaff.forEach((staff) => {
      const staffAtt = rangeAttendance.filter((a) => a.staff_id === staff.id);
      const staffWrk = rangeWork.filter((w) => w.staff_id === staff.id);
      const staffPym = rangePayments.filter((p) => p.staff_id === staff.id);

      const earnings = calculateStaffPeriodEarnings({
        staff,
        attendance: staffAtt,
        workEntries: staffWrk,
        periodStart: startDate || '2020-01-01',
        periodEnd: endDate || '2099-12-31',
        monthCalcMode: currentOrg?.settings?.month_calc_mode || 'actual',
      });

      staffAtt.forEach((a) => {
        const sKey = a.site_id || staff.default_site_id || 'unassigned';
        if (!siteMap[sKey]) {
          siteMap[sKey] = {
            siteName: 'Unknown Site',
            staffCount: new Set(),
            totalHours: 0,
            totalCost: 0,
          };
        }
        siteMap[sKey].staffCount.add(staff.id);
        siteMap[sKey].totalHours += (a.overtime_hours || 0) + (a.status === 'present' ? 8 : a.status === 'half' ? 4 : 0);
      });

      // Distribute cost to primary site
      const mainSiteKey = staff.default_site_id || 'unassigned';
      if (siteMap[mainSiteKey]) {
        siteMap[mainSiteKey].totalCost = roundMoney(
          siteMap[mainSiteKey].totalCost + earnings.totalEarned
        );
      }
    });

    return Object.values(siteMap).map((item) => ({
      ...item,
      workerCount: item.staffCount.size,
    }));
  }, [filteredStaff, rangeAttendance, rangeWork, rangePayments, sites, currentOrg, startDate, endDate]);

  // 5. PENDING DUES DATA
  const pendingDuesData = useMemo(() => {
    return payrollSummaryData
      .filter((row) => row.netPayable > 0)
      .sort((a, b) => b.netPayable - a.netPayable);
  }, [payrollSummaryData]);

  // 7. WORK SUMMARY BY WORK TYPE
  const workSummaryData = useMemo(() => {
    const summaryMap: Record<
      string,
      { workType: LocalWorkType; totalQty: number; totalHours: number; count: number }
    > = {};

    workTypes.forEach((wt) => {
      summaryMap[wt.id] = { workType: wt, totalQty: 0, totalHours: 0, count: 0 };
    });

    rangeWork.forEach((w) => {
      if (w.work_type_id && summaryMap[w.work_type_id]) {
        summaryMap[w.work_type_id].totalQty += w.quantity || 0;
        summaryMap[w.work_type_id].totalHours += w.hours || 0;
        summaryMap[w.work_type_id].count += 1;
      }
    });

    return Object.values(summaryMap);
  }, [workTypes, rangeWork]);

  // EXPORT HANDLERS
  const handlePrint = async () => {
    info('Preparing print document...');
    await triggerPrint({
      title: `${activeReport.toUpperCase()}_Report_${startDate}_to_${endDate}`,
    });
  };

  const handleExportCsv = () => {
    let headers: string[] = [];
    let rows: (string | number)[][] = [];
    const filename = `${activeReport}_report_${startDate}_to_${endDate}`;

    if (activeReport === 'attendance') {
      headers = ['Staff Name', 'Role', 'Present Days', 'Half Days', 'Absent', 'Paid Leave', 'Unpaid Leave', 'OT Hours', 'Total Days'];
      rows = attendanceRegisterData.map((d) => [
        d.staff.name,
        d.staff.role_title || '',
        d.present,
        d.half,
        d.absent,
        d.paidLeave,
        d.unpaidLeave,
        d.otHours,
        d.totalDaysWorked,
      ]);
    } else if (activeReport === 'payment_statement') {
      headers = ['Staff Name', 'Role', 'Gross Earnings', 'Bonus', 'Advances Recovered', 'Deductions', 'Already Paid', 'Net Payable'];
      rows = payrollSummaryData.map((d) => [
        d.staff.name,
        d.staff.role_title || '',
        d.grossEarnings,
        d.bonus,
        d.advancesRecovered,
        d.deductions,
        d.alreadyPaid,
        d.netPayable,
      ]);
    } else if (activeReport === 'advances_ledger') {
      headers = ['Staff Name', 'Role', 'Total Advances Taken', 'Total Recovered', 'Outstanding Balance'];
      rows = advancesLedgerData.map((d) => [
        d.staff.name,
        d.staff.role_title || '',
        d.totalTaken,
        d.totalRecovered,
        d.outstanding,
      ]);
    } else if (activeReport === 'labour_by_site') {
      headers = ['Site / Project', 'Worker Count', 'Total Hours', 'Total Cost'];
      rows = labourCostBySiteData.map((d) => [
        d.siteName,
        d.workerCount,
        d.totalHours,
        d.totalCost,
      ]);
    } else if (activeReport === 'pending_dues') {
      headers = ['Staff Name', 'Role', 'Total Earned', 'Already Paid', 'Pending Balance Due'];
      rows = pendingDuesData.map((d) => [
        d.staff.name,
        d.staff.role_title || '',
        d.grossEarnings,
        d.alreadyPaid,
        d.netPayable,
      ]);
    } else if (activeReport === 'work_summary') {
      headers = ['Work Type', 'Unit Name', 'Total Quantity', 'Total Hours', 'Entries Count'];
      rows = workSummaryData.map((d) => [
        d.workType.name,
        d.workType.unit_name || '-',
        d.totalQty,
        d.totalHours,
        d.count,
      ]);
    }

    exportToCSV(filename, headers, rows);
    success('Excel/CSV export downloaded successfully!');
  };

  const handleExportPdf = async () => {
    info('Generating formatted PDF report...');
    let headers: string[] = [];
    let rows: (string | number)[][] = [];
    let reportTitle = customReportTitle || activeReport.replace(/_/g, ' ').toUpperCase();

    if (activeReport === 'attendance') {
      headers = ['Staff Member', 'Role', 'Present', 'Half', 'Absent', 'Leaves', 'OT (h)', 'Total Days'];
      rows = attendanceRegisterData.map((d) => [
        d.staff.name,
        d.staff.role_title || '-',
        d.present,
        d.half,
        d.absent,
        d.paidLeave + d.unpaidLeave,
        d.otHours,
        d.totalDaysWorked,
      ]);
    } else if (activeReport === 'payment_statement') {
      headers = ['Staff Member', 'Role', 'Gross', 'Bonus', 'Adv Rec', 'Deductions', 'Paid', 'Net Balance'];
      rows = payrollSummaryData.map((d) => [
        d.staff.name,
        d.staff.role_title || '-',
        displayMoney(d.grossEarnings),
        displayMoney(d.bonus),
        displayMoney(d.advancesRecovered),
        displayMoney(d.deductions),
        displayMoney(d.alreadyPaid),
        displayMoney(d.netPayable),
      ]);
    } else if (activeReport === 'advances_ledger') {
      headers = ['Staff Member', 'Role', 'Advances Taken', 'Recovered', 'Outstanding Dues'];
      rows = advancesLedgerData.map((d) => [
        d.staff.name,
        d.staff.role_title || '-',
        displayMoney(d.totalTaken),
        displayMoney(d.totalRecovered),
        displayMoney(d.outstanding),
      ]);
    } else if (activeReport === 'labour_by_site') {
      headers = ['Site / Project', 'Workers', 'Total Hours', 'Labour Cost'];
      rows = labourCostBySiteData.map((d) => [
        d.siteName,
        d.workerCount,
        `${d.totalHours} hrs`,
        displayMoney(d.totalCost),
      ]);
    } else if (activeReport === 'pending_dues') {
      headers = ['Staff Member', 'Role', 'Gross Earned', 'Paid So Far', 'Pending Dues'];
      rows = pendingDuesData.map((d) => [
        d.staff.name,
        d.staff.role_title || '-',
        displayMoney(d.grossEarnings),
        displayMoney(d.alreadyPaid),
        displayMoney(d.netPayable),
      ]);
    } else if (activeReport === 'work_summary') {
      headers = ['Work Type', 'Unit', 'Total Quantity', 'Total Hours', 'Entries'];
      rows = workSummaryData.map((d) => [
        d.workType.name,
        d.workType.unit_name || '-',
        d.totalQty,
        `${d.totalHours} hrs`,
        d.count,
      ]);
    }

    await exportToPdf({
      filename: `${activeReport}_report_${startDate}_to_${endDate}`,
      title: reportTitle,
      subtitle: `Date Range: ${formatDate(startDate)} to ${formatDate(endDate)}`,
      businessName: currentOrg?.name || 'Staff Manager',
      headers,
      rows,
      orientation: 'landscape',
      includeSignatures,
      notes: customNotes || undefined,
    });

    success('PDF report downloaded!');
  };

  const handleShareSummary = async () => {
    let summaryText = `*${currentOrg?.name || 'Staff Manager'} - ${activeReport.toUpperCase()}*\n` +
      `Date Range: ${formatDate(startDate)} to ${formatDate(endDate)}\n` +
      `Staff Count: ${filteredStaff.length}\n`;

    if (activeReport === 'attendance') {
      const totalPresent = attendanceRegisterData.reduce((sum, r) => sum + r.present, 0);
      const totalOT = attendanceRegisterData.reduce((sum, r) => sum + r.otHours, 0);
      summaryText += `Total Present Days: ${totalPresent} | Total Overtime: ${totalOT}h`;
    } else if (activeReport === 'payment_statement') {
      const totalGross = payrollSummaryData.reduce((sum, r) => sum + r.grossEarnings, 0);
      const totalNet = payrollSummaryData.reduce((sum, r) => sum + r.netPayable, 0);
      summaryText += `Gross Earned: ${displayMoney(totalGross)}\nPending Balance Due: ${displayMoney(totalNet)}`;
    }

    const res = await shareSummary(`${currentOrg?.name} Report`, summaryText);
    if (res.shared) {
      success(`Shared via ${res.method}!`);
    } else {
      success('Report summary copied to clipboard!');
    }
  };

  // Save current filter preset
  const handleSavePreset = async () => {
    if (!savedPresetName.trim() || !currentOrg) return;
    const presetKey = `report_preset_${Date.now()}`;
    await localDb.app_settings.put({
      key: presetKey,
      value: {
        name: savedPresetName.trim(),
        activeReport,
        datePreset,
        staffFilter,
        siteFilter,
        roleFilter,
      },
    });
    success(`Preset "${savedPresetName}" saved!`);
    setSavedPresetName('');
  };

  return (
    <div className="space-y-4 animate-in fade-in pb-16 text-left">
      {/* Page Title & Main Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[var(--surface-2)]/40 p-3.5 sm:p-4 rounded-2xl border border-[var(--border)] shadow-2xs">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-[var(--text)] flex items-center gap-2">
            <span>{t('reports.title')}</span>
            <span className="text-xs font-normal text-[var(--text-muted)] hidden sm:inline">
              (रिपोर्ट्स व सैलरी स्लिप्स)
            </span>
          </h1>
          <p className="text-xs sm:text-sm text-[var(--text-muted)] mt-0.5 font-medium">
            Professional statements, registers, salary slips, PDF &amp; Excel/CSV exports
          </p>
        </div>

        {/* Global Action Buttons */}
        <div className="no-print flex items-center gap-2 flex-wrap">
          {!isSupervisor && (
            <button
              type="button"
              onClick={() => setIsMasked(!isMasked)}
              className="p-1.5 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] text-[var(--text-muted)] hover:text-[var(--text)] transition cursor-pointer shadow-2xs"
              title={isMasked ? 'Reveal amounts' : 'Mask amounts'}
              aria-label="Toggle Amount Mask"
            >
              {isMasked ? <EyeOff className="w-4 h-4 text-amber-400" /> : <Eye className="w-4 h-4" />}
            </button>
          )}

          <Button variant="outline" size="sm" onClick={handlePrint}>
            <Printer className="w-4 h-4" />
            <span>Print</span>
          </Button>

          <Button variant="secondary" size="sm" onClick={handleExportPdf}>
            <Download className="w-4 h-4" />
            <span>PDF</span>
          </Button>

          <Button variant="outline" size="sm" onClick={handleExportCsv}>
            <FileSpreadsheet className="w-4 h-4" />
            <span>Excel / CSV</span>
          </Button>

          <Button variant="outline" size="sm" onClick={handleShareSummary}>
            <Share2 className="w-4 h-4" />
            <span>Share</span>
          </Button>
        </div>
      </div>

      {/* Report Types Tabs */}
      <div className="no-print flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        {[
          { id: 'attendance', label: 'Attendance Register', icon: Calendar },
          ...(!isSupervisor
            ? [
                { id: 'payment_statement', label: 'Payment Statement', icon: DollarSign },
                { id: 'advances_ledger', label: 'Advances Ledger', icon: Receipt },
                { id: 'pending_dues', label: 'Pending Dues', icon: TrendingUp },
                { id: 'labour_by_site', label: 'Labour Cost by Site', icon: Building },
              ]
            : []),
          { id: 'work_summary', label: 'Work Summary', icon: Briefcase },
          { id: 'staff_history', label: 'Full Staff History', icon: History },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeReport === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveReport(tab.id as ReportType)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                isActive
                  ? 'bg-[var(--accent)] text-[var(--accent-contrast)] shadow-xs'
                  : 'bg-[var(--surface-2)] text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface)]'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Comprehensive Filter Panel */}
      <Card variant="surface" className="no-print p-3.5 border border-[var(--border)] space-y-3">
        {/* Date Presets Row */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--border)] pb-2.5">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[10px] uppercase font-bold text-[var(--text-muted)] mr-1">
              Period:
            </span>
            {[
              { id: 'this_month', label: 'This Month' },
              { id: 'last_month', label: 'Last Month' },
              { id: 'last_3_months', label: '3 Months' },
              { id: 'last_6_months', label: '6 Months' },
              { id: 'this_year', label: 'This Year' },
              { id: 'custom', label: 'Custom' },
            ].map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setDatePreset(p.id as any)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                  datePreset === p.id
                    ? 'bg-[var(--accent)] text-[var(--accent-contrast)]'
                    : 'bg-[var(--surface-2)] text-[var(--text-muted)] hover:text-[var(--text)]'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => setShowOptions(!showOptions)}
            className="flex items-center gap-1 text-xs text-[var(--accent)] font-medium hover:underline cursor-pointer"
          >
            <Settings2 className="w-3.5 h-3.5" />
            <span>{showOptions ? 'Hide Custom Options' : 'Print Options'}</span>
          </button>
        </div>

        {/* Filter Inputs Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
          <div>
            <label className="text-[10px] uppercase font-bold text-[var(--text-muted)] block mb-1">
              Start Date
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setDatePreset('custom');
              }}
              className="w-full px-2.5 py-1.5 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] text-[var(--text)] text-xs font-medium focus:outline-none focus:border-[var(--accent)]"
            />
          </div>

          <div>
            <label className="text-[10px] uppercase font-bold text-[var(--text-muted)] block mb-1">
              End Date
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setDatePreset('custom');
              }}
              className="w-full px-2.5 py-1.5 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] text-[var(--text)] text-xs font-medium focus:outline-none focus:border-[var(--accent)]"
            />
          </div>

          <div>
            <label className="text-[10px] uppercase font-bold text-[var(--text-muted)] block mb-1">
              Staff Member
            </label>
            <select
              value={staffFilter}
              onChange={(e) => setStaffFilter(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] text-[var(--text)] text-xs font-medium focus:outline-none focus:border-[var(--accent)]"
            >
              <option value="all">All Staff ({staffList.length})</option>
              {staffList.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.role_title || 'Worker'})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[10px] uppercase font-bold text-[var(--text-muted)] block mb-1">
              Site / Project
            </label>
            <select
              value={siteFilter}
              onChange={(e) => setSiteFilter(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] text-[var(--text)] text-xs font-medium focus:outline-none focus:border-[var(--accent)]"
            >
              <option value="all">All Sites</option>
              {sites.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Collapsible Print Options */}
        {showOptions && (
          <div className="pt-3 border-t border-[var(--border)] space-y-3 animate-in fade-in">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <FormField label="Custom Report Title">
                <Input
                  value={customReportTitle}
                  onChange={(e) => setCustomReportTitle(e.target.value)}
                  placeholder="e.g. Monthly Attendance Statement"
                />
              </FormField>
              <FormField label="Report Notes / Terms">
                <Input
                  value={customNotes}
                  onChange={(e) => setCustomNotes(e.target.value)}
                  placeholder="e.g. Verified by Site In-charge"
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
                <span>Include Signatures Section</span>
              </label>

              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeSensitiveData}
                  onChange={(e) => setIncludeSensitiveData(e.target.checked)}
                  className="rounded text-[var(--accent)]"
                />
                <span>Include Phone / Contact in Exports</span>
              </label>

              {/* Save preset button */}
              <div className="flex items-center gap-1.5 ml-auto">
                <input
                  type="text"
                  placeholder="Preset name..."
                  value={savedPresetName}
                  onChange={(e) => setSavedPresetName(e.target.value)}
                  className="px-2 py-1 rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--text)] text-xs"
                />
                <Button variant="outline" size="sm" onClick={handleSavePreset}>
                  <Bookmark className="w-3.5 h-3.5" />
                  <span>Save Preset</span>
                </Button>
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* Main Printable Content Area */}
      <div ref={printAreaRef} className="printable-area space-y-4">
        {/* Printable Document Header (shown in print or PDF) */}
        <div className="hidden print:block border-b border-slate-300 pb-3">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-xl font-bold text-slate-900">{currentOrg?.name || 'Staff Manager'}</h2>
              <p className="text-xs text-slate-500">{currentOrg?.settings?.address}</p>
            </div>
            <div className="text-right">
              <h3 className="text-sm font-bold uppercase text-slate-800">
                {customReportTitle || activeReport.replace(/_/g, ' ').toUpperCase()}
              </h3>
              <p className="text-xs text-slate-500">
                {formatDate(startDate)} to {formatDate(endDate)}
              </p>
            </div>
          </div>
        </div>

        {/* 1. ATTENDANCE REGISTER VIEW */}
        {activeReport === 'attendance' && (
          <div className="space-y-3">
            <div className="overflow-x-auto rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-xs">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-[var(--border)] bg-[var(--surface-2)] text-[var(--text-muted)] font-semibold">
                    <th className="p-3">Staff Member</th>
                    <th className="p-3">Role</th>
                    <th className="p-3 text-center">Present</th>
                    <th className="p-3 text-center">Half</th>
                    <th className="p-3 text-center">Absent</th>
                    <th className="p-3 text-center">Leaves</th>
                    <th className="p-3 text-center">OT (h)</th>
                    <th className="p-3 text-right">Total Days</th>
                    <th className="p-3 text-right no-print">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {attendanceRegisterData.map((row) => (
                    <tr key={row.staff.id} className="hover:bg-[var(--surface-2)] transition">
                      <td className="p-3">
                        <div className="font-semibold text-[var(--text)]">{row.staff.name}</div>
                        <div className="text-[10px] text-[var(--text-muted)] font-mono">
                          {row.staff.staff_code || '-'}
                        </div>
                      </td>
                      <td className="p-3 text-[var(--text-muted)]">
                        {row.staff.role_title || 'General'}
                      </td>
                      <td className="p-3 text-center font-bold text-emerald-600">{row.present}</td>
                      <td className="p-3 text-center font-bold text-amber-500">{row.half}</td>
                      <td className="p-3 text-center font-bold text-rose-500">{row.absent}</td>
                      <td className="p-3 text-center text-[var(--text-muted)]">
                        {row.paidLeave + row.unpaidLeave}
                      </td>
                      <td className="p-3 text-center font-semibold text-[var(--text)]">
                        {row.otHours}h
                      </td>
                      <td className="p-3 text-right font-black text-sm text-[var(--text)]">
                        {row.totalDaysWorked}
                      </td>
                      <td className="p-3 text-right no-print">
                        <button
                          type="button"
                          onClick={() => setSalarySlipStaffId(row.staff.id)}
                          className="px-2 py-1 rounded bg-[var(--surface-2)] hover:bg-[var(--surface)] border border-[var(--border)] text-[var(--accent)] font-semibold text-[11px] cursor-pointer"
                        >
                          Salary Slip
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 2. PAYMENT STATEMENT / PAYROLL SUMMARY */}
        {activeReport === 'payment_statement' && !isSupervisor && (
          <div className="space-y-3">
            <div className="overflow-x-auto rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-xs">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-[var(--border)] bg-[var(--surface-2)] text-[var(--text-muted)] font-semibold">
                    <th className="p-3">Staff Member</th>
                    <th className="p-3">Wage Type</th>
                    <th className="p-3 text-right">Gross Earned</th>
                    <th className="p-3 text-right">Bonus</th>
                    <th className="p-3 text-right">Adv. Recovered</th>
                    <th className="p-3 text-right">Deductions</th>
                    <th className="p-3 text-right">Paid So Far</th>
                    <th className="p-3 text-right">Net Payable</th>
                    <th className="p-3 text-right no-print">Slip</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {payrollSummaryData.map((row) => (
                    <tr key={row.staff.id} className="hover:bg-[var(--surface-2)] transition">
                      <td className="p-3">
                        <div className="font-semibold text-[var(--text)]">{row.staff.name}</div>
                        <div className="text-[10px] text-[var(--text-muted)]">
                          {row.staff.role_title || 'General'}
                        </div>
                      </td>
                      <td className="p-3 capitalize text-[var(--text-muted)]">
                        {row.staff.payment_type}
                      </td>
                      <td className="p-3 text-right font-semibold text-[var(--income)]">
                        {displayMoney(row.grossEarnings)}
                      </td>
                      <td className="p-3 text-right text-[var(--text-muted)]">
                        {displayMoney(row.bonus)}
                      </td>
                      <td className="p-3 text-right text-[var(--text-muted)]">
                        {displayMoney(row.advancesRecovered)}
                      </td>
                      <td className="p-3 text-right text-[var(--text-muted)]">
                        {displayMoney(row.deductions)}
                      </td>
                      <td className="p-3 text-right font-semibold text-[var(--text)]">
                        {displayMoney(row.alreadyPaid)}
                      </td>
                      <td
                        className={`p-3 text-right font-black text-sm ${
                          row.netPayable > 0 ? 'text-[var(--income)]' : 'text-[var(--text-muted)]'
                        }`}
                      >
                        {displayMoney(row.netPayable)}
                      </td>
                      <td className="p-3 text-right no-print">
                        <button
                          type="button"
                          onClick={() => setSalarySlipStaffId(row.staff.id)}
                          className="px-2 py-1 rounded bg-[var(--surface-2)] hover:bg-[var(--surface)] border border-[var(--border)] text-[var(--accent)] font-semibold text-[11px] cursor-pointer"
                        >
                          View Slip
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 3. ADVANCES LEDGER */}
        {activeReport === 'advances_ledger' && !isSupervisor && (
          <div className="space-y-3">
            <div className="overflow-x-auto rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-xs">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-[var(--border)] bg-[var(--surface-2)] text-[var(--text-muted)] font-semibold">
                    <th className="p-3">Staff Member</th>
                    <th className="p-3">Role</th>
                    <th className="p-3 text-right">Total Advances Taken</th>
                    <th className="p-3 text-right">Total Recovered</th>
                    <th className="p-3 text-right">Outstanding Balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {advancesLedgerData.map((row) => (
                    <tr key={row.staff.id} className="hover:bg-[var(--surface-2)] transition">
                      <td className="p-3">
                        <div className="font-semibold text-[var(--text)]">{row.staff.name}</div>
                        <div className="text-[10px] text-[var(--text-muted)]">
                          {row.staff.staff_code || '-'}
                        </div>
                      </td>
                      <td className="p-3 text-[var(--text-muted)]">
                        {row.staff.role_title || 'General'}
                      </td>
                      <td className="p-3 text-right font-semibold text-[var(--text)]">
                        {displayMoney(row.totalTaken)}
                      </td>
                      <td className="p-3 text-right text-[var(--text-muted)]">
                        {displayMoney(row.totalRecovered)}
                      </td>
                      <td
                        className={`p-3 text-right font-black text-sm ${
                          row.outstanding > 0 ? 'text-amber-400' : 'text-emerald-500'
                        }`}
                      >
                        {displayMoney(row.outstanding)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 4. LABOUR COST BY SITE */}
        {activeReport === 'labour_by_site' && !isSupervisor && (
          <div className="space-y-3">
            <div className="overflow-x-auto rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-xs">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-[var(--border)] bg-[var(--surface-2)] text-[var(--text-muted)] font-semibold">
                    <th className="p-3">Site / Project</th>
                    <th className="p-3 text-center">Workers Engaged</th>
                    <th className="p-3 text-center">Total Working Hours</th>
                    <th className="p-3 text-right">Labour Spend</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {labourCostBySiteData.map((row) => (
                    <tr key={row.siteName} className="hover:bg-[var(--surface-2)] transition">
                      <td className="p-3 font-semibold text-[var(--text)]">{row.siteName}</td>
                      <td className="p-3 text-center text-[var(--text-muted)] font-medium">
                        {row.workerCount} workers
                      </td>
                      <td className="p-3 text-center text-[var(--text-muted)] font-medium">
                        {row.totalHours} hrs
                      </td>
                      <td className="p-3 text-right font-black text-sm text-[var(--income)]">
                        {displayMoney(row.totalCost)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 5. PENDING DUES */}
        {activeReport === 'pending_dues' && !isSupervisor && (
          <div className="space-y-3">
            <div className="overflow-x-auto rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-xs">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-[var(--border)] bg-[var(--surface-2)] text-[var(--text-muted)] font-semibold">
                    <th className="p-3">Staff Member</th>
                    <th className="p-3">Role</th>
                    <th className="p-3 text-right">Gross Earnings</th>
                    <th className="p-3 text-right">Disbursed</th>
                    <th className="p-3 text-right">Outstanding Unpaid Due</th>
                    <th className="p-3 text-right no-print">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {pendingDuesData.map((row) => (
                    <tr key={row.staff.id} className="hover:bg-[var(--surface-2)] transition">
                      <td className="p-3">
                        <div className="font-semibold text-[var(--text)]">{row.staff.name}</div>
                        <div className="text-[10px] text-[var(--text-muted)]">
                          {row.staff.staff_code || '-'}
                        </div>
                      </td>
                      <td className="p-3 text-[var(--text-muted)]">
                        {row.staff.role_title || 'General'}
                      </td>
                      <td className="p-3 text-right text-[var(--text-muted)] font-semibold">
                        {displayMoney(row.grossEarnings)}
                      </td>
                      <td className="p-3 text-right text-[var(--text-muted)] font-semibold">
                        {displayMoney(row.alreadyPaid)}
                      </td>
                      <td className="p-3 text-right font-black text-sm text-[var(--income)]">
                        {displayMoney(row.netPayable)}
                      </td>
                      <td className="p-3 text-right no-print">
                        <button
                          type="button"
                          onClick={() => setSalarySlipStaffId(row.staff.id)}
                          className="px-2 py-1 rounded bg-[var(--surface-2)] hover:bg-[var(--surface)] border border-[var(--border)] text-[var(--accent)] font-semibold text-[11px] cursor-pointer"
                        >
                          Generate Slip
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 6. FULL STAFF HISTORY SELECTOR */}
        {activeReport === 'staff_history' && (
          <div className="p-6 rounded-2xl bg-[var(--surface)] border border-[var(--border)] space-y-4">
            <h3 className="font-bold text-sm text-[var(--text)]">Select Staff Member to View Timeline</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {staffList.map((s) => (
                <div
                  key={s.id}
                  onClick={() => setHistoryStaff(s)}
                  className="p-3 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] hover:border-[var(--accent)] transition cursor-pointer flex items-center justify-between"
                >
                  <div className="flex items-center gap-2.5">
                    <Avatar name={s.name} size="sm" />
                    <div>
                      <h4 className="font-semibold text-xs text-[var(--text)]">{s.name}</h4>
                      <p className="text-[10px] text-[var(--text-muted)]">{s.role_title || 'Worker'}</p>
                    </div>
                  </div>
                  <History className="w-4 h-4 text-[var(--accent)]" />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 7. WORK SUMMARY BY WORK TYPE */}
        {activeReport === 'work_summary' && (
          <div className="space-y-3">
            <div className="overflow-x-auto rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-xs">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-[var(--border)] bg-[var(--surface-2)] text-[var(--text-muted)] font-semibold">
                    <th className="p-3">Work Type</th>
                    <th className="p-3">Measurement Unit</th>
                    <th className="p-3 text-center">Total Quantity Completed</th>
                    <th className="p-3 text-center">Total Hours Spent</th>
                    <th className="p-3 text-right">Work Entries Logged</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {workSummaryData.map((row) => (
                    <tr key={row.workType.id} className="hover:bg-[var(--surface-2)] transition">
                      <td className="p-3 font-semibold text-[var(--text)]">{row.workType.name}</td>
                      <td className="p-3 text-[var(--text-muted)] uppercase">
                        {row.workType.unit_name || 'Tasks'}
                      </td>
                      <td className="p-3 text-center font-bold text-sm text-[var(--text)]">
                        {row.totalQty} {row.workType.unit_name || ''}
                      </td>
                      <td className="p-3 text-center text-[var(--text-muted)] font-semibold">
                        {row.totalHours} hrs
                      </td>
                      <td className="p-3 text-right text-[var(--text-muted)] font-medium">
                        {row.count} entries
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Print Signatures */}
        {includeSignatures && (
          <div className="hidden print:flex justify-between items-end pt-12 text-xs text-slate-500">
            <div className="w-48 text-center border-t border-slate-300 pt-1">
              <p className="font-medium text-slate-700">Verified By (Supervisor)</p>
            </div>
            <div className="w-48 text-center border-t border-slate-300 pt-1">
              <p className="font-medium text-slate-700">Authorized Signature</p>
            </div>
          </div>
        )}
      </div>

      {/* Embedded Sub-Modals */}
      {salarySlipStaffId && (
        <SalarySlipModal
          isOpen={Boolean(salarySlipStaffId)}
          onClose={() => setSalarySlipStaffId(null)}
          staffId={salarySlipStaffId}
        />
      )}

      {historyStaff && (
        <StaffHistoryModal
          isOpen={Boolean(historyStaff)}
          onClose={() => setHistoryStaff(null)}
          staff={historyStaff}
        />
      )}
    </div>
  );
};
