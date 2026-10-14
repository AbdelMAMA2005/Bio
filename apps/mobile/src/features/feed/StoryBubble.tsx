import { Image } from 'expo-image';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Icon } from '@/components/Icon';
import { useAppTheme } from '@/theme';
import { FontFamily } from '@/theme/typography';

const SIZE = 62;
const BADGE_SIZE = 22;

type Props =
  | { variant: 'add'; label: string; onPress: () => void }
  | {
      variant: 'story';
      name: string;
      initial: string;
      thumbnailUri?: string;
      /** `true` si tous les médias de la bulle ont déjà été vus (anneau gris plutôt que vert). */
      seen: boolean;
      onPress: () => void;
      /** Badge "+" superposé — uniquement sur "Ta story" quand elle a déjà du contenu. */
      onPressAdd?: () => void;
    };

export function StoryBubble(props: Props) {
  const { colors } = useAppTheme();

  if (props.variant === 'add') {
    return (
      <Pressable onPress={props.onPress} style={styles.wrap} hitSlop={4}>
        <View style={[styles.dashedRing, { borderColor: colors.muted }]}>
          <View style={[styles.addInner, { backgroundColor: colors.chip }]}>
            <Icon name="add" size={22} color={colors.active} />
          </View>
        </View>
        <Text style={[styles.label, { color: colors.muted }]} numberOfLines={1}>
          {props.label}
        </Text>
      </Pressable>
    );
  }

  const ringColor = props.seen ? colors.idle : colors.active;

  return (
    <View style={styles.wrap}>
      <Pressable onPress={props.onPress}>
        <View style={[styles.ring, { borderColor: ringColor }]}>
          <View style={[styles.avatarInner, { backgroundColor: colors.screen }]}>
            {props.thumbnailUri ? (
              <Image source={{ uri: props.thumbnailUri }} style={styles.avatarImage} />
            ) : (
              <Text style={[styles.initial, { color: colors.text }]}>{props.initial.toUpperCase()}</Text>
            )}
          </View>
        </View>
        {props.onPressAdd ? (
          <Pressable
            onPress={props.onPressAdd}
            hitSlop={6}
            style={[styles.addBadge, { backgroundColor: colors.active, borderColor: colors.screen }]}>
            <Icon name="add" size={14} color={colors.screen} />
          </Pressable>
        ) : null}
      </Pressable>
      <Text style={[styles.label, { color: colors.text }]} numberOfLines={1}>
        {props.name}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: 68,
    alignItems: 'center',
    gap: 5,
  },
  dashedRing: {
    width: SIZE,
    height: SIZE,
    borderRadius: SIZE / 2,
    borderWidth: 2,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addInner: {
    width: SIZE - 12,
    height: SIZE - 12,
    borderRadius: (SIZE - 12) / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ring: {
    width: SIZE,
    height: SIZE,
    borderRadius: SIZE / 2,
    borderWidth: 2,
    padding: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInner: {
    flex: 1,
    alignSelf: 'stretch',
    borderRadius: SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  initial: {
    fontFamily: FontFamily.display,
    fontSize: 20,
  },
  addBadge: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    width: BADGE_SIZE,
    height: BADGE_SIZE,
    borderRadius: BADGE_SIZE / 2,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontFamily: FontFamily.medium,
    fontSize: 10.5,
  },
});
