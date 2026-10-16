import React, { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { useAuth } from './authContext';
import { useOrg } from '@/features/org/orgContext';
import { useToast } from '@/components/ui/Toast';
import {
  getSavedAccounts,
  removeSavedAccount,
  SavedAccount,
  saveCurrentAccount,
  getPrimaryEmail,
  setPrimaryEmail,
} from './accountManager';
import {
  Users,
  UserCheck,
  UserPlus,
  Building,
  LogOut,
  ArrowRight,
  Trash2,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Sparkles,
} from 'lucide-react';

interface AccountSwitcherModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenAuth: (prefilledEmail?: string) => void;
  onOpenProfile: () => void;
  onOpenCreateBusiness: () => void;
}

export const AccountSwitcherModal: React.FC<AccountSwitcherModalProps> = ({
  isOpen,
  onClose,
  onOpenAuth,
  onOpenProfile,
  onOpenCreateBusiness,
}) => {
  const { user, profile, signOut, isLocalMode } = useAuth();
  const { currentOrg, organizations, switchBusiness, role, returnToMainBusiness } = useOrg();
  const { success, info } = useToast();

  const [savedAccounts, setSavedAccounts] = useState<SavedAccount[]>([]);

  useEffect(() => {
    if (isOpen) {
      if (user) {
        saveCurrentAccount(user, profile, currentOrg?.name, role, currentOrg?.id);
      }
      setSavedAccounts(getSavedAccounts());
    }
  }, [isOpen, user, profile, currentOrg?.name, role, currentOrg?.id]);

  const handleSwitchToAccount = async (targetEmail: string) => {
    onClose();
    if (user?.email?.toLowerCase() === targetEmail.toLowerCase()) {
      await returnToMainBusiness();
      success('Switched back to your main business!');
      return;
    }
    // Sign out current and open auth modal with target email
    await signOut();
    onOpenAuth(targetEmail);
  };

  const handleAddNewAccount = async () => {
    onClose();
    if (user) {
      await signOut();
    }
    onOpenAuth();
  };

  const handleRemoveSaved = (e: React.MouseEvent, email: string) => {
    e.stopPropagation();
    removeSavedAccount(email);
    setSavedAccounts(getSavedAccounts());
    success('Account removed from saved list');
  };

  const otherAccounts = savedAccounts.filter(
    (acc) => !user?.email || acc.email.toLowerCase() !== user.email.toLowerCase()
  );

  const primaryEmail = getPrimaryEmail();
  const isCurrentlyPrimary = user?.email && primaryEmail && user.email.toLowerCase() === primaryEmail.toLowerCase();

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Switch Account / प्रोफाइल बदलें" maxWidth="lg">
      <div className="space-y-4 text-left">
        {/* Helper Banner */}
        <div className="p-3 rounded-2xl bg-[var(--surface-2)]/60 border border-[var(--border)] flex items-start gap-3">
          <div className="w-8 h-8 rounded-xl bg-[var(--accent)]/15 text-[var(--accent)] flex items-center justify-center shrink-0 mt-0.5">
            <Users className="w-4 h-4" />
          </div>
          <div className="text-xs">
            <p className="font-semibold text-[var(--text)]">Multi-Account & Workspace Manager</p>
            <p className="text-[11px] text-[var(--text-muted)] mt-0.5 leading-relaxed">
              Easily switch between different accounts on this device, or switch business workspaces without losing offline data.
            </p>
          </div>
        </div>

        {/* Quick Return to Main Account Banner */}
        {!isCurrentlyPrimary && primaryEmail && (
          <div className="p-3 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-700 text-white flex items-center justify-between gap-3 shadow-md">
            <div className="flex items-center gap-2.5 min-w-0">
              <Sparkles className="w-5 h-5 text-amber-300 shrink-0 animate-pulse" />
              <div className="min-w-0 text-left">
                <p className="text-xs font-bold truncate">Return to Your Main Account</p>
                <p className="text-[11px] text-emerald-100 truncate">
                  मुख्य खाता: {primaryEmail}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => handleSwitchToAccount(primaryEmail)}
              className="px-3 py-1.5 rounded-xl bg-white text-emerald-800 hover:bg-emerald-50 text-xs font-bold transition shadow-xs cursor-pointer active:scale-95 shrink-0"
            >
              Switch Back (वापस जाएं)
            </button>
          </div>
        )}

        {/* Current Active Account Section */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
              Current Active Account / सक्रिय खाता
            </span>
            <div className="flex items-center gap-1.5">
              {isCurrentlyPrimary && (
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                  Main Account (मुख्य खाता)
                </span>
              )}
              <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Active Now
              </span>
            </div>
          </div>

          {user ? (
            <div className="p-3.5 rounded-2xl bg-[var(--surface-2)] border border-[var(--border)] shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-2xl bg-[var(--accent)] text-[var(--accent-contrast)] flex items-center justify-center text-base font-bold shadow-xs shrink-0">
                  {profile?.full_name?.charAt(0).toUpperCase() ||
                    user.email?.charAt(0).toUpperCase() || (
                      <UserCheck className="w-5 h-5" />
                    )}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-bold text-sm text-[var(--text)] truncate">
                      {profile?.full_name || user.user_metadata?.full_name || 'My Account'}
                    </p>
                    <span className="text-[10px] font-semibold bg-[var(--surface)] text-[var(--accent)] border border-[var(--border)] px-2 py-0.5 rounded-md capitalize">
                      {role || 'Owner'}
                    </span>
                  </div>
                  <p className="text-xs text-[var(--text-muted)] truncate">{user.email}</p>
                  {currentOrg && (
                    <div className="flex items-center gap-1.5 text-[11px] text-[var(--accent)] font-medium mt-0.5">
                      <Building className="w-3 h-3 shrink-0" />
                      <span className="truncate">{currentOrg.name}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    onClose();
                    onOpenProfile();
                  }}
                  className="text-xs"
                >
                  Edit Profile
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={async () => {
                    onClose();
                    await signOut();
                    success('Signed out');
                  }}
                  className="text-xs text-[var(--expense)] hover:bg-[var(--expense)]/10"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sign Out</span>
                </Button>
              </div>
            </div>
          ) : (
            <div className="p-4 rounded-2xl bg-[var(--surface-2)] border border-[var(--border)] text-center space-y-2">
              <p className="text-xs text-[var(--text)] font-semibold">
                You are currently in Local Guest Mode (No Account Linked)
              </p>
              <p className="text-[11px] text-[var(--text-muted)]">
                Data is securely saved on this device. Sign in or register to sync across multiple phones.
              </p>
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={() => {
                  onClose();
                  onOpenAuth();
                }}
                className="mt-1"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>Sign In / Create Account</span>
              </Button>
            </div>
          )}
        </div>

        {/* Other Saved Accounts on this Device */}
        {otherAccounts.length > 0 && (
          <div className="space-y-2 pt-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
              Other Accounts on this Device / सहेजे गए खाते ({otherAccounts.length})
            </span>
            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {otherAccounts.map((acc) => (
                <div
                  key={acc.email}
                  onClick={() => handleSwitchToAccount(acc.email)}
                  className="group p-3 rounded-2xl bg-[var(--surface-2)]/50 hover:bg-[var(--surface-2)] border border-[var(--border)] hover:border-[var(--accent)]/50 transition-all duration-150 flex items-center justify-between gap-3 cursor-pointer"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-[var(--surface)] text-[var(--text)] border border-[var(--border)] flex items-center justify-center font-bold text-xs shrink-0 group-hover:border-[var(--accent)]">
                      {acc.avatarLetter}
                    </div>
                    <div className="min-w-0 text-left">
                      <div className="flex items-center gap-1.5">
                        <p className="text-xs font-semibold text-[var(--text)] truncate">{acc.fullName}</p>
                        {acc.isPrimary && (
                          <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shrink-0">
                            Main Account (मुख्य खाता)
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-[var(--text-muted)] truncate">{acc.email}</p>
                      {acc.orgName && (
                        <p className="text-[10px] text-[var(--accent)] truncate">
                          {acc.orgName} • {acc.role || 'Member'}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="text-xs font-semibold text-[var(--accent)] flex items-center gap-1 px-2.5 py-1 rounded-xl bg-[var(--accent)]/10 group-hover:bg-[var(--accent)] group-hover:text-[var(--accent-contrast)] transition">
                      <span>Switch</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </span>
                    <button
                      type="button"
                      onClick={(e) => handleRemoveSaved(e, acc.email)}
                      title="Remove from device list"
                      className="w-7 h-7 rounded-lg text-[var(--text-muted)] hover:text-[var(--expense)] hover:bg-[var(--expense)]/10 flex items-center justify-center transition cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Business Workspace Switcher (In-Account Switching) */}
        {organizations && organizations.length > 0 && (
          <div className="space-y-2 pt-2 border-t border-[var(--border)]">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                Business Workspaces / व्यापार चुनें ({organizations.length})
              </span>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenCreateBusiness();
                }}
                className="text-[11px] font-semibold text-[var(--accent)] hover:underline flex items-center gap-1 cursor-pointer"
              >
                <span>+ New Business</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-40 overflow-y-auto pr-1">
              {organizations.map((org) => {
                const isCurrent = org.id === currentOrg?.id;
                return (
                  <button
                    key={org.id}
                    type="button"
                    onClick={async () => {
                      if (!isCurrent) {
                        await switchBusiness(org.id);
                        success(`Switched to "${org.name}"`);
                      }
                      onClose();
                    }}
                    className={`p-2.5 rounded-xl border text-left transition flex items-center justify-between gap-2 cursor-pointer ${
                      isCurrent
                        ? 'border-[var(--accent)] bg-[var(--surface-2)] ring-1.5 ring-[var(--accent)]'
                        : 'border-[var(--border)] bg-[var(--surface-2)]/40 hover:bg-[var(--surface-2)]'
                    }`}
                  >
                    <div className="min-w-0 flex items-center gap-2">
                      <Building className={`w-3.5 h-3.5 shrink-0 ${isCurrent ? 'text-[var(--accent)]' : 'text-[var(--text-muted)]'}`} />
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-[var(--text)] truncate">{org.name}</p>
                        <p className="text-[10px] text-[var(--text-muted)] capitalize">
                          {org.settings?.terminology_preset || 'general'}
                        </p>
                      </div>
                    </div>
                    {isCurrent ? (
                      <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
                    ) : (
                      <span className="text-[10px] text-[var(--accent)] font-semibold opacity-0 hover:opacity-100">
                        Select
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Bottom Actions */}
        <div className="pt-2 border-t border-[var(--border)] flex flex-col sm:flex-row items-center justify-between gap-2.5">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleAddNewAccount}
            className="w-full sm:w-auto flex items-center justify-center gap-2 text-xs"
          >
            <UserPlus className="w-3.5 h-3.5 text-[var(--accent)]" />
            <span>Sign In to Another Account (दूसरा खाता)</span>
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="w-full sm:w-auto text-xs"
          >
            Close
          </Button>
        </div>
      </div>
    </Modal>
  );
};
