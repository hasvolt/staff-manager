import React from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  prefixNode?: React.ReactNode;
  suffixNode?: React.ReactNode;
  hasError?: boolean;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className = '', prefixNode, suffixNode, hasError = false, disabled, ...props }, ref) => {
    return (
      <div className="relative flex items-center w-full">
        {prefixNode && (
          <div className="absolute left-3 text-[var(--text-muted)] flex items-center pointer-events-none select-none">
            {prefixNode}
          </div>
        )}
        <input
          ref={ref}
          disabled={disabled}
          className={`w-full rounded-xl bg-[var(--surface-2)] border text-[var(--text)] text-sm py-2.5 outline-none transition focus:ring-1 disabled:opacity-50 ${
            hasError
              ? 'border-[var(--expense)] focus:border-[var(--expense)] focus:ring-[var(--expense)]'
              : 'border-[var(--border)] focus:border-[var(--accent)] focus:ring-[var(--accent)]'
          } ${prefixNode ? 'pl-9' : 'pl-3'} ${suffixNode ? 'pr-9' : 'pr-3'} ${className}`}
          {...props}
        />
        {suffixNode && (
          <div className="absolute right-3 text-[var(--text-muted)] flex items-center">
            {suffixNode}
          </div>
        )}
      </div>
    );
  }
);
Input.displayName = 'Input';
