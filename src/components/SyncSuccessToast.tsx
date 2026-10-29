import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Easing,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { isIOS } from '../theme/platform';
import { useAppTheme } from '../theme/theme';

export type SyncToastPayload = {
  studentName: string;
  subjectsCount: number;
  examsCount: number;
  tasksCount: number;
  warnings?: string[];
};

type Props = {
  payload: SyncToastPayload | null;
  onDismiss: () => void;
};

const DISPLAY_DURATION_MS = 4500;

export function SyncSuccessToast({ payload, onDismiss }: Props) {
  const insets = useSafeAreaInsets();
  const theme = useAppTheme();
  const isDark = theme.isDark;

  const translateY = useRef(new Animated.Value(-160)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.92)).current;
  const progressAnim = useRef(new Animated.Value(1)).current;
  const dismissTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const dismiss = () => {
    if (dismissTimeoutRef.current) {
      clearTimeout(dismissTimeoutRef.current);
      dismissTimeoutRef.current = null;
    }

    Animated.parallel([
      Animated.timing(translateY, {
        toValue: -160,
        duration: 220,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 180,
        useNativeDriver: true,
      }),
      Animated.timing(scale, {
        toValue: 0.9,
        duration: 220,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onDismiss();
    });
  };

  useEffect(() => {
    if (!payload) return;

    // Reset values
    translateY.setValue(-160);
    opacity.setValue(0);
    scale.setValue(0.92);
    progressAnim.setValue(1);

    // Enter animation: spring with subtle bounce
    Animated.parallel([
      Animated.spring(translateY, {
        toValue: 0,
        tension: 80,
        friction: 9,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 220,
        useNativeDriver: true,
      }),
      Animated.spring(scale, {
        toValue: 1,
        tension: 80,
        friction: 9,
        useNativeDriver: true,
      }),
    ]).start();

    // Smooth linear shrink of bottom progress indicator
    Animated.timing(progressAnim, {
      toValue: 0,
      duration: DISPLAY_DURATION_MS,
      easing: Easing.linear,
      useNativeDriver: false, // width animation
    }).start();

    // Auto-dismiss after duration
    dismissTimeoutRef.current = setTimeout(() => {
      dismiss();
    }, DISPLAY_DURATION_MS);

    return () => {
      if (dismissTimeoutRef.current) {
        clearTimeout(dismissTimeoutRef.current);
      }
    };
  }, [payload]);

  if (!payload) return null;

  const topOffset = Math.max(insets.top + 8, Platform.OS === 'android' ? 24 : 16);

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <Modal
      visible={Boolean(payload)}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={dismiss}
    >
      <View style={styles.modalBackdrop} pointerEvents="box-none">
        <View style={[styles.outerContainer, { top: topOffset }]} pointerEvents="box-none">
          <Animated.View
            style={[
              styles.toastCard,
              {
                transform: [{ translateY }, { scale }],
                opacity,
                backgroundColor: isDark
                  ? 'rgba(15, 23, 42, 0.94)'
                  : 'rgba(255, 255, 255, 0.96)',
                borderColor: isDark
                  ? 'rgba(56, 189, 248, 0.35)'
                  : 'rgba(37, 99, 235, 0.22)',
                shadowColor: isDark ? '#38BDF8' : '#0F172A',
              },
            ]}
          >
            <Pressable
              accessibilityRole="alert"
              accessibilityLabel="Oznámení o dokončení synchronizace Plus4U. Klepnutím zavřete."
              onPress={dismiss}
              style={styles.innerPressable}
            >
              {/* Subtle glowing accent background */}
              <LinearGradient
                colors={
                  isDark
                    ? ['rgba(16, 185, 129, 0.12)', 'rgba(56, 189, 248, 0.04)', 'transparent']
                    : ['rgba(16, 185, 129, 0.08)', 'rgba(37, 99, 235, 0.03)', 'transparent']
                }
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={StyleSheet.absoluteFill as any}
              />

              {/* Header Row */}
              <View style={styles.headerRow}>
                <View style={styles.badgeRow}>
                  <View
                    style={[
                      styles.iconGlowCircle,
                      {
                        backgroundColor: isDark
                          ? 'rgba(16, 185, 129, 0.22)'
                          : 'rgba(16, 185, 129, 0.14)',
                      },
                    ]}
                  >
                    <Ionicons name="checkmark-circle" size={17} color="#10B981" />
                  </View>
                  <Text
                    style={[
                      styles.headerTitle,
                      { color: isDark ? '#34D399' : '#059669' },
                    ]}
                  >
                    PLUS4U SYNCHRONIZACE
                  </Text>
                  <View style={styles.livePulseDot} />
                </View>

                <Pressable
                  hitSlop={12}
                  onPress={dismiss}
                  style={({ pressed }) => [styles.closeBtn, pressed && { opacity: 0.6 }]}
                >
                  <Ionicons
                    name="close"
                    size={16}
                    color={isDark ? 'rgba(255,255,255,0.6)' : '#64748B'}
                  />
                </Pressable>
              </View>

              {/* Greeting & Headline */}
              <View style={styles.bodySection}>
                <Text
                  style={[
                    styles.studentGreeting,
                    { color: isDark ? '#FFFFFF' : '#0F172A' },
                  ]}
                  numberOfLines={1}
                >
                  Vítej, {payload.studentName}!
                </Text>
                <Text
                  style={[
                    styles.subtitleText,
                    { color: isDark ? '#94A3B8' : '#475569' },
                  ]}
                >
                  Školní data Unicorn University byla úspěšně načtena.
                </Text>
              </View>

              {/* 3 Metric Chips */}
              <View style={styles.metricsRow}>
                <View
                  style={[
                    styles.metricChip,
                    {
                      backgroundColor: isDark
                        ? 'rgba(37, 99, 235, 0.16)'
                        : '#EFF6FF',
                      borderColor: isDark
                        ? 'rgba(56, 189, 248, 0.28)'
                        : '#BFDBFE',
                    },
                  ]}
                >
                  <Ionicons name="calendar" size={13} color={isDark ? '#38BDF8' : '#2563EB'} />
                  <Text
                    style={[
                      styles.metricValue,
                      { color: isDark ? '#E0F2FE' : '#1D4ED8' },
                    ]}
                  >
                    {payload.subjectsCount} hodin
                  </Text>
                </View>

                <View
                  style={[
                    styles.metricChip,
                    {
                      backgroundColor: isDark
                        ? 'rgba(245, 158, 11, 0.16)'
                        : '#FFFBEB',
                      borderColor: isDark
                        ? 'rgba(245, 158, 11, 0.28)'
                        : '#FDE68A',
                    },
                  ]}
                >
                  <Ionicons name="checkbox" size={13} color={isDark ? '#FBBF24' : '#D97706'} />
                  <Text
                    style={[
                      styles.metricValue,
                      { color: isDark ? '#FEF3C7' : '#B45309' },
                    ]}
                  >
                    {payload.tasksCount} úkolů
                  </Text>
                </View>

                <View
                  style={[
                    styles.metricChip,
                    {
                      backgroundColor: isDark
                        ? 'rgba(168, 85, 247, 0.16)'
                        : '#FAF5FF',
                      borderColor: isDark
                        ? 'rgba(168, 85, 247, 0.28)'
                        : '#E9D5FF',
                    },
                  ]}
                >
                  <Ionicons name="school" size={13} color={isDark ? '#C084FC' : '#7E22CE'} />
                  <Text
                    style={[
                      styles.metricValue,
                      { color: isDark ? '#F3E8FF' : '#6B21A8' },
                    ]}
                  >
                    {payload.examsCount} zkoušek
                  </Text>
                </View>
              </View>

              {/* Bottom Countdown Progress Line */}
              <View
                style={[
                  styles.progressTrack,
                  {
                    backgroundColor: isDark
                      ? 'rgba(255, 255, 255, 0.08)'
                      : 'rgba(0, 0, 0, 0.05)',
                  },
                ]}
              >
                <Animated.View
                  style={[
                    styles.progressBar,
                    {
                      width: progressWidth,
                      backgroundColor: isDark ? '#10B981' : '#059669',
                    },
                  ]}
                />
              </View>
            </Pressable>
          </Animated.View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  outerContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  toastCard: {
    width: '100%',
    maxWidth: 520,
    borderRadius: 22,
    borderWidth: 1,
    overflow: 'hidden',
    shadowOpacity: isIOS ? 0.35 : 0.45,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 12,
  },
  innerPressable: {
    paddingTop: 12,
    paddingHorizontal: 16,
    paddingBottom: 8,
    gap: 8,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  iconGlowCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 10.5,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  livePulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
  },
  closeBtn: {
    padding: 4,
    borderRadius: 12,
  },
  bodySection: {
    gap: 2,
  },
  studentGreeting: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  subtitleText: {
    fontSize: 12,
    fontWeight: '500',
    lineHeight: 16,
  },
  metricsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  metricChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 12,
    borderWidth: 1,
  },
  metricValue: {
    fontSize: 11,
    fontWeight: '700',
  },
  progressTrack: {
    height: 2.5,
    borderRadius: 1.5,
    overflow: 'hidden',
    marginTop: 6,
    width: '100%',
  },
  progressBar: {
    height: '100%',
    borderRadius: 1.5,
  },
});
