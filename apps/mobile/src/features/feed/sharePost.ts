import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Share } from 'react-native';

import type { FeedPost } from '@/api/types';

export type ShareOutcome = 'shared' | 'cancelled';

/**
 * Ouvre la feuille de partage native (Facebook, Instagram, X, Snapchat, WhatsApp…).
 *
 * Priorité à l'image quand le post en a une : `expo-sharing` propose le fichier aux apps qui
 * acceptent une image (story Instagram/Snapchat, média WhatsApp…), mais son `shareAsync`
 * n'accepte qu'une URI LOCALE — l'image est donc d'abord téléchargée dans le cache
 * (`File.downloadFileAsync`, API `expo-file-system` "next", voir AGENTS.md : l'ancienne
 * `FileSystem.downloadAsync` est dépréciée et lève désormais une erreur à l'exécution).
 * Limite connue : `Sharing.shareAsync` n'a pas de paramètre "texte" séparé de l'image (ni
 * iOS ni Android) — la légende du post ne peut donc pas voyager AVEC l'image par cette voie ;
 * Repli sur `Share.share` (texte natif, tous réseaux) si le
 * post n'a pas d'image ou si `expo-sharing` est indisponible (web).
 *
 * Ne lève que pour un échec réel (téléchargement impossible, aucune app cible…) — un partage
 * annulé par l'utilisateur (croix, retour) résout normalement avec `'cancelled'`, jamais une
 * exception, pour laisser l'appelant distinguer les deux (voir CommunityScreen.tsx).
 */
export async function sharePost(post: FeedPost, fallbackMessage: string): Promise<ShareOutcome> {
  const message = post.caption.trim() || fallbackMessage;

  if (post.imageUri && (await Sharing.isAvailableAsync())) {
    const extension = (post.imageUri.split('?')[0].split('.').pop() || 'jpg').toLowerCase();
    const mimeType = `image/${extension === 'jpg' ? 'jpeg' : extension}`;
    const destination = new File(Paths.cache, `share-post-${post.id}.${extension}`);
    const file = await File.downloadFileAsync(post.imageUri, destination, { idempotent: true });
    await Sharing.shareAsync(file.uri, { mimeType, dialogTitle: message });
    return 'shared';
  }

  // Pas d'image (post texte seul) ou expo-sharing indisponible sur cette plateforme : le
  // texte de la publication est le seul contenu partageable par cette voie.
  const result = await Share.share({ message });
  return result.action === Share.dismissedAction ? 'cancelled' : 'shared';
}
