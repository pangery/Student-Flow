import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
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
import { cleanSubjectName, deadlineLabel, schoolStateLabel } from '../services/schoolDisplay';
import { getSemesterForDate, isDateInCurrentSemester } from '../services/semester';
import { BottomSheet } from '../components/BottomSheet';
import { Screen } from '../components/Screen';
import { isIOS } from '../theme/platform';
import { getSubjectThemes, radius, spacing, useAppTheme } from '../theme/theme';
import type { Subject, TaskItem } from '../types/models';

type TaskFilter = 'all' | 'active' | 'done';

type Props = {
  tasks: TaskItem[];
  subjects?: Subject[];
  initialSelectedTaskId?: string | null;
  onToggle: (id: string) => void;
  onAddTask?: (task: TaskItem) => void;
  onDeleteTask?: (id: string) => void;
  onOpenSourceUrl?: (url: string, title?: string) => void;
  onRefresh?: () => void;
  isRefreshing?: boolean;
};

export function TasksScreen({
  tasks,
  subjects = [],
  initialSelectedTaskId,
  onToggle,
  onAddTask,
  onDeleteTask,
  onOpenSourceUrl,
  onRefresh,
  isRefreshing = false,
}: Props) {
  const subjectChoices = Array.from(new Map(subjects.map(subject => [subject.name, subject])).values());
  const theme = useAppTheme();
  const isDark = theme.isDark;
  const dynamicThemes = getSubjectThemes(isDark);

  const currentSemester = getSemesterForDate();
  const [semesterScope, setSemesterScope] = useState<'current' | 'all'>('current');
  const [filter, setFilter] = useState<TaskFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [highlightedTaskId, setHighlightedTaskId] = useState<string | null>(
    initialSelectedTaskId ?? null
  );

  // If a task is selected from a notification, ensure it's not filtered out
  useState(() => {
    if (initialSelectedTaskId) {
      setHighlightedTaskId(initialSelectedTaskId);
    }
  });

  // New task form state
  const [newTitle, setNewTitle] = useState('');
  const [newSubjectId, setNewSubjectId] = useState<string>('');
  const [newPriority, setNewPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [newDaysAhead, setNewDaysAhead] = useState<number>(2);
  const [newNotes, setNewNotes] = useState('');

  // 1. Semester-scoped tasks (hides past semester assignments)
  const scopedTasks = tasks.filter((t) => {
    if (semesterScope === 'current') {
      return isDateInCurrentSemester(t.dueDate, currentSemester);
    }
    return true;
  });

  const doneCount = scopedTasks.filter((task) => task.isCompleted).length;
  const activeCount = scopedTasks.length - doneCount;
  const progressPercent = scopedTasks.length ? Math.round((doneCount / scopedTasks.length) * 100) : 0;

  const filteredTasks = scopedTasks
    .filter((t) => {
      if (filter === 'active') return !t.isCompleted;
      if (filter === 'done') return t.isCompleted;
      return true;
    })
    .filter((t) => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        t.title.toLowerCase().includes(q) ||
        (t.subjectName && t.subjectName.toLowerCase().includes(q)) ||
        (t.notes && t.notes.toLowerCase().includes(q))
      );
    })
    // Řazení podle data odevzdání (nejbližší termíny nahoře)
    .sort((a, b) => {
      // 1. Dokončené úkoly jdou až dolů
      if (a.isCompleted !== b.isCompleted) {
        return a.isCompleted ? 1 : -1;
      }
      // 2. Řazení podle data vzestupně (nejbližší termín první)
      const timeA = a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
      const timeB = b.dueDate ? new Date(b.dueDate).getTime() : Infinity;
      return timeA - timeB;
    });

  const handleCreateTask = () => {
    if (!newTitle.trim()) {
      Alert.alert('Chybí název', 'Zadej prosím název úkolu.');
      return;
    }

    const dueDateObj = new Date();
    dueDateObj.setDate(dueDateObj.getDate() + newDaysAhead);

    const chosenSubject = subjects.find((s) => s.id === newSubjectId);

    const newTask: TaskItem = {
      id: 'local_task_' + Date.now(),
      title: newTitle.trim(),
      dueDate: dueDateObj.toISOString(),
      isCompleted: false,
      subjectId: newSubjectId,
      subjectName: chosenSubject?.name || 'Všeobecné',
      priority: newPriority,
      notes: newNotes.trim() || undefined,
    };

    if (onAddTask) {
      onAddTask(newTask);
    }

    // Reset and close
    setNewTitle('');
    setNewNotes('');
    setNewDaysAhead(2);
    setModalVisible(false);
  };

  const confirmDelete = (task: TaskItem) => {
    Alert.alert(
      'Smazat úkol',
      `Opravdu chceš smazat úkol „${task.title}“?`,
      [
        { text: 'Zrušit', style: 'cancel' },
        {
          text: 'Smazat',
          style: 'destructive',
          onPress: () => onDeleteTask?.(task.id),
        },
      ]
    );
  };

  return (
    <Screen>
      {/* Header with Title and Add Button */}
      <View style={styles.headerRow}>
        <View style={styles.headerGroup}>
          <Text style={[styles.headerEyebrow, { color: isDark ? '#38BDF8' : '#2563EB' }]}>
            STUDIJNÍ POVINNOSTI
          </Text>
          <Text style={[styles.headerTitle, { color: theme.text }]}>Úkoly</Text>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          {Boolean(onRefresh) && (
            <Pressable
              onPress={onRefresh}
              disabled={isRefreshing}
              hitSlop={8}
              style={({ pressed }) => [
                styles.addBtn,
                {
                  backgroundColor: isDark ? 'rgba(56, 189, 248, 0.15)' : '#EFF6FF',
                  borderColor: isDark ? '#38BDF8' : '#2563EB',
                  paddingHorizontal: 10,
                },
                pressed && { opacity: 0.7 },
              ]}
            >
              <Ionicons
                name="sync-outline"
                size={16}
                color={isDark ? '#38BDF8' : '#2563EB'}
              />
            </Pressable>
          )}

          <Pressable
            onPress={() => { setNewSubjectId(''); setModalVisible(true); }}
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
            <Text style={styles.addBtnText}>Nový úkol</Text>
          </Pressable>
        </View>
      </View>

      {/* Semester Scope Bar */}
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
            color={semesterScope === 'current' ? (isDark ? '#38BDF8' : '#2563EB') : theme.secondary}
          />
          <Text
            style={[
              styles.semesterChipText,
              {
                color: semesterScope === 'current' ? (isDark ? '#38BDF8' : '#2563EB') : theme.secondary,
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
            Archiv
          </Text>
        </Pressable>
      </View>

      {/* Progress Overview Card */}
      <View
        style={[
          styles.overviewCard,
          {
            backgroundColor: theme.surface,
            borderColor: theme.border,
            shadowColor: theme.cardShadow,
            shadowOpacity: theme.cardShadowOpacity,
          },
        ]}
      >
        <View
          style={[
            styles.progressCircleWrap,
            {
              backgroundColor: isDark ? 'rgba(59,130,246,0.12)' : '#EFF6FF',
              borderColor: isDark ? '#3B82F6' : '#2563EB',
            },
          ]}
        >
          <Text style={[styles.progressPercentText, { color: theme.text }]}>
            {progressPercent}%
          </Text>
          <Text style={[styles.progressLabel, { color: isDark ? '#38BDF8' : '#2563EB' }]}>
            HOTOVO
          </Text>
        </View>

        <View style={styles.overviewInfo}>
          <Text style={[styles.overviewTitle, { color: theme.text }]}>
            {doneCount === tasks.length && tasks.length > 0
              ? 'Všechny úkoly máš hotové! 🎉'
              : 'Plň úkoly krok po kroku'}
          </Text>
          <Text style={[styles.overviewSubtitle, { color: theme.secondary }]}>
            {activeCount === 0
              ? 'Vše splněno, užij si volný čas nebo otevři učebnice.'
              : `Zbývá ti ${activeCount} z ${tasks.length} studijních úkolů.`}
          </Text>

          {/* Mini progress bar */}
          <View
            style={[
              styles.progressBarTrack,
              { backgroundColor: isDark ? '#1E293B' : '#E2E8F0' },
            ]}
          >
            <View
              style={[
                styles.progressBarFill,
                {
                  width: `${progressPercent}%`,
                  backgroundColor: isDark ? '#38BDF8' : '#2563EB',
                },
              ]}
            />
          </View>
        </View>
      </View>

      {/* Search Input Bar */}
      <View
        style={[
          styles.searchBar,
          {
            backgroundColor: theme.surface,
            borderColor: theme.border,
          },
        ]}
      >
        <Ionicons name="search-outline" size={17} color={theme.secondary} />
        <TextInput
          placeholder="Hledat v úkolech a poznámkách..."
          placeholderTextColor={theme.muted}
          value={searchQuery}
          onChangeText={setSearchQuery}
          style={[styles.searchInput, { color: theme.text }]}
        />
        {searchQuery.length > 0 && (
          <Pressable onPress={() => setSearchQuery('')} hitSlop={8}>
            <Ionicons name="close-circle" size={17} color={theme.secondary} />
          </Pressable>
        )}
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterRow}>
        <Pressable
          onPress={() => setFilter('all')}
          style={[
            styles.filterChip,
            {
              backgroundColor:
                filter === 'all'
                  ? isDark
                    ? '#2563EB'
                    : '#0F172A'
                  : isDark
                  ? 'rgba(255,255,255,0.06)'
                  : '#F1F5F9',
              borderColor: theme.border,
            },
          ]}
        >
          <Text
            style={[
              styles.filterText,
              { color: filter === 'all' ? '#FFFFFF' : theme.secondary },
            ]}
          >
            Všechny ({tasks.length})
          </Text>
        </Pressable>

        <Pressable
          onPress={() => setFilter('active')}
          style={[
            styles.filterChip,
            {
              backgroundColor:
                filter === 'active'
                  ? isDark
                    ? '#2563EB'
                    : '#0F172A'
                  : isDark
                  ? 'rgba(255,255,255,0.06)'
                  : '#F1F5F9',
              borderColor: theme.border,
            },
          ]}
        >
          <Text
            style={[
              styles.filterText,
              { color: filter === 'active' ? '#FFFFFF' : theme.secondary },
            ]}
          >
            Aktivní ({activeCount})
          </Text>
        </Pressable>

        <Pressable
          onPress={() => setFilter('done')}
          style={[
            styles.filterChip,
            {
              backgroundColor:
                filter === 'done'
                  ? isDark
                    ? '#2563EB'
                    : '#0F172A'
                  : isDark
                  ? 'rgba(255,255,255,0.06)'
                  : '#F1F5F9',
              borderColor: theme.border,
            },
          ]}
        >
          <Text
            style={[
              styles.filterText,
              { color: filter === 'done' ? '#FFFFFF' : theme.secondary },
            ]}
          >
            Hotové ({doneCount})
          </Text>
        </Pressable>
      </View>

      {/* Task List */}
      <View style={styles.taskList}>
        {filteredTasks.length === 0 ? (
          <View
            style={[
              styles.emptyStateCard,
              {
                backgroundColor: theme.surface,
                borderColor: theme.border,
              },
            ]}
          >
            <View
              style={[
                styles.emptyIconWrap,
                { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#F1F5F9' },
              ]}
            >
              <Ionicons
                name={filter === 'done' ? 'trophy-outline' : 'sparkles-outline'}
                size={28}
                color={isDark ? '#38BDF8' : '#2563EB'}
              />
            </View>
            <Text style={[styles.emptyTitle, { color: theme.text }]}>
              {searchQuery
                ? 'Žádný úkol neodpovídá hledání'
                : filter === 'done'
                ? 'Zatím nemáš žádné dokončené úkoly'
                : 'Žádné aktivní úkoly'}
            </Text>
            <Text style={[styles.emptySubtitle, { color: theme.secondary }]}>
              {searchQuery
                ? 'Zkus upravit hledaný výraz.'
                : 'Můžeš si přidat nový úkol tlačítkem nahoře.'}
            </Text>
          </View>
        ) : (
          filteredTasks.map((task) => {
            const isDone = task.isCompleted;
            const dueDateObj = new Date(task.dueDate);
            const daysLeft = Math.ceil(
              (dueDateObj.setHours(0, 0, 0, 0) - new Date().setHours(0, 0, 0, 0)) / 86400000
            );

            const sTheme = task.subjectId ? dynamicThemes[task.subjectId] : undefined;

            const isHighlighted = highlightedTaskId === task.id;

            return (
              <View
                key={task.id}
                style={[
                  styles.taskCard,
                  {
                    backgroundColor: isDone
                      ? isDark
                        ? 'rgba(17,24,39,0.5)'
                        : '#F8FAFC'
                      : theme.surface,
                    borderColor: isHighlighted
                      ? isDark ? '#38BDF8' : '#2563EB'
                      : theme.border,
                    borderWidth: isHighlighted ? 2 : 1,
                    shadowColor: theme.cardShadow,
                    shadowOpacity: isDone ? 0 : theme.cardShadowOpacity,
                  },
                ]}
              >
                {/* Checkbox button */}
                <Pressable
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: isDone }}
                  onPress={() => onToggle(task.id)}
                  hitSlop={8}
                  style={({ pressed }) => [
                    styles.checkCircle,
                    {
                      borderColor: isDone ? '#10B981' : isDark ? '#475569' : '#CBD5E1',
                      backgroundColor: isDone ? '#10B981' : 'transparent',
                    },
                    pressed && { opacity: 0.7 },
                  ]}
                >
                  {isDone && <Ionicons name="checkmark" size={15} color="#FFFFFF" />}
                </Pressable>

                {/* Task Details */}
                <View style={styles.taskContent}>
                  <Pressable onPress={() => onToggle(task.id)}>
                    <Text
                      style={[
                        styles.taskTitle,
                        { color: isDone ? theme.muted : theme.text },
                        isDone && styles.taskTitleDone,
                      ]}
                    >
                      {task.title}
                    </Text>
                  </Pressable>

                  {Boolean(task.sourceUrl) && (
                    <Pressable
                      onPress={() =>
                        onOpenSourceUrl
                          ? onOpenSourceUrl(task.sourceUrl!, task.title)
                          : Linking.openURL(task.sourceUrl!).catch(() =>
                              Alert.alert('Nelze otevřít odkaz')
                            )
                      }
                      hitSlop={4}
                      style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}
                    >
                      <Ionicons name="open-outline" size={12} color={isDark ? '#38BDF8' : '#2563EB'} />
                      <Text style={{ fontSize: 11.5, color: isDark ? '#38BDF8' : '#2563EB', fontWeight: '600' }}>
                        Zadání v Unicornu ({schoolStateLabel(task.sourceState)}) ↗
                      </Text>
                    </Pressable>
                  )}

                  {/* Notes snippet if present */}
                  {Boolean(task.notes) && (
                    <Text
                      numberOfLines={2}
                      style={[
                        styles.taskNotesText,
                        { color: isDone ? theme.muted : theme.secondary },
                      ]}
                    >
                      {task.notes}
                    </Text>
                  )}

                  {/* Metadata Row: Subject Tag + Priority + Due Date */}
                  <View style={styles.taskMetaRow}>
                    {/* Subject badge if available */}
                    {Boolean(task.subjectName) && (
                      <View
                        style={[
                          styles.subjectBadge,
                          {
                            backgroundColor: sTheme?.light || (isDark ? 'rgba(255,255,255,0.06)' : '#F1F5F9'),
                            borderColor: sTheme?.border || theme.border,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.subjectBadgeText,
                            { color: sTheme?.primary || theme.secondary },
                          ]}
                        >
                          {cleanSubjectName(sTheme?.code || task.subjectName)}
                        </Text>
                      </View>
                    )}


                    {/* Priority badge */}
                    {task.priority && !isDone && (
                      <View
                        style={[
                          styles.priorityBadge,
                          task.priority === 'high'
                            ? {
                                backgroundColor: isDark ? 'rgba(244,63,94,0.15)' : '#FFF1F2',
                                borderColor: isDark ? 'rgba(244,63,94,0.35)' : '#FECDD3',
                              }
                            : task.priority === 'medium'
                            ? {
                                backgroundColor: isDark ? 'rgba(245,158,11,0.15)' : '#FFFBEB',
                                borderColor: isDark ? 'rgba(245,158,11,0.35)' : '#FDE68A',
                              }
                            : {
                                backgroundColor: isDark ? 'rgba(16,185,129,0.15)' : '#ECFDF5',
                                borderColor: isDark ? 'rgba(16,185,129,0.35)' : '#A7F3D0',
                              },
                        ]}
                      >
                        <View
                          style={[
                            styles.priorityDot,
                            {
                              backgroundColor:
                                task.priority === 'high'
                                  ? '#FB7185'
                                  : task.priority === 'medium'
                                  ? '#F59E0B'
                                  : '#10B981',
                            },
                          ]}
                        />
                        <Text
                          style={[
                            styles.priorityText,
                            {
                              color:
                                task.priority === 'high'
                                  ? isDark ? '#FB7185' : '#E11D48'
                                  : task.priority === 'medium'
                                  ? isDark ? '#FBBF24' : '#D97706'
                                  : isDark ? '#34D399' : '#059669',
                            },
                          ]}
                        >
                          {task.priority === 'high'
                            ? 'Vysoká'
                            : task.priority === 'medium'
                            ? 'Střední'
                            : 'Nízká'}
                        </Text>
                      </View>
                    )}

                    {/* Due Date & relative countdown */}
                    <View style={styles.dateTag}>
                      <Ionicons
                        name="calendar-outline"
                        size={11.5}
                        color={theme.secondary}
                      />
                      <Text style={[styles.dateText, { color: theme.secondary }]}>
                        {deadlineLabel(task.dueDate)}
                      </Text>
                    </View>

                    {!isDone && Number.isFinite(daysLeft) && (
                      <View
                        style={[
                          styles.daysLeftBadge,
                          daysLeft <= 1
                            ? {
                                backgroundColor: isDark ? 'rgba(244,63,94,0.15)' : '#FFF1F2',
                                borderWidth: 1,
                                borderColor: isDark ? 'rgba(244,63,94,0.35)' : '#FECDD3',
                              }
                            : {
                                backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#F1F5F9',
                                borderWidth: 1,
                                borderColor: theme.border,
                              },
                        ]}
                      >
                        <Text
                          style={[
                            styles.daysLeftText,
                            daysLeft <= 1
                              ? { color: isDark ? '#FB7185' : '#E11D48', fontWeight: '800' }
                              : { color: theme.secondary, fontWeight: '700' },
                          ]}
                        >
                          {daysLeft < 0
                            ? 'Po termínu'
                            : daysLeft === 0
                            ? 'Dnes!'
                            : daysLeft === 1
                            ? 'Zítra'
                            : `Za ${daysLeft} dní`}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>

                {/* Delete button */}
                {Boolean(onDeleteTask) && !task.source && (
                  <Pressable
                    onPress={() => confirmDelete(task)}
                    hitSlop={10}
                    style={({ pressed }) => [
                      styles.trashBtn,
                      pressed && { opacity: 0.5 },
                    ]}
                  >
                    <Ionicons
                      name="trash-outline"
                      size={17}
                      color={isDark ? '#64748B' : '#94A3B8'}
                    />
                  </Pressable>
                )}
              </View>
            );
          })
        )}
      </View>

      {/* New Task Modal Sheet */}
      <BottomSheet visible={modalVisible} onClose={() => setModalVisible(false)}>
            <View
              style={[
                styles.sheetHandle,
                { backgroundColor: isDark ? '#374151' : '#E2E8F0' },
              ]}
            />

            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={[styles.modalTitle, { color: theme.text }]}>Nový úkol</Text>
                <Text style={[styles.modalSub, { color: theme.secondary }]}>
                  Přidej si povinnost a nastav termín
                </Text>
              </View>

              <Pressable
                onPress={() => setModalVisible(false)}
                accessibilityRole="button" accessibilityLabel="Zavřít okno"
                style={({ pressed }) => [
                  styles.closeModalBtn,
                  { backgroundColor: isDark ? '#1F2937' : '#F1F5F9' },
                  pressed && { opacity: 0.7 },
                ]}
              >
                <Ionicons name="close" size={20} color={theme.text} />
              </Pressable>
            </View>

            <ScrollView style={{ flexShrink: 1 }} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" showsVerticalScrollIndicator={false} contentContainerStyle={styles.modalForm}>
              {/* Task Title Input */}
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: theme.text }]}>Název úkolu *</Text>
                <TextInput
                  placeholder="např. Odevzdat semestrální projekt"
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

              {/* Subject Selector */}
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: theme.text }]}>Předmět</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
                  <Pressable onPress={() => setNewSubjectId('')} style={[styles.subjectChip, { backgroundColor: !newSubjectId ? '#2563EB' : theme.surface, borderColor: theme.border }]}>
                    <Text style={[styles.subjectChipText, { color: !newSubjectId ? '#FFFFFF' : theme.text }]}>Bez předmětu</Text>
                  </Pressable>
                  {subjectChoices.map((sub) => {
                    const isSelected = newSubjectId === sub.id;
                    const sTheme = dynamicThemes[sub.id];

                    return (
                      <Pressable
                        key={sub.id}
                        onPress={() => setNewSubjectId(sub.id)}
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
                  {[1, 2, 7, 14, 21, 30].map(days => (
                    <Pressable accessibilityRole="button" accessibilityState={{ selected: newDaysAhead === days }} key={days} onPress={() => setNewDaysAhead(days)}
                      style={[styles.presetDayChip, { backgroundColor: newDaysAhead === days ? '#2563EB' : theme.surface, borderColor: theme.border }]}>
                      <Text style={[styles.presetDayText, { color: newDaysAhead === days ? '#FFFFFF' : theme.text }]}>{days === 1 ? 'Zítra' : days < 5 ? `Za ${days} dny` : `Za ${days} dní`}</Text>
                    </Pressable>
                  ))}
                </View>
              </View>
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: theme.text }]}>Priorita</Text>
                <View style={styles.presetDaysRow}>
                  {(['low', 'medium', 'high'] as const).map(priority => (
                    <Pressable accessibilityRole="button" key={priority} onPress={() => setNewPriority(priority)}
                      style={[styles.presetDayChip, { backgroundColor: newPriority === priority ? '#2563EB' : theme.surface, borderColor: theme.border }]}>
                      <Text style={[styles.presetDayText, { color: newPriority === priority ? '#FFFFFF' : theme.text }]}>{priority === 'high' ? 'Vysoká' : priority === 'medium' ? 'Střední' : 'Nízká'}</Text>
                    </Pressable>
                  ))}
                </View>
              </View>
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: theme.text }]}>Poznámka</Text>
                <TextInput accessibilityLabel="Poznámka" multiline value={newNotes} onChangeText={setNewNotes} placeholder="Volitelná poznámka" placeholderTextColor={theme.muted}
                  style={[styles.textInput, { minHeight: 88, textAlignVertical: 'top', color: theme.text, borderColor: theme.border }]} />
              </View>
              <Pressable accessibilityRole="button" onPress={handleCreateTask} style={[styles.submitBtn, { backgroundColor: '#2563EB' }]}>
                <Text style={styles.submitBtnText}>Přidat úkol</Text>
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
    color: '#38BDF8',
    letterSpacing: 1.2,
  },
  headerTitle: {
    fontSize: isIOS ? 34 : 30,
    fontWeight: isIOS ? '800' : '700',
    color: '#FFFFFF',
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
  semesterBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 2,
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
  overviewCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.medium,
    padding: spacing.md,
    borderWidth: 1,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
    gap: 16,
  },
  progressCircleWrap: {
    width: 68,
    height: 68,
    borderRadius: 34,
    borderWidth: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressPercentText: {
    fontSize: 16,
    fontWeight: '800',
  },
  progressLabel: {
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  overviewInfo: {
    minWidth: 0,
    flex: 1,
    gap: 4,
  },
  overviewTitle: {
    fontSize: 15.5,
    fontWeight: isIOS ? '800' : '700',
  },
  overviewSubtitle: {
    fontSize: 12,
    lineHeight: 16,
  },
  progressBarTrack: {
    height: 5,
    borderRadius: 3,
    marginTop: 6,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: isIOS ? 10 : 8,
    borderRadius: radius.medium,
    borderWidth: 1,
    marginTop: 2,
  },
  searchInput: {
    minHeight: 28,
    minWidth: 0,
    flex: 1,
    fontSize: 13.5,
    padding: 0,
  },
  filterRow: {
    flexWrap: 'wrap',
    flexDirection: 'row',
    gap: 8,
    marginTop: 2,
  },
  filterChip: {
    justifyContent: 'center',
    minHeight: 44,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  filterText: {
    fontSize: 12,
    fontWeight: '700',
  },
  taskList: {
    gap: 10,
    marginTop: 4,
    marginBottom: 20,
  },
  taskCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderRadius: radius.medium,
    padding: 14,
    borderWidth: 1,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
    gap: 12,
  },
  checkCircle: {
    flexShrink: 0,
    height: 32,
    width: 32,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  checkCircleDone: {
    backgroundColor: '#10B981',
    borderColor: '#10B981',
  },
  taskContent: {
    minWidth: 0,
    flex: 1,
    gap: 6,
  },
  taskTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  taskTitle: {
    fontSize: 15,
    fontWeight: isIOS ? '700' : '600',
    lineHeight: 20,
  },
  taskTitleDone: {
    textDecorationLine: 'line-through',
  },
  taskNotesText: {
    fontSize: 12,
    lineHeight: 16,
  },
  taskMetaRow: {
    flexWrap: 'wrap',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 2,
  },
  subjectBadge: {
    maxWidth: '100%',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
  },
  subjectBadgeText: {
    fontSize: 10.5,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  priorityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  priorityDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  priorityText: {
    fontSize: 10.5,
    fontWeight: '700',
  },
  dateTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dateText: {
    fontSize: 11.5,
  },
  daysLeftBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: radius.pill,
  },
  daysLeftText: {
    fontSize: 10.5,
  },
  trashBtn: {
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 44,
    minWidth: 44,
    padding: 6,
    marginTop: 1,
  },
  emptyStateCard: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
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
    maxWidth: 260,
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
    maxHeight: '85%',
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
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  modalTitle: {
    flexShrink: 1,
    fontSize: 20,
    fontWeight: isIOS ? '800' : '700',
  },
  modalSub: {
    fontSize: 12.5,
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
  modalForm: {
    gap: 16,
    paddingBottom: 16,
  },
  inputGroup: {
    gap: 7,
  },
  inputLabel: {
    fontSize: 12.5,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  textInput: {
    minHeight: 48,
    borderWidth: 1,
    borderRadius: radius.medium,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 14,
  },
  textInputArea: {
    borderWidth: 1,
    borderRadius: radius.medium,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    textAlignVertical: 'top',
    minHeight: 70,
  },
  chipRow: {
    gap: 8,
    paddingVertical: 2,
  },
  subjectChip: {
    justifyContent: 'center',
    minHeight: 44,
    maxWidth: 280,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  subjectChipText: {
    flexShrink: 1,
    fontSize: 12,
  },
  prioritySegmentRow: {
    flexDirection: 'row',
    gap: 8,
  },
  prioritySegmentBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 9,
    borderRadius: radius.medium,
  },
  prioritySegmentText: {
    fontSize: 12,
  },
  presetDaysRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  presetDayChip: {
    justifyContent: 'center',
    minHeight: 44,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  presetDayText: {
    fontSize: 12,
  },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: radius.medium,
    marginTop: 8,
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
});
