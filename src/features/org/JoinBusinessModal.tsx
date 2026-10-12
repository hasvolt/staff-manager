import React, { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { FormField } from '@/components/ui/FormField';
import { Input } from '@/components/ui/Input';
import { useOrg } from './orgContext';
import { useAuth } from '@/features/auth/authContext';
import { useToast } from '@/components/ui/Toast';
import { KeyRound, Check, LogIn, AlertCircle } from 'lucide-react';

interface JoinBusinessModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialCode?: string;
  onOpenAuth?: () => void;
}

export const JoinBusinessModal: React.FC<JoinBusinessModalProps> = ({
  isOpen,
  onClose,
  initialCode = '',
  onOpenAuth,
}) => {
  const { joinWithInvite } = useOrg();
  const { user } = useAuth();
  const { success, error } = useToast();

  const [code, setCode] = useState(initialCode);
  const [isLoading, setIsLoading] = useState(false);

  React.useEffect(() => {
    if (initialCode) {
      setCode(initialCode.toUpperCase().trim());
    }
  }, [initialCode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = code.trim().toUpperCase();
    if (!cleanCode) return;

    if (!user) {
      error('Please sign in first to join an organization with an invite code.');
      if (onOpenAuth) {
        onClose();
        onOpenAuth();
      }
      return;
    }

    setIsLoading(true);
    const res = await joinWithInvite(cleanCode);
    setIsLoading(false);

    if (res.error) {
      error(res.error.message || 'Invalid or expired invite code.');
    } else {
      success('Successfully joined the business! Switched to new workspace.');
      setCode('');
      onClose();
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2">
          <KeyRound className="w-5 h-5 text-[var(--accent)]" />
          <span>Join with Invite Code</span>
        </div>
      }
      maxWidth="sm"
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-left">
        {!user && (
          <div className="p-3 rounded-xl border border-amber-500/30 bg-amber-500/10 text-xs text-[var(--text)] space-y-2">
            <div className="flex items-center gap-2 font-semibold text-amber-500">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>Sign-In Required</span>
            </div>
            <p className="text-[11px] text-[var(--text-muted)] leading-relaxed">
              To attach your device and user account to this business team, you need to sign in or create an account first.
            </p>
            {onOpenAuth && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  onClose();
                  onOpenAuth();
                }}
                className="w-full flex items-center justify-center gap-1.5"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Sign In / Register Now</span>
              </Button>
            )}
          </div>
        )}

        <FormField
          label="Invite Code"
          required
          helpText="Enter the 12-character code (or link code) given by your business owner or manager"
        >
          <Input
            required
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="e.g. A1B2C3D4E5F6"
            className="uppercase font-mono text-center tracking-widest text-base font-bold"
            maxLength={24}
          />
        </FormField>

        <div className="pt-2 flex items-center justify-end gap-2">
          <Button variant="secondary" type="button" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" isLoading={isLoading} disabled={!code.trim()}>
            <Check className="w-4 h-4" />
            <span>Join Business</span>
          </Button>
        </div>
      </form>
    </Modal>
  );
};
