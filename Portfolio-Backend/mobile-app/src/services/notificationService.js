import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';

// Configure foreground notification presentation behavior for native apps
if (Platform.OS !== 'web') {
  try {
    Notifications.setNotificationHandler({
      handleNotification: async (notification) => {
        const isAlarm = notification?.request?.content?.data?.isAlarm;
        return {
          shouldShowAlert: true,
          shouldPlaySound: true,
          shouldSetBadge: true,
          priority: isAlarm
            ? Notifications.AndroidNotificationPriority.MAX
            : Notifications.AndroidNotificationPriority.HIGH,
        };
      },
    });
  } catch (e) {
    console.log('[NotificationService] setNotificationHandler error:', e);
  }
}

/**
 * Synthesizes an offline alarm chime / chime sequence using Web Audio API.
 * Works 100% offline without any audio file download.
 */
export function playAlarmSound(isLoudAlarm = true) {
  if (typeof window === 'undefined') return;
  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    const chords = isLoudAlarm
      ? [523.25, 659.25, 783.99, 1046.5, 783.99, 1046.5] // C5, E5, G5, C6 chime
      : [523.25, 659.25, 783.99]; // Gentle 3-note chime

    chords.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = isLoudAlarm ? 'triangle' : 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.16);

      const startTime = ctx.currentTime + idx * 0.16;
      gain.gain.setValueAtTime(0.25, startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.45);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(startTime);
      osc.stop(startTime + 0.5);
    });
  } catch (err) {
    console.warn('[playAlarmSound exception]', err.message);
  }
}

class NotificationService {
  constructor() {
    this.listeners = new Set();
    this.hasPermission = false;
    this.webTimers = new Map();
    this.initNativeChannels();
  }

  playAlarmChime(isLoudAlarm = true) {
    playAlarmSound(isLoudAlarm);
  }

