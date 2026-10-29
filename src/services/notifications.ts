import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { filterCurrentSemesterExams, filterCurrentSemesterTasks } from './semester';
import type { ExamItem, Subject, TaskItem } from '../types/models';

export const STORAGE_KEY_NOTIF_ENABLED = 'studentflow.notifications.enabled.v1';
export const STORAGE_KEY_PUSH_TOKEN = 'studentflow.notifications.push_token.v1';

export type NotificationRegistrationResult = {
  granted: boolean;
  token: string | null;
  isDevice: boolean;
  error?: string;
};

// Initialize foreground notification presentation handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

/**
 * Configure Android notification channels for distinct notification types
 */
export async function setupNotificationChannels(): Promise<void> {
  if (Platform.OS !== 'android') return;

  await Promise.all([
    Notifications.setNotificationChannelAsync('deadlines', {
      name: 'Deadliny a úkoly',
      description: 'Upozornění na blížící se termíny odevzdání školních úkolů',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#2563EB',
      sound: 'default',
      enableVibrate: true,
      showBadge: true,
    }),
    Notifications.setNotificationChannelAsync('exams', {
      name: 'Zkoušky a příprava',
      description: 'Připomenutí blížících se zkoušek a studijní přípravy',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 350, 200, 350],
      lightColor: '#F59E0B',
      sound: 'default',
      enableVibrate: true,
      showBadge: true,
    }),
    Notifications.setNotificationChannelAsync('schedule', {
      name: 'Denní rozvrh a výuka',
      description: 'Ranní přehled dnešních přednášek a cvičení',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 200, 100, 200],
      lightColor: '#10B981',
      sound: 'default',
      enableVibrate: true,
      showBadge: true,
    }),
    Notifications.setNotificationChannelAsync('general', {
      name: 'StudentFlow zprávy',
      description: 'Obecná systémová oznámení a synchronizace',
      importance: Notifications.AndroidImportance.DEFAULT,
      sound: 'default',
      showBadge: true,
    }),
  ]);
}

/**
 * Request notification permissions and register for push token
 * Works on both iOS (APNs) and Android (FCM / Expo Push Service)
 */
export async function registerForPushNotificationsAsync(): Promise<NotificationRegistrationResult> {
  try {
    await setupNotificationChannels();

    const settings = await Notifications.getPermissionsAsync();
    let finalStatus = settings.status;

    if (settings.status !== Notifications.PermissionStatus.GRANTED) {
      const requestResult = await Notifications.requestPermissionsAsync({
        ios: {
          allowAlert: true,
          allowBadge: true,
          allowSound: true,
        },
      });
      finalStatus = requestResult.status;
    }

    if (finalStatus !== Notifications.PermissionStatus.GRANTED) {
      await AsyncStorage.setItem(STORAGE_KEY_NOTIF_ENABLED, 'false');
      return {
        granted: false,
        token: null,
        isDevice: Device.isDevice,
      };
    }

    await AsyncStorage.setItem(STORAGE_KEY_NOTIF_ENABLED, 'true');

    let pushToken: string | null = null;
    if (Device.isDevice) {
      try {
        const tokenResponse = await Notifications.getExpoPushTokenAsync();
        pushToken = tokenResponse.data;
      } catch {
        // Fallback to native device token if Expo Push service project ID is not set
        try {
          const deviceToken = await Notifications.getDevicePushTokenAsync();
          pushToken = typeof deviceToken.data === 'string' ? deviceToken.data : JSON.stringify(deviceToken.data);
        } catch {
          pushToken = 'DEVICE_TOKEN_ACTIVE';
        }
      }
    } else {
      pushToken = 'SIMULATOR_NOTIFICATIONS_ACTIVE';
    }

    if (pushToken) {
      await AsyncStorage.setItem(STORAGE_KEY_PUSH_TOKEN, pushToken);
    }

    return {
      granted: true,
      token: pushToken,
      isDevice: Device.isDevice,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      granted: false,
      token: null,
      isDevice: Device.isDevice,
      error: message,
    };
  }
}

/**
 * Parses diverse date formats used in Unicorn University data
 */
