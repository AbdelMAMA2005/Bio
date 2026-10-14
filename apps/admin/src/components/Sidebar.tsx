import { NavLink } from 'react-router-dom';
import { Icon } from './Icon';
import { useTheme } from '../theme/ThemeProvider';
import { useAuth } from '../auth/AuthProvider';
import { useStats } from '../api/hooks/useStats';
import { roleLabel } from '../theme/labels';

const NAV_ITEMS = [
  { to: '/', label: 'Tableau de bord', icon: 'dashboard', end: true },
  { to: '/utilisateurs', label: 'Utilisateurs', icon: 'group' },
  { to: '/referentiel', label: 'Référentiel', icon: 'local_florist' },
  { to: '/moderation', label: 'Modération', icon: 'shield', badgeKey: 'moderation' as const },
  { to: '/defis', label: 'Défis', icon: 'flag' },
  { to: '/parametres', label: 'Paramètres', icon: 'settings' },
];

export function Sidebar() {
  const { theme, toggleTheme } = useTheme();
  const { state, logout } = useAuth();
  const { data: stats } = useStats();
  const reportsCount = stats?.aTraiter.publicationsSignalees ?? 0;

  const me = state.status === 'authed' ? state.me : null;

  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-mark">
          <Icon name="eco" size={22} color="var(--on-accent)" />
        </div>
        <div>
          <div className="brand-title">PlanAI</div>
          <div className="brand-sub">Console admin</div>
        </div>
      </div>

      <nav className="nav">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
          >
            <Icon name={item.icon} size={20} />
            <span className="label">{item.label}</span>
            {item.badgeKey === 'moderation' && reportsCount > 0 ? (
              <span className="nav-badge">{reportsCount}</span>
            ) : null}
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-bottom">
        <button type="button" className="theme-toggle" onClick={toggleTheme}>
          <Icon name={theme === 'dark' ? 'light_mode' : 'dark_mode'} size={19} />
          {theme === 'dark' ? 'Thème clair' : 'Thème sombre'}
        </button>
        {me ? (
          <div className="profile-card">
            <div className="avatar">{me.nomUtilisateur.charAt(0).toUpperCase()}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="profile-name">{me.nomUtilisateur}</div>
              <div className="profile-role">{roleLabel(me.role)}</div>
            </div>
            <button
              type="button"
              onClick={logout}
              title="Se déconnecter"
              aria-label="Se déconnecter"
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
            >
              <Icon name="logout" size={19} color="var(--muted)" />
            </button>
          </div>
        ) : null}
      </div>
    </aside>
  );
}
