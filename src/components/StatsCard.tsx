import React, { ReactNode } from 'react';
import { LucideIcon } from 'lucide-react';

interface StatsCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  iconColor?: string;
  badgeText?: string;
  badgeType?: 'positive' | 'neutral' | 'accent';
  onClick?: () => void;
  className?: string;
}

export const StatsCard: React.FC<StatsCardProps> = ({
  title,
  value,
  subtitle,
  icon: Icon,
  iconColor = 'text-emerald-400',
  badgeText,
  badgeType = 'positive',
  onClick,
  className = '',
}) => {
  const badgeClasses = {
    positive: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    neutral: 'bg-slate-800 text-slate-300 border-slate-700',
    accent: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  };

  return (
    <div
      onClick={onClick}
      className={`relative overflow-hidden rounded-2xl bg-[#121722] border border-white/8 p-5 transition-all duration-200 hover:border-white/16 ${
        onClick ? 'cursor-pointer' : ''
      } ${className}`}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-slate-400">{title}</p>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight text-white font-mono">{value}</span>
            {badgeText && (
              <span className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${badgeClasses[badgeType]}`}>
                {badgeText}
              </span>
            )}
          </div>
          {subtitle && <p className="mt-1 text-xs text-slate-400">{subtitle}</p>}
        </div>

        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/5 border border-white/8">
          <Icon className={`h-5 w-5 ${iconColor}`} />
        </div>
      </div>
    </div>
  );
};
