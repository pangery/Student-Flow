import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';
import { isIOS, platformInfo } from '../theme/platform';
import { colors, radius, spacing, useAppTheme } from '../theme/theme';

export function AdaptiveHeader({
  title,
  subtitle,
  rightAction,
}: {
  title: string;
  subtitle?: string;
  rightAction?: React.ReactNode;
}) {
  const theme = useAppTheme();
  const isDark = theme.isDark;

  if (isIOS) {
    return (
      <View style={styles.iosContainer}>
        <View style={styles.iosHeaderRow}>
          <View style={styles.titleWrap}>
            {subtitle && (
              <Text
                style={[
                  styles.iosSubtitle,
                  { color: isDark ? '#38BDF8' : '#2563EB' },
                ]}
              >
                {subtitle.toUpperCase()}
              </Text>
            )}
            <Text style={[styles.iosTitle, { color: theme.text }]}>{title}</Text>
          </View>
          {rightAction ? (
            rightAction
          ) : (
            <View
              style={[
                styles.badgePill,
                {
                  backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#F1F5F9',
                  borderColor: theme.border,
                },
              ]}
            >
              <Text style={[styles.badgeText, { color: theme.secondary }]}>ZS 2026/27</Text>
            </View>
          )}
        </View>
      </View>
    );
  }

  // Android Top App Bar
  return (
    <View style={styles.androidContainer}>
      <View style={styles.androidRow}>
        <View style={styles.titleWrap}>
          {subtitle && (
            <Text style={[styles.androidSubtitle, { color: isDark ? '#38BDF8' : '#2563EB' }]}>
              {subtitle.toUpperCase()}
            </Text>
          )}
          <Text style={[styles.androidTitle, { color: theme.text }]}>{title}</Text>
        </View>
        {rightAction ? (
          rightAction
        ) : (
          <View
            style={[
              styles.badgePill,
              {
                backgroundColor: isDark ? 'rgba(16,185,129,0.12)' : '#ECFDF5',
                borderColor: isDark ? 'rgba(16,185,129,0.25)' : '#A7F3D0',
              },
            ]}
          >
            <Text
              style={[
                styles.badgeText,
                { color: isDark ? '#34D399' : '#059669' },
              ]}
            >
              ZS 2026/27
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // iOS
  iosContainer: {
    paddingHorizontal: 2,
    paddingTop: spacing.xs,
    paddingBottom: spacing.sm,
  },
  iosHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    gap: 12,
  },
  titleWrap: {
    flex: 1,
    minWidth: 0,
  },
  iosSubtitle: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.1,
    marginBottom: 2,
  },
  iosTitle: {
    fontSize: 30,
    fontWeight: '800',
    letterSpacing: -0.4,
  },
  badgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.pill,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.2,
  },

  // Android Material 3
  androidContainer: {
    paddingHorizontal: 2,
    paddingTop: spacing.xs,
    paddingBottom: spacing.sm,
  },
  androidRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  androidSubtitle: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  androidTitle: {
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
});

