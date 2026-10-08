import React from 'react';
import { Check } from 'lucide-react';

export interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string;
  description?: string;
}

export const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ label, description, className = '', checked, disabled, id, ...props }, ref) => {
    const inputId = id || `chk-${Math.random().toString(36).substring(2, 7)}`;

    return (
      <div className={`flex items-start gap-2.5 ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'} ${className}`}>
        <div className="relative flex items-center justify-center mt-0.5">
          <input
            ref={ref}
            id={inputId}
            type="checkbox"
            checked={checked}
            disabled={disabled}
            className="peer sr-only"
            {...props}
          />
          <div
            onClick={(e) => {
              if (!disabled) {
                const el = document.getElementById(inputId);
                el?.click();
              }
            }}
            className={`w-5 h-5 rounded-md border transition flex items-center justify-center ${
              checked
                ? 'bg-[var(--accent)] border-[var(--accent)] text-[var(--accent-contrast)]'
                : 'border-[var(--border)] bg-[var(--surface-2)] hover:border-[var(--text-muted)]'
            }`}
          >
            {checked && <Check className="w-3.5 h-3.5 stroke-[3]" />}
          </div>
        </div>
        {(label || description) && (
          <label htmlFor={inputId} className="select-none cursor-pointer text-left">
            {label && <div className="text-sm font-medium text-[var(--text)] leading-tight">{label}</div>}
            {description && <div className="text-xs text-[var(--text-muted)] mt-0.5">{description}</div>}
          </label>
        )}
      </div>
    );
  }
);
Checkbox.displayName = 'Checkbox';

export interface SwitchProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string;
  description?: string;
}

export const Switch = React.forwardRef<HTMLInputElement, SwitchProps>(
  ({ label, description, className = '', checked, disabled, id, ...props }, ref) => {
    const inputId = id || `sw-${Math.random().toString(36).substring(2, 7)}`;

    return (
      <div className={`flex items-center justify-between gap-3 ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'} ${className}`}>
        {(label || description) && (
          <label htmlFor={inputId} className="select-none cursor-pointer text-left">
            {label && <div className="text-sm font-medium text-[var(--text)]">{label}</div>}
            {description && <div className="text-xs text-[var(--text-muted)] mt-0.5">{description}</div>}
          </label>
        )}
        <div className="relative inline-flex items-center">
          <input
            ref={ref}
            id={inputId}
            type="checkbox"
            checked={checked}
            disabled={disabled}
            className="sr-only"
            {...props}
          />
          <div
            onClick={() => {
              if (!disabled) {
                const el = document.getElementById(inputId);
                el?.click();
              }
            }}
            className={`w-11 h-6 rounded-full transition-colors duration-200 ease-in-out cursor-pointer p-0.5 ${
              checked ? 'bg-[var(--accent)]' : 'bg-[var(--surface-2)] border border-[var(--border)]'
            }`}
          >
            <div
              className={`w-5 h-5 rounded-full bg-white shadow-xs transform transition-transform duration-200 ease-in-out ${
                checked ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </div>
        </div>
      </div>
    );
  }
);
Switch.displayName = 'Switch';
