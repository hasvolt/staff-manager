import React, { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { FormField } from '@/components/ui/FormField';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { useOrg } from './orgContext';
import { useToast } from '@/components/ui/Toast';
import { Building2, Plus, Sparkles } from 'lucide-react';

interface CreateBusinessModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CreateBusinessModal: React.FC<CreateBusinessModalProps> = ({ isOpen, onClose }) => {
  const { createBusiness } = useOrg();
  const { success, error } = useToast();

  const [name, setName] = useState('');
  const [businessType, setBusinessType] = useState('other');
  const [currency, setCurrency] = useState('INR');
  const [weekStart, setWeekStart] = useState('1');
  const [isLoading, setIsLoading] = useState(false);

  const businessTypeOptions = [
    { value: 'construction', label: 'Construction / Contractor' },
    { value: 'shop', label: 'Retail Shop / Store' },
    { value: 'factory', label: 'Factory / Workshop' },
    { value: 'farm', label: 'Farm / Agriculture' },
    { value: 'household', label: 'Household / Domestic Staff' },
    { value: 'other', label: 'General / Other Business' },
  ];

  const currencyOptions = [
    { value: 'INR', label: 'INR (₹) - Indian Rupee' },
    { value: 'USD', label: 'USD ($) - US Dollar' },
    { value: 'AED', label: 'AED (د.إ) - UAE Dirham' },
    { value: 'SAR', label: 'SAR (﷼) - Saudi Riyal' },
    { value: 'EUR', label: 'EUR (€) - Euro' },
    { value: 'GBP', label: 'GBP (£) - British Pound' },
    { value: 'PKR', label: 'PKR (₨) - Pakistani Rupee' },
    { value: 'BDT', label: 'BDT (৳) - Bangladeshi Taka' },
    { value: 'NPR', label: 'NPR (रु) - Nepalese Rupee' },
  ];

  const weekStartOptions = [
    { value: '1', label: 'Monday' },
    { value: '0', label: 'Sunday' },
    { value: '6', label: 'Saturday' },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsLoading(true);
    const res = await createBusiness(
      name.trim(),
      businessType,
      currency,
      'India',
      parseInt(weekStart, 10)
    );
    setIsLoading(false);

    if (res.error) {
      error(res.error.message || 'Failed to create business.');
    } else {
      success(`Business "${name}" created successfully!`);
      setName('');
      onClose();
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2">
          <Building2 className="w-5 h-5 text-[var(--accent)]" />
          <span>Create New Business</span>
        </div>
      }
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-left">
        <FormField label="Business / Shop Name" required>
          <Input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Apex Electrical Works, Khan Superstore"
          />
        </FormField>

        <FormField label="Business Type Preset" helpText="Sets default terminology and role suggestions">
          <Select
            value={businessType}
            onChange={(e) => setBusinessType(e.target.value)}
            options={businessTypeOptions}
          />
        </FormField>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <FormField label="Default Currency">
            <Select
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              options={currencyOptions}
            />
          </FormField>

          <FormField label="Week Starts On">
            <Select
              value={weekStart}
              onChange={(e) => setWeekStart(e.target.value)}
              options={weekStartOptions}
            />
          </FormField>
        </div>

        <div className="pt-2 flex items-center justify-end gap-2">
          <Button variant="secondary" type="button" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" isLoading={isLoading}>
            <Plus className="w-4 h-4" />
            <span>Create Business</span>
          </Button>
        </div>
      </form>
    </Modal>
  );
};
