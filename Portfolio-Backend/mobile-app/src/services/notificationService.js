import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';

// Configure foreground notification presentation behavior
if (Platform.OS !== 'web') {
  try {
    Notifications.setNotificationHandler({
      handleNotification: async (notification) => {
        const isAlarm = notification?.request?.content?.data?.isAlarm;
        return {
          shouldShowAlert: true,
          shouldPlaySound: true,
          shouldSetBadge: true,
          priority: isAlarm ? Notifications.AndroidNotificationPriority.MAX : Notifications.AndroidNotificationPriority.HIGH,
        };
      },
    });
  } catch (e) {
    console.log('[NotificationService] setNotificationHandler error:', e);
  }
}

class NotificationService {
  constructor() {
    this.listeners = new Set();
    this.hasPermission = false;
    this.initNativeChannels();
  }

  // Setup Android notification channels for both loud alarms and standard reminders
  async initNativeChannels() {
    if (Platform.OS === 'android') {
      try {
        // 1. High-priority Loud Alarm Channel (Bypasses DND, max urgency)
        await Notifications.setNotificationChannelAsync('calendar-alarms', {
          name: 'Scheduled Alarms & Rings',
          description: 'Loud alarms for starting calendar events and diet routines',
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

  // Request permissions across Native Mobile and Web
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

  // Direct schedule into Native OS AlarmManager (works 100% offline!)
  async scheduleLocalReminder(title, body, scheduledDate, eventData = {}, offsetMinutes = 0) {
    if (!scheduledDate) return null;

    const targetDateObj = new Date(scheduledDate);
    const diffSeconds = Math.round((targetDateObj.getTime() - Date.now()) / 1000);
    if (diffSeconds <= 0) return null;

    if (Platform.OS !== 'web') {
      try {
        await this.initNativeChannels();
        const isAlarm = offsetMinutes === 0;
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
          trigger: targetDateObj,
        });
        return notifId;
      } catch (e) {
        console.log('[NotificationService] Native schedule error:', e);
      }
    }

    return null;
  }

  async cancelNotification(notificationId) {
    if (Platform.OS !== 'web' && notificationId) {
      try {
        await Notifications.cancelScheduledNotificationAsync(notificationId);
      } catch (e) {}
    }
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

  // Display immediate notification (e.g. for testing or instantaneous alerts)
  async showNotification(title, body, eventData = {}) {
    if (Platform.OS !== 'web') {
      try {
        await Notifications.scheduleNotificationAsync({
          content: {
            title,
            body,
            data: { eventId: eventData?.client_id || eventData?._id || '' },
            sound: true,
          },
          trigger: null,
        });
      } catch (e) {}
    }

    this.notifyListeners({
      title,
      body,
      event: eventData,
      time: new Date(),
    });
  }
}

export const notificationService = new NotificationService();
export default notificationService;
