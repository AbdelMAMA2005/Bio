import { useState } from 'react';
import { Icon } from '../components/Icon';
import { Pagination } from '../components/Pagination';
import { Modal } from '../components/Modal';
import { usePageMeta, useLayout } from '../layout/LayoutContext';
import {
  useDeleteUser,
  useUpdateUserRole,
  useUpdateUserStatus,
  useUsers,
  type UsersFilter,
} from '../api/hooks/useUsers';
import { apiClient, ApiError } from '../api/client';
import { roleColorVar, roleLabel, statutColors, statutLabel } from '../theme/labels';
import type { AdminRole, AdminUser } from '@planai/shared';
import { useAuth } from '../auth/AuthProvider';

const FILTERS: { key: UsersFilter; label: string }[] = [
  { key: 'tous', label: 'Tous' },
  { key: 'admins', label: 'Admins' },
  { key: 'inactifs', label: 'Inactifs' },
  { key: 'suspendus', label: 'Suspendus' },
];

const LIMIT = 20;

export function UsersPage() {
  usePageMeta('Utilisateurs', 'Comptes, rôles et progression');
  const { query } = useLayout();
  const { state } = useAuth();
  const myId = state.status === 'authed' ? state.me.id : null;
  const isAdmin = state.status === 'authed' && state.me.role === 'admin';

  const [filtre, setFiltre] = useState<UsersFilter>('tous');
  const [page, setPage] = useState(1);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<AdminUser | null>(null);
  const [inviteOpen, setInviteOpen] = useState(false);

  const { data, isLoading, isError } = useUsers({ page, limit: LIMIT, q: query || undefined, filtre });
  const updateRole = useUpdateUserRole();
  const updateStatus = useUpdateUserStatus();
  const deleteUser = useDeleteUser();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        {FILTERS.map((f) => (
          <button
            key={f.key}
            type="button"
            className={`chip${filtre === f.key ? ' active' : ''}`}
            onClick={() => {
              setFiltre(f.key);
              setPage(1);
            }}
          >
            {f.label}
          </button>
        ))}
        {isAdmin ? (
          <button type="button" className="btn btn-primary" style={{ marginLeft: 'auto' }} onClick={() => setInviteOpen(true)}>
            <Icon name="person_add" size={18} />
            Inviter un admin
          </button>
        ) : null}
      </div>

      {isLoading ? <p>Chargement…</p> : null}
      {isError ? <p className="error-text">Impossible de charger les utilisateurs.</p> : null}

      {data ? (
        <>
          <div className="table-wrap scroll">
            <div style={{ minWidth: 760 }}>
              <div className="table-head" style={{ gridTemplateColumns: '2.2fr 1fr 1fr .9fr 1.1fr 44px' }}>
                <span>Utilisateur</span>
                <span>Rôle</span>
                <span>Niveau / XP</span>
                <span>Captures</span>
                <span>Statut</span>
                <span />
              </div>
              {data.items.map((u) => {
                const statutStyle = statutColors(u.statut);
                return (
                  <div key={u.id} className="table-row" style={{ gridTemplateColumns: '2.2fr 1fr 1fr .9fr 1.1fr 44px', position: 'relative' }}>
                    <div className="cell-user">
                      <div className="avatar">{u.nomUtilisateur.charAt(0).toUpperCase()}</div>
                      <div style={{ minWidth: 0 }}>
                        <div className="truncate" style={{ fontSize: 13.5, fontWeight: 600 }}>
                          {u.nomUtilisateur}
                        </div>
                        <div className="truncate" style={{ fontSize: 11.5, color: 'var(--muted)' }}>
                          {u.email}
                        </div>
                      </div>
                    </div>
                    <span style={{ fontSize: 12.5, fontWeight: 600, color: roleColorVar(u.role) }}>{roleLabel(u.role)}</span>
                    <span className="numeric" style={{ fontSize: 12.5, color: 'var(--soft)' }}>
                      Niv. {u.niveau} · {u.experience.toLocaleString('fr-FR')}
                    </span>
                    <span className="numeric" style={{ fontSize: 12.5, color: 'var(--soft)' }}>{u.capturesCount}</span>
                    <span className="badge" style={{ background: statutStyle.bg, color: statutStyle.color, justifySelf: 'start' }}>
                      {statutLabel(u.statut)}
                    </span>
                    <button
                      type="button"
                      onClick={() => setOpenMenuId(openMenuId === u.id ? null : u.id)}
                      aria-label="Actions"
                      style={{ background: 'none', border: 'none', cursor: 'pointer', justifySelf: 'center' }}
                    >
                      <Icon name="more_horiz" size={19} color="var(--muted)" />
                    </button>

                    {openMenuId === u.id ? (
                      <div
                        className="card"
                        style={{
                          position: 'absolute',
                          right: 16,
                          top: '100%',
                          zIndex: 10,
                          padding: 8,
                          width: 220,
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 4,
                        }}
                      >
                        {isAdmin ? (
                          <RoleMenuItem
                            userId={u.id}
                            currentRole={u.role}
                            onPick={(role) => {
                              updateRole.mutate({ id: u.id, role });
                              setOpenMenuId(null);
                            }}
                          />
                        ) : null}
                        {u.id !== myId ? (
                          <MenuButton
                            icon={u.statut === 'suspendu' ? 'lock_open' : 'lock'}
                            label={u.statut === 'suspendu' ? 'Réactiver' : 'Suspendre'}
                            onClick={() => {
                              updateStatus.mutate({ id: u.id, suspendu: u.statut !== 'suspendu' });
                              setOpenMenuId(null);
                            }}
                          />
                        ) : null}
                        {isAdmin && u.id !== myId && u.role !== 'admin' ? (
                          <MenuButton
                            icon="delete_forever"
                            label="Supprimer (RGPD)"
                            danger
                            onClick={() => {
                              setConfirmDelete(u);
                              setOpenMenuId(null);
                            }}
                          />
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                );
              })}
              {data.items.length === 0 ? <p style={{ padding: 16, color: 'var(--muted)' }}>Aucun utilisateur ne correspond.</p> : null}
            </div>
          </div>

          <Pagination
            page={page}
            limit={LIMIT}
            total={data.total}
            onPageChange={setPage}
            itemLabel={(n) => (n > 1 ? `${n} utilisateurs affichés` : `${n} utilisateur affiché`)}
          />
        </>
      ) : null}

      {confirmDelete ? (
        <Modal title="Supprimer ce compte ?" onClose={() => setConfirmDelete(null)}>
          <p style={{ fontSize: 13.5, color: 'var(--soft)', marginBottom: 16 }}>
            Le compte <strong>{confirmDelete.nomUtilisateur}</strong> sera anonymisé (RGPD) et ne pourra plus se
            reconnecter. Cette action est irréversible.
          </p>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button type="button" className="btn btn-secondary" onClick={() => setConfirmDelete(null)}>
              Annuler
            </button>
            <button
              type="button"
              className="btn btn-danger"
              onClick={() => {
                deleteUser.mutate(confirmDelete.id);
                setConfirmDelete(null);
              }}
            >
              Supprimer définitivement
            </button>
          </div>
        </Modal>
      ) : null}

      {inviteOpen ? <InviteAdminModal onClose={() => setInviteOpen(false)} /> : null}
    </div>
  );
}

function MenuButton({
  icon,
  label,
  onClick,
  danger,
}: {
  icon: string;
  label: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '8px 10px',
        borderRadius: 8,
        border: 'none',
        background: 'transparent',
        cursor: 'pointer',
        fontSize: 12.5,
        fontWeight: 600,
        color: danger ? 'var(--red)' : 'var(--text)',
        textAlign: 'left',
      }}
    >
      <Icon name={icon} size={17} />
      {label}
    </button>
  );
}

function RoleMenuItem({
  currentRole,
  onPick,
}: {
  userId: string;
  currentRole: AdminRole;
  onPick: (role: AdminRole) => void;
}) {
  const roles: AdminRole[] = ['membre', 'moderateur', 'admin'];
  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      <div style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--muted)', padding: '4px 10px', textTransform: 'uppercase' }}>
        Changer le rôle
      </div>
      {roles
        .filter((r) => r !== currentRole)
        .map((r) => (
          <MenuButton key={r} icon="swap_horiz" label={roleLabel(r)} onClick={() => onPick(r)} />
        ))}
    </div>
  );
}