export function parseDateSafe(dateStr?: string): Date | null {
  if (!dateStr) return null;
  const isoDate = new Date(dateStr);
  if (!Number.isNaN(isoDate.getTime())) {
    return isoDate;
  }

  // Parse Czech format "DD.MM.YYYY" or "DD. MM. YYYY"
  const czMatch = dateStr.match(/^(\d{1,2})\.\s*(\d{1,2})\.\s*(\d{4})/);
  if (czMatch && czMatch[1] && czMatch[2] && czMatch[3]) {
    const day = parseInt(czMatch[1], 10);
    const month = parseInt(czMatch[2], 10) - 1;
    const year = parseInt(czMatch[3], 10);
    const parsed = new Date(year, month, day, 18, 0, 0);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed;
    }
  }

  return null;
}

/**
 * Schedule a local notification for an upcoming task deadline
 */
export async function scheduleTaskDeadlineReminder(task: TaskItem): Promise<string | null> {
  if (task.isCompleted) return null;
  const dueDate = parseDateSafe(task.dueDate);
  if (!dueDate) return null;

  const now = Date.now();
  // Reminder 24 hours before deadline, or 2 hours before if today
  const targetReminderMs = dueDate.getTime() - 24 * 60 * 60 * 1000;
  let reminderTime = new Date(targetReminderMs);

  if (reminderTime.getTime() <= now) {
    const shortNoticeMs = dueDate.getTime() - 2 * 60 * 60 * 1000;
    if (shortNoticeMs > now) {
      reminderTime = new Date(shortNoticeMs);
    } else {
      return null;
    }
  }

  const notifId = `task-deadline-${task.id}`;
  try {
    await Notifications.scheduleNotificationAsync({
      identifier: notifId,
      content: {
        title: 'Blíží se termín odevzdání',
        body: `${task.title}${task.subjectName ? ` (${task.subjectName})` : ''}`,
        data: { taskId: task.id, type: 'task_deadline' },
        sound: true,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: reminderTime,
        channelId: 'deadlines',
      },
    });
    return notifId;
  } catch {
    return null;
  }
}

/**
 * Schedule local notifications for an upcoming exam
 */
export async function scheduleExamReminder(exam: ExamItem): Promise<string | null> {
  if (exam.isCompleted) return null;
  const examDate = parseDateSafe(exam.date);
  if (!examDate) return null;

  const now = Date.now();
  // Reminder 24 hours before exam
  const targetReminderMs = examDate.getTime() - 24 * 60 * 60 * 1000;
  if (targetReminderMs <= now) return null;

  const reminderTime = new Date(targetReminderMs);
  const notifId = `exam-reminder-${exam.id}`;

  try {
    await Notifications.scheduleNotificationAsync({
      identifier: notifId,
      content: {
        title: 'Zítra tě čeká zkouška',
        body: exam.title || exam.subjectName,
        data: { examId: exam.id, type: 'exam_reminder' },
        sound: true,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: reminderTime,
        channelId: 'exams',
      },
    });
    return notifId;
  } catch {
    return null;
  }
}

/**
 * Schedule a daily morning reminder for today's schedule
 */
export async function scheduleDailyScheduleDigest(
  subjects: Subject[],
  now = new Date()
): Promise<string | null> {
  const currentDayIndex = now.getDay() + 1; // 2 = Monday ... 6 = Friday
  const todayClasses = subjects
    .filter((s) => s.weekday === currentDayIndex)
    .sort((a, b) => a.startMinutes - b.startMinutes);

  if (todayClasses.length === 0) return null;

  const firstClass = todayClasses[0]!;
  const firstHours = Math.floor(firstClass.startMinutes / 60);
  const firstMins = firstClass.startMinutes % 60;
  const firstTimeStr = `${String(firstHours).padStart(2, '0')}:${String(firstMins).padStart(2, '0')}`;

  const reminderDate = new Date(now);
  // Default reminder at 7:30 AM, or 45 mins before first class if starting early
  const reminderMinutes = Math.min(7 * 60 + 30, Math.max(firstClass.startMinutes - 45, 6 * 60));
  reminderDate.setHours(Math.floor(reminderMinutes / 60), reminderMinutes % 60, 0, 0);

  // If the reminder time for today has already passed, return null
  if (reminderDate.getTime() <= now.getTime()) {
    return null;
  }

  const notifId = `daily-schedule-${reminderDate.toISOString().slice(0, 10)}`;
  try {
    await Notifications.scheduleNotificationAsync({
      identifier: notifId,
      content: {
        title: `Dnes máš ${todayClasses.length} ${todayClasses.length === 1 ? 'hodinu' : todayClasses.length < 5 ? 'hodiny' : 'hodin'}`,
        body: `Začínáš v ${firstTimeStr}: ${firstClass.name}${firstClass.location ? ` (${firstClass.location})` : ''}`,
        data: { type: 'daily_schedule' },
        sound: true,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: reminderDate,
        channelId: 'schedule',
      },
    });
    return notifId;
  } catch {
    return null;
  }
}

