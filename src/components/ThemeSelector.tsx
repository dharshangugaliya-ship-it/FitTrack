/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useTheme, FittrackTheme, ThemeDefinition } from '../context/ThemeContext';
import { Check, Sparkles, Sliders, Palette } from 'lucide-react';

interface ThemeSelectorProps {
  contextName?: 'Athlete' | 'Organizer';
}

export const ThemeSelector: React.FC<ThemeSelectorProps> = ({ contextName = 'Athlete' }) => {
  const { theme, setTheme, themes, currentTheme } = useTheme();
  const [recentlyChanged, setRecentlyChanged] = useState<string | null>(null);

  const handleSelectTheme = (themeId: FittrackTheme, themeName: string) => {
    if (themeId === theme) return;
    setTheme(themeId);
    setRecentlyChanged(themeName);
    setTimeout(() => {
      setRecentlyChanged(null);
    }, 3000);
  };

  return (
    <div className="rounded-3xl bg-[#121722] border border-white/8 p-6 sm:p-8 space-y-6">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/8 pb-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Palette className="w-4 h-4" />
            </div>
            <h3 className="text-lg font-bold text-white tracking-tight">Theme & Visual Identity</h3>
          </div>
          <p className="text-xs sm:text-sm text-slate-400 leading-relaxed max-w-2xl">
            Personalize your {contextName} experience across all dashboards, workout HUDs, leaderboards, and analytics.
            Select from four professionally engineered aesthetics calibrated for performance.
          </p>
        </div>

        {/* Current Active Indicator Pill */}
        <div className="flex items-center gap-2.5 self-start sm:self-auto px-3.5 py-1.5 rounded-full bg-white/5 border border-white/10 shrink-0">
          <span className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: currentTheme.accentColor }} />
          <span className="text-xs font-mono font-semibold text-slate-300">
            Current: <strong className="text-white">{currentTheme.name}</strong>
          </span>
          <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-white/10 text-slate-300">
            {currentTheme.type}
          </span>
        </div>
      </div>

      {/* Instant Notification Banner upon change */}
      {recentlyChanged && (
        <div className="flex items-center justify-between px-4 py-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs animate-in fade-in slide-in-from-top-1 duration-200">
          <div className="flex items-center gap-2 font-medium">
            <Check className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>
              <strong>{recentlyChanged}</strong> theme applied instantly across navigation, cards, HUD, and leaderboards!
            </span>
          </div>
          <span className="text-[10px] font-mono text-emerald-400/80 uppercase tracking-wider">Saved to Profile</span>
        </div>
      )}

      {/* Grid of 4 Theme Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {themes.map((t: ThemeDefinition) => {
          const isSelected = theme === t.id;
          const Icon = t.icon;

          return (
            <div
              key={t.id}
              onClick={() => handleSelectTheme(t.id, t.name)}
              className={`group relative flex flex-col justify-between rounded-2xl p-5 cursor-pointer transition-all duration-200 text-left ${
                isSelected
                  ? 'bg-white/6 ring-2 shadow-xl'
                  : 'bg-white/2 hover:bg-white/4 border border-white/6 hover:border-white/12'
              }`}
              style={{
                borderColor: isSelected ? t.accentColor : undefined,
                boxShadow: isSelected ? `0 0 25px ${t.accentColor}25` : undefined,
              }}
            >
              {/* Top Row: Icon, Title, Tagline & Active Indicator */}
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div
                      className="flex h-10 w-10 items-center justify-center rounded-xl transition-transform group-hover:scale-105"
                      style={{
                        backgroundColor: `${t.palette.primary}18`,
                        border: `1px solid ${t.palette.primary}35`,
                        color: t.palette.primary,
                      }}
                    >
                      <Icon className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-base font-bold text-white group-hover:text-slate-100 transition-colors">
                          {t.name}
                        </h4>
                        <span
                          className="text-[10px] uppercase font-mono font-bold px-1.5 py-0.5 rounded"
                          style={{
                            backgroundColor: `${t.palette.primary}20`,
                            color: t.palette.primary,
                          }}
                        >
                          {t.type}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 font-medium">{t.tagline}</p>
                    </div>
                  </div>

                  {/* Radio / Check button */}
                  <div
                    className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full transition-all duration-200 ${
                      isSelected
                        ? 'text-slate-950 font-bold scale-105'
                        : 'border border-white/20 text-transparent hover:border-white/40'
                    }`}
                    style={{
                      backgroundColor: isSelected ? t.accentColor : 'transparent',
                    }}
                  >
                    <Check className={`w-3.5 h-3.5 ${isSelected ? 'opacity-100' : 'opacity-0'}`} />
                  </div>
                </div>

                {/* Description */}
                <p className="text-xs text-slate-300/90 leading-relaxed min-h-[36px]">
                  {t.description}
                </p>

                {/* Miniature FITTRACK Interface Preview */}
                <div
                  className="rounded-xl p-3 border space-y-2.5 transition-all overflow-hidden select-none"
                  style={{
                    backgroundColor: t.palette.bgPage,
                    borderColor: t.palette.border,
                  }}
                >
                  {/* Mini App Header */}
                  <div
                    className="flex items-center justify-between px-2.5 py-1.5 rounded-lg border text-[10px]"
                    style={{
                      backgroundColor: t.palette.bgSurface,
                      borderColor: t.palette.border,
                      color: t.palette.textPrimary,
                    }}
                  >
                    <div className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: t.palette.primary }} />
                      <span className="font-bold tracking-tight">FITTRACK</span>
                    </div>
                    <span
                      className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold"
                      style={{
                        backgroundColor: `${t.palette.primary}20`,
                        color: t.palette.primary,
                      }}
                    >
                      {t.preview.badgeText}
                    </span>
                  </div>

                  {/* Mini Card Content */}
                  <div
                    className="rounded-lg p-2.5 border space-y-2"
                    style={{
                      backgroundColor: t.palette.bgSurface,
                      borderColor: t.palette.border,
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-slate-400">{t.preview.statLabel}</span>
                      <span className="text-xs font-mono font-bold" style={{ color: t.palette.textPrimary }}>
                        {t.preview.statValue}
                      </span>
                    </div>

                    {/* Mini Progress Bar */}
                    <div className="h-1.5 w-full rounded-full bg-white/10 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${t.preview.progressPercent}%`,
                          background: `linear-gradient(90deg, ${t.palette.primary} 0%, ${t.palette.secondary} 100%)`,
                          boxShadow: `0 0 8px ${t.palette.primary}60`,
                        }}
                      />
                    </div>

                    {/* Mini Action Button */}
                    <div className="flex items-center justify-between pt-0.5">
                      <span className="text-[9px] font-mono text-slate-400">
                        {t.preview.progressPercent}% Target
                      </span>
                      <button
                        tabIndex={-1}
                        className="px-2 py-0.5 rounded text-[9px] font-bold shadow-xs pointer-events-none"
                        style={{
                          background: `linear-gradient(135deg, ${t.palette.primary} 0%, ${t.palette.secondary} 100%)`,
                          color: t.type === 'light' ? '#FFFFFF' : '#07090E',
                        }}
                      >
                        {t.preview.buttonText}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Bottom: Palette Swatches & Selection Status */}
              <div className="pt-4 mt-3 border-t border-white/6 flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-mono text-slate-400 mr-1 uppercase">Palette:</span>
                  <div
                    className="w-4 h-4 rounded-md border border-white/20 shadow-xs"
                    title={`Base Background: ${t.palette.bgPage}`}
                    style={{ backgroundColor: t.palette.bgPage }}
                  />
                  <div
                    className="w-4 h-4 rounded-md border border-white/20 shadow-xs"
                    title={`Card Surface: ${t.palette.bgSurface}`}
                    style={{ backgroundColor: t.palette.bgSurface }}
                  />
                  <div
                    className="w-4 h-4 rounded-md border border-white/20 shadow-xs"
                    title={`Primary Accent: ${t.palette.primary}`}
                    style={{ backgroundColor: t.palette.primary }}
                  />
                  <div
                    className="w-4 h-4 rounded-md border border-white/20 shadow-xs"
                    title={`Secondary Accent: ${t.palette.secondary}`}
                    style={{ backgroundColor: t.palette.secondary }}
                  />
                  <div
                    className="w-4 h-4 rounded-md border border-white/20 shadow-xs"
                    title={`Text Tone: ${t.palette.textPrimary}`}
                    style={{ backgroundColor: t.palette.textPrimary }}
                  />
                </div>

                <span
                  className={`text-xs font-semibold px-2 py-0.5 rounded-md transition-colors ${
                    isSelected
                      ? 'bg-emerald-500/20 text-emerald-400 font-bold'
                      : 'text-slate-400 group-hover:text-white'
                  }`}
                >
                  {isSelected ? '✓ Active Theme' : 'Apply Theme'}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
