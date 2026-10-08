import { LocalStaff, LocalStaffCompensation, LocalAttendanceEntry, LocalWorkEntry, LocalPayment, LocalPeriodClosing } from '@/lib/db/dexie';

export interface RateHistoryItem {
  effective_from: string; // YYYY-MM-DD
  rate: number;
  overtime_rate?: number | null;
  note?: string;
}

export type MonthCalculationMode = 'fixed_30' | 'calendar_days';

export interface CalculationBreakdown {
  paymentType: 'daily' | 'monthly' | 'hourly' | 'piece';
  rateUsed: number;
  overtimeRateUsed: number;
  totalPresent: number;
  totalHalf: number;
  totalAbsent: number;
  totalPaidLeave: number;
  totalUnpaidLeave: number;
  totalHoliday: number;
  totalPayableDays: number;
  overtimeHours: number;
  overtimePay: number;
  basePay: number;
  pieceCount: number;
  piecePay: number;
  hourlyHours: number;
  hourlyPay: number;
  totalEarned: number;
  formulaText: string;
}

export interface NetDuesBreakdown {
  staffId: string;
  totalEarned: number;
  bonusTotal: number;
  reimbursementTotal: number;
  grossPayable: number; // earned + bonus + reimbursement
  advancesTaken: number; // advance + loan
  advancesRecovered: number; // advance deduction or repayment
  advancesOutstanding: number; // advancesTaken - advancesRecovered
  deductionTotal: number;
  penaltyTotal: number;
  salaryPaid: number; // direct salary payments
  totalPaid: number; // all payments made (salary + advances + bonuses + etc)
  netPayable: number; // grossPayable - deductions - penalties - advancesRecovered - salaryPaid
  status: 'owed_to_staff' | 'owed_by_staff' | 'settled';
  formulaBreakdown: string;
  overrideApplied?: {
    originalAmount: number;
    overriddenAmount: number;
    reason: string;
  };
}

/**
 * Rounds money to 2 decimal places to avoid IEEE 754 floating point issues.
 */
export function roundMoney(amount: number): number {
  if (isNaN(amount) || !isFinite(amount)) return 0;
  return Math.round((amount + Number.EPSILON) * 100) / 100;
}

/**
 * Retrieves the effective rate for a staff member on a specific date.
 * If rate history is present, selects the latest entry where effective_from <= date.
 */
export function getEffectiveRate(
  staff: LocalStaff,
  compensation: LocalStaffCompensation | undefined,
  date: string
): { rate: number; overtime_rate: number | null } {
  const history: RateHistoryItem[] =
    compensation?.rate_history ||
    staff.rate_history ||
    staff.compensation?.rate_history ||
    [];

  if (history && history.length > 0) {
    // Sort descending by effective_from
    const sorted = [...history]
      .filter((h) => h.effective_from && h.effective_from <= date)
      .sort((a, b) => b.effective_from.localeCompare(a.effective_from));

    if (sorted.length > 0) {
      return {
        rate: roundMoney(sorted[0].rate),
        overtime_rate: sorted[0].overtime_rate != null ? roundMoney(sorted[0].overtime_rate) : null,
      };
    }
  }

  const baseRate = compensation?.rate ?? staff.rate ?? staff.compensation?.rate ?? 0;
  const otRate = compensation?.overtime_rate ?? staff.overtime_rate ?? staff.compensation?.overtime_rate ?? null;

  return {
    rate: roundMoney(baseRate),
    overtime_rate: otRate != null ? roundMoney(otRate) : null,
  };
}

/**
 * Gets days in a specific month for a given YYYY-MM or Date.
 */
export function getDaysInMonth(year: number, monthIndex0: number): number {
  return new Date(year, monthIndex0 + 1, 0).getDate();
}

/**
 * Calculates earnings from attendance and work entries for a staff member in a date range.
 */
