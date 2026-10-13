import React from 'react';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'gradient' | 'surface' | 'outline' | 'elevated' | 'glass';
  interactive?: boolean;
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ children, variant = 'gradient', interactive = false, className = '', ...props }, ref) => {
    const variantStyles = {
      gradient:
        'bg-gradient-to-br from-[var(--card-from)] to-[var(--card-to)] border border-[var(--border)] text-[var(--text)] shadow-xs backdrop-blur-xs',
      surface:
        'bg-[var(--surface)] border border-[var(--border)] text-[var(--text)] shadow-xs',
      outline:
        'bg-transparent border border-[var(--border)] text-[var(--text)]',
      elevated:
        'bg-[var(--surface-2)] border border-[var(--border)] shadow-md text-[var(--text)]',
      glass:
        'bg-[var(--surface)]/80 backdrop-blur-md border border-[var(--border)] text-[var(--text)] shadow-xs',
    }[variant];

    return (
      <div
        ref={ref}
        className={`rounded-2xl p-4 sm:p-5 transition-all duration-200 relative overflow-hidden ${
          interactive
            ? 'hover:border-[var(--accent)] hover:shadow-md cursor-pointer active:scale-[0.985] active:brightness-95 select-none'
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

