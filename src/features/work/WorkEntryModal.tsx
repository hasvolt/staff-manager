import React, { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { FormField } from '@/components/ui/FormField';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { TextArea } from '@/components/ui/TextArea';
import { FileUpload } from '@/components/ui/FileUpload';
import { workRepo, staffRepo, siteRepo, workTypeRepo } from '@/lib/db/repository';
import { LocalStaff, LocalSite, LocalWorkType } from '@/lib/db/dexie';
import { useOrg } from '@/features/org/orgContext';
import { useToast } from '@/components/ui/Toast';
import { Briefcase, Clock, Calendar, CheckSquare, Plus } from 'lucide-react';

interface WorkEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
}

const WORK_SUGGESTIONS = [
  'Wall Plastering',
  'RCC Slab Casting',
  'Electrical Concealed Wiring',
  'Pipe Fitting & Plumbing',
  'Tile Fixing & Grouting',
  'Painting Primer & Putty',
  'Loading & Unloading Material',
  'Field Harvesting',
  'Vehicle Maintenance & Driving',
  'Shift Production Run',
];

export const WorkEntryModal: React.FC<WorkEntryModalProps> = ({ isOpen, onClose, onSaved }) => {
  const { currentOrg } = useOrg();
  const { success, error } = useToast();

  const [staffList, setStaffList] = useState<LocalStaff[]>([]);
  const [sites, setSites] = useState<LocalSite[]>([]);
  const [workTypes, setWorkTypes] = useState<LocalWorkType[]>([]);

  const [selectedStaffId, setSelectedStaffId] = useState('');
  const [multiStaffIds, setMultiStaffIds] = useState<Set<string>>(new Set());
  const [isMultiMode, setIsMultiMode] = useState(false);

  const [workDate, setWorkDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [siteId, setSiteId] = useState('');
  const [workTypeId, setWorkTypeId] = useState('');
  const [description, setDescription] = useState('');
  const [quantity, setQuantity] = useState<number | string>('');
  const [hours, setHours] = useState<number | string>('8');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [photoPath, setPhotoPath] = useState('');
  const [note, setNote] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen && currentOrg) {
      staffRepo.list(currentOrg.id, false).then((res) => {
        const active = res.filter((s) => s.status === 'active');
        setStaffList(active);
        if (active.length > 0 && !selectedStaffId) {
          setSelectedStaffId(active[0].id);
        }
      });
      siteRepo.list(currentOrg.id, false).then(setSites);
      workTypeRepo.list(currentOrg.id, false).then(setWorkTypes);
    }
  }, [isOpen, currentOrg]);

  const toggleMultiStaff = (id: string) => {
    setMultiStaffIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentOrg) return;

    const targets = isMultiMode
      ? Array.from(multiStaffIds)
      : selectedStaffId
      ? [selectedStaffId]
      : [];

    if (targets.length === 0) {
      error('Please select at least one staff member.');
      return;
    }

    setIsLoading(true);
    try {
      const qNum = quantity ? Number(quantity) : null;
      const hNum = hours ? Number(hours) : 8;

      for (const stId of targets) {
        await workRepo.create({
          org_id: currentOrg.id,
          staff_id: stId,
          work_date: workDate,
          site_id: siteId || null,
          work_type_id: workTypeId || null,
          description: description.trim() || null,
          quantity: qNum,
          hours: hNum,
          start_time: startTime || null,
          end_time: endTime || null,
          photo_path: photoPath || null,
          note: note.trim() || null,
          custom: {},
        });
      }

      success(`Logged daily work for ${targets.length} staff member${targets.length > 1 ? 's' : ''}`);
      onSaved();
      onClose();
    } catch {
      error('Failed to log work entry');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="md"
      title={
        <div className="flex items-center gap-2">
          <Briefcase className="w-5 h-5 text-[var(--accent)]" />
          <span>Daily Work Entry</span>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-left">
        {/* Multi-staff quick mode toggle */}
        <div className="flex items-center justify-between p-2 rounded-xl bg-[var(--surface-2)] text-xs">
          <span className="font-semibold text-[var(--text)]">Apply to multiple staff at once?</span>
          <button
            type="button"
            onClick={() => setIsMultiMode(!isMultiMode)}
            className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer ${
              isMultiMode
                ? 'bg-[var(--accent)] text-[var(--accent-contrast)]'
                : 'bg-[var(--surface)] text-[var(--text-muted)] border border-[var(--border)]'
            }`}
          >
            {isMultiMode ? 'Multi-Mode ON' : 'Single Staff'}
          </button>
        </div>

        {/* Staff Selection */}
        {isMultiMode ? (
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[var(--text)]">
              Select Staff ({multiStaffIds.size} selected)
            </label>
            <div className="max-h-36 overflow-y-auto space-y-1 border border-[var(--border)] rounded-xl p-2 bg-[var(--surface-2)]/40">
              {staffList.map((s) => {
                const isSelected = multiStaffIds.has(s.id);
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => toggleMultiStaff(s.id)}
                    className={`w-full flex items-center justify-between p-2 rounded-lg text-xs transition cursor-pointer ${
                      isSelected
                        ? 'bg-[var(--accent)] text-[var(--accent-contrast)] font-bold'
                        : 'bg-[var(--surface)] text-[var(--text)] hover:bg-[var(--surface-2)]'
                    }`}
                  >
                    <span>{s.name} ({s.role_title || 'Worker'})</span>
                    {isSelected && <CheckSquare className="w-3.5 h-3.5" />}
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          <FormField label="Staff Member" required>
            <Select
              required
              value={selectedStaffId}
              onChange={(e) => setSelectedStaffId(e.target.value)}
              options={staffList.map((s) => ({ value: s.id, label: `${s.name} (${s.role_title || 'Worker'})` }))}
            />
          </FormField>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <FormField label="Date" required>
            <Input
              type="date"
              value={workDate}
              onChange={(e) => setWorkDate(e.target.value)}
            />
          </FormField>

          <FormField label="Site / Project / Shop">
            <Select
              value={siteId}
              onChange={(e) => setSiteId(e.target.value)}
              options={[
                { value: '', label: 'General / No Site' },
                ...sites.map((s) => ({ value: s.id, label: s.name })),
              ]}
            />
          </FormField>
        </div>

        {/* Work Description with Suggestions */}
        <div className="space-y-1.5">
          <FormField label="Task / Work Description">
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Completed room plastering & electrical points"
            />
          </FormField>
          <div className="flex flex-wrap gap-1.5 pt-1">
            {WORK_SUGGESTIONS.slice(0, 5).map((sug) => (
              <button
                key={sug}
                type="button"
                onClick={() => setDescription(sug)}
                className="text-[10px] px-2 py-0.5 rounded-md border border-[var(--border)] bg-[var(--surface-2)] text-[var(--text-muted)] hover:text-[var(--text)] cursor-pointer"
              >
                {sug}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <FormField label="Work Type">
            <Select
              value={workTypeId}
              onChange={(e) => setWorkTypeId(e.target.value)}
              options={[
                { value: '', label: 'Standard' },
                ...workTypes.map((w) => ({ value: w.id, label: w.name })),
              ]}
            />
          </FormField>

          <FormField label="Quantity (Piece Workers)">
            <Input
              type="number"
              step="any"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder="e.g. 50"
            />
          </FormField>

          <FormField label="Hours Worked">
            <Input
              type="number"
              step="any"
              value={hours}
              onChange={(e) => setHours(e.target.value)}
              placeholder="8"
            />
          </FormField>
        </div>

        {/* Photo attachment */}
        <FileUpload
          label="Attach Work Photo (Optional)"
          value={photoPath}
          onChange={setPhotoPath}
        />

        <FormField label="Notes">
          <TextArea
            rows={2}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Material used, measurements, remarks..."
          />
        </FormField>

        <div className="pt-2 flex justify-end gap-2 border-t border-[var(--border)]">
          <Button variant="secondary" type="button" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" isLoading={isLoading}>
            <Plus className="w-4 h-4" />
            <span>Save Work Record</span>
          </Button>
        </div>
      </form>
    </Modal>
  );
};
