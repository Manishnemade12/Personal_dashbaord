# 02. Database & Local Storage Architecture

## 1. Storage Engine Evaluation & Selection

For an Expo SDK 57 / React Native 0.86 application, storage selection dictates performance, offline querying capability, and maintenance overhead.

### 1.1 Comparative Analysis

| Criteria | AsyncStorage | WatermelonDB | Realm DB | **expo-sqlite (Chosen)** |
| :--- | :--- | :--- | :--- | :--- |
| **Data Model** | Key-Value string only | Relational / Reactive | Object Store | **Full Relational SQL** |
| **Query Flexibility** | None (must parse entire JSON) | High (B-tree) | High | **Extremely High (Indexes, JOINs, Group By)** |
| **Expo SDK 57 Support**| First-class | Requires custom native config | Heavy native binary | **Native Expo 57 Next-Gen Async API** |
| **Storage Limits** | ~6MB default on Android | Device disk limit | Device disk limit | **Device disk limit (Gigabytes if needed)** |
| **Offline Reliability**| High risk of race conditions | Complex decorators | Schema version locks | **ACID Transactions (`BEGIN TRANSACTION`)** |
| **Web Support** | Supported | Complex WASM | Not supported | **WASM / IndexedDB Adapter** |

### 1.2 Decision: `expo-sqlite` + `AsyncStorage` Hybrid Architecture
1. **`expo-sqlite` (Primary Structured Store)**:
   - Manages all structured entities: Calendar Events, Reminders, Diet Items, Meals, Finance Records, Portfolio items, and the Sync Outbox.
   - Provides ACID transactions so multiple writes (e.g. creating an event + registering a reminder) succeed or fail atomically.
2. **`AsyncStorage` (Key-Value Metadata Store)**:
   - Used exclusively for small, atomic app metadata: `AUTH_USER`, `CUSTOM_API_BASE_URL`, `LAST_SYNCED_TIMESTAMP`, `THEME_PREFERENCE`.

---

## 2. Primary Key Strategy: The Dual-Identifier Model

A fundamental challenge in offline-first systems is creating records offline before the server assigns a MongoDB `_id`.

```
┌────────────────────────────────────────────────────────┐
│                   DUAL-IDENTIFIER MODEL                │
├────────────────────────────────────────────────────────┤
│  client_id (UUID v4)                                   │
│  • Generated immediately on the device via             │
│    `crypto.randomUUID()`                               │
│  • Acts as the PRIMARY KEY in local SQLite             │
│  • Used for all local foreign-key relationships        │
│                                                        │
│  server_id (MongoDB ObjectId string)                   │
│  • NULL when created offline                           │
│  • Populated when server acknowledges sync             │
│  • Used when making legacy REST calls                  │
└────────────────────────────────────────────────────────┘
```

---

## 3. Complete SQLite Database Schema (DDL)

The SQLite database file is named `portfolio_local.db`.

### 3.1 Core System & Sync Tables

```sql
-- Schema version tracking
CREATE TABLE IF NOT EXISTS _schema_migrations (
    version INTEGER PRIMARY KEY,
    applied_at TEXT NOT NULL
);

-- Sync metadata (last sync cursor, sync tokens)
CREATE TABLE IF NOT EXISTS sync_metadata (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

-- Persistent Outbox Queue for pending mutations
CREATE TABLE IF NOT EXISTS sync_outbox (
    mutation_id TEXT PRIMARY KEY,       -- UUID v4
    entity_name TEXT NOT NULL,          -- 'calendar_event', 'finance_tx', etc.
    action TEXT NOT NULL,               -- 'CREATE', 'UPDATE', 'DELETE'
    client_id TEXT NOT NULL,            -- Client ID of the target record
    payload TEXT NOT NULL,              -- JSON string of mutation data
    status TEXT NOT NULL DEFAULT 'PENDING', -- 'PENDING', 'PROCESSING', 'FAILED'
    retry_count INTEGER DEFAULT 0,
    last_error TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_outbox_status ON sync_outbox(status, created_at);
```

---

### 3.2 Calendar & Routine Management Tables

