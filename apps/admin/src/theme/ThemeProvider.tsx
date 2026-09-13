import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

type Theme = 'light' | 'dark';
type Density = 'confortable' | 'compact';

type ThemeContextValue = {
  theme: Theme;
  density: Density;
  toggleTheme: () => void;
  toggleDensity: () => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

const THEME_KEY = 'planai-admin-theme';
const DENSITY_KEY = 'planai-admin-density';

function readStored<T extends string>(key: string, fallback: T): T {
  try {
    const value = localStorage.getItem(key);
    return (value as T) || fallback;
  } catch {
    return fallback;
  }
}

/**
 * Choix clair/sombre + densité persistés (localStorage) — mission ADMIN.md §2. Posés sur
 * `document.documentElement` (`data-theme`/`data-density`) pour que les variables CSS de
 * theme/global.css s'appliquent à toute la page, pas seulement à un wrapper interne.
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() => readStored(THEME_KEY, 'light'));
  const [density, setDensity] = useState<Density>(() => readStored(DENSITY_KEY, 'confortable'));

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    try {
      localStorage.setItem(THEME_KEY, theme);
    } catch {
      // Stockage indisponible (navigation privée...) : le choix reste actif pour la session.
    }
  }, [theme]);

  useEffect(() => {
    document.documentElement.setAttribute('data-density', density);
    try {
      localStorage.setItem(DENSITY_KEY, density);
    } catch {
      // idem
    }
  }, [density]);

  const value = useMemo<ThemeContextValue>(
    () => ({
      theme,
      density,
      toggleTheme: () => setTheme((t) => (t === 'light' ? 'dark' : 'light')),
      toggleDensity: () => setDensity((d) => (d === 'confortable' ? 'compact' : 'confortable')),
    }),
    [theme, density],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme doit être utilisé sous ThemeProvider');
  return ctx;
}
