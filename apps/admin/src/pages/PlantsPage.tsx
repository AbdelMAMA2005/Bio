import { useState } from 'react';
import { Icon } from '../components/Icon';
import { Pagination } from '../components/Pagination';
import { Modal } from '../components/Modal';
import { usePageMeta, useLayout } from '../layout/LayoutContext';
import { useCreatePlant, useDeletePlant, usePlants, useUpdatePlant } from '../api/hooks/usePlants';
import { rareteColors, toxiciteColors, toxiciteLabel } from '../theme/labels';
import type { AdminPlant, AdminPlantInput, AdminToxicite } from '@planai/shared';
import { ApiError } from '../api/client';

const LIMIT = 20;

export function PlantsPage() {
  usePageMeta('Référentiel plantes', 'Espèces, toxicité et rareté');
  const { query } = useLayout();
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<AdminPlant | 'new' | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<AdminPlant | null>(null);

  const { data, isLoading, isError } = usePlants({ page, limit: LIMIT, q: query || undefined });
  const deletePlant = useDeletePlant();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <div style={{ fontSize: 13, color: 'var(--muted)' }}>
          {data ? `${data.total.toLocaleString('fr-FR')} espèces référencées` : '…'}
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          <button type="button" className="btn btn-secondary" disabled title="Bientôt disponible">
            <Icon name="upload_file" size={18} color="var(--muted)" />
            Importer CSV
          </button>
          <button type="button" className="btn btn-primary" onClick={() => setEditing('new')}>
            <Icon name="add" size={18} />
            Nouvelle espèce
          </button>
        </div>
      </div>

      {isLoading ? <p>Chargement…</p> : null}
      {isError ? <p className="error-text">Impossible de charger le référentiel.</p> : null}

      {data ? (
        <>
          <div className="table-wrap scroll">
            <div style={{ minWidth: 800 }}>
              <div className="table-head" style={{ gridTemplateColumns: '2.3fr 1.6fr 1fr 1.2fr 1fr 44px' }}>
                <span>Espèce</span>
                <span>Famille</span>
                <span>Rareté</span>
                <span>Toxicité</span>
                <span>Captures</span>
                <span />
              </div>
              {data.items.map((p) => {
                const rar = rareteColors(p.badgeRarete);
                const tox = toxiciteColors(p.toxicite);
                return (
                  <div key={p.id} className="table-row" style={{ gridTemplateColumns: '2.3fr 1.6fr 1fr 1.2fr 1fr 44px' }}>
                    <div className="cell-user">
                      <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--pill)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#4ade80', flexShrink: 0 }}>
                        <Icon name="local_florist" size={20} />
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div className="truncate" style={{ fontSize: 13.5, fontWeight: 600 }}>{p.nomCommun}</div>
                        <div className="truncate" style={{ fontSize: 11.5, color: 'var(--muted)', fontStyle: 'italic' }}>{p.nomScientifique}</div>
                      </div>
                    </div>
                    <span className="truncate" style={{ fontSize: 12.5, color: 'var(--soft)' }}>{p.famille || '-'}</span>
                    <span className="badge-uppercase" style={{ background: rar.bg, color: rar.color, justifySelf: 'start' }}>
                      {p.badgeRarete || 'Commun'}
                    </span>
                    <span className="badge" style={{ background: tox.bg, color: tox.color, justifySelf: 'start' }}>
                      <Icon name={tox.icon} size={14} />
                      {toxiciteLabel(p.toxicite)}
                    </span>
                    <span className="numeric" style={{ fontSize: 12.5, color: 'var(--soft)' }}>{p.capturesCount}</span>
                    <div style={{ display: 'flex', gap: 6, justifySelf: 'center' }}>
                      <button type="button" onClick={() => setEditing(p)} aria-label={`Modifier ${p.nomCommun}`} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                        <Icon name="edit" size={19} color="var(--muted)" />
                      </button>
                    </div>
                  </div>
                );
              })}
              {data.items.length === 0 ? <p style={{ padding: 16, color: 'var(--muted)' }}>Aucune espèce ne correspond.</p> : null}
            </div>
          </div>
          <Pagination page={page} limit={LIMIT} total={data.total} onPageChange={setPage} itemLabel={(n) => `${n} espèces affichées`} />
        </>
      ) : null}

      {editing ? (
        <PlantFormModal
          plant={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onDelete={
            editing !== 'new'
              ? () => {
                  setConfirmDelete(editing);
                  setEditing(null);
                }
              : undefined
          }
        />
      ) : null}

      {confirmDelete ? (
        <Modal title="Supprimer cette espèce ?" onClose={() => setConfirmDelete(null)}>
          <p style={{ fontSize: 13.5, color: 'var(--soft)', marginBottom: 16 }}>
            <strong>{confirmDelete.nomCommun}</strong> sera retirée du référentiel. Impossible si des utilisateurs
            l&rsquo;ont déjà en collection.
          </p>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button type="button" className="btn btn-secondary" onClick={() => setConfirmDelete(null)}>
              Annuler
            </button>
            <button
              type="button"
              className="btn btn-danger"
              onClick={() => {
                deletePlant.mutate(confirmDelete.id);
                setConfirmDelete(null);
              }}
            >
              Supprimer
            </button>
          </div>
        </Modal>
      ) : null}
    </div>
  );
}

