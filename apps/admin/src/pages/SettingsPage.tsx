import { Icon } from '../components/Icon';
import { Switch } from '../components/Switch';
import { usePageMeta } from '../layout/LayoutContext';
import { useApiKeysStatus, useAuditLog, useFeatureFlags, useSetFeatureFlag } from '../api/hooks/useSettings';
import { apiKeyStatusColor, apiKeyStatusLabel } from '../theme/labels';

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return "à l'instant";
  if (minutes < 60) return `il y a ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `il y a ${hours} h`;
  const days = Math.floor(hours / 24);
  return days === 1 ? 'hier' : `il y a ${days} jours`;
}

export function SettingsPage() {
  usePageMeta('Paramètres', 'Services, fonctionnalités et journal');
  const { data: apiKeys } = useApiKeysStatus();
  const { data: flags } = useFeatureFlags();
  const { data: logs } = useAuditLog();
  const setFlag = useSetFeatureFlag();

  return (
    <div className="grid grid-cards">
      <div className="card">
        <div className="card-title" style={{ marginBottom: 3 }}>
          Services d&rsquo;identification
        </div>
        <div className="card-sub">Clés gérées via variables d&rsquo;environnement</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {(apiKeys ?? []).map((k) => (
            <div key={k.env} style={{ display: 'flex', alignItems: 'center', gap: 11, padding: 12, borderRadius: 12, background: 'var(--surf2)', border: '1px solid var(--hair)' }}>
              <Icon name="key" size={19} color={apiKeyStatusColor(k.status)} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{k.nom}</div>
                <div className="numeric" style={{ fontSize: 11.5, color: 'var(--muted)' }}>{k.env}</div>
              </div>
              <span style={{ fontSize: 11.5, fontWeight: 700, color: apiKeyStatusColor(k.status) }}>{apiKeyStatusLabel(k.status)}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="card">
        <div className="card-title" style={{ marginBottom: 3 }}>
          Fonctionnalités
        </div>
        <div className="card-sub">Activation à chaud, sans redéploiement</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {(flags ?? []).map((f) => (
            <div key={f.cle} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 2px', borderBottom: '1px solid var(--hair)' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{f.libelle}</div>
                <div style={{ fontSize: 11.5, color: 'var(--muted)' }}>{f.description}</div>
              </div>
              <Switch checked={f.actif} onChange={(actif) => setFlag.mutate({ cle: f.cle, actif })} label={f.libelle} />
            </div>
          ))}
        </div>
      </div>

      <div className="card">
        <div className="card-title" style={{ marginBottom: 3 }}>
          Journal d&rsquo;activité
        </div>
        <div className="card-sub">Actions administrateurs</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 13 }}>
          {(logs ?? []).map((l) => (
            <div key={l.id} style={{ display: 'flex', gap: 11 }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--accent)', marginTop: 6, flexShrink: 0 }} />
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 12.8, lineHeight: 1.4 }}>
                  <span style={{ fontWeight: 700 }}>{l.adminPseudo}</span> {l.action}
                </div>
                <div style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 1 }}>{timeAgo(l.dateCreation)}</div>
              </div>
            </div>
          ))}
          {logs && logs.length === 0 ? <p style={{ color: 'var(--muted)', fontSize: 13 }}>Aucune action pour le moment.</p> : null}
        </div>
      </div>
    </div>
  );
}
