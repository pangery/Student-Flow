import type { PropsWithChildren } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { isIOS } from '../theme/platform';
import { useAppTheme, spacing } from '../theme/theme';

export function Screen({ children }: PropsWithChildren) {
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();
  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.background }]} edges={['top', 'left', 'right']}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: isIOS ? insets.bottom + 108 : spacing.lg }]}
        keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag"
        automaticallyAdjustKeyboardInsets
        showsVerticalScrollIndicator={false}
        overScrollMode={isIOS ? 'always' : 'never'} bounces={isIOS}
      >
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: { width: '100%', maxWidth: 760, alignSelf: 'center', flexGrow: 1,
    paddingHorizontal: spacing.md, paddingTop: spacing.xs, gap: spacing.md },
});
