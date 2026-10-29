import type { PropsWithChildren } from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';
import { isIOS } from '../theme/platform';
import { useAppTheme, radius, spacing } from '../theme/theme';

export function Card({ children, style }: PropsWithChildren<{ style?: ViewStyle }>) {
  const theme = useAppTheme();

  return (
    <View
      style={[
        isIOS ? styles.iosCard : styles.androidCard,
        {
          backgroundColor: theme.surface,
          borderColor: theme.border,
          shadowColor: theme.cardShadow,
          shadowOpacity: theme.cardShadowOpacity,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  iosCard: {
    padding: spacing.md,
    borderRadius: radius.medium,
    borderWidth: 1,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 4 },
  },
  androidCard: {
    padding: spacing.md,
    borderRadius: radius.medium,
    borderWidth: 1,
    elevation: 3,
  },
});
