import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CircleIconButton } from '@/components/CircleIconButton';
import { GradientButton } from '@/components/GradientButton';
import { apiClient } from '@/api/client';
import { useAppTheme } from '@/theme';
import { Spacing } from '@/theme/spacing';
import { FontFamily } from '@/theme/typography';
import { formatUsername } from '@/utils/format';

type PublicProfile = {
  id: string;
  fullName: string;
  username: string;
  urlAvatar: string | null;
  garden: Array<{ id: string; nomCommun: string; nomScientifique: string; urlImage: string | null }>;
  posts: Array<{ id: string; contenuTexte: string; imageUrl: string | null; dateCreation: string }>;
};

export default function PublicProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { t } = useTranslation();
  const { colors } = useAppTheme();
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!id) return;
    apiClient.get<PublicProfile>(`/users/${id}`).then(({ data }) => setProfile(data)).catch(() => {});
    apiClient.get<{ isConnected: boolean }>(`/connections/${id}/is-connected`).then(({ data }) => setConnected(data.isConnected)).catch(() => {});
  }, [id]);

  const toggleConnection = async () => {
    if (!id) return;
    if (connected) await apiClient.delete(`/connections/${id}/disconnect`);
    else await apiClient.post(`/connections/${id}/connect`);
    setConnected(!connected);
  };

  return (
    <View style={[styles.fill, { backgroundColor: colors.screen }]}>
      <SafeAreaView style={styles.fill}>
        <View style={styles.header}>
          <CircleIconButton icon="arrow_back" onPress={() => router.back()} />
          <Text style={[styles.title, { color: colors.text }]}>{t('account.publicProfile')}</Text>
          <View style={styles.spacer} />
        </View>
        {!profile ? <ActivityIndicator color={colors.active} style={styles.loader} /> : (
          <View style={styles.content}>
            <View style={[styles.avatar, { backgroundColor: colors.chip }]}><Text style={[styles.initial, { color: colors.text }]}>{(profile.fullName || profile.username).charAt(0).toUpperCase()}</Text></View>
            <Text style={[styles.name, { color: colors.text }]}>{profile.fullName || profile.username}</Text>
            <Text style={[styles.username, { color: colors.muted }]}>{formatUsername(profile.username)}</Text>
            <GradientButton label={connected ? t('account.removeConnection') : t('account.addConnection')} onPress={toggleConnection} />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('account.gardenTitle', 'Jardin public')}</Text>
            {profile.garden.length === 0 ? <Text style={[styles.empty, { color: colors.muted }]}>{t('account.emptyGarden', 'Aucune plante publique')}</Text> : profile.garden.map((plant) => (
              <View key={plant.id} style={[styles.item, { backgroundColor: colors.surface, borderColor: colors.hairline }]}>
                {plant.urlImage ? <Image source={{ uri: plant.urlImage }} style={styles.itemImage} /> : null}
                <View style={styles.itemText}><Text style={[styles.itemName, { color: colors.text }]}>{plant.nomCommun}</Text><Text style={[styles.itemLatin, { color: colors.muted }]}>{plant.nomScientifique}</Text></View>
              </View>
            ))}
            <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('account.postsTitle', 'Publications')}</Text>
            {profile.posts.length === 0 ? <Text style={[styles.empty, { color: colors.muted }]}>{t('account.emptyPosts', 'Aucune publication')}</Text> : profile.posts.map((post) => (
              <View key={post.id} style={[styles.post, { backgroundColor: colors.surface, borderColor: colors.hairline }]}>
                {post.imageUrl ? <Image source={{ uri: post.imageUrl }} style={styles.postImage} /> : null}
                {post.contenuTexte ? <Text style={[styles.postText, { color: colors.text }]}>{post.contenuTexte}</Text> : null}
              </View>
            ))}
          </View>
        )}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm },
  title: { fontFamily: FontFamily.extraBold, fontSize: 18 },
  spacer: { width: 44 },
  loader: { marginTop: Spacing.xxl },
  content: { alignItems: 'center', gap: Spacing.sm, padding: Spacing.xxl },
  avatar: { width: 88, height: 88, borderRadius: 44, alignItems: 'center', justifyContent: 'center' },
  initial: { fontFamily: FontFamily.extraBold, fontSize: 32 },
  name: { fontFamily: FontFamily.bold, fontSize: 20 },
  username: { fontFamily: FontFamily.regular, fontSize: 14, marginBottom: Spacing.md },
  sectionTitle: { alignSelf: 'stretch', fontFamily: FontFamily.extraBold, fontSize: 16, marginTop: Spacing.lg },
  empty: { fontFamily: FontFamily.regular, fontSize: 13 },
  item: { alignSelf: 'stretch', flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, borderWidth: 1, borderRadius: 10, padding: Spacing.sm },
  itemImage: { width: 48, height: 48, borderRadius: 8 },
  itemText: { flex: 1, gap: 2 },
  itemName: { fontFamily: FontFamily.bold, fontSize: 14 },
  itemLatin: { fontFamily: FontFamily.regular, fontSize: 12 },
  post: { alignSelf: 'stretch', borderWidth: 1, borderRadius: 10, overflow: 'hidden', padding: Spacing.sm, gap: Spacing.sm },
  postImage: { width: '100%', aspectRatio: 16 / 10, borderRadius: 8 },
  postText: { fontFamily: FontFamily.regular, fontSize: 13, lineHeight: 18 },
});
