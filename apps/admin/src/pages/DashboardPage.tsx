import { Link } from 'react-router-dom';
import { Icon } from '../components/Icon';
import { usePageMeta } from '../layout/LayoutContext';
import { useStats } from '../api/hooks/useStats';
import { serviceStatusColor, serviceStatusLabel } from '../theme/labels';

const KPI_META = [
  { key: 'utilisateursActifs', label: 'Utilisateurs actifs', icon: 'group', color: 'var(--accent)' },
  { key: 'identifications7j', label: 'Identifications', icon: 'center_focus_strong', color: 'var(--blue)' },
  { key: 'especesReferencees', label: 'Espèces référencées', icon: 'local_florist', color: 'var(--purple)' },
  { key: 'signalements', label: 'Signalements', icon: 'flag', color: 'var(--red)' },
] as const;

function trendFor(kpi: NonNullable<ReturnType<typeof useStats>['data']>['kpi'], key: (typeof KPI_META)[number]['key']) {
  switch (key) {
    case 'utilisateursActifs':
      return { text: `${kpi.utilisateursActifsTrendPct}% actifs (7j)`, icon: 'trending_up', ok: true };
    case 'identifications7j':
      return {
        text: `${kpi.identificationsTrendPct >= 0 ? '+' : ''}${kpi.identificationsTrendPct}%`,
        icon: kpi.identificationsTrendPct >= 0 ? 'trending_up' : 'trending_down',
        ok: kpi.identificationsTrendPct >= 0,
      };
    case 'especesReferencees':
      return { text: `+${kpi.especesTrendCount} ce mois`, icon: 'add', ok: true };
    case 'signalements':
      return {
        text: `${kpi.signalementsTrendCount >= 0 ? '+' : ''}${kpi.signalementsTrendCount} vs hier`,
        icon: kpi.signalementsTrendCount > 0 ? 'trending_up' : 'trending_down',
        ok: kpi.signalementsTrendCount <= 0,
      };
  }
}

