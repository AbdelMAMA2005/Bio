import { useState } from 'react';
import { Icon } from '../components/Icon';
import { Switch } from '../components/Switch';
import { Modal } from '../components/Modal';
import { usePageMeta } from '../layout/LayoutContext';
import { useAdminQuests, useCreateQuest, useUpdateQuest, type CreateQuestInput } from '../api/hooks/useQuests';
import { useAuth } from '../auth/AuthProvider';
import { ApiError } from '../api/client';
import type { AdminQuestType } from '@planai/shared';

export function QuestsPage() {
  usePageMeta('Défis', 'Quotidiens, exploration et récompenses');
  const { state } = useAuth();
  const isAdmin = state.status === 'authed' && state.me.role === 'admin';
  const { data, isLoading, isError } = useAdminQuests();
  const updateQuest = useUpdateQuest();
  const [creating, setCreating] = useState(false);

  if (isLoading) return <p>Chargement…</p>;
  if (isError || !data) return <p className="error-text">Impossible de charger les défis.</p>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {isAdmin ? (
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button type="button" className="btn btn-primary" onClick={() => setCreating(true)}>
            <Icon name="add" size={18} />
            Nouveau défi
          </button>
        </div>
      ) : null}

      <div className="table-wrap scroll">
        <div style={{ minWidth: 720 }}>
          <div className="table-head" style={{ gridTemplateColumns: '2.6fr 1.1fr 1.2fr 1.1fr 70px' }}>
            <span>Défi</span>
            <span>Type</span>
            <span>Récompense</span>
            <span>Complétion</span>
            <span>Actif</span>
          </div>
          {data.map((q) => (
            <div key={q.id} className="table-row" style={{ gridTemplateColumns: '2.6fr 1.1fr 1.2fr 1.1fr 70px' }}>
              <div className="cell-user">
                <Icon name={q.type === 'exploration' ? 'explore' : 'flag'} size={19} color="var(--accent)" />
                <span className="truncate" style={{ fontSize: 13.5, fontWeight: 600 }}>{q.libelle}</span>
              </div>
              <span className="badge" style={{ background: 'var(--pill)', color: 'var(--soft)', justifySelf: 'start' }}>
                {q.type === 'exploration' ? 'Exploration' : 'Quotidien'}
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, fontWeight: 700, color: 'var(--accent)' }}>
                +{q.recompenseXp} XP
                {q.recompensePieces > 0 ? (
                  <span style={{ display: 'flex', alignItems: 'center', gap: 3, color: '#c98a00' }}>
                    <Icon name="paid" size={14} />+{q.recompensePieces}
                  </span>
                ) : null}
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ flex: 1, height: 7, borderRadius: 5, background: 'var(--pill)', overflow: 'hidden', minWidth: 40 }}>
                  <div style={{ width: `${q.tauxCompletion}%`, height: '100%', background: 'var(--accent-fill)', borderRadius: 5 }} />
                </div>
                <span className="numeric" style={{ fontSize: 11.5, color: 'var(--muted)' }}>{q.tauxCompletion}%</span>
              </div>
              <div style={{ justifySelf: 'center' }}>
                <Switch checked={q.actif} onChange={(actif) => updateQuest.mutate({ id: q.id, input: { actif } })} label={`Activer ${q.libelle}`} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {creating ? <CreateQuestModal onClose={() => setCreating(false)} /> : null}
    </div>
  );
}

function CreateQuestModal({ onClose }: { onClose: () => void }) {
  const createQuest = useCreateQuest();
  const [form, setForm] = useState<CreateQuestInput>({
    id: '',
    libelle: '',
    type: 'quotidien',
    objectif: 1,
    recompenseXp: 10,
    recompensePieces: 0,
  });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const onSubmit = async () => {
    setError(null);
    setSaving(true);
    try {
      await createQuest.mutateAsync(form);
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Création impossible.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title="Nouveau défi" onClose={onClose}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <label style={{ display: 'block' }}>
          <span className="field-label">Identifiant (slug, ex: "post-3-photos")</span>
          <div className="field-input">
            <input value={form.id} onChange={(e) => setForm({ ...form, id: e.target.value.trim() })} />
          </div>
        </label>
        <label style={{ display: 'block' }}>
          <span className="field-label">Libellé</span>
          <div className="field-input">
            <input value={form.libelle} onChange={(e) => setForm({ ...form, libelle: e.target.value })} />
          </div>
        </label>
        <label style={{ display: 'block' }}>
          <span className="field-label">Type</span>
          <div className="field-input">
            <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as AdminQuestType })}>
              <option value="quotidien">Quotidien</option>
              <option value="exploration">Exploration</option>
            </select>
          </div>
        </label>
        <div style={{ display: 'flex', gap: 12 }}>
          <label style={{ flex: 1, display: 'block' }}>
            <span className="field-label">Objectif</span>
            <div className="field-input">
              <input type="number" min={1} value={form.objectif} onChange={(e) => setForm({ ...form, objectif: Number(e.target.value) })} />
            </div>
          </label>
          <label style={{ flex: 1, display: 'block' }}>
            <span className="field-label">XP</span>
            <div className="field-input">
              <input type="number" min={0} value={form.recompenseXp} onChange={(e) => setForm({ ...form, recompenseXp: Number(e.target.value) })} />
            </div>
          </label>
          <label style={{ flex: 1, display: 'block' }}>
            <span className="field-label">Pièces</span>
            <div className="field-input">
              <input type="number" min={0} value={form.recompensePieces} onChange={(e) => setForm({ ...form, recompensePieces: Number(e.target.value) })} />
            </div>
          </label>
        </div>

        <p style={{ fontSize: 11.5, color: 'var(--muted)' }}>
          ⚠️ La progression réelle sur mobile n&rsquo;existe que pour les 5 défis déjà codés (scan, jardin,
          publication, likes, exploration). Un nouvel identifiant reste visible mais bloqué à 0 tant qu&rsquo;aucun
          code dédié ne le calcule.
        </p>

        {error ? <div className="error-text">{error}</div> : null}

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Annuler
          </button>
          <button type="button" className="btn btn-primary" onClick={onSubmit} disabled={saving || !form.id || !form.libelle}>
            {saving ? 'Création…' : 'Créer le défi'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
