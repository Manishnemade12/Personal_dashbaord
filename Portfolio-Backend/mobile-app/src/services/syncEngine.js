import NetInfo from '@react-native-community/netinfo';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '../api/client';
import { SyncOutboxDao } from '../db/dao/SyncOutboxDao';
import { CalendarDao } from '../db/dao/CalendarDao';
import { DietDao } from '../db/dao/DietDao';
import { FinanceDao } from '../db/dao/FinanceDao';
import { InvestmentDao } from '../db/dao/InvestmentDao';
import { PortfolioDao } from '../db/dao/PortfolioDao';
import { NoteDao } from '../db/dao/NoteDao';
import { StudyDao } from '../db/dao/StudyDao';
import { reconcileAlarms } from './alarmReconciliationEngine';

const LAST_SYNCED_KEY = 'SYNC_LAST_PULLED_AT';

class SyncEngine {
  constructor() {
    this.isOnline = true;
    this.isSyncing = false;
    this.pendingCount = 0;
    this.lastSyncedAt = null;
    this.listeners = new Set();
    this.syncDebounceTimer = null;

    this.init();
  }

  async init() {
    try {
      this.lastSyncedAt = await AsyncStorage.getItem(LAST_SYNCED_KEY);
      this.pendingCount = await SyncOutboxDao.getPendingCount();
    } catch (e) {}

    // Listen to network changes
    NetInfo.addEventListener((state) => {
      const reachable = !!(state.isConnected && state.isInternetReachable !== false);
      const wasOffline = !this.isOnline;
      this.isOnline = reachable;

      this.notifyListeners();

      // Trigger automatic sync on returning online
      if (wasOffline && reachable) {
        this.scheduleSync(500);
      }
    });

    // Check initial network state
    NetInfo.fetch().then((state) => {
      this.isOnline = !!(state.isConnected && state.isInternetReachable !== false);
      this.notifyListeners();
      if (this.isOnline) {
        this.scheduleSync(1000);
      }
    });
  }

  addListener(callback) {
    this.listeners.add(callback);
    callback(this.getState());
    return () => this.listeners.delete(callback);
  }

  notifyListeners() {
    const state = this.getState();
    this.listeners.forEach((cb) => {
      try {
        cb(state);
      } catch (e) {}
    });
  }

  getState() {
    return {
      isOnline: this.isOnline,
      isSyncing: this.isSyncing,
      pendingCount: this.pendingCount,
      lastSyncedAt: this.lastSyncedAt,
    };
  }

  scheduleSync(delayMs = 1500) {
    if (this.syncDebounceTimer) {
      clearTimeout(this.syncDebounceTimer);
    }
    this.syncDebounceTimer = setTimeout(() => {
      this.syncNow().catch(() => {});
    }, delayMs);
  }

  /**
   * Execute full bidirectional synchronization: Push Outbox -> Pull Remote Deltas -> Reconcile Alarms
   */
  async syncNow() {
    if (this.isSyncing) return;
    if (!this.isOnline) {
      this.pendingCount = await SyncOutboxDao.getPendingCount();
      this.notifyListeners();
      return;
    }

    this.isSyncing = true;
    this.notifyListeners();

    try {
      // ================= 1. PUSH PHASE =================
      const pendingMutations = await SyncOutboxDao.getPendingMutations(50);
      this.pendingCount = pendingMutations.length;
      this.notifyListeners();

      if (pendingMutations.length > 0) {
        try {
          const pushResponse = await api.pushSyncMutations({
            mutations: pendingMutations,
            clientId: 'mobile_app_client',
          });

          if (pushResponse?.results && Array.isArray(pushResponse.results)) {
            for (const res of pushResponse.results) {
              if (res.status === 'applied') {
                await SyncOutboxDao.markCompleted(res.mutationId);
              } else if (res.status === 'error' || res.status === 'rejected') {
                await SyncOutboxDao.recordFailure(res.mutationId, res.error);
              }
            }
          }
        } catch (pushErr) {
          console.warn('[Sync Push Exception]', pushErr.message);
        }
      }

      this.pendingCount = await SyncOutboxDao.getPendingCount();
      this.notifyListeners();

      // ================= 2. PULL PHASE =================
      try {
        const pullResponse = await api.pullSyncChanges(this.lastSyncedAt);

        if (pullResponse?.changes) {
          const { changes, serverTime } = pullResponse;

          // Calendars
          if (Array.isArray(changes.calendars)) {
            for (const c of changes.calendars) {
              await CalendarDao.upsertCalendar(c, true);
            }
          }

          // Calendar Events
          if (Array.isArray(changes.calendarEvents)) {
            for (const ev of changes.calendarEvents) {
              await CalendarDao.saveEvent(ev, true);
            }
          }

          // Diet Items
          if (Array.isArray(changes.dietItems)) {
            for (const d of changes.dietItems) {
              await DietDao.saveDietItem(d, true);
            }
          }

          // Finance Transactions
          if (Array.isArray(changes.financeTransactions)) {
            for (const ft of changes.financeTransactions) {
              await FinanceDao.insertTransaction(ft, true);
            }
          }

          // Finance Budgets
          if (Array.isArray(changes.financeBudgets)) {
            for (const fb of changes.financeBudgets) {
              await FinanceDao.saveBudget(fb, true);
            }
          }

          // Investment Holdings
          if (Array.isArray(changes.investmentHoldings)) {
            for (const ih of changes.investmentHoldings) {
              await InvestmentDao.saveHolding(ih, true);
            }
          }
          if (Array.isArray(changes.investmentTransactions)) {
            for (const transaction of changes.investmentTransactions) {
              await InvestmentDao.executeTransaction(transaction, true);
            }
          }

          // Portfolio Blogs & Projects
          if (Array.isArray(changes.portfolioBlogs)) {
            for (const pb of changes.portfolioBlogs) {
              await PortfolioDao.saveBlog(pb, true);
            }
          }
          if (Array.isArray(changes.portfolioProjects)) {
            for (const pp of changes.portfolioProjects) {
              await PortfolioDao.saveProject(pp, true);
            }
          }

          // Notes & Ideas (Offline Sync)
          if (Array.isArray(changes.notes)) {
            for (const n of changes.notes) {
              await NoteDao.saveNote(n, true);
            }
          }
          if (Array.isArray(changes.noteCategories)) {
            for (const nc of changes.noteCategories) {
              await NoteDao.saveCategory(nc, true);
            }
          }

          // Study Flow (Offline Sync)
          if (Array.isArray(changes.studySubjects)) {
            for (const s of changes.studySubjects) {
              await StudyDao.saveSubject(s, true);
            }
          }
          if (Array.isArray(changes.studyChunks)) {
            for (const c of changes.studyChunks) {
              await StudyDao.saveChunk(c, true);
            }
          }
          if (Array.isArray(changes.studyWeakQuestions)) {
            for (const w of changes.studyWeakQuestions) {
              await StudyDao.saveWeakQuestion(w, true);
            }
          }

          // Reconcile offline alarms with newly pulled events
          reconcileAlarms().catch(() => {});

          if (serverTime) {
            this.lastSyncedAt = serverTime;
            await AsyncStorage.setItem(LAST_SYNCED_KEY, serverTime);
          }
        }
      } catch (pullErr) {
        console.warn('[Sync Pull Exception]', pullErr.message);
      }
    } catch (err) {
      console.error('[SyncEngine Error]', err);
    } finally {
      this.isSyncing = false;
      this.pendingCount = await SyncOutboxDao.getPendingCount();
      this.notifyListeners();
    }
  }
}

export const syncEngine = new SyncEngine();
export default syncEngine;
