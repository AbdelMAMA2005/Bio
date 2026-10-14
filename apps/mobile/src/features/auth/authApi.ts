import type { User } from '@planai/shared';

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
  return {
    id: profile.id,
    pseudo: profile.nom_utilisateur,
    email,
    niveau: profile.niveau,
    xp: profile.experience,
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

export async function loginWithGoogle(idToken: string): Promise<AuthResult> {
  const { data, error } = await supabase.auth.signInWithIdToken({ provider: 'google', token: idToken });
  if (error || !data.session) throw error ?? new Error('Unable to sign in with Google');
  return resultFromSession(data.session);
}

export async function register(pseudo: string, email: string, password: string): Promise<AuthResult> {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { nom_utilisateur: pseudo } },
  });
  if (error || !data.session) throw error ?? new Error('Email confirmation required');
  return resultFromSession(data.session);
}

export async function logout(): Promise<void> {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
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

export async function deleteAccount(_password: string): Promise<void> {
  const { error } = await supabase.rpc('delete_my_account');
  if (error) throw error;
}
