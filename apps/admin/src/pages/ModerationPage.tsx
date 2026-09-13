import { useState } from 'react';
import { Icon } from '../components/Icon';
import { Pagination } from '../components/Pagination';
import { usePageMeta } from '../layout/LayoutContext';
import { useIgnoreReport, useModeration, useRemoveReportedContent } from '../api/hooks/useModeration';

const LIMIT = 12;
const TYPE_LABEL: Record<string, string> = { post: 'Publication', story: 'Story', comment: 'Commentaire' };

export function ModerationPage() {
  usePageMeta('Modération', 'Publications et stories signalées');
  const [page, setPage] = useState(1);
  const { data, isLoading, isError } = useModeration({ page, limit: LIMIT });
  const ignoreReport = useIgnoreReport();
  const removeContent = useRemoveReportedContent();

  if (isLoading) return <p>Chargement…</p>;
  if (isError || !data) return <p className="error-text">Impossible de charger la file de modération.</p>;

  if (data.items.length === 0) {
    return <p style={{ color: 'var(--muted)' }}>Aucun signalement en attente — la file est vide.</p>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div className="grid grid-cards">
        {data.items.map((r) => (
          <div key={r.id} className="card" style={{ padding: 0, display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '13px 15px', borderBottom: '1px solid var(--hair)' }}>
              <div className="avatar">{r.auteurCible.charAt(0).toUpperCase()}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="truncate" style={{ fontSize: 13, fontWeight: 700 }}>{r.auteurCible}</div>
                <div style={{ fontSize: 11, color: 'var(--muted)' }}>
                  {new Date(r.dateCreation).toLocaleDateString('fr-FR')} · {TYPE_LABEL[r.targetType] ?? r.targetType}
                </div>
              </div>
              <span className="badge" style={{ background: 'var(--danger-bg)', color: 'var(--red)' }}>{r.motif}</span>
            </div>
            <div style={{ padding: '13px 15px', flex: 1 }}>
              <div style={{ fontSize: 13, lineHeight: 1.45, color: 'var(--soft)' }}>{r.extrait}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 10, fontSize: 11.5, color: 'var(--muted)' }}>
                <Icon name="flag" size={15} />
                {r.signalementsCount} signalement{r.signalementsCount > 1 ? 's' : ''}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, padding: '12px 15px', borderTop: '1px solid var(--hair)' }}>
              <button
                type="button"
                className="btn btn-secondary"
                style={{ flex: 1 }}
                onClick={() => ignoreReport.mutate(r.id)}
                disabled={ignoreReport.isPending}
              >
                Ignorer
              </button>
              <button
                type="button"
                className="btn btn-danger"
                style={{ flex: 1 }}
                onClick={() => removeContent.mutate(r.id)}
                disabled={removeContent.isPending}
              >
                Supprimer
              </button>
            </div>
          </div>
        ))}
      </div>
      <Pagination page={page} limit={LIMIT} total={data.total} onPageChange={setPage} itemLabel={(n) => `${n} signalements affichés`} />
    </div>
  );
}
