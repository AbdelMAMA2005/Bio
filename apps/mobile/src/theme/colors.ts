import type { EtatSante, Rarete } from '@planai/shared';

import type { IconName } from '@/theme/icons';

/**
 * Direction « herbier naturaliste » : papier crème, vert forêt en couleur pleine, aucun
 * dégradé. L'accent est identique dans les deux thèmes (texte blanc dessus, 6:1).
 */
export const Accent = '#2f6e40';
export const AccentOnColor = '#ffffff';

export type AppColors = {
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
  /** Liens, icônes et éléments actifs (version lisible de l'accent sur le fond du thème). */
  active: string;
  /** Fond teinté discret derrière un élément actif. */
  activeSoft: string;
  idle: string;
  statusBarText: string;
};

export type ThemeMode = 'dark' | 'light';

export const Palette: Record<ThemeMode, AppColors> = {
  dark: {
    screen: '#111813',
    surface: '#18221b',
    text: '#eceee8',
    muted: '#9aa89e',
    soft: '#c9d3cb',
    border: 'rgba(236,238,232,0.11)',
    hairline: 'rgba(236,238,232,0.06)',
    glass: 'rgba(17,24,19,0.94)',
    tabBar: '#151e18',
    tabBorder: 'rgba(236,238,232,0.09)',
    chip: '#202c24',
    active: '#8cc69b',
    activeSoft: 'rgba(140,198,155,0.14)',
    idle: '#6e7c72',
    statusBarText: '#eceee8',
  },
  light: {
    screen: '#f6f3ec',
    surface: '#ffffff',
    text: '#1c2620',
    muted: '#5c6b61',
    soft: '#34443a',
    border: 'rgba(28,38,32,0.12)',
    hairline: 'rgba(28,38,32,0.07)',
    glass: 'rgba(255,255,255,0.94)',
    tabBar: '#ffffff',
    tabBorder: 'rgba(28,38,32,0.10)',
    chip: '#ece7dc',
    active: '#2f6e40',
    activeSoft: 'rgba(47,110,64,0.10)',
    idle: '#8a958d',
    statusBarText: '#1c2620',
  },
};

export const RarityColors: Record<Rarete, { bg: string; text: string }> = {
  commun: { bg: 'rgba(154,168,158,0.16)', text: '#b4c0b7' },
  rare: { bg: 'rgba(122,170,214,0.16)', text: '#9cc3e6' },
  epique: { bg: 'rgba(190,150,210,0.16)', text: '#d2b1e2' },
};

export const RarityColorsLight: Record<Rarete, { bg: string; text: string }> = {
  commun: { bg: '#ece7dc', text: '#4d5a51' },
  rare: { bg: '#e3edf6', text: '#2b5f8a' },
  epique: { bg: '#f0e7f3', text: '#6b3f7a' },
};

export const HealthColors: Record<EtatSante, string> = {
  sain: '#4e9a5e',
  alerte: '#b7811a',
  malade: '#c8504a',
};

export const HealthIcons: Record<EtatSante, IconName> = {
  sain: 'check_circle',
  alerte: 'warning',
  malade: 'error',
};

/** Tons moyens lisibles sur les deux thèmes (ces constantes ne dépendent pas du thème). */
export const ToxicityColors = {
  safe: { bg: 'rgba(78,154,94,0.14)', text: '#4e9a5e' },
  toxic: { bg: 'rgba(200,80,74,0.14)', text: '#c8504a' },
  unknown: { bg: 'rgba(183,129,26,0.14)', text: '#b7811a' },
} as const;

export const AmberAccent = { bg: 'rgba(183,129,26,0.14)', text: '#b7811a' } as const;
