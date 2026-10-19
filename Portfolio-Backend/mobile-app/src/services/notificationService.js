import { Platform } from 'react-native';
import { api } from '../api/client';
import * as Notifications from 'expo-notifications';

// Configure notification behavior on native mobile
if (Platform.OS !== 'web') {
  try {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
      }),
    });
  } catch (e) {
    console.log('[NotificationService] setNotificationHandler error:', e);
  }
}

class NotificationService {
  constructor() {
    this.listeners = new Set();
    this.intervalId = null;
    this.hasPermission = false;
    this.deliveredKeys = new Set();
    this.initNativeChannel();
  }

  // Setup Android notification channel for native APK
  async initNativeChannel() {
    if (Platform.OS === 'android') {
      try {
        await Notifications.setNotificationChannelAsync('calendar-reminders', {
          name: 'Event & Meal Reminders',
          description: 'High-priority notifications for calendar events and diet plan alarms',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 300, 200, 300],
          lightColor: '#7e37d8',
          enableLights: true,
          enableVibrate: true,
          sound: 'default',
          lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
          bypassDnd: true,
        });
      } catch (e) {
        console.log('[NotificationService] Android channel error:', e);
      }
    }
  }

  // Request notification permissions across Web and Native Mobile
  async requestPermission() {
    // 1. Native Mobile (Expo Android / iOS)
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

    // 2. Web Browser
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

  // Schedule a local notification on the mobile device or web timer
  async scheduleLocalReminder(title, body, scheduledDate, eventData = {}) {
    if (!scheduledDate) return null;

    const targetDateObj = new Date(scheduledDate);
    const targetTime = targetDateObj.getTime();
    const now = Date.now();
    const diffSeconds = Math.round((targetTime - now) / 1000);

    if (diffSeconds <= 0) return null;

    // Mobile native scheduling via expo-notifications
    if (Platform.OS !== 'web') {
      try {
        await this.initNativeChannel();
        const notifId = await Notifications.scheduleNotificationAsync({
          content: {
            title,
            body,
            data: { eventId: eventData._id || '' },
            sound: 'default',
            priority: Notifications.AndroidNotificationPriority.MAX,
            vibrate: [0, 300, 200, 300],
            channelId: 'calendar-reminders',
          },
          trigger: targetDateObj,
        });
        return notifId;
      } catch (e) {
        console.log('[NotificationService] Mobile schedule error:', e);
      }
    }

    return null;
  }

  // Cancel scheduled native notification
  async cancelNotification(notificationId) {
    if (Platform.OS !== 'web' && notificationId) {
      try {
        await Notifications.cancelScheduledNotificationAsync(notificationId);
      } catch (e) {}
    }
  }

  // Register listener for in-app alert toasts
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

  // Deliver an immediate notification (Web + Mobile + In-App)
  async showNotification(title, body, eventData = {}) {
    // 1. Mobile Native Immediate Notification
    if (Platform.OS !== 'web') {
      try {
        await Notifications.scheduleNotificationAsync({
          content: {
            title,
            body,
            data: { eventId: eventData?._id || '' },
            sound: true,
          },
          trigger: null, // triggers immediately
        });
      } catch (e) {}
    }

    // 2. Web OS Notification
    if (
      Platform.OS === 'web' &&
      typeof window !== 'undefined' &&
      'Notification' in window &&
      window.Notification.permission === 'granted'
    ) {
      try {
        new window.Notification(title, {
          body,
          icon: '/favicon.ico',
        });
      } catch (e) {}
    }

    // 3. In-App Notification Dispatch
    this.notifyListeners({
      title,
      body,
      event: eventData,
      time: new Date(),
    });
  }

  // Start polling watcher for due reminders
  startReminderWatcher() {
    if (this.intervalId) return;

    this.checkDueReminders();

    // Check every 30 seconds
    this.intervalId = setInterval(() => {
      this.checkDueReminders();
    }, 30000);
  }

  stopReminderWatcher() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  async checkDueReminders() {
    try {
      const logs = await api.getUpcomingReminders();
      if (!Array.isArray(logs)) return;

      const now = Date.now();

      for (const log of logs) {
        if (log.status !== 'pending') continue;

        const scheduledTime = new Date(log.scheduledFor).getTime();
        // If scheduled within the last 15 minutes up to next 1 minute
        if (scheduledTime <= now + 60000 && !this.deliveredKeys.has(log.deduplicationKey)) {
          this.deliveredKeys.add(log.deduplicationKey);
          await this.showNotification(log.title, log.body, log.eventId);

          // Mark as delivered on server
          api.dismissReminder(log._id).catch(() => {});
        }
      }
    } catch (e) {
      // Ignore background fetch failure
    }
  }
}

export const notificationService = new NotificationService();
