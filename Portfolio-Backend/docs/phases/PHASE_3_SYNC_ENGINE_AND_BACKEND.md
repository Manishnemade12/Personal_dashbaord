# Phase 3: Sync Engine & Backend Sync Protocol

## Goal
Build the bidirectional synchronization bridge connecting local SQLite with cloud MongoDB: automatic outbox pushing when online, delta change pulling, soft-delete tombstones, and Last-Write-Wins conflict resolution.

## Tasks
- [ ] Create Mongoose sync plugin (`server/models/plugins/syncPlugin.js`) adding:
  - `clientId: { type: String, sparse: true, index: true }`
  - `isDeleted: { type: Boolean, default: false, index: true }`
  - `deletedAt: { type: Date, default: null }`
  - `serverUpdatedAt: { type: Date, default: Date.now, index: true }`
  - `lastMutationId: { type: String, default: null }`
- [ ] Attach `syncPlugin` to all Mongoose models in `server/models/`.
- [ ] Implement `server/routes/sync.js`:
  - `POST /api/sync/push`: Batch mutation processor with idempotency checks.
  - `GET /api/sync/pull`: Incremental delta query using `serverUpdatedAt > since`.
- [ ] Mount `/api/sync` route in `server/index.js`.
- [ ] Implement client-side `src/services/syncEngine.js`:
  - Monitors connectivity via `@react-native-community/netinfo`.
  - Flushes pending mutations in `sync_outbox` to `/api/sync/push`.
  - Pulls remote deltas from `/api/sync/pull` and updates local SQLite.
  - Triggers alarm reconciliation on sync completion.

## Verification Criteria
1. Backend `/api/sync/push` accepts batch mutations and returns mapped `serverId`s with zero duplicate records on repeated calls.
2. Backend `/api/sync/pull` returns modified and deleted records since timestamp.
3. Offline client creates mutation -> reconnects -> outbox empties -> record appears in MongoDB.

