import React from 'react';
import { MlbbRole, ROLE_META } from '../data/ngdData';

export const NgdBrandEmblem: React.FC<{ size?: 'sm' | 'md' | 'lg' }> = ({
  size = 'md',
}) => {
  const dimensions =
    size === 'sm'
      ? 'w-9 h-7 sm:w-11 sm:h-9'
      : size === 'lg'
        ? 'w-28 h-22'
        : 'w-14 h-11';

  return (
    <div
      className={`relative inline-flex items-center justify-center select-none bg-[#05070c] border border-[#f1c40f]/35 rounded-md overflow-hidden shrink-0 ${dimensions}`}
      aria-label="NGD NextGen Dominator Since 2019 Emblem"
    >
      <svg
        viewBox="0 0 240 180"
        className="w-full h-full"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Deep dark background */}
        <rect width="240" height="180" fill="#05070c" />

        {/* "Since 2019" top center label */}
        <text
          x="120"
          y="29"
          textAnchor="middle"
          fill="#facc15"
          fontSize="15"
          fontWeight="700"
          fontFamily="Outfit, sans-serif"
          letterSpacing="0.5"
        >
          Since 2019
        </text>

        {/* Geometric double-line N */}
        <path
          d="M24 142V38H44C62 52 75 74 82 96V38H96V142H78C72 108 58 78 38 64V142H24Z"
          fill="#facc15"
        />
        <path
          d="M31 142V50C50 61 65 82 72 108"
          stroke="#05070c"
          strokeWidth="3.5"
        />
        <path d="M89 38V92" stroke="#05070c" strokeWidth="3.5" />

        {/* Geometric double-line G */}
        <path
          d="M148 38H99V95C99 124 114 142 136 142C146 142 154 139 160 134V82H126V102H142V122C139 124 136 125 132 125C121 125 114 113 114 94V56H148V38Z"
          fill="#facc15"
        />
        <path
          d="M148 47H106V94C106 119 117 134 135 134C143 134 149 131 153 128V90H132"
          stroke="#05070c"
          strokeWidth="3.5"
        />

        {/* Geometric double-line D */}
        <path
          d="M164 38H215V92C215 123 198 142 173 142H164V38ZM180 56V124H176C191 124 199 111 199 91V56H180Z"
          fill="#facc15"
        />
        <path
          d="M172 46H207V92C207 117 194 133 173 133H172V46Z"
          stroke="#05070c"
          strokeWidth="3.5"
        />

        {/* Subtle dark stroke shadow behind NextGenDominator blackletter */}
        <text
          x="120"
          y="148"
          textAnchor="middle"
          fill="#05070c"
          stroke="#05070c"
          strokeWidth="6"
          fontSize="30"
          fontFamily="UnifrakturMaguntia, serif"
        >
          NextGenDominator
        </text>
        <text
          x="120"
          y="148"
          textAnchor="middle"
          fill="#fde047"
          fontSize="30"
          fontFamily="UnifrakturMaguntia, serif"
        >
          NextGenDominator
        </text>
      </svg>
    </div>
  );
};

export const RoleIcon: React.FC<{ role: MlbbRole; className?: string }> = ({
  role,
  className = 'w-4 h-4',
}) => {
  switch (role) {
    case 'EXP Lane':
      return (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          className={className}
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M14.5 17.5L3 6V3h3l11.5 11.5" />
          <path d="M13 19l6-6" />
          <path d="M16 16l4 4" />
          <path d="M19 21l2-2" />
          <path d="M9.5 6.5L21 18v3h-3L6.5 9.5" opacity="0.55" />
        </svg>
      );
    case 'Gold Lane':
      return (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          className={className}
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="8" />
          <path d="M12 7v10" />
          <path d="M7 12h10" />
          <circle cx="12" cy="12" r="2.5" fill="currentColor" />
        </svg>
      );
    case 'Mid Lane':
      return (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          className={className}
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polygon points="12 2 16 9 22 12 16 15 12 22 8 15 2 12 8 9 12 2" />
          <circle cx="12" cy="12" r="2" fill="currentColor" />
        </svg>
      );
    case 'Jungle':
      return (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          className={className}
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M13 2L4 14h7l-1 8 10-12h-7l1-8z" />
        </svg>
      );
    case 'Roamer':
      return (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          className={className}
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          <path d="M12 8v7" />
          <path d="M8.5 11.5h7" />
        </svg>
      );
    case 'Flex Role':
      return (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          className={className}
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M16 3h5v5" />
          <path d="M4 20L21 3" />
          <path d="M21 16v5h-5" />
          <path d="M15 15l6 6" />
          <path d="M4 4l5 5" />
        </svg>
      );
  }
};

export const RoleBadge: React.FC<{
  role: MlbbRole;
  customLabel?: string;
  compact?: boolean;
}> = ({ role, customLabel, compact = false }) => {
  const meta = ROLE_META[role];
  const displayLabel = customLabel
    ? customLabel
    : compact
      ? meta.shortLabel
      : meta.role;
  return (
    <span
      className={`inline-flex items-center gap-1 font-mono text-[11px] sm:text-xs font-medium tracking-tight max-w-full min-w-0 ${meta.textClass}`}
    >
      <RoleIcon role={role} className="w-3.5 h-3.5 shrink-0" />
      <span className="truncate">{displayLabel}</span>
    </span>
  );
};
