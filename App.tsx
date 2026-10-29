import AsyncStorage from '@react-native-async-storage/async-storage';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { DarkTheme, DefaultTheme, NavigationContainer } from '@react-navigation/native';
import * as Notifications from 'expo-notifications';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, AppState, useColorScheme } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Plus4ULoginModal } from './src/components/Plus4ULoginModal';
import { SchoolPortalModal } from './src/components/SchoolPortalModal';
import { SyncSuccessToast, type SyncToastPayload } from './src/components/SyncSuccessToast';
import { AdaptiveTabBar } from './src/navigation/AdaptiveTabBar';
import { DashboardScreen } from './src/screens/DashboardScreen';
import { ExamScreen } from './src/screens/ExamScreen';
import { OnboardingScreen } from './src/screens/OnboardingScreen';
import { ScheduleScreen } from './src/screens/ScheduleScreen';
import { TasksScreen } from './src/screens/TasksScreen';
import { TextbooksScreen } from './src/screens/TextbooksScreen';
import {
  checkStoredSessionState,
  completePlus4ULogin,
  isSessionExpired,
  isSystemBrowserLoginAvailable,
  LoginCancelledError,
  loginWithSystemBrowser,
  tokenStore,
  type Session,
} from './src/services/auth';
import { telemetry } from './src/services/telemetry';
import { syncStudentDataFromPlus4U } from './src/services/plus4uSync';
import {
  getNotificationNavigationTarget,
  getNotificationTargetTab,
  registerForPushNotificationsAsync,
  syncCurrentSemesterReminders,
  sendInstantTestNotification,
} from './src/services/notifications';
import { updateWidgetSnapshot } from './src/services/widgetBridge';
import { textbookService } from './src/services/textbookService';
const emptyData: StudentData = { subjects: [], tasks: [], exams: [] };
import type { StudentData, TaskItem } from './src/types/models';

const Tab = createBottomTabNavigator();
const storageKeyData = (identity: string) => `studentflow.data.v3.${identity}`;
const storageKeyOnboarding = 'studentflow.onboarding.seen.v1';

