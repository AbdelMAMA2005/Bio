import { useTranslation } from 'react-i18next';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { openLegalLink } from '@/features/account/legalLinks';
import { useAppTheme } from '@/theme';
import { Spacing } from '@/theme/spacing';
import { FontFamily } from '@/theme/typography';

export function LegalLinks() {
  const { t } = useTranslation();
  const { colors } = useAppTheme();
  const open = (kind: 'privacy' | 'terms') => {
    openLegalLink(kind).catch(() => Alert.alert(t('legal.openErrorTitle'), t('legal.openErrorBody')));
  };
  return (
    <View style={styles.links}>
      {(['privacy', 'terms'] as const).map((kind) => (
        <Pressable key={kind} accessibilityRole="link" onPress={() => open(kind)} style={styles.link}>
          <Text style={[styles.text, { color: colors.active }]}>{t(`legal.${kind}`)}</Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  links: { marginTop: Spacing.md, gap: Spacing.xxs, alignItems: 'center' },
  link: { minHeight: 44, justifyContent: 'center', paddingHorizontal: Spacing.sm },
  text: { fontFamily: FontFamily.medium, fontSize: 12, textAlign: 'center', textDecorationLine: 'underline' },
});
