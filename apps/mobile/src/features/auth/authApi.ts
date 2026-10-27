import type { User } from '@planai/shared';

import { levelFromExperience } from '@/features/account/levels';
import { getStoragePublicUrl, supabase, uriToBlob } from '@/lib/supabase';
type AuthResult = { token: string; refreshToken: string; user: User };

type ProfileRow = {
  id: string;
  nom_utilisateur: string;
  experience: number;
  niveau: number;
  pieces: number;
  url_avatar: string | null;
};

type AuthUser = {
  id: string;
  email?: string | null;
  user_metadata?: Record<string, unknown>;
};

// L'e-mail vient de la session (auth.users) : la colonne profiles.email n'est pas lisible
// par l'app (supabase/migrations_a_venir/20261015090100_profiles_private_columns.sql).
const PROFILE_COLUMNS = 'id,nom_utilisateur,experience,niveau,pieces,url_avatar';

function userFromProfile(profile: ProfileRow, email: string): User {
  // `experience` est cumulée : le niveau stocké n'était jamais recalculé côté serveur.
  const { niveau, xp } = levelFromExperience(profile.experience);
  return {
    id: profile.id,
    pseudo: profile.nom_utilisateur,
    email,
    niveau,
    xp,
    pieces: profile.pieces,
    urlAvatar: profile.url_avatar ? getStoragePublicUrl('avatars', profile.url_avatar) : null,
  };
}

async function profileForUser(authUser: AuthUser): Promise<User> {
  const email = authUser.email ?? '';
  const { data, error } = await supabase.from('profiles').select(PROFILE_COLUMNS).eq('id', authUser.id).maybeSingle<ProfileRow>();
  if (!data && !error) {
    const metadata = authUser.user_metadata ?? {};
    const metadataName = typeof metadata.nom_utilisateur === 'string' ? metadata.nom_utilisateur : undefined;
    const metadataDisplayName = typeof metadata.name === 'string' ? metadata.name : undefined;
    const username = (metadataName ?? metadataDisplayName ?? `User_${authUser.id.slice(0, 6)}`).slice(0, 20);
    // ignoreDuplicates : ON CONFLICT DO NOTHING, qui ne demande pas le droit de
    // modifier email/id (seuls nom_utilisateur et url_avatar sont modifiables).
    const { error: insertError } = await supabase.from('profiles').upsert(
      {
        id: authUser.id,
        email: authUser.email ?? `${authUser.id}@placeholder.invalid`,
        nom_utilisateur: username,
      },
      { onConflict: 'id', ignoreDuplicates: true },
    );
    if (insertError) throw insertError;
    const { data: created, error: createError } = await supabase
      .from('profiles')
      .select(PROFILE_COLUMNS)
      .eq('id', authUser.id)
      .single<ProfileRow>();
    if (createError || !created) throw createError ?? new Error('Unable to create profile');
    return userFromProfile(created, email);
  }
  if (error || !data) throw error ?? new Error('Profile not found');
  return userFromProfile(data, email);
}

async function resultFromSession(session: {
  access_token: string;
  refresh_token: string;
  user: AuthUser;
}): Promise<AuthResult> {
  return {
    token: session.access_token,
    refreshToken: session.refresh_token,
    user: await profileForUser(session.user),
  };
}

export async function login(email: string, password: string): Promise<AuthResult> {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error || !data.session) throw error ?? new Error('Unable to sign in');
  return resultFromSession(data.session);
}

export async function loginWithGoogle(idToken: string, nonce?: string): Promise<AuthResult> {
  const { data, error } = await supabase.auth.signInWithIdToken({ provider: 'google', token: idToken, nonce });
  if (error || !data.session) throw error ?? new Error('Unable to sign in with Google');
  return resultFromSession(data.session);
}

/**
 * Inscription. Renvoie `null` quand l'adresse doit d'abord être confirmée : Supabase envoie
 * alors un code par e-mail, saisi dans l'écran de confirmation (verifySignupCode).
 */
export async function register(pseudo: string, email: string, password: string): Promise<AuthResult | null> {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { nom_utilisateur: pseudo } },
  });
  if (error) throw error;
  return data.session ? resultFromSession(data.session) : null;
}

