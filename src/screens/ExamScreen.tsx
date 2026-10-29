import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useMemo, useState } from 'react';
import {
  Alert,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { BottomSheet } from '../components/BottomSheet';
import { Screen } from '../components/Screen';
import { cleanSubjectName, schoolStateLabel } from '../services/schoolDisplay';
import { getSemesterForDate, isDateInCurrentSemester } from '../services/semester';
import { isIOS } from '../theme/platform';
import { getSubjectThemes, radius, spacing, useAppTheme } from '../theme/theme';
import type { ExamChecklistItem, ExamItem, Subject } from '../types/models';

type Props = {
  examDate?: string;
  exams?: ExamItem[];
  subjects?: Subject[];
  initialSelectedExamId?: string | null;
  onSetDate: (value?: string) => void;
  onUpdateExams?: (exams: ExamItem[]) => void;
  onOpenSourceUrl?: (url: string, title?: string) => void;
};

export function ExamScreen({
  examDate,
  exams: initialExams,
  subjects = [],
  initialSelectedExamId,
  onSetDate,
  onUpdateExams,
  onOpenSourceUrl,
}: Props) {
  const subjectChoices = useMemo(
    () => Array.from(new Map(subjects.map((s) => [s.name, s])).values()),
    [subjects]
  );

  const theme = useAppTheme();
  const isDark = theme.isDark;
  const dynamicThemes = getSubjectThemes(isDark);

  const currentSemester = useMemo(() => getSemesterForDate(), []);
  const [semesterScope, setSemesterScope] = useState<'current' | 'all'>('current');

  const allExams = initialExams ?? [];

  // Filtrování podle aktuálního semestru (vyloučí staré zkoušky z minulých semestrů)
  const scopedExams = useMemo(() => {
    return allExams.filter((ex) => {
      if (semesterScope === 'current') {
        return isDateInCurrentSemester(ex.date, currentSemester);
      }
      return true;
    });
  }, [allExams, semesterScope, currentSemester]);

  // Seřazení chronologicky podle termínu
  const sortedExams = useMemo(() => {
    return [...scopedExams].sort((a, b) => {
      const timeA = a.date ? new Date(a.date).getTime() : Infinity;
      const timeB = b.date ? new Date(b.date).getTime() : Infinity;
      return timeA - timeB;
    });
  }, [scopedExams]);

  const [selectedExamId, setSelectedExamId] = useState<string>(
    initialSelectedExamId || sortedExams[0]?.id || 'exam-1'
  );

  // Synchronize selection if requested externally (e.g. via notification deep-link)
  useMemo(() => {
    if (initialSelectedExamId && sortedExams.some((e) => e.id === initialSelectedExamId)) {
      setSelectedExamId(initialSelectedExamId);
    }
  }, [initialSelectedExamId, sortedExams]);
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [newChecklistText, setNewChecklistText] = useState('');

  // Formulář pro nový termín
  const [newTitle, setNewTitle] = useState('');
  const [newSubjectId, setNewSubjectId] = useState('');
  const [newDaysAhead, setNewDaysAhead] = useState(14);
  const [newLocation, setNewLocation] = useState('Učebna 3.2 (KCD4)');
  const [newNotes, setNewNotes] = useState('');

  // Aktivně vybraná zkouška pro detailní hero kartu
  const activeExam =
    sortedExams.find((e) => e.id === selectedExamId) || sortedExams[0];

  const updateExamsList = (nextList: ExamItem[]) => {
    if (onUpdateExams) {
      onUpdateExams(nextList);
    }
  };

  // Metriky pro semestr
  const totalInScope = scopedExams.length;
  const completedInScope = scopedExams.filter((e) => e.isCompleted).length;
  const upcomingInScope = scopedExams.filter((e) => !e.isCompleted);

  // Nejbližší termín v semestru
  const nextClosestExam = upcomingInScope[0];
  const nextClosestDays = nextClosestExam?.date
    ? Math.ceil(
        (new Date(nextClosestExam.date).setHours(0, 0, 0, 0) -
          new Date().setHours(0, 0, 0, 0)) /
          86400000
      )
    : undefined;

  // Celková příprava (checklisty)
  const { totalChecklist, completedChecklist, globalPrepPercent } = useMemo(() => {
    let tot = 0;
    let done = 0;
    scopedExams.forEach((ex) => {
      (ex.checklist || []).forEach((c) => {
        tot++;
        if (c.completed) done++;
      });
    });
    return {
      totalChecklist: tot,
      completedChecklist: done,
      globalPrepPercent: tot > 0 ? Math.round((done / tot) * 100) : 0,
    };
  }, [scopedExams]);

  // Přepínání položek checklistu
  const handleToggleChecklist = (examId: string, itemId: string) => {
    const nextList = allExams.map((ex) => {
      if (ex.id !== examId) return ex;
      const updatedChecklist = (ex.checklist || []).map((ci) =>
        ci.id === itemId ? { ...ci, completed: !ci.completed } : ci
      );
      return { ...ex, checklist: updatedChecklist };
    });
    updateExamsList(nextList);
  };

  // Přidání vlastního kroku do checklistu aktivní zkoušky
  const handleAddChecklistStep = () => {
    if (!newChecklistText.trim() || !activeExam) return;
    const newItem: ExamChecklistItem = {
      id: `c_${Date.now()}`,
      title: newChecklistText.trim(),
      completed: false,
    };
    const nextList = allExams.map((ex) => {
      if (ex.id !== activeExam.id) return ex;
      return {
        ...ex,
        checklist: [...(ex.checklist || []), newItem],
      };
    });
    updateExamsList(nextList);
    setNewChecklistText('');
  };

  // Přepínání stavu splnění zkoušky
  const handleToggleExamCompletion = (examId: string) => {
    const nextList = allExams.map((ex) =>
      ex.id === examId ? { ...ex, isCompleted: !ex.isCompleted } : ex
    );
    updateExamsList(nextList);
  };

  // Posun termínu
  const handleAdjustDate = (examId: string, daysToAdd: number) => {
    if (allExams.find((exam) => exam.id === examId)?.source) return;
    const nextList = allExams.map((ex) => {
      if (ex.id !== examId) return ex;
      const d = new Date();
      d.setDate(d.getDate() + daysToAdd);
      return { ...ex, date: d.toISOString() };
    });
    updateExamsList(nextList);
    if (examId === activeExam?.id) {
      const d = new Date();
      d.setDate(d.getDate() + daysToAdd);
      onSetDate(d.toISOString());
    }
  };

  // Smazání zkoušky (pouze vlastní termíny)
  const handleDeleteExam = (examId: string) => {
    if (allExams.find((exam) => exam.id === examId)?.source) return;
    Alert.alert(
      'Smazat termín',
      'Opravdu chceš smazat tento zkouškový termín z přehledu?',
      [
        { text: 'Zrušit', style: 'cancel' },
        {
          text: 'Smazat',
          style: 'destructive',
          onPress: () => {
            const nextList = allExams.filter((e) => e.id !== examId);
            updateExamsList(nextList);
            if (nextList.length > 0 && nextList[0]) {
              setSelectedExamId(nextList[0].id);
            }
          },
        },
      ]
    );
  };

  // Vytvoření nového termínu
  const handleCreateExam = () => {
    if (!newTitle.trim()) {
      Alert.alert('Chybí název', 'Zadej prosím název zkoušky nebo testu.');
      return;
    }

    const d = new Date();
    d.setDate(d.getDate() + newDaysAhead);

    const chosenSubject = subjects.find((s) => s.id === newSubjectId);

    const newExam: ExamItem = {
      id: 'exam_' + Date.now(),
      title: newTitle.trim(),
      subjectId: newSubjectId,
      subjectName: chosenSubject?.name || 'Všeobecné',
      date: d.toISOString(),
      location: newLocation.trim() || undefined,
      notes: newNotes.trim() || undefined,
      checklist: [
        { id: `c_${Date.now()}_1`, title: 'Projít studijní opory a skripta', completed: false },
        { id: `c_${Date.now()}_2`, title: 'Vyřešit vzorové testové úlohy', completed: false },
        { id: `c_${Date.now()}_3`, title: 'Zopakovat klíčové pojmy a otázky', completed: false },
      ],
    };

    const nextList = [newExam, ...allExams];
    updateExamsList(nextList);
    setSelectedExamId(newExam.id);

    setNewTitle('');
    setNewNotes('');
    setNewDaysAhead(14);
    setAddModalVisible(false);
  };

  // Výpočty pro aktivní zkoušku
  const examDateObj = activeExam?.date ? new Date(activeExam.date) : undefined;
  const days = examDateObj
    ? Math.ceil(
        (examDateObj.setHours(0, 0, 0, 0) - new Date().setHours(0, 0, 0, 0)) / 86400000
      )
    : undefined;

  const checklistItems = activeExam?.checklist || [];
  const completedChecklistCount = checklistItems.filter((c) => c.completed).length;
  const checklistPercent = checklistItems.length
    ? Math.round((completedChecklistCount / checklistItems.length) * 100)
    : 0;

  const activeTheme = activeExam?.subjectId
    ? dynamicThemes[activeExam.subjectId]
    : undefined;

  return (
    <Screen>
      {/* 1. Header Row */}
      <View style={styles.headerRow}>
        <View style={styles.headerGroup}>
          <Text style={[styles.headerEyebrow, { color: isDark ? '#38BDF8' : '#2563EB' }]}>
            UNICORN UNIVERSITY · TERMÍNY
          </Text>
          <Text style={[styles.headerTitle, { color: theme.text }]}>Zkoušky</Text>
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Přidat nový zkouškový termín"
          onPress={() => {
            setNewSubjectId('');
            setAddModalVisible(true);
          }}
          style={({ pressed }) => [
            styles.addBtn,
            {
              backgroundColor: isDark ? '#2563EB' : '#0F172A',
              borderColor: isDark ? '#38BDF8' : '#1E293B',
            },
            pressed && { opacity: 0.8, transform: [{ scale: 0.97 }] },
          ]}
        >
          <Ionicons name="add" size={18} color="#FFFFFF" />
          <Text style={styles.addBtnText}>Nový termín</Text>
        </Pressable>
      </View>

      {/* 2. Semester Filter Scope Bar */}
      <View style={styles.semesterBarRow}>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ selected: semesterScope === 'current' }}
          onPress={() => setSemesterScope('current')}
          style={[
            styles.semesterChip,
            semesterScope === 'current'
              ? {
                  backgroundColor: isDark ? 'rgba(56,189,248,0.14)' : '#EFF6FF',
                  borderColor: isDark ? '#38BDF8' : '#2563EB',
                }
              : {
                  backgroundColor: theme.surface,
                  borderColor: theme.border,
                },
          ]}
        >
          <Ionicons
            name="school-outline"
            size={13}
            color={
              semesterScope === 'current'
                ? isDark
                  ? '#38BDF8'
                  : '#2563EB'
                : theme.secondary
            }
          />
          <Text
            style={[
              styles.semesterChipText,
              {
                color:
                  semesterScope === 'current'
                    ? isDark
                      ? '#38BDF8'
                      : '#2563EB'
                    : theme.secondary,
                fontWeight: semesterScope === 'current' ? '700' : '500',
              },
            ]}
          >
            {currentSemester.code} · Aktuální semestr
          </Text>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityState={{ selected: semesterScope === 'all' }}
          onPress={() => setSemesterScope('all')}
          style={[
            styles.semesterChip,
            semesterScope === 'all'
              ? {
                  backgroundColor: isDark ? 'rgba(255,255,255,0.12)' : '#F1F5F9',
                  borderColor: theme.text,
                }
              : {
                  backgroundColor: theme.surface,
                  borderColor: theme.border,
                },
          ]}
        >
          <Ionicons
            name="archive-outline"
            size={13}
            color={semesterScope === 'all' ? theme.text : theme.secondary}
          />
          <Text
            style={[
              styles.semesterChipText,
              {
                color: semesterScope === 'all' ? theme.text : theme.secondary,
                fontWeight: semesterScope === 'all' ? '700' : '500',
              },
            ]}
          >
            Archiv ({allExams.length})
          </Text>
        </Pressable>
      </View>

      {/* 3. Semester Quick Metric Cards Strip */}
      <View style={styles.metricsStrip}>
        {/* Metric A: Upcoming count */}
        <View
          style={[
            styles.metricCard,
            { backgroundColor: theme.surface, borderColor: theme.border },
          ]}
        >
          <View style={styles.metricHeader}>
            <Text style={[styles.metricLabel, { color: theme.secondary }]}>
              ZKOUŠEK V SEMESTRU
            </Text>
            <Ionicons
              name="calendar"
              size={14}
              color={isDark ? '#38BDF8' : '#2563EB'}
            />
          </View>
          <Text style={[styles.metricValue, { color: theme.text }]}>
            {totalInScope}
          </Text>
          <Text style={[styles.metricSub, { color: theme.secondary }]}>
            {completedInScope} splněno · {totalInScope - completedInScope} zbývá
          </Text>
        </View>

        {/* Metric B: Next Deadline */}
        <View
          style={[
            styles.metricCard,
            { backgroundColor: theme.surface, borderColor: theme.border },
          ]}
        >
          <View style={styles.metricHeader}>
            <Text style={[styles.metricLabel, { color: theme.secondary }]}>
              NEJBLIŽŠÍ ZKOUŠKA
            </Text>
            <Ionicons
              name="time"
              size={14}
              color={
                nextClosestDays !== undefined && nextClosestDays <= 3
                  ? '#F43F5E'
                  : '#10B981'
              }
            />
          </View>
          <Text
            style={[
              styles.metricValue,
              {
                color:
                  nextClosestDays !== undefined && nextClosestDays <= 3
                    ? isDark
                      ? '#FB7185'
                      : '#E11D48'
                    : theme.text,
              },
            ]}
          >
            {nextClosestDays === undefined
              ? 'Žádná'
              : nextClosestDays <= 0
              ? 'Dnes!'
              : `${nextClosestDays} d`}
          </Text>
          <Text
            style={[styles.metricSub, { color: theme.secondary }]}
            numberOfLines={1}
          >
            {nextClosestExam ? cleanSubjectName(nextClosestExam.subjectName) : 'Vše splněno'}
          </Text>
        </View>

        {/* Metric C: Preparation Progress */}
        <View
          style={[
            styles.metricCard,
            { backgroundColor: theme.surface, borderColor: theme.border },
          ]}
        >
          <View style={styles.metricHeader}>
            <Text style={[styles.metricLabel, { color: theme.secondary }]}>
              PŘÍPRAVA
            </Text>
            <Ionicons name="checkbox" size={14} color="#10B981" />
          </View>
          <Text style={[styles.metricValue, { color: theme.text }]}>
            {globalPrepPercent}%
          </Text>
          <Text style={[styles.metricSub, { color: theme.secondary }]}>
            {completedChecklist} z {totalChecklist} kroků
          </Text>
        </View>
      </View>

      {/* 4. Horizontal Exam Switcher Tabs */}
      {sortedExams.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.examTabsRow}
        >
          {sortedExams.map((ex) => {
            const isSelected = ex.id === activeExam?.id;
            const exTheme = ex.subjectId ? dynamicThemes[ex.subjectId] : undefined;
            const exDate = ex.date ? new Date(ex.date) : undefined;
            const exDays = exDate
              ? Math.ceil(
                  (exDate.setHours(0, 0, 0, 0) - new Date().setHours(0, 0, 0, 0)) /
                    86400000
                )
              : undefined;

            return (
              <Pressable
                key={ex.id}
                onPress={() => setSelectedExamId(ex.id)}
                style={({ pressed }) => [
                  styles.examTabCard,
                  {
                    backgroundColor: isSelected
                      ? isDark
                        ? '#13233E'
                        : '#EFF6FF'
                      : theme.surface,
                    borderColor: isSelected
                      ? isDark
                        ? '#38BDF8'
                        : '#2563EB'
                      : theme.border,
                  },
                  pressed && { opacity: 0.8 },
                ]}
              >
                <View style={styles.tabCardTop}>
                  <View
                    style={[
                      styles.tabSubjectDot,
                      { backgroundColor: exTheme?.primary || '#38BDF8' },
                    ]}
                  />
                  <Text
                    style={[
                      styles.tabSubjectCode,
                      { color: exTheme?.primary || theme.secondary },
                    ]}
                  >
                    {exTheme?.code || 'ZKOUŠKA'}
                  </Text>
                  {ex.isCompleted && (
                    <Ionicons name="checkmark-circle" size={14} color="#10B981" />
                  )}
                </View>

                <Text
                  style={[
                    styles.examTabTitle,
                    {
                      color: isSelected ? theme.text : theme.secondary,
                      fontWeight: isSelected ? '700' : '600',
                    },
                  ]}
                  numberOfLines={1}
                >
                  {cleanSubjectName(ex.subjectName) || ex.title}
                </Text>

                <View style={styles.tabDaysRow}>
                  <View
                    style={[
                      styles.tabDaysBadge,
                      ex.isCompleted
                        ? { backgroundColor: 'rgba(16,185,129,0.15)' }
                        : exDays !== undefined && exDays <= 3
                        ? { backgroundColor: 'rgba(244,63,94,0.15)' }
                        : isSelected
                        ? { backgroundColor: isDark ? 'rgba(56,189,248,0.2)' : '#DBEAFE' }
                        : { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#F1F5F9' },
                    ]}
                  >
                    <Text
                      style={[
                        styles.tabDaysText,
                        {
                          color: ex.isCompleted
                            ? '#10B981'
                            : exDays !== undefined && exDays <= 3
                            ? isDark
                              ? '#FB7185'
                              : '#E11D48'
                            : isSelected
                            ? isDark
                              ? '#38BDF8'
                              : '#2563EB'
                            : theme.secondary,
                        },
                      ]}
                    >
                      {ex.isCompleted
                        ? 'Splněno ✓'
                        : exDays === undefined
                        ? 'Bez termínu'
                        : exDays < 0
                        ? 'Proběhlo'
                        : exDays === 0
                        ? 'Dnes!'
                        : `${exDays} d`}
                    </Text>
                  </View>
                </View>
              </Pressable>
            );
          })}
        </ScrollView>
      )}

      {/* 5. Active Exam Countdown Hero Card */}
      {activeExam ? (
        <LinearGradient
          colors={
            isDark
              ? ['#0B172B', '#0E2243', '#132C57']
              : ['#FFFFFF', '#F0F7FF', '#E6F0FA']
          }
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[
            styles.countdownCard,
            {
              borderColor: isDark
                ? 'rgba(56,189,248,0.3)'
                : 'rgba(37,99,235,0.25)',
              shadowColor: theme.cardShadow,
              shadowOpacity: theme.cardShadowOpacity,
            },
          ]}
        >
          {/* Card Top Subtitle & Source Badge */}
          <View style={styles.cardHeaderRow}>
            <View style={{ flex: 1, minWidth: 0 }}>
              <View style={styles.badgeLine}>
                <View
                  style={[
                    styles.subjectCodePill,
                    {
                      backgroundColor: isDark
                        ? 'rgba(56,189,248,0.15)'
                        : '#EFF6FF',
                      borderColor: activeTheme?.primary || (isDark ? '#38BDF8' : '#2563EB'),
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.subjectCodeText,
                      { color: activeTheme?.primary || (isDark ? '#38BDF8' : '#2563EB') },
                    ]}
                  >
                    {activeTheme?.code || 'ZKOUŠKA'}
                  </Text>
                </View>

                <View
                  style={[
                    styles.sourcePill,
                    {
                      backgroundColor: activeExam.source
                        ? 'rgba(16,185,129,0.12)'
                        : isDark
                        ? 'rgba(255,255,255,0.06)'
                        : '#F1F5F9',
                    },
                  ]}
                >
                  <Ionicons
                    name={activeExam.source ? 'school' : 'person'}
                    size={11}
                    color={activeExam.source ? '#10B981' : theme.secondary}
                  />
                  <Text
                    style={[
                      styles.sourcePillText,
                      { color: activeExam.source ? '#10B981' : theme.secondary },
                    ]}
                  >
                    {activeExam.source ? 'Unicorn University' : 'Vlastní termín'}
                  </Text>
                </View>
              </View>

              <Text style={[styles.subjectTitle, { color: theme.text }]} numberOfLines={2}>
                {activeExam.title}
              </Text>
              <Text style={[styles.subjectSubName, { color: theme.secondary }]}>
                {cleanSubjectName(activeExam.subjectName)}
              </Text>
            </View>

            {/* Status Pill */}
            <Pressable
              onPress={() => handleToggleExamCompletion(activeExam.id)}
              style={({ pressed }) => [
                styles.statusPill,
                activeExam.isCompleted
                  ? {
                      backgroundColor: isDark ? 'rgba(16,185,129,0.2)' : '#ECFDF5',
                      borderColor: '#10B981',
                    }
                  : days !== undefined && days <= 3
                  ? {
                      backgroundColor: isDark ? 'rgba(244,63,94,0.18)' : '#FEF2F2',
                      borderColor: isDark ? '#FB7185' : '#FECDD3',
                    }
                  : {
                      backgroundColor: isDark ? 'rgba(56,189,248,0.14)' : '#EFF6FF',
                      borderColor: isDark ? '#38BDF8' : '#BFDBFE',
                    },
                pressed && { opacity: 0.75 },
              ]}
            >
              <Ionicons
                name={
                  activeExam.isCompleted
                    ? 'checkmark-circle'
                    : days !== undefined && days <= 3
                    ? 'warning'
                    : 'time-outline'
                }
                size={14}
                color={
                  activeExam.isCompleted
                    ? '#10B981'
                    : days !== undefined && days <= 3
                    ? isDark
                      ? '#FB7185'
                      : '#DC2626'
                    : isDark
                    ? '#38BDF8'
                    : '#2563EB'
                }
              />
              <Text
                style={[
                  styles.statusPillText,
                  {
                    color: activeExam.isCompleted
                      ? '#10B981'
                      : days !== undefined && days <= 3
                      ? isDark
                        ? '#FB7185'
                        : '#DC2626'
                      : isDark
                      ? '#38BDF8'
                      : '#2563EB',
                  },
                ]}
              >
                {activeExam.isCompleted
                  ? 'Hotovo ✓'
                  : days === undefined
                  ? 'Bez data'
                  : days < 0
                  ? 'Proběhlo'
                  : days === 0
                  ? 'Dnes!'
                  : days <= 3
                  ? 'Již brzy'
                  : 'Naplánováno'}
              </Text>
            </Pressable>
          </View>

          {/* Big Countdown Hero Block */}
          <View style={styles.countdownCenterBlock}>
            <View style={styles.countNumberWrap}>
              <Text style={[styles.countNumber, { color: theme.text }]}>
                {activeExam.isCompleted
                  ? 'Splněno'
                  : days === undefined
                  ? '—'
                  : days < 0
                  ? 'Proběhlo'
                  : days === 0
                  ? 'Dnes'
                  : days}
              </Text>
              {!activeExam.isCompleted && days !== undefined && days > 0 && (
                <Text
                  style={[
                    styles.countLabel,
                    { color: isDark ? '#38BDF8' : '#2563EB' },
                  ]}
                >
                  {days === 1
                    ? 'den zbývá'
                    : days < 5
                    ? 'dny zbývají'
                    : 'dní zbývá'}
                </Text>
              )}
            </View>
          </View>

          {/* School link button if from Unicorn */}
          {activeExam.sourceUrl && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Otevřít zadání zkoušky v informačním systému Unicorn University"
              onPress={() =>
                onOpenSourceUrl
                  ? onOpenSourceUrl(activeExam.sourceUrl!, activeExam.title)
                  : Linking.openURL(activeExam.sourceUrl!).catch(() =>
                      Alert.alert('Odkaz nelze otevřít')
                    )
              }
              style={({ pressed }) => [
                styles.unicornLinkRow,
                {
                  backgroundColor: isDark ? 'rgba(56,189,248,0.08)' : '#F0F9FF',
                  borderColor: isDark ? 'rgba(56,189,248,0.25)' : '#BAE6FD',
                },
                pressed && { opacity: 0.7 },
              ]}
            >
              <Ionicons
                name="school"
                size={14}
                color={isDark ? '#38BDF8' : '#0284C7'}
              />
              <Text
                style={[
                  styles.unicornLinkText,
                  { color: isDark ? '#38BDF8' : '#0284C7' },
                ]}
              >
                Unicorn · {schoolStateLabel(activeExam.sourceState)} · Otevřít zadání ↗
              </Text>
            </Pressable>
          )}

          {/* Location & Formatted Date */}
          <View
            style={[
              styles.dateRow,
              { borderTopColor: isDark ? 'rgba(255,255,255,0.08)' : '#E2E8F0' },
            ]}
          >
            <View style={styles.metaItem}>
              <Ionicons
                name="calendar-outline"
                size={15}
                color={isDark ? '#38BDF8' : '#2563EB'}
              />
              <Text style={[styles.dateText, { color: theme.text }]}>
                {examDateObj
                  ? examDateObj.toLocaleDateString('cs-CZ', {
                      weekday: 'long',
                      day: 'numeric',
                      month: 'long',
                    })
                  : 'Termín není stanoven'}
              </Text>
            </View>

            {Boolean(activeExam.location) && (
              <View style={styles.metaItem}>
                <Ionicons
                  name="location-outline"
                  size={15}
                  color={isDark ? '#38BDF8' : '#2563EB'}
                />
                <Text style={[styles.dateText, { color: theme.text }]}>
                  {activeExam.location}
                </Text>
              </View>
            )}
          </View>

          {/* Notes callout box if present */}
          {Boolean(activeExam.notes) && (
            <View
              style={[
                styles.notesBox,
                {
                  backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : '#F8FAFC',
                  borderColor: theme.border,
                },
              ]}
            >
              <Ionicons
                name="information-circle-outline"
                size={16}
                color={theme.secondary}
              />
              <Text style={[styles.notesText, { color: theme.secondary }]}>
                {activeExam.notes}
              </Text>
            </View>
          )}
        </LinearGradient>
      ) : (
        /* Empty State */
        <View
          style={[
            styles.emptyCard,
            { backgroundColor: theme.surface, borderColor: theme.border },
          ]}
        >
          <Ionicons
            name="checkmark-done-circle-outline"
            size={48}
            color="#10B981"
          />
          <Text style={[styles.emptyTitle, { color: theme.text }]}>
            V tomto semestru nemáš žádné další zkoušky 🎉
          </Text>
          <Text style={[styles.emptySubtitle, { color: theme.secondary }]}>
            Můžeš si přidat vlastní termín tlačítkem nahoře nebo přepnout na zobrazení archivu.
          </Text>
        </View>
      )}

      {/* 6. Preparation Checklist Card */}
      {activeExam && !activeExam.source && (
        <View
          style={[
            styles.prepCard,
            {
              backgroundColor: theme.surface,
              borderColor: theme.border,
              shadowColor: theme.cardShadow,
              shadowOpacity: theme.cardShadowOpacity,
            },
          ]}
        >
          <View style={styles.checklistHeaderRow}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.cardSectionTitle, { color: theme.text }]}>
                Plán přípravy na termín
              </Text>
              <Text style={[styles.cardSectionSub, { color: theme.secondary }]}>
                Splněno {completedChecklistCount} z {checklistItems.length} kroků ({checklistPercent}%)
              </Text>
            </View>

            <View
              style={[
                styles.progressPill,
                {
                  backgroundColor:
                    checklistPercent === 100
                      ? isDark
                        ? 'rgba(16,185,129,0.18)'
                        : '#ECFDF5'
                      : isDark
                      ? 'rgba(56,189,248,0.14)'
                      : '#EFF6FF',
                  borderColor:
                    checklistPercent === 100
                      ? '#10B981'
                      : isDark
                      ? '#38BDF8'
                      : '#BFDBFE',
                },
              ]}
            >
              <Text
                style={[
                  styles.progressPillText,
                  {
                    color:
                      checklistPercent === 100
                        ? '#10B981'
                        : isDark
                        ? '#38BDF8'
                        : '#2563EB',
                  },
                ]}
              >
                {checklistPercent}% hotovo
              </Text>
            </View>
          </View>

          {/* Progress Bar Track */}
          <View
            style={[
              styles.checklistBarTrack,
              { backgroundColor: isDark ? '#1F2937' : '#E2E8F0' },
            ]}
          >
            <View
              style={[
                styles.checklistBarFill,
                {
                  width: `${checklistPercent}%`,
                  backgroundColor:
                    checklistPercent === 100
                      ? '#10B981'
                      : isDark
                      ? '#38BDF8'
                      : '#2563EB',
                },
              ]}
            />
          </View>

          {/* Interactive Checklist Items */}
          <View style={styles.checklistItemsWrap}>
            {checklistItems.map((item) => (
              <Pressable
                key={item.id}
                onPress={() => handleToggleChecklist(activeExam.id, item.id)}
                style={({ pressed }) => [
                  styles.checkItem,
                  pressed && { opacity: 0.7 },
                ]}
              >
                <Ionicons
                  name={item.completed ? 'checkmark-circle' : 'ellipse-outline'}
                  size={22}
                  color={
                    item.completed
                      ? '#10B981'
                      : isDark
                      ? '#475569'
                      : '#CBD5E1'
                  }
                />
                <Text
                  style={[
                    styles.checkTitle,
                    {
                      color: item.completed ? theme.muted : theme.text,
                      textDecorationLine: item.completed ? 'line-through' : 'none',
                    },
                  ]}
                >
                  {item.title}
                </Text>
              </Pressable>
            ))}
          </View>

          {/* Add custom step input field */}
          <View style={styles.addChecklistRow}>
            <TextInput
              placeholder="Přidat další krok přípravy..."
              placeholderTextColor={theme.muted}
              value={newChecklistText}
              onChangeText={setNewChecklistText}
              onSubmitEditing={handleAddChecklistStep}
              style={[
                styles.addChecklistInput,
                {
                  backgroundColor: isDark ? '#1F2937' : '#F8FAFC',
                  borderColor: theme.border,
                  color: theme.text,
                },
              ]}
            />
            <Pressable
              onPress={handleAddChecklistStep}
              disabled={!newChecklistText.trim()}
              style={({ pressed }) => [
                styles.addChecklistBtn,
                {
                  backgroundColor: newChecklistText.trim()
                    ? isDark
                      ? '#2563EB'
                      : '#0F172A'
                    : isDark
                    ? '#1E293B'
                    : '#E2E8F0',
                },
                pressed && { opacity: 0.8 },
              ]}
            >
              <Ionicons
                name="add"
                size={18}
                color={newChecklistText.trim() ? '#FFFFFF' : theme.muted}
              />
            </Pressable>
          </View>
        </View>
      )}

      {/* 7. Date Presets and Management Card */}
      {activeExam && !activeExam.source && (
        <View
          style={[
            styles.presetsCard,
            {
              backgroundColor: theme.surface,
              borderColor: theme.border,
              shadowColor: theme.cardShadow,
              shadowOpacity: theme.cardShadowOpacity,
            },
          ]}
        >
          <Text style={[styles.cardSectionTitle, { color: theme.text }]}>
            Rychlý posun termínu
          </Text>

          <View style={styles.presetButtonsRow}>
            {[
              [7, 'Za týden'],
              [14, 'Za 2 týdny'],
              [21, 'Za 3 týdny'],
            ].map(([value, label]) => (
              <Pressable
                key={String(value)}
                onPress={() => handleAdjustDate(activeExam.id, Number(value))}
                style={({ pressed }) => [
                  styles.presetBtn,
                  {
                    backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#F8FAFC',
                    borderColor: theme.border,
                  },
                  pressed && { opacity: 0.7 },
                ]}
              >
                <Text
                  style={[
                    styles.presetNumber,
                    { color: isDark ? '#38BDF8' : '#2563EB' },
                  ]}
                >
                  +{value}
                </Text>
                <Text style={[styles.presetLabel, { color: theme.secondary }]}>
                  {label}
                </Text>
              </Pressable>
            ))}
          </View>

          <Pressable
            onPress={() => handleDeleteExam(activeExam.id)}
            style={({ pressed }) => [styles.cancelBtn, pressed && { opacity: 0.6 }]}
          >
            <Ionicons
              name="trash-outline"
              size={15}
              color={isDark ? '#FB7185' : '#EF4444'}
            />
            <Text
              style={[
                styles.cancelText,
                { color: isDark ? '#FB7185' : '#EF4444' },
              ]}
            >
              Odstranit tento termín
            </Text>
          </Pressable>
        </View>
      )}

      {/* 8. Semester Exam Timeline / Full List */}
      {sortedExams.length > 0 && (
        <View style={styles.timelineSection}>
          <Text style={[styles.timelineSectionTitle, { color: theme.text }]}>
            Harmonogram zkoušek v semestru ({sortedExams.length})
          </Text>

          <View style={styles.timelineList}>
            {sortedExams.map((ex) => {
              const isSelected = ex.id === activeExam?.id;
              const exTheme = ex.subjectId ? dynamicThemes[ex.subjectId] : undefined;
              const exDate = ex.date ? new Date(ex.date) : undefined;
              const exDays = exDate
                ? Math.ceil(
                    (exDate.setHours(0, 0, 0, 0) - new Date().setHours(0, 0, 0, 0)) /
                      86400000
                  )
                : undefined;

              return (
                <Pressable
                  key={ex.id}
                  onPress={() => setSelectedExamId(ex.id)}
                  style={({ pressed }) => [
                    styles.timelineCard,
                    {
                      backgroundColor: theme.surface,
                      borderColor: isSelected
                        ? isDark
                          ? '#38BDF8'
                          : '#2563EB'
                        : theme.border,
                    },
                    isSelected && {
                      shadowColor: isDark ? '#38BDF8' : '#2563EB',
                      shadowOpacity: 0.2,
                      shadowRadius: 10,
                      elevation: 4,
                    },
                    pressed && { opacity: 0.8 },
                  ]}
                >
                  <View
                    style={[
                      styles.timelineColorBar,
                      { backgroundColor: exTheme?.primary || '#38BDF8' },
                    ]}
                  />

                  <View style={styles.timelineBody}>
                    <View style={styles.timelineTopRow}>
                      <Text
                        style={[
                          styles.timelineSubjectCode,
                          { color: exTheme?.primary || (isDark ? '#38BDF8' : '#2563EB') },
                        ]}
                      >
                        {exTheme?.code || 'ZKOUŠKA'}
                      </Text>
                      <View
                        style={[
                          styles.timelineDaysTag,
                          ex.isCompleted
                            ? { backgroundColor: 'rgba(16,185,129,0.15)' }
                            : exDays !== undefined && exDays <= 3
                            ? { backgroundColor: 'rgba(244,63,94,0.15)' }
                            : {
                                backgroundColor: isDark
                                  ? 'rgba(255,255,255,0.06)'
                                  : '#F1F5F9',
                              },
                        ]}
                      >
                        <Text
                          style={[
                            styles.timelineDaysText,
                            {
                              color: ex.isCompleted
                                ? '#10B981'
                                : exDays !== undefined && exDays <= 3
                                ? isDark
                                  ? '#FB7185'
                                  : '#E11D48'
                                : theme.secondary,
                            },
                          ]}
                        >
                          {ex.isCompleted
                            ? 'Hotovo ✓'
                            : exDays === undefined
                            ? 'Bez data'
                            : exDays < 0
                            ? 'Proběhlo'
                            : exDays === 0
                            ? 'Dnes!'
                            : `${exDays} dní`}
                        </Text>
                      </View>
                    </View>

                    <Text
                      style={[
                        styles.timelineTitle,
                        {
                          color: theme.text,
                          textDecorationLine: ex.isCompleted
                            ? 'line-through'
                            : 'none',
                        },
                      ]}
                      numberOfLines={1}
                    >
                      {ex.title}
                    </Text>

                    <View style={styles.timelineBottomRow}>
                      <View style={styles.timelineMeta}>
                        <Ionicons
                          name="calendar-outline"
                          size={12}
                          color={theme.secondary}
                        />
                        <Text
                          style={[
                            styles.timelineMetaText,
                            { color: theme.secondary },
                          ]}
                        >
                          {exDate
                            ? exDate.toLocaleDateString('cs-CZ', {
                                day: 'numeric',
                                month: 'short',
                              })
                            : 'Neuvedeno'}
                        </Text>
                      </View>

                      {Boolean(ex.location) && (
                        <View style={styles.timelineMeta}>
                          <Ionicons
                            name="location-outline"
                            size={12}
                            color={theme.secondary}
                          />
                          <Text
                            style={[
                              styles.timelineMetaText,
                              { color: theme.secondary },
                            ]}
                            numberOfLines={1}
                          >
                            {ex.location}
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>
                </Pressable>
              );
            })}
          </View>
        </View>
      )}

      {/* 9. Modal for adding new exam */}
      <BottomSheet visible={addModalVisible} onClose={() => setAddModalVisible(false)}>
        <View
          style={[
            styles.sheetHandle,
            { backgroundColor: isDark ? '#374151' : '#E2E8F0' },
          ]}
        />

        <View style={styles.modalHeader}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>
              Nový zkouškový termín
            </Text>
            <Text style={[styles.modalSub, { color: theme.secondary }]}>
              Zkouška, zápočet nebo certifikační test
            </Text>
          </View>

          <Pressable
            onPress={() => setAddModalVisible(false)}
            accessibilityRole="button"
            accessibilityLabel="Zavřít okno"
            style={({ pressed }) => [
              styles.closeModalBtn,
              { backgroundColor: isDark ? '#1F2937' : '#F1F5F9' },
              pressed && { opacity: 0.7 },
            ]}
          >
            <Ionicons name="close" size={20} color={theme.text} />
          </Pressable>
        </View>

        <ScrollView
          style={{ flexShrink: 1 }}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.modalForm}
        >
          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: theme.text }]}>
              Název termínu *
            </Text>
            <TextInput
              placeholder="např. Zkouška – Vývoj mobilních aplikací"
              placeholderTextColor={theme.muted}
              value={newTitle}
              onChangeText={setNewTitle}
              style={[
                styles.textInput,
                {
                  backgroundColor: isDark ? '#1F2937' : '#F8FAFC',
                  borderColor: theme.border,
                  color: theme.text,
                },
              ]}
            />
          </View>

          {/* Subject selector */}
          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: theme.text }]}>Předmět</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.chipRow}
            >
              <Pressable
                onPress={() => setNewSubjectId('')}
                style={[
                  styles.subjectChip,
                  {
                    backgroundColor: !newSubjectId
                      ? '#2563EB'
                      : theme.surface,
                    borderColor: theme.border,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.subjectChipText,
                    { color: !newSubjectId ? '#FFFFFF' : theme.text },
                  ]}
                >
                  Bez předmětu
                </Text>
              </Pressable>
              {subjectChoices.map((sub) => {
                const isSelected = newSubjectId === sub.id;
                const sTheme = dynamicThemes[sub.id];

                return (
                  <Pressable
                    key={sub.id}
                    onPress={() => {
                      setNewSubjectId(sub.id);
                      if (!newTitle) {
                        setNewTitle(`Zkouška – ${sub.name}`);
                      }
                    }}
                    style={[
                      styles.subjectChip,
                      {
                        backgroundColor: isSelected
                          ? isDark
                            ? '#2563EB'
                            : '#0F172A'
                          : isDark
                          ? '#1F2937'
                          : '#F1F5F9',
                        borderColor: isSelected
                          ? isDark
                            ? '#38BDF8'
                            : '#0F172A'
                          : theme.border,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.subjectChipText,
                        {
                          color: isSelected
                            ? '#FFFFFF'
                            : isDark
                            ? '#CBD5E1'
                            : '#475569',
                          fontWeight: isSelected ? '700' : '500',
                        },
                      ]}
                    >
                      {sTheme?.code || sub.name}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: theme.text }]}>Termín</Text>
            <View style={styles.presetDaysRow}>
              {[1, 2, 7, 14, 21, 30].map((daysCount) => (
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ selected: newDaysAhead === daysCount }}
                  key={daysCount}
                  onPress={() => setNewDaysAhead(daysCount)}
                  style={[
                    styles.presetDayChip,
                    {
                      backgroundColor:
                        newDaysAhead === daysCount ? '#2563EB' : theme.surface,
                      borderColor: theme.border,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.presetDayText,
                      {
                        color:
                          newDaysAhead === daysCount ? '#FFFFFF' : theme.text,
                      },
                    ]}
                  >
                    {daysCount === 1
                      ? 'Zítra'
                      : daysCount < 5
                      ? `Za ${daysCount} dny`
                      : `Za ${daysCount} dní`}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: theme.text }]}>Místo</Text>
            <TextInput
              accessibilityLabel="Místo zkoušky"
              value={newLocation}
              onChangeText={setNewLocation}
              style={[
                styles.textInput,
                {
                  backgroundColor: isDark ? '#1F2937' : '#F8FAFC',
                  color: theme.text,
                  borderColor: theme.border,
                },
              ]}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: theme.text }]}>
              Poznámka
            </Text>
            <TextInput
              accessibilityLabel="Poznámka"
              multiline
              value={newNotes}
              onChangeText={setNewNotes}
              placeholder="Volitelná poznámka k požadavkům zkoušky"
              placeholderTextColor={theme.muted}
              style={[
                styles.textInput,
                {
                  minHeight: 80,
                  textAlignVertical: 'top',
                  backgroundColor: isDark ? '#1F2937' : '#F8FAFC',
                  color: theme.text,
                  borderColor: theme.border,
                },
              ]}
            />
          </View>

          <Pressable
            accessibilityRole="button"
            onPress={handleCreateExam}
            style={[styles.submitBtn, { backgroundColor: '#2563EB' }]}
          >
            <Text style={styles.submitBtnText}>Uložit termín</Text>
          </Pressable>
        </ScrollView>
      </BottomSheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    gap: 12,
    flexWrap: 'wrap',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  headerGroup: {
    minWidth: 0,
    flexShrink: 1,
    gap: 2,
  },
  headerEyebrow: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  headerTitle: {
    fontSize: isIOS ? 34 : 30,
    fontWeight: isIOS ? '800' : '700',
    letterSpacing: isIOS ? -0.5 : 0,
  },
  addBtn: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  addBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },

  /* Semester Bar */
  semesterBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginVertical: 4,
  },
  semesterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  semesterChipText: {
    fontSize: 12,
  },

  /* Metrics Deck */
  metricsStrip: {
    flexDirection: 'row',
    gap: 8,
    marginVertical: 6,
  },
  metricCard: {
    flex: 1,
    borderRadius: radius.medium,
    padding: 10,
    borderWidth: 1,
    gap: 2,
  },
  metricHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  metricLabel: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  metricValue: {
    fontSize: 20,
    fontWeight: '800',
    marginTop: 2,
  },
  metricSub: {
    fontSize: 10.5,
    fontWeight: '500',
  },

  /* Horizontal Exam Switcher */
  examTabsRow: {
    gap: 10,
    paddingVertical: 6,
    marginBottom: 4,
  },
  examTabCard: {
    minHeight: 74,
    minWidth: 140,
    maxWidth: 200,
    borderRadius: radius.medium,
    padding: 10,
    borderWidth: 1.5,
    justifyContent: 'space-between',
  },
  tabCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  tabSubjectDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  tabSubjectCode: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
    flex: 1,
  },
  examTabTitle: {
    fontSize: 13,
    marginTop: 3,
  },
  tabDaysRow: {
    flexDirection: 'row',
    marginTop: 4,
  },
  tabDaysBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.pill,
  },
  tabDaysText: {
    fontSize: 10.5,
    fontWeight: '700',
  },

  /* Hero Countdown Card */
  countdownCard: {
    borderRadius: radius.large,
    padding: 20,
    borderWidth: 1.5,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
    gap: 14,
    marginVertical: 4,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  badgeLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  subjectCodePill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  subjectCodeText: {
    fontSize: 10.5,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  sourcePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.pill,
  },
  sourcePillText: {
    fontSize: 10.5,
    fontWeight: '600',
  },
  subjectTitle: {
    fontSize: 19,
    fontWeight: isIOS ? '800' : '700',
    lineHeight: 24,
  },
  subjectSubName: {
    fontSize: 13,
    fontWeight: '500',
    marginTop: 2,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: '800',
  },

  /* Countdown Center Block */
  countdownCenterBlock: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
  },
  countNumberWrap: {
    alignItems: 'center',
    gap: 2,
  },
  countNumber: {
    fontSize: 60,
    fontWeight: isIOS ? '900' : '800',
    letterSpacing: -1.5,
    lineHeight: 64,
  },
  countLabel: {
    fontSize: 16,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },

  /* Unicorn Link */
  unicornLinkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.medium,
    borderWidth: 1,
  },
  unicornLinkText: {
    fontSize: 12.5,
    fontWeight: '700',
    flex: 1,
  },

  /* Date & Location */
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 12,
    borderTopWidth: 1,
    gap: 12,
  },
  metaItem: {
    flexShrink: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dateText: {
    fontSize: 13,
    fontWeight: '600',
  },
  notesBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    padding: 10,
    borderRadius: radius.medium,
    borderWidth: 1,
  },
  notesText: {
    fontSize: 12,
    lineHeight: 17,
    flex: 1,
  },

  /* Empty Card */
  emptyCard: {
    borderRadius: radius.large,
    padding: 28,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginVertical: 12,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '700',
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
    maxWidth: 320,
  },

  /* Preparation Checklist */
  prepCard: {
    borderRadius: radius.large,
    padding: 16,
    borderWidth: 1,
    gap: 12,
    marginVertical: 6,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  checklistHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardSectionTitle: {
    fontSize: 15,
    fontWeight: isIOS ? '800' : '700',
  },
  cardSectionSub: {
    fontSize: 12,
    marginTop: 2,
  },
  progressPill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  progressPillText: {
    fontSize: 11,
    fontWeight: '800',
  },
  checklistBarTrack: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  checklistBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  checklistItemsWrap: {
    gap: 8,
  },
  checkItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 4,
  },
  checkTitle: {
    fontSize: 14,
    flex: 1,
    lineHeight: 18,
  },
  addChecklistRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  addChecklistInput: {
    flex: 1,
    height: 38,
    borderRadius: radius.pill,
    borderWidth: 1,
    paddingHorizontal: 14,
    fontSize: 13,
  },
  addChecklistBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* Date presets */
  presetsCard: {
    borderRadius: radius.large,
    padding: 16,
    borderWidth: 1,
    gap: 12,
    marginVertical: 6,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  presetButtonsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  presetBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: radius.medium,
    borderWidth: 1,
    gap: 2,
  },
  presetNumber: {
    fontSize: 16,
    fontWeight: '800',
  },
  presetLabel: {
    fontSize: 10.5,
    fontWeight: '600',
  },
  cancelBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
  },
  cancelText: {
    fontSize: 12.5,
    fontWeight: '700',
  },

  /* Timeline */
  timelineSection: {
    marginTop: 10,
    marginBottom: 20,
    gap: 10,
  },
  timelineSectionTitle: {
    fontSize: 16,
    fontWeight: isIOS ? '800' : '700',
  },
  timelineList: {
    gap: 8,
  },
  timelineCard: {
    flexDirection: 'row',
    borderRadius: radius.medium,
    borderWidth: 1,
    overflow: 'hidden',
  },
  timelineColorBar: {
    width: 5,
  },
  timelineBody: {
    flex: 1,
    padding: 12,
    gap: 4,
  },
  timelineTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  timelineSubjectCode: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  timelineDaysTag: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.pill,
  },
  timelineDaysText: {
    fontSize: 10.5,
    fontWeight: '700',
  },
  timelineTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  timelineBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginTop: 2,
  },
  timelineMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  timelineMetaText: {
    fontSize: 11.5,
  },

  /* Modal Sheet */
  sheetHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 12,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 12,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  modalSub: {
    fontSize: 12.5,
    marginTop: 2,
  },
  closeModalBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalForm: {
    gap: 14,
    paddingVertical: 6,
  },
  inputGroup: {
    gap: 6,
  },
  inputLabel: {
    fontSize: 12.5,
    fontWeight: '700',
  },
  textInput: {
    borderRadius: radius.medium,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  chipRow: {
    gap: 8,
    paddingVertical: 4,
  },
  subjectChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  subjectChipText: {
    fontSize: 12,
  },
  presetDaysRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  presetDayChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  presetDayText: {
    fontSize: 11.5,
    fontWeight: '600',
  },
  submitBtn: {
    height: 48,
    borderRadius: radius.medium,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});
