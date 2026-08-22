import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CircleIconButton } from '@/components/CircleIconButton';
import { useConversations } from '@/api/hooks/useMessages';
import { useAppTheme } from '@/theme';
import { Spacing } from '@/theme/spacing';
import { FontFamily } from '@/theme/typography';

export function MessagesScreen() {
  const { t } = useTranslation();
  const { colors } = useAppTheme();
  const router = useRouter();
  const conversations = useConversations();

  return (
    <View style={[styles.fill, { backgroundColor: colors.screen }]}>
      <SafeAreaView style={styles.fill}>
        <View style={styles.header}>
          <CircleIconButton icon="arrow_back" onPress={() => router.back()} />
          <Text style={[styles.title, { color: colors.text }]}>{t('community.messages')}</Text>
          <View style={styles.headerSpacer} />
        </View>
        {conversations.isPending ? <ActivityIndicator color={colors.active} style={styles.loader} /> : (
          <FlatList
            data={conversations.data ?? []}
            keyExtractor={(item) => item.otherUser.id}
            contentContainerStyle={styles.list}
            ListEmptyComponent={<Text style={[styles.empty, { color: colors.muted }]}>{t('community.noMessages')}</Text>}
            renderItem={({ item }) => (
              <View style={[styles.row, { borderBottomColor: colors.hairline }]}>
                <View style={[styles.avatar, { backgroundColor: colors.chip }]}>
                  <Text style={[styles.initial, { color: colors.text }]}>{(item.otherUser.username || item.otherUser.fullName || '?').charAt(0).toUpperCase()}</Text>
                </View>
                <View style={styles.body}>
                  <Text style={[styles.name, { color: colors.text }]}>{item.otherUser.username || item.otherUser.fullName}</Text>
                  <Text numberOfLines={1} style={[styles.message, { color: colors.muted }]}>{item.lastMessage}</Text>
                </View>
                {item.unreadCount > 0 ? <View style={[styles.count, { backgroundColor: colors.active }]}><Text style={styles.countText}>{item.unreadCount}</Text></View> : null}
              </View>
            )}
          />
        )}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm },
  headerSpacer: { width: 44 },
  title: { fontFamily: FontFamily.extraBold, fontSize: 18 },
  loader: { marginTop: Spacing.xxl },
  list: { paddingHorizontal: Spacing.lg },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingVertical: Spacing.md, borderBottomWidth: 1 },
  avatar: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  initial: { fontFamily: FontFamily.bold, fontSize: 17 },
  body: { flex: 1, gap: 3 },
  name: { fontFamily: FontFamily.bold, fontSize: 14 },
  message: { fontFamily: FontFamily.regular, fontSize: 13 },
  count: { minWidth: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5 },
  countText: { color: '#fff', fontFamily: FontFamily.bold, fontSize: 11 },
  empty: { textAlign: 'center', fontFamily: FontFamily.regular, paddingTop: Spacing.xxl },
});