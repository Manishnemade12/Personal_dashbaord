import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { CalendarDao } from '../db/dao/CalendarDao';
import { ReminderDao } from '../db/dao/ReminderDao';
import { notificationService } from './notificationService';

let isReconciling = false;

/**
 * Local Alarm Reconciliation Engine.
 * Scans upcoming calendar events in local SQLite and registers them
 * directly with the device's native OS AlarmManager (expo-notifications).
 * Guaranteed to operate 100% offline with ZERO internet calls.
 */
export const reconcileAlarms = async () => {
  if (Platform.OS === 'web') return;
  if (isReconciling) return;

  isReconciling = true;
  try {
    await notificationService.initNativeChannels();

    const now = Date.now();
    const horizon30Days = now + 30 * 24 * 60 * 60 * 1000;
    const nowIso = new Date(now).toISOString();
    const horizonIso = new Date(horizon30Days).toISOString();

    // 1. Fetch upcoming active events from local SQLite
    const upcomingEvents = await CalendarDao.getEventsInRange(nowIso, horizonIso);

    // 2. Fetch all scheduled notifications from the native operating system
    const scheduledNotifications = await Notifications.getAllScheduledNotificationsAsync();
    const existingNotifMap = new Map();

    scheduledNotifications.forEach((n) => {
      const clientEventId = n.content?.data?.clientEventId;
      const offsetMinutes = n.content?.data?.offsetMinutes;
      if (clientEventId !== undefined && offsetMinutes !== undefined) {
        existingNotifMap.set(`${clientEventId}_${offsetMinutes}`, n.identifier);
      }
    });

    const activeReminderKeys = new Set();

    // 3. Reconcile SQLite expectations against native OS schedules
    for (const event of upcomingEvents) {
      if (event.isDeleted || event.status === 'cancelled') continue;

      const reminders = await ReminderDao.getRemindersForEvent(event.client_id);
      const eventStartTime = new Date(event.startAt).getTime();

      for (const rem of reminders) {
        if (!rem.is_enabled) continue;

        const offsetMs = (rem.offset_minutes || 0) * 60 * 1000;
        const triggerTimeMs = eventStartTime - offsetMs;

        // Skip triggers in the past
        if (triggerTimeMs <= now) continue;

        const dedupKey = `${event.client_id}_${rem.offset_minutes}`;
        activeReminderKeys.add(dedupKey);

        // If not already registered in OS AlarmManager, schedule it now
        if (!existingNotifMap.has(dedupKey)) {
          const isAlarm = rem.offset_minutes === 0;
          const channelId = isAlarm ? 'calendar-alarms' : 'calendar-reminders';
          const triggerDate = new Date(triggerTimeMs);

          const title = isAlarm
            ? `⏰ Alarm: ${event.title}`
            : `🔔 Reminder: ${event.title}`;

          const startTimeStr = new Date(event.startAt).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          });

          const body = isAlarm
            ? `Starting now at ${startTimeStr}`
            : `Starts in ${rem.offset_minutes} minutes (${startTimeStr})`;

          try {
            const nativeId = await Notifications.scheduleNotificationAsync({
              content: {
                title,
                body,
                sound: 'default',
                priority: isAlarm
                  ? Notifications.AndroidNotificationPriority.MAX
                  : Notifications.AndroidNotificationPriority.HIGH,
                channelId,
                vibrate: isAlarm ? [0, 500, 250, 500, 250, 1000] : [0, 250, 250, 250],
                data: {
                  clientEventId: event.client_id,
                  offsetMinutes: rem.offset_minutes,
                  isAlarm,
                },
              },
              trigger: triggerDate,
            });

            await ReminderDao.updateNativeNotificationId(rem.client_id, nativeId);
          } catch (schedErr) {
            console.warn('[Alarm Reconciliation] Schedule failed:', schedErr.message);
          }
        }
      }
    }

    // 4. Cancel orphaned notifications (events deleted, moved, or cancelled)
    for (const [key, notifId] of existingNotifMap.entries()) {
      if (!activeReminderKeys.has(key)) {
        try {
          await Notifications.cancelScheduledNotificationAsync(notifId);
        } catch (cancelErr) {
          console.warn('[Alarm Reconciliation] Cancel failed:', cancelErr.message);
        }
      }
    }
  } catch (err) {
    console.error('[Alarm Reconciliation Error]', err);
  } finally {
    isReconciling = false;
  }
};

export default reconcileAlarms;

