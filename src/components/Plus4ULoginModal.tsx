import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef, useState } from 'react';
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
import { WebView } from 'react-native-webview';
import {
  buildAuthorizeUrl,
  getMetadata,
  parseRedirect,
} from '../services/plus4uOidc';
import {
  isSystemBrowserLoginAvailable,
  LoginCancelledError,
  loginWithSystemBrowser,
} from '../services/systemBrowserLogin';
import { useAppTheme } from '../theme/theme';

type Props = {
  visible: boolean;
  onSuccess: (code: string, redirectUri?: string) => void;
  onError: (errorMessage: string) => void;
  onClose: () => void;
};

export function Plus4ULoginModal({
  visible,
  onSuccess,
  onError,
  onClose,
}: Props) {
  const theme = useAppTheme();
  const isDark = theme.isDark;

  const [authorizeUrl, setAuthorizeUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [browserBusy, setBrowserBusy] = useState(false);
  const handled = useRef(false);

  const isSystemAvailable = isSystemBrowserLoginAvailable();

  useEffect(() => {
    if (!visible) return;
    handled.current = false;
    setLoading(true);
    setAuthorizeUrl(null);

    getMetadata()
      .then((metadata) => {
        setAuthorizeUrl(buildAuthorizeUrl(metadata));
      })
      .catch((err) => {
        onError(`Nepodařilo se připojit k Plus4U OIDC: ${err.message}`);
      });
  }, [visible, onError]);

  const tryHandleRedirect = (url: string): boolean => {
    const result = parseRedirect(url);
    if (!result) return false;

    if (!handled.current) {
      handled.current = true;
      if (result.code) {
        onSuccess(result.code);
      } else {
        onError(`Přihlášení se nezdařilo: ${result.error}`);
      }
    }
    return true;
  };

  const tryOpenExternalApp = (url: string): boolean => {
    if (/^(https?|about|data|blob):/i.test(url)) return false;
    // Odkazy na Plus4U Mobile Key (plus4umobilekey://) nebo jiné aplikace
    Linking.openURL(url).catch(() => {
      console.info(`Aplikace pro ${url.split(':')[0]}:// není v zařízení nainstalována.`);
    });
    return true;
  };

  const handleSystemBrowserLogin = async () => {
    setBrowserBusy(true);
    try {
      const { code, redirectUri } = await loginWithSystemBrowser();
      onSuccess(code, redirectUri);
    } catch (e: any) {
      if (e instanceof LoginCancelledError) {
        // Uživatel zavřel okno, není to chyba k zobrazení
        return;
      }
      Alert.alert('Chyba systémového přihlášení', e.message || 'Nepodařilo se přihlásit.');
    } finally {
      setBrowserBusy(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView
        style={[styles.container, { backgroundColor: theme.background }]}
        edges={['top', 'bottom']}
      >
        {/* Top Header */}
        <View
          style={[
            styles.header,
            {
              backgroundColor: theme.surface,
              borderBottomColor: theme.border,
            },
          ]}
        >
          <View style={styles.headerTitleGroup}>
            <View
              style={[
                styles.iconGlow,
                {
                  backgroundColor: isDark
                    ? 'rgba(56,189,248,0.15)'
                    : '#EFF6FF',
                },
              ]}
            >
              <Ionicons
                name="shield-checkmark"
                size={16}
                color={isDark ? '#38BDF8' : '#2563EB'}
              />
            </View>
            <View>
              <Text style={[styles.title, { color: theme.text }]}>
                Přihlášení Plus4U
              </Text>
              <Text style={[styles.subtitle, { color: theme.secondary }]}>
                Unicorn University SSO · OIDC
              </Text>
            </View>
          </View>

          <Pressable
            onPress={onClose}
            hitSlop={12}
            style={({ pressed }) => [
              styles.cancelBtn,
              {
                backgroundColor: isDark
                  ? 'rgba(255,255,255,0.08)'
                  : '#F1F5F9',
                borderColor: theme.border,
              },
              pressed && { opacity: 0.7 },
            ]}
          >
            <Text style={[styles.cancelText, { color: theme.text }]}>
              Zavřít
            </Text>
          </Pressable>
        </View>

        {/* System Browser Quick Banner (if native module is available) */}
        {isSystemAvailable && (
          <View
            style={[
              styles.systemBanner,
              {
                backgroundColor: isDark ? 'rgba(56,189,248,0.08)' : '#F0F9FF',
                borderColor: isDark ? 'rgba(56,189,248,0.2)' : '#BAE6FD',
              },
            ]}
          >
            <View style={{ flex: 1, gap: 2 }}>
              <View style={styles.modeRow}>
                <Ionicons
                  name="globe-outline"
                  size={15}
                  color={isDark ? '#38BDF8' : '#0284C7'}
                />
                <Text
                  style={[
                    styles.bannerTitle,
                    { color: isDark ? '#38BDF8' : '#0369A1' },
                  ]}
                >
                  Systémový prohlížeč (Safari / Chrome)
                </Text>
              </View>
              <Text
                style={[
                  styles.bannerDesc,
                  { color: isDark ? 'rgba(255,255,255,0.7)' : '#0C4A6E' },
                ]}
              >
                Sdílí aktivní session z prohlížeče a podporuje přihlášení Google.
              </Text>
            </View>

            <Pressable
              disabled={browserBusy}
              onPress={handleSystemBrowserLogin}
              style={({ pressed }) => [
                styles.systemBtn,
                { backgroundColor: isDark ? '#38BDF8' : '#0284C7' },
                pressed && { opacity: 0.8 },
              ]}
            >
              {browserBusy ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.systemBtnText}>Otevřít</Text>
              )}
            </Pressable>
          </View>
        )}

        {/* WebView Container */}
        {authorizeUrl ? (
          <View style={styles.webWrapper}>
            <WebView
              source={{ uri: authorizeUrl }}
              incognito={false}
              sharedCookiesEnabled={true}
              domStorageEnabled={true}
              thirdPartyCookiesEnabled={true}
              originWhitelist={['*']}
              startInLoadingState
              onLoadEnd={() => setLoading(false)}
              renderLoading={() => (
                <View style={styles.loaderWrap}>
                  <ActivityIndicator
                    size="large"
                    color={isDark ? '#38BDF8' : '#2563EB'}
                  />
                  <Text style={[styles.loaderText, { color: theme.secondary }]}>
                    Načítám přihlašovací bránu Plus4U...
                  </Text>
                </View>
              )}
              onShouldStartLoadWithRequest={(req) => {
                const redirected = tryHandleRedirect(req.url);
                if (redirected) return false;
                const openedApp = tryOpenExternalApp(req.url);
                if (openedApp) return false;
                return true;
              }}
              onError={(e) => {
                if (!tryHandleRedirect(e.nativeEvent.url)) {
                  onError(e.nativeEvent.description);
                }
              }}
              onNavigationStateChange={(nav) => {
                tryHandleRedirect(nav.url);
              }}
            />
          </View>
        ) : (
          <View style={styles.loaderWrap}>
            <ActivityIndicator
              size="large"
              color={isDark ? '#38BDF8' : '#2563EB'}
            />
            <Text style={[styles.loaderText, { color: theme.secondary }]}>
              Připojuji k autorizačnímu serveru...
            </Text>
          </View>
        )}
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  headerTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconGlow: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
  },
  subtitle: {
    fontSize: 11.5,
    fontWeight: '500',
  },
  cancelBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
  },
  cancelText: {
    fontSize: 13,
    fontWeight: '700',
  },
  systemBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 12,
    marginTop: 8,
    marginBottom: 4,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    gap: 10,
  },
  modeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  bannerTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  bannerDesc: {
    fontSize: 11.5,
    lineHeight: 15,
  },
  systemBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    minWidth: 64,
    alignItems: 'center',
    justifyContent: 'center',
  },
  systemBtnText: {
    color: '#FFFFFF',
    fontSize: 12.5,
    fontWeight: '700',
  },
  webWrapper: {
    flex: 1,
  },
  loaderWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    padding: 24,
  },
  loaderText: {
    fontSize: 13.5,
    fontWeight: '500',
    textAlign: 'center',
  },
});
