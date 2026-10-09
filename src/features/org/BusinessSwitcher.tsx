import React, { useState, useRef, useEffect } from 'react';
import { useOrg } from './orgContext';
import { Building2, ChevronDown, Plus, KeyRound, Check } from 'lucide-react';

interface BusinessSwitcherProps {
  onCreateNew: () => void;
  onJoinInvite: () => void;
}

export const BusinessSwitcher: React.FC<BusinessSwitcherProps> = ({
  onCreateNew,
  onJoinInvite,
}) => {
  const { currentOrg, organizations, switchBusiness, role } = useOrg();
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

  if (!currentOrg) return null;

  return (
    <div className="relative min-w-0" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 sm:gap-2 py-1.5 px-2 sm:px-2.5 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] text-[var(--text)] hover:bg-[var(--surface)] transition text-xs font-semibold max-w-[120px] min-[360px]:max-w-[145px] min-[420px]:max-w-[185px] sm:max-w-[220px] cursor-pointer"
        title={`Business: ${currentOrg.name}`}
      >
        <Building2 className="w-3.5 h-3.5 text-[var(--accent)] shrink-0" />
        <span className="truncate text-left">{currentOrg.name}</span>
        <ChevronDown className="w-3 h-3 text-[var(--text-muted)] shrink-0 ml-auto" />
      </button>

      {isOpen && (
        <div className="absolute left-0 mt-2 w-64 max-w-[calc(100vw-24px)] rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-2xl z-50 p-2 animate-in fade-in slide-in-from-top-1 text-left">
          <div className="px-2 py-1.5 text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
            My Businesses ({organizations.length})
          </div>

          <div className="max-h-52 overflow-y-auto space-y-1">
            {organizations.map((org) => {
              const isSelected = org.id === currentOrg.id;
              return (
                <button
                  key={org.id}
                  type="button"
                  onClick={() => {
                    switchBusiness(org.id);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center justify-between p-2 rounded-xl text-xs transition cursor-pointer ${
                    isSelected
                      ? 'bg-[var(--surface-2)] font-semibold text-[var(--text)]'
                      : 'text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface-2)]/60'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <Building2 className="w-3.5 h-3.5 shrink-0 text-[var(--accent)]" />
                    <span className="truncate">{org.name}</span>
                  </div>
                  {isSelected && <Check className="w-3.5 h-3.5 text-[var(--accent)] shrink-0" />}
                </button>
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
          </div>
        </div>
      )}
    </div>
  );
};
