# 08. Testing, Edge Cases & Deployment Strategy

## 1. Quality Assurance Test Matrix

To guarantee production reliability, the offline-first implementation must undergo verification across these test scenarios:

| # | Test Scenario | Steps to Execute | Expected Result | Pass Criteria |
| :- | :--- | :--- | :--- | :--- |
| **T1** | **Cold Launch in Airplane Mode** | 1. Enable Airplane mode.<br>2. Force-close app.<br>3. Open app from launcher. | App launches instantly; renders cached dashboard, calendar, meals, finance, and portfolio without error popups. | No crash, load time < 200ms. |
| **T2** | **Offline Event Creation & Outbox** | 1. In Airplane mode, schedule a calendar event.<br>2. Verify event in calendar list.<br>3. Inspect SQLite `sync_outbox`. | Event displays with `PENDING_CREATE` badge. Outbox has 1 row with full payload. | Zero data loss; outbox count = 1. |
| **T3** | **Offline Native Alarm & Ringing** | 1. In Airplane mode, schedule an event for `now + 2 minutes` with 0m alarm.<br>2. Lock device screen.<br>3. Wait 2 minutes. | Phone vibrates and rings loudly at the exact minute with heads-up alarm notification. | Alarm triggers on exact second with zero internet. |
| **T4** | **Device Reboot Alarm Survival** | 1. Schedule event for 15 minutes ahead.<br>2. Power off phone completely.<br>3. Power back on and wait for scheduled time. | Android `RECEIVE_BOOT_COMPLETED` and launch reconciliation re-registers notification; alarm rings on time. | Alarm fires after reboot. |
| **T5** | **Offline Meal Tracking & Calories** | 1. In Airplane mode, toggle meal status to 'Eaten'.<br>2. View Diet Calories Visuals tab. | Meal status updates to 'Eaten' immediately; daily calorie total recalculates locally. | Graph & totals update instantly. |
| **T6** | **Online Sync & Push Verification** | 1. Create 3 events and 2 expenses offline.<br>2. Turn Wi-Fi back on.<br>3. Monitor network logs. | Sync Engine pushes batch to `/api/sync/push`. SQLite records update to `SYNCED`. MongoDB receives all records. | Outbox empties to 0; no duplicates. |
| **T7** | **Flaky Network & Exponential Backoff** | 1. Simulate 50% packet loss.<br>2. Enqueue mutations.<br>3. Observe retries. | Outbox retries with exponential backoff (1s, 2s, 4s, 8s). Mutations remain locked during in-flight requests. | No duplicate inserts on MongoDB. |
| **T8** | **Cross-Device LWW Conflict** | 1. Edit event title on Phone A while offline.<br>2. Edit same event on Web dashboard.<br>3. Phone A connects to internet. | Backend evaluates `serverUpdatedAt`. Later timestamp wins deterministically without database corruption. | Consistent state on both clients. |

---

## 2. Critical Edge Cases & Mitigations

### 2.1 Device Clock Drift
- **Issue**: If the mobile phone's clock is manually set 1 year into the past or future, client timestamps become unreliable.
- **Mitigation**:
  - The client calculates time offsets against the server time returned in every `/api/sync/pull` response:
    $$\Delta_{\text{clock}} = T_{\text{server}} - T_{\text{client\_received}}$$
  - Conflict resolution on the server **always uses server-assigned monotonic timestamps (`serverUpdatedAt = new Date()`)** rather than client timestamps.

### 2.2 Android Aggressive Battery Savers (Doze Mode)
- **Issue**: Device manufacturers (Samsung, Xiaomi, Oppo) aggressively throttle background processes and delay standard alarms.
- **Mitigation**:
  - Use `AndroidImportance.MAX` with `bypassDnd: true`.
  - Android permissions `SCHEDULE_EXACT_ALARM` and `USE_EXACT_ALARM` configured in `app.json`.
  - Provide an optional in-app settings shortcut directing users to disable battery optimization for Portfolio Admin (`Intent: ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS`).

### 2.3 Staged Image Upload Failures
- **Issue**: User captures a high-resolution photo while offline. Uploading over slow 2G connection fails repeatedly.
- **Mitigation**:
  - Images are compressed locally before staging using `expo-image-manipulator` (resize to max 1920px width, 80% JPEG quality).
  - Background worker uploads staged files one-by-one with resume and timeout guards (30s timeout per file).

### 2.4 Database Upgrade & Schema Migrations
- **Issue**: When an updated APK is installed with a new SQLite table or column, existing user databases must not be deleted or corrupted.
- **Mitigation**:
  - Incremental versioning table `_schema_migrations`.
  - Migration scripts execute sequentially inside an exclusive transaction:
    ```javascript
    if (currentVersion < 2) {
      await db.execAsync("ALTER TABLE calendar_events ADD COLUMN priority_level TEXT DEFAULT 'medium';");
      await db.runAsync("INSERT INTO _schema_migrations (version, applied_at) VALUES (2, ?)", [new Date().toISOString()]);
    }
    ```

---

## 3. Production Deployment & Build Checklist

1. **Expo SDK 57 Native Modules**:
   - Run `npx expo install expo-sqlite @react-native-community/netinfo expo-file-system expo-image-manipulator`.
2. **Backend Server Deployment**:
   - Deploy enhanced Express backend with `/api/sync/*` to Vercel or cloud host.
   - Run `node server/scripts/migrateSyncFields.js` on production MongoDB Atlas.
3. **EAS Production Build**:
   - Verify Android permissions in `app.json`.
   - Run `eas build --platform android --profile production`.
   - Test generated release APK on physical Android hardware (Android 12, 13, and 14).

