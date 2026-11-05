# Phase 6: Testing, Verification & Hardening

## Goal
Perform rigorous, comprehensive Quality Assurance verification like a professional tester, covering automated test scripts, edge cases, data integrity, and error recovery.

## Tasks
- [ ] Implement backend test suite (`mobile-app/scratch/test_sync_endpoints.js`):
  - Validates `POST /api/sync/push` with mock mutations (CREATE, UPDATE, DELETE).
  - Validates idempotency (sending identical mutations multiple times).
  - Validates `GET /api/sync/pull` delta queries and tombstone handling.
- [ ] Implement local database test script (`mobile-app/scratch/test_local_database.js`):
  - Verifies SQLite schema creation and migrations.
  - Verifies transactional outbox insertion and optimistic updates.
  - Tests aggregation queries for finance and diet modules.
- [ ] End-to-end simulation of the 8 QA test matrix scenarios (Offline launch, offline write, alarm triggers, reboot persistence, online push).
- [ ] Verify linting, type checks, and Expo configuration integrity.

## Verification Criteria
1. Automated backend test script passes with 100% success rate.
2. Local database test script validates all tables, indexes, and queries.
3. Zero unhandled promise rejections or runtime crashes across the entire suite.

