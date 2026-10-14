export type KeyStatus = 'connecte' | 'absent';
export type ServiceKey = { nom: string; env: string; status: KeyStatus };
export type Dependencies = {
  env: (name: string) => string | undefined;
  /** Rôle de l'appelant via la RPC admin_me() : null si ce n'est pas un membre de l'équipe. */
  staffRole: (authorization: string) => Promise<string | null>;
};

/** Secrets dont la console affiche la présence (jamais la valeur). */
export const SERVICE_KEYS: { nom: string; env: string }[] = [
  { nom: 'Pl@ntNet (identification)', env: 'PLANTNET_API_KEY' },
  { nom: 'Gemini (fiches et diagnostic)', env: 'GEMINI_API_KEY' },
  { nom: 'Resend (retours utilisateurs)', env: 'RESEND_API_KEY' },
];

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};
const reply = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status, headers: { ...cors, 'Content-Type': 'application/json' },
});

export function createAdminStatusHandler(deps: Dependencies) {
  return async (req: Request): Promise<Response> => {
    if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
    const authorization = req.headers.get('Authorization');
    if (!authorization) return reply({ code: 'unauthorized' }, 401);
    try {
      const role = await deps.staffRole(authorization);
      if (role !== 'admin' && role !== 'moderateur') return reply({ code: 'forbidden' }, 403);
      const keys: ServiceKey[] = SERVICE_KEYS.map((k) => ({
        ...k, status: deps.env(k.env)?.trim() ? 'connecte' : 'absent',
      }));
      return reply({ keys });
    } catch (error) {
      console.error('[admin-status]', error);
      return reply({ code: 'internal' }, 500);
    }
  };
}
