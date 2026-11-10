import { Ionicons } from '@expo/vector-icons';
import { useCallback, useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { BottomSheet } from '../components/BottomSheet';
import { Screen } from '../components/Screen';
import { isIOS } from '../theme/platform';
import { cleanSubjectName } from '../services/schoolDisplay';
import { getSubjectThemes, radius, spacing, useAppTheme } from '../theme/theme';
import type { Subject } from '../types/models';

const weekdays = [
  { dayIndex: 2, label: 'Pondělí', short: 'Po' },
  { dayIndex: 3, label: 'Úterý', short: 'Út' },
  { dayIndex: 4, label: 'Středa', short: 'St' },
  { dayIndex: 5, label: 'Čtvrtek', short: 'Čt' },
  { dayIndex: 6, label: 'Pátek', short: 'Pá' },
];

type Props = {
  subjects: Subject[];
  onNavigateToTasks?: () => void;
  onNavigateToTextbooks?: () => void;
};

export function ScheduleScreen({
  subjects,
  onNavigateToTasks,
  onNavigateToTextbooks,
}: Props) {
  const theme = useAppTheme();
  const isDark = theme.isDark;
  const dynamicThemes = useMemo(() => getSubjectThemes(isDark), [isDark]);
  const { width } = useWindowDimensions();
  const isDesktop = width >= 860;

  const currentDayIndex = useMemo(() => {
    const d = new Date();
    return d.getDay() + 1; // 2 = Monday, ..., 6 = Friday
  }, []);
  const currentMinutes = useMemo(() => {
    const d = new Date();
    return d.getHours() * 60 + d.getMinutes();
  }, []);

  const [viewMode, setViewMode] = useState<'week' | 'day'>(width >= 860 ? 'week' : 'day');

  const initialDay = useMemo(() => {
    return weekdays.some((w) => w.dayIndex === currentDayIndex)
      ? currentDayIndex
      : 2;
  }, [currentDayIndex]);

  const [selectedDay, setSelectedDay] = useState<number>(initialDay);
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);

  // Precompute subjects and dates for all days in a single pass
  const subjectsByDay = useMemo(() => {
    const now = new Date();
    const mondayOffset = (now.getDay() + 6) % 7;
    const map = new Map<number, { date: Date; formattedDate: string; subjects: Subject[] }>();

    for (const w of weekdays) {
      const d = new Date(now);
      d.setDate(now.getDate() - mondayOffset + w.dayIndex - 2);
      const targetDateStr = d.toDateString();
      const filtered = subjects
        .filter(
          (s) =>
            s.weekday === w.dayIndex &&
            (!s.date || new Date(s.date).toDateString() === targetDateStr)
        )
        .sort((a, b) => a.startMinutes - b.startMinutes);

      map.set(w.dayIndex, {
        date: d,
        formattedDate: d.toLocaleDateString('cs-CZ', { day: 'numeric', month: 'numeric' }),
        subjects: filtered,
      });
    }
    return map;
  }, [subjects]);

  const activeSubjects = useMemo(() => {
    return subjectsByDay.get(selectedDay)?.subjects ?? [];
  }, [subjectsByDay, selectedDay]);

  const getSubjectsForDay = useCallback((dayIndex: number) => {
    return subjectsByDay.get(dayIndex)?.subjects ?? [];
  }, [subjectsByDay]);

  const getDayDate = useCallback((dayIndex: number) => {
    return subjectsByDay.get(dayIndex)?.date ?? new Date();
  }, [subjectsByDay]);

  return (
    <Screen>
      {/* Everyday Header with View Switcher */}
      <View style={styles.headerGroup}>
        <View style={styles.headerTopRow}>
          <View>
            <Text style={[styles.headerEyebrow, { color: isDark ? '#38BDF8' : '#2563EB' }]}>
              HARMONOGRAM VÝUKY
            </Text>
            <Text style={[styles.headerTitle, { color: theme.text }]}>Rozvrh</Text>
          </View>

          {/* Přepínač Týden / Den pro tablety a desktopy */}
          <View
            style={[
              styles.viewModeSwitcher,
              {
                backgroundColor: theme.surface,
                borderColor: theme.border,
              },
            ]}
          >
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Týdenní přehled rozvrhu"
              onPress={() => setViewMode('week')}
              style={[
                styles.viewModeBtn,
                viewMode === 'week' && [
                  styles.viewModeBtnActive,
                  { backgroundColor: isDark ? '#2563EB' : '#0F172A' },
                ],
              ]}
            >
              <Ionicons
                name="grid-outline"
                size={14}
                color={viewMode === 'week' ? '#FFFFFF' : theme.secondary}
              />
              <Text
                style={[
                  styles.viewModeBtnText,
                  { color: viewMode === 'week' ? '#FFFFFF' : theme.secondary },
                ]}
              >
                Týden
              </Text>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Denní detail rozvrhu"
              onPress={() => setViewMode('day')}
              style={[
                styles.viewModeBtn,
                viewMode === 'day' && [
                  styles.viewModeBtnActive,
                  { backgroundColor: isDark ? '#2563EB' : '#0F172A' },
                ],
              ]}
            >
              <Ionicons
                name="calendar-outline"
                size={14}
                color={viewMode === 'day' ? '#FFFFFF' : theme.secondary}
              />
              <Text
                style={[
                  styles.viewModeBtnText,
                  { color: viewMode === 'day' ? '#FFFFFF' : theme.secondary },
                ]}
              >
                Den
              </Text>
            </Pressable>
          </View>
        </View>
      </View>

      {/* TÝDENNÍ KALENDÁŘNÍ POHLED (5 SLOUPCŮ PONDĚLÍ - PÁTEK) */}
      {viewMode === 'week' ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={true}
          contentContainerStyle={styles.weeklyGridScroll}
        >
          <View style={styles.weeklyGridContainer}>
            {weekdays.map((w) => {
              const daySubjects = getSubjectsForDay(w.dayIndex);
              const isToday = currentDayIndex === w.dayIndex;
              const dateObj = getDayDate(w.dayIndex);
              const formattedDate = dateObj.toLocaleDateString('cs-CZ', {
                day: 'numeric',
                month: 'numeric',
              });

              return (
                <View
                  key={w.dayIndex}
                  style={[
                    styles.weeklyColumn,
                    {
                      backgroundColor: isToday
                        ? isDark
                          ? 'rgba(56, 189, 248, 0.05)'
                          : 'rgba(37, 99, 235, 0.03)'
                        : theme.surface,
                      borderColor: isToday
                        ? isDark
                          ? 'rgba(56, 189, 248, 0.4)'
                          : '#BFDBFE'
                        : theme.border,
                    },
                  ]}
                >
                  {/* Hlavička dne */}
                  <View
                    style={[
                      styles.weeklyColumnHeader,
                      {
                        borderBottomColor: theme.border,
                        backgroundColor: isToday
                          ? isDark
                            ? 'rgba(56, 189, 248, 0.12)'
                            : '#EFF6FF'
                          : 'transparent',
                      },
                    ]}
                  >
                    <View style={styles.weeklyHeaderTitleRow}>
                      <Text
                        style={[
                          styles.weeklyDayLabel,
                          { color: isToday ? (isDark ? '#38BDF8' : '#2563EB') : theme.text },
                        ]}
                      >
                        {w.label}
                      </Text>
                      {isToday && (
                        <View style={styles.weeklyTodayPill}>
                          <Text style={styles.weeklyTodayPillText}>DNES</Text>
                        </View>
                      )}
                    </View>
                    <View style={styles.weeklyHeaderSubRow}>
                      <Text style={[styles.weeklyDateText, { color: theme.secondary }]}>
                        {formattedDate}
                      </Text>
                      <Text style={[styles.weeklyCountText, { color: theme.secondary }]}>
                        {daySubjects.length ? `${daySubjects.length} h` : 'Volno'}
                      </Text>
                    </View>
                  </View>

                  {/* Karty předmětů v daný den */}
                  <View style={styles.weeklyLessonsList}>
                    {daySubjects.length === 0 ? (
                      <View style={styles.weeklyEmptyDay}>
                        <Ionicons name="cafe-outline" size={20} color={theme.muted} />
                        <Text style={[styles.weeklyEmptyText, { color: theme.secondary }]}>
                          Žádná výuka
                        </Text>
                      </View>
                    ) : (
                      daySubjects.map((s) => {
                        const sTheme = dynamicThemes[s.id] ?? {
                          primary: theme.blue,
                          light: isDark ? 'rgba(56,189,248,0.15)' : '#EFF6FF',
                          border: isDark ? 'rgba(56,189,248,0.35)' : '#BFDBFE',
                          code: s.code || 'UU.PREDMET',
                        };

                        const isOngoing =
                          isToday &&
                          currentMinutes >= s.startMinutes &&
                          currentMinutes <= s.endMinutes;

                        return (
                          <Pressable
                            key={s.id}
                            onPress={() => setSelectedSubject(s)}
                            style={({ pressed }) => [
                              styles.weeklyLessonCard,
                              {
                                backgroundColor: isDark ? '#111827' : '#FFFFFF',
                                borderColor: isOngoing
                                  ? isDark
                                    ? '#38BDF8'
                                    : '#2563EB'
                                  : theme.border,
                                borderWidth: isOngoing ? 1.5 : 1,
                              },
                              pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] },
                            ]}
                          >
                            <View
                              style={[
                                styles.weeklyCardStripe,
                                { backgroundColor: sTheme.primary },
                              ]}
                            />
                            <View style={styles.weeklyCardContent}>
                              {/* Čas a kód */}
                              <View style={styles.weeklyCardTimeRow}>
                                <Text
                                  style={[
                                    styles.weeklyCardTime,
                                    { color: isDark ? '#38BDF8' : '#2563EB' },
                                  ]}
                                >
                                  {formatTime(s.startMinutes)} – {formatTime(s.endMinutes)}
                                </Text>
                                <View
                                  style={[
                                    styles.weeklyCodeBadge,
                                    {
                                      backgroundColor: sTheme.light,
                                      borderColor: sTheme.border,
                                    },
                                  ]}
                                >
                                  <Text
                                    style={[
                                      styles.weeklyCodeText,
                                      { color: sTheme.primary },
                                    ]}
                                  >
                                    {s.code || sTheme.code}
                                  </Text>
                                </View>
                              </View>

                              {isOngoing && (
                                <View style={styles.weeklyOngoingRow}>
                                  <View style={[styles.pulseDot, { backgroundColor: '#10B981' }]} />
                                  <Text style={styles.weeklyOngoingText}>Právě probíhá</Text>
                                </View>
                              )}

                              {/* Název předmětu */}
                              <Text
                                numberOfLines={2}
                                style={[styles.weeklySubjectName, { color: theme.text }]}
                              >
                                {cleanSubjectName(s.name)}
                              </Text>

                              {/* Místnost a vyučující */}
                              <View style={styles.weeklyMetaRow}>
                                <Ionicons name="location-outline" size={11} color={theme.secondary} />
                                <Text
                                  numberOfLines={1}
                                  style={[styles.weeklyMetaText, { color: theme.secondary }]}
                                >
                                  {s.location || 'Místnost neuvedena'}
                                </Text>
                              </View>
                            </View>
                          </Pressable>
                        );
                      })
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        </ScrollView>
      ) : (
        <>
          {/* Weekday Selector Pills */}
      <View
        style={[
          styles.weekSelector,
          {
            backgroundColor: theme.surface,
            borderColor: theme.border,
            shadowColor: theme.cardShadow,
            shadowOpacity: theme.cardShadowOpacity,
          },
        ]}
      >
        {weekdays.map((w) => {
          const isSelected = selectedDay === w.dayIndex;
          const isToday = currentDayIndex === w.dayIndex;
          const count = subjects.filter((s) => s.weekday === w.dayIndex).length;

          return (
            <Pressable
              key={w.dayIndex}
              onPress={() => setSelectedDay(w.dayIndex)}
              style={({ pressed }) => [
                styles.dayTab,
                isSelected && {
                  backgroundColor: isDark ? '#2563EB' : '#0F172A',
                },
                pressed && { opacity: 0.8 },
              ]}
            >
              {isToday && (
                <View
                  style={[
                    styles.todayBadge,
                    {
                      backgroundColor: isSelected
                        ? 'rgba(255,255,255,0.25)'
                        : isDark
                        ? '#38BDF8'
                        : '#2563EB',
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.todayBadgeText,
                      { color: isSelected ? '#FFFFFF' : '#FFFFFF' },
                    ]}
                  >
                    DNES
                  </Text>
                </View>
              )}

              <Text
                style={[
                  styles.dayTabShort,
                  { color: isSelected ? '#FFFFFF' : theme.text },
                ]}
              >
                {w.short}
              </Text>
              <Text
                style={[
                  styles.dayTabCount,
                  { color: isSelected ? 'rgba(255,255,255,0.85)' : theme.secondary },
                ]}
              >
                {count > 0 ? `${count} h` : '—'}
              </Text>
              {isSelected && (
                <View
                  style={[
                    styles.activeDot,
                    { backgroundColor: isDark ? '#38BDF8' : '#60A5FA' },
                  ]}
                />
              )}
            </Pressable>
          );
        })}
      </View>

      {/* Active Day Header */}
      <View style={styles.dayHeaderRow}>
        <View style={styles.dayTitleGroup}>
          <Text style={[styles.dayTitle, { color: theme.text }]}>
            {weekdays.find((w) => w.dayIndex === selectedDay)?.label}
          </Text>
          {selectedDay === currentDayIndex ? (
            <View
              style={[
                styles.currentDayTag,
                {
                  backgroundColor: isDark ? 'rgba(56,189,248,0.15)' : '#EFF6FF',
                  borderColor: isDark ? 'rgba(56,189,248,0.35)' : '#BFDBFE',
                },
              ]}
            >
              <View style={[styles.pulseDot, { backgroundColor: isDark ? '#38BDF8' : '#2563EB' }]} />
              <Text
                style={[
                  styles.currentDayTagText,
                  { color: isDark ? '#38BDF8' : '#2563EB' },
                ]}
              >
                Dnešní den
              </Text>
            </View>
          ) : (
            <Pressable
              onPress={() => setSelectedDay(currentDayIndex)}
              hitSlop={8}
              style={({ pressed }) => [
                styles.jumpTodayBtn,
                {
                  backgroundColor: isDark ? 'rgba(56,189,248,0.12)' : '#EFF6FF',
                  borderColor: isDark ? 'rgba(56,189,248,0.3)' : '#BFDBFE',
                },
                pressed && { opacity: 0.7 },
              ]}
            >
              <Ionicons name="return-down-back" size={13} color={isDark ? '#38BDF8' : '#2563EB'} />
              <Text style={[styles.jumpTodayBtnText, { color: isDark ? '#38BDF8' : '#2563EB' }]}>
                Skočit na dnešek
              </Text>
            </Pressable>
          )}
        </View>

        <Text
          style={[
            styles.dayStatsBadge,
            {
              backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#E2E8F0',
              borderColor: theme.border,
              color: theme.secondary,
            },
          ]}
        >
          {activeSubjects.length
            ? `${activeSubjects.length} ${activeSubjects.length === 1 ? 'předmět' : activeSubjects.length < 5 ? 'předměty' : 'předmětů'}`
            : 'Volný den'}
        </Text>
      </View>

      {/* Lessons List */}
      <View style={styles.lessonsContainer}>
        {activeSubjects.length === 0 ? (
          <View
            style={[
              styles.emptyDayCard,
              {
                backgroundColor: theme.surface,
                borderColor: theme.border,
              },
            ]}
          >
            <View
              style={[
                styles.emptyIconWrap,
                {
                  backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#F1F5F9',
                  borderColor: theme.border,
                },
              ]}
            >
              <Ionicons name="cafe-outline" size={28} color={theme.muted} />
            </View>
            <Text style={[styles.emptyTitle, { color: theme.text }]}>
              Žádná výuka na tento den
            </Text>
            <Text style={[styles.emptySubtitle, { color: theme.secondary }]}>
              Máš volno – ideální čas na samostudium nebo offline čtení stažených učebnic.
            </Text>
          </View>
        ) : (
          activeSubjects.map((subject) => {
            const sTheme = dynamicThemes[subject.id] ?? {
              primary: theme.blue,
              light: isDark ? 'rgba(56,189,248,0.15)' : '#EFF6FF',
              border: isDark ? 'rgba(56,189,248,0.35)' : '#BFDBFE',
              code: subject.code || 'UU.PREDMET',
            };

            const durationMinutes = subject.endMinutes - subject.startMinutes;
            const isToday = selectedDay === currentDayIndex;
            const isOngoing =
              isToday &&
              currentMinutes >= subject.startMinutes &&
              currentMinutes <= subject.endMinutes;
            const isUpcoming =
              isToday &&
              currentMinutes < subject.startMinutes &&
              subject.startMinutes - currentMinutes <= 120;
            const minutesLeft = subject.endMinutes - currentMinutes;
            const elapsedPercent = isOngoing
              ? Math.min(100, Math.max(5, Math.round(((currentMinutes - subject.startMinutes) / durationMinutes) * 100)))
              : 0;

            return (
              <Pressable
                key={subject.id}
                onPress={() => setSelectedSubject(subject)}
                style={({ pressed }) => [
                  styles.lessonCard,
                  {
                    backgroundColor: theme.surface,
                    borderColor: isOngoing
                      ? isDark
                        ? '#38BDF8'
                        : '#2563EB'
                      : theme.border,
                    shadowColor: theme.cardShadow,
                    shadowOpacity: theme.cardShadowOpacity,
                    borderWidth: isOngoing ? 1.5 : 1,
                  },
                  pressed && { opacity: 0.85, transform: [{ scale: 0.99 }] },
                ]}
              >
                {/* Left Colored Accent Bar */}
                <View style={[styles.cardAccentStripe, { backgroundColor: sTheme.primary }]} />

                <View style={styles.cardContent}>
                  {/* Top Row: Time & Code */}
                  <View style={styles.topRow}>
                    <View style={styles.timeTag}>
                      <Ionicons
                        name="time-outline"
                        size={13}
                        color={isDark ? '#38BDF8' : '#2563EB'}
                      />
                      <Text style={[styles.timeText, { color: theme.text }]}>
                        {formatTime(subject.startMinutes)} – {formatTime(subject.endMinutes)}
                      </Text>
                      <Text style={[styles.durationText, { color: theme.secondary }]}>
                        ({durationMinutes} min)
                      </Text>
                    </View>

                    <View
                      style={[
                        styles.codePill,
                        { backgroundColor: sTheme.light, borderColor: sTheme.border },
                      ]}
                    >
                      <Text style={[styles.codeText, { color: sTheme.primary }]}>
                        {subject.code || sTheme.code}
                      </Text>
                    </View>
                  </View>

                  {/* Ongoing indicator banner with progress if currently happening */}
                  {isOngoing && (
                    <View style={styles.ongoingBlock}>
                      <View style={styles.ongoingRow}>
                        <View style={[styles.pulseDot, { backgroundColor: '#10B981' }]} />
                        <Text style={styles.ongoingText}>
                          Právě probíhá • zbývá {Math.max(1, minutesLeft)} min
                        </Text>
                      </View>
                      <View style={styles.lessonProgressBarTrack}>
                        <View
                          style={[
                            styles.lessonProgressBarFill,
                            {
                              width: `${elapsedPercent}%`,
                              backgroundColor: isDark ? '#34D399' : '#10B981',
                            },
                          ]}
                        />
                      </View>
                    </View>
                  )}

                  {!isOngoing && isUpcoming && (
                    <View style={styles.upcomingRow}>
                      <Ionicons name="hourglass-outline" size={12} color={isDark ? '#38BDF8' : '#2563EB'} />
                      <Text style={[styles.upcomingText, { color: isDark ? '#38BDF8' : '#2563EB' }]}>
                        Začíná za {subject.startMinutes - currentMinutes} min
                      </Text>
                    </View>
                  )}

                  {/* Subject Name */}
                  <Text style={[styles.subjectName, { color: theme.text }]}>
                    {cleanSubjectName(subject.name)}
                  </Text>

                  {/* Teacher if present */}
                  {Boolean(subject.teacher) && (
                    <View style={styles.teacherRow}>
                      <Ionicons name="person-outline" size={12} color={theme.secondary} />
                      <Text style={[styles.teacherText, { color: theme.secondary }]}>
                        {subject.teacher}
                      </Text>
                    </View>
                  )}

                  {/* Details Row: Location & Classroom */}
                  <View
                    style={[
                      styles.detailsRow,
                      { borderTopColor: isDark ? 'rgba(255,255,255,0.06)' : '#F1F5F9' },
                    ]}
                  >
                    <View style={styles.locationTag}>
                      <Ionicons
                        name={subject.location?.includes('Online') ? 'globe-outline' : 'location'}
                        size={14}
                        color={isDark ? '#38BDF8' : '#2563EB'}
                      />
                      <Text
                        style={[
                          styles.locationText,
                          {
                            color: subject.location ? (isDark ? '#E2E8F0' : '#1E293B') : theme.secondary,
                            fontWeight: subject.location ? '700' : '500',
                          },
                        ]}
                      >
                        {subject.location || 'Učebna neuvedena'}
                      </Text>
                    </View>

                    <View
                      style={[
                        styles.bookReadyTag,
                        {
                          backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#F8FAFC',
                          borderColor: theme.border,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.bookReadyText,
                          { color: theme.secondary },
                        ]}
                      >
                        Detail
                      </Text>
                      <Ionicons
                        name="chevron-forward"
                        size={12}
                        color={theme.secondary}
                      />
                    </View>
                  </View>
                </View>
              </Pressable>
            );
          })
        )}
      </View>
        </>
      )}

      {/* Lesson Details Modal */}
      <BottomSheet visible={!!selectedSubject} onClose={() => setSelectedSubject(null)}>
        {selectedSubject && (<>
              <View
                style={[
                  styles.sheetHandle,
                  { backgroundColor: isDark ? '#374151' : '#E2E8F0' },
                ]}
              />

              {/* Modal Header */}
              <View style={styles.modalHeader}>
                <View style={{ flex: 1 }}>
                  <Text
                    style={[
                      styles.modalCode,
                      { color: isDark ? '#38BDF8' : '#2563EB' },
                    ]}
                  >
                    {selectedSubject.code || 'UU.PREDMET'}
                  </Text>
                  <Text style={[styles.modalTitle, { color: theme.text }]} numberOfLines={2}>
                    {cleanSubjectName(selectedSubject.name)}
                  </Text>
                </View>

                <Pressable
                  onPress={() => setSelectedSubject(null)}
                  style={({ pressed }) => [
                    styles.closeModalBtn,
                    { backgroundColor: isDark ? '#1F2937' : '#F1F5F9' },
                    pressed && { opacity: 0.7 },
                  ]}
                >
                  <Ionicons name="close" size={20} color={theme.text} />
                </Pressable>
              </View>

              <ScrollView style={{ flexShrink: 1 }} showsVerticalScrollIndicator={false} contentContainerStyle={styles.modalDetails}>
                {/* Time & Duration Card */}
                <View
                  style={[
                    styles.infoRowCard,
                    {
                      backgroundColor: isDark ? '#1F2937' : '#F8FAFC',
                      borderColor: theme.border,
                    },
                  ]}
                >
                  <Ionicons name="time" size={20} color={isDark ? '#38BDF8' : '#2563EB'} />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.infoLabel, { color: theme.secondary }]}>Čas konání</Text>
                    <Text style={[styles.infoValue, { color: theme.text }]}>
                      {formatTime(selectedSubject.startMinutes)} – {formatTime(selectedSubject.endMinutes)} ({selectedSubject.endMinutes - selectedSubject.startMinutes} minut)
                    </Text>
                  </View>
                </View>

                {/* Location Card */}
                <View
                  style={[
                    styles.infoRowCard,
                    {
                      backgroundColor: isDark ? 'rgba(56, 189, 248, 0.08)' : '#F0F9FF',
                      borderColor: isDark ? 'rgba(56, 189, 248, 0.25)' : '#BAE6FD',
                    },
                  ]}
                >
                  <View
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 18,
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: isDark ? 'rgba(56, 189, 248, 0.2)' : '#E0F2FE',
                    }}
                  >
                    <Ionicons
                      name={selectedSubject.location?.includes('Online') ? 'globe-outline' : 'location'}
                      size={20}
                      color={isDark ? '#38BDF8' : '#0284C7'}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.infoLabel, { color: isDark ? '#94A3B8' : '#64748B' }]}>Místo konání / Učebna</Text>
                    <Text style={[styles.infoValue, { color: theme.text, fontSize: 15 }]}>
                      {selectedSubject.location || 'Učebna neuvedena'}
                    </Text>
                  </View>
                </View>

                {/* Teacher Card */}
                {Boolean(selectedSubject.teacher) && (
                  <View
                    style={[
                      styles.infoRowCard,
                      {
                        backgroundColor: isDark ? '#1F2937' : '#F8FAFC',
                        borderColor: theme.border,
                      },
                    ]}
                  >
                    <Ionicons name="person" size={20} color="#10B981" />
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.infoLabel, { color: theme.secondary }]}>Vyučující / Lektor</Text>
                      <Text style={[styles.infoValue, { color: theme.text }]}>
                        {selectedSubject.teacher}
                      </Text>
                    </View>
                  </View>
                )}

                {/* Quick Actions */}
                <View style={styles.actionButtonsCol}>
                  <Pressable
                    onPress={() => {
                      setSelectedSubject(null);
                      onNavigateToTasks?.();
                    }}
                    style={({ pressed }) => [
                      styles.actionPrimaryBtn,
                      { backgroundColor: isDark ? '#2563EB' : '#0F172A' },
                      pressed && { opacity: 0.85 },
                    ]}
                  >
                    <Ionicons name="checkbox-outline" size={18} color="#FFFFFF" />
                    <Text style={styles.actionBtnText}>Zobrazit úkoly k předmětu</Text>
                  </Pressable>

                  <Pressable
                    onPress={() => {
                      setSelectedSubject(null);
                      onNavigateToTextbooks?.();
                    }}
                    style={({ pressed }) => [
                      styles.actionSecondaryBtn,
                      {
                        backgroundColor: isDark ? '#1F2937' : '#F1F5F9',
                        borderColor: theme.border,
                      },
                      pressed && { opacity: 0.8 },
                    ]}
                  >
                    <Ionicons name="book-outline" size={18} color={theme.text} />
                    <Text style={[styles.actionSecondaryText, { color: theme.text }]}>
                      Otevřít učebnici v paměti
                    </Text>
                  </Pressable>
                </View>
              </ScrollView>
        </>)}
      </BottomSheet>
    </Screen>
  );
}

