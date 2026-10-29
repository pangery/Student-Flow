import AsyncStorage from '@react-native-async-storage/async-storage';
import { NativeModules } from 'react-native';
import { filterCurrentSemesterExams, filterCurrentSemesterTasks } from './semester';
import type { StudentData, Subject, TaskItem, ExamItem } from '../types/models';

export const STORAGE_KEY_WIDGET_DATA = 'studentflow.widget_snapshot.v1';

export type WidgetLesson = {
  id: string;
  name: string;
  time: string;
  room: string;
  code?: string;
  teacher?: string;
  isNowOrNext: boolean;
};

export type WidgetTask = {
  id: string;
  title: string;
  subjectName?: string;
  dueText: string;
  isUrgent: boolean;
};

export type WidgetExam = {
  id: string;
  title: string;
  subjectName: string;
  dateText: string;
  daysRemaining: number;
};

export type WidgetSnapshot = {
  studentName: string;
  uuIdentity?: string;
  lastUpdated: string;
  todayLessonsCount: number;
  currentOrNextLesson: WidgetLesson | null;
  nextTask: WidgetTask | null;
  nextExam: WidgetExam | null;
  pendingTasksCount: number;
};

function formatMinutes(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function formatCzechDate(dateStr?: string, now = new Date()): { label: string; isUrgent: boolean } {
  if (!dateStr) return { label: 'Bez termínu', isUrgent: false };
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) {
    return { label: dateStr, isUrgent: false };
  }

  const diffMs = d.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays <= 0 && diffMs > 0) {
    return { label: `Dnes v ${formatMinutes(d.getHours() * 60 + d.getMinutes())}`, isUrgent: true };
  }
  if (diffDays === 1) {
    return { label: 'Zítra', isUrgent: true };
  }
  if (diffDays === 2) {
    return { label: 'Pozítří', isUrgent: true };
  }
  if (diffDays > 2 && diffDays <= 7) {
    return { label: `Za ${diffDays} dní`, isUrgent: false };
  }

  const day = d.getDate();
  const month = d.getMonth() + 1;
  return { label: `${day}. ${month}.`, isUrgent: false };
}

/**
 * Builds a deterministic widget data snapshot from the student's current study data.
 */
export function buildWidgetSnapshot(data: StudentData, now = new Date()): WidgetSnapshot {
  const currentWeekday = now.getDay() + 1; // 2 = Monday ... 6 = Friday
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  // 1. Process today's lessons
  const todaySubjects = (data.subjects || [])
    .filter((s) => s.weekday === currentWeekday)
    .sort((a, b) => a.startMinutes - b.startMinutes);

  let currentOrNextLesson: WidgetLesson | null = null;

  for (const s of todaySubjects) {
    const isOngoing = s.startMinutes <= currentMinutes && s.endMinutes > currentMinutes;
    const isUpcoming = s.startMinutes > currentMinutes;

    if (isOngoing || isUpcoming) {
      currentOrNextLesson = {
        id: s.id,
        name: s.name,
        time: `${formatMinutes(s.startMinutes)} - ${formatMinutes(s.endMinutes)}`,
        room: s.location || 'Online',
        code: s.code,
        teacher: s.teacher,
        isNowOrNext: true,
      };
      break;
    }
  }

  // If no upcoming class today but classes existed, display the first one for reference or tomorrow
  if (!currentOrNextLesson && todaySubjects.length > 0) {
    const last = todaySubjects[todaySubjects.length - 1]!;
    currentOrNextLesson = {
      id: last.id,
      name: last.name,
      time: `${formatMinutes(last.startMinutes)} - ${formatMinutes(last.endMinutes)}`,
      room: last.location || 'Online',
      code: last.code,
      teacher: last.teacher,
      isNowOrNext: false,
    };
  }

  // 2. Process upcoming pending tasks
  const activeTasks = filterCurrentSemesterTasks(data.tasks || []).filter((t) => !t.isCompleted);
  // Sort by dueDate
  activeTasks.sort((a, b) => {
    const da = a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
    const db = b.dueDate ? new Date(b.dueDate).getTime() : Infinity;
    return da - db;
  });

  let nextTask: WidgetTask | null = null;
  if (activeTasks.length > 0) {
    const t = activeTasks[0]!;
    const { label, isUrgent } = formatCzechDate(t.dueDate, now);
    nextTask = {
      id: t.id,
      title: t.title,
      subjectName: t.subjectName,
      dueText: label,
      isUrgent,
    };
  }

  // 3. Process upcoming exams
  const activeExams = filterCurrentSemesterExams(data.exams || []).filter((e) => !e.isCompleted);
  activeExams.sort((a, b) => {
    const da = a.date ? new Date(a.date).getTime() : Infinity;
    const db = b.date ? new Date(b.date).getTime() : Infinity;
    return da - db;
  });

  let nextExam: WidgetExam | null = null;
  if (activeExams.length > 0) {
    const e = activeExams[0]!;
    const examDate = new Date(e.date);
    const diffMs = examDate.getTime() - now.getTime();
    const daysRemaining = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
    const { label } = formatCzechDate(e.date, now);

    nextExam = {
      id: e.id,
      title: e.title || e.subjectName,
      subjectName: e.subjectName,
      dateText: label,
      daysRemaining,
    };
  }

  const nowFormatted = now.toLocaleTimeString('cs-CZ', {
    hour: '2-digit',
    minute: '2-digit',
  });

  return {
    studentName: data.studentName || 'Student',
    uuIdentity: data.uuIdentity,
    lastUpdated: nowFormatted,
    todayLessonsCount: todaySubjects.length,
    currentOrNextLesson,
    nextTask,
    nextExam,
    pendingTasksCount: activeTasks.length,
  };
}

/**
 * Updates the widget snapshot and syncs it with the native iOS & Android widget storage
 */
export async function updateWidgetSnapshot(data: StudentData, now = new Date()): Promise<WidgetSnapshot> {
  const snapshot = buildWidgetSnapshot(data, now);
  const jsonString = JSON.stringify(snapshot);

  try {
    await AsyncStorage.setItem(STORAGE_KEY_WIDGET_DATA, jsonString);
  } catch {
    // Non-critical local storage fallback
  }

  try {
    // If native widget bridge module is present (iOS / Android), notify it
    const bridge = NativeModules?.StudentFlowWidgetBridge;
    if (bridge && typeof bridge.updateWidgetData === 'function') {
      await bridge.updateWidgetData(jsonString);
    }
  } catch (err) {
    // Graceful fallback if native module is not yet compiled into binary
  }

  return snapshot;
}

/**
 * Reads the latest widget snapshot from storage
 */
export async function loadWidgetSnapshot(): Promise<WidgetSnapshot | null> {
  try {
    const stored = await AsyncStorage.getItem(STORAGE_KEY_WIDGET_DATA);
    if (!stored) return null;
    return JSON.parse(stored) as WidgetSnapshot;
  } catch {
    return null;
  }
}
