import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const configuredSupabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL?.trim();
const supabaseUrl =
  configuredSupabaseUrl && configuredSupabaseUrl !== 'https://your-project.supabase.co'
    ? configuredSupabaseUrl
    : 'https://placeholder.supabase.co';

const configuredSupabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY?.trim();
const supabaseAnonKey =
  configuredSupabaseAnonKey && configuredSupabaseAnonKey !== 'your-anon-key'
    ? configuredSupabaseAnonKey
    : 'placeholder-anon-key';

export const isSupabaseConfigured = (): boolean => {
  return (
    !!configuredSupabaseUrl &&
    configuredSupabaseUrl !== 'https://your-project.supabase.co' &&
    !!configuredSupabaseAnonKey &&
    configuredSupabaseAnonKey !== 'your-anon-key'
  );
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

export async function getSafeSession() {
  try {
    const { data, error } = await supabase.auth.getSession();
    if (error) {
      console.warn('[supabase] Unable to restore session', error.message);
      return null;
    }
    return data.session;
  } catch (error) {
    console.warn('[supabase] Session storage is unavailable', error);
    return null;
  }
}

/**
 * Résout l'URL publique d'un asset stocké dans Supabase Storage.
 */
export function getStoragePublicUrl(bucket: string, path: string): string {
  if (!path) return '';
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}

const COLLECTIONS_BUCKET = 'collections';
const COLLECTIONS_PUBLIC_MARKER = `/storage/v1/object/public/${COLLECTIONS_BUCKET}/`;
const SIGNED_URL_TTL_SECONDS = 24 * 60 * 60;

/**
 * Le bucket `collections` (photos de suivi) est privé : on stocke le chemin de l'objet
 * (`{ path, date }`) et on signe l'URL à la lecture. Les anciennes entrées contiennent
 * l'URL publique complète — on en extrait le chemin pour les signer aussi.
 */
export function collectionPhotoPath(entry: unknown): string | null {
  if (entry && typeof entry === 'object' && typeof (entry as { path?: unknown }).path === 'string') {
    return (entry as { path: string }).path || null;
  }
  const url = typeof entry === 'string' ? entry : (entry as { url?: unknown } | null)?.url;
  if (typeof url !== 'string') return null;
  const index = url.indexOf(COLLECTIONS_PUBLIC_MARKER);
  return index === -1 ? null : decodeURIComponent(url.slice(index + COLLECTIONS_PUBLIC_MARKER.length).split('?')[0]);
}

/** Remplace chaque photo du bucket privé par `{ url: <URL signée>, date }` (les autres entrées sont conservées). */
export async function signCollectionPhotos<T extends { historique_photos?: unknown }>(rows: T[]): Promise<T[]> {
  const paths = [...new Set(rows.flatMap((row) =>
    Array.isArray(row.historique_photos) ? row.historique_photos.map(collectionPhotoPath).filter((p): p is string => !!p) : []))];
  if (paths.length === 0) return rows;
  const { data, error } = await supabase.storage.from(COLLECTIONS_BUCKET).createSignedUrls(paths, SIGNED_URL_TTL_SECONDS);
  if (error) {
    console.warn('[supabase] Unable to sign collection photos', error.message);
    return rows;
  }
  const signed = new Map((data ?? []).flatMap((item) => (item.path && item.signedUrl ? [[item.path, item.signedUrl] as const] : [])));
  return rows.map((row) => {
    if (!Array.isArray(row.historique_photos)) return row;
    const historique_photos = row.historique_photos.map((entry) => {
      const path = collectionPhotoPath(entry);
      const url = path ? signed.get(path) : undefined;
      if (!url) return entry;
      const date = entry && typeof entry === 'object' ? (entry as { date?: unknown }).date : undefined;
      return typeof date === 'string' ? { url, date } : url;
    });
    return { ...row, historique_photos };
  });
}

export function uriToBlob(uri: string): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.onload = () => resolve(request.response as Blob);
    request.onerror = () => reject(new Error('Unable to read image'));
    request.responseType = 'blob';
    request.open('GET', uri, true);
    request.send();
  });
}

/** Convertit une URI locale Android/iOS en data URL acceptée par les Edge Functions. */
export async function uriToImageDataUrl(uri: string): Promise<string> {
  if (uri.startsWith('data:')) return uri;

  const blob = await uriToBlob(uri);
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') resolve(reader.result);
      else reject(new Error('Unable to encode image'));
    };
    reader.onerror = () => reject(new Error('Unable to encode image'));
    reader.readAsDataURL(blob);
  });
}
