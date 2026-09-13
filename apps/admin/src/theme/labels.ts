import type { AdminRole, AdminToxicite, AdminUserStatut } from '@planai/shared';

/**
 * Traduction valeur brute → libellé + couleur sémantique (variable CSS, jamais une
 * couleur codée en dur — voir theme/global.css). Point UNIQUE de cette traduction, comme
 * `apps/mobile/src/api/adapters.ts` le fait côté mobile pour ses propres enums.
 */

export function roleLabel(role: AdminRole): string {
  return { membre: 'Membre', moderateur: 'Modérateur', admin: 'Admin' }[role];
}

export function roleColorVar(role: AdminRole): string {
  return { membre: 'var(--muted)', moderateur: 'var(--blue)', admin: 'var(--purple)' }[role];
}

export function statutLabel(statut: AdminUserStatut): string {
  return { actif: 'Actif', inactif: 'Inactif', suspendu: 'Suspendu' }[statut];
}

export function statutColors(statut: AdminUserStatut): { bg: string; color: string } {
  if (statut === 'actif') return { bg: 'var(--accent-soft)', color: 'var(--green)' };
  if (statut === 'suspendu') return { bg: 'var(--danger-bg)', color: 'var(--red)' };
  return { bg: 'var(--pill)', color: 'var(--gray)' };
}

export function toxiciteLabel(t: AdminToxicite): string {
  return { green: 'Non toxique', orange: 'Incertaine', red: 'Toxique' }[t];
}

export function toxiciteColors(t: AdminToxicite): { bg: string; color: string; icon: string } {
  if (t === 'red') return { bg: 'var(--danger-bg)', color: 'var(--red)', icon: 'warning' };
  if (t === 'orange') return { bg: 'rgba(251,191,36,.16)', color: 'var(--amber)', icon: 'help' };
  return { bg: 'var(--accent-soft)', color: 'var(--green)', icon: 'check_circle' };
}

export function rareteColors(rarete: string | null): { bg: string; color: string } {
  if (rarete === 'Rare') return { bg: 'rgba(56,189,248,.16)', color: 'var(--blue)' };
  if (rarete === 'Épique') return { bg: 'rgba(192,132,252,.18)', color: 'var(--purple)' };
  return { bg: 'var(--pill)', color: 'var(--gray)' };
}

export function serviceStatusColor(status: 'ok' | 'degrade' | 'down'): string {
  return { ok: 'var(--green)', degrade: 'var(--amber)', down: 'var(--red)' }[status];
}

export function serviceStatusLabel(status: 'ok' | 'degrade' | 'down'): string {
  return { ok: 'OK', degrade: 'Lent', down: 'Down' }[status];
}

export function apiKeyStatusLabel(status: 'connecte' | 'absent' | 'degrade'): string {
  return { connecte: 'Connecté', absent: 'Absent', degrade: 'Dégradé' }[status];
}

export function apiKeyStatusColor(status: 'connecte' | 'absent' | 'degrade'): string {
  return { connecte: 'var(--green)', absent: 'var(--red)', degrade: 'var(--amber)' }[status];
}
