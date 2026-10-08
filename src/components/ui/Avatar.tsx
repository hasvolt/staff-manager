import React, { useState } from 'react';

export interface AvatarProps {
  name?: string;
  src?: string | null;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export const Avatar: React.FC<AvatarProps> = ({
  name = '',
  src,
  size = 'md',
  className = '',
}) => {
  const [imageError, setImageError] = useState(false);

  const sizeClasses = {
    xs: 'w-6 h-6 text-[10px]',
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-12 h-12 text-base',
    xl: 'w-16 h-16 text-xl',
  }[size];

  const getInitials = (str: string): string => {
    if (!str) return '?';
    const parts = str.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  // Deterministic background hue based on name
  const getBgColor = (str: string): string => {
    if (!str) return 'bg-[var(--surface-2)] text-[var(--text-muted)]';
    const colors = [
      'bg-blue-500/20 text-blue-400 border border-blue-500/30',
      'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30',
      'bg-purple-500/20 text-purple-400 border border-purple-500/30',
      'bg-amber-500/20 text-amber-400 border border-amber-500/30',
      'bg-rose-500/20 text-rose-400 border border-rose-500/30',
      'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30',
    ];
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };

  if (src && !imageError) {
    return (
      <div
        className={`relative inline-flex shrink-0 items-center justify-center rounded-2xl overflow-hidden border border-[var(--border)] bg-[var(--surface-2)] ${sizeClasses} ${className}`}
      >
        <img
          src={src}
          alt={name || 'Avatar'}
          onError={() => setImageError(true)}
          className="w-full h-full object-cover"
        />
      </div>
    );
  }

  return (
    <div
      className={`relative inline-flex shrink-0 items-center justify-center font-semibold rounded-2xl select-none ${sizeClasses} ${getBgColor(
        name
      )} ${className}`}
    >
      {getInitials(name)}
    </div>
  );
};
