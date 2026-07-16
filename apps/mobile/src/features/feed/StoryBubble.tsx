import { LinearGradient } from 'expo-linear-gradient';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { Icon } from '@/components/Icon';
import { useAppTheme } from '@/theme';
import { StoryGradient } from '@/theme/colors';
import { FontFamily } from '@/theme/typography';

const SIZE = 62;

type Props =
  | { variant: 'add'; label: string; onPress: () => void }
  | { variant: 'story'; name: string; initial: string; imageUri?: string; onPress?: () => void };

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

  return (
    <Pressable onPress={props.onPress} disabled={!props.onPress} style={styles.wrap}>
      <LinearGradient colors={StoryGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.gradientRing}>
        <View style={[styles.avatarInner, { backgroundColor: colors.screen }]}>
          {props.imageUri ? (
            <Image source={{ uri: props.imageUri }} style={styles.avatarImage} />
          ) : (
            <Text style={[styles.initial, { color: colors.text }]}>{props.initial.toUpperCase()}</Text>
          )}
        </View>
      </LinearGradient>
      <Text style={[styles.label, { color: colors.text }]} numberOfLines={1}>
        {props.name}
      </Text>
    </Pressable>
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
  gradientRing: {
    width: SIZE,
    height: SIZE,
    borderRadius: SIZE / 2,
    padding: 2.5,
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
    fontFamily: FontFamily.extraBold,
    fontSize: 20,
  },
  label: {
    fontFamily: FontFamily.medium,
    fontSize: 10.5,
  },
});
