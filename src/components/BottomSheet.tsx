import type { PropsWithChildren } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppTheme } from '../theme/theme';

export function BottomSheet({ visible, onClose, children }: PropsWithChildren<{ visible: boolean; onClose: () => void }>) {
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const theme = useAppTheme();
  return (
    <Modal visible={visible} transparent animationType="slide" statusBarTranslucent navigationBarTranslucent onRequestClose={onClose}>
      <KeyboardAvoidingView style={styles.overlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityRole="button" accessibilityLabel="Zavřít okno" />
        <View style={[styles.sheet, {
          maxHeight: height - insets.top - 16,
          paddingBottom: Math.max(insets.bottom, 16),
          backgroundColor: theme.surface, borderColor: theme.border,
        }]}>
          {children}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.55)' },
  sheet: { width: '100%', maxWidth: 760, flexShrink: 1, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    borderWidth: 1, paddingHorizontal: 20, paddingTop: 12, overflow: 'hidden' },
});
