import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CircleIconButton } from '@/components/CircleIconButton';
import { GradientButton } from '@/components/GradientButton';
import { useAppTheme } from '@/theme';
import { Radius, Spacing } from '@/theme/spacing';
import { FontFamily } from '@/theme/typography';

type Props = {
  visible: boolean;
  initialCaption: string;
  saving?: boolean;
  onClose: () => void;
  onSave: (caption: string) => void;
};

/**
 * Modal d'edition de la legende d'une publication.
 * Remplace l'ancien `Alert.prompt` (iOS uniquement) par une UI cross-platform
 * coherente avec le theme de l'application.
 */
export function PostEditModal({ visible, initialCaption, saving, onClose, onSave }: Props) {
  const { t } = useTranslation();
  const { colors } = useAppTheme();
  const [caption, setCaption] = useState(initialCaption);
  const inputRef = useRef<TextInput>(null);

  // Synchronise le texte a l'ouverture (cas ou le modal est reutilise pour un autre post)
  useEffect(() => {
    if (visible) {
      setCaption(initialCaption);
      // Petite temporisation pour laisser l'animation du modal se terminer avant de focus
      const timer = setTimeout(() => inputRef.current?.focus(), 350);
      return () => clearTimeout(timer);
    }
  }, [visible, initialCaption]);

  const handleSave = () => {
    const trimmed = caption.trim();
    onSave(trimmed);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <SafeAreaView style={styles.safeArea} edges={['bottom']}>
          {/* Backdrop opaque */}
          <View style={styles.backdrop} />
          <View style={[styles.sheet, { backgroundColor: colors.surface, borderColor: colors.hairline }]}>
            {/* Header */}
            <View style={styles.header}>
              <Text style={[styles.title, { color: colors.text }]}>
                {t('community.editPostTitle')}
              </Text>
              <CircleIconButton icon="close" onPress={onClose} size={36} />
            </View>

            {/* Champ de texte */}
            <TextInput
              ref={inputRef}
              value={caption}
              onChangeText={setCaption}
              placeholder={t('community.captionPlaceholder')}
              placeholderTextColor={colors.muted}
              multiline
              style={[
                styles.input,
                { color: colors.text, backgroundColor: colors.chip, borderColor: colors.hairline },
              ]}
            />

            {/* Bouton de sauvegarde */}
            <GradientButton
              label={t('community.editPostSave')}
              onPress={handleSave}
              loading={saving}
              style={styles.saveButton}
            />
          </View>
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
  safeArea: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  sheet: {
    borderTopLeftRadius: Radius.xxl,
    borderTopRightRadius: Radius.xxl,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    padding: Spacing.lg,
    gap: Spacing.md,
    maxHeight: '80%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.xs,
  },
  title: {
    fontFamily: FontFamily.extraBold,
    fontSize: 17,
  },
  input: {
    minHeight: 100,
    borderWidth: 1,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    fontFamily: FontFamily.regular,
    fontSize: 14,
    textAlignVertical: 'top',
  },
  saveButton: {
    marginTop: Spacing.xs,
  },
});