```sql
-- Calendars
CREATE TABLE IF NOT EXISTS calendars (
    client_id TEXT PRIMARY KEY,
    server_id TEXT UNIQUE,
    user_id TEXT NOT NULL DEFAULT 'admin',
    name TEXT NOT NULL,
    description TEXT,
    color TEXT DEFAULT '#7e37d8',
    is_default INTEGER DEFAULT 0,
    is_visible INTEGER DEFAULT 1,
    is_archived INTEGER DEFAULT 0,
    sync_status TEXT DEFAULT 'SYNCED',  -- 'SYNCED', 'PENDING_CREATE', 'PENDING_UPDATE', 'PENDING_DELETE'
    is_deleted INTEGER DEFAULT 0,
    deleted_at TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

-- Calendar Events
CREATE TABLE IF NOT EXISTS calendar_events (
    client_id TEXT PRIMARY KEY,
    server_id TEXT UNIQUE,
    calendar_client_id TEXT NOT NULL,
    calendar_server_id TEXT,
    user_id TEXT NOT NULL DEFAULT 'admin',
    title TEXT NOT NULL,
    description TEXT,
    start_at TEXT NOT NULL,              -- ISO 8601 string
    end_at TEXT NOT NULL,                -- ISO 8601 string
    is_all_day INTEGER DEFAULT 0,
    color TEXT,
    location TEXT,
    priority TEXT DEFAULT 'medium',      -- 'low', 'medium', 'high'
    status TEXT DEFAULT 'scheduled',     -- 'scheduled', 'completed', 'cancelled'
    recurrence_rule TEXT,                -- JSON string: { frequency, interval, daysOfWeek, until }
    sync_status TEXT DEFAULT 'SYNCED',
    is_deleted INTEGER DEFAULT 0,
    deleted_at TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY(calendar_client_id) REFERENCES calendars(client_id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_events_start_end ON calendar_events(start_at, end_at);
CREATE INDEX IF NOT EXISTS idx_events_calendar ON calendar_events(calendar_client_id);
CREATE INDEX IF NOT EXISTS idx_events_sync ON calendar_events(sync_status, is_deleted);

-- Local Reminders & Alarms (Offline Trigger Queue)
CREATE TABLE IF NOT EXISTS event_reminders (
    client_id TEXT PRIMARY KEY,
    server_id TEXT UNIQUE,
    event_client_id TEXT NOT NULL,
    offset_minutes INTEGER NOT NULL,     -- 0, 5, 15, 30, 60, etc.
    reminder_type TEXT DEFAULT 'notification', -- 'notification', 'alarm', 'popup'
    is_enabled INTEGER DEFAULT 1,
    scheduled_trigger_time TEXT NOT NULL,-- ISO string when notification must fire
    native_notification_id TEXT,         -- ID returned by expo-notifications
    is_delivered INTEGER DEFAULT 0,
    delivered_at TEXT,
    is_deleted INTEGER DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY(event_client_id) REFERENCES calendar_events(client_id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_reminders_trigger ON event_reminders(scheduled_trigger_time, is_delivered);
```

---

### 3.3 Workout & Diet Tracking Tables

```sql
-- Diet Items / Library
CREATE TABLE IF NOT EXISTS diet_items (
    client_id TEXT PRIMARY KEY,
    server_id TEXT UNIQUE,
    name TEXT NOT NULL,
    calories REAL NOT NULL DEFAULT 0,
    protein REAL DEFAULT 0,
    carbs REAL DEFAULT 0,
    fats REAL DEFAULT 0,
    serving_size TEXT,
    category TEXT DEFAULT 'General',     -- 'Breakfast', 'Protein', 'Snack', etc.
    ingredients TEXT,                    -- JSON array string: [{ name, calories, portion }]
    is_deleted INTEGER DEFAULT 0,
    sync_status TEXT DEFAULT 'SYNCED',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

-- Scheduled Meals & Daily Diet Logs
CREATE TABLE IF NOT EXISTS diet_meal_logs (
    client_id TEXT PRIMARY KEY,
    server_id TEXT UNIQUE,
    calendar_event_client_id TEXT,       -- Linked calendar event if scheduled
    date TEXT NOT NULL,                  -- 'YYYY-MM-DD'
    meal_type TEXT NOT NULL,             -- 'Breakfast', 'Lunch', 'Dinner', 'Snack'
    diet_item_client_id TEXT,
    custom_title TEXT,
    calories REAL NOT NULL DEFAULT 0,
    protein REAL DEFAULT 0,
    carbs REAL DEFAULT 0,
    fats REAL DEFAULT 0,
    status TEXT DEFAULT 'pending',       -- 'pending', 'eaten', 'skipped'
    scheduled_time TEXT,                 -- 'HH:mm'
    is_deleted INTEGER DEFAULT 0,
    sync_status TEXT DEFAULT 'SYNCED',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_diet_date ON diet_meal_logs(date);
```

