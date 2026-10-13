import React, { useRef } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { AppLogo } from '@/components/ui/AppLogo';
import { useToast } from '@/components/ui/Toast';
import { useOrg } from '@/features/org/orgContext';
import { useI18n } from '@/lib/i18n/i18nContext';
import { LocalPayment, LocalStaff } from '@/lib/db/dexie';
import { formatCurrency, formatDate } from '@/lib/format/formatters';
import { exportToPdf } from '@/lib/export/pdfExport';
import { shareSummary } from '@/lib/export/csvExport';
import { triggerPrint } from '@/lib/print/printUtils';
import { Printer, Download, Share2, CheckCircle2 } from 'lucide-react';

interface PaymentReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  payment: LocalPayment | null;
  staff: LocalStaff | null;
}

export const PaymentReceiptModal: React.FC<PaymentReceiptModalProps> = ({
  isOpen,
  onClose,
  payment,
  staff,
}) => {
  const { currentOrg } = useOrg();
  const { currency } = useI18n();
  const { success, info } = useToast();
  const receiptRef = useRef<HTMLDivElement>(null);

  if (!payment) return null;

  const handlePrint = async () => {
    info('Opening receipt print dialog...');
    await triggerPrint({
      title: `Payment_Receipt_${staff?.name || 'Staff'}_${payment.pay_date}`,
    });
  };

  const handleExportPdf = async () => {
    info('Generating payment receipt PDF...');
    const rows = [
      ['Receipt No / ID', payment.id.slice(0, 8).toUpperCase()],
      ['Date of Payment', formatDate(payment.pay_date)],
      ['Staff Member', staff ? `${staff.name} (${staff.staff_code || '-'})` : 'Unknown Staff'],
      ['Payment Type', payment.type.toUpperCase()],
      ['Payment Mode', (payment.mode || 'Cash').toUpperCase()],
      ['Amount Paid', formatCurrency(payment.amount, currency)],
      ['Reference / Note', payment.reference || payment.note || 'None'],
    ];

    await exportToPdf({
      filename: `Receipt_${staff?.name || 'Staff'}_${payment.pay_date}`,
      title: 'PAYMENT VOUCHER / RECEIPT',
      subtitle: `Issued by: ${currentOrg?.name || 'Staff Manager'}`,
      headers: ['Item Description', 'Details'],
      rows,
      orientation: 'portrait',
      includeSignatures: true,
      employerLabel: 'Authorized By',
      employeeLabel: 'Received By',
    });
    success('Receipt PDF downloaded!');
  };

  const handleShare = async () => {
    const text =
      `*Payment Receipt - ${currentOrg?.name || 'Staff Manager'}*\n` +
      `Receipt: #${payment.id.slice(0, 8).toUpperCase()}\n` +
      `Staff: ${staff?.name || 'Worker'}\n` +
      `Date: ${formatDate(payment.pay_date)}\n` +
      `Type: ${payment.type.toUpperCase()} | Mode: ${(payment.mode || 'Cash').toUpperCase()}\n` +
      `*Amount: ${formatCurrency(payment.amount, currency)}*\n` +
      `Note: ${payment.reference || payment.note || '-'}`;

    const res = await shareSummary(`Receipt #${payment.id.slice(0, 8).toUpperCase()}`, text);
    if (res.shared) {
      success(`Shared via ${res.method}!`);
    } else {
      success('Receipt text copied to clipboard!');
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Payment Receipt" maxWidth="md">
      <div className="space-y-4 text-left">
        {/* Actions bar (Hidden in print) */}
        <div className="no-print flex items-center justify-between gap-2 p-2.5 rounded-xl bg-[var(--surface-2)] border border-[var(--border)]">
          <Badge variant="accent">Receipt #{payment.id.slice(0, 8).toUpperCase()}</Badge>
          <div className="flex items-center gap-1.5">
            <Button variant="primary" size="sm" onClick={handlePrint}>
              <Printer className="w-3.5 h-3.5" />
              <span>Print</span>
            </Button>
            <Button variant="secondary" size="sm" onClick={handleExportPdf}>
              <Download className="w-3.5 h-3.5" />
              <span>PDF</span>
            </Button>
            <Button variant="outline" size="sm" onClick={handleShare}>
              <Share2 className="w-3.5 h-3.5" />
              <span>Share</span>
            </Button>
          </div>
        </div>

        {/* Printable Receipt Canvas (Thermal slip / voucher style) */}
        <div
          ref={receiptRef}
          className="printable-area p-5 rounded-2xl bg-white text-slate-900 border border-slate-200 shadow-sm max-w-sm mx-auto space-y-4 print:border-none print:shadow-none print:p-0"
        >
          {/* Header */}
          <div className="text-center border-b border-dashed border-slate-300 pb-3">
            {currentOrg?.logo_path ? (
              <img
                src={currentOrg.logo_path}
                alt="Business Logo"
                className="w-10 h-10 mx-auto mb-1.5 object-contain"
              />
            ) : (
              <div className="flex justify-center mb-1.5">
                <AppLogo size="sm" badgeOnly />
              </div>
            )}
            <h3 className="font-extrabold text-base tracking-tight text-slate-900">
              {currentOrg?.name || 'Staff Manager'}
            </h3>
            {currentOrg?.settings?.address && (
              <p className="text-[11px] text-slate-500 mt-0.5">{currentOrg.settings.address}</p>
            )}
            {currentOrg?.settings?.phone && (
              <p className="text-[11px] text-slate-500">Tel: {currentOrg.settings.phone}</p>
            )}
            <div className="inline-block px-2 py-0.5 mt-2 rounded bg-slate-100 text-[10px] font-bold uppercase tracking-wider text-slate-700">
              Payment Voucher / Receipt
            </div>
          </div>

          {/* Details */}
          <div className="space-y-2 text-xs divide-y divide-slate-100">
            <div className="flex justify-between py-1">
              <span className="text-slate-500">Receipt No:</span>
              <span className="font-mono font-bold text-slate-800">
                #{payment.id.slice(0, 8).toUpperCase()}
              </span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-slate-500">Date:</span>
              <span className="font-medium text-slate-800">{formatDate(payment.pay_date)}</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-slate-500">Paid To:</span>
              <span className="font-bold text-slate-900">{staff?.name || 'Staff Member'}</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-slate-500">Designation:</span>
              <span className="font-medium text-slate-700">{staff?.role_title || 'Worker'}</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-slate-500">Payment Category:</span>
              <span className="font-semibold text-slate-800 capitalize">{payment.type}</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-slate-500">Payment Mode:</span>
              <span className="font-semibold text-slate-800 capitalize">
                {payment.mode || 'Cash'}
              </span>
            </div>
            {payment.reference && (
              <div className="flex justify-between py-1">
                <span className="text-slate-500">Reference:</span>
                <span className="font-medium text-slate-700">{payment.reference}</span>
              </div>
            )}
            {payment.note && (
              <div className="flex justify-between py-1">
                <span className="text-slate-500">Note:</span>
                <span className="font-medium text-slate-700">{payment.note}</span>
              </div>
            )}
          </div>

          {/* Amount Box */}
          <div className="p-3 rounded-xl bg-slate-100 border border-slate-200 text-center">
            <span className="text-[10px] uppercase font-bold text-slate-500 block">
              Amount Paid
            </span>
            <div className="text-2xl font-black text-slate-900 mt-0.5">
              {formatCurrency(payment.amount, currency)}
            </div>
          </div>

          {/* Attached Voucher / Receipt Photo (if present) */}
          {payment.receipt_path && (
            <div className="pt-2 text-center">
              <span className="text-[10px] text-slate-400 font-semibold block mb-1">
                Attached Payment Voucher / Receipt
              </span>
              <div className="rounded-xl overflow-hidden border border-slate-200 max-h-40 bg-slate-50 flex items-center justify-center p-1">
                <img
                  src={payment.receipt_path}
                  alt="Receipt"
                  className="max-h-36 max-w-full object-contain rounded-lg"
                />
              </div>
            </div>
          )}

          {/* Signatures */}
          <div className="pt-6 grid grid-cols-2 gap-4 text-center text-[10px] text-slate-500">
            <div className="border-t border-slate-300 pt-1">
              <p className="font-medium text-slate-700">Received By</p>
            </div>
            <div className="border-t border-slate-300 pt-1">
              <p className="font-medium text-slate-700">Authorized By</p>
            </div>
          </div>

          <div className="text-center text-[9px] text-slate-400 pt-2 border-t border-dashed border-slate-200">
            Generated via Staff Manager • Keep this voucher for your records
          </div>
        </div>
      </div>
    </Modal>
  );
};
