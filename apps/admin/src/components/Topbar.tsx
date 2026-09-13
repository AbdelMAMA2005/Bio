import { Icon } from './Icon';
import { useTheme } from '../theme/ThemeProvider';
import { useLayout } from '../layout/LayoutContext';

export function Topbar() {
  const { title, sub, query, setQuery } = useLayout();
  const { density, toggleDensity } = useTheme();

  return (
    <header className="topbar">
      <div style={{ minWidth: 0, flex: 1 }}>
        <div className="page-title">{title}</div>
        <div className="page-sub">{sub}</div>
      </div>
      <div className="search-box">
        <Icon name="search" size={18} color="var(--muted)" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Rechercher…"
          aria-label="Recherche"
        />
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <button
          type="button"
          className="icon-btn"
          title="Densité"
          onClick={toggleDensity}
          aria-label={`Densité : ${density}`}
        >
          <Icon name={density === 'compact' ? 'density_medium' : 'density_small'} size={19} />
        </button>
        <button type="button" className="icon-btn" aria-label="Notifications">
          <Icon name="notifications" size={19} />
          <span
            style={{
              position: 'absolute',
              top: 7,
              right: 8,
              width: 7,
              height: 7,
              borderRadius: '50%',
              background: '#e05252',
            }}
          />
        </button>
      </div>
    </header>
  );
}
