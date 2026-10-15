import React, { useState, useRef, useEffect } from 'react';
import { useOrg } from './orgContext';
import { useAuth } from '@/features/auth/authContext';
import { useToast } from '@/components/ui/Toast';
import {
  Building2,
  ChevronDown,
  Plus,
  KeyRound,
  Check,
  Users,
  LogOut,
  ArrowLeftRight,
  User,
  Sparkles,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';

interface BusinessSwitcherProps {
  onCreateNew: () => void;
  onJoinInvite: () => void;
  onOpenMembers?: () => void;
  onOpenAccountSwitcher?: () => void;
}

const ROLE_BADGES: Record<string, { label: string; bg: string; text: string }> = {
  owner: { label: 'Owner', bg: 'bg-emerald-500/15', text: 'text-emerald-400' },
  manager: { label: 'Manager', bg: 'bg-blue-500/15', text: 'text-blue-400' },
  supervisor: { label: 'Supervisor', bg: 'bg-purple-500/15', text: 'text-purple-400' },
  accountant: { label: 'Accountant', bg: 'bg-amber-500/15', text: 'text-amber-400' },
  viewer: { label: 'Viewer', bg: 'bg-slate-500/15', text: 'text-slate-400' },
};

export const BusinessSwitcher: React.FC<BusinessSwitcherProps> = ({
  onCreateNew,
  onJoinInvite,
  onOpenMembers,
  onOpenAccountSwitcher,
}) => {
  const {
    currentOrg,
    organizations,
    switchBusiness,
    leaveBusiness,
    orgRoles,
    role,
    primaryOrgId,
    isViewingInvitedOrg,
    returnToMainBusiness,
  } = useOrg();
  const { user } = useAuth();
  const { success, error } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLeave = async (e: React.MouseEvent, orgId: string, orgName: string) => {
    e.stopPropagation();
    if (
      !window.confirm(
        `Are you sure you want to leave "${orgName}"? You can rejoin anytime with a valid invite code.`
      )
    ) {
      return;
    }
    const res = await leaveBusiness(orgId);
    if (res.error) {
      error(res.error.message || 'Could not leave business');
    } else {
      success(`Left "${orgName}" successfully.`);
    }
  };

  // If no org exists yet, provide an interactive fallback button
  if (!currentOrg) {
    return (
      <button
        type="button"
        onClick={onCreateNew}
        className="flex items-center gap-1.5 py-1.5 px-2.5 rounded-xl border border-dashed border-[var(--border)] bg-[var(--surface-2)] text-[var(--text-muted)] hover:text-[var(--text)] text-xs font-semibold cursor-pointer shrink-0"
      >
        <Building2 className="w-3.5 h-3.5 text-[var(--accent)] shrink-0" />
        <span className="truncate">Create Business</span>
      </button>
    );
  }

  const activeRoleBadge = ROLE_BADGES[role] || {
    label: role,
    bg: 'bg-[var(--surface)]',
    text: 'text-[var(--text-muted)]',
  };

  // Group into owned (main) businesses and joined businesses
  const ownedOrgs = organizations.filter(
    (o) =>
      o.id === primaryOrgId ||
      orgRoles[o.id] === 'owner' ||
      o.owner_id === (user?.id || 'local_user')
  );
  const joinedOrgs = organizations.filter((o) => !ownedOrgs.some((owned) => owned.id === o.id));

  return (
    <div className="relative min-w-0" ref={dropdownRef}>
      {/* Trigger Button in Header */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        className="flex items-center gap-1.5 sm:gap-2 h-8.5 sm:h-9 px-2 sm:px-2.5 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] text-[var(--text)] hover:bg-[var(--surface)] transition text-xs font-semibold max-w-[110px] min-[360px]:max-w-[130px] min-[400px]:max-w-[160px] sm:max-w-[240px] cursor-pointer shrink-0 select-none"
        title={`Workspace: ${currentOrg.name} (${role})`}
      >
        <Building2 className="w-3.5 h-3.5 text-[var(--accent)] shrink-0" />
        <span className="truncate text-left">{currentOrg.name}</span>
        {isViewingInvitedOrg ? (
          <span className="hidden sm:inline-block px-1 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/30 shrink-0">
            Invited
          </span>
        ) : (
          <span
            className={`hidden sm:inline-block px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${activeRoleBadge.bg} ${activeRoleBadge.text} shrink-0`}
          >
            {activeRoleBadge.label}
          </span>
        )}
        <ChevronDown
          className={`w-3 h-3 text-[var(--text-muted)] shrink-0 ml-0.5 transition-transform duration-150 ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {/* Backdrop for mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-2xs sm:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Dropdown Menu (Centered on mobile, aligned to trigger on sm+) */}
      {isOpen && (
        <div className="fixed sm:absolute left-2 right-2 sm:left-0 sm:right-auto top-15 sm:top-full mt-1.5 sm:mt-2 sm:w-80 max-w-[calc(100vw-16px)] rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-2xl z-50 p-2.5 sm:p-3 animate-in fade-in slide-in-from-top-1 text-left">
          {/* Active Account Banner */}
          <div className="p-2 mb-2 rounded-xl bg-[var(--surface-2)]/80 border border-[var(--border)] flex items-center justify-between gap-2">
            <div className="min-w-0 flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-[var(--accent)] text-[var(--accent-contrast)] flex items-center justify-center text-xs font-bold shrink-0">
                {user?.email?.charAt(0).toUpperCase() || <User className="w-3.5 h-3.5" />}
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-bold text-[var(--text)] truncate">
                  {user?.email || 'Guest / Local Device'}
                </p>
                <p className="text-[10px] text-[var(--text-muted)] truncate capitalize">
                  {user ? `Role: ${role}` : 'Local Offline Mode'}
                </p>
              </div>
            </div>
            {onOpenAccountSwitcher && (
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  onOpenAccountSwitcher();
                }}
                className="px-2 py-1 rounded-lg bg-[var(--surface)] text-[var(--accent)] hover:bg-[var(--border)] text-[11px] font-semibold flex items-center gap-1 shrink-0 border border-[var(--border)] cursor-pointer transition active:scale-95"
                title="Switch Account / प्रोफाइल बदलें"
              >
                <ArrowLeftRight className="w-3 h-3" />
                <span>Switch</span>
              </button>
            )}
          </div>

          {/* Quick Return to Main Business button (Fixes being stuck in invited workspace!) */}
          {(isViewingInvitedOrg || (primaryOrgId && currentOrg.id !== primaryOrgId)) && (
            <button
              type="button"
              onClick={async () => {
                setIsOpen(false);
                await returnToMainBusiness();
                success('Returned to your main business workspace!');
              }}
              className="w-full mb-2 p-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold text-xs flex items-center justify-between shadow-md active:scale-95 transition cursor-pointer"
            >
              <div className="flex items-center gap-2 min-w-0">
                <Sparkles className="w-4 h-4 text-amber-300 shrink-0 animate-pulse" />
                <div className="min-w-0 text-left">
                  <p className="text-xs font-bold leading-tight truncate">
                    Return to My Main Business
                  </p>
                  <p className="text-[10px] text-emerald-100 font-normal truncate">
                    मुख्य खाते / व्यापार पर वापस जाएं
                  </p>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 shrink-0 text-white" />
            </button>
          )}

          {/* Business Workspaces Section */}
          <div className="px-2 py-1 flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
            <span>My Businesses &amp; Workspaces</span>
            <span className="px-1.5 py-0.2 rounded-full bg-[var(--surface-2)] text-[var(--text)] font-mono">
              {organizations.length}
            </span>
          </div>

          <div className="max-h-56 overflow-y-auto space-y-1 py-1 pr-0.5">
            {/* 1. Owned / Main Businesses */}
            {ownedOrgs.map((org) => {
              const isSelected = org.id === currentOrg.id;
              const orgRole = orgRoles[org.id] || 'owner';
              const badge = ROLE_BADGES[orgRole] || ROLE_BADGES.owner;

              return (
                <div
                  key={org.id}
                  onClick={() => {
                    if (!isSelected) {
                      switchBusiness(org.id);
                      success(`Switched to "${org.name}" (${badge.label})`);
                    }
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center justify-between p-2 rounded-xl text-xs transition cursor-pointer group ${
                    isSelected
                      ? 'bg-[var(--surface-2)] border border-[var(--accent)]/40 font-semibold text-[var(--text)] shadow-2xs'
                      : 'text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface-2)]/60 border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0 flex-1 pr-2">
                    <Building2
                      className={`w-3.5 h-3.5 shrink-0 ${
                        isSelected ? 'text-[var(--accent)]' : 'text-[var(--text-muted)]'
                      }`}
                    />
                    <div className="flex flex-col min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="truncate text-[var(--text)] font-medium leading-tight">
                          {org.name}
                        </span>
                        {org.id === primaryOrgId && (
                          <span className="text-[9px] bg-emerald-500/15 text-emerald-400 font-bold px-1.5 py-0.2 rounded shrink-0">
                            Main
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-[var(--text-muted)]">
                        {org.business_type ? org.business_type.toUpperCase() : 'BUSINESS'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <span
                      className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${badge.bg} ${badge.text}`}
                    >
                      {badge.label}
                    </span>
                    {isSelected && <Check className="w-3.5 h-3.5 text-[var(--accent)] shrink-0" />}
                  </div>
                </div>
              );
            })}

            {/* 2. Joined / Invited Businesses */}
            {joinedOrgs.length > 0 && (
              <>
                <div className="pt-1.5 pb-0.5 px-2 text-[9px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                  Joined via Invite ({joinedOrgs.length})
                </div>
                {joinedOrgs.map((org) => {
                  const isSelected = org.id === currentOrg.id;
                  const orgRole = orgRoles[org.id] || 'viewer';
                  const badge = ROLE_BADGES[orgRole] || ROLE_BADGES.viewer;

                  return (
                    <div
                      key={org.id}
                      onClick={() => {
                        if (!isSelected) {
                          switchBusiness(org.id);
                          success(`Switched to "${org.name}" (${badge.label})`);
                        }
                        setIsOpen(false);
                      }}
                      className={`w-full flex items-center justify-between p-2 rounded-xl text-xs transition cursor-pointer group ${
                        isSelected
                          ? 'bg-[var(--surface-2)] border border-[var(--accent)]/40 font-semibold text-[var(--text)] shadow-2xs'
                          : 'text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface-2)]/60 border border-transparent'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0 flex-1 pr-2">
                        <Users
                          className={`w-3.5 h-3.5 shrink-0 ${
                            isSelected ? 'text-[var(--accent)]' : 'text-[var(--text-muted)]'
                          }`}
                        />
                        <div className="flex flex-col min-w-0">
                          <span className="truncate text-[var(--text)] font-medium leading-tight">
                            {org.name}
                          </span>
                          <span className="text-[10px] text-amber-400">Team Workspace</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <span
                          className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${badge.bg} ${badge.text}`}
                        >
                          {badge.label}
                        </span>
                        {isSelected && <Check className="w-3.5 h-3.5 text-[var(--accent)] shrink-0" />}

                        {!isSelected && (
                          <button
                            type="button"
                            onClick={(e) => handleLeave(e, org.id, org.name)}
                            className="p-1 rounded-md text-[var(--text-muted)] hover:text-red-400 hover:bg-red-500/10 transition"
                            title="Leave this workspace"
                          >
                            <LogOut className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </>
            )}
          </div>

          {/* Quick Actions Footer */}
          <div className="mt-2 pt-2 border-t border-[var(--border)] space-y-1">
            {onOpenAccountSwitcher && (
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  onOpenAccountSwitcher();
                }}
                className="w-full flex items-center justify-between p-2 rounded-xl text-xs text-[var(--text)] hover:bg-[var(--surface-2)] transition font-medium cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <ArrowLeftRight className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Switch Account / प्रोफाइल बदलें</span>
                </div>
                <span className="text-[10px] bg-emerald-500/15 text-emerald-400 px-1.5 py-0.2 rounded-full font-semibold">
                  Multi-User
                </span>
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                onCreateNew();
              }}
              className="w-full flex items-center gap-2 p-2 rounded-xl text-xs text-[var(--accent)] hover:bg-[var(--surface-2)] transition font-medium cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Create New Business</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                onJoinInvite();
              }}
              className="w-full flex items-center gap-2 p-2 rounded-xl text-xs text-[var(--text)] hover:bg-[var(--surface-2)] transition font-medium cursor-pointer"
            >
              <KeyRound className="w-3.5 h-3.5 text-[var(--text-muted)]" />
              <span>Join with Invite Code</span>
            </button>

            {onOpenMembers && (role === 'owner' || role === 'manager') && (
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  onOpenMembers();
                }}
                className="w-full flex items-center gap-2 p-2 rounded-xl text-xs text-[var(--text)] hover:bg-[var(--surface-2)] transition font-medium cursor-pointer"
              >
                <Users className="w-3.5 h-3.5 text-[var(--accent)]" />
                <span>Invite Team &amp; Members</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
