import React from 'react';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'gradient' | 'surface' | 'outline' | 'elevated';
  interactive?: boolean;
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ children, variant = 'gradient', interactive = false, className = '', ...props }, ref) => {
    const variantStyles = {
      gradient:
        'bg-gradient-to-br from-[var(--card-from)] to-[var(--card-to)] border border-[var(--border)] text-[var(--text)]',
      surface: 'bg-[var(--surface)] border border-[var(--border)] text-[var(--text)]',
      outline: 'bg-transparent border-2 border-[var(--border)] text-[var(--text)]',
      elevated:
        'bg-[var(--surface-2)] border border-[var(--border)] shadow-md text-[var(--text)]',
    }[variant];

    return (
      <div
        ref={ref}
        className={`rounded-2xl p-4 sm:p-5 shadow-xs transition-all duration-150 ${
          interactive
            ? 'hover:border-[var(--accent)] hover:shadow-md cursor-pointer active:scale-[0.985] active:brightness-95'
            : ''
        } ${variantStyles} ${className}`}
        {...props}
      >
        {children}
      </div>
    );
  }
);
Card.displayName = 'Card';
