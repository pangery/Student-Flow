import { Ionicons } from '@expo/vector-icons';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { BlurView } from 'expo-blur';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { isIOS } from '../theme/platform';
import { colors, radius, useAppTheme } from '../theme/theme';

export function AdaptiveTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const theme = useAppTheme();
  const isDark = theme.isDark;

  const activeColor = isDark ? '#38BDF8' : '#2563EB';
  const inactiveColor = isDark ? '#64748B' : '#94A3B8';

  if (isIOS) {
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

  // --- Android Luxury Navigation Bar ---
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
});
