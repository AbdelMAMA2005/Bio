import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon } from '@/components/Icon';
import { useAppTheme } from '@/theme';
import { Accent, AccentOnColor } from '@/theme/colors';
import type { IconName } from '@/theme/icons';
import { Radius, Spacing, TabBarHeight } from '@/theme/spacing';
import { FontFamily } from '@/theme/typography';

const TAB_META: Record<string, { icon: IconName; labelKey: string }> = {
  jardin: { icon: 'potted_plant', labelKey: 'tabs.jardin' },
  scan: { icon: 'center_focus_strong', labelKey: 'tabs.scan' },
  communaute: { icon: 'forum', labelKey: 'tabs.communaute' },
};

type TabBarRoute = { key: string; name: string };
type TabBarProps = {
  state: { index: number; routes: TabBarRoute[] };
  navigation: {
    navigate: (name: string) => void;
  };
};

export function TabBar({ state, navigation }: TabBarProps) {
  const { t } = useTranslation();
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.container,
        {
          height: TabBarHeight + insets.bottom,
          paddingBottom: insets.bottom,
          backgroundColor: colors.tabBar,
          borderTopColor: colors.tabBorder,
        },
      ]}>
      {state.routes.map((route, index) => {
        const meta = TAB_META[route.name];
        if (!meta) return null;
        const isFocused = state.index === index;
        const color = isFocused ? colors.active : colors.idle;

        const onPress = () => {
          if (!isFocused) navigation.navigate(route.name);
        };

        if (route.name === 'scan') {
          return (
            <Pressable key={route.key} onPress={onPress} hitSlop={8} style={styles.scanWrap}>
              <View style={[styles.scanButton, { borderColor: isFocused ? colors.text : 'transparent' }]}>
                <Icon name={meta.icon} size={28} color={AccentOnColor} />
              </View>
              <Text style={[styles.label, { color, marginTop: 4 }]}>{t(meta.labelKey)}</Text>
            </Pressable>
          );
        }

        return (
          <Pressable key={route.key} onPress={onPress} hitSlop={8} style={styles.tabItem}>
            <View
              style={[
                styles.iconWrap,
                { backgroundColor: isFocused ? colors.activeSoft : 'transparent' },
              ]}>
              <Icon name={meta.icon} size={24} color={color} />
            </View>
            <Text style={[styles.label, { color }]}>{t(meta.labelKey)}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-around',
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: Spacing.md,
    paddingHorizontal: Spacing.xl,
  },
  tabItem: {
    alignItems: 'center',
    gap: 3,
    width: 76,
    paddingTop: 2,
  },
  iconWrap: {
    paddingVertical: 4,
    paddingHorizontal: 14,
    borderRadius: Radius.sm,
  },
  label: {
    fontFamily: FontFamily.semiBold,
    fontSize: 10,
  },
  scanWrap: {
    alignItems: 'center',
    marginTop: -10,
  },
  scanButton: {
    width: 56,
    height: 56,
    borderRadius: Radius.xxl,
    backgroundColor: Accent,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
});