  // Setup Android notification channels for both loud alarms and standard reminders
  async initNativeChannels() {
    if (Platform.OS === 'android') {
      try {
        // 1. High-priority Loud Alarm Channel (Bypasses DND, max urgency)
        await Notifications.setNotificationChannelAsync('calendar-alarms', {
          name: 'Scheduled Alarms & Rings',
          description: 'Loud alarms for starting calendar events and routines',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 500, 250, 500, 250, 1000],
          sound: 'default',
          enableLights: true,
          lightColor: '#7e37d8',
          enableVibrate: true,
          bypassDnd: true,
          lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
          audioAttributes: {
            usage: Notifications.AndroidAudioUsage.ALARM,
            contentType: Notifications.AndroidAudioContentType.SONIFICATION,
          },
        });

        // 2. Standard Event Reminders Channel (15m, 1h notice)
        await Notifications.setNotificationChannelAsync('calendar-reminders', {
          name: 'Advance Reminders',
          description: 'Advance notices for upcoming events',
          importance: Notifications.AndroidImportance.HIGH,
          vibrationPattern: [0, 250, 250, 250],
          sound: 'default',
          enableVibrate: true,
          lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
        });
      } catch (e) {
        console.log('[NotificationService] Android channel setup error:', e);
      }
    }
  }

  // Silently check if permission is already granted without prompting
  async checkPermissionStatus() {
    if (Platform.OS !== 'web') {
      try {
        const { status } = await Notifications.getPermissionsAsync();
        this.hasPermission = status === 'granted';
        return this.hasPermission;
      } catch (err) {
        return false;
      }
    }

    if (Platform.OS === 'web' && typeof window !== 'undefined' && 'Notification' in window) {
      this.hasPermission = window.Notification.permission === 'granted';
      return this.hasPermission;
    }

    return false;
  }

  // Request permissions across Native Mobile and Web (Triggered via user gesture)
  async requestPermission() {
    if (Platform.OS !== 'web') {
      try {
        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;
        if (existingStatus !== 'granted') {
          const { status } = await Notifications.requestPermissionsAsync({
            ios: {
              allowAlert: true,
              allowBadge: true,
              allowSound: true,
            },
          });
          finalStatus = status;
        }
        this.hasPermission = finalStatus === 'granted';
        return this.hasPermission;
      } catch (err) {
        console.log('[NotificationService] Mobile permission error:', err);
      }
    }

    if (Platform.OS === 'web' && typeof window !== 'undefined' && 'Notification' in window) {
      try {
        const permission = await window.Notification.requestPermission();
        this.hasPermission = permission === 'granted';
        return this.hasPermission;
      } catch (err) {
        console.log('[NotificationService] Web permission error:', err);
      }
    }
    return false;
  }

  // Schedule an alarm/reminder on native OS or active Web scheduler (100% offline)
  async scheduleLocalReminder(title, body, scheduledDate, eventData = {}, offsetMinutes = 0, onTriggerCallback = null) {
    if (!scheduledDate) return null;

    const targetDateObj = new Date(scheduledDate);
    const diffMs = targetDateObj.getTime() - Date.now();
    const diffSeconds = Math.max(1, Math.round(diffMs / 1000));
    if (diffMs < -60000) return null; // Trigger is in the past (> 1 min ago)

    const isAlarm = offsetMinutes === 0;

    // Platform 1: Native iOS / Android Native AlarmManager
    if (Platform.OS !== 'web') {
      try {
        await this.initNativeChannels();
        const channelId = isAlarm ? 'calendar-alarms' : 'calendar-reminders';

        const notifId = await Notifications.scheduleNotificationAsync({
          content: {
            title,
            body,
            data: {
              clientEventId: eventData.client_id || eventData._id || '',
              offsetMinutes,
              isAlarm,
            },
            sound: 'default',
            priority: isAlarm
              ? Notifications.AndroidNotificationPriority.MAX
              : Notifications.AndroidNotificationPriority.HIGH,
            vibrate: isAlarm ? [0, 500, 250, 500, 250, 1000] : [0, 250, 250, 250],
            channelId,
          },
          trigger: {
            date: targetDateObj,
          },
        });
        return notifId;
      } catch (e) {
        console.log('[NotificationService] Native schedule error:', e);
      }
    }

    // Platform 2: Web / Browser offline alarm & notification scheduler
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const timerKey = `${eventData.client_id || eventData._id || 'evt'}_${offsetMinutes}`;
      if (this.webTimers.has(timerKey)) {
        clearTimeout(this.webTimers.get(timerKey));
      }

      // If scheduled time is within next 24 hours, set exact timer
      if (diffMs > 0 && diffMs < 24 * 60 * 60 * 1000) {
        const timerId = setTimeout(async () => {
          this.webTimers.delete(timerKey);
          await this.showSystemNotification(title, body, eventData, isAlarm);
          if (onTriggerCallback) {
            try {
              await onTriggerCallback();
            } catch (cbErr) {}
          }
        }, diffMs);

        this.webTimers.set(timerKey, timerId);
        return timerKey;
      }
    }

    return null;
  }

  async cancelNotification(notificationId) {
    if (!notificationId) return;

    if (Platform.OS !== 'web') {
      try {
        await Notifications.cancelScheduledNotificationAsync(notificationId);
      } catch (e) {}
    } else if (Platform.OS === 'web') {
      if (this.webTimers.has(notificationId)) {
        clearTimeout(this.webTimers.get(notificationId));
        this.webTimers.delete(notificationId);
      }
    }
  }

  // Display instantaneous or due notification with system popup & audible alarm
  async showSystemNotification(title, body, eventData = {}, isAlarm = true) {
    // 1. Play audible sound chime (works offline)
    playAlarmSound(isAlarm);

    // 2. Native push
    if (Platform.OS !== 'web') {
      try {
        await Notifications.scheduleNotificationAsync({
          content: {
            title,
            body,
            data: { eventId: eventData?.client_id || eventData?._id || '' },
            sound: 'default',
          },
          trigger: null,
        });
      } catch (e) {}
    }

    // 3. Web Notification API
    if (Platform.OS === 'web' && typeof window !== 'undefined' && 'Notification' in window) {
      try {
        if (window.Notification.permission === 'granted') {
          new window.Notification(title, {
            body,
            icon: '/favicon.ico',
            tag: eventData?.client_id || eventData?._id || undefined,
            requireInteraction: isAlarm,
          });
        }
      } catch (e) {
        console.warn('[Web Notification Error]', e.message);
      }
    }

    // 4. In-App listener toast/alert
    this.notifyListeners({
      title,
      body,
      event: eventData,
      time: new Date(),
      isAlarm,
    });
  }

  // In-App Toast & Alert Dispatcher
  addListener(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  notifyListeners(reminder) {
    this.listeners.forEach((callback) => {
      try {
        callback(reminder);
      } catch (e) {
        console.error(e);
      }
    });
  }
}

export const notificationService = new NotificationService();
export default notificationService;