function InviteAdminModal({ onClose }: { onClose: () => void }) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<AdminRole>('moderateur');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const updateRole = useUpdateUserRole();

  const onSubmit = async () => {
    setError(null);
    setLoading(true);
    try {
      const { data } = await apiClient.get<{ items: { id: string; email: string }[] }>('/admin/users', {
        params: { page: 1, limit: 1, q: email, filtre: 'tous' },
      });
      const match = data.items.find((u) => u.email.toLowerCase() === email.toLowerCase());
      if (!match) {
        setError("Aucun compte avec cet e-mail. La personne doit d'abord créer un compte via l'app PlanAI.");
        return;
      }
      await updateRole.mutateAsync({ id: match.id, role });
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Une erreur est survenue.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal title="Inviter un admin" onClose={onClose}>
      <p style={{ fontSize: 12.5, color: 'var(--muted)', marginBottom: 14 }}>
        Aucun service d&rsquo;e-mail n&rsquo;est configuré : promeut directement un compte PlanAI existant
        (la personne doit avoir déjà créé son compte via l&rsquo;app mobile).
      </p>
      <label className="field-label" htmlFor="invite-email">
        E-mail du compte
      </label>
      <div className="field-input" style={{ marginBottom: 12 }}>
        <Icon name="mail" size={18} color="var(--muted)" />
        <input id="invite-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="personne@planai.app" />
      </div>
      <label className="field-label" htmlFor="invite-role">
        Rôle
      </label>
      <div className="field-input" style={{ marginBottom: 16 }}>
        <select id="invite-role" value={role} onChange={(e) => setRole(e.target.value as AdminRole)}>
          <option value="moderateur">Modérateur</option>
          <option value="admin">Admin</option>
        </select>
      </div>
      {error ? <div className="error-text" style={{ marginBottom: 12 }}>{error}</div> : null}
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <button type="button" className="btn btn-secondary" onClick={onClose}>
          Annuler
        </button>
        <button type="button" className="btn btn-primary" onClick={onSubmit} disabled={loading || !email}>
          {loading ? 'Envoi…' : 'Confirmer'}
        </button>
      </div>
    </Modal>
  );
}
