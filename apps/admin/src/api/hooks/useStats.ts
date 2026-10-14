import { useQuery } from '@tanstack/react-query';
import type { AdminServiceHealth, AdminStats } from '@planai/shared';
import { rpc } from '../client';
import { queryKeys } from '../queryKeys';
import { fetchApiKeysStatus } from './useSettings';

const jourCourt = new Intl.DateTimeFormat('fr-FR', { weekday: 'short' });

/** « 2026-10-14 » -> « mar. » (jour local, sans décalage de fuseau). */
function libelleJour(isoDate: string): string {
  const [y, m, d] = isoDate.split('-').map(Number);
  return jourCourt.format(new Date(y, m - 1, d));
}

async function fetchStats(): Promise<AdminStats> {
  const start = performance.now();
  const stats = await rpc<AdminStats>('admin_stats');
  const dbLatency = Math.round(performance.now() - start);

  let services: AdminServiceHealth[] = [{ nom: 'Base de données', latenceMs: dbLatency, status: 'ok' }];
  const fnStart = performance.now();
  try {
    const keys = await fetchApiKeysStatus();
    const fnLatency = Math.round(performance.now() - fnStart);
    const statusOf = (env: string, siAbsent: AdminServiceHealth['status']) =>
      keys.find((k) => k.env === env)?.status === 'connecte' ? 'ok' : siAbsent;
    services = [
      ...services,
      { nom: 'Edge Functions', latenceMs: fnLatency, status: 'ok' },
      { nom: 'Pl@ntNet (identification)', latenceMs: null, status: statusOf('PLANTNET_API_KEY', 'down') },
      { nom: 'Gemini (fiches et diagnostic)', latenceMs: null, status: statusOf('GEMINI_API_KEY', 'degrade') },
    ];
  } catch {
    services = [...services, { nom: 'Edge Functions', latenceMs: null, status: 'down' }];
  }

  return {
    ...stats,
    chart7j: stats.chart7j.map((c) => ({ ...c, jour: libelleJour(c.jour) })),
    services,
  };
}

export function useStats() {
  return useQuery({
    queryKey: queryKeys.stats,
    queryFn: fetchStats,
    refetchInterval: 60_000,
  });
}
