import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, StyleSheet, Text, TextInput, View } from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CircleIconButton } from '@/components/CircleIconButton';
import { PrimaryButton } from '@/components/PrimaryButton';
import { useAppTheme } from '@/theme';
import { Radius, Spacing } from '@/theme/spacing';
import { FontFamily } from '@/theme/typography';

/** Même limite que la policy UPDATE de posts (migration 20261027120000). */
export const POST_CAPTION_MAX_LENGTH = 2000;

type Props = {
  visible: boolean;
  initialCaption: string;
  saving?: boolean;
  error?: string | null;
  onClose: () => void;
  onSave: (caption: string) => void;
};

/** Modification de la légende d'une publication (seul champ modifiable après publication). */
export function PostEditModal({ visible, initialCaption, saving, error, onClose, onSave }: Props) {
  const { t } = useTranslation();
  const { colors } = useAppTheme();
  const [caption, setCaption] = useState(initialCaption);
  const inputRef = useRef<TextInput>(null);

  // Montée à chaque ouverture (voir PostCard) : `caption` repart donc du texte actuel.
  // Le focus attend la fin de l'animation d'apparition.
  useEffect(() => {
    if (!visible) return;
    const timer = setTimeout(() => inputRef.current?.focus(), 350);
    return () => clearTimeout(timer);
  }, [visible]);

  const trimmed = caption.trim();
  const canSave = trimmed.length > 0 && trimmed !== initialCaption.trim();

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent onRequestClose={onClose}>
      <KeyboardAvoidingView behavior="padding" style={styles.overlay}>
        <View style={styles.backdrop} />
        <SafeAreaView edges={['bottom']} style={[styles.sheet, { backgroundColor: colors.surface, borderColor: colors.hairline }]}>
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.text }]}>{t('community.editPostTitle')}</Text>
            <CircleIconButton icon="close" onPress={onClose} size={36} />
          </View>
          <TextInput
            ref={inputRef}
            value={caption}
            onChangeText={setCaption}
            placeholder={t('community.captionPlaceholder')}
            placeholderTextColor={colors.muted}
            maxLength={POST_CAPTION_MAX_LENGTH}
            multiline
            style={[styles.input, { color: colors.text, backgroundColor: colors.chip, borderColor: colors.hairline }]}
          />
          {error ? <Text style={[styles.error, { color: colors.active }]}>{error}</Text> : null}
          <PrimaryButton
            label={t('community.editPostSave')}
            onPress={() => onSave(trimmed)}
            loading={saving}
            disabled={!canSave}
          />
        </SafeAreaView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  sheet: {
    borderTopLeftRadius: Radius.xxl,
    borderTopRightRadius: Radius.xxl,
    borderWidth: 1,
    borderBottomWidth: 0,
    padding: Spacing.lg,
    gap: Spacing.md,
    maxHeight: '80%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontFamily: FontFamily.display,
    fontSize: 18,
  },
  input: {
    minHeight: 110,
    borderWidth: 1,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    fontFamily: FontFamily.regular,
    fontSize: 14,
    textAlignVertical: 'top',
  },
  error: {
    fontFamily: FontFamily.medium,
    fontSize: 13,
  },
});