export function calculateStaffEarnings(params: {
  staff: LocalStaff;
  compensation?: LocalStaffCompensation;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  attendanceEntries: LocalAttendanceEntry[];
  workEntries: LocalWorkEntry[];
  monthMode?: MonthCalculationMode;
}): CalculationBreakdown {
  const {
    staff,
    compensation,
    startDate,
    endDate,
    attendanceEntries,
    workEntries,
    monthMode = 'fixed_30',
  } = params;

  // Filter entries within date range
  const relevantAttendance = attendanceEntries.filter(
    (a) => !a.deleted_at && a.work_date >= startDate && a.work_date <= endDate
  );
  const relevantWork = workEntries.filter(
    (w) => !w.deleted_at && w.work_date >= startDate && w.work_date <= endDate
  );

  let totalPresent = 0;
  let totalHalf = 0;
  let totalAbsent = 0;
  let totalPaidLeave = 0;
  let totalUnpaidLeave = 0;
  let totalHoliday = 0;
  let overtimeHours = 0;

  relevantAttendance.forEach((entry) => {
    switch (entry.status) {
      case 'present':
        totalPresent++;
        break;
      case 'half':
        totalHalf++;
        break;
      case 'absent':
        totalAbsent++;
        break;
      case 'leave_paid':
        totalPaidLeave++;
        break;
      case 'leave_unpaid':
        totalUnpaidLeave++;
        break;
      case 'holiday':
        totalHoliday++;
        break;
    }
    if (entry.overtime_hours && entry.overtime_hours > 0) {
      overtimeHours += Number(entry.overtime_hours);
    }
  });

  const paymentType = staff.payment_type || 'daily';
  const effective = getEffectiveRate(staff, compensation, endDate);
  const rate = effective.rate;
  const hoursPerDay = staff.hours_per_day && staff.hours_per_day > 0 ? staff.hours_per_day : 8;

  // Default overtime rate is (rate / hoursPerDay) if not provided
  let overtimeRate = effective.overtime_rate;
  if (overtimeRate == null || overtimeRate === 0) {
    if (paymentType === 'daily') {
      overtimeRate = roundMoney(rate / hoursPerDay);
    } else if (paymentType === 'hourly') {
      overtimeRate = rate;
    } else {
      overtimeRate = roundMoney(rate / (30 * hoursPerDay));
    }
  }

  const overtimePay = roundMoney(overtimeHours * overtimeRate);

  let basePay = 0;
  let pieceCount = 0;
  let piecePay = 0;
  let hourlyHours = 0;
  let hourlyPay = 0;
  let formulaText = '';
  const totalPayableDays = totalPresent + totalHalf * 0.5 + totalPaidLeave + totalHoliday;

  if (paymentType === 'daily') {
    // Formula: present * rate + half * (rate / 2) + paidLeave * rate + holiday * rate
    const presentPay = roundMoney(totalPresent * rate);
    const halfPay = roundMoney(totalHalf * (rate / 2));
    const paidLeavePay = roundMoney(totalPaidLeave * rate);
    const holidayPay = roundMoney(totalHoliday * rate);
    basePay = roundMoney(presentPay + halfPay + paidLeavePay + holidayPay);

    formulaText = `Daily: (P: ${totalPresent} × ${rate}) + (H: ${totalHalf} × ${roundMoney(
      rate / 2
    )}) + (Paid Leaves: ${totalPaidLeave} × ${rate}) + (Holidays: ${totalHoliday} × ${rate}) = ${basePay}`;
    if (overtimeHours > 0) {
      formulaText += ` + OT: (${overtimeHours} hrs × ${overtimeRate}) = ${overtimePay}`;
    }
  } else if (paymentType === 'monthly') {
    // Prorated monthly salary
    // If fixed_30, denominator is 30. If calendar_days, total days in month of startDate.
    const startObj = new Date(startDate);
    const calendarDays = getDaysInMonth(startObj.getFullYear(), startObj.getMonth());
    const denominator = monthMode === 'calendar_days' ? calendarDays : 30;
    const dailyWageRate = rate / denominator;

    basePay = roundMoney(totalPayableDays * dailyWageRate);
    formulaText = `Monthly Prorated (${monthMode}): (${rate} / ${denominator} days = ${roundMoney(
      dailyWageRate
    )}/day) × ${totalPayableDays} payable days = ${basePay}`;
    if (overtimeHours > 0) {
      formulaText += ` + OT: (${overtimeHours} hrs × ${overtimeRate}) = ${overtimePay}`;
    }
  } else if (paymentType === 'hourly') {
    // Sum hours from attendance overtime and work entries
    relevantWork.forEach((w) => {
      if (w.hours && w.hours > 0) hourlyHours += Number(w.hours);
    });
    // If no work hours logged, check attendance present days * hoursPerDay
    if (hourlyHours === 0) {
      hourlyHours = totalPresent * hoursPerDay + totalHalf * (hoursPerDay / 2) + overtimeHours;
    } else {
      hourlyHours += overtimeHours;
    }
    hourlyPay = roundMoney(hourlyHours * rate);
    basePay = hourlyPay;
    formulaText = `Hourly: ${hourlyHours} hrs × ${rate} = ${basePay}`;
  } else if (paymentType === 'piece') {
    // Sum quantity from work entries
    relevantWork.forEach((w) => {
      if (w.quantity && w.quantity > 0) pieceCount += Number(w.quantity);
    });
    piecePay = roundMoney(pieceCount * rate);
    basePay = piecePay;
    formulaText = `Per Piece: ${pieceCount} ${staff.unit_name || 'units'} × ${rate} = ${basePay}`;
    if (overtimeHours > 0) {
      formulaText += ` + OT: (${overtimeHours} hrs × ${overtimeRate}) = ${overtimePay}`;
    }
  }

  const totalEarned = roundMoney(basePay + (paymentType === 'piece' || paymentType === 'daily' || paymentType === 'monthly' ? overtimePay : 0));

  return {
    paymentType,
    rateUsed: rate,
    overtimeRateUsed: overtimeRate,
    totalPresent,
    totalHalf,
    totalAbsent,
    totalPaidLeave,
    totalUnpaidLeave,
    totalHoliday,
    totalPayableDays,
    overtimeHours,
    overtimePay,
    basePay,
    pieceCount,
    piecePay,
    hourlyHours,
    hourlyPay,
    totalEarned,
    formulaText,
  };
}

