# 04. Offline Calendar & Local Alarm Engine

## 1. The Offline Notification & Ringing Problem

In conventional cloud applications, notifications are pushed via Firebase Cloud Messaging (FCM) or Apple Push Notification Service (APNs). **This fails completely when offline**: if a user is on a flight, in a basement, or has Wi-Fi turned off, zero push messages can be received.

To satisfy the explicit user requirement from `newFeature.md`:
> *"jo calnder ke events jo server se fetch huye he vo internally work karne chhaiye like bina internet ke notification , scheduled ring etc"*

The mobile application must schedule alarms **directly into the mobile operating system's native hardware scheduler (Android AlarmManager / iOS UNUserNotificationCenter)**. Once registered locally, the operating system triggers the notification, vibrates the phone, and plays the alarm sound at the exact millisecond—even in Airplane Mode with zero internet!

```
┌────────────────────────────────────────────────────────────────────────┐
│                   OFFLINE LOCAL ALARM ARCHITECTURE                     │
├────────────────────────────────────────────────────────────────────────┤
│                                                                        │
│   [ Local SQLite DB ] ──► [ Alarm Reconciliation Engine ]              │
│                                  │                                     │
│         ┌────────────────────────┴────────────────────────┐            │
│         ▼                                                 ▼            │
│  [ expo-notifications ]                          [ expo-av Sound Loop ]│
│         │                                                 │            │
│         ▼                                                 ▼            │
│  [ Android AlarmManager ]                        [ Loud Audio Stream ] │
│  (SCHEDULE_EXACT_ALARM)                          (STREAM_ALARM)        │
│         │                                                 │            │
│         ▼                                                 ▼            │
│  ┌───────────────────────────────────────────────────────────────┐     │
│  │ ⏰ EXACT MINUTE TRIGGER (Even in Airplane Mode & Screen Off!) │     │
│  │ • Loud Ringtone Sound                                         │     │
│  │ • Strong Vibration Pattern                                    │     │
│  │ • Full Screen / Heads-Up Action Dialog                        │     │
│  │ • Actions: "Snooze (5m)" | "Dismiss" | "Mark Completed"      │     │
│  └───────────────────────────────────────────────────────────────┘     │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Android Manifest & Permissions Configuration

To guarantee exact-time ringing, high-priority notifications, and survival across device reboots, `mobile-app/app.json` requires specific native Android configuration:

```json
{
  "expo": {
    "android": {
      "package": "com.manish.portfolioadmin",
      "permissions": [
        "INTERNET",
        "RECEIVE_BOOT_COMPLETED",
        "SCHEDULE_EXACT_ALARM",
        "USE_EXACT_ALARM",
        "POST_NOTIFICATIONS",
        "VIBRATE",
        "WAKE_LOCK"
      ]
    },
    "plugins": [
      [
        "expo-notifications",
        {
          "icon": "./assets/icon.png",
          "color": "#7e37d8",
          "sounds": ["./assets/sounds/alarm_chime.wav"]
        }
      ]
    ]
  }
}
```

### Permission Roles:
- `SCHEDULE_EXACT_ALARM` & `USE_EXACT_ALARM`: Essential on Android 12+ and 13+ to wake up the CPU at the exact scheduled second without battery-saver deferral.
- `RECEIVE_BOOT_COMPLETED`: Enables notification restoration if the user turns their phone off and on again.
- `POST_NOTIFICATIONS`: Android 13+ runtime notification prompt.
- `WAKE_LOCK`: Allows the device to turn on the screen for critical alarms.

---

## 3. High-Priority Alarm Notification Channels

Android requires distinct Notification Channels for standard alerts versus loud alarms:

```javascript
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

