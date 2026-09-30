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
