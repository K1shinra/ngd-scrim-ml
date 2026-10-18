import React from 'react';
import { resolveMlbbMedal, getMedalMeta, MlbbMedalGrade } from '../utils/scrimEngine';

export interface MlbbMedalBadgeProps {
  medal?: string;
  rating?: string | number;
  isMvp?: boolean;
  isSvp?: boolean;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  showScore?: boolean;
  showIcon?: boolean;
  language?: 'en' | 'tl';
  className?: string;
  short?: boolean;
}

/**
 * High-Fidelity Mobile Legends 6-Tier Match Medal Badge Component
 * 
 * 1. Mythic MVP (Purple MVP) -> Score >= 11.0
 * 2. Gold MVP (Gold MVP) -> Score < 11.0 (e.g. 6.9 - 10.9)
 * 3. Mythic Gold (Purple Gold / Non-MVP) -> Score >= 11.0
 * 4. Gold -> Score between 6.8 and 10.9
 * 5. Silver -> Score between 4.0 and 6.7
 * 6. Bronze -> Score below 4.0 (3.0 - 3.9)
 */
export const MlbbMedalBadge: React.FC<MlbbMedalBadgeProps> = ({
  medal,
  rating,
  isMvp = false,
  isSvp = false,
  size = 'sm',
  showScore = false,
  showIcon = true,
  language = 'en',
  className = '',
  short = false,
}) => {
  const resolvedGrade: MlbbMedalGrade = resolveMlbbMedal(rating, isMvp, isSvp, medal);
  const meta = getMedalMeta(resolvedGrade, language);

  const sizeClasses =
    size === 'xs'
      ? 'px-1.5 py-0.5 text-[9px] gap-1'
      : size === 'sm'
        ? 'px-2 py-0.5 text-[10px] gap-1.5'
        : size === 'md'
          ? 'px-2.5 py-1 text-xs gap-1.5'
          : 'px-3 py-1.5 text-sm gap-2 font-black';

  const labelText = short ? meta.shortLabel : meta.label;

  return (
    <span
      className={`inline-flex items-center font-display font-extrabold uppercase tracking-wide rounded-md border backdrop-blur-xs select-none transition-all ${meta.badgeClass} ${sizeClasses} ${className}`}
      title={`${meta.desc} · ${meta.scoreRange}`}
    >
      {showIcon && <span className="shrink-0">{meta.iconEmoji}</span>}
      <span className="truncate">{labelText}</span>
      {showScore && rating && (
        <span className="font-mono text-[9px] opacity-90 px-1 py-0.2 rounded bg-black/40 border border-white/10 ml-0.5 font-bold">
          {rating}
        </span>
      )}
    </span>
  );
};
