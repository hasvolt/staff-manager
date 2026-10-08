import React, { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { TextArea } from '@/components/ui/TextArea';
import { Select } from '@/components/ui/Select';
import { NumberInput } from '@/components/ui/NumberInput';
import { DatePicker } from '@/components/ui/DatePicker';
import { FormField } from '@/components/ui/FormField';
import { FileUpload } from '@/components/ui/FileUpload';
import { useOrg } from '@/features/org/orgContext';
import { useI18n } from '@/lib/i18n/i18nContext';
import { useToast } from '@/components/ui/Toast';
import { localDb, LocalStaff, LocalPayment } from '@/lib/db/dexie';
import { paymentRepo } from '@/lib/db/repository';
import { isDateInClosedPeriod, roundMoney } from '@/lib/calculations/salaryCalculations';
import { AlertTriangle, Lock, ShieldAlert, Sparkles, CreditCard } from 'lucide-react';

export interface PaymentFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (payment: LocalPayment) => void;
  initialStaffId?: string;
  initialAmount?: number;
  initialType?: LocalPayment['type'];
  initialPeriodStart?: string;
  initialPeriodEnd?: string;
  initialOverrideNote?: string;
  paymentToEdit?: LocalPayment | null;
}

export const PaymentFormModal: React.FC<PaymentFormModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  initialStaffId = '',
  initialAmount,
  initialType = 'salary',
  initialPeriodStart = '',
  initialPeriodEnd = '',
  initialOverrideNote = '',
  paymentToEdit,
}) => {
  const { currentOrg } = useOrg();
  const { t, formatCurrency } = useI18n();
  const { success, error, warning } = useToast();

  const [staffList, setStaffList] = useState<LocalStaff[]>([]);
  const [selectedStaffId, setSelectedStaffId] = useState(initialStaffId);
  const [amount, setAmount] = useState<number | string>(initialAmount ?? '');
  const [payDate, setPayDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [paymentType, setPaymentType] = useState<LocalPayment['type']>(initialType);
  const [mode, setMode] = useState<NonNullable<LocalPayment['mode']>>('cash');
  const [reference, setReference] = useState('');
  const [note, setNote] = useState('');
  const [periodStart, setPeriodStart] = useState(initialPeriodStart);
  const [periodEnd, setPeriodEnd] = useState(initialPeriodEnd);
  const [overrideNote, setOverrideNote] = useState(initialOverrideNote);
  const [receiptBase64, setReceiptBase64] = useState<string | null>(null);

  // Validation & Safety flags
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);
  const [duplicateConfirmed, setDuplicateConfirmed] = useState(false);
  const [isLockedByPeriod, setIsLockedByPeriod] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Load staff
  useEffect(() => {
    if (!currentOrg?.id) return;
    localDb.staff
      .where('org_id')
      .equals(currentOrg.id)
      .filter((s) => !s.deleted_at && s.status === 'active')
      .toArray()
      .then((list) => {
        setStaffList(list);
        if (!selectedStaffId && list.length > 0 && !initialStaffId) {
          setSelectedStaffId(list[0].id);
        }
      });
  }, [currentOrg, isOpen]);

  // Handle Edit or Init
  useEffect(() => {
    if (paymentToEdit) {
      setSelectedStaffId(paymentToEdit.staff_id);
      setAmount(paymentToEdit.amount);
      setPayDate(paymentToEdit.pay_date);
      setPaymentType(paymentToEdit.type);
      setMode(paymentToEdit.mode || 'cash');
      setReference(paymentToEdit.reference || '');
      setNote(paymentToEdit.note || '');
      setPeriodStart(paymentToEdit.period_start || '');
      setPeriodEnd(paymentToEdit.period_end || '');
      setOverrideNote(paymentToEdit.override_note || '');
      setReceiptBase64(paymentToEdit.receipt_path || null);
    } else {
      if (initialStaffId) setSelectedStaffId(initialStaffId);
      if (initialAmount !== undefined) setAmount(initialAmount);
      if (initialType) setPaymentType(initialType);
      if (initialPeriodStart) setPeriodStart(initialPeriodStart);
      if (initialPeriodEnd) setPeriodEnd(initialPeriodEnd);
      if (initialOverrideNote) setOverrideNote(initialOverrideNote);
    }
    setDuplicateWarning(null);
    setDuplicateConfirmed(false);
  }, [paymentToEdit, initialStaffId, initialAmount, initialType, initialPeriodStart, initialPeriodEnd, initialOverrideNote, isOpen]);

  // Check period lock
  useEffect(() => {
    if (!currentOrg?.id || !payDate) return;
    localDb.period_closings
      .where('org_id')
      .equals(currentOrg.id)
      .filter((c) => !c.deleted_at && c.status === 'closed')
      .toArray()
      .then((closings) => {
        const locked = isDateInClosedPeriod(payDate, closings, selectedStaffId);
        setIsLockedByPeriod(!!locked);
      });
  }, [currentOrg, payDate, selectedStaffId]);

  // Check duplicate payment
  useEffect(() => {
    if (!currentOrg?.id || !selectedStaffId || !amount || Number(amount) <= 0 || !payDate) {
      setDuplicateWarning(null);
      return;
    }

    const numAmount = roundMoney(Number(amount));
    localDb.payments
      .where('org_id')
      .equals(currentOrg.id)
      .filter(
        (p) =>
          !p.deleted_at &&
          p.staff_id === selectedStaffId &&
          p.pay_date === payDate &&
          roundMoney(p.amount) === numAmount &&
          (!paymentToEdit || p.id !== paymentToEdit.id)
      )
      .first()
      .then((existing) => {
        if (existing) {
          const staffMember = staffList.find((s) => s.id === selectedStaffId);
          setDuplicateWarning(
            `Warning: A payment of ${formatCurrency(numAmount)} on ${payDate} for ${
              staffMember?.name || 'this staff'
            } already exists (${existing.type.toUpperCase()}).`
          );
        } else {
          setDuplicateWarning(null);
        }
      });
  }, [currentOrg, selectedStaffId, amount, payDate, staffList, paymentToEdit]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentOrg) return;

    if (!selectedStaffId) {
      error('Please select a staff member.');
      return;
    }

    const numericAmount = roundMoney(Number(amount));
    if (isNaN(numericAmount) || numericAmount <= 0) {
      error('Please enter a valid positive payment amount.');
      return;
    }

    if (isLockedByPeriod) {
      error('Cannot record or edit payment: Selected date is inside a closed and locked month.');
      return;
    }

    if (duplicateWarning && !duplicateConfirmed) {
      warning('Please confirm to proceed with duplicate payment recording.');
      return;
    }

    setIsSaving(true);
    try {
      const payload: Partial<LocalPayment> = {
        org_id: currentOrg.id,
        staff_id: selectedStaffId,
        amount: numericAmount,
        pay_date: payDate,
        type: paymentType,
        mode: mode,
        reference: reference.trim() || null,
        note: note.trim() || null,
        period_start: periodStart || null,
        period_end: periodEnd || null,
        override_note: overrideNote.trim() || null,
        receipt_path: receiptBase64,
      };

      let result: LocalPayment;
      if (paymentToEdit) {
        result = await paymentRepo.update(paymentToEdit.id, payload);
        success('Payment record updated successfully.');
      } else {
        result = await paymentRepo.create(payload as any);
        success('Payment recorded successfully.');
      }

      onSuccess?.(result);
      onClose();
    } catch (err: any) {
      error(err.message || 'Failed to save payment record.');
    } finally {
      setIsSaving(false);
    }
  };

  const selectedStaff = staffList.find((s) => s.id === selectedStaffId);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={paymentToEdit ? 'Edit Payment Record' : 'Record Payment / Advance'}
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Closed Period Lock Alert */}
        {isLockedByPeriod && (
          <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 flex items-start gap-2.5 text-xs text-red-400">
            <Lock className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Period is Closed &amp; Locked</p>
              <p className="opacity-90">
                The selected date ({payDate}) falls into a locked settlement period. Unlocking is required by the business owner before edits or additions can be recorded.
              </p>
            </div>
          </div>
        )}

        {/* Staff Selector */}
        <FormField label="Staff Member" required>
          <Select
            value={selectedStaffId}
            onChange={(e) => setSelectedStaffId(e.target.value)}
            disabled={!!paymentToEdit}
          >
            <option value="">-- Choose Staff Member --</option>
            {staffList.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.payment_type.toUpperCase()} • ₹{s.rate || 0})
              </option>
            ))}
          </Select>
          {selectedStaff && (
            <p className="text-[11px] text-[var(--text-muted)] mt-1">
              Payment mode: <span className="font-semibold text-[var(--text)] capitalize">{selectedStaff.payment_type}</span>{' '}
              • Base Rate: <span className="font-semibold text-[var(--income)]">₹{selectedStaff.rate || 0}</span>
            </p>
          )}
        </FormField>

        {/* Payment Type & Mode */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <FormField label="Payment Type" required>
            <Select
              value={paymentType}
              onChange={(e) => setPaymentType(e.target.value as LocalPayment['type'])}
            >
              <option value="salary">Wage / Salary (Net Pay)</option>
              <option value="advance">Advance (Peshgi / Udhar)</option>
              <option value="bonus">Bonus / Incentive</option>
              <option value="reimbursement">Expense Reimbursement</option>
              <option value="deduction">Deduction (Katoti)</option>
              <option value="penalty">Penalty / Fine</option>
              <option value="loan">Loan to Staff</option>
              <option value="loan_repayment">Loan Repayment</option>
            </Select>
          </FormField>

          <FormField label="Payment Mode" required>
            <Select
              value={mode}
              onChange={(e) => setMode(e.target.value as any)}
            >
              <option value="cash">Cash (नकद)</option>
              <option value="upi">UPI (GPay / PhonePe / Paytm)</option>
              <option value="bank">Bank Transfer (NEFT/IMPS)</option>
              <option value="cheque">Cheque</option>
              <option value="other">Other</option>
            </Select>
          </FormField>
        </div>

        {/* Amount & Date with Calculator Icon */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <FormField label="Amount (₹)" required>
            <NumberInput
              value={amount}
              onChange={(val) => setAmount(val)}
              showCalculatorIcon={true}
              placeholder="0.00"
              prefix="₹"
            />
          </FormField>

          <FormField label="Payment Date" required>
            <DatePicker
              value={payDate}
              onChange={(e) => setPayDate(e.target.value)}
            />
          </FormField>
        </div>

        {/* Duplicate Warning Prompt */}
        {duplicateWarning && (
          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 space-y-2">
            <div className="flex items-start gap-2 text-xs text-amber-400">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-semibold">{duplicateWarning}</p>
                <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
                  Check if this payment was already entered. If this is an intentional secondary payment, please confirm below.
                </p>
              </div>
            </div>
            <label className="flex items-center gap-2 text-xs font-semibold text-[var(--text)] cursor-pointer pt-1">
              <input
                type="checkbox"
                checked={duplicateConfirmed}
                onChange={(e) => setDuplicateConfirmed(e.target.checked)}
                className="w-4 h-4 rounded border-[var(--border)] text-[var(--accent)]"
              />
              <span>Yes, record as another separate payment</span>
            </label>
          </div>
        )}

        {/* Period Covered (Optional) */}
        <div className="p-3 rounded-xl bg-[var(--surface-2)]/50 border border-[var(--border)] space-y-2">
          <span className="text-xs font-semibold text-[var(--text)] block">
            Period Covered (Optional)
          </span>
          <div className="grid grid-cols-2 gap-2">
            <DatePicker
              value={periodStart}
              onChange={(e) => setPeriodStart(e.target.value)}
              placeholder="From Date"
            />
            <DatePicker
              value={periodEnd}
              onChange={(e) => setPeriodEnd(e.target.value)}
              placeholder="To Date"
            />
          </div>
        </div>

        {/* Reference / Txn ID */}
        <FormField label="Reference / Transaction ID / Bank Note">
          <Input
            value={reference}
            onChange={(e) => setReference(e.target.value)}
            placeholder="e.g. UPI Ref 123456, Chq #987654"
          />
        </FormField>

        {/* Note / Remarks */}
        <FormField label="Notes & Remarks">
          <TextArea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Any specific note regarding this payment, overtime adjustment, or deduction..."
            rows={2}
          />
        </FormField>

        {/* Manual Override Note (if amount differs from calculation) */}
        {overrideNote && (
          <FormField label="Calculation Override Reason">
            <Input
              value={overrideNote}
              onChange={(e) => setOverrideNote(e.target.value)}
              placeholder="Reason for overriding the calculated amount"
            />
          </FormField>
        )}

        {/* Receipt Upload */}
        <FormField label="Payment Receipt / Voucher Photo (Optional)">
          <FileUpload
            label="Upload Receipt"
            value={receiptBase64 || undefined}
            onChange={(val) => setReceiptBase64(val)}
          />
        </FormField>

        {/* Buttons */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-[var(--border)]">
          <Button type="button" variant="secondary" onClick={onClose} disabled={isSaving}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="income"
            disabled={isSaving || isLockedByPeriod || (!!duplicateWarning && !duplicateConfirmed)}
          >
            {isSaving ? 'Saving...' : paymentToEdit ? 'Update Payment' : 'Record Payment'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