function PlantFormModal({
  plant,
  onClose,
  onDelete,
}: {
  plant: AdminPlant | null;
  onClose: () => void;
  onDelete?: () => void;
}) {
  const createPlant = useCreatePlant();
  const updatePlant = useUpdatePlant();
  const [form, setForm] = useState<AdminPlantInput>({
    nomScientifique: plant?.nomScientifique ?? '',
    nomCommun: plant?.nomCommun ?? '',
    famille: plant?.famille ?? '',
    toxicite: plant?.toxicite ?? 'green',
    badgeRarete: plant?.badgeRarete ?? 'Commun',
    urlImage: plant?.urlImage ?? '',
    aPropos: plant?.aPropos ?? '',
    conseilsEntretien: plant?.conseilsEntretien ?? { lumiere: '', sol: '', arrosage: '', multiplication: '' },
  });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const onSubmit = async () => {
    setError(null);
    setSaving(true);
    try {
      if (plant) {
        await updatePlant.mutateAsync({ id: plant.id, input: form });
      } else {
        await createPlant.mutateAsync(form);
      }
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Enregistrement impossible.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title={plant ? `Modifier ${plant.nomCommun}` : 'Nouvelle espèce'} onClose={onClose}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <Field label="Nom commun">
          <input value={form.nomCommun} onChange={(e) => setForm({ ...form, nomCommun: e.target.value })} required />
        </Field>
        <Field label="Nom scientifique">
          <input value={form.nomScientifique} onChange={(e) => setForm({ ...form, nomScientifique: e.target.value })} required />
        </Field>
        <Field label="Famille botanique">
          <input value={form.famille ?? ''} onChange={(e) => setForm({ ...form, famille: e.target.value })} />
        </Field>
        <div style={{ display: 'flex', gap: 12 }}>
          <Field label="Toxicité">
            <select
              value={form.toxicite}
              onChange={(e) => setForm({ ...form, toxicite: e.target.value as AdminToxicite })}
            >
              <option value="green">Non toxique</option>
              <option value="orange">Incertaine</option>
              <option value="red">Toxique</option>
            </select>
          </Field>
          <Field label="Rareté">
            <select value={form.badgeRarete ?? 'Commun'} onChange={(e) => setForm({ ...form, badgeRarete: e.target.value })}>
              <option value="Commun">Commun</option>
              <option value="Rare">Rare</option>
              <option value="Épique">Épique</option>
            </select>
          </Field>
        </div>
        <Field label="URL image">
          <input value={form.urlImage ?? ''} onChange={(e) => setForm({ ...form, urlImage: e.target.value })} />
        </Field>
        <Field label="À propos">
          <textarea rows={2} value={form.aPropos ?? ''} onChange={(e) => setForm({ ...form, aPropos: e.target.value })} />
        </Field>

        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', marginTop: 4 }}>
          Conseils d&rsquo;entretien
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <Field label="Lumière">
            <input
              value={form.conseilsEntretien?.lumiere ?? ''}
              onChange={(e) => setForm({ ...form, conseilsEntretien: { ...form.conseilsEntretien, lumiere: e.target.value } })}
            />
          </Field>
          <Field label="Sol / arrosage">
            <input
              value={form.conseilsEntretien?.arrosage ?? ''}
              onChange={(e) => setForm({ ...form, conseilsEntretien: { ...form.conseilsEntretien, arrosage: e.target.value } })}
            />
          </Field>
        </div>
        <Field label="Multiplication">
          <input
            value={form.conseilsEntretien?.multiplication ?? ''}
            onChange={(e) => setForm({ ...form, conseilsEntretien: { ...form.conseilsEntretien, multiplication: e.target.value } })}
          />
        </Field>

        {error ? <div className="error-text">{error}</div> : null}

        <div style={{ display: 'flex', gap: 8, justifyContent: 'space-between', marginTop: 8 }}>
          {onDelete ? (
            <button type="button" className="btn btn-danger" onClick={onDelete}>
              Supprimer
            </button>
          ) : (
            <span />
          )}
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Annuler
            </button>
            <button type="button" className="btn btn-primary" onClick={onSubmit} disabled={saving || !form.nomCommun || !form.nomScientifique}>
              {saving ? 'Enregistrement…' : 'Enregistrer'}
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ flex: 1, display: 'block' }}>
      <span className="field-label">{label}</span>
      <div className="field-input">{children}</div>
    </label>
  );
}
