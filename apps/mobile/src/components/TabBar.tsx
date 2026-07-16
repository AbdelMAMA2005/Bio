import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon } from '@/components/Icon';
import { useAppTheme } from '@/theme';
import { AccentGradient, AccentOnColor } from '@/theme/colors';
import type { IconName } from '@/theme/icons';
import { Spacing, TabBarHeight } from '@/theme/spacing';
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
              <LinearGradient
                colors={AccentGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[
                  styles.scanButton,
                  { borderColor: isFocused ? '#ffffff' : 'transparent', shadowColor: '#a3e635' },
                ]}>
                <Icon name={meta.icon} size={32} color={AccentOnColor} />
              </LinearGradient>
              <Text style={[styles.label, { color, marginTop: 4 }]}>{t(meta.labelKey)}</Text>
            </Pressable>
          );
        }

        return (
          <Pressable key={route.key} onPress={onPress} hitSlop={8} style={styles.tabItem}>
            <View
              style={[
                styles.pill,
                { backgroundColor: isFocused ? 'rgba(74,222,128,0.16)' : 'transparent' },
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
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: -4 },
  },
  tabItem: {
    alignItems: 'center',
    gap: 3,
    width: 76,
    paddingTop: 2,
  },
  pill: {
    paddingVertical: 4,
    paddingHorizontal: 18,
    borderRadius: 14,
  },
  label: {
    fontFamily: FontFamily.semiBold,
    fontSize: 10,
  },
  scanWrap: {
    alignItems: 'center',
    marginTop: -22,
  },
  scanButton: {
    width: 66,
    height: 66,
    borderRadius: 33,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    shadowOpacity: 0.6,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
  },
});