---

### 3.4 Finance & Expense Management Tables

```sql
-- Finance Transactions
CREATE TABLE IF NOT EXISTS finance_transactions (
    client_id TEXT PRIMARY KEY,
    server_id TEXT UNIQUE,
    type TEXT NOT NULL,                  -- 'income' or 'expense'
    amount REAL NOT NULL,
    category TEXT NOT NULL,
    description TEXT,
    date TEXT NOT NULL,                  -- ISO string or 'YYYY-MM-DD'
    month TEXT NOT NULL,                 -- 'YYYY-MM' for fast monthly summaries
    payment_method TEXT DEFAULT 'UPI',
    is_deleted INTEGER DEFAULT 0,
    sync_status TEXT DEFAULT 'SYNCED',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_finance_month ON finance_transactions(month, type);

-- Finance Budgets
CREATE TABLE IF NOT EXISTS finance_budgets (
    client_id TEXT PRIMARY KEY,
    server_id TEXT UNIQUE,
    month TEXT NOT NULL UNIQUE,          -- 'YYYY-MM'
    total_budget REAL NOT NULL DEFAULT 0,
    category_budgets TEXT,               -- JSON string: { "Food": 5000, "Rent": 15000 }
    is_deleted INTEGER DEFAULT 0,
    sync_status TEXT DEFAULT 'SYNCED',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);
```

---

### 3.5 Investment & Wealth Tables

```sql
-- Investment Holdings
CREATE TABLE IF NOT EXISTS investment_holdings (
    client_id TEXT PRIMARY KEY,
    server_id TEXT UNIQUE,
    symbol TEXT NOT NULL,
    name TEXT NOT NULL,
    asset_class TEXT NOT NULL,           -- 'Equity', 'Mutual Fund', 'Crypto', 'Gold'
    quantity REAL NOT NULL,
    avg_buy_price REAL NOT NULL,
    last_known_price REAL NOT NULL,
    currency TEXT DEFAULT 'INR',
    exchange TEXT DEFAULT 'NSE',
    notes TEXT,
    is_deleted INTEGER DEFAULT 0,
    sync_status TEXT DEFAULT 'SYNCED',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

-- Investment Transactions
CREATE TABLE IF NOT EXISTS investment_transactions (
    client_id TEXT PRIMARY KEY,
    server_id TEXT UNIQUE,
    holding_client_id TEXT,
    symbol TEXT NOT NULL,
    type TEXT NOT NULL,                  -- 'BUY', 'SELL', 'DIVIDEND'
    quantity REAL NOT NULL,
    price REAL NOT NULL,
    fees REAL DEFAULT 0,
    date TEXT NOT NULL,
    is_deleted INTEGER DEFAULT 0,
    sync_status TEXT DEFAULT 'SYNCED',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);
```

---

### 3.6 Portfolio Content Tables

