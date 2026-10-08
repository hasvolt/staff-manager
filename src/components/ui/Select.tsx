import React from 'react';
import { ChevronDown } from 'lucide-react';

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  options?: SelectOption[];
  hasError?: boolean;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ options, children, className = '', hasError = false, disabled, ...props }, ref) => {
    return (
      <div className="relative flex items-center w-full">
        <select
          ref={ref}
          disabled={disabled}
          className={`w-full appearance-none rounded-xl bg-[var(--surface-2)] border text-[var(--text)] text-sm py-2.5 pl-3 pr-9 outline-none transition focus:ring-1 cursor-pointer disabled:opacity-50 ${
            hasError
              ? 'border-[var(--expense)] focus:border-[var(--expense)] focus:ring-[var(--expense)]'
              : 'border-[var(--border)] focus:border-[var(--accent)] focus:ring-[var(--accent)]'
          } ${className}`}
          {...props}
        >
          {options
            ? options.map((opt) => (
                <option
                  key={opt.value}
                  value={opt.value}
                  disabled={opt.disabled}
                  className="bg-[var(--surface)] text-[var(--text)] py-1"
                >
                  {opt.label}
                </option>
              ))
            : children}
        </select>
        <ChevronDown className="absolute right-3 w-4 h-4 text-[var(--text-muted)] pointer-events-none" />
      </div>
    );
  }
);
Select.displayName = 'Select';
