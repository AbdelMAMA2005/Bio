import type { EtatSante, Rarete } from '@planai/shared';

import type { IconName } from '@/theme/icons';

export const AccentGradient = ['#4ade80', '#a3e635'] as const;
export const AccentOnColor = '#13251a';

export const StoryGradient = ['#4ade80', '#a3e635', '#c084fc'] as const;

type GradientColors = readonly [string, string, ...string[]];

export type AppColors = {
  backdropGradient: GradientColors;
  scanGradient: GradientColors;
  headerGradient: GradientColors;
  screen: string;
  surface: string;
  text: string;
  muted: string;
  soft: string;
  border: string;
  hairline: string;
  glass: string;
  tabBar: string;
  tabBorder: string;
  chip: string;
  active: string;
  idle: string;
  statusBarText: string;
};

export type ThemeMode = 'dark' | 'light';

export const Palette: Record<ThemeMode, AppColors> = {
  dark: {
    backdropGradient: ['#1c3b2e', '#0e1c16', '#0a1410'],
    scanGradient: ['#1d3326', '#16241c', '#0f1b14'],
    headerGradient: ['#1f3528', '#16241c'],
    screen: '#0f1b14',
    surface: '#16261d',
    text: '#f0f7f2',
    muted: '#8fb3a0',
    soft: '#cfe3d6',
    border: 'rgba(255,255,255,0.08)',
    hairline: 'rgba(255,255,255,0.06)',
    glass: 'rgba(13,24,18,0.78)',
    tabBar: '#13241b',
    tabBorder: 'rgba(255,255,255,0.08)',
    chip: '#1d3226',
    active: '#5aa832',
    idle: '#6f8a7c',
    statusBarText: '#f0f7f2',
  },
  light: {
    backdropGradient: ['#cfe4cb', '#b9d2b3', '#aac6a3'],
    scanGradient: ['#1d3326', '#16241c', '#0f1b14'],
    headerGradient: ['#dcecd7', '#cde2c8'],
    screen: '#eef3ea',
    surface: '#ffffff',
    text: '#15271d',
    muted: '#5e7a6a',
    soft: '#33503f',
    border: 'rgba(0,0,0,0.08)',
    hairline: 'rgba(0,0,0,0.05)',
    glass: 'rgba(255,255,255,0.84)',
    tabBar: '#ffffff',
    tabBorder: 'rgba(0,0,0,0.07)',
    chip: '#e4eede',
    active: '#5aa832',
    idle: '#9bb3a4',
    statusBarText: '#15271d',
  },
};

export const RarityColors: Record<Rarete, { bg: string; text: string }> = {
  commun: { bg: 'rgba(143,179,160,0.2)', text: '#8fb3a0' },
  rare: { bg: 'rgba(56,189,248,0.2)', text: '#38bdf8' },
  epique: { bg: 'rgba(192,132,252,0.22)', text: '#c084fc' },
};

export const RarityColorsLight: Record<Rarete, { bg: string; text: string }> = {
  commun: { bg: 'rgba(143,179,160,0.2)', text: '#5e7a6a' },
  rare: { bg: 'rgba(56,189,248,0.2)', text: '#1f8fc4' },
  epique: { bg: 'rgba(192,132,252,0.22)', text: '#9333ea' },
};

export const HealthColors: Record<EtatSante, string> = {
  sain: '#3a9d4f',
  alerte: '#e0972a',
  malade: '#d24744',
};

export const HealthIcons: Record<EtatSante, IconName> = {
  sain: 'check_circle',
  alerte: 'warning',
  malade: 'error',
};

export const ToxicityColors = {
  safe: { bg: 'rgba(74,222,128,0.16)', text: '#4ade80' },
  toxic: { bg: 'rgba(240,100,100,0.16)', text: '#f06464' },
  unknown: { bg: 'rgba(251,191,36,0.16)', text: '#fbbf24' },
} as const;

export const AmberAccent = { bg: 'rgba(224,151,42,0.16)', text: '#e0972a' } as const;
