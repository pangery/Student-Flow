import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useState } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { cleanSubjectName, deadlineLabel } from '../services/schoolDisplay';
import { filterCurrentSemesterTasks, getSemesterForDate } from '../services/semester';
import { Screen } from '../components/Screen';
import { textbookService } from '../services/textbookService';
import { isIOS } from '../theme/platform';
import { getSubjectThemes, radius, spacing, useAppTheme } from '../theme/theme';
import type { StudentData } from '../types/models';

type Props = {
  data: StudentData;
  connected: boolean;
  onLogin: () => void;
  onLogout: () => void;
  onOpenOnboarding?: () => void;
  onNavigateToTab?: (tabName: string) => void;
  onToggleTask?: (id: string) => void;
  onSyncDiary?: () => void;
  isSyncing?: boolean;
  onTestNotification?: () => void;
  onOpenSourceUrl?: (url: string, title?: string) => void;
  sessionExpired?: boolean;
  onRenewLogin?: () => void;
};

export function DashboardScreen({
  data,
  connected,
  onLogin,
  onLogout,
  onOpenOnboarding,
  onNavigateToTab,
  onToggleTask,
  onSyncDiary,
  isSyncing,
  onTestNotification,
  onOpenSourceUrl,
  sessionExpired,
  onRenewLogin,
}: Props) {
  const theme = useAppTheme();
  const isDark = theme.isDark;
  const dynamicThemes = getSubjectThemes(isDark);

  const currentSemester = getSemesterForDate();
  const semesterTasks = filterCurrentSemesterTasks(data.tasks, currentSemester);
  const activeTasks = semesterTasks.filter((task) => !task.isCompleted);
  const nextTask = [...activeTasks].sort((a, b) => (a.dueDate || '9999').localeCompare(b.dueDate || '9999'))[0];
  const now = new Date();
  const today = now.getDay() + 1; // 2 = Monday ... 6 = Friday
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  const todaySubjects = data.subjects
    .filter((subject) => subject.weekday === today && (!subject.date || new Date(subject.date).toDateString() === now.toDateString()))
    .sort((a, b) => a.startMinutes - b.startMinutes);

  const ongoingSubject = todaySubjects.find(
    (s) => currentMinutes >= s.startMinutes && currentMinutes <= s.endMinutes
  );

  const [cachedBooksCount, setCachedBooksCount] = useState<number>(0);

  useEffect(() => {
    textbookService.getCachedMeta().then((meta) => {
      setCachedBooksCount(Object.keys(meta).length);
    }).catch(() => undefined);
  }, []);

  const todayFormatted = now.toLocaleDateString('cs-CZ', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  const displayName = data.studentName || 'Student';
  const displayInitials = displayName
    .split(' ')
    .filter(Boolean)
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <Screen>
      {/* Premium Hero Identity & Agenda Card */}
      <LinearGradient
        colors={
          isDark
            ? ['#0B132B', '#111E38', '#16284D']
            : ['#FFFFFF', '#F8FAFC', '#F1F5F9']
        }
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[
          styles.heroCard,
          {
            backgroundColor: theme.surface,
            borderColor: isDark ? 'rgba(56,189,248,0.22)' : 'rgba(15,23,42,0.08)',
            shadowColor: theme.cardShadow,
            shadowOpacity: theme.cardShadowOpacity,
          },
        ]}
      >
        {/* Top Profile & Connection Bar */}
        <View style={styles.heroTopBar}>
          <View style={styles.profileGroup}>
            <View
              style={[
                styles.avatarWrap,
                {
                  backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : '#EFF6FF',
                  borderColor: isDark ? 'rgba(255,255,255,0.2)' : '#BFDBFE',
                },
              ]}
            >
              <Text style={[styles.avatarInitials, { color: isDark ? '#FFFFFF' : '#2563EB' }]}>
                {displayInitials}
              </Text>
            </View>
            <View style={styles.profileTexts}>
              <Text style={[styles.profileName, { color: theme.text }]} numberOfLines={1}>
                {displayName}
              </Text>
              <Text style={[styles.profileSub, { color: theme.secondary }]} numberOfLines={1}>
                {data.uuIdentity ? `ID: ${data.uuIdentity} · StudentFlow` : 'StudentFlow'}
              </Text>
            </View>
          </View>

          <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
            {connected && Boolean(onSyncDiary) && (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Synchronizovat školní data"
                disabled={isSyncing}
                onPress={onSyncDiary}
                hitSlop={8}
                style={({ pressed }) => [
                  styles.syncIconBtn,
                  {
                    backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#F1F5F9',
                    borderColor: theme.border,
                  },
                  pressed && { opacity: 0.7 },
                ]}
              >
                <Ionicons
                  name={isSyncing ? 'refresh' : 'sync-outline'}
                  size={16}
                  color={isDark ? '#38BDF8' : '#2563EB'}
                />
              </Pressable>
            )}

            <Pressable
              accessibilityRole="button"
              accessibilityLabel={connected ? 'Odhlásit účet Plus4U' : 'Připojit účet Plus4U'}
              onPress={connected ? onLogout : onLogin}
              style={({ pressed }) => [
                styles.authPill,
                connected ? styles.authPillConnected : styles.authPillDisconnected,
                pressed && { opacity: 0.8 },
              ]}
            >
              <View
                style={[
                  styles.pulseIndicator,
                  { backgroundColor: connected ? '#10B981' : '#F59E0B' },
                ]}
              />
              <Text
                style={[
                  styles.authPillLabel,
                  connected ? styles.authTextGreen : sessionExpired ? styles.authTextAmber : styles.authTextAmber,
                ]}
              >
                {isSyncing ? 'Synchronizuji...' : connected ? 'Plus4U aktivní' : sessionExpired ? 'Relace vypršela' : 'Připojit účet'}
              </Text>
            </Pressable>
          </View>
        </View>

        {sessionExpired && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Platnost přihlášení vypršela. Klepni pro obnovení přihlášení."
            onPress={onRenewLogin || onLogin}
            style={({ pressed }) => [
              styles.sessionExpiredBanner,
              {
                backgroundColor: isDark ? 'rgba(245, 158, 11, 0.15)' : '#FEF3C7',
                borderColor: isDark ? 'rgba(245, 158, 11, 0.4)' : '#FDE68A',
              },
              pressed && { opacity: 0.8 },
            ]}
          >
            <View style={styles.expiredBannerIconCircle}>
              <Ionicons name="alert-circle" size={20} color="#D97706" />
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={[styles.expiredBannerTitle, { color: isDark ? '#FBBF24' : '#92400E' }]}>
                Platnost přihlášení vypršela
              </Text>
              <Text style={[styles.expiredBannerSubtitle, { color: isDark ? '#FDE68A' : '#B45309' }]}>
                Klepni sem pro obnovení relace Plus4U a synchronizaci
              </Text>
            </View>
            <Ionicons name="arrow-forward" size={16} color={isDark ? '#FBBF24' : '#92400E'} />
          </Pressable>
        )}

        {/* Date & Agenda Title */}
        <View style={styles.heroGreeting}>
          <View style={styles.dateChipRow}>
            <Text style={[styles.heroDate, { color: isDark ? '#38BDF8' : '#2563EB' }]}>
              {todayFormatted.toUpperCase()}
            </Text>
            <View
              style={[
                styles.semesterBadge,
                {
                  backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#E2E8F0',
                },
              ]}
            >
              <Text style={[styles.semesterBadgeText, { color: theme.secondary }]}>
                {currentSemester.code}
              </Text>
            </View>
          </View>
          <Text style={[styles.heroHeadline, { color: theme.text }]}>Přehled dnešního dne</Text>
        </View>

        {/* 3 Translucent Metric Glass Tiles */}
        <View style={styles.glassTilesRow}>
          <Pressable
            onPress={() => onNavigateToTab?.('Rozvrh')}
            style={({ pressed }) => [
              styles.glassTile,
              {
                backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#FFFFFF',
                borderColor: theme.border,
              },
              pressed && { opacity: 0.8 },
            ]}
          >
            <View
              style={[
                styles.tileIconCircle,
                { backgroundColor: isDark ? 'rgba(56,189,248,0.18)' : '#EFF6FF' },
              ]}
            >
              <Ionicons name="time-outline" size={16} color={isDark ? '#38BDF8' : '#2563EB'} />
            </View>
            <Text style={[styles.tileNumber, { color: theme.text }]}>{todaySubjects.length}</Text>
            <Text style={[styles.tileLabel, { color: theme.secondary }]}>
              {todaySubjects.length === 1 ? 'hodina dnes' : 'hodiny dnes'}
            </Text>
          </Pressable>

          <Pressable
            onPress={() => onNavigateToTab?.('Úkoly')}
            style={({ pressed }) => [
              styles.glassTile,
              {
                backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#FFFFFF',
                borderColor: theme.border,
              },
              pressed && { opacity: 0.8 },
            ]}
          >
            <View
              style={[
                styles.tileIconCircle,
                { backgroundColor: isDark ? 'rgba(192,132,252,0.18)' : '#F5F3FF' },
              ]}
            >
              <Ionicons name="checkbox-outline" size={16} color={isDark ? '#C084FC' : '#7C3AED'} />
            </View>
            <Text style={[styles.tileNumber, { color: theme.text }]}>{activeTasks.length}</Text>
            <Text style={[styles.tileLabel, { color: theme.secondary }]}>
              {activeTasks.length === 1 ? 'úkol zbývá' : 'úkoly zbývají'}
            </Text>
          </Pressable>

          <Pressable
            onPress={() => onNavigateToTab?.('Učebnice')}
            style={({ pressed }) => [
              styles.glassTile,
              {
                backgroundColor: isDark ? 'rgba(16,185,129,0.08)' : '#F0FDF4',
                borderColor: isDark ? 'rgba(16,185,129,0.2)' : '#BBF7D0',
              },
              pressed && { opacity: 0.8 },
            ]}
          >
            <View
              style={[
                styles.tileIconCircle,
                { backgroundColor: isDark ? 'rgba(52,211,153,0.2)' : '#DCFCE7' },
              ]}
            >
              <Ionicons name="book-outline" size={16} color={isDark ? '#34D399' : '#059669'} />
            </View>
            <Text style={[styles.tileNumber, { color: isDark ? '#34D399' : '#059669' }]}>
              {cachedBooksCount}
            </Text>
            <Text style={[styles.tileLabel, { color: isDark ? '#34D399' : '#059669' }]}>
              offline knihy
            </Text>
          </Pressable>
        </View>
      </LinearGradient>


      {/* Quick Access Shortcut Pills */}
      <View style={styles.quickShortcutsRow}>
        {[
          { label: 'Rozvrh', icon: 'calendar-outline', tab: 'Rozvrh', color: isDark ? '#38BDF8' : '#2563EB' },
          { label: 'Úkoly', icon: 'checkbox-outline', tab: 'Úkoly', color: isDark ? '#C084FC' : '#7C3AED' },
          { label: 'Učebnice', icon: 'book-outline', tab: 'Učebnice', color: isDark ? '#34D399' : '#059669' },
          { label: 'Zkoušky', icon: 'ribbon-outline', tab: 'Zkouška', color: isDark ? '#F59E0B' : '#D97706' },
        ].map((s) => (
          <Pressable
            key={s.label}
            onPress={() => onNavigateToTab?.(s.tab)}
            style={({ pressed }) => [
              styles.shortcutBtn,
              {
                backgroundColor: theme.surface,
                borderColor: theme.border,
                shadowColor: theme.cardShadow,
                shadowOpacity: theme.cardShadowOpacity,
              },
              pressed && { opacity: 0.8, transform: [{ scale: 0.97 }] },
            ]}
          >
            <View style={[styles.shortcutIconWrap, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#F1F5F9' }]}>
              <Ionicons name={s.icon as any} size={15} color={s.color} />
            </View>
            <Text style={[styles.shortcutLabel, { color: theme.text }]}>{s.label}</Text>
          </Pressable>
        ))}
      </View>

      {/* Push Notifications Status Card */}
      <View
        style={[
          styles.notifBannerCard,
          {
            backgroundColor: isDark ? 'rgba(30, 41, 59, 0.7)' : '#FFFFFF',
            borderColor: isDark ? 'rgba(56, 189, 248, 0.2)' : 'rgba(37, 99, 235, 0.15)',
            shadowColor: theme.cardShadow,
            shadowOpacity: theme.cardShadowOpacity,
          },
        ]}
      >
        <View style={styles.notifBannerLeft}>
          <View style={[styles.notifIconWrap, { backgroundColor: isDark ? 'rgba(56, 189, 248, 0.15)' : 'rgba(37, 99, 235, 0.1)' }]}>
            <Ionicons name="notifications" size={19} color={isDark ? '#38BDF8' : '#2563EB'} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.notifBannerTitle, { color: theme.text }]}>Oznámení jsou aktivní</Text>
            <Text style={[styles.notifBannerSub, { color: theme.secondary }]}>
              Upozornění na termíny úkolů a zkoušek ({currentSemester.code})
            </Text>
          </View>
        </View>
        {Boolean(onTestNotification) && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Vyzkoušet notifikaci"
            onPress={onTestNotification}
            style={({ pressed }) => [
              styles.notifTestBtn,
              { backgroundColor: isDark ? '#0284C7' : '#2563EB' },
              pressed && { opacity: 0.8, transform: [{ scale: 0.96 }] },
            ]}
          >
            <Ionicons name="paper-plane-outline" size={13} color="#FFFFFF" />
            <Text style={styles.notifTestBtnText}>Test</Text>
          </Pressable>
        )}
      </View>

      {/* Ongoing lesson banner if currently happening */}
      {ongoingSubject && (
        <Pressable
          onPress={() => onNavigateToTab?.('Rozvrh')}
          style={({ pressed }) => [
            styles.ongoingBanner,
            {
              backgroundColor: isDark ? 'rgba(16,185,129,0.12)' : '#ECFDF5',
              borderColor: isDark ? 'rgba(16,185,129,0.35)' : '#A7F3D0',
            },
            pressed && { opacity: 0.85 },
          ]}
        >
          <View style={styles.ongoingHeaderRow}>
            <View style={styles.ongoingTagGroup}>
              <View style={[styles.pulseDot, { backgroundColor: '#10B981' }]} />
              <Text style={styles.ongoingBadgeTitle}>PRÁVĚ PROBÍHÁ VÝUKA</Text>
            </View>
            <Text style={[styles.ongoingTimeText, { color: isDark ? '#34D399' : '#059669' }]}>
              do {formatTime(ongoingSubject.endMinutes)}
            </Text>
          </View>
          <Text style={[styles.ongoingSubjectName, { color: theme.text }]}>
            {cleanSubjectName(ongoingSubject.name)}
          </Text>
          <View style={styles.ongoingMetaRow}>
            <Ionicons name="location-outline" size={13} color={theme.secondary} />
            <Text style={[styles.ongoingLocation, { color: theme.secondary }]}>
              {ongoingSubject.location} · {ongoingSubject.teacher}
            </Text>
          </View>
        </Pressable>
      )}

      {/* Today Schedule Timeline */}
      <View style={styles.sectionWrap}>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionHeaderTitleGroup}>
            <View style={[styles.sectionIconGlow, { backgroundColor: isDark ? 'rgba(56, 189, 248, 0.15)' : '#EFF6FF' }]}>
              <Ionicons name="calendar" size={16} color={isDark ? '#38BDF8' : '#2563EB'} />
            </View>
            <Text style={[styles.sectionHeaderTitle, { color: theme.text }]}>Dnešní výuka</Text>
          </View>
          <Pressable onPress={() => onNavigateToTab?.('Rozvrh')} hitSlop={6}>
            <View style={[styles.badgePill, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#E2E8F0', borderColor: theme.border }]}>
              <Text style={[styles.badgePillText, { color: theme.secondary }]}>
                {todaySubjects.length ? `${todaySubjects.length} ${todaySubjects.length === 1 ? 'předmět' : 'předměty'}` : 'Dnes volno'}
              </Text>
            </View>
          </Pressable>
        </View>

        {todaySubjects.length === 0 ? (
          <Pressable
            onPress={() => onNavigateToTab?.('Rozvrh')}
            style={({ pressed }) => [
              styles.emptyCard,
              { backgroundColor: theme.surface, borderColor: theme.border },
              pressed && { opacity: 0.8 },
            ]}
          >
            <Ionicons
              name={today === 1 || today === 7 ? 'cafe-outline' : 'sunny-outline'}
              size={28}
              color={isDark ? '#38BDF8' : '#2563EB'}
            />
            <Text style={[styles.emptyTitle, { color: theme.text }]}>
              {today === 1 || today === 7 ? 'Dnes je víkend · Žádná výuka' : 'Dnes nemáš žádnou výuku'}
            </Text>
            <Text style={[styles.emptySubtitle, { color: theme.secondary }]}>
              {today === 1 || today === 7
                ? 'Užij si volno! Klepni pro zobrazení rozvrhu na pondělí.'
                : 'V rozvrhu na dnešek nejsou žádné zapsané hodiny. Klepni pro ostatní dny.'}
            </Text>
          </Pressable>
        ) : (
          <View style={styles.lessonsList}>
            {todaySubjects.map((subject) => {
              const sTheme = dynamicThemes[subject.id] ?? {
                primary: theme.blue,
                light: isDark ? 'rgba(56,189,248,0.15)' : '#EFF6FF',
                border: isDark ? 'rgba(56,189,248,0.35)' : '#BFDBFE',
                code: subject.code || 'UU.APP',
              };

              return (
                <Pressable
                  key={subject.id}
                  onPress={() => onNavigateToTab?.('Rozvrh')}
                  style={({ pressed }) => [
                    styles.lessonCard,
                    {
                      backgroundColor: theme.surface,
                      borderColor: theme.border,
                      shadowColor: theme.cardShadow,
                      shadowOpacity: theme.cardShadowOpacity,
                    },
                    pressed && { opacity: 0.85 },
                  ]}
                >
                  <View style={[styles.lessonAccentBar, { backgroundColor: sTheme.primary }]} />

                  {/* Time Block */}
                  <View style={styles.lessonTimeBlock}>
                    <Text style={[styles.lessonTimeStart, { color: theme.text }]}>
                      {formatTime(subject.startMinutes)}
                    </Text>
                    <Text style={[styles.lessonTimeEnd, { color: theme.secondary }]}>
                      {formatTime(subject.endMinutes)}
                    </Text>
                    <View style={[styles.durationChip, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#F1F5F9' }]}>
                      <Text style={[styles.durationChipText, { color: theme.secondary }]}>
                        {subject.endMinutes - subject.startMinutes}m
                      </Text>
                    </View>
                  </View>

                  {/* Main Details */}
                  <View style={styles.lessonBody}>
                    <Text style={[styles.lessonName, { color: theme.text }]}>{cleanSubjectName(subject.name)}</Text>

                    <View style={styles.lessonTagsRow}>
                      <View style={styles.locationChip}>
                        <Ionicons name="location-sharp" size={12} color={theme.secondary} />
                        <Text style={[styles.locationChipText, { color: theme.secondary }]}>
                          {subject.location ?? 'Místnost neuvedena'}
                        </Text>
                      </View>

                      <View style={[styles.codeBadge, { backgroundColor: sTheme.light, borderColor: sTheme.border }]}>
                        <Text style={[styles.codeBadgeText, { color: sTheme.primary }]}>
                          {subject.code || sTheme.code}
                        </Text>
                      </View>
                    </View>
                  </View>
                </Pressable>
              );
            })}
          </View>
        )}
      </View>

      {/* Upcoming Deadline Card with interactive checkbox */}
      <View style={styles.sectionWrap}>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionHeaderTitleGroup}>
            <View style={[styles.sectionIconGlow, { backgroundColor: isDark ? 'rgba(244, 63, 94, 0.15)' : '#FFE4E6' }]}>
              <Ionicons name="flag" size={15} color={isDark ? '#FB7185' : '#E11D48'} />
            </View>
            <Text style={[styles.sectionHeaderTitle, { color: theme.text }]}>Nejbližší termín</Text>
          </View>
          <Pressable onPress={() => onNavigateToTab?.('Úkoly')} hitSlop={6}>
            <View style={[styles.badgePill, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#E2E8F0', borderColor: theme.border }]}>
              <Text style={[styles.badgePillText, { color: theme.secondary }]}>Všechny úkoly</Text>
            </View>
          </Pressable>
        </View>

        {nextTask ? (
          <View
            style={[
              styles.taskCard,
              {
                backgroundColor: theme.surface,
                borderColor: theme.border,
                shadowColor: theme.cardShadow,
                shadowOpacity: theme.cardShadowOpacity,
              },
            ]}
          >
            {/* Direct check toggle button */}
            <Pressable
              accessibilityRole="checkbox"
              accessibilityState={{ checked: nextTask.isCompleted }}
              onPress={() => onToggleTask?.(nextTask.id)}
              hitSlop={8}
              style={({ pressed }) => [
                styles.dashboardCheckbox,
                {
                  borderColor: nextTask.isCompleted ? '#10B981' : (isDark ? '#475569' : '#CBD5E1'),
                  backgroundColor: nextTask.isCompleted ? '#10B981' : 'transparent',
                },
                pressed && { opacity: 0.6 },
              ]}
            >
              {nextTask.isCompleted && <Ionicons name="checkmark" size={14} color="#FFFFFF" />}
            </Pressable>

            <Pressable
              onPress={() => onNavigateToTab?.('Úkoly')}
              style={styles.taskInfo}
            >
              <Text
                style={[
                  styles.taskTitle,
                  { color: theme.text },
                  nextTask.isCompleted && { textDecorationLine: 'line-through', color: theme.muted },
                ]}
              >
                {nextTask.title}
              </Text>
              <View style={styles.taskDateRow}>
                <Ionicons name="calendar-outline" size={13} color={theme.secondary} />
                <Text style={[styles.taskDateText, { color: theme.secondary }]}>
                  Termín: {deadlineLabel(nextTask.dueDate)}
                </Text>
              </View>
            </Pressable>

            {nextTask.sourceUrl ? (
              <Pressable
                onPress={() =>
                  onOpenSourceUrl
                    ? onOpenSourceUrl(nextTask.sourceUrl!, nextTask.title)
                    : Linking.openURL(nextTask.sourceUrl!).catch(() => undefined)
                }
                hitSlop={6}
                style={styles.urgentBadge}
              >
                <Text style={styles.urgentBadgeText}>Unicorn ↗</Text>
              </Pressable>
            ) : (
              <View style={styles.urgentBadge}>
                <Text style={styles.urgentBadgeText}>Vlastní</Text>
              </View>
            )}
          </View>

        ) : (
          <Pressable
            onPress={() => onNavigateToTab?.('Úkoly')}
            style={({ pressed }) => [
              styles.emptyCard,
              { backgroundColor: theme.surface, borderColor: theme.border },
              pressed && { opacity: 0.8 },
            ]}
          >
            <Ionicons name="checkmark-circle-outline" size={26} color="#10B981" />
            <Text style={[styles.emptyTitle, { color: theme.text }]}>Všechny úkoly jsou hotové 🎉</Text>
            <Text style={[styles.emptySubtitle, { color: theme.secondary }]}>Klepni sem pro přidání nového úkolu.</Text>
          </Pressable>
        )}
      </View>

      {/* Offline Learning Hub Card - Tappable to open Textbooks */}
      <Pressable
        onPress={() => onNavigateToTab?.('Učebnice')}
        style={({ pressed }) => [
          styles.offlineCard,
          {
            backgroundColor: isDark ? 'rgba(16,185,129,0.08)' : '#ECFDF5',
            borderColor: isDark ? 'rgba(16,185,129,0.25)' : '#A7F3D0',
          },
          pressed && { opacity: 0.85, transform: [{ scale: 0.99 }] },
        ]}
      >
        <View
          style={[
            styles.offlineIconBox,
            {
              backgroundColor: isDark ? 'rgba(16,185,129,0.18)' : '#DCFCE7',
              borderColor: isDark ? 'rgba(16,185,129,0.3)' : '#86EFAC',
            },
          ]}
        >
          <Ionicons name="book" size={20} color={isDark ? '#34D399' : '#059669'} />
        </View>
        <View style={styles.offlineTexts}>
          <Text style={[styles.offlineHeading, { color: isDark ? '#34D399' : '#059669' }]}>
            Studijní materiály a učebnice
          </Text>
          <Text style={[styles.offlineDescription, { color: theme.secondary }]}>
            {cachedBooksCount > 0
              ? `${cachedBooksCount} ${cachedBooksCount === 1 ? 'učebnice uložena' : 'učebnice uloženy'} pro offline čtení bez internetu.`
              : 'Stáhni si skripta do paměti a čti kdekoliv offline.'}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={isDark ? '#34D399' : '#059669'} />
      </Pressable>
    </Screen>
  );
}

const formatTime = (minutes: number) =>
  `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;

const styles = StyleSheet.create({
  heroCard: {
    borderRadius: 24,
    padding: 18,
    gap: 16,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOpacity: isIOS ? 0.45 : 0.55,
    shadowRadius: 26,
    shadowOffset: { width: 0, height: 12 },
    elevation: 8,
  },
  heroTopBar: {
    gap: 12,
    alignItems: 'stretch',
    flexDirection: 'column',
    justifyContent: 'space-between',
  },
  profileGroup: {
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  avatarWrap: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitials: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  profileTexts: {
    minWidth: 0,
    flex: 1,
    gap: 2,
  },
  profileName: {
    flexShrink: 1,
    fontSize: 15.5,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.2,
  },
  profileSub: {
    fontSize: 11.5,
    color: 'rgba(255,255,255,0.7)',
    fontWeight: '500',
  },
  syncIconBtn: {
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 44,
    minWidth: 44,
    padding: 6,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  authPill: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  authPillConnected: {
    backgroundColor: 'rgba(16,185,129,0.18)',
    borderColor: 'rgba(16,185,129,0.4)',
  },
  authPillDisconnected: {
    backgroundColor: 'rgba(245,158,11,0.18)',
    borderColor: 'rgba(245,158,11,0.4)',
  },
  pulseIndicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  authPillLabel: {
    fontSize: 11,
    fontWeight: '700',
  },
  authTextGreen: {
    color: '#34D399',
  },
  authTextAmber: {
    color: '#FBBF24',
  },
  sessionExpiredBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    gap: 10,
    marginTop: 2,
  },
  expiredBannerIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  expiredBannerTitle: {
    fontSize: 13,
    fontWeight: '800',
  },
  expiredBannerSubtitle: {
    fontSize: 11,
    fontWeight: '500',
  },
  heroGreeting: {
    gap: 4,
  },
  dateChipRow: {
    flexWrap: 'wrap',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  heroDate: {
    fontSize: 11,
    fontWeight: '800',
    color: '#38BDF8',
    letterSpacing: 1.2,
  },
  semesterBadge: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  semesterBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#E2E8F0',
  },
  heroHeadline: {
    fontSize: isIOS ? 24 : 22,
    fontWeight: isIOS ? '800' : '700',
    color: '#FFFFFF',
    letterSpacing: isIOS ? -0.4 : 0,
  },
  glassTilesRow: {
    flexDirection: 'row',
    gap: 8,
  },
  glassTile: {
    paddingHorizontal: 6,
    minWidth: 0,
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    borderRadius: 16,
    padding: 10,
    alignItems: 'center',
    gap: 3,
  },
  glassTileEmerald: {
    backgroundColor: 'rgba(16,185,129,0.12)',
    borderColor: 'rgba(16,185,129,0.25)',
  },
  tileIconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  tileNumber: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },
  tileLabel: {
    fontSize: 10.5,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
  },
  quickShortcutsRow: {
    flexWrap: 'wrap',
    flexDirection: 'row',
    gap: 8,
    marginTop: 2,
  },
  shortcutBtn: {
    minHeight: 48,
    minWidth: '43%',
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: radius.medium,
    borderWidth: 1,
  },
  shortcutIconWrap: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shortcutLabel: {
    fontSize: 11.5,
    fontWeight: '700',
  },
  ongoingBanner: {
    borderRadius: radius.medium,
    padding: 14,
    borderWidth: 1.5,
    gap: 6,
  },
  ongoingHeaderRow: {
    gap: 6,
    flexWrap: 'wrap',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  ongoingTagGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  pulseDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  ongoingBadgeTitle: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#10B981',
    letterSpacing: 0.6,
  },
  ongoingTimeText: {
    fontSize: 11.5,
    fontWeight: '700',
  },
  ongoingSubjectName: {
    fontSize: 16,
    fontWeight: isIOS ? '800' : '700',
  },
  ongoingMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ongoingLocation: {
    minWidth: 0,
    flex: 1,
    fontSize: 12,
    fontWeight: '500',
  },
  sectionWrap: {
    gap: 10,
  },
  sectionHeader: {
    gap: 8,
    flexWrap: 'wrap',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 2,
  },
  sectionHeaderTitleGroup: {
    minWidth: 0,
    flexShrink: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionIconGlow: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionHeaderTitle: {
    flexShrink: 1,
    fontSize: 16.5,
    fontWeight: isIOS ? '800' : '700',
    letterSpacing: -0.2,
  },
  badgePill: {
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.pill,
  },
  badgePillText: {
    fontSize: 11,
    fontWeight: '700',
  },
  lessonsList: {
    gap: 10,
  },
  lessonCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 1,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  lessonAccentBar: {
    width: 5,
    alignSelf: 'stretch',
  },
  lessonTimeBlock: {
    width: 64,
    paddingVertical: 14,
    paddingLeft: 12,
    alignItems: 'flex-start',
    gap: 2,
  },
  lessonTimeStart: {
    fontSize: 14,
    fontWeight: '800',
  },
  lessonTimeEnd: {
    fontSize: 11,
    fontWeight: '500',
  },
  durationChip: {
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
    marginTop: 2,
  },
  durationChipText: {
    fontSize: 9.5,
    fontWeight: '700',
  },
  lessonBody: {
    minWidth: 0,
    flex: 1,
    paddingVertical: 12,
    paddingRight: 14,
    gap: 5,
  },
  lessonName: {
    fontSize: 15,
    fontWeight: isIOS ? '700' : '600',
    letterSpacing: -0.2,
  },
  lessonTagsRow: {
    flexWrap: 'wrap',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  locationChip: {
    flexShrink: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  locationChipText: {
    flexShrink: 1,
    fontSize: 12,
    fontWeight: '500',
  },
  codeBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
  },
  codeBadgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  taskCard: {
    flexWrap: 'wrap',
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    gap: 12,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  dashboardCheckbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  taskInfo: {
    minWidth: 0,
    flex: 1,
    gap: 3,
  },
  taskTitle: {
    fontSize: 14.5,
    fontWeight: isIOS ? '700' : '600',
    letterSpacing: -0.2,
  },
  taskDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  taskDateText: {
    flexShrink: 1,
    fontSize: 12,
  },
  urgentBadge: {
    backgroundColor: 'rgba(244,63,94,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(244,63,94,0.35)',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: radius.pill,
  },
  urgentBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FB7185',
  },
  emptyCard: {
    borderRadius: 18,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    gap: 6,
  },
  emptyTitle: {
    fontSize: 14.5,
    fontWeight: '700',
  },
  emptySubtitle: {
    fontSize: 12,
    textAlign: 'center',
  },
  offlineCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 18,
    padding: 14,
    gap: 12,
    marginBottom: 20,
  },
  offlineIconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  offlineTexts: {
    minWidth: 0,
    flex: 1,
    gap: 2,
  },
  offlineHeading: {
    fontSize: 13.5,
    fontWeight: '800',
  },
  offlineDescription: {
    fontSize: 11.5,
    lineHeight: 16,
  },
  notifBannerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
    marginTop: 12,
  },
  notifBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  notifIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notifBannerTitle: {
    fontSize: 13.5,
    fontWeight: '700',
  },
  notifBannerSub: {
    fontSize: 11,
    lineHeight: 14,
    marginTop: 2,
  },
  notifTestBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 10,
  },
  notifTestBtnText: {
    color: '#FFFFFF',
    fontSize: 11.5,
    fontWeight: '700',
  },
});
