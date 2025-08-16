// Lazy import to avoid crashing on clients without native module (e.g., Expo Go)
let _Notifications: any | null = null;
async function getNotifications(): Promise<any | null> {
  if (_Notifications) return _Notifications;
  try {
    const mod = await import('expo-notifications');
    _Notifications = mod;
    return mod;
  } catch {
    return null;
  }
}
import AsyncStorage from '@react-native-async-storage/async-storage';
import Logger from './logger';
import { doc, updateDoc, increment, Timestamp, getDoc } from './firestoreCompat';
import { getAuth } from '@react-native-firebase/auth';
import { db } from '../../firebaseConfig';
import { Task, UserProfile } from '../types';

const SCHEDULED_MAP_KEY = (uid: string) => `dailyflow_notif_scheduled_${uid}`;
const DAILY_REMINDER_KEY = (uid: string) => `dailyflow_notif_daily_${uid}`;

export async function initNotifications() {
  const Notifications = await getNotifications();
  if (!Notifications) return; // unavailable (e.g., Expo Go)
  // Android channel
  try {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Ogólne',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  } catch (e) {
    Logger.debug('setNotificationChannelAsync failed', e);
  }

  // Action categories
  try {
    await Notifications.setNotificationCategoryAsync('TASK_ACTIONS', [
      { identifier: 'DONE', buttonTitle: 'Gotowe' },
      { identifier: 'SNOOZE_15', buttonTitle: 'Drzemka 15m' },
    ]);
  } catch (e) {
    Logger.debug('setNotificationCategoryAsync failed', e);
  }
  // Nie prosimy o uprawnienia automatycznie – użytkownik może to zrobić na ekranie ustawień powiadomień
}

export async function registerNotificationResponseListener() {
  const Notifications = await getNotifications();
  if (!Notifications) return { remove: () => {} } as any;
  return Notifications.addNotificationResponseReceivedListener(async (response: any) => {
    try {
      const actionId = response.actionIdentifier;
      const data = response.notification.request.content.data as any;
      const taskId: string | undefined = data?.taskId;
      if (!taskId) return;
      if (actionId === 'DONE') {
        // Ujednolicenie z logiką w UI: ustaw completed, completedAt, completedBy oraz zwiększ punkty/licznik
        const auth = getAuth();
        const uid = auth.currentUser?.uid;
        let completedBy: string | null = null;
        if (uid) {
          try {
            const userDoc = await getDoc(doc(db, 'users', uid));
            completedBy = (userDoc.data() as any)?.nickname || null;
          } catch {}
        }
        await updateDoc(doc(db, 'tasks', taskId), {
          completed: true,
          completedAt: Timestamp.now(),
          ...(completedBy ? { completedBy } : {}),
        });
        if (uid) {
          try {
            await updateDoc(doc(db, 'users', uid), {
              points: increment(10),
              completedTasksCount: increment(1),
            });
          } catch {}
        }
      } else if (actionId === 'SNOOZE_15') {
        const nextDate = new Date(Date.now() + 15 * 60 * 1000);
        await Notifications.scheduleNotificationAsync({
          content: {
            title: 'Przypomnienie',
            body: data?.text || 'Zadanie',
            categoryIdentifier: 'TASK_ACTIONS',
            data: { taskId },
          },
          trigger: nextDate,
        });
      }
    } catch (e) { Logger.debug('Notification response handler failed', e); }
  });
}

export async function ensureDailyMorningReminderScheduled() {
  const Notifications = await getNotifications();
  if (!Notifications) return;
  const uid = getAuth().currentUser?.uid;
  if (!uid) return;
  const key = DAILY_REMINDER_KEY(uid);
  const stored = await AsyncStorage.getItem(key);
  if (stored) return; // already scheduled once
  const now = new Date();
  const trigger = new Date();
  trigger.setHours(9, 0, 0, 0);
  if (trigger.getTime() < now.getTime()) trigger.setDate(trigger.getDate() + 1);
  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'DailyFlow – poranne podsumowanie',
        body: 'Sprawdź dzisiejsze zadania i zaplanuj dzień.',
      },
      trigger: { hour: 9, minute: 0, repeats: true },
    });
    await AsyncStorage.setItem(key, '1');
  } catch {}
}

export async function scheduleTaskNotifications(tasks: Task[], userProfile: UserProfile | null) {
  const Notifications = await getNotifications();
  if (!Notifications) return;
  const uid = getAuth().currentUser?.uid;
  if (!uid) return;
  let map: Record<string, string> = {};
  try {
    const raw = await AsyncStorage.getItem(SCHEDULED_MAP_KEY(uid));
    if (raw) map = JSON.parse(raw);
  } catch {}

  const now = Date.now();
  const oneDayMs = 24 * 60 * 60 * 1000;
  const dueSoon = tasks.filter(t => !!t.deadline && !t.completed);
  for (const t of dueSoon) {
    const deadline = t.deadline!.toDate();
    // Notify 1 hour before or at 9:00 if no time part (00:00)
    let triggerDate: Date;
    if (deadline.getHours() === 0 && deadline.getMinutes() === 0) {
      triggerDate = new Date(deadline);
      triggerDate.setHours(9, 0, 0, 0);
    } else {
      triggerDate = new Date(deadline.getTime() - 60 * 60 * 1000);
    }
    if (triggerDate.getTime() < now) continue; // do not schedule past notifications

    const key = `${t.id}_${deadline.getTime()}`;
    if (map[key]) continue; // already scheduled for this deadline
    try {
      const id = await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Zbliża się termin',
          body: t.text,
          categoryIdentifier: 'TASK_ACTIONS',
          data: { taskId: t.id, text: t.text },
        },
        trigger: triggerDate,
      });
      map[key] = id;
    } catch {}
  }
  try { await AsyncStorage.setItem(SCHEDULED_MAP_KEY(uid), JSON.stringify(map)); } catch {}
}


