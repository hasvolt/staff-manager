import React, { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { FormField } from '@/components/ui/FormField';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { customFieldRepo } from '@/lib/db/repository';
import { LocalCustomFieldDef } from '@/lib/db/dexie';
import { useOrg } from '@/features/org/orgContext';
import { useToast } from '@/components/ui/Toast';
import { Sliders, Plus, Trash2, Edit2, Check, Tag } from 'lucide-react';

interface CustomFieldsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpdated: () => void;
}

export const CustomFieldsModal: React.FC<CustomFieldsModalProps> = ({
  isOpen,
  onClose,
  onUpdated,
}) => {
  const { currentOrg, role } = useOrg();
  const { success, error } = useToast();

  const [fieldDefs, setFieldDefs] = useState<LocalCustomFieldDef[]>([]);
  const [label, setLabel] = useState('');
  const [fieldType, setFieldType] = useState<'text' | 'number' | 'date' | 'dropdown' | 'boolean'>('text');
  const [dropdownOptionsStr, setDropdownOptionsStr] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const loadFields = async () => {
    if (!currentOrg) return;
    const all = await customFieldRepo.list(currentOrg.id, false);
    setFieldDefs(all.filter((f) => f.entity === 'staff'));
  };

  useEffect(() => {
    if (isOpen) {
      loadFields();
      setLabel('');
      setFieldType('text');
      setDropdownOptionsStr('');
      setEditingId(null);
    }
  }, [isOpen, currentOrg]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!label.trim() || !currentOrg) return;

    setIsLoading(true);
    try {
      const options =
        fieldType === 'dropdown'
          ? dropdownOptionsStr
              .split(',')
              .map((s) => s.trim())
              .filter(Boolean)
          : [];

      if (editingId) {
        await customFieldRepo.update(editingId, {
          label: label.trim(),
          field_type: fieldType,
          options,
        });
        success(`Renamed custom field to "${label}"`);
      } else {
        await customFieldRepo.create({
          org_id: currentOrg.id,
          entity: 'staff',
          label: label.trim(),
          field_type: fieldType,
          options,
          sort_order: fieldDefs.length,
        });
        success(`Added custom field "${label}"`);
      }

      setLabel('');
      setFieldType('text');
      setDropdownOptionsStr('');
      setEditingId(null);
      await loadFields();
      onUpdated();
    } catch {
      error('Failed to save custom field');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string, fieldLabel: string) => {
    try {
      await customFieldRepo.softDelete(id);
      success(`Moved "${fieldLabel}" to Trash`);
      await loadFields();
      onUpdated();
    } catch {
      error('Failed to remove custom field');
    }
  };

  const isOwnerOrManager = role === 'owner' || role === 'manager';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="md"
      title={
        <div className="flex items-center gap-2">
          <Sliders className="w-5 h-5 text-[var(--accent)]" />
          <span>Staff Custom Fields Template</span>
        </div>
      }
    >
      <div className="space-y-4 text-left">
        <p className="text-xs text-[var(--text-muted)]">
          Define reusable custom attributes (e.g. Uniform Size, Blood Group, Trade Certificate, Skill Level)
          that apply to all staff members across this business.
        </p>

        {/* Existing Defined Fields */}
        <div className="space-y-2">
          <h4 className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">
            Configured Fields ({fieldDefs.length})
          </h4>

          {fieldDefs.length === 0 ? (
            <div className="p-4 rounded-xl border border-dashed border-[var(--border)] text-center text-xs text-[var(--text-muted)]">
              No custom fields configured yet. Add your first field below.
            </div>
          ) : (
            <div className="space-y-2 max-h-56 overflow-y-auto">
              {fieldDefs.map((def) => (
                <div
                  key={def.id}
                  className="p-3 rounded-xl border border-[var(--border)] bg-[var(--surface-2)]/40 flex items-center justify-between gap-3 text-xs"
                >
                  <div className="min-w-0">
                    <span className="font-semibold text-[var(--text)] block truncate">
                      {def.label}
                    </span>
                    <span className="text-[11px] text-[var(--text-muted)] block capitalize">
                      Type: {def.field_type}{' '}
                      {def.options && def.options.length > 0 && `(${def.options.join(', ')})`}
                    </span>
                  </div>

                  {isOwnerOrManager && (
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingId(def.id);
                          setLabel(def.label);
                          setFieldType(def.field_type);
                          setDropdownOptionsStr((def.options || []).join(', '));
                        }}
                        className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--accent)] hover:bg-[var(--surface-2)] transition cursor-pointer"
                        title="Edit Field Label"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDelete(def.id, def.label)}
                        className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--expense)] hover:bg-[var(--surface-2)] transition cursor-pointer"
                        title="Delete Field"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Add / Edit Form */}
        {isOwnerOrManager && (
          <form
            onSubmit={handleSave}
            className="p-3.5 rounded-2xl border border-[var(--border)] bg-[var(--surface)] space-y-3 pt-3"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[var(--text)] flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-[var(--accent)]" />
                <span>{editingId ? 'Edit Field Template' : 'Add New Field Template'}</span>
              </span>
              {editingId && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingId(null);
                    setLabel('');
                    setFieldType('text');
                    setDropdownOptionsStr('');
                  }}
                  className="text-[11px] text-[var(--accent)] hover:underline"
                >
                  Cancel Edit
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <FormField label="Field Label" required>
                <Input
                  required
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  placeholder="e.g. Uniform Size / License No"
                />
              </FormField>

              <FormField label="Field Type">
                <Select
                  value={fieldType}
                  onChange={(e) => setFieldType(e.target.value as any)}
                  options={[
                    { value: 'text', label: 'Text (Single Line)' },
                    { value: 'number', label: 'Number' },
                    { value: 'date', label: 'Date' },
                    { value: 'dropdown', label: 'Dropdown (Options)' },
                    { value: 'boolean', label: 'Yes / No (Checkbox)' },
                  ]}
                />
              </FormField>
            </div>

            {fieldType === 'dropdown' && (
              <FormField label="Dropdown Options (comma-separated)">
                <Input
                  value={dropdownOptionsStr}
                  onChange={(e) => setDropdownOptionsStr(e.target.value)}
                  placeholder="Small, Medium, Large, XL"
                />
              </FormField>
            )}

            <div className="flex justify-end pt-1">
              <Button type="submit" variant="primary" size="sm" isLoading={isLoading}>
                {editingId ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Update Field</span>
                  </>
                ) : (
                  <>
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Field</span>
                  </>
                )}
              </Button>
            </div>
          </form>
        )}
      </div>
    </Modal>
  );
};
