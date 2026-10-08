import React, { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { FormField } from '@/components/ui/FormField';
import { Input } from '@/components/ui/Input';
import { NumberInput } from '@/components/ui/NumberInput';
import { workTypeRepo } from '@/lib/db/repository';
import { LocalWorkType } from '@/lib/db/dexie';
import { useOrg } from '@/features/org/orgContext';
import { useToast } from '@/components/ui/Toast';
import { useI18n } from '@/lib/i18n/i18nContext';
import { Layers, Plus, Trash2, Edit2, Check } from 'lucide-react';

interface WorkTypesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpdated: () => void;
}

export const WorkTypesModal: React.FC<WorkTypesModalProps> = ({ isOpen, onClose, onUpdated }) => {
  const { currentOrg } = useOrg();
  const { formatCurrency } = useI18n();
  const { success, error } = useToast();

  const [types, setTypes] = useState<LocalWorkType[]>([]);
  const [name, setName] = useState('');
  const [unitName, setUnitName] = useState('piece');
  const [defaultRate, setDefaultRate] = useState<number | string>('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const loadTypes = async () => {
    if (!currentOrg) return;
    const list = await workTypeRepo.list(currentOrg.id, false);
    setTypes(list);
  };

  useEffect(() => {
    if (isOpen) {
      loadTypes();
      setName('');
      setUnitName('piece');
      setDefaultRate('');
      setEditingId(null);
    }
  }, [isOpen, currentOrg]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !currentOrg) return;

    setIsLoading(true);
    try {
      const rateNum = defaultRate ? Number(defaultRate) : null;

      if (editingId) {
        await workTypeRepo.update(editingId, {
          name: name.trim(),
          unit_name: unitName.trim() || null,
          default_rate: rateNum,
        });
        success('Work type updated');
      } else {
        await workTypeRepo.create({
          org_id: currentOrg.id,
          name: name.trim(),
          unit_name: unitName.trim() || null,
          default_rate: rateNum,
          custom: {},
        });
        success(`Work type "${name}" added`);
      }
      setName('');
      setUnitName('piece');
      setDefaultRate('');
      setEditingId(null);
      await loadTypes();
      onUpdated();
    } catch {
      error('Failed to save work type');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await workTypeRepo.softDelete(id);
      success('Work type moved to Trash');
      await loadTypes();
      onUpdated();
    } catch {
      error('Failed to delete work type');
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="md"
      title={
        <div className="flex items-center gap-2">
          <Layers className="w-5 h-5 text-[var(--accent)]" />
          <span>Manage Work Types &amp; Task Units</span>
        </div>
      }
    >
      <div className="space-y-4 text-left">
        <form onSubmit={handleSave} className="p-3.5 rounded-2xl bg-[var(--surface-2)]/60 border border-[var(--border)] space-y-3">
          <FormField label={editingId ? 'Edit Work Type Name' : 'New Work Type'} required>
            <Input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Brick Laying, Wiring Point, Tile Fitting, Harvesting"
            />
          </FormField>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <FormField label="Unit Name (e.g. sq ft, point, bag, kg)">
              <Input
                value={unitName}
                onChange={(e) => setUnitName(e.target.value)}
                placeholder="piece, sq ft..."
              />
            </FormField>

            <FormField label="Default Rate per Unit">
              <NumberInput
                value={defaultRate}
                onChange={setDefaultRate}
                placeholder="Optional"
              />
            </FormField>
          </div>

          <div className="flex justify-end gap-2">
            {editingId && (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => {
                  setEditingId(null);
                  setName('');
                  setDefaultRate('');
                }}
              >
                Cancel
              </Button>
            )}
            <Button type="submit" variant="primary" size="sm" isLoading={isLoading}>
              {editingId ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
              <span>{editingId ? 'Update Work Type' : 'Add Work Type'}</span>
            </Button>
          </div>
        </form>

        <div className="space-y-1.5 max-h-60 overflow-y-auto">
          {types.length === 0 ? (
            <p className="text-xs text-[var(--text-muted)] text-center py-4">
              No work types defined. Add tasks or piece rates above.
            </p>
          ) : (
            types.map((t) => (
              <div
                key={t.id}
                className="flex items-center justify-between p-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-xs"
              >
                <div>
                  <span className="font-bold text-sm text-[var(--text)] block">{t.name}</span>
                  <span className="text-[11px] text-[var(--text-muted)]">
                    Unit: {t.unit_name || 'piece'}
                    {t.default_rate ? ` • ${formatCurrency(t.default_rate)}/${t.unit_name || 'unit'}` : ''}
                  </span>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingId(t.id);
                      setName(t.name);
                      setUnitName(t.unit_name || 'piece');
                      setDefaultRate(t.default_rate ?? '');
                    }}
                    className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface-2)] transition"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(t.id)}
                    className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--expense)] hover:bg-[var(--surface-2)] transition"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </Modal>
  );
};
