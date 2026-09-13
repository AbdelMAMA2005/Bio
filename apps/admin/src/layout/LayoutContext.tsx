import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';

type LayoutContextValue = {
  title: string;
  sub: string;
  setPageMeta: (title: string, sub: string) => void;
  query: string;
  setQuery: (q: string) => void;
};

const LayoutContext = createContext<LayoutContextValue | null>(null);

/**
 * Titre/sous-titre contextuels de la barre supérieure + recherche globale — mission
 * ADMIN.md §3 ("barre supérieure : titre et sous-titre contextuels ... recherche globale
 * fonctionnelle, filtre réellement la table affichée"). Un seul champ de recherche dans le
 * topbar, sa valeur est lue directement par la page affichée (UsersPage/PlantsPage) comme
 * paramètre `q` de leur requête réelle — jamais un filtre en mémoire côté client sur des
 * données déjà chargées.
 */
export function LayoutProvider({ children }: { children: ReactNode }) {
  const [title, setTitle] = useState('');
  const [sub, setSub] = useState('');
  const [query, setQuery] = useState('');
  const location = useLocation();

  // La recherche ne doit pas "fuiter" d'une page à l'autre (rechercher "rose" dans les
  // plantes puis aller sur Utilisateurs ne doit pas y appliquer le même filtre).
  useEffect(() => {
    setQuery('');
  }, [location.pathname]);

  const value = useMemo<LayoutContextValue>(
    () => ({
      title,
      sub,
      setPageMeta: (t, s) => {
        setTitle(t);
        setSub(s);
      },
      query,
      setQuery,
    }),
    [title, sub, query],
  );

  return <LayoutContext.Provider value={value}>{children}</LayoutContext.Provider>;
}

export function useLayout(): LayoutContextValue {
  const ctx = useContext(LayoutContext);
  if (!ctx) throw new Error('useLayout doit être utilisé sous LayoutProvider');
  return ctx;
}

/** À appeler en haut de chaque page pour poser le titre/sous-titre du topbar. */
export function usePageMeta(title: string, sub: string): void {
  const { setPageMeta } = useLayout();
  useEffect(() => {
    setPageMeta(title, sub);
  }, [title, sub, setPageMeta]);
}
