# Phase 5: UI/UX Indicators & Offline Patterns

## Goal
Provide clear, real-time user feedback on network connectivity, pending outbox synchronizations, and optimistic state updates without cluttering the interface.

## Tasks
- [ ] Create `src/components/common/SyncStatusBar.js`:
  - Mounted globally in `App.js` beneath the top Header.
  - Displays amber pill when offline (*"Offline Mode • X unsynced changes"*).
  - Displays blue rotating pulse when actively syncing.
  - Flashes green upon sync completion.
- [ ] Create `src/components/common/SyncBadge.js`:
  - Renders a subtle clock icon on list items with `PENDING_CREATE` or `PENDING_UPDATE`.
- [ ] Connect `RefreshControl` across list screens to trigger manual sync via `syncEngine.syncNow()`.
- [ ] Implement user error dialogs with actionable "Retry Now" options if synchronization encounters continuous failures.

## Verification Criteria
1. Toggling network state triggers the appropriate banner color and text within 500ms.
2. Newly created offline items immediately render with the pending sync clock badge.
3. Once synchronized, the pending sync badge transitions smoothly to synced state.

