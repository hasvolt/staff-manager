import React from 'react';
import { Modal } from './Modal';
import { Button } from './Button';
import { AlertTriangle } from 'lucide-react';
import { useI18n } from '@/lib/i18n/i18nContext';

export interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning' | 'primary';
  isLoading?: boolean;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel,
  cancelLabel,
  variant = 'danger',
  isLoading = false,
}) => {
  const { t } = useI18n();

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="sm"
      title={
        <div className="flex items-center gap-2 text-[var(--expense)]">
          <AlertTriangle className="w-5 h-5 shrink-0" />
          <span>{title}</span>
        </div>
      }
      footer={
        <>
          <Button variant="secondary" size="sm" onClick={onClose} disabled={isLoading}>
            {cancelLabel || t('common.cancel')}
          </Button>
          <Button
            variant={variant === 'danger' ? 'expense' : 'primary'}
            size="sm"
            onClick={onConfirm}
            isLoading={isLoading}
          >
            {confirmLabel || t('common.confirm')}
          </Button>
        </>
      }
    >
      <p className="text-sm text-[var(--text-muted)] leading-relaxed">{message}</p>
    </Modal>
  );
};
