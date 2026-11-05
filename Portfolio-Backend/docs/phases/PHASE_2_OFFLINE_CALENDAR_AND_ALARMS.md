# Phase 2: Offline Calendar & Local Alarm Engine

## Goal
Enable 100% offline calendar event management and guarantee that scheduled reminders and alarms trigger with sound and vibration at the exact minute directly from the mobile operating system without any active internet connection.

## Tasks
- [ ] Configure Android high-importance notification channels (`calendar-alarms` and `calendar-reminders`).
- [ ] Remove vulnerable 30-second HTTP polling loop (`api.getUpcomingReminders()`) from `src/services/notificationService.js`.
- [ ] Implement `src/services/alarmReconciliationEngine.js`:
  - Scans local SQLite for upcoming active events within the next 30 days.
  - Reconciles existing OS scheduled notification IDs.
  - Registers missing triggers via `Notifications.scheduleNotificationAsync`.
  - Cancels orphaned triggers for deleted/modified events.
- [ ] Wire `CalendarScreen.js`:
  - Instant loading from local SQLite (`CalendarDao.getEventsInRange`).
  - Optimistic save: instant write to SQLite + immediate alarm reconciliation + outbox enqueue.
  - Soft-delete locally with trigger cancellation.
- [ ] In-app alarm ringing dialog for active foreground notifications.

## Verification Criteria
1. Calendar loads in Airplane mode with zero errors.
2. Saving an event in Airplane mode assigns a UUID, saves to SQLite, and schedules a local notification.
3. Event with a 0m reminder fires a native notification with sound and vibration at the exact trigger time.

