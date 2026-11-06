import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { CalendarDao } from '../db/dao/CalendarDao';
import { ReminderDao } from '../db/dao/ReminderDao';
import { notificationService } from './notificationService';

let isReconciling = false;
let watchdogInterval = null;
let watchdogInitialized = false;

/**
 * Checks SQLite for any reminders that have reached their trigger time
 * but haven't been marked delivered yet.
 * Fires audio chime and system notification, then marks delivered in SQLite.
 */
export const checkDueReminders = async () => {
  try {
    const dueReminders = await ReminderDao.getDueUnDeliveredReminders();
    if (!dueReminders || dueReminders.length === 0) return;

    for (const rem of dueReminders) {
      const isAlarm = rem.offset_minutes === 0;
      const eventTitle = rem.event_title || 'Calendar Event';
      const title = isAlarm
        ? `⏰ Alarm: ${eventTitle}`
        : `🔔 Reminder: ${eventTitle}`;
      const body = isAlarm
        ? `Starting right now!`
        : `Starts in ${rem.offset_minutes} minutes`;

      await notificationService.showSystemNotification(
        title,
        body,
        {
          client_id: rem.client_id,
          event_client_id: rem.event_client_id,
          title: eventTitle,
        },
        isAlarm
      );

      await ReminderDao.markDelivered(rem.client_id);
    }
  } catch (err) {
    console.warn('[Alarm Watchdog Check Error]', err.message);
  }
};

/**
 * Start recurring watchdog interval on Web and browser environments.
 * Checks every 10 seconds for any due reminders, even across background tabs.
 */
export const startAlarmWatchdog = () => {
  if (watchdogInitialized) return;
  watchdogInitialized = true;

  if (typeof window !== 'undefined') {
    // Initial check
    setTimeout(() => {
      checkDueReminders().catch(() => {});
    }, 1500);

    // 10s watchdog interval
    if (!watchdogInterval) {
      watchdogInterval = setInterval(() => {
        checkDueReminders().catch(() => {});
      }, 10000);
    }

    // Tab visibility & focus hooks
    if (typeof document !== 'undefined' && document.addEventListener) {
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
          checkDueReminders().catch(() => {});
        }
      });
    }

    if (window.addEventListener) {
      window.addEventListener('focus', () => {
        checkDueReminders().catch(() => {});
      });
    }
  }
};

/**
 * Local Alarm Reconciliation Engine.
 * Scans upcoming calendar events in local SQLite and registers them
 * directly with native OS AlarmManager (Native) or in-memory exact scheduler & watchdog (Web).
 * Guaranteed to operate 100% offline with ZERO internet calls.
 */
export const reconcileAlarms = async () => {
  if (isReconciling) return;
  isReconciling = true;

  try {
    const now = Date.now();
    const horizon30Days = now + 30 * 24 * 60 * 60 * 1000;
    const nowIso = new Date(now).toISOString();
    const horizonIso = new Date(horizon30Days).toISOString();

    // ==========================================
    // PLATFORM: WEB (Browser & PWA)
    // ==========================================
    if (Platform.OS === 'web') {
      // Ensure watchdog is active
      startAlarmWatchdog();

      // 1. Fetch upcoming active reminders from SQLite
      const upcomingReminders = await ReminderDao.getUpcomingActiveReminders(100);

      // 2. Schedule in-memory exact timers for anything in the next 24h
      for (const rem of upcomingReminders) {
        if (!rem.scheduled_trigger_time || !rem.is_enabled) continue;
        const triggerTimeMs = new Date(rem.scheduled_trigger_time).getTime();
        const diffMs = triggerTimeMs - Date.now();

        if (diffMs > 0 && diffMs <= 24 * 60 * 60 * 1000) {
          const isAlarm = rem.offset_minutes === 0;
          const eventTitle = rem.event_title || 'Calendar Event';
          const title = isAlarm ? `⏰ Alarm: ${eventTitle}` : `🔔 Reminder: ${eventTitle}`;
          const body = isAlarm ? `Starting right now!` : `Starts in ${rem.offset_minutes} minutes`;

          await notificationService.scheduleLocalReminder(
            title,
            body,
            rem.scheduled_trigger_time,
            { client_id: rem.client_id, event_client_id: rem.event_client_id, title: eventTitle },
            rem.offset_minutes,
            async () => {
              await ReminderDao.markDelivered(rem.client_id);
            }
          );
        }
      }

      // 3. Immediately catch any due undelivered reminders
      await checkDueReminders();
      return;
    }

    // ==========================================
    // PLATFORM: NATIVE (iOS / Android AlarmManager)
    // ==========================================
    await notificationService.initNativeChannels();

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
        if (!rem.is_enabled || rem.is_delivered) continue;

        const offsetMs = (rem.offset_minutes || 0) * 60 * 1000;
        const triggerTimeMs = eventStartTime - offsetMs;

        // Skip triggers in the past (> 30s ago)
        if (triggerTimeMs <= now - 30000) continue;

        const dedupKey = `${event.client_id}_${rem.offset_minutes}`;
        activeReminderKeys.add(dedupKey);

        // If not already registered in OS AlarmManager, schedule it now
        if (!existingNotifMap.has(dedupKey)) {
          const isAlarm = rem.offset_minutes === 0;
          const channelId = isAlarm ? 'calendar-alarms' : 'calendar-reminders';
          const triggerDate = new Date(Math.max(Date.now() + 1000, triggerTimeMs));

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
              trigger: {
                date: triggerDate,
              },
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
