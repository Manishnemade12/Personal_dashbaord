# 01. Project Audit & Current State Analysis

## 1. Codebase Architecture Overview

The repository consists of a monorepo-style structure housing both the mobile client and the standalone backend:
- **Mobile Client**: Expo SDK 57 / React Native 0.86.3 application (`mobile-app/`)
- **Backend API**: Node.js Express 5.3 + Mongoose 9.11 + MongoDB Atlas (`mobile-app/server/`)
- **Third-Party Services**: Cloudinary (image storage), Grok / Gemini / AI APIs (cold email, routine planner, stock analyzer).

```
Portfolio-Backend/
├── newFeature.md                     # Feature requirements statement
├── nextprompt.md                     # Feature expansion notes
└── mobile-app/
    ├── app.json                      # Expo config, permissions, notification plugins
    ├── package.json                  # Dependencies (Expo 57, RN 0.86, Mongoose 9.11)
    ├── App.js                        # Root component, custom tab/drawer routing, session restore
    ├── src/
    │   ├── api/client.js             # Centralized fetch wrapper & API endpoints
    │   ├── services/
    │   │   └── notificationService.js# Notification handler, channel setup, 30s polling
    │   ├── components/               # Header, SidebarDrawer, Common pickers, Modals
    │   ├── screens/
    │   │   ├── auth/AuthScreen.js
    │   │   ├── DashboardScreen.js
    │   │   ├── calendar/CalendarScreen.js
    │   │   ├── workout/WorkoutDietScreen.js
    │   │   ├── finance/FinanceScreen.js
    │   │   ├── finance/InvestmentScreen.js
    │   │   ├── finance/InvestmentAnalyticsScreen.js
    │   │   ├── finance/PortfolioInsightsScreen.js
    │   │   ├── finance/AiStockAnalyzerScreen.js
    │   │   ├── portfolio/ (Blogs, Projects, Skills, Gallery, Education, Social, Contacts)
    │   │   ├── api/ (ApiManagement, ProjectApi)
    │   │   └── ai/AiColdEmailScreen.js
    └── server/
        ├── index.js                  # Express app, CORS, route registration
        ├── config/db.js              # MongoDB connection
        ├── models/                   # Mongoose models (20+ collections)
        ├── routes/                   # REST route handlers
        └── services/                 # AI routine planner, stock analyzer, OCR, nutrition
```

---

## 2. Exhaustive Screen & Feature Audit

### 2.1 Authentication & Session (`src/screens/auth/AuthScreen.js`, `App.js`)
* **Current Behavior**:
  * On launch, `App.js` checks `AsyncStorage.getItem('AUTH_USER')`. If found, it bypasses the login screen.
  * Login submits `api.login(email, password)` which calls `POST /api/auth/login`.
* **Offline Failure Points**:
  * If the user is logged out and has no network, login fails with `Cannot reach server at ...`. User cannot access the app even if previous cached data exists.
  * No offline demo/fallback session or PIN-based offline unlock.
  * No refresh token or local credential hash validation.

---

### 2.2 Calendar & Scheduling (`src/screens/calendar/CalendarScreen.js`)
* **Current Behavior**:
  * On mount, `loadData()` calls `Promise.all([api.getCalendars(), api.getEvents()])`.
  * Events are stored in component React state (`const [events, setEvents] = useState([])`).
  * Creating or editing an event calls `api.createEvent(payload)` or `api.updateEvent(id, payload)`.
  * After saving, it calculates `startAt - offsetMinutes` and calls `notificationService.scheduleLocalReminder()`.
  * Deleting an event calls `api.deleteEvent(id)` directly.
* **Offline Failure Points**:
  * **Critical Gap**: If the user launches the app in airplane mode, `loadData()` throws an error and the calendar shows zero events.
  * **Critical Gap**: Saving an event when offline immediately throws `Network request failed` and the entire event text/time is lost.
  * **Notification Disconnect**: If events were created on another client (or prior to app restart), they are not re-registered with native notifications on app launch.
  * **Server Polling Dependency**: `notificationService.startReminderWatcher()` polls `api.getUpcomingReminders()` every 30s. Offline, this network call fails continuously and no notifications are triggered.

---

### 2.3 Workout & Diet Management (`src/screens/workout/WorkoutDietScreen.js`)
* **Current Behavior**:
  * Daily diet plan: fetches `api.getDailyDietPlan(date)` from `GET /api/diet/daily-plan`.
  * Diet items library: fetches `api.getDietItems()` from `GET /api/diet/items`.
  * Toggling a meal status: `api.toggleMealStatus(eventId)`.
  * Scheduling a meal: `api.scheduleDietMeal(data)` which creates both a diet item link and a calendar event.
  * Calories Visuals: `api.getDietCalorieHistory(start, end)` fetches past aggregate consumption.
* **Offline Failure Points**:
  * Cannot view today's diet plan offline.
  * Cannot mark a meal as "Eaten" while eating without active internet.
  * Cannot schedule a new meal or browse the food items library offline.
  * Macro breakdown calculations rely on `/api/diet/calculate-macros` instead of client-side math.

---

### 2.4 Finance & Expense Tracking (`src/screens/finance/FinanceScreen.js`)
* **Current Behavior**:
  * Fetches transactions via `api.getFinanceTransactions(params)`.
  * Fetches monthly budget via `api.getFinanceBudget(month)`.
  * Fetches aggregate summaries via `api.getFinanceSummary(month)`.
  * Add/edit/delete calls `POST/PUT/DELETE /api/finance/transactions`.