/** Confirme l'adresse avec le code reçu par e-mail, puis ouvre la session. */
export async function verifySignupCode(email: string, code: string): Promise<AuthResult> {
  const { data, error } = await supabase.auth.verifyOtp({ email, token: code, type: 'email' });
  if (error || !data.session) throw error ?? new Error('Invalid confirmation code');
  return resultFromSession(data.session);
}

/** Renvoie un code de confirmation (inscription non confirmée). */
export async function resendSignupCode(email: string): Promise<void> {
  const { error } = await supabase.auth.resend({ type: 'signup', email });
  if (error) throw error;
}

/**
 * Mot de passe oublié : Supabase envoie un code par e-mail. Aucune erreur si l'adresse est
 * inconnue, pour ne pas révéler quels comptes existent.
 */
export async function requestPasswordReset(email: string): Promise<void> {
  const { error } = await supabase.auth.resetPasswordForEmail(email);
  if (error) throw error;
}

/** Valide le code de réinitialisation, enregistre le nouveau mot de passe et ouvre la session. */
export async function resetPasswordWithCode(email: string, code: string, newPassword: string): Promise<AuthResult> {
  const { data, error } = await supabase.auth.verifyOtp({ email, token: code, type: 'recovery' });
  if (error || !data.session) throw error ?? new Error('Invalid reset code');
  const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
  if (updateError) {
    // Code valide mais mot de passe refusé : on ne laisse pas une session à moitié ouverte.
    await supabase.auth.signOut({ scope: 'local' });
    throw updateError;
  }
  return resultFromSession(data.session);
}

/** Connexion refusée parce que l'adresse n'a pas encore été confirmée. */
export function isEmailNotConfirmed(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) return false;
  const { code, message } = error as { code?: unknown; message?: unknown };
  return code === 'email_not_confirmed' || (typeof message === 'string' && /email not confirmed/i.test(message));
}

export async function logout(): Promise<void> {
  const { error } = await supabase.auth.signOut();
  // Hors ligne, la révocation serveur échoue : on oublie quand même la session locale.
  if (error) await supabase.auth.signOut({ scope: 'local' });
}
export async function fetchProfile(): Promise<User> {
  const { data } = await supabase.auth.getUser();
  if (!data.user) throw new Error('Not authenticated');
  return profileForUser(data.user);
}

export async function updateProfile(patch: Partial<Pick<User, 'pseudo'>>): Promise<User> {
  const { data } = await supabase.auth.getUser();
  if (!data.user) throw new Error('Not authenticated');
  const { error } = await supabase.from('profiles').update({ nom_utilisateur: patch.pseudo }).eq('id', data.user.id);
  if (error) throw error;
  return profileForUser(data.user);
}
export async function uploadAvatar(imageUri: string): Promise<User> {
  const { data } = await supabase.auth.getUser();
  if (!data.user) throw new Error('Not authenticated');
  const path = `${data.user.id}/${Date.now()}.jpg`;
  const { error: uploadError } = await supabase.storage.from('avatars').upload(path, await uriToBlob(imageUri), {
    contentType: 'image/jpeg',
    upsert: true,
  });
  if (uploadError) throw uploadError;
  const { error } = await supabase.from('profiles').update({ url_avatar: path }).eq('id', data.user.id);
  if (error) throw error;
  return profileForUser(data.user);
}

/** Vérifie le mot de passe actuel en rouvrant une session (les comptes Google n'en ont pas). */
async function verifyPassword(password: string): Promise<void> {
  const { data } = await supabase.auth.getUser();
  if (!data.user?.email) throw new Error('Not authenticated');
  const usesPassword = (data.user.identities ?? []).some((identity) => identity.provider === 'email');
  if (!usesPassword) return;
  const { error } = await supabase.auth.signInWithPassword({ email: data.user.email, password });
  if (error) throw error;
}

export async function changePassword(current: string, next: string): Promise<void> {
  if (next.length < 8) throw new Error('Password too short');
  await verifyPassword(current);
  const { error } = await supabase.auth.updateUser({ password: next });
  if (error) throw error;
}

export async function deleteAccount(password: string): Promise<void> {
  await verifyPassword(password);
  const { error } = await supabase.rpc('delete_my_account');
  if (error) throw error;
}
