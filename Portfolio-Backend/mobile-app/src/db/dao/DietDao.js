import { getDatabase } from '../database';
import { generateUUID } from '../../utils/uuid';
import { SyncOutboxDao } from './SyncOutboxDao';

export const DietDao = {
  // ================= Diet Items Library =================

  async getDietItems(category = null, search = '') {
    const db = await getDatabase();
    let sql = `SELECT * FROM diet_items WHERE is_deleted = 0`;
    const params = [];

    if (category && category !== 'All') {
      sql += ` AND category = ?`;
      params.push(category);
    }
    if (search && search.trim()) {
      sql += ` AND name LIKE ?`;
      params.push(`%${search.trim()}%`);
    }

    sql += ` ORDER BY name ASC`;
    const rows = await db.getAllAsync(sql, params);
    return rows.map((r) => ({
      _id: r.server_id || r.client_id,
      client_id: r.client_id,
      server_id: r.server_id,
      name: r.name,
      calories: r.calories,
      protein: r.protein,
      carbs: r.carbs,
      fats: r.fats,
      servingSize: r.serving_size,
      category: r.category,
      ingredients: r.ingredients ? JSON.parse(r.ingredients) : [],
      syncStatus: r.sync_status,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    }));
  },

  async saveDietItem(itemData, isSyncPull = false) {
    const db = await getDatabase();
    const clientId = itemData.client_id || itemData.clientId || generateUUID();
    const serverId = itemData.server_id || itemData.serverId || itemData._id || null;
    const now = new Date().toISOString();

    const existing = await db.getFirstAsync(
      `SELECT client_id, server_id FROM diet_items WHERE client_id = ? OR (server_id IS NOT NULL AND server_id = ?)`,
      [clientId, serverId]
    );

    const ingredientsStr = typeof itemData.ingredients === 'object'
      ? JSON.stringify(itemData.ingredients)
      : itemData.ingredients || '[]';

    if (existing) {
      const targetClientId = existing.client_id;
      await db.runAsync(
        `UPDATE diet_items SET
          server_id = COALESCE(?, server_id),
          name = ?, calories = ?, protein = ?, carbs = ?, fats = ?,
          serving_size = ?, category = ?, ingredients = ?,
          sync_status = ?, is_deleted = ?, updated_at = ?
         WHERE client_id = ?`,
        [
          serverId,
          itemData.name,
          Number(itemData.calories || 0),
          Number(itemData.protein || 0),
          Number(itemData.carbs || 0),
          Number(itemData.fats || 0),
          itemData.servingSize || itemData.serving_size || '',
          itemData.category || 'General',
          ingredientsStr,
          isSyncPull ? 'SYNCED' : 'PENDING_UPDATE',
          itemData.isDeleted || itemData.is_deleted ? 1 : 0,
          now,
          targetClientId,
        ]
      );
      if (!isSyncPull) {
        await SyncOutboxDao.enqueueMutation('diet_item', 'UPDATE', targetClientId, {
          ...itemData,
          _id: existing.server_id || serverId,
        });
      }
      return targetClientId;
    } else {
      await db.runAsync(
        `INSERT INTO diet_items (
          client_id, server_id, name, calories, protein, carbs, fats,
          serving_size, category, ingredients, sync_status, is_deleted, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)`,
        [
          clientId,
          serverId,
          itemData.name,
          Number(itemData.calories || 0),
          Number(itemData.protein || 0),
          Number(itemData.carbs || 0),
          Number(itemData.fats || 0),
          itemData.servingSize || itemData.serving_size || '',
          itemData.category || 'General',
          ingredientsStr,
          isSyncPull ? 'SYNCED' : 'PENDING_CREATE',
          now,
          now,
        ]
      );
      if (!isSyncPull) {
        await SyncOutboxDao.enqueueMutation('diet_item', 'CREATE', clientId, itemData);
      }
      return clientId;
    }
  },

  async deleteDietItem(clientId, isSyncPull = false) {
    const db = await getDatabase();
    const existing = await db.getFirstAsync(
      `SELECT client_id, server_id FROM diet_items WHERE client_id = ? OR server_id = ?`,
      [clientId, clientId]
    );
    if (!existing) return;

    await db.runAsync(
      `UPDATE diet_items SET is_deleted = 1, sync_status = ? WHERE client_id = ?`,
      [isSyncPull ? 'SYNCED' : 'PENDING_DELETE', existing.client_id]
    );

    if (!isSyncPull) {
      await SyncOutboxDao.enqueueMutation('diet_item', 'DELETE', existing.client_id, {
        _id: existing.server_id,
      });
    }
  },

  // ================= Daily Meal Logs =================

  async getDailyMealLogs(dateStr) {
    const db = await getDatabase();
    const rows = await db.getAllAsync(
      `SELECT * FROM diet_meal_logs WHERE date = ? AND is_deleted = 0 ORDER BY scheduled_time ASC`,
      [dateStr]
    );
    return rows.map((r) => ({
      _id: r.server_id || r.client_id,
      client_id: r.client_id,
      server_id: r.server_id,
      date: r.date,
      mealType: r.meal_type,
      customTitle: r.custom_title,
      calories: r.calories,
      protein: r.protein,
      carbs: r.carbs,
      fats: r.fats,
      status: r.status,
      scheduledTime: r.scheduled_time,
      calendarEventClientId: r.calendar_event_client_id,
      syncStatus: r.sync_status,
      createdAt: r.created_at,
    }));
  },

  async saveMealLog(mealData, isSyncPull = false) {
    const db = await getDatabase();
    const clientId = mealData.client_id || mealData.clientId || generateUUID();
    const serverId = mealData.server_id || mealData.serverId || mealData._id || null;
    const now = new Date().toISOString();

    const existing = await db.getFirstAsync(
      `SELECT client_id, server_id FROM diet_meal_logs WHERE client_id = ? OR (server_id IS NOT NULL AND server_id = ?)`,
      [clientId, serverId]
    );

    if (existing) {
      await db.runAsync(
        `UPDATE diet_meal_logs SET
          server_id = COALESCE(?, server_id),
          date = ?, meal_type = ?, custom_title = ?, calories = ?,
          protein = ?, carbs = ?, fats = ?, status = ?, scheduled_time = ?,
          sync_status = ?, is_deleted = ?, updated_at = ?
         WHERE client_id = ?`,
        [
          serverId,
          mealData.date,
          mealData.mealType || mealData.meal_type || 'Lunch',
          mealData.customTitle || mealData.custom_title || '',
          Number(mealData.calories || 0),
          Number(mealData.protein || 0),
          Number(mealData.carbs || 0),
          Number(mealData.fats || 0),
          mealData.status || 'pending',
          mealData.scheduledTime || mealData.scheduled_time || '',
          isSyncPull ? 'SYNCED' : 'PENDING_UPDATE',
          mealData.isDeleted || mealData.is_deleted ? 1 : 0,
          now,
          existing.client_id,
        ]
      );
      if (!isSyncPull) {
        await SyncOutboxDao.enqueueMutation('diet_meal_log', 'UPDATE', existing.client_id, {
          ...mealData,
          _id: existing.server_id || serverId,
        });
      }
      return existing.client_id;
    } else {
      await db.runAsync(
        `INSERT INTO diet_meal_logs (
          client_id, server_id, calendar_event_client_id, date, meal_type, custom_title,
          calories, protein, carbs, fats, status, scheduled_time, sync_status, is_deleted, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)`,
        [
          clientId,
          serverId,
          mealData.calendarEventClientId || null,
          mealData.date,
          mealData.mealType || mealData.meal_type || 'Lunch',
          mealData.customTitle || mealData.custom_title || '',
          Number(mealData.calories || 0),
          Number(mealData.protein || 0),
          Number(mealData.carbs || 0),
          Number(mealData.fats || 0),
          mealData.status || 'pending',
          mealData.scheduledTime || mealData.scheduled_time || '',
          isSyncPull ? 'SYNCED' : 'PENDING_CREATE',
          now,
          now,
        ]
      );
      if (!isSyncPull) {
        await SyncOutboxDao.enqueueMutation('diet_meal_log', 'CREATE', clientId, mealData);
      }
      return clientId;
    }
  },

  async toggleMealStatus(clientId) {
    const db = await getDatabase();
    const existing = await db.getFirstAsync(
      `SELECT client_id, server_id, status FROM diet_meal_logs WHERE client_id = ? OR server_id = ?`,
      [clientId, clientId]
    );
    if (!existing) return null;

    const newStatus = existing.status === 'eaten' ? 'pending' : 'eaten';
    const now = new Date().toISOString();

    await db.runAsync(
      `UPDATE diet_meal_logs SET status = ?, sync_status = 'PENDING_UPDATE', updated_at = ? WHERE client_id = ?`,
      [newStatus, now, existing.client_id]
    );

    await SyncOutboxDao.enqueueMutation('diet_meal_log', 'UPDATE', existing.client_id, {
      _id: existing.server_id,
      status: newStatus,
    });

    return newStatus;
  },

  // ================= Calories Visuals (Local SQL Aggregate) =================

  async getCalorieHistory(startDate, endDate) {
    const db = await getDatabase();
    const rows = await db.getAllAsync(
      `SELECT date, SUM(calories) as total_calories 
       FROM diet_meal_logs 
       WHERE date >= ? AND date <= ? AND is_deleted = 0 AND status = 'eaten'
       GROUP BY date 
       ORDER BY date ASC`,
      [startDate, endDate]
    );

    return rows.map((r) => ({
      date: r.date,
      calories: Math.round(r.total_calories || 0),
    }));
  },
};

export default DietDao;

