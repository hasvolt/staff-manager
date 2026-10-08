import React from 'react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'income' | 'expense' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  isLoading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      variant = 'primary',
      size = 'md',
      fullWidth = false,
      isLoading = false,
      className = '',
      disabled,
      ...props
    },
    ref
  ) => {
    const baseStyles =
      'inline-flex items-center justify-center font-medium rounded-xl transition duration-150 active:scale-98 cursor-pointer select-none disabled:opacity-50 disabled:pointer-events-none disabled:active:scale-100 gap-2';

    const sizeStyles = {
      sm: 'px-3 py-1.5 text-xs',
      md: 'px-4 py-2.5 text-sm',
      lg: 'px-5 py-3 text-base',
    }[size];

    const variantStyles = {
      primary: 'bg-[var(--accent)] text-[var(--accent-contrast)] hover:opacity-90 shadow-xs',
      secondary: 'bg-[var(--surface-2)] text-[var(--text)] border border-[var(--border)] hover:bg-[var(--surface)]',
      outline: 'bg-transparent text-[var(--text)] border border-[var(--border)] hover:bg-[var(--surface-2)]',
      income: 'bg-[var(--btn-income)] text-white hover:opacity-95 shadow-xs',
      expense: 'bg-[var(--btn-expense)] text-white hover:opacity-95 shadow-xs',
      ghost: 'bg-transparent text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface-2)]',
    }[variant];

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={`${baseStyles} ${sizeStyles} ${variantStyles} ${fullWidth ? 'w-full' : ''} ${className}`}
        {...props}
      >
        {isLoading && (
          <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin shrink-0" />
        )}
        {children}
      </button>
    );
  }
);
Button.displayName = 'Button';

export interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'ghost' | 'surface' | 'accent' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  'aria-label': string;
}

export const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ children, variant = 'ghost', size = 'md', className = '', ...props }, ref) => {
    const sizeStyles = {
      sm: 'p-1.5 rounded-lg text-sm',
      md: 'p-2 rounded-xl text-base',
      lg: 'p-2.5 rounded-xl text-lg',
    }[size];

    const variantStyles = {
      ghost: 'text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface-2)]',
      surface: 'bg-[var(--surface-2)] text-[var(--text)] border border-[var(--border)] hover:bg-[var(--surface)]',
      accent: 'bg-[var(--accent)] text-[var(--accent-contrast)] hover:opacity-90',
      danger: 'text-[var(--expense)] hover:bg-[var(--surface-2)]',
    }[variant];

    return (
      <button
        ref={ref}
        className={`inline-flex items-center justify-center transition active:scale-95 cursor-pointer disabled:opacity-50 disabled:pointer-events-none ${sizeStyles} ${variantStyles} ${className}`}
        {...props}
      >
        {children}
      </button>
    );
  }
);
IconButton.displayName = 'IconButton';
