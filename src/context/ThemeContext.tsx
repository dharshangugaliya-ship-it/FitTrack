/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useContext, useState, useEffect } from 'react';
import { Zap, Leaf, Trophy, Cpu } from 'lucide-react';

export type FittrackTheme = 'pulse' | 'motion' | 'arena' | 'ailab';

export interface ThemeDefinition {
  id: FittrackTheme;
  name: string;
  tagline: string;
  description: string;
  type: 'dark' | 'light';
  icon: React.ComponentType<{ className?: string }>;
  accentColor: string;
  palette: {
    primary: string;
    secondary: string;
    bgPage: string;
    bgSurface: string;
    textPrimary: string;
    border: string;
  };
  preview: {
    badgeText: string;
    statValue: string;
    statLabel: string;
    progressPercent: number;
    buttonText: string;
  };
}

export const THEMES: ThemeDefinition[] = [
  {
    id: 'pulse',
    name: 'Pulse',
    tagline: 'Energetic & Performance-Driven',
    description:
      'Dark athletic interface with vibrant electric accents, deep navy backgrounds, bright blue and cyan highlights, and glowing progress indicators.',
    type: 'dark',
    icon: Zap,
    accentColor: '#00E5FF',
    palette: {
      primary: '#00E5FF',
      secondary: '#3B82F6',
      bgPage: '#07090E',
      bgSurface: '#0E131F',
      textPrimary: '#F8FAFC',
      border: '#1E293B',
    },
    preview: {
      badgeText: 'CV VERIFIED',
      statValue: '10,000',
      statLabel: 'Squat Reps',
      progressPercent: 78,
      buttonText: 'Start Workout',
    },
  },
  {
    id: 'motion',
    name: 'Motion',
    tagline: 'Clean & Fresh',
    description:
      'Light, approachable wellness theme built around white and soft-gray surfaces with fresh green, mint, and subtle cyan accents with soft shadows.',
    type: 'light',
    icon: Leaf,
    accentColor: '#10B981',
    palette: {
      primary: '#10B981',
      secondary: '#14B8A6',
      bgPage: '#F4F6F9',
      bgSurface: '#FFFFFF',
      textPrimary: '#0F172A',
      border: '#E2E8F0',
    },
    preview: {
      badgeText: 'WELLNESS GOAL',
      statValue: '8,420',
      statLabel: 'Daily Steps',
      progressPercent: 84,
      buttonText: 'Log Activity',
    },
  },
  {
    id: 'arena',
    name: 'Arena',
    tagline: 'Competitive & Dynamic',
    description:
      'Dark championship foundation with strong amber, orange, and gold accents celebrating challenge milestones, leaderboards, rankings, and streaks.',
    type: 'dark',
    icon: Trophy,
    accentColor: '#F59E0B',
    palette: {
      primary: '#F59E0B',
      secondary: '#EA580C',
      bgPage: '#0B0A0D',
      bgSurface: '#15131A',
      textPrimary: '#FFFBEB',
      border: '#2A2533',
    },
    preview: {
      badgeText: 'RANK #1 PODIUM',
      statValue: '14 Days',
      statLabel: 'Active Streak',
      progressPercent: 92,
      buttonText: 'Compete Now',
    },
  },
  {
    id: 'ailab',
    name: 'AI Lab',
    tagline: 'Futuristic & Technology-Focused',
    description:
      'Dark futuristic interface with cyber violet, electric blue, and neon cyan accents, technical visual elements, and computer-vision HUD precision.',
    type: 'dark',
    icon: Cpu,
    accentColor: '#8B5CF6',
    palette: {
      primary: '#8B5CF6',
      secondary: '#00F2FE',
      bgPage: '#060713',
      bgSurface: '#0D0F22',
      textPrimary: '#F1F5F9',
      border: '#22274D',
    },
    preview: {
      badgeText: 'POSE 98.4% CONF',
      statValue: '98.8%',
      statLabel: 'Form Accuracy',
      progressPercent: 96,
      buttonText: 'Analyze Form',
    },
  },
];

const THEME_STORAGE_KEY = 'fittrack_theme';

interface ThemeContextType {
  theme: FittrackTheme;
  setTheme: (theme: FittrackTheme) => void;
  currentTheme: ThemeDefinition;
  themes: ThemeDefinition[];
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<FittrackTheme>(() => {
    if (typeof localStorage !== 'undefined') {
      const stored = localStorage.getItem(THEME_STORAGE_KEY) as FittrackTheme;
      if (stored && ['pulse', 'motion', 'arena', 'ailab'].includes(stored)) {
        return stored;
      }
    }
    return 'pulse';
  });

  const setTheme = (newTheme: FittrackTheme) => {
    setThemeState(newTheme);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, newTheme);
    } catch (e) {
      console.warn('Failed to save theme in localStorage:', e);
    }
  };

  useEffect(() => {
    // Apply theme attribute to document element and body
    const root = document.documentElement;
    root.setAttribute('data-theme', theme);
    document.body.setAttribute('data-theme', theme);

    if (theme === 'motion') {
      root.classList.add('theme-motion-light');
      root.classList.remove('theme-dark');
    } else {
      root.classList.remove('theme-motion-light');
      root.classList.add('theme-dark');
    }

    // Broadcast theme update
    window.dispatchEvent(new CustomEvent('fittrack_theme_changed', { detail: { theme } }));
  }, [theme]);

  const currentTheme = THEMES.find((t) => t.id === theme) || THEMES[0];

  return (
    <ThemeContext.Provider value={{ theme, setTheme, currentTheme, themes: THEMES }}>
      {children}
    </ThemeContext.Provider>
  );
};

export function useTheme(): ThemeContextType {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
