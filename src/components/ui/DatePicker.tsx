import React from 'react';
import { Calendar } from 'lucide-react';

export interface DatePickerProps extends React.InputHTMLAttributes<HTMLInputElement> {
  hasError?: boolean;
}

export const DatePicker = React.forwardRef<HTMLInputElement, DatePickerProps>(
  ({ className = '', hasError = false, disabled, ...props }, ref) => {
    return (
      <div className="relative flex items-center w-full">
        <input
          ref={ref}
          type="date"
          disabled={disabled}
          className={`w-full rounded-xl bg-[var(--surface-2)] border text-[var(--text)] text-sm py-2.5 pl-3 pr-9 outline-none transition focus:ring-1 cursor-pointer disabled:opacity-50 ${
            hasError
              ? 'border-[var(--expense)] focus:border-[var(--expense)] focus:ring-[var(--expense)]'
              : 'border-[var(--border)] focus:border-[var(--accent)] focus:ring-[var(--accent)]'
          } ${className}`}
          {...props}
        />
        <Calendar className="absolute right-3 w-4 h-4 text-[var(--text-muted)] pointer-events-none" />
      </div>
    );
  }
);
DatePicker.displayName = 'DatePicker';
