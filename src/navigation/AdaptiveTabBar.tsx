import { memo } from 'react';
import { Ionicons } from '@expo/vector-icons';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
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

  // Mobilní navigační lišta: Sytě modrý floating navbar s designovým výřezem (notch)
  return (
    <View
      pointerEvents="box-none"
      style={[
        styles.floatingContainer,
        {
          bottom: Math.max(insets.bottom + 4, 14),
          left: Math.max(insets.left + 14, 14),
          right: Math.max(insets.right + 14, 14),
        },
      ]}
    >
      <View style={styles.floatingBarWrap}>
        <LinearGradient
          colors={
            isDark
              ? ['#0B1B3D', '#14316D', '#1D4ED8']
              : ['#1E40AF', '#2563EB', '#1D4ED8']
          }
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[
            styles.floatingBarGradient,
            {
              borderColor: isDark
                ? 'rgba(56, 189, 248, 0.45)'
                : 'rgba(255, 255, 255, 0.45)',
            },
          ]}
        >
          {/* Horní jemný skleněný odlesk */}
          <View style={styles.topGlossLine} />

          {/* Vnitřní řada tab položek */}
          <View style={styles.navRow}>
            {state.routes.map((route, index) => {
              const isFocused = state.index === index;
              const isCenter = index === 2; // Prostřední tab: Učebnice (Skripta)
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

              // Prostřední akční tlačítko vystupující nahoru z výřezu
              if (isCenter) {
                return (
                  <View key={route.key} style={styles.centerItemContainer}>
                    <Pressable
                      accessibilityRole="tab"
                      accessibilityState={{ selected: isFocused }}
                      accessibilityLabel={label}
                      onPress={onPress}
                      hitSlop={8}
                      style={({ pressed }) => [
                        styles.centerPressable,
                        pressed && { transform: [{ scale: 0.92 }] },
                      ]}
                    >
                      {/* Vnější prstenec výřezu (Notch ring) */}
                      <View
                        style={[
                          styles.centerNotchRing,
                          {
                            backgroundColor: isDark ? '#060A13' : '#F1F5F9',
                            borderColor: isDark
                              ? 'rgba(56, 189, 248, 0.4)'
                              : 'rgba(37, 99, 235, 0.3)',
                          },
                        ]}
                      >
                        <LinearGradient
                          colors={
                            isFocused
                              ? ['#38BDF8', '#0284C7']
                              : ['#2563EB', '#1E40AF']
                          }
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 1 }}
                          style={[
                            styles.centerElevatedButton,
                            {
                              shadowColor: isFocused ? '#38BDF8' : '#0284C7',
                            },
                          ]}
                        >
                          <Ionicons
                            name={iconName}
                            size={24}
                            color="#FFFFFF"
                          />
                        </LinearGradient>
                      </View>

                      <Text
                        numberOfLines={1}
                        maxFontSizeMultiplier={1.2}
                        style={[
                          styles.centerLabel,
                          {
                            color: isFocused ? '#FFFFFF' : 'rgba(255, 255, 255, 0.85)',
                            fontWeight: isFocused ? '800' : '600',
                          },
                        ]}
                      >
                        {label}
                      </Text>
                    </Pressable>
                  </View>
                );
              }

              // Běžné tab položky
              return (
                <Pressable
                  key={route.key}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: isFocused }}
                  accessibilityLabel={label}
                  onPress={onPress}
                  style={({ pressed }) => [
                    styles.navTabItem,
                    pressed && { opacity: 0.7, transform: [{ scale: 0.94 }] },
                  ]}
                >
                  <View style={styles.navIconWrapper}>
                    <Ionicons
                      name={iconName}
                      size={21}
                      color={isFocused ? '#FFFFFF' : 'rgba(219, 234, 254, 0.7)'}
                    />
                    {isFocused && <View style={styles.activeGlowDot} />}
                  </View>
                  <Text
                    numberOfLines={1}
                    maxFontSizeMultiplier={1.2}
                    style={[
                      styles.navLabel,
                      {
                        color: isFocused ? '#FFFFFF' : 'rgba(219, 234, 254, 0.75)',
                        fontWeight: isFocused ? '800' : '500',
                      },
                    ]}
                  >
                    {label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </LinearGradient>
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
  // Moderní plovoucí modrý navbar s centrálním výřezem (notch)
  floatingContainer: {
    position: 'absolute',
    left: 14,
    right: 14,
    maxWidth: 540,
    alignSelf: 'center',
    zIndex: 99,
  },
  floatingBarWrap: {
    shadowColor: '#1D4ED8',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.38,
    shadowRadius: 20,
    elevation: 16,
  },
  floatingBarGradient: {
    borderRadius: 32,
    borderWidth: 1.5,
    paddingTop: 8,
    paddingBottom: 10,
    paddingHorizontal: 6,
    overflow: 'visible',
  },
  topGlossLine: {
    position: 'absolute',
    top: 0,
    left: 36,
    right: 36,
    height: 1.5,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
    borderRadius: 1,
  },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  navTabItem: {
    flex: 1,
    minHeight: 46,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  navIconWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 26,
  },
  activeGlowDot: {
    position: 'absolute',
    bottom: -3,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#38BDF8',
    shadowColor: '#38BDF8',
    shadowOpacity: 1,
    shadowRadius: 4,
  },
  navLabel: {
    fontSize: 10,
    letterSpacing: 0.1,
  },
  centerItemContainer: {
    flex: 1.1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerPressable: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -24,
  },
  centerNotchRing: {
    width: 58,
    height: 58,
    borderRadius: 29,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerElevatedButton: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.45,
    shadowRadius: 8,
    elevation: 8,
  },
  centerLabel: {
    fontSize: 10,
    letterSpacing: 0.1,
    marginTop: 2,
  },

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
