import { Image } from 'expo-image';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Accent, AccentOnColor } from '@/theme/colors';
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
 * sinon un rond vert forêt avec l'initiale du nom — jamais un symbole "@" générique. Remplace
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
    <View
      style={[styles.badge, { width: size, height: size, borderRadius: size / 2 }]}>
      <Text style={[styles.initial, { fontSize: size * 0.4 }]}>{initial}</Text>
    </View>
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
    backgroundColor: Accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  image: {
    backgroundColor: 'rgba(154,168,158,0.2)',
  },
  initial: {
    color: AccentOnColor,
    fontFamily: FontFamily.display,
  },
});
