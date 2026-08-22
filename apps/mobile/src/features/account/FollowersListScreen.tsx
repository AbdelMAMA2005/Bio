import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CircleIconButton } from '@/components/CircleIconButton';
import { SegmentedControl } from '@/components/SegmentedControl';
import { useAppTheme } from '@/theme';
import { Spacing } from '@/theme/spacing';
import { FontFamily } from '@/theme/typography';
import { apiClient } from '@/api/client';
import { USE_MOCK_API } from '@/api/config';

type Tab = 'followers' | 'following';

type SimpleUser = {
  id: string;
  pseudo?: string;
  fullName?: string;
  email?: string;
};

export function FollowersListScreen() {
  const { t } = useTranslation();
  const { colors } = useAppTheme();
  const router = useRouter();
  const params = useLocalSearchParams<{ userId: string; tab?: string }>();
  const userId = params.userId ?? '';
  const initialTab: Tab = params.tab === 'following' ? 'following' : 'followers';

  const [tab, setTab] = useState<Tab>(initialTab);
  const [followers, setFollowers] = useState<SimpleUser[]>([]);
  const [following, setFollowing] = useState<SimpleUser[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchList = useCallback(async (which: Tab) => {
    if (USE_MOCK_API || !userId) return;
    setLoading(true);
    try {
      if (which === 'followers') {
        const { data } = await apiClient.get<{ count: number; followers: SimpleUser[] }>(
          `/followers/${userId}/followers`,
        );
        setFollowers(data.followers);
      } else {
        const { data } = await apiClient.get<{ count: number; following: SimpleUser[] }>(
          `/followers/${userId}/following`,
        );
        setFollowing(data.following);
      }
    } catch {
      // Silently fail — list stays empty
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchList(tab);
  }, [tab, fetchList]);

  const data = tab === 'followers' ? followers : following;

  const renderItem = ({ item }: { item: SimpleUser }) => (
    <View style={[styles.row, { borderBottomColor: colors.hairline }]}>
      <View style={[styles.avatarCircle, { backgroundColor: colors.chip }]}>
        <Text style={[styles.avatarInitial, { color: colors.text }]}>
          {(item.fullName ?? item.pseudo ?? '?').charAt(0).toUpperCase()}
        </Text>
      </View>
      <View style={styles.rowInfo}>
        <Text style={[styles.name, { color: colors.text }]}>{item.fullName ?? item.pseudo ?? t('account.unknownUser')}</Text>
        {item.pseudo ? (
          <Text style={[styles.username, { color: colors.muted }]}>@{item.pseudo}</Text>
        ) : null}
      </View>
    </View>
  );

  return (
    <View style={[styles.fill, { backgroundColor: colors.screen }]}>
      <SafeAreaView style={styles.fill}>
        <View style={styles.header}>
          <CircleIconButton icon="arrow_back" onPress={() => router.back()} />
          <Text style={[styles.headerTitle, { color: colors.text }]}>
            {tab === 'followers' ? t('account.followersTitle') : t('account.followingTitle')}
          </Text>
          <View style={{ width: 44 }} />
        </View>

        <View style={styles.segmentWrap}>
          <SegmentedControl
            fullWidth
            value={tab}
            onChange={(v) => setTab(v as Tab)}
            options={[
              { value: 'followers', label: t('account.followersTab') },
              { value: 'following', label: t('account.followingTab') },
            ]}
          />
        </View>

        {loading ? (
          <ActivityIndicator color={colors.active} style={styles.loader} />
        ) : (
          <FlatList
            data={data}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={
              <Text style={[styles.empty, { color: colors.muted }]}>
                {tab === 'followers' ? t('account.noFollowers') : t('account.noFollowing')}
              </Text>
            }
          />
        )}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
  headerTitle: {
    fontFamily: FontFamily.extraBold,
    fontSize: 17,
  },
  segmentWrap: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  loader: {
    marginTop: Spacing.xxl,
  },
  listContent: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xxl,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    gap: Spacing.md,
  },
  avatarCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    fontFamily: FontFamily.bold,
    fontSize: 16,
  },
  rowInfo: {
    flex: 1,
    gap: 2,
  },
  name: {
    fontFamily: FontFamily.semiBold,
    fontSize: 14,
  },
  username: {
    fontFamily: FontFamily.regular,
    fontSize: 12,
  },
  empty: {
    fontFamily: FontFamily.regular,
    fontSize: 13,
    textAlign: 'center',
    paddingTop: Spacing.xxl,
  },
});
