import { memo } from 'react';
import { Ionicons } from '@expo/vector-icons';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { BlurView } from 'expo-blur';
import { Platform, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { isIOS, isWeb } from '../theme/platform';
import { colors, radius, useAppTheme } from '../theme/theme';

export function AdaptiveTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const theme = useAppTheme();
  const isDark = theme.isDark;

  const activeColor = isDark ? '#38BDF8' : '#2563EB';
  const inactiveColor = isDark ? '#64748B' : '#94A3B8';

  const isDesktop = isWeb && width >= 800;
  const isMacOS =
    Platform.OS === 'web' &&
    typeof window !== 'undefined' &&
    ((window as any).electronAPI?.platform === 'darwin' ||
      navigator.platform?.toLowerCase().includes('mac'));

  // Plnohodnotný nativní Desktop Sidebar pro macOS / PC / Web
  if (isDesktop) {
    return (
      <View
        style={[
          styles.desktopSidebar,
          {
            backgroundColor: isDark ? '#080D1A' : '#FFFFFF',
            borderRightColor: isDark ? 'rgba(255,255,255,0.08)' : '#E2E8F0',
            paddingTop: isMacOS ? 44 : 24,
          },
        ]}
      >
        {/* Brand Hlavička aplikace */}
        <View style={styles.desktopBrandWrap}>
          <View style={styles.desktopBrandRow}>
            <View
              style={[
                styles.desktopLogoIcon,
                {
                  backgroundColor: isDark ? '#0284C7' : '#2563EB',
                  shadowColor: isDark ? '#38BDF8' : '#2563EB',
                },
              ]}
            >
              <Ionicons name="school" size={20} color="#FFFFFF" />
            </View>
            <View style={styles.desktopBrandTextWrap}>
              <Text style={[styles.desktopBrandTitle, { color: theme.text }]}>
                StudentFlow
              </Text>
              <Text style={[styles.desktopBrandSubtitle, { color: isDark ? '#38BDF8' : '#2563EB' }]}>
                UNICORN UNIVERSITY
              </Text>
            </View>
          </View>
        </View>

        {/* Sekce položek navigace */}
        <View style={styles.desktopNavSection}>
          <Text style={[styles.desktopSectionLabel, { color: isDark ? '#475569' : '#94A3B8' }]}>
            NAVIGACE
          </Text>

          {state.routes.map((route, index) => {
            const isFocused = state.index === index;
            const { options } = descriptors[route.key] ?? {};
            const label =
              options?.tabBarLabel !== undefined
                ? String(options.tabBarLabel)
                : options?.title !== undefined
                ? options.title
                : route.name;

            const onPress = () => {
              const event = navigation.emit({
                type: 'tabPress',
                target: route.key,
                canPreventDefault: true,
              });
              if (!isFocused && !event.defaultPrevented) {
                navigation.navigate(route.name);
              }
            };

            const iconName = getIOSIcon(route.name, isFocused);

            return (
              <Pressable
                key={route.key}
                accessibilityRole="tab"
                accessibilityState={{ selected: isFocused }}
                accessibilityLabel={label}
                onPress={onPress}
                style={({ pressed }) => [
                  styles.desktopNavItem,
                  isFocused && [
                    styles.desktopNavItemActive,
                    {
                      backgroundColor: isDark
                        ? 'rgba(56, 189, 248, 0.12)'
                        : '#EFF6FF',
                      borderColor: isDark
                        ? 'rgba(56, 189, 248, 0.28)'
                        : '#BFDBFE',
                    },
                  ],
                  pressed && { opacity: 0.8 },
                ]}
              >
                <Ionicons
                  name={iconName}
                  size={20}
                  color={isFocused ? activeColor : inactiveColor}
                />
                <Text
                  numberOfLines={1}
                  style={[
                    styles.desktopNavLabel,
                    {
                      color: isFocused ? activeColor : isDark ? '#CBD5E1' : '#475569',
                      fontWeight: isFocused ? '700' : '500',
                    },
                  ]}
                >
                  {label}
                </Text>
                {isFocused && (
                  <View
                    style={[
                      styles.desktopActivePill,
                      { backgroundColor: activeColor },
                    ]}
                  />
                )}
              </Pressable>
            );
          })}
        </View>

        {/* Spodní panel stavu synchronizace */}
        <View
          style={[
            styles.desktopFooterCard,
            {
              backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : '#F8FAFC',
              borderColor: isDark ? 'rgba(255,255,255,0.07)' : '#E2E8F0',
            },
          ]}
        >
          <View style={styles.desktopStatusRow}>
            <View style={styles.desktopStatusDot} />
            <Text style={[styles.desktopStatusText, { color: theme.secondary }]}>
              Plus4U synchronizováno
            </Text>
          </View>
          <Text style={[styles.desktopVersionText, { color: isDark ? '#475569' : '#94A3B8' }]}>
            StudentFlow Desktop • v1.0.0
          </Text>
        </View>
      </View>
    );
  }

  if (isIOS || isWeb) {
    return (
      <View
        style={[
          styles.iosFloatingContainer,
          {
            bottom: Math.max(insets.bottom + 6, 18),
            left: Math.max(insets.left + 16, 16),
            right: Math.max(insets.right + 16, 16),
            borderColor: isDark ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.7)',
            shadowColor: isDark ? '#000000' : '#0F172A',
            shadowOpacity: isDark ? 0.45 : 0.14,
          },
        ]}
      >
        <BlurView
          intensity={Platform.OS === 'ios' ? 75 : 90}
          tint={isDark ? 'systemChromeMaterialDark' : 'systemChromeMaterialLight'}
          style={[
            styles.iosBlur,
            {
              backgroundColor: isDark
                ? 'rgba(15, 23, 42, 0.45)'
                : 'rgba(255, 255, 255, 0.55)',
            },
          ]}
        >
          <View style={styles.iosRow}>
            {state.routes.map((route, index) => {
              const isFocused = state.index === index;
              const { options } = descriptors[route.key] ?? {};
              const label =
                options?.tabBarLabel !== undefined
                  ? String(options.tabBarLabel)
                  : options?.title !== undefined
                  ? options.title
                  : route.name;

              const onPress = () => {
                const event = navigation.emit({
                  type: 'tabPress',
                  target: route.key,
                  canPreventDefault: true,
                });
                if (!isFocused && !event.defaultPrevented) {
                  navigation.navigate(route.name);
                }
              };

              const iconName = getIOSIcon(route.name, isFocused);

              return (
                <Pressable
                  key={route.key}
                  accessibilityRole="tab" accessibilityState={{ selected: isFocused }} accessibilityLabel={label}
                  onPress={onPress}
                  style={({ pressed }) => [
                    styles.iosTabItem,
                    pressed && { opacity: 0.7, transform: [{ scale: 0.93 }] },
                  ]}
                >
                  <View style={styles.iosIconWrapper}>
                    <Ionicons
                      name={iconName}
                      size={22}
                      color={isFocused ? activeColor : inactiveColor}
                    />
                    {isFocused && (
                      <View
                        style={[
                          styles.iosActiveGlowDot,
                          {
                            backgroundColor: activeColor,
                            shadowColor: activeColor,
                          },
                        ]}
                      />
                    )}
                  </View>
                  <Text numberOfLines={1} maxFontSizeMultiplier={1.3}
                    style={[
                      styles.iosLabel,
                      { color: isFocused ? activeColor : inactiveColor },
                    ]}
                  >
                    {label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </BlurView>
      </View>
    );
  }

  // Navigace pro Android
  return (
    <View
      style={[
        styles.androidBarContainer,
        {
          paddingBottom: Math.max(insets.bottom, 8),
          backgroundColor: isDark ? '#090D16' : '#FFFFFF',
          borderTopColor: isDark ? 'rgba(255,255,255,0.08)' : '#E2E8F0',
        },
      ]}
    >
      <View style={styles.androidRow}>
        {state.routes.map((route, index) => {
          const isFocused = state.index === index;
          const { options } = descriptors[route.key] ?? {};
          const label =
            options?.tabBarLabel !== undefined
              ? String(options.tabBarLabel)
              : options?.title !== undefined
              ? options.title
              : route.name;

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });
            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          const iconName = getAndroidIcon(route.name, isFocused);

          return (
            <Pressable
              key={route.key}
              accessibilityRole="tab" accessibilityState={{ selected: isFocused }} accessibilityLabel={label}
              onPress={onPress}
              android_ripple={{
                color: isDark ? 'rgba(56,189,248,0.15)' : 'rgba(37,99,235,0.12)',
                borderless: true,
                radius: 36,
              }}
              style={styles.androidTabItem}
            >
              <View
                style={[
                  styles.androidPill,
                  isFocused && {
                    backgroundColor: isDark ? 'rgba(56,189,248,0.15)' : '#EFF6FF',
                    borderWidth: 1,
                    borderColor: isDark ? 'rgba(56,189,248,0.3)' : '#BFDBFE',
                  },
                ]}
              >
                <Ionicons
                  name={iconName}
                  size={22}
                  color={isFocused ? activeColor : inactiveColor}
                />
              </View>
              <Text numberOfLines={1} maxFontSizeMultiplier={1.3}
                style={[
                  styles.androidLabel,
                  {
                    color: isFocused ? activeColor : inactiveColor,
                    fontWeight: isFocused ? '700' : '500',
                  },
                ]}
              >
                {label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function getIOSIcon(name: string, focused: boolean): keyof typeof Ionicons.glyphMap {
  if (name === 'Přehled') return focused ? 'grid' : 'grid-outline';
  if (name === 'Rozvrh') return focused ? 'calendar' : 'calendar-outline';
  if (name === 'Učebnice') return focused ? 'book' : 'book-outline';
  if (name === 'Úkoly') return focused ? 'checkmark-circle' : 'checkmark-circle-outline';
  return focused ? 'hourglass' : 'hourglass-outline';
}

function getAndroidIcon(name: string, focused: boolean): keyof typeof Ionicons.glyphMap {
  if (name === 'Přehled') return focused ? 'grid' : 'grid-outline';
  if (name === 'Rozvrh') return focused ? 'calendar-sharp' : 'calendar-outline';
  if (name === 'Učebnice') return focused ? 'book-sharp' : 'book-outline';
  if (name === 'Úkoly') return focused ? 'checkbox' : 'checkbox-outline';
  return focused ? 'timer-sharp' : 'timer-outline';
}

const styles = StyleSheet.create({
  // iOS Floating Dark Glass Island
  iosFloatingContainer: {
    position: 'absolute',
    left: 16,
    right: 16,
    maxWidth: 540,
    alignSelf: 'center',
    borderRadius: 34,
    shadowRadius: 26,
    shadowOffset: { width: 0, height: 10 },
    elevation: 16,
    overflow: 'hidden',
    borderWidth: 0.8,
  },
  iosBlur: {
    paddingVertical: 11,
    paddingHorizontal: 8,
  },
  iosRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  iosTabItem: {
    minHeight: 48,
    minWidth: 0,
    paddingHorizontal: 2,
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    gap: 3,
  },
  iosIconWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 26,
  },
  iosActiveGlowDot: {
    position: 'absolute',
    bottom: -3,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#38BDF8',
    shadowColor: '#38BDF8',
    shadowOpacity: 0.9,
    shadowRadius: 4,
  },
  iosLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.1,
  },

  // Android Dark Docked Navigation Bar
  androidBarContainer: {
    backgroundColor: '#090D16',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
    elevation: 8,
  },
  androidRow: {
    flexDirection: 'row',
    minHeight: 72,
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  androidTabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    paddingVertical: 6,
  },
  androidPill: {
    width: '80%',
    maxWidth: 58,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  androidPillActive: {
    backgroundColor: 'rgba(56,189,248,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(56,189,248,0.3)',
  },
  androidLabel: {
    fontSize: 11.5,
    marginTop: 4,
  },
  androidLabelActive: {
    fontWeight: '700',
    color: '#38BDF8',
  },
  androidLabelInactive: {
    fontWeight: '500',
    color: '#64748B',
  },

  // Desktop Sidebar Styles
  desktopSidebar: {
    position: 'absolute' as any,
    top: 0,
    bottom: 0,
    left: 0,
    width: 240,
    height: '100%' as any,
    borderRightWidth: 1,
    zIndex: 99,
    flexDirection: 'column',
    justifyContent: 'space-between',
  },
  desktopBrandWrap: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  desktopBrandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  desktopLogoIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
  },
  desktopBrandTextWrap: {
    flexDirection: 'column',
  },
  desktopBrandTitle: {
    fontSize: 16.5,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  desktopBrandSubtitle: {
    fontSize: 9.5,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginTop: 1,
  },
  desktopNavSection: {
    flex: 1,
    paddingHorizontal: 12,
    paddingTop: 8,
    gap: 4,
  },
  desktopSectionLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
    paddingHorizontal: 12,
    paddingBottom: 8,
  },
  desktopNavItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'transparent',
    gap: 12,
  },
  desktopNavItemActive: {
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  desktopNavLabel: {
    fontSize: 13.5,
    flex: 1,
  },
  desktopActivePill: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  desktopFooterCard: {
    marginHorizontal: 12,
    marginBottom: 16,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 4,
  },
  desktopStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  desktopStatusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#22C55E',
  },
  desktopStatusText: {
    fontSize: 11.5,
    fontWeight: '600',
  },
  desktopVersionText: {
    fontSize: 10,
    fontWeight: '500',
    paddingLeft: 15,
  },
});
