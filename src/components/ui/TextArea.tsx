import React from 'react';

export interface TextAreaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  hasError?: boolean;
}

export const TextArea = React.forwardRef<HTMLTextAreaElement, TextAreaProps>(
  ({ className = '', hasError = false, disabled, ...props }, ref) => {
    return (
      <textarea
        ref={ref}
        disabled={disabled}
        className={`w-full rounded-xl bg-[var(--surface-2)] border text-[var(--text)] text-sm p-3 outline-none transition focus:ring-1 disabled:opacity-50 min-h-[80px] resize-y ${
          hasError
            ? 'border-[var(--expense)] focus:border-[var(--expense)] focus:ring-[var(--expense)]'
            : 'border-[var(--border)] focus:border-[var(--accent)] focus:ring-[var(--accent)]'
        } ${className}`}
        {...props}
      />
    );
  }
);
TextArea.displayName = 'TextArea';
