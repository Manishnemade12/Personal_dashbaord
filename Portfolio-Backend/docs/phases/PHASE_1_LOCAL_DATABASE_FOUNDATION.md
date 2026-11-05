# Phase 1: Local Database & Storage Foundation

## Goal
Implement a robust, cross-platform SQLite database layer using `expo-sqlite` and `AsyncStorage` that acts as the single source of truth for all data on the mobile device.

## Tasks
- [ ] Install `expo-sqlite` and `@react-native-community/netinfo` with Expo SDK 57 compatible versions.
- [ ] Implement `src/utils/uuid.js` providing cryptographically strong UUID v4 for client-side primary keys.
- [ ] Create `src/db/schema.js` with DDL table definitions and indexes:
  - `_schema_migrations`
  - `sync_metadata`
  - `sync_outbox`
  - `calendars`
  - `calendar_events`
  - `event_reminders`
  - `diet_items`
  - `diet_meal_logs`
  - `finance_transactions`
  - `finance_budgets`
  - `investment_holdings`
  - `investment_transactions`
  - `portfolio_blogs`
  - `portfolio_projects`
  - `portfolio_skills`
  - `portfolio_photos`
  - `portfolio_contacts`
  - `portfolio_education`
  - `portfolio_social_links`
  - `ai_conversations`
- [ ] Implement `src/db/database.js` managing database connection, execution helpers, and transactional migrations.
- [ ] Create specialized Data Access Objects (DAOs) in `src/db/dao/`.

## Verification Criteria
1. Database opens cleanly on app launch without errors.
2. Tables and indexes are verified via `PRAGMA table_info` and `PRAGMA index_list`.
3. Inserting an entity with a generated client UUID and outbox record succeeds within an ACID transaction.

