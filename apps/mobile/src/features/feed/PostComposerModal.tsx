import * as ImagePicker from 'expo-image-picker';
import { Image } from 'expo-image';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CircleIconButton } from '@/components/CircleIconButton';
import { GradientButton } from '@/components/GradientButton';
import { Icon } from '@/components/Icon';
import { SecondaryButton } from '@/components/SecondaryButton';
import { useTaggableCollection } from '@/api/hooks/useFeed';
import { useAppTheme } from '@/theme';
import { Radius, Spacing } from '@/theme/spacing';
import { FontFamily } from '@/theme/typography';

type Props = {
  visible: boolean;
  onClose: () => void;
  onPublish: (input: { imageUri: string; texte: string; collectionItemId?: string }) => void;
  publishing?: boolean;
};

export function PostComposerModal({ visible, onClose, onPublish, publishing }: Props) {
  const { t } = useTranslation();
  const { colors } = useAppTheme();
  const taggable = useTaggableCollection();

  const [imageUri, setImageUri] = useState<string | null>(null);
  const [texte, setTexte] = useState('');
  const [collectionItemId, setCollectionItemId] = useState<string | undefined>(undefined);

  const reset = () => {
    setImageUri(null);
    setTexte('');
    setCollectionItemId(undefined);
  };

  const close = () => {
    reset();
    onClose();
  };

  const pickFromCamera = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) return;
    const result = await ImagePicker.launchCameraAsync({ quality: 0.6 });
    if (!result.canceled && result.assets[0]) setImageUri(result.assets[0].uri);
  };

  const pickFromGallery = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return;
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.6 });
    if (!result.canceled && result.assets[0]) setImageUri(result.assets[0].uri);
  };

  const handlePublish = () => {
    if (!imageUri) return;
    onPublish({ imageUri, texte: texte.trim(), collectionItemId });
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={close}>
      <View style={[styles.fill, { backgroundColor: colors.screen }]}>
        <SafeAreaView style={styles.fill} edges={['top', 'bottom']}>
          <View style={styles.header}>
            <CircleIconButton icon="close" onPress={close} />
            <Text style={[styles.headerTitle, { color: colors.text }]}>{t('community.newPost')}</Text>
            <View style={{ width: 44 }} />
          </View>

          <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            {imageUri ? (
              <Pressable onPress={() => setImageUri(null)}>
                <Image source={{ uri: imageUri }} style={styles.preview} />
              </Pressable>
            ) : (
              <View style={[styles.pickerBox, { backgroundColor: colors.chip, borderColor: colors.hairline }]}>
                <Text style={[styles.pickerLabel, { color: colors.muted }]}>{t('community.choosePhoto')}</Text>
                <View style={styles.pickerActions}>
                  <SecondaryButton label={t('community.takePhoto')} icon="camera_alt" onPress={pickFromCamera} style={styles.pickerButton} />
                  <SecondaryButton
                    label={t('community.chooseFromGallery')}
                    icon="photo_library"
                    onPress={pickFromGallery}
                    style={styles.pickerButton}
                  />
                </View>
              </View>
            )}

            <TextInput
              value={texte}
              onChangeText={setTexte}
              placeholder={t('community.captionPlaceholder')}
              placeholderTextColor={colors.muted}
              multiline
              style={[styles.input, { color: colors.text, backgroundColor: colors.chip, borderColor: colors.hairline }]}
            />

            <Text style={[styles.sectionLabel, { color: colors.muted }]}>{t('community.tagPlant')}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tagRow}>
              <Pressable
                onPress={() => setCollectionItemId(undefined)}
                style={[
                  styles.tagChip,
                  { backgroundColor: !collectionItemId ? colors.tabBar : colors.chip, borderColor: colors.hairline },
                ]}>
                <Text style={[styles.tagLabel, { color: !collectionItemId ? colors.active : colors.muted }]}>
                  {t('community.noTag')}
                </Text>
              </Pressable>
              {(taggable.data ?? []).map((item) => {
                const selected = collectionItemId === item.collectionItemId;
                return (
                  <Pressable
                    key={item.collectionItemId}
                    onPress={() => setCollectionItemId(item.collectionItemId)}
                    style={[
                      styles.tagChip,
                      { backgroundColor: selected ? colors.tabBar : colors.chip, borderColor: colors.hairline },
                    ]}>
                    <Icon
                      name={item.type === 'owned' ? 'potted_plant' : 'menu_book'}
                      size={14}
                      color={selected ? colors.active : colors.muted}
                    />
                    <Text style={[styles.tagLabel, { color: selected ? colors.active : colors.muted }]}>
                      {item.plant.nomCommun}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            <GradientButton
              label={t('community.publish')}
              onPress={handlePublish}
              disabled={!imageUri}
              loading={publishing}
              style={styles.publishButton}
            />
          </ScrollView>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.sm,
  },
  headerTitle: {
    fontFamily: FontFamily.extraBold,
    fontSize: 17,
  },
  content: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xxl,
    gap: Spacing.md,
  },
  preview: {
    width: '100%',
    aspectRatio: 4 / 3,
    borderRadius: Radius.lg,
  },
  pickerBox: {
    aspectRatio: 4 / 3,
    borderWidth: 1,
    borderRadius: Radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.md,
    padding: Spacing.lg,
  },
  pickerLabel: {
    fontFamily: FontFamily.semiBold,
    fontSize: 13,
  },
  pickerActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
    alignSelf: 'stretch',
  },
  pickerButton: {
    flex: 1,
  },
  input: {
    minHeight: 80,
    borderWidth: 1,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    fontFamily: FontFamily.regular,
    fontSize: 13.5,
    textAlignVertical: 'top',
  },
  sectionLabel: {
    fontFamily: FontFamily.semiBold,
    fontSize: 12,
  },
  tagRow: {
    gap: Spacing.sm,
  },
  tagChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderWidth: 1,
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  tagLabel: {
    fontFamily: FontFamily.semiBold,
    fontSize: 12,
  },
  publishButton: {
    marginTop: Spacing.sm,
  },
});
