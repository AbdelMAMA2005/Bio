import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CircleIconButton } from '@/components/CircleIconButton';
import { useNotifications } from '@/api/hooks/useNotifications';
import { useAppTheme } from '@/theme';
import { Spacing } from '@/theme/spacing';
import { FontFamily } from '@/theme/typography';

export function NotificationsScreen() {
  const { t } = useTranslation();
  const { colors } = useAppTheme();
  const router = useRouter();
  const notifications = useNotifications();

  return (
    <View style={[styles.fill, { backgroundColor: colors.screen }]}>
      <SafeAreaView style={styles.fill}>
        <View style={styles.header}>
          <CircleIconButton icon="arrow_back" onPress={() => router.back()} />
          <Text style={[styles.title, { color: colors.text }]}>{t('community.notifications')}</Text>
          <View style={styles.spacer} />
        </View>
        {notifications.isPending ? <ActivityIndicator color={colors.active} style={styles.loader} /> : (
          <FlatList
            data={notifications.data ?? []}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.list}
            ListEmptyComponent={<Text style={[styles.empty, { color: colors.muted }]}>{t('community.noNotifications')}</Text>}
            renderItem={({ item }) => <View style={[styles.row, { borderBottomColor: colors.hairline, opacity: item.isRead ? 0.65 : 1 }]}><Text style={[styles.message, { color: colors.text }]}>{item.message}</Text></View>}
          />
        )}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm },
  spacer: { width: 44 },
  title: { fontFamily: FontFamily.extraBold, fontSize: 18 },
  loader: { marginTop: Spacing.xxl },
  list: { paddingHorizontal: Spacing.lg },
  row: { paddingVertical: Spacing.md, borderBottomWidth: 1 },
  message: { fontFamily: FontFamily.regular, fontSize: 14 },
  empty: { textAlign: 'center', fontFamily: FontFamily.regular, paddingTop: Spacing.xxl },
});