import { createClient } from '@supabase/supabase-js';

/**
 * Client Supabase de la console : même projet que l'app mobile. La clé publique (anon)
 * ne donne aucun droit d'administration à elle seule : chaque RPC admin_* vérifie le
 * rôle de la personne connectée côté base (voir supabase/migrations/*_admin_console.sql).
 */
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://placeholder.supabase.co';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder-anon-key';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, storageKey: 'planai-admin-session' },
});

export class ApiError extends Error {
  status: number | null;

  constructor(message: string, status: number | null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

type SupabaseErrorLike = { message?: string; code?: string; status?: number } | null | undefined;

/**
 * Traduit une erreur Supabase/PostgREST en ApiError. Les messages levés par les RPC
 * (RAISE EXCEPTION ... en français) sont affichés tels quels ; les erreurs techniques
 * connues reçoivent un message lisible.
 */
export function toApiError(error: SupabaseErrorLike, fallback = 'Une erreur est survenue.'): ApiError {
  const code = error?.code ?? '';
  const message = error?.message ?? fallback;
  switch (code) {
    case '42501':
      return new ApiError(message.includes('row-level security') ? "Action réservée à l'administration." : message, 403);
    case 'P0002':
      return new ApiError(message, 404);
    case '23505':
      return new ApiError('Cet identifiant existe déjà.', 409);
    case '23503':
      return new ApiError('Élément encore utilisé ailleurs : suppression impossible.', 409);
    case 'invalid_credentials':
      return new ApiError('E-mail ou mot de passe incorrect.', 401);
    default:
      return new ApiError(message, error?.status ?? null);
  }
}

/** Appelle une RPC et renvoie son résultat, ou lève une ApiError. */
export async function rpc<T>(fn: string, args?: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.rpc(fn, args);
  if (error) throw toApiError(error);
  return data as T;
}

/** URL affichable d'un avatar : le mobile stocke soit une URL complète, soit un chemin du bucket « avatars ». */
export function avatarUrl(path: string | null): string | null {
  if (!path) return null;
  if (/^https?:\/\//.test(path)) return path;
  return supabase.storage.from('avatars').getPublicUrl(path).data.publicUrl;
}
