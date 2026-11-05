# Phase 4: Feature Modules Offline Migration

## Goal
Adapt all remaining core application features to read from and write to local SQLite DAOs with outbox synchronization, enabling offline productivity across the entire app.

## Tasks
- [ ] **Workout & Diet Module (`WorkoutDietScreen.js`)**:
  - Connect diet library items to `DietDao.getDietItems()`.
  - Daily plan reads from and writes to `DietDao.getDailyMealLogs()`.
  - Toggling meal status updates SQLite immediately and queues outbox mutation.
  - Diet calories visuals computed locally via SQL aggregate (`SUM(calories) GROUP BY date`).
- [ ] **Finance & Expense Module (`FinanceScreen.js`)**:
  - Expense creation writes to `FinanceDao.insertTransaction()`.
  - Summary cards (Total Income, Total Expense, Net Balance) computed on-device via SQL query.
  - Category budget tracking compared against local sums.
- [ ] **Investments & Wealth Module (`InvestmentScreen.js`)**:
  - Holdings and trades stored in `InvestmentDao`.
  - Trades update local holding quantities immediately.
  - Valuation calculated using `last_known_price`.
- [ ] **Portfolio Admin Modules (`BlogsScreen.js`, `ProjectsScreen.js`, etc.)**:
  - Offline drafting of blog posts and project portfolios.
  - Reads and updates backed by `PortfolioDao`.
- [ ] **AI Modules Graceful Fallback**:
  - Historical chat logs cached in local SQLite.
  - UI displays polite offline indicator when internet is disconnected.

## Verification Criteria
1. Logging an expense offline updates finance summaries instantly without network error.
2. Toggling a meal status offline updates the checkbox and local calorie counts immediately.
3. Adding a blog or project offline stores the entry and displays it in the list view.

