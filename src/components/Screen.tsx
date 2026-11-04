import type { PropsWithChildren } from 'react';
import { ScrollView, StyleSheet, useWindowDimensions } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { isIOS, isWeb } from '../theme/platform';
import { useAppTheme, spacing } from '../theme/theme';

export function Screen({ children }: PropsWithChildren) {
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const isDesktop = isWeb && width >= 800;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.background }]} edges={['top', 'left', 'right']}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          {
            paddingLeft: isDesktop ? 260 : spacing.md,
            paddingRight: isDesktop ? spacing.xl : spacing.md,
            paddingBottom: isDesktop ? spacing.xl : (isIOS || isWeb ? insets.bottom + 108 : spacing.lg),
            maxWidth: isDesktop ? 1380 : (isWeb ? 1040 : 760),
            alignSelf: isDesktop ? 'stretch' : 'center',
          },
        ]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        automaticallyAdjustKeyboardInsets
        showsVerticalScrollIndicator={false}
        overScrollMode={isIOS ? 'always' : 'never'}
        bounces={isIOS}
      >
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: {
    width: '100%',
    maxWidth: isWeb ? 1040 : 760,
    alignSelf: 'center',
    flexGrow: 1,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xs,
    gap: spacing.md,
  },
});
