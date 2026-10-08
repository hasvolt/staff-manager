import React, { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { FormField } from '@/components/ui/FormField';
import { Input } from '@/components/ui/Input';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useAuth } from './authContext';
import { useOrg } from '@/features/org/orgContext';
import { useToast } from '@/components/ui/Toast';
import { localDb } from '@/lib/db/dexie';
import {
  User,
  Phone,
  Lock,
  LogOut,
  Trash2,
  Download,
  CloudUpload,
  ShieldAlert,
  Save,
} from 'lucide-react';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenAuth: () => void;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({
  isOpen,
  onClose,
  onOpenAuth,
}) => {
  const {
    user,
    isLocalMode,
    updateProfile,
    updatePassword,
    signOut,
    signOutAllDevices,
    deleteAccount,
  } = useAuth();
  const { upgradeLocalToCloud } = useOrg();
  const { success, error, info } = useToast();

  const [fullName, setFullName] = useState(user?.user_metadata?.full_name || '');
  const [phone, setPhone] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmStep, setDeleteConfirmStep] = useState(1);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    const res = await updateProfile(fullName, phone);
    setIsLoading(false);
    if (res.error) {
      error(res.error.message || 'Failed to update profile');
    } else {
      success('Profile details saved!');
    }
  };

  const handleUpdatePassword = async () => {
    if (newPassword.length < 8) {
      error('Password must be at least 8 characters long.');
      return;
    }
    setIsLoading(true);
    const res = await updatePassword(newPassword);
    setIsLoading(false);
    if (res.error) {
      error(res.error.message || 'Failed to update password');
    } else {
      success('Password updated successfully!');
      setNewPassword('');
    }
  };

  const handleExportData = async () => {
    try {
      const data = {
        exportedAt: new Date().toISOString(),
        organizations: await localDb.organizations.toArray(),
        staff: await localDb.staff.toArray(),
        attendance: await localDb.attendance_entries.toArray(),
        payments: await localDb.payments.toArray(),
        sites: await localDb.sites.toArray(),
      };
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `staff_manager_backup_${Date.now()}.json`;
      a.click();
      success('Backup data downloaded successfully.');
    } catch {
      error('Failed to export data.');
    }
  };

  const handleUpgradeToCloud = async () => {
    if (!user) {
      onClose();
      onOpenAuth();
      return;
    }
    setIsLoading(true);
    const res = await upgradeLocalToCloud();
    setIsLoading(false);
    if (res.error) {
      error(res.error.message || 'Upgrade failed.');
    } else {
      success('Local data successfully migrated to Cloud!');
    }
  };

  const [statusMessage, setStatusMessage] = useState('');

  const handleDeleteAccountFinal = async () => {
    setIsLoading(true);
    setStatusMessage('Initiating account deletion...');
    const res = await deleteAccount((msg) => {
      setStatusMessage(msg);
    });
    setIsLoading(false);
    if (res.error) {
      error(res.error.message || 'Cannot delete account.');
      setStatusMessage('');
    } else {
      success('Your account and associated cloud data have been deleted.');
      setShowDeleteConfirm(false);
      onClose();
    }
  };

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        maxWidth="md"
        title={isLocalMode ? 'Account & Device Mode' : 'User Profile'}
      >
        <div className="space-y-5 text-left">
          {/* Guest / Local mode banner */}
          {isLocalMode && (
            <div className="p-4 rounded-2xl bg-[var(--surface-2)] border border-[var(--border)] space-y-2">
              <div className="flex items-center gap-2 text-[var(--accent)] font-semibold text-sm">
                <CloudUpload className="w-4 h-4" />
                <span>Running in Local Device Mode</span>
              </div>
              <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                Your data is stored privately on this device in IndexedDB. Create a free account to back up and sync across multiple phones and computers.
              </p>
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  onClose();
                  onOpenAuth();
                }}
              >
                Sign In or Create Account
              </Button>
            </div>
          )}

          {user && (
            <>
              {/* Profile Details Form */}
              <form onSubmit={handleSaveProfile} className="space-y-3">
                <FormField label="Email">
                  <Input disabled value={user.email || ''} />
                </FormField>

                <FormField label="Full Name">
                  <Input
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Your Name"
                    prefixNode={<User className="w-4 h-4" />}
                  />
                </FormField>

                <FormField label="Phone Number (Optional)">
                  <Input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+91 98765 43210"
                    prefixNode={<Phone className="w-4 h-4" />}
                  />
                </FormField>

                <Button type="submit" variant="secondary" size="sm" isLoading={isLoading}>
                  <Save className="w-4 h-4" />
                  <span>Save Profile</span>
                </Button>
              </form>

              {/* Password change */}
              <div className="p-4 rounded-2xl bg-[var(--surface-2)]/60 border border-[var(--border)] space-y-3">
                <h4 className="font-semibold text-xs text-[var(--text)] uppercase tracking-wider">
                  Change Password
                </h4>
                <div className="flex gap-2">
                  <Input
                    type="password"
                    placeholder="New password (min 8 chars)"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    prefixNode={<Lock className="w-4 h-4" />}
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleUpdatePassword}
                    disabled={!newPassword || isLoading}
                  >
                    Update
                  </Button>
                </div>
              </div>

              {/* Sign out options */}
              <div className="flex flex-wrap items-center gap-2 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    signOut();
                    onClose();
                  }}
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sign Out</span>
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    signOutAllDevices();
                    onClose();
                  }}
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sign Out All Devices</span>
                </Button>
              </div>
            </>
          )}

          {/* Backup & Data Export (Always accessible) */}
          <div className="p-4 rounded-2xl bg-[var(--surface-2)]/60 border border-[var(--border)] flex items-center justify-between">
            <div>
              <h4 className="font-semibold text-xs text-[var(--text)]">Backup / Export All Data</h4>
              <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
                Download a complete JSON snapshot of all your business records.
              </p>
            </div>
            <Button variant="secondary" size="sm" onClick={handleExportData}>
              <Download className="w-4 h-4" />
              <span>Export</span>
            </Button>
          </div>

          {/* Delete Account (Danger Zone) */}
          {user && (
            <div className="pt-3 border-t border-[var(--border)]">
              <button
                type="button"
                onClick={() => {
                  setDeleteConfirmStep(1);
                  setShowDeleteConfirm(true);
                }}
                className="text-xs text-[var(--expense)] hover:underline flex items-center gap-1.5 cursor-pointer font-medium"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Account &amp; Associated Cloud Data</span>
              </button>
            </div>
          )}
        </div>
      </Modal>

      {/* Account Deletion Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        title={deleteConfirmStep === 1 ? 'Export Data Before Deletion?' : 'Confirm Permanent Deletion'}
        message={
          deleteConfirmStep === 1
            ? 'We strongly recommend downloading a complete data backup before proceeding. Once deleted, cloud data cannot be recovered.'
            : 'Are you absolutely sure? If you are the owner of a business with members, you must transfer ownership first.'
        }
        confirmLabel={deleteConfirmStep === 1 ? 'I have backed up, continue' : 'Delete My Account'}
        cancelLabel="Cancel"
        variant="danger"
        isLoading={isLoading}
        onConfirm={() => {
          if (deleteConfirmStep === 1) {
            setDeleteConfirmStep(2);
          } else {
            handleDeleteAccountFinal();
          }
        }}
      />
    </>
  );
};
