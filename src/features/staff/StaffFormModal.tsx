import React, { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { FormField } from '@/components/ui/FormField';
import { Input } from '@/components/ui/Input';
import { NumberInput } from '@/components/ui/NumberInput';
import { Select } from '@/components/ui/Select';
import { TextArea } from '@/components/ui/TextArea';
import { FileUpload } from '@/components/ui/FileUpload';
import { staffRepo, staffCompensationRepo, siteRepo, customFieldRepo, generateUUID } from '@/lib/db/repository';
import { localDb, LocalStaff, LocalSite, LocalCustomFieldDef } from '@/lib/db/dexie';
import { useOrg } from '@/features/org/orgContext';
import { useOrgLabels } from '@/lib/org/labels';
import { useToast } from '@/components/ui/Toast';
import { useI18n } from '@/lib/i18n/i18nContext';
import {
  User,
  Phone,
  Briefcase,
  DollarSign,
  Calendar,
  MapPin,
  AlertCircle,
  Clock,
  Hash,
  Sparkles,
} from 'lucide-react';

interface StaffFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  staffToEdit?: LocalStaff | null;
  onSaved: () => void;
}

const DESIGNATION_SUGGESTIONS = [
  'Mistri',
  'Helper',
  'Driver',
  'Electrician',
  'Plumber',
  'Carpenter',
  'Painter',
  'Cashier',
  'Cook',
  'Supervisor',
  'Operator',
  'Labour',
];

const WEEK_DAYS = [
  { val: 0, label: 'Sun' },
  { val: 1, label: 'Mon' },
  { val: 2, label: 'Tue' },
  { val: 3, label: 'Wed' },
  { val: 4, label: 'Thu' },
  { val: 5, label: 'Fri' },
  { val: 6, label: 'Sat' },
];

