import React from 'react';

export interface FormFieldProps {
  label?: string;
  error?: string;
  helpText?: string;
  required?: boolean;
  children: React.ReactNode;
  className?: string;
}

export const FormField: React.FC<FormFieldProps> = ({
  label,
  error,
  helpText,
  required,
  children,
  className = '',
}) => {
  return (
    <div className={`flex flex-col gap-1.5 w-full text-left ${className}`}>
      {label && (
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold text-[var(--text)] select-none">
            {label}
            {required && <span className="text-[var(--expense)] ml-0.5">*</span>}
          </label>
        </div>
      )}
      {children}
      {error ? (
        <p className="text-xs text-[var(--expense)] font-medium leading-tight animate-in fade-in">
          {error}
        </p>
      ) : helpText ? (
        <p className="text-xs text-[var(--text-muted)] leading-tight">{helpText}</p>
      ) : null}
    </div>
  );
};
