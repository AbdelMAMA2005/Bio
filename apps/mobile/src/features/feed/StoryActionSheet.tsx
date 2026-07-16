import { useTranslation } from 'react-i18next';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Icon } from '@/components/Icon';
import { HitTarget, Radius, Spacing } from '@/theme/spacing';
import { useAppTheme } from '@/theme';
import { FontFamily } from '@/theme/typography';

type Props = {
  visible: boolean;
  onPickCamera: () => void;
  onPickGallery: () => void;
  onCancel: () => void;
};

export function StoryActionSheet({ visible, onPickCamera, onPickGallery, onCancel }: Props) {
  const { t } = useTranslation();
  const { colors } = useAppTheme();

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onCancel}>
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onCancel} />
        <SafeAreaView edges={['bottom']} style={[styles.sheet, { backgroundColor: colors.surface, borderColor: colors.hairline }]}>
          <View style={[styles.handle, { backgroundColor: colors.hairline }]} />

          <Pressable style={[styles.option, { borderBottomColor: colors.hairline }]} onPress={onPickCamera}>
            <Icon name="camera_alt" size={20} color={colors.text} />
            <Text style={[styles.optionLabel, { color: colors.text }]}>{t('community.takePhoto')}</Text>
          </Pressable>
          <Pressable style={[styles.option, { borderBottomColor: colors.hairline }]} onPress={onPickGallery}>
            <Icon name="photo_library" size={20} color={colors.text} />
            <Text style={[styles.optionLabel, { color: colors.text }]}>{t('community.chooseFromGallery')}</Text>
          </Pressable>
          <Pressable style={styles.option} onPress={onCancel}>
            <Icon name="close" size={20} color={colors.muted} />
            <Text style={[styles.optionLabel, { color: colors.muted }]}>{t('common.cancel')}</Text>
          </Pressable>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(6,12,9,0.6)',
  },
  sheet: {
    borderWidth: 1,
    borderTopLeftRadius: Radius.xxl,
    borderTopRightRadius: Radius.xxl,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    alignItems: 'center',
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    marginBottom: Spacing.sm,
  },
  option: {
    minHeight: HitTarget,
    alignSelf: 'stretch',
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  optionLabel: {
    fontFamily: FontFamily.semiBold,
    fontSize: 14.5,
  },
});