export function DashboardPage() {
  usePageMeta('Tableau de bord', "Vue d'ensemble de l'activité PlanAI");
  const { data, isLoading, isError } = useStats();

  if (isLoading) return <p>Chargement des statistiques…</p>;
  if (isError || !data) return <p className="error-text">Impossible de charger les statistiques.</p>;

  const maxChart = Math.max(...data.chart7j.map((c) => c.valeur), 1);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div className="grid grid-kpi">
        {KPI_META.map((meta) => {
          const value = data.kpi[meta.key];
          const trend = trendFor(data.kpi, meta.key);
          return (
            <div className="card" key={meta.key}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 12.5, color: 'var(--muted)', fontWeight: 600 }}>{meta.label}</span>
                <Icon name={meta.icon} size={19} color={meta.color} />
              </div>
              <div className="numeric" style={{ fontSize: 27, fontWeight: 700, marginTop: 9, letterSpacing: '-.5px' }}>
                {value.toLocaleString('fr-FR')}
              </div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 5,
                  marginTop: 4,
                  fontSize: 12,
                  fontWeight: 600,
                  color: trend.ok ? 'var(--green)' : 'var(--red)',
                }}
              >
                <Icon name={trend.icon} size={15} />
                {trend.text}
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-2">
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <div>
              <div className="card-title">Identifications</div>
              <div style={{ fontSize: 12, color: 'var(--muted)' }}>7 derniers jours</div>
            </div>
            <span
              style={{
                background: 'var(--accent-soft)',
                color: 'var(--accent)',
                fontSize: 11.5,
                fontWeight: 700,
                padding: '5px 10px',
                borderRadius: 9,
              }}
            >
              {data.kpi.identifications7j.toLocaleString('fr-FR')} total
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10, height: 150 }}>
            {data.chart7j.map((c, i) => (
              <div
                key={`${c.jour}-${i}`}
                style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 7, height: '100%', justifyContent: 'flex-end' }}
              >
                <span className="numeric" style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 600 }}>
                  {c.valeur}
                </span>
                <div
                  style={{
                    width: '100%',
                    height: `${Math.max((c.valeur / maxChart) * 100, 2)}%`,
                    borderRadius: '7px 7px 3px 3px',
                    background:
                      i === data.chart7j.length - 1
                        ? 'linear-gradient(180deg,#4ade80,#a3e635)'
                        : 'var(--pill)',
                  }}
                />
                <span style={{ fontSize: 11, color: 'var(--muted)' }}>{c.jour}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <div className="card-title" style={{ marginBottom: 3 }}>
            Répartition par rareté
          </div>
          <div className="card-sub">Captures enregistrées</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 13 }}>
            {data.raretes.map((r) => (
              <div key={r.rarete}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 13, fontWeight: 600 }}>
                    <span style={{ width: 9, height: 9, borderRadius: '50%', background: rarityDotColor(r.rarete) }} />
                    {r.rarete}
                  </span>
                  <span className="numeric" style={{ fontSize: 12.5, color: 'var(--muted)', fontWeight: 600 }}>
                    {r.count.toLocaleString('fr-FR')}
                  </span>
                </div>
                <div style={{ height: 8, borderRadius: 5, background: 'var(--pill)', overflow: 'hidden' }}>
                  <div style={{ width: `${r.pct}%`, height: '100%', borderRadius: 5, background: rarityDotColor(r.rarete) }} />
                </div>
              </div>
            ))}
            {data.raretes.length === 0 ? <p style={{ color: 'var(--muted)', fontSize: 13 }}>Aucune capture pour le moment.</p> : null}
          </div>
        </div>
      </div>

      <div className="grid grid-2">
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <div className="card-title">À traiter</div>
            <Link to="/moderation" style={{ fontSize: 12.5, fontWeight: 600 }}>
              Ouvrir la modération
            </Link>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <TodoRow icon="flag" color="var(--red)" tint="rgba(224,82,82,.12)" label="Publications signalées" meta="dont anciennes de plus de 24 h" count={data.aTraiter.publicationsSignalees} />
            <TodoRow icon="fact_check" color="var(--amber)" tint="rgba(251,191,36,.15)" label="Espèces à valider" meta="pas encore suivi par le back" count={data.aTraiter.especesAValider} />
            <TodoRow icon="help" color="var(--blue)" tint="rgba(56,189,248,.14)" label="Identifications douteuses" meta="pas encore suivi par le back" count={data.aTraiter.identificationsDouteuses} />
          </div>
        </div>

        <div className="card">
          <div className="card-title" style={{ marginBottom: 14 }}>
            Santé des services
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
            {data.services.map((s) => (
              <div key={s.nom} style={{ display: 'flex', alignItems: 'center', gap: 11, paddingBottom: 11, borderBottom: '1px solid var(--hair)' }}>
                <span style={{ width: 9, height: 9, borderRadius: '50%', background: serviceStatusColor(s.status), flexShrink: 0 }} />
                <span style={{ flex: 1, minWidth: 0, fontSize: 13, fontWeight: 600 }}>{s.nom}</span>
                <span className="numeric" style={{ fontSize: 12, color: 'var(--muted)' }}>
                  {s.latenceMs != null ? `${s.latenceMs} ms` : '—'}
                </span>
                <span style={{ fontSize: 11.5, fontWeight: 700, color: serviceStatusColor(s.status) }}>
                  {serviceStatusLabel(s.status)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function rarityDotColor(rarete: string): string {
  if (rarete === 'Rare') return 'var(--blue)';
  if (rarete === 'Épique') return 'var(--purple)';
  return 'var(--gray)';
}

function TodoRow({
  icon,
  color,
  tint,
  label,
  meta,
  count,
}: {
  icon: string;
  color: string;
  tint: string;
  label: string;
  meta: string;
  count: number;
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 12px', borderRadius: 12, background: 'var(--surf2)', border: '1px solid var(--hair)' }}>
      <div style={{ width: 34, height: 34, borderRadius: 10, background: tint, display: 'flex', alignItems: 'center', justifyContent: 'center', color, flexShrink: 0 }}>
        <Icon name={icon} size={18} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600 }}>{label}</div>
        <div style={{ fontSize: 11.5, color: 'var(--muted)' }}>{meta}</div>
      </div>
      <span className="numeric" style={{ fontSize: 15, fontWeight: 700, color }}>
        {count}
      </span>
    </div>
  );
}
