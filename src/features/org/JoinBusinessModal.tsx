import React, { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { FormField } from '@/components/ui/FormField';
import { Input } from '@/components/ui/Input';
import { useOrg } from './orgContext';
import { useToast } from '@/components/ui/Toast';
import { KeyRound, Check } from 'lucide-react';

interface JoinBusinessModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const JoinBusinessModal: React.FC<JoinBusinessModalProps> = ({ isOpen, onClose }) => {
  const { joinWithInvite } = useOrg();
  const { success, error } = useToast();

  const [code, setCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;

    setIsLoading(true);
    const res = await joinWithInvite(code.trim());
    setIsLoading(false);

    if (res.error) {
      error(res.error.message || 'Invalid or expired invite code.');
    } else {
      success('Successfully joined the business!');
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
        <FormField
          label="6-Character Invite Code"
          required
          helpText="Ask your business owner or manager for their invite code"
        >
          <Input
            required
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="e.g. A1B2C3"
            className="uppercase font-mono text-center tracking-widest text-base"
          />
        </FormField>

        <div className="pt-2 flex items-center justify-end gap-2">
          <Button variant="secondary" type="button" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" isLoading={isLoading}>
            <Check className="w-4 h-4" />
            <span>Join Business</span>
          </Button>
        </div>
      </form>
    </Modal>
  );
};
