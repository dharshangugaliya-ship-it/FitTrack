import React from 'react';
import { VerificationStatus } from '../types';
import { Sparkles, Watch, ShieldCheck, UserCheck } from 'lucide-react';

interface VerificationBadgeProps {
  status: VerificationStatus;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
  className?: string;
}

export const VerificationBadge: React.FC<VerificationBadgeProps> = ({
  status,
  size = 'md',
  showIcon = true,
  className = '',
}) => {
  const getBadgeConfig = () => {
    switch (status) {
      case 'AI_VERIFIED':
        return {
          label: 'AI Verified',
          icon: Sparkles,
          bg: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
          dot: 'bg-emerald-400',
        };
      case 'DEVICE_VERIFIED':
        return {
          label: 'Device Verified',
          icon: Watch,
          bg: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30',
          dot: 'bg-cyan-400',
        };
      case 'ORGANIZER_APPROVED':
        return {
          label: 'Organizer Approved',
          icon: ShieldCheck,
          bg: 'bg-indigo-500/10 text-indigo-300 border-indigo-500/30',
          dot: 'bg-indigo-400',
        };
      case 'SELF_REPORTED':
        return {
          label: 'Self-reported — not AI verified',
          icon: UserCheck,
          bg: 'bg-amber-500/10 text-amber-300 border-amber-500/30',
          dot: 'bg-amber-400',
        };
      default:
        return {
          label: 'Unverified',
          icon: UserCheck,
          bg: 'bg-slate-500/10 text-slate-400 border-slate-500/30',
          dot: 'bg-slate-400',
        };
    }
  };

  const config = getBadgeConfig();
  const IconComponent = config.icon;

  const sizeClasses = {
    sm: 'text-[11px] px-2 py-0.5 gap-1',
    md: 'text-xs px-2.5 py-1 gap-1.5',
    lg: 'text-sm px-3.5 py-1.5 gap-2 font-medium',
  };

  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-3.5 h-3.5',
    lg: 'w-4 h-4',
  };

  return (
    <span
      className={`inline-flex items-center rounded-full border font-medium whitespace-nowrap shadow-xs select-none ${config.bg} ${sizeClasses[size]} ${className}`}
      title={config.label}
    >
      {showIcon && <IconComponent className={`${iconSizes[size]} shrink-0`} />}
      <span>{config.label}</span>
    </span>
  );
};
