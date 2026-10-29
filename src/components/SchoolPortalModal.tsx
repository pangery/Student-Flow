import { Ionicons } from '@expo/vector-icons';
import { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView, type WebViewNavigation } from 'react-native-webview';
import { isIOS } from '../theme/platform';
import { radius, useAppTheme } from '../theme/theme';

type Props = {
  visible: boolean;
  url: string | null;
  title?: string;
  onClose: () => void;
  idToken?: string;
};

export function SchoolPortalModal({
  visible,
  url,
  title,
  onClose,
  idToken,
}: Props) {
  const theme = useAppTheme();
  const isDark = theme.isDark;

  const webViewRef = useRef<any>(null);
  const [progress, setProgress] = useState(0);
  const [canGoBack, setCanGoBack] = useState(false);
  const [canGoForward, setCanGoForward] = useState(false);
  const [currentUrl, setCurrentUrl] = useState<string>(url ?? '');

  if (!url) return null;

  const handleOpenInSystemBrowser = () => {
    const target = currentUrl || url;
    Linking.openURL(target).catch(() => {
      Alert.alert('Chyba', 'Nelze otevřít odkaz v systémovém prohlížeči.');
    });
  };

  const domain = (() => {
    try {
      const parsed = new URL(currentUrl || url);
      return parsed.hostname;
    } catch {
      return 'uuapp.plus4u.net';
    }
  })();

  const tokenInjectionScript = idToken
    ? `
      (function() {
        try {
          window.__STUDENTFLOW_TOKEN__ = ${JSON.stringify(idToken)};
          if (!sessionStorage.getItem('plus4u_token')) {
            sessionStorage.setItem('plus4u_token', ${JSON.stringify(idToken)});
          }
          if (!localStorage.getItem('plus4u_token')) {
            localStorage.setItem('plus4u_token', ${JSON.stringify(idToken)});
          }
        } catch (e) {}
      })();
      true;
    `
    : undefined;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle={isIOS ? 'pageSheet' : 'overFullScreen'}
      onRequestClose={onClose}
    >
      <SafeAreaView
        style={[styles.container, { backgroundColor: theme.background }]}
        edges={['top', 'bottom']}
      >
        {/* Navigation / Header Bar */}
        <View
          style={[
            styles.header,
            {
              backgroundColor: theme.surface,
              borderBottomColor: theme.border,
            },
          ]}
        >
          {/* Left Navigation: Back & Forward & Reload */}
          <View style={styles.navGroup}>
            <Pressable
              disabled={!canGoBack}
              onPress={() => webViewRef.current?.goBack()}
              hitSlop={6}
              style={({ pressed }) => [
                styles.iconBtn,
                !canGoBack && styles.btnDisabled,
                pressed && { opacity: 0.6 },
              ]}
              accessibilityRole="button"
              accessibilityLabel="Zpět"
            >
              <Ionicons
                name="chevron-back"
                size={20}
                color={canGoBack ? theme.text : theme.muted}
              />
            </Pressable>

            <Pressable
              disabled={!canGoForward}
              onPress={() => webViewRef.current?.goForward()}
              hitSlop={6}
              style={({ pressed }) => [
                styles.iconBtn,
                !canGoForward && styles.btnDisabled,
                pressed && { opacity: 0.6 },
              ]}
              accessibilityRole="button"
              accessibilityLabel="Vpřed"
            >
              <Ionicons
                name="chevron-forward"
                size={20}
                color={canGoForward ? theme.text : theme.muted}
              />
            </Pressable>

            <Pressable
              onPress={() => webViewRef.current?.reload()}
              hitSlop={6}
              style={({ pressed }) => [styles.iconBtn, pressed && { opacity: 0.6 }]}
              accessibilityRole="button"
              accessibilityLabel="Obnovit stránku"
            >
              <Ionicons
                name="reload"
                size={16}
                color={theme.secondary}
              />
            </Pressable>
          </View>

          {/* Center Title & Domain Badge */}
          <View style={styles.titleGroup}>
            <Text
              numberOfLines={1}
              style={[styles.titleText, { color: theme.text }]}
            >
              {title || 'Unicorn University'}
            </Text>
            <View style={styles.domainRow}>
              <Ionicons
                name="lock-closed"
                size={11}
                color={isDark ? '#34D399' : '#059669'}
              />
              <Text style={[styles.domainText, { color: theme.secondary }]}>
                {domain}
              </Text>
            </View>
          </View>

          {/* Right Action: Open in External Safari/Chrome + Close Button */}
          <View style={styles.rightGroup}>
            <Pressable
              onPress={handleOpenInSystemBrowser}
              hitSlop={6}
              style={({ pressed }) => [
                styles.externalBtn,
                {
                  backgroundColor: isDark
                    ? 'rgba(255,255,255,0.06)'
                    : '#F1F5F9',
                  borderColor: theme.border,
                },
                pressed && { opacity: 0.7 },
              ]}
              accessibilityRole="button"
              accessibilityLabel="Otevřít v systémovém prohlížeči"
            >
              <Ionicons
                name="open-outline"
                size={14}
                color={isDark ? '#38BDF8' : '#2563EB'}
              />
            </Pressable>

            <Pressable
              onPress={onClose}
              hitSlop={8}
              style={({ pressed }) => [
                styles.closeBtn,
                {
                  backgroundColor: isDark ? '#2563EB' : '#0F172A',
                },
                pressed && { opacity: 0.8 },
              ]}
              accessibilityRole="button"
              accessibilityLabel="Zavřít"
            >
              <Text style={styles.closeBtnText}>Hotovo</Text>
            </Pressable>
          </View>
        </View>

        {/* Progress Bar Line */}
        {progress > 0 && progress < 1 && (
          <View
            style={[
              styles.progressTrack,
              { backgroundColor: isDark ? '#1E293B' : '#E2E8F0' },
            ]}
          >
            <View
              style={[
                styles.progressBar,
                {
                  width: `${Math.round(progress * 100)}%`,
                  backgroundColor: isDark ? '#38BDF8' : '#2563EB',
                },
              ]}
            />
          </View>
        )}

        {/* WebView Container */}
        <View style={styles.webWrapper}>
          <WebView
            ref={webViewRef}
            source={{ uri: url }}
            // Persistent session cookies: shared with WKWebsiteDataStore default on iOS and CookieManager on Android
            incognito={false}
            sharedCookiesEnabled={true}
            domStorageEnabled={true}
            thirdPartyCookiesEnabled={true}
            javaScriptEnabled={true}
            allowsBackForwardNavigationGestures={true}
            injectedJavaScriptBeforeContentLoaded={tokenInjectionScript}
            onLoadProgress={(e: any) => setProgress(e?.nativeEvent?.progress ?? 0)}
            onNavigationStateChange={(nav: WebViewNavigation): void => {
              setCanGoBack(nav.canGoBack);
              setCanGoForward(nav.canGoForward);
              if (nav.url) {
                setCurrentUrl(nav.url);
              }
            }}
            startInLoadingState={true}
            renderLoading={() => (
              <View style={styles.loaderWrap}>
                <ActivityIndicator
                  size="large"
                  color={isDark ? '#38BDF8' : '#2563EB'}
                />
                <Text style={[styles.loaderText, { color: theme.secondary }]}>
                  Načítám zadání z portálu Unicorn...
                </Text>
              </View>
            )}
          />
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    gap: 8,
  },
  navGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  iconBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnDisabled: {
    opacity: 0.35,
  },
  titleGroup: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    gap: 2,
  },
  titleText: {
    fontSize: 13.5,
    fontWeight: '700',
    textAlign: 'center',
  },
  domainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  domainText: {
    fontSize: 11,
    fontWeight: '500',
  },
  ssoBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
    borderWidth: 1,
  },
  ssoBadgeText: {
    fontSize: 9.5,
    fontWeight: '700',
  },
  rightGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  externalBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.pill,
  },
  closeBtnText: {
    color: '#FFFFFF',
    fontSize: 12.5,
    fontWeight: '700',
  },
  progressTrack: {
    height: 2.5,
    width: '100%',
  },
  progressBar: {
    height: '100%',
  },
  webWrapper: {
    flex: 1,
  },
  loaderWrap: {
    ...StyleSheet.absoluteFill as any,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    padding: 24,
  },
  loaderText: {
    fontSize: 13,
    fontWeight: '500',
    textAlign: 'center',
  },
});