export const StaffFormModal: React.FC<StaffFormModalProps> = ({
  isOpen,
  onClose,
  staffToEdit,
  onSaved,
}) => {
  const { currentOrg } = useOrg();
  const { siteLabel } = useOrgLabels();
  const { success, error, info } = useToast();
  const { t } = useI18n();

  const [sites, setSites] = useState<LocalSite[]>([]);
  const [name, setName] = useState('');
  const [staffCode, setStaffCode] = useState('');
  const [phone, setPhone] = useState('');
  const [altPhone, setAltPhone] = useState('');
  const [photoPath, setPhotoPath] = useState('');
  const [roleTitle, setRoleTitle] = useState('');
  const [joiningDate, setJoiningDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [status, setStatus] = useState<'active' | 'inactive' | 'left'>('active');
  const [address, setAddress] = useState('');
  const [emergencyContact, setEmergencyContact] = useState('');
  const [idProofNote, setIdProofNote] = useState('');
  const [paymentNote, setPaymentNote] = useState('');
  const [notes, setNotes] = useState('');
  const [paymentType, setPaymentType] = useState<'daily' | 'monthly' | 'hourly' | 'piece'>('daily');
  const [rate, setRate] = useState<number | string>(700);
  const [effectiveFromDate, setEffectiveFromDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [overtimeRate, setOvertimeRate] = useState<number | string>('');
  const [hoursPerDay, setHoursPerDay] = useState<number | string>('8');
  const [unitName, setUnitName] = useState('piece');
  const [weeklyOff, setWeeklyOff] = useState<number[]>([0]); // Default Sunday
  const [defaultSiteId, setDefaultSiteId] = useState('');
  const [customFieldDefs, setCustomFieldDefs] = useState<LocalCustomFieldDef[]>([]);
  const [customValues, setCustomValues] = useState<Record<string, any>>({});
  const [isLoading, setIsLoading] = useState(false);

  const draftKey = `draft_staff_${staffToEdit ? staffToEdit.id : 'new'}`;

  // Load sites and custom fields
  useEffect(() => {
    if (currentOrg?.id) {
      siteRepo.list(currentOrg.id).then(setSites);
      customFieldRepo.list(currentOrg.id, false).then((all) => {
        setCustomFieldDefs(all.filter((f) => f.entity === 'staff'));
      });
    }
  }, [currentOrg]);

  // Safe close with unsaved check
  const handleSafeClose = () => {
    if (!staffToEdit && (name.trim() || phone.trim())) {
      if (!window.confirm('You have unsaved changes. Are you sure you want to close? Your draft has been autosaved.')) {
        return;
      }
    }
    onClose();
  };

  // Populate or reset form
  useEffect(() => {
    if (isOpen) {
      if (staffToEdit) {
        setName(staffToEdit.name);
        setStaffCode(staffToEdit.staff_code || '');
        setPhone(staffToEdit.phone || '');
        setAltPhone(staffToEdit.alt_phone || '');
        setPhotoPath(staffToEdit.photo_path || '');
        setRoleTitle(staffToEdit.role_title || '');
        setJoiningDate(staffToEdit.joining_date || new Date().toISOString().split('T')[0]);
        setStatus(staffToEdit.status || 'active');
        setAddress(staffToEdit.address || '');
        setEmergencyContact(staffToEdit.emergency_contact || '');
        setIdProofNote(staffToEdit.id_proof_note || '');
        setPaymentNote(staffToEdit.payment_note || '');
        setNotes(staffToEdit.notes || '');
        setPaymentType(staffToEdit.payment_type || 'daily');
        setRate(staffToEdit.rate ?? 0);
        setOvertimeRate(staffToEdit.overtime_rate ?? '');
        setHoursPerDay(staffToEdit.hours_per_day ?? '8');
        setUnitName(staffToEdit.unit_name || 'piece');
        setWeeklyOff(staffToEdit.weekly_off || [0]);
        setDefaultSiteId(staffToEdit.default_site_id || '');
        setCustomValues(staffToEdit.custom || {});
      } else {
        // Generate automatic staff ID
        const autoCode = `STF-${Math.floor(1000 + Math.random() * 9000)}`;
        setStaffCode(autoCode);
        setName('');
        setPhone('');
        setAltPhone('');
        setPhotoPath('');
        setRoleTitle('');
        setJoiningDate(new Date().toISOString().split('T')[0]);
        setStatus('active');
        setAddress('');
        setEmergencyContact('');
        setIdProofNote('');
        setPaymentNote('');
        setNotes('');
        setPaymentType('daily');
        setRate(700);
        setOvertimeRate('');
        setHoursPerDay('8');
        setUnitName('piece');
        setWeeklyOff([0]);
        setDefaultSiteId('');
        setCustomValues({});

        // Check for autosaved draft
        localDb.drafts.get(draftKey).then((draft) => {
          if (draft && draft.data) {
            info('Restored unsaved draft form');
            setName(draft.data.name || '');
            setPhone(draft.data.phone || '');
            setRoleTitle(draft.data.roleTitle || '');
            if (draft.data.rate) setRate(draft.data.rate);
          }
        });
      }
    }
  }, [isOpen, staffToEdit]);

  // Autosave draft when typing new staff
  useEffect(() => {
    if (isOpen && !staffToEdit && name) {
      const timer = setTimeout(() => {
        localDb.drafts.put({
          form_key: draftKey,
          data: { name, phone, roleTitle, rate },
          updated_at: new Date().toISOString(),
        });
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [isOpen, staffToEdit, name, phone, roleTitle, rate]);

  const toggleWeeklyOff = (day: number) => {
    setWeeklyOff((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !currentOrg) return;

    setIsLoading(true);

    try {
      const rateNum = Number(rate) || 0;
      const otNum = overtimeRate ? Number(overtimeRate) : null;
      const hoursNum = hoursPerDay ? Number(hoursPerDay) : 8;

      if (staffToEdit) {
        // Record rate history if rate or payment type changed
        let updatedHistory = staffToEdit.rate_history || [];
        if (staffToEdit.rate !== rateNum || staffToEdit.payment_type !== paymentType) {
          const effDate = effectiveFromDate || new Date().toISOString().split('T')[0];
          updatedHistory = [
            ...updatedHistory,
            {
              effective_from: effDate,
              from: effDate,
              type: paymentType,
              rate: rateNum,
              overtime_rate: otNum,
            },
          ];
        }

        await staffRepo.update(staffToEdit.id, {
          name: name.trim(),
          staff_code: staffCode.trim() || null,
          phone: phone.trim() || null,
          alt_phone: altPhone.trim() || null,
          photo_path: photoPath || null,
          role_title: roleTitle.trim() || null,
          joining_date: joiningDate,
          status,
          address: address.trim() || null,
          emergency_contact: emergencyContact.trim() || null,
          id_proof_note: idProofNote.trim() || null,
          payment_note: paymentNote.trim() || null,
          notes: notes.trim() || null,
          payment_type: paymentType,
          rate: rateNum,
          overtime_rate: otNum,
          hours_per_day: hoursNum,
          unit_name: paymentType === 'piece' ? unitName.trim() : null,
          weekly_off: weeklyOff,
          rate_history: updatedHistory,
          default_site_id: defaultSiteId || null,
          custom: customValues,
        });

        // Upsert separate staff_compensation record
        const existingComp = await localDb.staff_compensation.where('staff_id').equals(staffToEdit.id).first();
        if (existingComp) {
          await staffCompensationRepo.update(existingComp.id, {
            rate: rateNum,
            overtime_rate: otNum,
            payment_note: paymentNote.trim() || null,
            rate_history: updatedHistory,
          });
        } else {
          await staffCompensationRepo.create({
            org_id: currentOrg.id,
            staff_id: staffToEdit.id,
            rate: rateNum,
            overtime_rate: otNum,
            payment_note: paymentNote.trim() || null,
            rate_history: updatedHistory,
          });
        }

        success(`Updated staff details for "${name}"`);
      } else {
        const createdStaff = await staffRepo.create({
          org_id: currentOrg.id,
          name: name.trim(),
          staff_code: staffCode.trim() || null,
          phone: phone.trim() || null,
          alt_phone: altPhone.trim() || null,
          photo_path: photoPath || null,
          role_title: roleTitle.trim() || null,
          joining_date: joiningDate,
          status,
          address: address.trim() || null,
          emergency_contact: emergencyContact.trim() || null,
          id_proof_note: idProofNote.trim() || null,
          payment_note: paymentNote.trim() || null,
          notes: notes.trim() || null,
          payment_type: paymentType,
          rate: rateNum,
          overtime_rate: otNum,
          hours_per_day: hoursNum,
          unit_name: paymentType === 'piece' ? unitName.trim() : null,
          weekly_off: weeklyOff,
          rate_history: [
            {
              from: joiningDate,
              type: paymentType,
              rate: rateNum,
              overtime_rate: otNum,
            },
          ],
          default_site_id: defaultSiteId || null,
          custom: customValues,
        });

        // Create separate staff_compensation record
        await staffCompensationRepo.create({
          org_id: currentOrg.id,
          staff_id: createdStaff.id,
          rate: rateNum,
          overtime_rate: otNum,
          payment_note: paymentNote.trim() || null,
          rate_history: [
            {
              from: joiningDate,
              type: paymentType,
              rate: rateNum,
              overtime_rate: otNum,
            },
          ],
        });

        // Clear draft
        await localDb.drafts.delete(draftKey);
        success(`Added staff member "${name}"`);
      }

      onSaved();
      onClose();
    } catch (err: any) {
      error(err?.message || 'Failed to save staff record');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleSafeClose}
      maxWidth="lg"
      title={
        <div className="flex items-center gap-2">
          <User className="w-5 h-5 text-[var(--accent)]" />
          <span>{staffToEdit ? `Edit Staff: ${staffToEdit.name}` : 'Add New Staff Member'}</span>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-left">
        {/* Photo and Primary Identity */}
        <div className="flex flex-col sm:flex-row gap-4 items-start">
          <div className="w-full sm:w-64 shrink-0">
            <FileUpload
              label="Staff Photo"
              value={photoPath}
              onChange={setPhotoPath}
            />
          </div>

          <div className="flex-1 w-full space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <FormField label="Full Name" required>
                  <Input
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Ramesh Kumar"
                    prefixNode={<User className="w-4 h-4" />}
                  />
                </FormField>
              </div>

              <div>
                <FormField label="Staff ID / Code">
                  <Input
                    value={staffCode}
                    onChange={(e) => setStaffCode(e.target.value)}
                    placeholder="STF-1001"
                    prefixNode={<Hash className="w-4 h-4" />}
                  />
                </FormField>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <FormField label="Primary Phone">
                <Input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91 98765 43210"
                  prefixNode={<Phone className="w-4 h-4" />}
                />
              </FormField>

              <FormField label="Alternate Phone">
                <Input
                  type="tel"
                  value={altPhone}
                  onChange={(e) => setAltPhone(e.target.value)}
                  placeholder="Optional"
                  prefixNode={<Phone className="w-4 h-4" />}
                />
              </FormField>
            </div>
          </div>
        </div>

        {/* Designation / Role with Quick Suggestion Pills */}
        <div className="space-y-1.5">
          <FormField label="Role / Designation" helpText="Tap suggestions below or type custom title">
            <Input
              value={roleTitle}
              onChange={(e) => setRoleTitle(e.target.value)}
              placeholder="e.g. Mistri, Helper, Driver, Electrician..."
              prefixNode={<Briefcase className="w-4 h-4" />}
            />
          </FormField>
          <div className="flex flex-wrap gap-1.5 pt-1">
            {DESIGNATION_SUGGESTIONS.map((sug) => (
              <button
                key={sug}
                type="button"
                onClick={() => setRoleTitle(sug)}
                className={`text-[11px] px-2.5 py-1 rounded-lg border transition cursor-pointer ${
                  roleTitle === sug
                    ? 'bg-[var(--accent)] text-[var(--accent-contrast)] border-[var(--accent)] font-semibold'
                    : 'bg-[var(--surface-2)] text-[var(--text-muted)] border-[var(--border)] hover:text-[var(--text)]'
                }`}
              >
                {sug}
              </button>
            ))}
          </div>
        </div>

        {/* Wage Rate & Payment Structure */}
        <div className="p-4 rounded-2xl bg-[var(--surface-2)]/60 border border-[var(--border)] space-y-3.5">
          <div className="flex items-center justify-between pb-2 border-b border-[var(--border)]">
            <div className="flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-[var(--accent)]" />
              <h4 className="font-semibold text-xs uppercase tracking-wider text-[var(--text)]">
                Wage &amp; Payment Settings
              </h4>
            </div>
            <span className="text-[10px] text-[var(--text-muted)]">Includes Direct Calculator</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <FormField label="Payment Type" required>
              <Select
                value={paymentType}
                onChange={(e) => setPaymentType(e.target.value as any)}
                options={[
                  { value: 'daily', label: 'Daily Wage' },
                  { value: 'monthly', label: 'Monthly Fixed Salary' },
                  { value: 'hourly', label: 'Hourly Rate' },
                  { value: 'piece', label: 'Per Piece / Per Unit' },
                ]}
              />
            </FormField>

            <FormField
              label={
                paymentType === 'daily'
                  ? 'Daily Rate Amount'
                  : paymentType === 'monthly'
                  ? 'Monthly Salary Amount'
                  : paymentType === 'hourly'
                  ? 'Hourly Rate Amount'
                  : `Rate per ${unitName || 'piece'}`
              }
              required
            >
              <NumberInput
                value={rate}
                onChange={setRate}
                prefix={currentOrg?.currency === 'INR' ? '₹' : '$'}
                placeholder="700"
              />
            </FormField>

            {staffToEdit && (
              <FormField
                label="Effective From Date (Rate change applies from this date onwards)"
                helpText="Past attendance before this date keeps previous rate"
              >
                <Input
                  type="date"
                  value={effectiveFromDate}
                  onChange={(e) => setEffectiveFromDate(e.target.value)}
                />
              </FormField>
            )}
          </div>

          {paymentType === 'piece' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <FormField label="Unit Name (e.g. sq ft, point, bag, trip, kg)">
                <Input
                  value={unitName}
                  onChange={(e) => setUnitName(e.target.value)}
                  placeholder="piece, point, sq ft..."
                />
              </FormField>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <FormField label="Overtime Rate (Optional)">
              <NumberInput
                value={overtimeRate}
                onChange={setOvertimeRate}
                prefix={currentOrg?.currency === 'INR' ? '₹' : '$'}
                placeholder="Optional"
              />
            </FormField>

            <FormField label="Standard Hours / Day">
              <Input
                type="number"
                value={hoursPerDay}
                onChange={(e) => setHoursPerDay(e.target.value)}
                placeholder="8"
                prefixNode={<Clock className="w-4 h-4" />}
              />
            </FormField>

            <FormField label={`Default Assigned ${siteLabel}`}>
              <Select
                value={defaultSiteId}
                onChange={(e) => setDefaultSiteId(e.target.value)}
                options={[
                  { value: '', label: 'None (Flexible)' },
                  ...sites.map((s) => ({ value: s.id, label: s.name })),
                ]}
              />
            </FormField>
          </div>

          {/* Weekly Off Days Selection */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[var(--text)]">Weekly Off Day(s)</label>
            <div className="flex gap-1.5">
              {WEEK_DAYS.map((day) => {
                const isSelected = weeklyOff.includes(day.val);
                return (
                  <button
                    key={day.val}
                    type="button"
                    onClick={() => toggleWeeklyOff(day.val)}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-semibold border transition cursor-pointer ${
                      isSelected
                        ? 'bg-[var(--accent)] text-[var(--accent-contrast)] border-[var(--accent)]'
                        : 'bg-[var(--surface)] text-[var(--text-muted)] border-[var(--border)] hover:text-[var(--text)]'
                    }`}
                  >
                    {day.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Joining Date, Status & Notes */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <FormField label="Joining Date">
            <Input
              type="date"
              value={joiningDate}
              onChange={(e) => setJoiningDate(e.target.value)}
              prefixNode={<Calendar className="w-4 h-4" />}
            />
          </FormField>

          <FormField label="Current Status">
            <Select
              value={status}
              onChange={(e) => setStatus(e.target.value as any)}
              options={[
                { value: 'active', label: 'Active (Currently Employed)' },
                { value: 'inactive', label: 'Inactive (Temporary Pause)' },
                { value: 'left', label: 'Left Employment' },
              ]}
            />
          </FormField>
        </div>

        {/* Address and Emergency Contact */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <FormField label="Address / Hometown">
            <Input
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="e.g. Village, District"
              prefixNode={<MapPin className="w-4 h-4" />}
            />
          </FormField>

          <FormField label="Emergency Contact (Name & Phone)">
            <Input
              value={emergencyContact}
              onChange={(e) => setEmergencyContact(e.target.value)}
              placeholder="e.g. Brother 9876543210"
              prefixNode={<Phone className="w-4 h-4" />}
            />
          </FormField>
        </div>

        {/* Privacy Note on UPI / Banking */}
        <div className="p-3 rounded-xl bg-[var(--surface-2)]/60 border border-[var(--border)] space-y-2">
          <FormField
            label="Payment Note / UPI ID (Optional)"
            helpText="Warning: Do not store debit/credit card numbers or full confidential bank passwords."
          >
            <Input
              value={paymentNote}
              onChange={(e) => setPaymentNote(e.target.value)}
              placeholder="e.g. UPI user@okhdfcbank or Bank Cash"
            />
          </FormField>
        </div>

        {/* Custom Fields (Dynamic from Template) */}
        {customFieldDefs.length > 0 && (
          <div className="p-3.5 rounded-xl bg-[var(--surface-2)]/40 border border-[var(--border)] space-y-3">
            <h4 className="text-xs font-semibold text-[var(--accent)] uppercase tracking-wider">
              Additional Custom Attributes
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {customFieldDefs.map((def) => {
                const val = customValues[def.id] ?? '';
                return (
                  <div key={def.id}>
                    <FormField label={def.label}>
                      {def.field_type === 'dropdown' ? (
                        <Select
                          value={val}
                          onChange={(e) =>
                            setCustomValues((prev) => ({ ...prev, [def.id]: e.target.value }))
                          }
                          options={[
                            { value: '', label: '-- Select --' },
                            ...(def.options || []).map((opt) => ({
                              value: opt,
                              label: opt,
                            })),
                          ]}
                        />
                      ) : def.field_type === 'boolean' ? (
                        <div className="pt-2">
                          <label className="flex items-center gap-2 cursor-pointer select-none text-xs">
                            <input
                              type="checkbox"
                              checked={!!val}
                              onChange={(e) =>
                                setCustomValues((prev) => ({ ...prev, [def.id]: e.target.checked }))
                              }
                              className="rounded border-[var(--border)] text-[var(--accent)] focus:ring-[var(--accent)]"
                            />
                            <span>{val ? 'Yes / Enabled' : 'No / Disabled'}</span>
                          </label>
                        </div>
                      ) : (
                        <Input
                          type={def.field_type === 'number' ? 'number' : def.field_type === 'date' ? 'date' : 'text'}
                          value={val}
                          onChange={(e) =>
                            setCustomValues((prev) => ({ ...prev, [def.id]: e.target.value }))
                          }
                          placeholder={`Enter ${def.label.toLowerCase()}...`}
                        />
                      )}
                    </FormField>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <FormField label="Internal Notes / Identification Note">
          <TextArea
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Add general notes, reference or qualifications..."
          />
        </FormField>

        {/* Action Buttons */}
        <div className="pt-3 border-t border-[var(--border)] flex items-center justify-end gap-2">
          <Button variant="secondary" type="button" onClick={handleSafeClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" isLoading={isLoading}>
            <Sparkles className="w-4 h-4" />
            <span>{staffToEdit ? 'Save Changes' : 'Add Staff Member'}</span>
          </Button>
        </div>
      </form>
    </Modal>
  );
};
