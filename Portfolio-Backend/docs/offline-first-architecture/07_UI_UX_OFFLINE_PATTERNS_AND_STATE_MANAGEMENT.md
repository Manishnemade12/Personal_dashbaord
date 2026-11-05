# 07. UI/UX Offline Patterns & State Management

## 1. Core UX Philosophy: Zero Friction & Complete Confidence

In an offline-first mobile application, offline mode is not treated as an error state; it is a **first-class operating mode**.
- **No Blocking Full-Screen Spinners**: Reads from local SQLite take <10ms. Screens render instantly.
- **Immediate Optimistic Confirmation**: When a user clicks "Schedule Event" or "Add Expense", the form closes immediately, the item appears on screen instantly, and a subtle icon indicates pending sync.
- **User Transparency**: The user should always know at a glance whether they are offline, how many changes are waiting in the outbox, and when their data was last synchronized.

---

## 2. Global Sync Status Banner & Header Pill

A persistent, non-intrusive status pill is mounted directly beneath the top `Header` component in `App.js`:

```
┌────────────────────────────────────────────────────────┐
│  Portfolio Admin                   [Syncing (3)] [🔔]  │
├────────────────────────────────────────────────────────┤
│  ⚡ Offline Mode • 3 changes saved locally             │
├────────────────────────────────────────────────────────┤
│                                                        │
│   Today's Calendar                      [+ New Event]  │
│   ┌──────────────────────────────────────────────────┐ │
│   │ ⏰ 10:00 AM - Design Review               [🕒]   │ │
│   │ 🥗 01:00 PM - Grilled Chicken Meal        [✓]    │ │
│   │ 💰 03:30 PM - ₹250 Coffee Expense         [🕒]   │ │
│   └──────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────┘
```

### 2.1 Visual States of the Sync Pill

| State | Color Theme | Icon | Text Label | Behavior |
| :--- | :--- | :--- | :--- | :--- |
| **Online (Idle)** | Transparent / Muted Green | `Ionicons: checkmark-circle` | Hidden or *"Synced"* | Invisible or subtle dot |
| **Offline** | Soft Amber (`#FEF3C7`) | `Ionicons: cloud-offline` | *"Offline Mode • X unsynced"* | Fixed top banner |
| **Syncing** | Vibrant Blue (`#EFF6FF`) | Rotating `Ionicons: sync` | *"Syncing X changes..."* | Subtle pulse animation |
| **Sync Error** | Soft Red (`#FEE2E2`) | `Ionicons: alert-circle` | *"Sync failed • Tap to retry"* | Clickable retry action |

---

## 3. Pending Sync Indicators on List Items

Every entity row (Calendar Event card, Diet Meal item, Finance row, Blog post) displays a subtle status indicator based on its `sync_status`:

```jsx
// React Native Status Badge Component
export const SyncBadge = ({ status }) => {
  if (status === 'SYNCED') return null;

  return (
    <View style={styles.syncBadgeContainer}>
      {status === 'PENDING_CREATE' || status === 'PENDING_UPDATE' ? (
        <View style={styles.pendingBadge}>
          <Ionicons name="time-outline" size={13} color="#f59e0b" />
          <Text style={styles.pendingText}>Saved locally</Text>
        </View>
      ) : status === 'PENDING_DELETE' ? (
        <View style={styles.deletingBadge}>
          <Ionicons name="trash-outline" size={13} color="#ef4444" />
          <Text style={styles.deletingText}>Deleting...</Text>
        </View>
      ) : null}
    </View>
  );
};
```

---

## 4. Manual Sync & Pull-to-Refresh

Every major list view (`CalendarScreen`, `WorkoutDietScreen`, `FinanceScreen`, `InvestmentScreen`, `BlogsScreen`) integrates standard mobile pull-to-refresh:

```jsx
<FlatList
  data={items}
  keyExtractor={(item) => item.client_id}
  renderItem={renderItem}
  refreshControl={
    <RefreshControl
      refreshing={isSyncing}
      onRefresh={async () => {
        if (!isOnline) {
          Alert.alert('Offline', 'Cannot sync while offline. Changes are safely saved locally.');
          return;
        }
        await syncEngine.syncNow();
      }}
      colors={['#7e37d8']}
    />
  }
/>
```

---

## 5. Offline AI & Media Interaction Patterns

### 5.1 AI Assistants (Stock Analyzer, Cold Email, Routine Planner)
When disconnected:
1. **Disable Cloud Generation Buttons**:
   - The primary "Generate" or "Analyze" button is styled in a disabled state with an amber icon.
   - Text updates to: *"Connect to internet to run AI"*.
2. **Preserve Full Conversation History**:
   - The user can scroll through previous chats, copy text, review generated routines, and read previous AI stock analyses.
   - Draft input is kept in local text state so the user doesn't lose their prompt if they lose signal.

### 5.2 Staged Media Uploads
When an image is added to a blog post, project, or gallery offline:
1. The `<Image />` component immediately displays the local cached file URI (`file:///...`).
2. An overlay badge shows a small cloud upload icon (`cloud-upload-outline`) indicating the photo is staged for Cloudinary upload.
3. The user can continue typing and save the form without waiting for an upload progress bar.

---

## 6. Next Steps
The final document (**[08_TESTING_EDGE_CASES_AND_DEPLOYMENT_STRATEGY.md](./08_TESTING_EDGE_CASES_AND_DEPLOYMENT_STRATEGY.md)**) provides comprehensive QA testing matrices, edge-case mitigation, and production deployment checklists.

