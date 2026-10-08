import React from 'react';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'accent' | 'income' | 'expense' | 'warning' | 'neutral';
  size?: 'sm' | 'md';
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'neutral',
  size = 'md',
  className = '',
  ...props
}) => {
  const sizeStyles = {
    sm: 'px-2 py-0.5 text-[11px]',
    md: 'px-2.5 py-1 text-xs',
  }[size];

  const variantStyles = {
    accent: 'bg-[var(--accent)] text-[var(--accent-contrast)]',
    income: 'bg-[var(--income)]/20 text-[var(--income)] border border-[var(--income)]/30',
    expense: 'bg-[var(--expense)]/20 text-[var(--expense)] border border-[var(--expense)]/30',
    warning: 'bg-[var(--warning)]/20 text-[var(--warning)] border border-[var(--warning)]/30',
    neutral: 'bg-[var(--surface-2)] text-[var(--text-muted)] border border-[var(--border)]',
  }[variant];

  return (
    <span
      className={`inline-flex items-center gap-1 font-semibold rounded-lg tracking-wide select-none ${sizeStyles} ${variantStyles} ${className}`}
      {...props}
    >
      {children}
    </span>
  );
};

export interface AvatarProps {
  name: string;
  src?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const Avatar: React.FC<AvatarProps> = ({ name, src, size = 'md', className = '' }) => {
  const sizeStyles = {
    sm: 'w-7 h-7 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-14 h-14 text-lg',
  }[size];

  const initials = name
    .split(' ')
    .map((n) => n[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase() || 'S';

  if (src) {
    return (
      <img
        src={src}
        alt={name}
        className={`rounded-full object-cover border border-[var(--border)] shrink-0 ${sizeStyles} ${className}`}
      />
    );
  }

  return (
    <div
      className={`rounded-full flex items-center justify-center font-bold bg-[var(--surface-2)] border border-[var(--border)] text-[var(--accent)] shrink-0 select-none ${sizeStyles} ${className}`}
    >
      {initials}
    </div>
  );
};
