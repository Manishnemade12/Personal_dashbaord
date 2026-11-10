import { getDatabase } from '../database';
import { generateUUID } from '../../utils/uuid';
import { SyncOutboxDao } from './SyncOutboxDao';

export const FinanceDao = {
  // ================= Transactions =================

  async getTransactions(filters = {}) {
    const db = await getDatabase();
    let sql = `SELECT * FROM finance_transactions WHERE is_deleted = 0`;
    const params = [];

    if (filters.month) {
      sql += ` AND month = ?`;
      params.push(filters.month);
    }
    if (filters.category && filters.category !== 'All') {
      sql += ` AND category = ?`;
      params.push(filters.category);
    }
    if (filters.type && filters.type !== 'all') {
      sql += ` AND type = ?`;
      params.push(filters.type);
    }
    if (filters.search && filters.search.trim()) {
      sql += ` AND (description LIKE ? OR category LIKE ?)`;
      params.push(`%${filters.search.trim()}%`, `%${filters.search.trim()}%`);
    }

    sql += ` ORDER BY date DESC, created_at DESC`;
    const rows = await db.getAllAsync(sql, params);
    return rows.map((r) => ({
      _id: r.server_id || r.client_id,
      client_id: r.client_id,
      server_id: r.server_id,
      type: r.type,
      amount: r.amount,
      category: r.category,
      description: r.description,
      date: r.date,
      month: r.month,
      paymentMethod: r.payment_method,
      syncStatus: r.sync_status,
      createdAt: r.created_at,
    }));
  },

  async insertTransaction(txData, isSyncPull = false) {
    const db = await getDatabase();
    const clientId = txData.client_id || txData.clientId || generateUUID();
    const serverId = txData.server_id || txData.serverId || txData._id || null;
    const now = new Date().toISOString();
    const dateStr = txData.date ? new Date(txData.date).toISOString() : now;
    const month = txData.month || dateStr.substring(0, 7);

    const existing = await db.getFirstAsync(
      `SELECT client_id FROM finance_transactions
       WHERE client_id = ? OR (server_id IS NOT NULL AND server_id = ?)`,
      [clientId, serverId]
    );
    const values = [
      serverId,
      txData.type || 'expense',
      Number(txData.amount || 0),
      txData.category || 'General',
      txData.description || '',
      dateStr,
      month,
      txData.paymentMethod || txData.payment_method || 'UPI',
      isSyncPull ? 'SYNCED' : 'PENDING_CREATE',
      now,
    ];

    if (existing) {
      await db.runAsync(
        `UPDATE finance_transactions SET
          server_id = COALESCE(?, server_id), type = ?, amount = ?, category = ?,
          description = ?, date = ?, month = ?, payment_method = ?,
          sync_status = ?, is_deleted = 0, updated_at = ?
         WHERE client_id = ?`,
        [...values, existing.client_id]
      );
    } else {
      await db.runAsync(
        `INSERT INTO finance_transactions (
          client_id, server_id, type, amount, category, description,
          date, month, payment_method, sync_status, is_deleted, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)`,
        [clientId, ...values, now]
      );
    }

    if (!isSyncPull && !existing) {
      await SyncOutboxDao.enqueueMutation('finance_transaction', 'CREATE', clientId, txData);
    }

    return existing?.client_id || clientId;
  },

  async updateTransaction(clientId, txData, isSyncPull = false) {
    const db = await getDatabase();
    const now = new Date().toISOString();
    const existing = await db.getFirstAsync(
      `SELECT client_id, server_id FROM finance_transactions WHERE client_id = ? OR server_id = ?`,
      [clientId, clientId]
    );
    if (!existing) return null;

    const dateStr = txData.date ? new Date(txData.date).toISOString() : undefined;
    const month = txData.month || (dateStr ? dateStr.substring(0, 7) : undefined);

    await db.runAsync(
      `UPDATE finance_transactions SET
        type = COALESCE(?, type),
        amount = COALESCE(?, amount),
        category = COALESCE(?, category),
        description = COALESCE(?, description),
        date = COALESCE(?, date),
        month = COALESCE(?, month),
        payment_method = COALESCE(?, payment_method),
        sync_status = ?,
        updated_at = ?
       WHERE client_id = ?`,
      [
        txData.type,
        txData.amount !== undefined ? Number(txData.amount) : null,
        txData.category,
        txData.description,
        dateStr,
        month,
        txData.paymentMethod,
        isSyncPull ? 'SYNCED' : 'PENDING_UPDATE',
        now,
        existing.client_id,
      ]
    );

    if (!isSyncPull) {
      await SyncOutboxDao.enqueueMutation('finance_transaction', 'UPDATE', existing.client_id, {
        ...txData,
        _id: existing.server_id,
      });
    }

    return existing.client_id;
  },

  async deleteTransaction(clientId, isSyncPull = false) {
    const db = await getDatabase();
    const existing = await db.getFirstAsync(
      `SELECT client_id, server_id FROM finance_transactions WHERE client_id = ? OR server_id = ?`,
      [clientId, clientId]
    );
    if (!existing) return;

    await db.runAsync(
      `UPDATE finance_transactions SET is_deleted = 1, sync_status = ? WHERE client_id = ?`,
      [isSyncPull ? 'SYNCED' : 'PENDING_DELETE', existing.client_id]
    );

    if (!isSyncPull) {
      await SyncOutboxDao.enqueueMutation('finance_transaction', 'DELETE', existing.client_id, {
        _id: existing.server_id,
      });
    }
  },

  // ================= Local Monthly Financial Summary =================

  async getMonthlySummary(monthStr) {
    const db = await getDatabase();
    const currentMonth = monthStr || new Date().toISOString().substring(0, 7);

    const totalsRow = await db.getFirstAsync(
      `SELECT 
        SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) as total_income,
        SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) as total_expense
       FROM finance_transactions 
       WHERE month = ? AND is_deleted = 0`,
      [currentMonth]
    );

    const categoryRows = await db.getAllAsync(
      `SELECT category, SUM(amount) as total_amount 
       FROM finance_transactions 
       WHERE month = ? AND type = 'expense' AND is_deleted = 0
       GROUP BY category ORDER BY total_amount DESC`,
      [currentMonth]
    );

    const totalIncome = totalsRow?.total_income || 0;
    const totalExpense = totalsRow?.total_expense || 0;

    return {
      month: currentMonth,
      totalIncome,
      totalExpense,
      netBalance: totalIncome - totalExpense,
      categoryExpenses: categoryRows.map((c) => ({
        category: c.category,
        amount: c.total_amount,
      })),
    };
  },

  // ================= Budgets =================

  async getBudget(monthStr) {
    const db = await getDatabase();
    const currentMonth = monthStr || new Date().toISOString().substring(0, 7);
    const row = await db.getFirstAsync(
      `SELECT * FROM finance_budgets WHERE month = ? AND is_deleted = 0`,
      [currentMonth]
    );
    if (!row) return null;

    return {
      _id: row.server_id || row.client_id,
      client_id: row.client_id,
      server_id: row.server_id,
      month: row.month,
      totalBudget: row.total_budget,
      categoryBudgets: row.category_budgets ? JSON.parse(row.category_budgets) : {},
      syncStatus: row.sync_status,
    };
  },

  async saveBudget(budgetData, isSyncPull = false) {
    const db = await getDatabase();
    const clientId = budgetData.client_id || budgetData.clientId || generateUUID();
    const serverId = budgetData.server_id || budgetData.serverId || budgetData._id || null;
    const now = new Date().toISOString();
    const month = budgetData.month || now.substring(0, 7);

    const catJson = typeof budgetData.categoryBudgets === 'object'
      ? JSON.stringify(budgetData.categoryBudgets)
      : budgetData.category_budgets || '{}';

    const existing = await db.getFirstAsync(
      `SELECT client_id, server_id FROM finance_budgets WHERE month = ?`,
      [month]
    );

    if (existing) {
      await db.runAsync(
        `UPDATE finance_budgets SET 
          total_budget = ?, category_budgets = ?, sync_status = ?, updated_at = ?
         WHERE client_id = ?`,
        [
          Number(budgetData.totalBudget || 0),
          catJson,
          isSyncPull ? 'SYNCED' : 'PENDING_UPDATE',
          now,
          existing.client_id,
        ]
      );
      if (!isSyncPull) {
        await SyncOutboxDao.enqueueMutation('finance_budget', 'UPDATE', existing.client_id, {
          ...budgetData,
          _id: existing.server_id || serverId,
        });
      }
      return existing.client_id;
    } else {
      await db.runAsync(
        `INSERT INTO finance_budgets (
          client_id, server_id, month, total_budget, category_budgets, sync_status, is_deleted, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?)`,
        [
          clientId,
          serverId,
          month,
          Number(budgetData.totalBudget || 0),
          catJson,
          isSyncPull ? 'SYNCED' : 'PENDING_CREATE',
          now,
          now,
        ]
      );
      if (!isSyncPull) {
        await SyncOutboxDao.enqueueMutation('finance_budget', 'CREATE', clientId, budgetData);
      }
      return clientId;
    }
  },
};

export default FinanceDao;
