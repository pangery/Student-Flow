import type { PropsWithChildren } from 'react';
import { Platform, ScrollView, StyleSheet, useWindowDimensions } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { isIOS, isWeb } from '../theme/platform';
import { useAppTheme, spacing } from '../theme/theme';

export function Screen({ children }: PropsWithChildren) {
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const isDesktop = isWeb && width >= 800;

  return (
    <SafeAreaView
      style={[
        styles.safe,
        {
          backgroundColor: theme.background,
          paddingLeft: isDesktop ? 240 : 0,
        },
      ]}
      edges={['top', 'left', 'right']}
    >
      <ScrollView
        contentContainerStyle={[
          styles.content,
          {
            paddingHorizontal: isDesktop ? spacing.xl : spacing.md,
            paddingTop: isDesktop ? 26 : spacing.xs,
            paddingBottom: isDesktop ? 40 : (isIOS || isWeb ? insets.bottom + 108 : spacing.lg),
            maxWidth: isDesktop ? 1440 : (isWeb ? 1040 : 760),
            alignSelf: 'center',
            width: '100%',
          },
        ]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        automaticallyAdjustKeyboardInsets
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={16}
        removeClippedSubviews={Platform.OS === 'android'}
        overScrollMode={isIOS ? 'always' : 'never'}
        bounces={isIOS}
      >
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  content: {
    width: '100%',
    alignSelf: 'center',
    flexGrow: 1,
    gap: spacing.md,
  },
});
