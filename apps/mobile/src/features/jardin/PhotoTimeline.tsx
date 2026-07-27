import { Image } from 'expo-image';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import type { CollectionPhoto } from '@planai/shared';
import { ImageViewerModal } from '@/components/ImageViewerModal';
import type { SupportedLanguage } from '@/i18n';
import { formatRelativeDate } from '@/utils/format';
import { useAppTheme } from '@/theme';
import { Radius, Spacing } from '@/theme/spacing';
import { FontFamily } from '@/theme/typography';

type Props = {
  photos: CollectionPhoto[];
};

export function PhotoTimeline({ photos }: Props) {
  const { t, i18n } = useTranslation();
  const { colors } = useAppTheme();
  const language = (i18n.language as SupportedLanguage) ?? 'fr';
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);

  if (photos.length === 0) return null;

  const ordered = [...photos].reverse();

  return (
    <View style={styles.wrap}>
      <Text style={[styles.title, { color: colors.muted }]}>{t('jardin.photoTimeline')}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        {ordered.map((photo, index) => (
          <Pressable key={`${photo.date}-${index}`} style={styles.item} onPress={() => setViewerIndex(index)}>
            <Image source={{ uri: photo.url }} style={[styles.thumb, { borderColor: colors.hairline }]} />
            <Text style={[styles.date, { color: colors.muted }]} numberOfLines={1}>
              {formatRelativeDate(photo.date, language)}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      {viewerIndex !== null ? (
        <ImageViewerModal
          images={ordered.map((photo) => ({ uri: photo.url, date: photo.date }))}
          initialIndex={viewerIndex}
          onClose={() => setViewerIndex(null)}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: Spacing.xs,
  },
  title: {
    fontFamily: FontFamily.semiBold,
    fontSize: 11,
  },
  row: {
    gap: Spacing.sm,
  },
  item: {
    width: 56,
    gap: 3,
  },
  thumb: {
    width: 56,
    height: 56,
    borderRadius: Radius.md,
    borderWidth: 1,
  },
  date: {
    fontFamily: FontFamily.regular,
    fontSize: 9.5,
    textAlign: 'center',
  },
});