/**
 * Calculates net payable balance for a staff member including earnings, payments, advances, and adjustments.
 */
export function calculateStaffNetDues(params: {
  staffId: string;
  totalEarned: number;
  payments: LocalPayment[];
  overrideAmount?: number;
  overrideReason?: string;
}): NetDuesBreakdown {
  const { staffId, totalEarned, payments, overrideAmount, overrideReason } = params;

  const relevantPayments = payments.filter((p) => !p.deleted_at && p.staff_id === staffId);

  let salaryPaid = 0;
  let advancesTaken = 0;
  let advancesRecovered = 0;
  let bonusTotal = 0;
  let reimbursementTotal = 0;
  let deductionTotal = 0;
  let penaltyTotal = 0;
  let totalPaid = 0;

  relevantPayments.forEach((p) => {
    const amt = roundMoney(p.amount);
    totalPaid = roundMoney(totalPaid + amt);

    switch (p.type) {
      case 'salary':
        salaryPaid = roundMoney(salaryPaid + amt);
        break;
      case 'advance':
      case 'loan':
        advancesTaken = roundMoney(advancesTaken + amt);
        break;
      case 'loan_repayment':
        advancesRecovered = roundMoney(advancesRecovered + amt);
        break;
      case 'bonus':
        bonusTotal = roundMoney(bonusTotal + amt);
        break;
      case 'reimbursement':
        reimbursementTotal = roundMoney(reimbursementTotal + amt);
        break;
      case 'deduction':
        deductionTotal = roundMoney(deductionTotal + amt);
        break;
      case 'penalty':
        penaltyTotal = roundMoney(penaltyTotal + amt);
        break;
    }
  });

  const grossPayable = roundMoney(totalEarned + bonusTotal + reimbursementTotal);
  const advancesOutstanding = roundMoney(advancesTaken - advancesRecovered);

  // Net payable = Gross earnings (Earned + Bonus + Reimbursements)
  // - Deductions - Penalties - Advances recovered - Already paid salary
  let netPayable = roundMoney(
    grossPayable - deductionTotal - penaltyTotal - advancesOutstanding - salaryPaid
  );

  let overrideApplied;
  if (overrideAmount != null && !isNaN(overrideAmount)) {
    overrideApplied = {
      originalAmount: netPayable,
      overriddenAmount: roundMoney(overrideAmount),
      reason: overrideReason || 'Manual adjustment override',
    };
    netPayable = roundMoney(overrideAmount);
  }

  let status: 'owed_to_staff' | 'owed_by_staff' | 'settled' = 'settled';
  if (netPayable > 0.001) {
    status = 'owed_to_staff';
  } else if (netPayable < -0.001) {
    status = 'owed_by_staff';
  }

  const formulaBreakdown = `Earned (${totalEarned}) + Bonus (${bonusTotal}) + Reimb (${reimbursementTotal}) - Adv Outst (${advancesOutstanding}) - Deduc (${deductionTotal}) - Penalty (${penaltyTotal}) - Paid (${salaryPaid}) = ${netPayable}`;

  return {
    staffId,
    totalEarned: roundMoney(totalEarned),
    bonusTotal,
    reimbursementTotal,
    grossPayable,
    advancesTaken,
    advancesRecovered,
    advancesOutstanding,
    deductionTotal,
    penaltyTotal,
    salaryPaid,
    totalPaid,
    netPayable,
    status,
    formulaBreakdown,
    overrideApplied,
  };
}

/**
 * Checks if a date falls inside any active closed period for the organization.
 */
export function isDateInClosedPeriod(
  date: string, // YYYY-MM-DD
  closings: LocalPeriodClosing[],
  staffId?: string
): LocalPeriodClosing | undefined {
  return closings.find((c) => {
    if (c.deleted_at || c.status !== 'closed') return false;
    if (c.staff_id && staffId && c.staff_id !== staffId) return false;
    return date >= c.period_start && date <= c.period_end;
  });
}
