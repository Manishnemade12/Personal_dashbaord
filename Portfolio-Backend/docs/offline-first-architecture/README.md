# Offline-First Architecture & Sync Engine Documentation

Welcome to the comprehensive technical documentation for converting the **Portfolio Admin & Personal Dashboard Mobile Application** into a true **Production-Grade Offline-First Application**.

---

## 📖 Table of Contents

1. [00. Executive Summary & Architecture Roadmap](./00_EXECUTIVE_SUMMARY_AND_ROADMAP.md)
   - Vision, Core Pillars, System Architecture Flow, Implementation Phases & Milestones.
2. [01. Project Audit & Current State Analysis](./01_PROJECT_AUDIT_AND_CURRENT_STATE.md)
   - Deep inspection of current codebase, screen-by-screen audit, backend endpoints, and offline failure points.
3. [02. Database & Local Storage Architecture](./02_DATABASE_AND_LOCAL_STORAGE_ARCHITECTURE.md)
   - Storage layer selection (`expo-sqlite` + `AsyncStorage`), complete relational table schemas, indexes, and client-side UUID strategies.
4. [03. Sync Engine & Protocol Specification](./03_SYNC_ENGINE_AND_PROTOCOL_SPECIFICATION.md)
   - Outbox Pattern, Push/Pull sync protocol, idempotency keys, Last-Write-Wins (LWW) conflict resolution, tombstones (soft deletes), and network lifecycle managers.
5. [04. Offline Calendar & Local Alarm Engine](./04_OFFLINE_CALENDAR_AND_LOCAL_ALARM_ENGINE.md)
   - Complete technical plan for offline calendar events, native Android exact alarms (`SCHEDULE_EXACT_ALARM`), scheduled ringing & audio playback, reboot resilience (`RECEIVE_BOOT_COMPLETED`), and alarm reconciliation.
6. [05. Module-by-Module Offline Implementation Specs](./05_MODULE_BY_MODULE_OFFLINE_IMPLEMENTATION_SPECS.md)
   - Deep breakdown for every single feature: Auth, Calendar, Diet & Workout, Finance, Investments, Portfolio Admin (Blogs, Projects, Skills, Gallery, Education, Contacts), AI tools, and Staged Media Uploads.
7. [06. Backend Modifications & Schema Migrations](./06_BACKEND_MODIFICATIONS_AND_SCHEMA_MIGRATIONS.md)
   - Backend Mongoose model updates, sync endpoints (`/api/sync/push`, `/api/sync/pull`), versioning, soft deletes, and performance indexing.
8. [07. UI/UX Offline Patterns & State Management](./07_UI_UX_OFFLINE_PATTERNS_AND_STATE_MANAGEMENT.md)
   - Connectivity banners, optimistic UI updates, pending sync badges, error recovery toasts, and user feedback mechanisms.
9. [08. Testing, Edge Cases & Deployment Strategy](./08_TESTING_EDGE_CASES_AND_DEPLOYMENT_STRATEGY.md)
   - Airplane mode test matrices, flaky network simulation, clock drift mitigations, battery optimization (Doze mode), and zero-data-loss migration checklist.

---

## 🎯 Target Architecture Highlights

```
+---------------------------------------------------------------------------------------+
|                                    MOBILE CLIENT                                      |
|                                                                                       |
|  [ User Interface (React Native / Expo SDK 57) ]                                      |
|       │                                     ▲                                         |
|       ▼ (Instant Read / Optimistic Write)   │ (Reactive State / Hooks)                |
|  [ Local Storage Engine (expo-sqlite + AsyncStorage) ]                                |
|       │                                                                               |
|       ├─► [ Local Alarm & Notification Manager ] ──► (Android AlarmManager / Audio)   |
|       │    - Works 100% Offline (Zero Internet Required!)                             |
|       │    - Survives Device Reboots & Deep Doze Mode                                 |
|       │                                                                               |
|       └─► [ Sync Engine / Outbox Queue ]                                              |
|                │                                                                      |
|                ▼ (When Online: Push Queue & Pull Delta)                               |
+────────────────┼──────────────────────────────────────────────────────────────────────+
                 │ HTTPS (Bidirectional Sync Protocol)
                 ▼
+───────────────────────────────────────────────────────────────────────────────────────+
|                                    CLOUD BACKEND                                      |
|                                                                                       |
|  [ Node.js / Express Server on Vercel / Render / Local ]                              |
|       │                                                                               |
|       ├──► [ /api/sync/push ] ─── Idempotency Check & Transaction Processing          |
|       ├──► [ /api/sync/pull ] ─── Delta Query (since last_pulled_at)                  |
|       └──► [ Existing REST APIs ] (Maintained for Backward Compatibility)             |
|                                                                                       |
|  [ MongoDB Atlas ] ── (Tombstones, Versioning, Timestamps, Compound Indexes)          |
+---------------------------------------------------------------------------------------+
```

---

## 🚀 How to Use These Specs
- Start with **[00_EXECUTIVE_SUMMARY_AND_ROADMAP.md](./00_EXECUTIVE_SUMMARY_AND_ROADMAP.md)** for a clear overview of the strategy and phase breakdown.
- Review **[04_OFFLINE_CALENDAR_AND_LOCAL_ALARM_ENGINE.md](./04_OFFLINE_CALENDAR_AND_LOCAL_ALARM_ENGINE.md)** for the priority calendar notifications & scheduled ring requirements specified in `newFeature.md`.
- Implement features phase-by-phase following **[05_MODULE_BY_MODULE_OFFLINE_IMPLEMENTATION_SPECS.md](./05_MODULE_BY_MODULE_OFFLINE_IMPLEMENTATION_SPECS.md)** and **[06_BACKEND_MODIFICATIONS_AND_SCHEMA_MIGRATIONS.md](./06_BACKEND_MODIFICATIONS_AND_SCHEMA_MIGRATIONS.md)**.

