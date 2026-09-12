import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, StyleSheet, Text } from 'react-native';

import { AccentGradient, AccentOnColor } from '@/theme/colors';
import { FontFamily } from '@/theme/typography';

type Props = {
  /** Vraie photo de profil (`urlAvatar`/`authorAvatarUrl`) — `null`/`undefined` retombe sur les initiales. */
  uri?: string | null;
  /** Nom complet dont on tire l'initiale de repli — jamais un "@" générique. */
  name: string;
  size?: number;
  onPress?: () => void;
};

/**
 * Composant Avatar unique et réutilisable pour toute l'app (feed, commentaires, stories,
 * en-têtes, profil, Mon Jardin…) : affiche la vraie photo de profil quand elle existe,
 * sinon un rond dégradé avec l'initiale du nom — jamais un symbole "@" générique. Remplace
 * l'ancien `AvatarBadge`, qui n'affichait jamais `urlAvatar` (voir rapport.md).
 */
export function Avatar({ uri, name, size = 42, onPress }: Props) {
  const initial = (name?.trim().charAt(0) || '?').toUpperCase();

  const content = uri ? (
    <Image
      source={{ uri }}
      style={[styles.image, { width: size, height: size, borderRadius: size / 2 }]}
      contentFit="cover"
      transition={150}
    />
  ) : (
    <LinearGradient
      colors={AccentGradient}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.badge, { width: size, height: size, borderRadius: size / 2 }]}>
      <Text style={[styles.initial, { fontSize: size * 0.4 }]}>{initial}</Text>
    </LinearGradient>
  );

  if (!onPress) return content;
  return (
    <Pressable onPress={onPress} hitSlop={6}>
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  image: {
    backgroundColor: 'rgba(143,179,160,0.2)',
  },
  initial: {
    color: AccentOnColor,
    fontFamily: FontFamily.extraBold,
  },
});
