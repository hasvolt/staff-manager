import React from 'react';

export interface TabItem {
  id: string;
  label: string;
  count?: number;
  icon?: React.ReactNode;
}

export interface TabsProps {
  items: TabItem[];
  activeId: string;
  onChange: (id: string) => void;
  className?: string;
  variant?: 'pills' | 'underline';
}

export const Tabs: React.FC<TabsProps> = ({
  items,
  activeId,
  onChange,
  className = '',
  variant = 'pills',
}) => {
  if (variant === 'underline') {
    return (
      <div className={`flex border-b border-[var(--border)] gap-4 ${className}`}>
        {items.map((tab) => {
          const isActive = tab.id === activeId;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onChange(tab.id)}
              className={`pb-2.5 pt-1 px-1 text-sm font-medium transition cursor-pointer relative flex items-center gap-2 select-none ${
                isActive
                  ? 'text-[var(--text)] font-semibold'
                  : 'text-[var(--text-muted)] hover:text-[var(--text)]'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
              {typeof tab.count === 'number' && (
                <span
                  className={`text-xs px-1.5 py-0.5 rounded-full ${
                    isActive
                      ? 'bg-[var(--accent)] text-[var(--accent-contrast)]'
                      : 'bg-[var(--surface-2)] text-[var(--text-muted)]'
                  }`}
                >
                  {tab.count}
                </span>
              )}
              {isActive && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--accent)] rounded-t-full" />
              )}
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div
      className={`inline-flex p-1 bg-[var(--surface-2)] rounded-xl border border-[var(--border)] gap-1 max-w-full overflow-x-auto ${className}`}
    >
      {items.map((tab) => {
        const isActive = tab.id === activeId;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer flex items-center gap-1.5 whitespace-nowrap select-none ${
              isActive
                ? 'bg-[var(--surface)] text-[var(--text)] font-semibold shadow-2xs border border-[var(--border)]'
                : 'text-[var(--text-muted)] hover:text-[var(--text)]'
            }`}
          >
            {tab.icon}
            <span>{tab.label}</span>
            {typeof tab.count === 'number' && (
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                  isActive
                    ? 'bg-[var(--accent)] text-[var(--accent-contrast)]'
                    : 'bg-[var(--surface)] text-[var(--text-muted)]'
                }`}
              >
                {tab.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
};
