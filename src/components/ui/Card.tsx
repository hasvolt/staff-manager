import React from 'react';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'gradient' | 'surface' | 'outline';
  interactive?: boolean;
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ children, variant = 'gradient', interactive = false, className = '', ...props }, ref) => {
    const variantStyles = {
      gradient:
        'bg-gradient-to-br from-[var(--card-from)] to-[var(--card-to)] border border-[var(--border)] text-[var(--text)]',
      surface: 'bg-[var(--surface)] border border-[var(--border)] text-[var(--text)]',
      outline: 'bg-transparent border border-[var(--border)] text-[var(--text)]',
    }[variant];

    return (
      <div
        ref={ref}
        className={`rounded-2xl p-4 sm:p-5 shadow-xs transition ${
          interactive ? 'hover:border-[var(--text-muted)] cursor-pointer active:scale-99' : ''
        } ${variantStyles} ${className}`}
        {...props}
      >
        {children}
      </div>
    );
  }
);
Card.displayName = 'Card';