```sql
-- Blogs
CREATE TABLE IF NOT EXISTS portfolio_blogs (
    client_id TEXT PRIMARY KEY,
    server_id TEXT UNIQUE,
    title TEXT NOT NULL,
    slug TEXT NOT NULL,
    content TEXT NOT NULL,
    excerpt TEXT,
    tags TEXT,                           -- JSON array string
    cover_image_uri TEXT,                -- Local URI or Cloudinary URL
    status TEXT DEFAULT 'draft',         -- 'publish', 'draft'
    is_deleted INTEGER DEFAULT 0,
    sync_status TEXT DEFAULT 'SYNCED',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

-- Projects
CREATE TABLE IF NOT EXISTS portfolio_projects (
    client_id TEXT PRIMARY KEY,
    server_id TEXT UNIQUE,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    tech_stack TEXT,                     -- JSON array string
    github_url TEXT,
    live_url TEXT,
    image_uri TEXT,
    status TEXT DEFAULT 'publish',
    sort_order INTEGER DEFAULT 0,
    is_deleted INTEGER DEFAULT 0,
    sync_status TEXT DEFAULT 'SYNCED',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

-- Skills, Photos, Contacts, Education, Social Links
CREATE TABLE IF NOT EXISTS portfolio_skills (
    client_id TEXT PRIMARY KEY,
    server_id TEXT UNIQUE,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    level INTEGER DEFAULT 80,
    icon TEXT,
    is_deleted INTEGER DEFAULT 0,
    sync_status TEXT DEFAULT 'SYNCED',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS portfolio_photos (
    client_id TEXT PRIMARY KEY,
    server_id TEXT UNIQUE,
    title TEXT,
    url TEXT NOT NULL,
    category TEXT,
    caption TEXT,
    is_deleted INTEGER DEFAULT 0,
    sync_status TEXT DEFAULT 'SYNCED',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS portfolio_contacts (
    client_id TEXT PRIMARY KEY,
    server_id TEXT UNIQUE,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    subject TEXT,
    message TEXT NOT NULL,
    status TEXT DEFAULT 'unread',        -- 'read', 'unread'
    created_at TEXT NOT NULL
);
```

---

## 4. Database Access Layer (DAO Pattern)

To keep UI components decoupled from raw SQL queries, the system introduces structured Data Access Objects (DAOs):

```
mobile-app/src/db/
├── database.js               # SQLite connection instance & migration runner
├── schema.sql.js             # DDL table creation scripts
├── dao/
│   ├── CalendarDao.js        # getEvents, saveEvent, deleteEvent, getVisible
│   ├── ReminderDao.js        # getPendingReminders, markDelivered, saveReminder
│   ├── DietDao.js            # getDailyPlan, toggleMeal, getItems, getHistory
│   ├── FinanceDao.js         # getTransactions, getBudget, computeSummary
│   ├── InvestmentDao.js      # getHoldings, logTrade, computeNetWorth
│   ├── PortfolioDao.js       # Blogs, Projects, Skills, Photos, Contacts
│   └── SyncOutboxDao.js      # enqueueMutation, getPending, markCompleted
```

### 4.1 Sample DAO Implementation Pattern (`CalendarDao.js`)

```javascript
import { getDatabase } from '../database';

export const CalendarDao = {
  async getEventsInRange(startIso, endIso) {
    const db = await getDatabase();
    return await db.getAllAsync(
      `SELECT * FROM calendar_events 
       WHERE is_deleted = 0 
       AND start_at >= ? AND start_at <= ?
       ORDER BY start_at ASC`,
      [startIso, endIso]
    );
  },

  async insertEventOptimistic(eventData) {
    const db = await getDatabase();
    const clientId = eventData.client_id || crypto.randomUUID();
    const now = new Date().toISOString();

    await db.runAsync(
      `INSERT INTO calendar_events (
        client_id, server_id, calendar_client_id, title, description,
        start_at, end_at, is_all_day, location, priority, status,
        recurrence_rule, sync_status, is_deleted, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING_CREATE', 0, ?, ?)`,
      [
        clientId,
        eventData.server_id || null,
        eventData.calendar_client_id,
        eventData.title,
        eventData.description || '',
        eventData.start_at,
        eventData.end_at,
        eventData.is_all_day ? 1 : 0,
        eventData.location || '',
        eventData.priority || 'medium',
        eventData.status || 'scheduled',
        JSON.stringify(eventData.recurrence_rule || {}),
        now,
        now
      ]
    );

    return { ...eventData, client_id: clientId, sync_status: 'PENDING_CREATE' };
  }
};
```

---

## 5. Next Steps
With the local storage architecture solidified, the next document (**[03_SYNC_ENGINE_AND_PROTOCOL_SPECIFICATION.md](./03_SYNC_ENGINE_AND_PROTOCOL_SPECIFICATION.md)**) details the bidirectional synchronization engine, push/pull protocols, and conflict resolution mechanisms.

