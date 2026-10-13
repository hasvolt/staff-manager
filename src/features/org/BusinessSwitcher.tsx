import React, { useState, useRef, useEffect } from 'react';
import { useOrg } from './orgContext';
import { useAuth } from '@/features/auth/authContext';
import { useToast } from '@/components/ui/Toast';
import { Building2, ChevronDown, Plus, KeyRound, Check, Users, LogOut } from 'lucide-react';

interface BusinessSwitcherProps {
  onCreateNew: () => void;
  onJoinInvite: () => void;
  onOpenMembers?: () => void;
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
}) => {
  const { currentOrg, organizations, switchBusiness, leaveBusiness, orgRoles, role } = useOrg();
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
    if (!window.confirm(`Are you sure you want to leave "${orgName}"? You can rejoin anytime with a valid invite code.`)) {
      return;
    }
    const res = await leaveBusiness(orgId);
    if (res.error) {
      error(res.error.message || 'Could not leave business');
    } else {
      success(`Left "${orgName}" successfully.`);
    }
  };

  // If no org exists yet, provide an interactive fallback button rather than disappearing
  if (!currentOrg) {
    return (
      <button
        type="button"
        onClick={onCreateNew}
        className="flex items-center gap-1.5 py-1.5 px-2.5 rounded-xl border border-dashed border-[var(--border)] bg-[var(--surface-2)] text-[var(--text-muted)] hover:text-[var(--text)] text-xs font-semibold cursor-pointer"
      >
        <Building2 className="w-3.5 h-3.5 text-[var(--accent)] shrink-0" />
        <span>Create or Join Business</span>
      </button>
    );
  }

  const activeRoleBadge = ROLE_BADGES[role] || {
    label: role,
    bg: 'bg-[var(--surface)]',
    text: 'text-[var(--text-muted)]',
  };

  return (
    <div className="relative min-w-0" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 sm:gap-2 py-1.5 px-2 sm:px-2.5 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] text-[var(--text)] hover:bg-[var(--surface)] transition text-xs font-semibold max-w-[125px] min-[360px]:max-w-[150px] min-[420px]:max-w-[190px] sm:max-w-[260px] cursor-pointer"
        title={`Workspace: ${currentOrg.name} (${role})`}
      >
        <Building2 className="w-3.5 h-3.5 text-[var(--accent)] shrink-0" />
        <span className="truncate text-left">{currentOrg.name}</span>
        <span
          className={`hidden sm:inline-block px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${activeRoleBadge.bg} ${activeRoleBadge.text} shrink-0`}
        >
          {activeRoleBadge.label}
        </span>
        <ChevronDown className="w-3 h-3 text-[var(--text-muted)] shrink-0 ml-auto" />
      </button>

      {isOpen && (
        <div className="absolute left-0 mt-2 w-72 max-w-[calc(100vw-24px)] rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-2xl z-50 p-2 animate-in fade-in slide-in-from-top-1 text-left">
          <div className="px-2.5 py-1.5 flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
            <span>My Businesses &amp; Workspaces</span>
            <span className="px-1.5 py-0.2 rounded-full bg-[var(--surface-2)] text-[var(--text)]">
              {organizations.length}
            </span>
          </div>

          <div className="max-h-56 overflow-y-auto space-y-1 py-1">
            {organizations.map((org) => {
              const isSelected = org.id === currentOrg.id;
              const orgRole = orgRoles[org.id] || (org.owner_id === (user?.id || 'local_user') ? 'owner' : 'viewer');
              const badge = ROLE_BADGES[orgRole] || {
                label: orgRole,
                bg: 'bg-[var(--surface-2)]',
                text: 'text-[var(--text-muted)]',
              };
              const isOwner = org.owner_id === (user?.id || 'local_user') || orgRole === 'owner';

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
                      ? 'bg-[var(--surface-2)] border border-[var(--accent)]/30 font-semibold text-[var(--text)]'
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
                      <span className="truncate text-[var(--text)] font-medium leading-tight">
                        {org.name}
                      </span>
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

                    {!isOwner && !isSelected && (
                      <button
                        type="button"
                        onClick={(e) => handleLeave(e, org.id, org.name)}
                        className="opacity-0 group-hover:opacity-100 p-1 rounded-md text-[var(--text-muted)] hover:text-red-400 hover:bg-red-500/10 transition"
                        title="Leave this workspace"
                      >
                        <LogOut className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-2 pt-2 border-t border-[var(--border)] space-y-1">
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                onCreateNew();
              }}
              className="w-full flex items-center gap-2 p-2 rounded-xl text-xs text-[var(--accent)] hover:bg-[var(--surface-2)] transition font-medium cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create New Business</span>
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
