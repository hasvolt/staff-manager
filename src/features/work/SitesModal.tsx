import React, { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { FormField } from '@/components/ui/FormField';
import { Input } from '@/components/ui/Input';
import { siteRepo } from '@/lib/db/repository';
import { LocalSite } from '@/lib/db/dexie';
import { useOrg } from '@/features/org/orgContext';
import { useToast } from '@/components/ui/Toast';
import { MapPin, Plus, Trash2, Edit2, Check } from 'lucide-react';

interface SitesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpdated: () => void;
}

export const SitesModal: React.FC<SitesModalProps> = ({ isOpen, onClose, onUpdated }) => {
  const { currentOrg } = useOrg();
  const { success, error } = useToast();

  const [sites, setSites] = useState<LocalSite[]>([]);
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [editingSiteId, setEditingSiteId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const loadSites = async () => {
    if (!currentOrg) return;
    const list = await siteRepo.list(currentOrg.id, false);
    setSites(list);
  };

  useEffect(() => {
    if (isOpen) {
      loadSites();
      setName('');
      setAddress('');
      setEditingSiteId(null);
    }
  }, [isOpen, currentOrg]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !currentOrg) return;

    setIsLoading(true);
    try {
      if (editingSiteId) {
        await siteRepo.update(editingSiteId, {
          name: name.trim(),
          address: address.trim() || null,
        });
        success('Site updated successfully');
      } else {
        await siteRepo.create({
          org_id: currentOrg.id,
          name: name.trim(),
          address: address.trim() || null,
          status: 'active',
          custom: {},
        });
        success(`Site "${name}" created`);
      }
      setName('');
      setAddress('');
      setEditingSiteId(null);
      await loadSites();
      onUpdated();
    } catch {
      error('Failed to save site');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await siteRepo.softDelete(id);
      success('Site moved to Trash');
      await loadSites();
      onUpdated();
    } catch {
      error('Failed to delete site');
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="md"
      title={
        <div className="flex items-center gap-2">
          <MapPin className="w-5 h-5 text-[var(--accent)]" />
          <span>Manage Sites / Projects / Shops</span>
        </div>
      }
    >
      <div className="space-y-4 text-left">
        {/* Add or edit site form */}
        <form onSubmit={handleSave} className="p-3.5 rounded-2xl bg-[var(--surface-2)]/60 border border-[var(--border)] space-y-3">
          <FormField label={editingSiteId ? 'Edit Site Name' : 'New Site Name'} required>
            <Input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Metro Station Site, City Mall Shop, Farm 2"
            />
          </FormField>

          <FormField label="Address / Location (Optional)">
            <Input
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="e.g. Sector 12, Main Road"
            />
          </FormField>

          <div className="flex justify-end gap-2">
            {editingSiteId && (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => {
                  setEditingSiteId(null);
                  setName('');
                  setAddress('');
                }}
              >
                Cancel
              </Button>
            )}
            <Button type="submit" variant="primary" size="sm" isLoading={isLoading}>
              {editingSiteId ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
              <span>{editingSiteId ? 'Update Site' : 'Add Site'}</span>
            </Button>
          </div>
        </form>

        {/* Existing sites list */}
        <div className="space-y-1.5 max-h-60 overflow-y-auto">
          {sites.length === 0 ? (
            <p className="text-xs text-[var(--text-muted)] text-center py-4">
              No sites added yet. Add one above.
            </p>
          ) : (
            sites.map((s) => (
              <div
                key={s.id}
                className="flex items-center justify-between p-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-xs"
              >
                <div className="min-w-0">
                  <span className="font-bold text-sm text-[var(--text)] block truncate">
                    {s.name}
                  </span>
                  {s.address && (
                    <span className="text-[11px] text-[var(--text-muted)] block truncate">
                      {s.address}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingSiteId(s.id);
                      setName(s.name);
                      setAddress(s.address || '');
                    }}
                    className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface-2)] transition"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(s.id)}
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