* **Offline Failure Points**:
  * Logging an expense is the #1 real-world offline mobile use case (e.g. paying cash at a store with zero cell reception). Currently, adding a transaction offline fails completely.
  * Calculations (Total Spent, Remaining Budget, Category Split) are done server-side in `/finance/summary`, making finance dashboards completely blank offline.

---

### 2.5 Investments & Wealth Management (`src/screens/finance/InvestmentScreen.js`, `InvestmentAnalyticsScreen.js`)
* **Current Behavior**:
  * Holdings: `api.getHoldings()` fetches stock/crypto holdings.
  * Summary: `api.getInvestmentSummary()`.
  * Live price lookup: `api.getInstrumentPrice(symbol)`.
  * Buy/Sell transactions: `api.executeInvestmentTransaction(data)`.
  * Net worth history: `api.getNetWorthHistory(range)`.
* **Offline Failure Points**:
  * User cannot check their portfolio holdings or past transactions offline.
  * If offline, recording a manual buy/sell trade is rejected by network error.
  * Live prices obviously require internet, but the app lacks a "Cached Price as of [Timestamp]" display.

---

### 2.6 Portfolio Admin (`src/screens/portfolio/*`)
* **Modules**: Blogs, Projects, Skills, Gallery, Contacts, Education, Social Links, Profile.
* **Current Behavior**:
  * Direct CRUD APIs (`GET/POST/PUT/DELETE /api/blogs`, `/api/projects`, etc.).
  * Image uploads: `ImageUploader.js` reads file as Base64 and sends it to `POST /api/upload`, which pushes to Cloudinary and returns a secure URL.
* **Offline Failure Points**:
  * Drafting a blog post or editing a project description requires an active network.
  * If you write a 500-word blog post or project entry offline and hit "Publish/Save", the entire post is lost on network error.
  * Adding an image offline immediately crashes the upload flow because Cloudinary is unreachable.

---

### 2.7 AI Tools (`AiStockAnalyzerScreen.js`, `AiColdEmailScreen.js`, `AiRoutinePlannerModal.js`)
* **Current Behavior**:
  * Chat sessions and email drafts are fetched from `/api/ai/conversations` and `/api/investments/ai-chat/sessions`.
  * Queries trigger remote LLMs (Grok / Gemini).
* **Offline Failure Points**:
  * While AI inference cannot run offline without local models, existing past conversation history and saved emails cannot even be viewed offline.
  * No distinction between "network unavailable for AI computation" and generic application crash.

---

### 2.8 Notification Service Deep Audit (`src/services/notificationService.js`)
* **Code Inspection**:
```javascript
// Current implementation in notificationService.js:
async checkDueReminders() {
  try {
    const logs = await api.getUpcomingReminders(); // <--- FAILS IMMEDIATELY WHEN OFFLINE
    if (!Array.isArray(logs)) return;
    const now = Date.now();
    for (const log of logs) {
      if (log.status !== 'pending') continue;
      const scheduledTime = new Date(log.scheduledFor).getTime();
      if (scheduledTime <= now + 60000 && !this.deliveredKeys.has(log.deduplicationKey)) {
        this.deliveredKeys.add(log.deduplicationKey);
        await this.showNotification(log.title, log.body, log.eventId);
        api.dismissReminder(log._id).catch(() => {});
      }
    }
  } catch (e) {
    // Silently fails, no notifications trigger offline!
  }
}
```
* **Findings**:
  1. The app relies on **server polling** to fire alerts, defeating the purpose of a mobile device with a built-in OS alarm manager!
  2. Notifications do not trigger when the screen is locked or app is killed because there is no background native alarm scheduled.
  3. `this.deliveredKeys = new Set()` is stored in volatile JavaScript RAM; every time the app closes, memory resets.
  4. Scheduled rings and sound channels (`channelId: 'calendar-reminders'`) are defined, but never populated with future events when the app loads.

---

## 3. Vulnerabilities & Architectural Gaps Matrix

| Feature | Current State | Offline Impact | Required Architecture |
| :--- | :--- | :--- | :--- |
| **Data Storage** | Transient React `useState` | Complete data wipe on app close if offline | Local SQLite database (`expo-sqlite`) |
| **Write Operations** | Direct synchronous `fetch()` | Total failure, user input lost | Persistent Outbox Queue + Optimistic UI |
| **Notifications** | 30s HTTP polling loop | Fails completely offline | Native OS Alarm scheduling (`scheduleNotificationAsync`) |
| **Ringing Alarms** | Standard notification sound | Missed critical routines & meal alarms | High-importance alarm channel with sound & vibration |
| **Reboot Resilience** | Non-existent | All notifications lost on phone restart | Native OS AlarmManager + boot listener reconciliation |
| **Deletions** | Direct hard delete (`deleteMany`) | Other devices never learn of deletion | Soft deletes (tombstones: `isDeleted: true`) |
| **Conflict Handling** | None (last HTTP request wins) | Overwriting edits between devices | Last-Write-Wins (LWW) with server timestamps |
| **Image Uploads** | Instant Base64 to Cloudinary | Fails offline, halts form submission | Local file URI caching + Background Staged Queue |
| **AI Assistants** | Uncached HTTP requests | Blank screens, crashes | Local caching of conversation history & outputs |
| **Network Status** | No network listener | UI doesn't know if online/offline | `@react-native-community/netinfo` State Machine |

---

## 4. Next Steps
Having identified every single failure point, the next document (**[02_DATABASE_AND_LOCAL_STORAGE_ARCHITECTURE.md](./02_DATABASE_AND_LOCAL_STORAGE_ARCHITECTURE.md)**) provides the complete schema design and data access layer for `expo-sqlite`.