export default function App() {
  const scheme = useColorScheme();
  const [data, setData] = useState<StudentData>(emptyData);
  const [session, setSession] = useState<Session | null>(null);
  const [connected, setConnected] = useState(false);
  const [sessionExpired, setSessionExpired] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [portalTarget, setPortalTarget] = useState<{ url: string; title?: string } | null>(null);
  const [showOnboarding, setShowOnboarding] = useState<boolean | null>(null);
  const [syncToast, setSyncToast] = useState<SyncToastPayload | null>(null);

  const navigationRef = useRef<any>(null);
  const currentSession = useRef<Session | null>(null);
  const dataRef = useRef(data);
  dataRef.current = data;
  const syncing = useRef<Session | null>(null);

  const promptSessionExpired = (studentName: string) => {
    Alert.alert(
      'Platnost přihlášení vypršela ⏱️',
      `Ahoj ${studentName}, bezpečnostní platnost tvého přihlášení k Plus4U vypršela.\n\nChceš se znovu přihlásit pro synchronizaci aktuálního rozvrhu a úkolů? Všechny offline poznámky a materiály máš stále k dispozici.`,
      [
        { text: 'Později (offline)', style: 'cancel' },
        {
          text: 'Přihlásit se',
          style: 'default',
          onPress: () => {
            handleStartLogin();
          },
        },
      ]
    );
  };

  useEffect(() => {
    let mounted = true;
    (async () => {
      const [seen, sessionState] = await Promise.all([
        AsyncStorage.getItem(storageKeyOnboarding),
        checkStoredSessionState(),
      ]);
      if (!mounted) return;

      if (sessionState.session) {
        currentSession.current = sessionState.session;
        setSession(sessionState.session);
        setConnected(true);
        setSessionExpired(false);

        const cached = await AsyncStorage.getItem(storageKeyData(sessionState.session.uuIdentity));
        if (!mounted) return;
        try {
          const saved = cached ? (JSON.parse(cached) as StudentData) : null;
          if (
            saved?.uuIdentity === sessionState.session.uuIdentity &&
            Array.isArray(saved.subjects) &&
            Array.isArray(saved.tasks) &&
            Array.isArray(saved.exams)
          ) {
            dataRef.current = saved;
            setData(saved);
          }
        } catch {
          /* Invalid cache is replaced by synchronization */
        }
        await syncWithPlus4UDiary(sessionState.session);
      } else if (sessionState.isExpired) {
        setSessionExpired(true);
        setConnected(false);
        // Load cached offline data if available so student can view existing data
        if (sessionState.expiredIdentity) {
          const cached = await AsyncStorage.getItem(storageKeyData(sessionState.expiredIdentity));
          if (cached && mounted) {
            try {
              const saved = JSON.parse(cached) as StudentData;
              dataRef.current = saved;
              setData(saved);
            } catch {}
          }
        }
        promptSessionExpired(sessionState.expiredName || 'studente');
      }

      if (mounted) {
        // Show onboarding if never seen and no active session
        const shouldShow = seen !== 'true' && !sessionState.session;
        setShowOnboarding(shouldShow);
        if (!shouldShow) {
          AsyncStorage.setItem(storageKeyOnboarding, 'true').catch(() => undefined);
        }
      }

      registerForPushNotificationsAsync().catch(() => undefined);
      updateWidgetSnapshot(dataRef.current).catch(() => undefined);
    })().catch(() => {
      if (mounted) setShowOnboarding(false);
    });

    return () => {
      mounted = false;
    };
  }, []);

  // Monitor app resume from background and periodic timer for token expiration
  useEffect(() => {
    const handleCheckExpiry = () => {
      if (currentSession.current && isSessionExpired(currentSession.current)) {
        const expired = currentSession.current;
        currentSession.current = null;
        setSession(null);
        setConnected(false);
        setSessionExpired(true);
        promptSessionExpired(expired.name);
      }
    };

    const sub = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        handleCheckExpiry();
        // Při návratu studenta do aplikace automaticky aktualizujeme stav úkolů a zkoušek
        if (currentSession.current) {
          syncWithPlus4UDiary(currentSession.current, false).catch(() => undefined);
        }
      }
    });

    const timer = setInterval(handleCheckExpiry, 60000);

    return () => {
      sub.remove();
      clearInterval(timer);
    };
  }, []);

  // Deep linking target from notifications
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const [activeExamId, setActiveExamId] = useState<string | null>(null);

  // Notification click / tap response listener
  useEffect(() => {
    const handleNotificationTarget = (response: Notifications.NotificationResponse | null) => {
      const target = getNotificationNavigationTarget(response);
      if (target && navigationRef.current) {
        if (target.taskId) {
          setActiveTaskId(target.taskId);
        }
        if (target.examId) {
          setActiveExamId(target.examId);
        }
        navigationRef.current.navigate(target.tab);
      }
    };

    const sub = Notifications.addNotificationResponseReceivedListener(handleNotificationTarget);

    Notifications.getLastNotificationResponseAsync()
      .then(handleNotificationTarget)
      .catch(() => undefined);

    return () => {
      sub.remove();
    };
  }, []);

  const update = (next: StudentData) => {
    dataRef.current = next;
    setData(next);
    if (next.uuIdentity) {
      AsyncStorage.setItem(storageKeyData(next.uuIdentity), JSON.stringify(next)).catch(() => undefined);
    }
    syncCurrentSemesterReminders(next.tasks, next.exams ?? [], next.subjects ?? []).catch(() => undefined);
    updateWidgetSnapshot(next).catch(() => undefined);
  };

  const handleTestNotification = async () => {
    const reg = await registerForPushNotificationsAsync();
    if (!reg.granted) {
      Alert.alert(
        'Oznámení nejsou povolená',
        'V nastavení telefonu prosím povol oznámení pro StudentFlow.'
      );
      return;
    }
    await sendInstantTestNotification();
    Alert.alert(
      'Oznámení odesláno',
      'Testovací upozornění proběhlo v pořádku.'
    );
  };

  /**
   * Synchronizuje data studenta (rozvrh, zkoušky, úkoly) z Plus4U diáře
   */
  const syncWithPlus4UDiary = async (activeSession: Session, showAlert = false) => {
    if (syncing.current === activeSession) return;
    syncing.current = activeSession;
    setIsSyncing(true);
    try {
      const parsed = await syncStudentDataFromPlus4U(
        activeSession.idToken,
        activeSession.uuIdentity
      );

      const nowFormatted = new Date().toLocaleTimeString('cs-CZ', {
        hour: '2-digit',
        minute: '2-digit',
      });

      if (currentSession.current !== activeSession) return;
      const previous = dataRef.current.uuIdentity === activeSession.uuIdentity ? dataRef.current : emptyData;
      const nextData: StudentData = {
        subjects: parsed.diaryLoaded ? parsed.subjects : previous.subjects,
        exams: [...parsed.exams, ...(previous.exams ?? []).filter(exam => !exam.source)],
        tasks: [
          ...parsed.tasks,
          ...previous.tasks.filter(task => !task.source),
        ],
        studentName: activeSession.name,
        uuIdentity: activeSession.uuIdentity,
        lastSyncedAt: nowFormatted,
      };

      update(nextData);

      // Zabezpečený automatický cache učebnic pro zapsané předměty studenta
      textbookService.runAutoCacheForEnrolledSubjects(nextData.subjects, activeSession.uuIdentity)
        .catch((e) => console.warn('Auto cache textbooks notice:', e));

      if (showAlert) {
        setSyncToast({
          studentName: activeSession.name,
          subjectsCount: parsed.subjects.length,
          examsCount: parsed.exams.length,
          tasksCount: parsed.tasks.length,
          warnings: parsed.warnings,
        });
      }
    } catch (err: any) {
      if (currentSession.current !== activeSession) return;
      console.warn('Sync diary error:', err);
      // Pokud volání selže (např. student nemá ještě Digital Workspace), uložíme identitu
      update({
        ...(dataRef.current.uuIdentity === activeSession.uuIdentity ? dataRef.current : emptyData),
        studentName: activeSession.name,
        uuIdentity: activeSession.uuIdentity,
      });

      if (showAlert) {
        Alert.alert(
          'Přihlášeno pod účtem Plus4U',
          `Vítej, ${activeSession.name} (${activeSession.uuIdentity}).\n\nNepodařilo se načíst školní úkoly a testy: ${err?.message || 'Zkontroluj připojení k internetu.'}`
        );
      }
    } finally {
      if (syncing.current === activeSession) {
        syncing.current = null;
        setIsSyncing(false);
      }
    }
  };

  /**
   * Zpracování úspěšného přihlášení (systémový prohlížeč i WebView modal)
   */
  const handleLoginSuccess = async (code: string, redirectUri?: string) => {
    setShowLoginModal(false);
    try {
      const newSession = await completePlus4ULogin(code, redirectUri);
      currentSession.current = newSession;
      if (dataRef.current.uuIdentity !== newSession.uuIdentity) {
        update({ ...emptyData, studentName: newSession.name, uuIdentity: newSession.uuIdentity });
      }
      setSession(newSession);
      setConnected(true);
      setSessionExpired(false);
      completeOnboarding();

      telemetry.session({
        name: newSession.name,
        uuIdentity: newSession.uuIdentity,
      });

      // Ihned stáhneme rozvrh, zkoušky a úkoly z diáře
      await syncWithPlus4UDiary(newSession, true);
    } catch (err: any) {
      Alert.alert('Chyba přihlášení', err?.message || 'Výměna kódu za token selhala.');
    }
  };

  /**
   * Spuštění přihlášení:
   * - V development buildu spustí systémový prohlížeč (ASWebAuthenticationSession / Custom Tabs)
   *   se sdílenými cookies ze Safari / Chrome.
   * - V Expo Go bez nativního TCP socketu nebo při chybě otevře záložní in-app WebView modal.
   */
  const handleStartLogin = async () => {
    if (isSystemBrowserLoginAvailable()) {
      try {
        const { code, redirectUri } = await loginWithSystemBrowser();
        await handleLoginSuccess(code, redirectUri);
      } catch (err: any) {
        if (err instanceof LoginCancelledError) {
          // Uživatel zrušil přihlašovací okno systému
          return;
        }
        console.warn('System browser login error, falling back to modal:', err);
        setShowLoginModal(true);
      }
    } else {
      setShowLoginModal(true);
    }
  };

  const handleManualSync = () => {
    if (!session) {
      handleStartLogin();
      return;
    }
    syncWithPlus4UDiary(session, true);
  };

  const logout = () => {
    Alert.alert(
      'Odhlásit školní účet',
      'Opravdu chceš odpojit školní účet Plus4U a smazat přístupový token?',
      [
        { text: 'Zrušit', style: 'cancel' },
        {
          text: 'Odhlásit',
          style: 'destructive',
          onPress: async () => {
            await tokenStore.clear();
            currentSession.current = null;
            setSession(null);
            setConnected(false);
            setSessionExpired(false);
            if (session?.uuIdentity) {
              await AsyncStorage.removeItem(storageKeyData(session.uuIdentity));
            }
            update(emptyData);
          },
        },
      ]
    );
  };

  const handleToggleTask = (id: string) => {
    const task = dataRef.current.tasks.find(item => item.id === id);
    if (task?.source === 'unicorn') return;
    update({
      ...data,
      tasks: data.tasks.map((task) =>
        task.id === id ? { ...task, isCompleted: !task.isCompleted } : task
      ),
    });
  };

  const handleAddTask = (newTask: TaskItem) => {
    update({
      ...data,
      tasks: [newTask, ...data.tasks],
    });
  };

  const handleDeleteTask = (id: string) => {
    if (dataRef.current.tasks.find(item => item.id === id)?.source) return;
    update({
      ...data,
      tasks: data.tasks.filter((task) => task.id !== id),
    });
  };

  const completeOnboarding = () => {
    setShowOnboarding(false);
    AsyncStorage.setItem(storageKeyOnboarding, 'true').catch(() => undefined);
  };

  const isDark = scheme === 'dark';

  const navigationTheme = useMemo(
    () => ({
      ...(isDark ? DarkTheme : DefaultTheme),
      colors: {
        ...(isDark ? DarkTheme.colors : DefaultTheme.colors),
        background: isDark ? '#090D16' : '#F8FAFC',
        card: isDark ? '#111827' : '#FFFFFF',
        text: isDark ? '#FFFFFF' : '#0F172A',
        border: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(15,23,42,0.08)',
        primary: isDark ? '#38BDF8' : '#2563EB',
      },
    }),
    [isDark]
  );

  // Wait until initial AsyncStorage read is done
  if (showOnboarding === null) {
    return null;
  }

  // Render Onboarding if first launch
  if (showOnboarding) {
    return (
      <SafeAreaProvider>
        <StatusBar style={isDark ? 'light' : 'dark'} />
        <OnboardingScreen
          onComplete={completeOnboarding}
          onLogin={() => {
            handleStartLogin();
          }}
        />
        <Plus4ULoginModal
          visible={showLoginModal}
          onSuccess={handleLoginSuccess}
          onError={(err) => {
            setShowLoginModal(false);
            Alert.alert('Chyba přihlášení', err);
          }}
          onClose={() => setShowLoginModal(false)}
        />
        <SyncSuccessToast
          payload={syncToast}
          onDismiss={() => setSyncToast(null)}
        />
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <NavigationContainer ref={navigationRef} theme={navigationTheme}>
        <Tab.Navigator
          tabBar={(props) => <AdaptiveTabBar {...props} />}
          screenOptions={{
            headerShown: false,
          }}
        >
          <Tab.Screen name="Přehled">
            {({ navigation }) => (
              <DashboardScreen
                data={data}
                connected={connected}
                sessionExpired={sessionExpired}
                onRenewLogin={handleStartLogin}
                onLogin={handleStartLogin}
                onLogout={logout}
                onOpenOnboarding={() => setShowOnboarding(true)}
                onNavigateToTab={(tabName) => navigation.navigate(tabName)}
                onToggleTask={handleToggleTask}
                onSyncDiary={handleManualSync}
                isSyncing={isSyncing}
                onTestNotification={handleTestNotification}
                onOpenSourceUrl={(url, title) => setPortalTarget({ url, title })}
              />
            )}
          </Tab.Screen>
          <Tab.Screen name="Rozvrh">
            {({ navigation }) => (
              <ScheduleScreen
                subjects={data.subjects}
                onNavigateToTasks={() => navigation.navigate('Úkoly')}
                onNavigateToTextbooks={() => navigation.navigate('Učebnice')}
              />
            )}
          </Tab.Screen>
          <Tab.Screen name="Učebnice">
            {() => (
              <TextbooksScreen
                key={session?.uuIdentity ?? "anonymous"}
                studentSubjects={data.subjects}
                studentIdentity={session?.uuIdentity ?? "default"}
              />
            )}
          </Tab.Screen>
          <Tab.Screen name="Úkoly">
            {() => (
              <TasksScreen
                tasks={data.tasks}
                subjects={data.subjects}
                initialSelectedTaskId={activeTaskId}
                onToggle={handleToggleTask}
                onAddTask={handleAddTask}
                onDeleteTask={handleDeleteTask}
                onOpenSourceUrl={(url, title) => setPortalTarget({ url, title })}
                onRefresh={session ? () => syncWithPlus4UDiary(session, true) : undefined}
                isRefreshing={isSyncing}
              />
            )}
          </Tab.Screen>
          <Tab.Screen name="Zkouška">
            {() => (
              <ExamScreen
                examDate={data.examDate}
                exams={data.exams}
                subjects={data.subjects}
                initialSelectedExamId={activeExamId}
                onSetDate={(examDate) => update({ ...data, examDate })}
                onUpdateExams={(exams) => update({ ...data, exams })}
                onOpenSourceUrl={(url, title) => setPortalTarget({ url, title })}
              />
            )}
          </Tab.Screen>
        </Tab.Navigator>
      </NavigationContainer>

      {/* In-app prohlížeč pro zadání zkoušek a úkolů se sdílenou persistentní session */}
      <SchoolPortalModal
        visible={Boolean(portalTarget)}
        url={portalTarget?.url ?? null}
        title={portalTarget?.title}
        idToken={session?.idToken}
        onClose={() => {
          setPortalTarget(null);
          // Po zavření detailu úkolu na webu Unicornu automaticky zkontrolujeme a synchronizujeme změny
          if (session) {
            syncWithPlus4UDiary(session, false).catch(() => undefined);
          }
        }}
      />

      {/* Reálné přihlašovací okno Plus4U */}
      <Plus4ULoginModal
        visible={showLoginModal}
        onSuccess={handleLoginSuccess}
        onError={(err) => {
          setShowLoginModal(false);
          Alert.alert('Chyba přihlášení', err);
        }}
        onClose={() => setShowLoginModal(false)}
      />

      {/* Plynulé animované oznámení o dokončení synchronizace Plus4U */}
      <SyncSuccessToast
        payload={syncToast}
        onDismiss={() => setSyncToast(null)}
      />
    </SafeAreaProvider>
  );
}