const formatTime = (m: number) =>
  `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;

const styles = StyleSheet.create({
  headerGroup: {
    gap: 2,
    marginBottom: 4,
  },
  headerEyebrow: {
    fontSize: 11,
    fontWeight: '800',
    color: '#38BDF8',
    letterSpacing: 1.2,
  },
  headerTitle: {
    fontSize: isIOS ? 34 : 30,
    fontWeight: isIOS ? '800' : '700',
    color: '#FFFFFF',
    letterSpacing: isIOS ? -0.5 : 0,
  },
  weekSelector: {
    minHeight: 64,
    flexDirection: 'row',
    borderRadius: radius.medium,
    padding: 4,
    borderWidth: 1,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
    marginTop: 2,
  },
  dayTab: {
    minHeight: 56,
    paddingHorizontal: 2,
    minWidth: 0,
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: radius.medium - 4,
    gap: 3,
    position: 'relative',
  },
  todayBadge: {
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
    marginBottom: 2,
  },
  todayBadgeText: {
    fontSize: 7.5,
    fontWeight: '900',
    letterSpacing: 0.3,
  },
  dayTabShort: {
    fontSize: 13.5,
    fontWeight: '800',
  },
  dayTabCount: {
    fontSize: 11,
    fontWeight: '600',
  },
  activeDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    marginTop: 1,
  },
  dayHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
    marginBottom: 6,
  },
  dayTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dayTitle: {
    fontSize: 20,
    fontWeight: isIOS ? '800' : '700',
  },
  currentDayTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  pulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  currentDayTagText: {
    fontSize: 10.5,
    fontWeight: '800',
  },
  jumpTodayBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  jumpTodayBtnText: {
    fontSize: 11.5,
    fontWeight: '700',
  },
  dayStatsBadge: {
    fontSize: 12,
    fontWeight: '700',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  lessonsContainer: {
    gap: 12,
    marginTop: 4,
    marginBottom: 20,
  },
  emptyDayCard: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 36,
    borderRadius: radius.medium,
    borderWidth: 1,
    gap: 10,
    marginTop: 10,
  },
  emptyIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
    maxWidth: 270,
  },
  lessonCard: {
    flexDirection: 'row',
    borderRadius: radius.medium,
    borderWidth: 1,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
    overflow: 'hidden',
  },
  cardAccentStripe: {
    width: 5,
  },
  cardContent: {
    flex: 1,
    padding: 15,
    gap: 8,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  timeTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  timeText: {
    fontSize: 13,
    fontWeight: '700',
  },
  durationText: {
    fontSize: 12,
    fontWeight: '500',
  },
  codePill: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  codeText: {
    fontSize: 10.5,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  ongoingBlock: {
    gap: 6,
    alignSelf: 'stretch',
  },
  ongoingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(16,185,129,0.12)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  ongoingText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#10B981',
  },
  lessonProgressBarTrack: {
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(16,185,129,0.18)',
    overflow: 'hidden',
  },
  lessonProgressBarFill: {
    height: '100%',
    borderRadius: 2,
  },
  upcomingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(56,189,248,0.12)',
  },
  upcomingText: {
    fontSize: 11,
    fontWeight: '700',
  },
  subjectName: {
    fontSize: 16,
    fontWeight: isIOS ? '800' : '700',
    lineHeight: 21,
  },
  teacherRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  teacherText: {
    fontSize: 12,
    fontWeight: '500',
  },
  detailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 10,
    borderTopWidth: 1,
  },
  locationTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  locationText: {
    fontSize: 12,
    fontWeight: '600',
  },
  bookReadyTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  bookReadyText: {
    fontSize: 10.5,
    fontWeight: '700',
  },

  // Modal styles
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  modalBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  modalSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: isIOS ? 38 : 24,
    maxHeight: '80%',
  },
  sheetHandle: {
    width: 38,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  },
  modalHeader: {
    gap: 12,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  modalCode: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: isIOS ? '800' : '700',
    marginTop: 2,
  },
  closeModalBtn: {
    flexShrink: 0,
    borderRadius: 22,
    height: 44,
    width: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalDetails: {
    gap: 12,
    paddingBottom: 16,
  },
  infoRowCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 14,
    borderRadius: radius.medium,
    borderWidth: 1,
  },
  infoLabel: {
    fontSize: 11.5,
    fontWeight: '600',
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '700',
    marginTop: 2,
  },
  actionButtonsCol: {
    gap: 10,
    marginTop: 10,
  },
  actionPrimaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: radius.medium,
  },
  actionBtnText: {
    color: '#FFFFFF',
    fontSize: 14.5,
    fontWeight: '700',
  },
  actionSecondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 13,
    borderRadius: radius.medium,
    borderWidth: 1,
  },
  actionSecondaryText: {
    fontSize: 14,
    fontWeight: '700',
  },

  // Styly pro přepínač a týdenní kalendářní pohled
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  viewModeSwitcher: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    padding: 3,
    gap: 3,
  },
  viewModeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 9,
    gap: 6,
  },
  viewModeBtnActive: {
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  viewModeBtnText: {
    fontSize: 12.5,
    fontWeight: '700',
  },
  weeklyGridScroll: {
    paddingVertical: 6,
    paddingBottom: 24,
    minWidth: '100%',
  },
  weeklyGridContainer: {
    flexDirection: 'row',
    gap: 12,
    minWidth: '100%',
  },
  weeklyColumn: {
    flex: 1,
    minWidth: 155,
    maxWidth: 320,
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
  },
  weeklyColumnHeader: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    gap: 4,
  },
  weeklyHeaderTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  weeklyDayLabel: {
    fontSize: 14.5,
    fontWeight: '800',
  },
  weeklyTodayPill: {
    backgroundColor: '#0284C7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  weeklyTodayPillText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.4,
  },
  weeklyHeaderSubRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  weeklyDateText: {
    fontSize: 11.5,
    fontWeight: '600',
  },
  weeklyCountText: {
    fontSize: 11.5,
    fontWeight: '700',
  },
  weeklyLessonsList: {
    padding: 10,
    gap: 10,
    flex: 1,
  },
  weeklyEmptyDay: {
    flex: 1,
    minHeight: 120,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 20,
  },
  weeklyEmptyText: {
    fontSize: 12,
    fontWeight: '500',
  },
  weeklyLessonCard: {
    borderRadius: 12,
    overflow: 'hidden',
    flexDirection: 'row',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  weeklyCardStripe: {
    width: 4,
  },
  weeklyCardContent: {
    flex: 1,
    padding: 10,
    gap: 6,
  },
  weeklyCardTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  weeklyCardTime: {
    fontSize: 11.5,
    fontWeight: '700',
  },
  weeklyCodeBadge: {
    paddingHorizontal: 5,
    paddingVertical: 1.5,
    borderRadius: 5,
    borderWidth: 1,
  },
  weeklyCodeText: {
    fontSize: 9.5,
    fontWeight: '800',
  },
  weeklyOngoingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  weeklyOngoingText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#10B981',
    letterSpacing: 0.3,
  },
  weeklySubjectName: {
    fontSize: 12.5,
    fontWeight: '700',
    lineHeight: 16,
  },
  weeklyMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  weeklyMetaText: {
    fontSize: 10.5,
    fontWeight: '500',
    flex: 1,
  },
});
