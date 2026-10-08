import React from 'react';
import { Search, X } from 'lucide-react';

export interface SearchBoxProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export const SearchBox: React.FC<SearchBoxProps> = ({
  value,
  onChange,
  placeholder = 'Search...',
  className = '',
}) => {
  return (
    <div className={`relative flex items-center w-full ${className}`}>
      <Search className="absolute left-3 w-4 h-4 text-[var(--text-muted)] pointer-events-none" />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl bg-[var(--surface-2)] border border-[var(--border)] text-[var(--text)] text-sm py-2 pl-9 pr-8 outline-none transition focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)] placeholder:text-[var(--text-muted)]"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange('')}
          className="absolute right-2.5 p-0.5 text-[var(--text-muted)] hover:text-[var(--text)] rounded-full transition"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
};