/**
 * Synchronize all reminders for current semester tasks, exams, and today's schedule.
 * Safely cancels stale notifications and schedules fresh reminders for active items.
 */
export async function syncCurrentSemesterReminders(
  tasks: TaskItem[],
  exams: ExamItem[] = [],
  subjects: Subject[] = []
): Promise<{ scheduledTasks: number; scheduledExams: number; scheduledSchedule: number }> {
  try {
    const isEnabled = await AsyncStorage.getItem(STORAGE_KEY_NOTIF_ENABLED);
    if (isEnabled === 'false') {
      return { scheduledTasks: 0, scheduledExams: 0, scheduledSchedule: 0 };
    }

    // Cancel all previously scheduled reminders to prevent duplicates
    await Notifications.cancelAllScheduledNotificationsAsync();

    // Filter only current semester items
    const currentTasks = filterCurrentSemesterTasks(tasks);
    const currentExams = filterCurrentSemesterExams(exams);

    let scheduledTasks = 0;
    let scheduledExams = 0;
    let scheduledSchedule = 0;

    for (const task of currentTasks) {
      if (!task.isCompleted) {
        const id = await scheduleTaskDeadlineReminder(task);
        if (id) scheduledTasks += 1;
      }
    }

    for (const exam of currentExams) {
      if (!exam.isCompleted) {
        const id = await scheduleExamReminder(exam);
        if (id) scheduledExams += 1;
      }
    }

    if (subjects.length > 0) {
      const scheduleId = await scheduleDailyScheduleDigest(subjects);
      if (scheduleId) scheduledSchedule += 1;
    }

    return { scheduledTasks, scheduledExams, scheduledSchedule };
  } catch {
    return { scheduledTasks: 0, scheduledExams: 0, scheduledSchedule: 0 };
  }
}

/**
 * Triggers an instant local notification for immediate user verification
 */
export async function sendInstantTestNotification(): Promise<boolean> {
  try {
    await setupNotificationChannels();
    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'StudentFlow',
        body: 'Oznámení jsou aktivní.',
        data: { type: 'test' },
        sound: true,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: 1,
        channelId: 'general',
      },
    });
    return true;
  } catch {
    return false;
  }
}

export type NotificationNavigationTarget = {
  tab: 'Rozvrh' | 'Úkoly' | 'Zkouška';
  taskId?: string;
  examId?: string;
};

/**
 * Parses notification response payload and returns the target navigation tab and item ID
 */
export function getNotificationTargetTab(
  response: Notifications.NotificationResponse | null
): 'Rozvrh' | 'Úkoly' | 'Zkouška' | null {
  const target = getNotificationNavigationTarget(response);
  return target ? target.tab : null;
}

/**
 * Detailed navigation payload resolver from notification click
 */
export function getNotificationNavigationTarget(
  response: Notifications.NotificationResponse | null
): NotificationNavigationTarget | null {
  if (!response?.notification?.request?.content?.data) return null;
  const data = response.notification.request.content.data;
  if (data.type === 'task_deadline') {
    return {
      tab: 'Úkoly',
      taskId: typeof data.taskId === 'string' ? data.taskId : undefined,
    };
  }
  if (data.type === 'exam_reminder') {
    return {
      tab: 'Zkouška',
      examId: typeof data.examId === 'string' ? data.examId : undefined,
    };
  }
  if (data.type === 'daily_schedule') {
    return { tab: 'Rozvrh' };
  }
  return null;
}
