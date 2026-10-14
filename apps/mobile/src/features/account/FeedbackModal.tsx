import { randomUUID } from 'expo-crypto';
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CircleIconButton } from '@/components/CircleIconButton';
import { PrimaryButton } from '@/components/PrimaryButton';
import { Icon } from '@/components/Icon';
import { FeedbackError, sendFeedback, type FeedbackKind } from './feedbackApi';
import { useAppTheme } from '@/theme';
import { Radius, Spacing } from '@/theme/spacing';
import { FontFamily } from '@/theme/typography';

export function FeedbackModal({ kind, onClose }: { kind: FeedbackKind; onClose: () => void }) {
  const { t } = useTranslation();
  const { colors } = useAppTheme();
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestId = useRef<string | null>(null);
  const inFlight = useRef(false);
  const valid = message.trim().length >= 10;

  const submit = async () => {
    if (!valid || inFlight.current || sent) return;
    inFlight.current = true;
    setSending(true);
    setError(null);
    try {
      requestId.current ??= randomUUID();
      await sendFeedback(kind, message, requestId.current);
      setSent(true);
    } catch (failure) {
      setError(t(`feedback.errors.${failure instanceof FeedbackError ? failure.code : 'failed'}`));
    } finally {
      inFlight.current = false;
      setSending(false);
    }
  };

  const close = () => { if (!inFlight.current) onClose(); };
  return (
    <Modal visible animationType="slide" onRequestClose={close}>
      <SafeAreaView style={[styles.fill, { backgroundColor: colors.screen }]}>
        <KeyboardAvoidingView style={styles.fill} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View style={styles.header}>
            <CircleIconButton icon="close" onPress={close} />
            <Text style={[styles.title, { color: colors.text }]}>{t(`feedback.${kind}Title`)}</Text>
            <View style={{ width: 44 }} />
          </View>
          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            {sent ? (
              <View style={styles.success}>
                <Icon name="check_circle" size={56} color={colors.active} />
                <Text accessibilityRole="header" style={[styles.title, { color: colors.text }]}>{t('feedback.sentTitle')}</Text>
                <Text style={[styles.body, { color: colors.muted }]}>{t('feedback.sentBody')}</Text>
                <PrimaryButton label={t('common.close')} onPress={onClose} />
              </View>
            ) : (
              <>
                <Text style={[styles.body, { color: colors.muted }]}>{t(`feedback.${kind}Body`)}</Text>
                <Text style={[styles.label, { color: colors.text }]}>{t('feedback.messageLabel')}</Text>
                <TextInput
                  accessibilityLabel={t('feedback.messageLabel')}
                  value={message}
                  onChangeText={(text) => { setMessage(text); setError(null); requestId.current = null; }}
                  placeholder={t(`feedback.${kind}Placeholder`)}
                  placeholderTextColor={colors.muted}
                  multiline textAlignVertical="top" maxLength={3000} editable={!sending}
                  style={[styles.input, { color: colors.text, backgroundColor: colors.surface, borderColor: colors.hairline }]}
                />
                <Text style={[styles.count, { color: colors.muted }]}>{message.length}/3000 · {t('feedback.minimum')}</Text>
                <Text style={[styles.body, { color: colors.muted }]}>{t('feedback.privacy')}</Text>
                {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
                <PrimaryButton label={t('feedback.send')} onPress={submit} loading={sending} disabled={!valid} />
              </>
            )}
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.lg },
  title: { fontFamily: FontFamily.display, fontSize: 17, flexShrink: 1, textAlign: 'center' },
  content: { padding: Spacing.lg, gap: Spacing.md },
  body: { fontFamily: FontFamily.regular, fontSize: 14, lineHeight: 21 },
  label: { fontFamily: FontFamily.semiBold, fontSize: 14 },
  input: { minHeight: 180, borderWidth: 1, borderRadius: Radius.lg, padding: Spacing.md, fontFamily: FontFamily.regular, fontSize: 15, lineHeight: 23 },
  count: { fontFamily: FontFamily.regular, fontSize: 12, textAlign: 'right' },
  error: { color: '#c8504a', fontFamily: FontFamily.medium, fontSize: 13, lineHeight: 20 },
  success: { gap: Spacing.lg, paddingTop: Spacing.xl },
});
