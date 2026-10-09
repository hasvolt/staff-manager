import React from 'react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'income' | 'expense' | 'ghost' | 'tactile';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  isLoading?: boolean;
  sublabel?: string;
  icon?: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      variant = 'primary',
      size = 'md',
      fullWidth = false,
      isLoading = false,
      sublabel,
      icon,
      className = '',
      disabled,
      ...props
    },
    ref
  ) => {
    const baseStyles =
      'inline-flex items-center justify-center font-semibold rounded-2xl transition-all duration-150 active:scale-[0.97] active:brightness-95 cursor-pointer select-none disabled:opacity-50 disabled:pointer-events-none disabled:active:scale-100 gap-2.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg)] shadow-sm';

    const sizeStyles = {
      sm: 'px-3 py-1.5 min-h-[38px] text-xs',
      md: 'px-4 py-2.5 min-h-[46px] text-sm',
      lg: 'px-6 py-3.5 min-h-[52px] text-base',
    }[size];

    const variantStyles = {
      primary:
        'bg-[var(--accent)] text-[var(--accent-contrast)] hover:opacity-95 border border-[var(--accent)] shadow-md shadow-[var(--accent)]/15',
      secondary:
        'bg-[var(--surface-2)] text-[var(--text)] border border-[var(--border)] hover:bg-[var(--surface)] hover:border-[var(--text-muted)]/30',
      outline:
        'bg-transparent text-[var(--text)] border-2 border-[var(--border)] hover:bg-[var(--surface-2)] hover:border-[var(--text-muted)]/40',
      income:
        'bg-[var(--btn-income)] text-white hover:opacity-95 border border-[var(--btn-income)] shadow-md shadow-emerald-500/20',
      expense:
        'bg-[var(--btn-expense)] text-white hover:opacity-95 border border-[var(--btn-expense)] shadow-md shadow-rose-500/20',
      tactile:
        'bg-[var(--surface-2)] text-[var(--text)] border-2 border-[var(--border)] hover:border-[var(--accent)] active:border-[var(--accent)] shadow-sm hover:shadow',
      ghost:
        'bg-transparent text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface-2)] shadow-none',
    }[variant];

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={`${baseStyles} ${sizeStyles} ${variantStyles} ${fullWidth ? 'w-full' : ''} ${className}`}
        {...props}
      >
        {isLoading ? (
          <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin shrink-0" />
        ) : (
          icon && <span className="shrink-0 flex items-center">{icon}</span>
        )}
        {sublabel ? (
          <div className="flex flex-col items-center justify-center leading-tight">
            <span>{children}</span>
            <span className="text-[10px] font-normal opacity-85 mt-0.5">{sublabel}</span>
          </div>
        ) : (
          children
        )}
      </button>
    );
  }
);
Button.displayName = 'Button';

export interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'ghost' | 'surface' | 'accent' | 'danger' | 'tactile';
  size?: 'sm' | 'md' | 'lg';
  'aria-label': string;
}

export const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ children, variant = 'ghost', size = 'md', className = '', ...props }, ref) => {
    const sizeStyles = {
      sm: 'w-9 h-9 min-w-[36px] min-h-[36px] rounded-xl text-sm',
      md: 'w-11 h-11 min-w-[44px] min-h-[44px] rounded-2xl text-base',
      lg: 'w-13 h-13 min-w-[52px] min-h-[52px] rounded-2xl text-lg',
    }[size];

    const variantStyles = {
      ghost: 'text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface-2)]',
      surface:
        'bg-[var(--surface-2)] text-[var(--text)] border border-[var(--border)] hover:bg-[var(--surface)] hover:border-[var(--text-muted)]/30',
      accent:
        'bg-[var(--accent)] text-[var(--accent-contrast)] hover:opacity-95 shadow-md shadow-[var(--accent)]/15',
      tactile:
        'bg-[var(--surface-2)] text-[var(--text)] border-2 border-[var(--border)] hover:border-[var(--accent)] active:border-[var(--accent)] shadow-xs',
      danger: 'text-[var(--expense)] hover:bg-[var(--surface-2)]',
    }[variant];

    return (
      <button
        ref={ref}
        className={`inline-flex items-center justify-center transition-all duration-150 active:scale-95 active:brightness-95 cursor-pointer disabled:opacity-50 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] ${sizeStyles} ${variantStyles} ${className}`}
        {...props}
      >
        {children}
      </button>
    );
  }
);
IconButton.displayName = 'IconButton';