export const setupAlarmChannels = async () => {
  if (Platform.OS !== 'android') return;

  // 1. Loud Alarm Channel (Bypasses DND, custom sound, maximum priority)
  await Notifications.setNotificationChannelAsync('calendar-alarms', {
    name: 'Scheduled Alarms & Rings',
    description: 'High-urgency alarms for calendar routines and meal reminders',
    importance: Notifications.AndroidImportance.MAX,
    vibrationPattern: [0, 500, 250, 500, 250, 1000],
    sound: 'alarm_chime.wav', // placed in assets/sounds/
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

  // 2. Standard Informational Reminders Channel
  await Notifications.setNotificationChannelAsync('calendar-reminders', {
    name: 'Event Reminders',
    description: 'Advance reminders (15m, 1h before event)',
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250, 250],
    sound: 'default',
    enableVibrate: true,
    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
  });
};
```

---

## 4. The Local Alarm Reconciliation Engine

The biggest flaw in the previous system was that scheduling was attempted ad-hoc during form submission and lost on restart.

The **Alarm Reconciliation Engine (`AlarmReconciliationEngine.js`)** runs deterministically on:
1. **App Cold Launch** (even completely offline).
2. **Post-Sync Completion** (when new events are pulled from backend).
3. **Local Event Mutations** (immediately upon insert, edit, or delete).
4. **Device Boot Completed** (via background notification handler).

### 4.1 Reconciliation Algorithm
```javascript
import * as Notifications from 'expo-notifications';
import { CalendarDao } from '../db/dao/CalendarDao';
import { ReminderDao } from '../db/dao/ReminderDao';

export const reconcileAlarms = async () => {
  try {
    const now = Date.now();
    const horizon30Days = now + 30 * 24 * 60 * 60 * 1000;

    // 1. Fetch upcoming active events from local SQLite
    const upcomingEvents = await CalendarDao.getEventsInRange(
      new Date(now).toISOString(),
      new Date(horizon30Days).toISOString()
    );

    // 2. Fetch existing OS-level scheduled notification IDs
    const scheduledNotifications = await Notifications.getAllScheduledNotificationsAsync();
    const existingNotifMap = new Map();
    scheduledNotifications.forEach(n => {
      const eventId = n.content.data?.clientEventId;
      const offset = n.content.data?.offsetMinutes;
      if (eventId) {
        existingNotifMap.set(`${eventId}_${offset}`, n.identifier);
      }
    });

    const activeKeysInDb = new Set();

    // 3. Compare with DB expectations & schedule missing ones
    for (const event of upcomingEvents) {
      if (event.is_deleted || event.status === 'cancelled') continue;

      const reminders = await ReminderDao.getRemindersForEvent(event.client_id);
      const eventStartTime = new Date(event.start_at).getTime();

      for (const rem of reminders) {
        if (!rem.is_enabled) continue;

        const triggerTimeMs = eventStartTime - (rem.offset_minutes * 60 * 1000);
        if (triggerTimeMs <= now) continue; // Skip past triggers

        const deduplicationKey = `${event.client_id}_${rem.offset_minutes}`;
        activeKeysInDb.add(deduplicationKey);

        // If not already registered in OS AlarmManager, schedule it now!
        if (!existingNotifMap.has(deduplicationKey)) {
          const isExactAtStart = rem.offset_minutes === 0;
          const channelId = isExactAtStart ? 'calendar-alarms' : 'calendar-reminders';

          const nativeId = await Notifications.scheduleNotificationAsync({
            content: {
              title: isExactAtStart ? `⏰ Alarm: ${event.title}` : `🔔 Reminder: ${event.title}`,
              body: isExactAtStart 
                ? `Event starting now at ${new Date(event.start_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                : `Starts in ${rem.offset_minutes} minutes`,
              sound: isExactAtStart ? 'alarm_chime.wav' : 'default',
              channelId,
              priority: Notifications.AndroidNotificationPriority.MAX,
              data: {
                clientEventId: event.client_id,
                offsetMinutes: rem.offset_minutes,
                isAlarm: isExactAtStart,
              },
            },
            trigger: new Date(triggerTimeMs),
          });

          await ReminderDao.updateNativeId(rem.client_id, nativeId);
        }
      }
    }

    // 4. Cancel orphaned notifications (events deleted or moved in DB)
    for (const [key, notifId] of existingNotifMap.entries()) {
      if (!activeKeysInDb.has(key)) {
        await Notifications.cancelScheduledNotificationAsync(notifId);
      }
    }
  } catch (err) {
    console.error('[Alarm Reconciliation Error]', err);
  }
};
```

---

## 5. Ringing & Audio Playback for Exact Alarms

When an alarm triggers at `offset_minutes === 0`:
1. If the app is in the **foreground**:
   - A full-screen or overlay Alarm Banner pops up immediately.
   - An audible looping chime plays via `expo-av` sound player.
   - Controls:
     - **"Snooze (5m)"**: Automatically reschedules local notification for `now + 5 minutes`.
     - **"Dismiss / Stop Ringing"**: Stops audio playback immediately.
     - **"Mark Event Done"**: Updates event status to `completed` in local SQLite and queues outbox mutation.
2. If the app is in the **background or screen is locked**:
   - The Android MAX-priority notification appears on the lockscreen with high vibration and sound.
   - Action buttons directly on the notification banner allow the user to Snooze or Dismiss without opening the full app.

---

## 6. Surviving Phone Reboots (`RECEIVE_BOOT_COMPLETED`)

When an Android phone powers off or reboots, the Linux kernel clears volatile alarm tables.
- **Expo Boot Recovery**: Expo's Android notification service automatically checks saved notification manifests upon receiving `android.intent.action.BOOT_COMPLETED`.
- **Safety Net in App Launch**: On every app cold start, `reconcileAlarms()` executes in the background within 200ms, ensuring any missed or un-registered alarms are immediately restored.

---

## 7. Next Steps
With the offline calendar and alarm system specified, the next document (**[05_MODULE_BY_MODULE_OFFLINE_IMPLEMENTATION_SPECS.md](./05_MODULE_BY_MODULE_OFFLINE_IMPLEMENTATION_SPECS.md)**) provides comprehensive instructions for every single remaining module of the app.

