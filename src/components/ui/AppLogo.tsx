import React, { useId } from 'react';

interface AppLogoProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
  subtitle?: string;
  className?: string;
  badgeOnly?: boolean;
}

const SIZE_MAP = {
  xs: { box: 'w-6 h-6', px: 24, font: 'text-xs', sub: 'text-[9px]' },
  sm: { box: 'w-8 h-8', px: 32, font: 'text-sm', sub: 'text-[10px]' },
  md: { box: 'w-10 h-10', px: 40, font: 'text-base', sub: 'text-[11px]' },
  lg: { box: 'w-14 h-14', px: 56, font: 'text-xl', sub: 'text-xs' },
  xl: { box: 'w-20 h-20', px: 80, font: 'text-2xl', sub: 'text-sm' },
};

export const AppLogo: React.FC<AppLogoProps> = ({
  size = 'md',
  showText = false,
  subtitle,
  className = '',
  badgeOnly = false,
}) => {
  const currentSize = SIZE_MAP[size];
  const rawId = useId();
  const idPrefix = 'al_' + rawId.replace(/[^a-zA-Z0-9]/g, '');

  const svgEmblem = (
    <svg
      viewBox="0 0 512 512"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`${currentSize.box} shrink-0 drop-shadow-xs transition-transform hover:scale-105 duration-200 select-none`}
      aria-label="Staff Manager Emblem"
    >
      <defs>
        <linearGradient id={`${idPrefix}-bg`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#064E3B" />
          <stop offset="50%" stopColor="#062E22" />
          <stop offset="100%" stopColor="#021A12" />
        </linearGradient>

        <radialGradient id={`${idPrefix}-glow`} cx="25%" cy="20%" r="65%">
          <stop offset="0%" stopColor="#10B981" stopOpacity="0.45" />
          <stop offset="60%" stopColor="#047857" stopOpacity="0.1" />
          <stop offset="100%" stopColor="#021A12" stopOpacity="0" />
        </radialGradient>

        <linearGradient id={`${idPrefix}-leader`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#6EE7B7" />
          <stop offset="50%" stopColor="#10B981" />
          <stop offset="100%" stopColor="#059669" />
        </linearGradient>

        <linearGradient id={`${idPrefix}-crew`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#34D399" stopOpacity="0.75" />
          <stop offset="100%" stopColor="#059669" stopOpacity="0.5" />
        </linearGradient>

        <linearGradient id={`${idPrefix}-badge`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#34D399" />
          <stop offset="100%" stopColor="#10B981" />
        </linearGradient>

        <filter id={`${idPrefix}-shadow`} x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="5" stdDeviation="6" floodColor="#000000" floodOpacity="0.55" />
        </filter>
      </defs>

      {/* Outer rounded squircle */}
      <rect width="512" height="512" rx="112" fill={`url(#${idPrefix}-bg)`} />
      <rect width="512" height="512" rx="112" fill={`url(#${idPrefix}-glow)`} />
      <rect
        x="10"
        y="10"
        width="492"
        height="492"
        rx="102"
        fill="none"
        stroke="#34D399"
        strokeWidth="6"
        strokeOpacity="0.35"
      />

      {/* Staff Crew */}
      <g>
        {/* Left Team Member */}
        <g opacity="0.75">
          <circle cx="152" cy="186" r="42" fill={`url(#${idPrefix}-crew)`} />
          <path d="M78 358 C78 282 120 256 160 252 C140 278 132 316 132 358 Z" fill={`url(#${idPrefix}-crew)`} />
        </g>

        {/* Right Team Member */}
        <g opacity="0.75">
          <circle cx="360" cy="186" r="42" fill={`url(#${idPrefix}-crew)`} />
          <path d="M434 358 C434 282 392 256 352 252 C372 278 380 316 380 358 Z" fill={`url(#${idPrefix}-crew)`} />
        </g>

        {/* Center Leader Figure */}
        <g>
          <circle cx="256" cy="154" r="56" fill={`url(#${idPrefix}-leader)`} />
          <path
            d="M148 360 C148 274 200 240 256 240 C312 240 364 274 364 360 C364 368 358 372 348 372 L164 372 C154 372 148 368 148 360 Z"
            fill={`url(#${idPrefix}-leader)`}
          />
        </g>
      </g>

      {/* Verified Attendance Checkmark Badge */}
      <g filter={`url(#${idPrefix}-shadow)`}>
        <circle cx="370" cy="370" r="76" fill="#031F15" stroke="#34D399" strokeWidth="9" />
        <circle cx="370" cy="370" r="64" fill={`url(#${idPrefix}-badge)`} fillOpacity="0.18" />
        <path
          d="M336 370 L360 396 L408 344"
          fill="none"
          stroke="#34D399"
          strokeWidth="17"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>
    </svg>
  );

  if (badgeOnly || !showText) {
    return <div className={`inline-flex items-center justify-center shrink-0 ${className}`}>{svgEmblem}</div>;
  }

  return (
    <div className={`inline-flex items-center gap-2.5 shrink-0 ${className}`}>
      {svgEmblem}
      <div className="flex flex-col text-left leading-tight">
        <div className={`font-extrabold tracking-tight ${currentSize.font}`}>
          <span className="text-[var(--text)]">Staff</span>{' '}
          <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-emerald-500 bg-clip-text text-transparent">
            Manager
          </span>
        </div>
        {subtitle !== undefined ? (
          subtitle && <span className={`${currentSize.sub} text-[var(--text-muted)] font-medium`}>{subtitle}</span>
        ) : (
          <span className={`${currentSize.sub} text-[var(--text-muted)] font-semibold tracking-wider uppercase`}>
            Workforce &amp; Attendance
          </span>
        )}
      </div>
    </div>
  );
};
