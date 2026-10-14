import { useState, type FormEvent } from 'react';
import { Navigate } from 'react-router-dom';
import { Icon } from '../components/Icon';
import { useAuth } from '../auth/AuthProvider';
import { ApiError } from '../api/client';

export function LoginPage() {
  const { state, login } = useAuth();
  const [email, setEmail] = useState('');
  const [motDePasse, setMotDePasse] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (state.status === 'authed') {
    return <Navigate to="/" replace />;
  }

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(email, motDePasse);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Connexion impossible.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-shell" style={{ background: 'var(--bg)' }}>
      <div className="login-shell">
        <div className="login-panel">
          <div className="login-brand">
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 11, marginBottom: 22 }}>
              <div
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: 8,
                  background: '#f6f3ec',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#1f3a29',
                }}
              >
                <Icon name="eco" size={24} />
              </div>
              <div style={{ lineHeight: 1.1 }}>
                <div className="brand-title" style={{ fontSize: 19 }}>PlanAI</div>
                <div style={{ fontSize: 11.5, color: '#b9c6bc', fontWeight: 600 }}>Console admin</div>
              </div>
            </div>
            <div className="login-title" style={{ position: 'relative', fontSize: 24, lineHeight: 1.25 }}>
              Administration de PlanAI
            </div>
            <p style={{ position: 'relative', fontSize: 13.5, lineHeight: 1.55, color: '#c9d3cb', marginTop: 10 }}>
              Comptes, référentiel des espèces, signalements, défis et état des
              services d&rsquo;identification.
            </p>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 8, marginTop: 22, fontSize: 12, color: '#b9c6bc' }}>
              <Icon name="lock" size={16} color="#8cc69b" />
              Accès réservé aux administrateurs
            </div>
          </div>

          <form className="login-form" onSubmit={onSubmit}>
            <div className="login-title" style={{ fontSize: 22 }}>Connexion</div>
            <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 3, marginBottom: 22 }}>
              Authentifiez-vous pour accéder à la console
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
              <div>
                <label className="field-label" htmlFor="email">
                  Adresse e-mail
                </label>
                <div className="field-input">
                  <Icon name="mail" size={19} color="var(--muted)" />
                  <input
                    id="email"
                    type="email"
                    autoComplete="username"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="admin@planai.app"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="field-label" htmlFor="password">
                  Mot de passe
                </label>
                <div className="field-input">
                  <Icon name="lock" size={19} color="var(--muted)" />
                  <input
                    id="password"
                    type={showPwd ? 'text' : 'password'}
                    autoComplete="current-password"
                    value={motDePasse}
                    onChange={(e) => setMotDePasse(e.target.value)}
                    placeholder="••••••••"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPwd((v) => !v)}
                    aria-label={showPwd ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                    style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
                  >
                    <Icon name={showPwd ? 'visibility' : 'visibility_off'} size={19} color="var(--muted)" />
                  </button>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginTop: 14 }}>
              <button
                type="button"
                onClick={() => setRemember((v) => !v)}
                style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
              >
                <Icon
                  name={remember ? 'check_box' : 'check_box_outline_blank'}
                  size={19}
                  color={remember ? 'var(--accent)' : 'var(--muted)'}
                />
                <span style={{ fontSize: 12.5, color: 'var(--soft)' }}>Se souvenir de moi</span>
              </button>
              <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--accent)', cursor: 'pointer' }}>
                Mot de passe oublié ?
              </span>
            </div>

            {error ? <div className="error-text">{error}</div> : null}

            <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: 20, padding: 14 }} disabled={loading}>
              <Icon name="login" size={19} />
              {loading ? 'Connexion…' : 'Se connecter'}
            </button>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 9,
                marginTop: 18,
                padding: '11px 13px',
                borderRadius: 12,
                background: 'var(--surf2)',
                border: '1px solid var(--hair)',
              }}
            >
              <Icon name="verified_user" size={18} color="var(--accent)" />
              <span style={{ fontSize: 11.5, color: 'var(--muted)', lineHeight: 1.4 }}>
                Double authentification requise après la première étape.
              </span>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
