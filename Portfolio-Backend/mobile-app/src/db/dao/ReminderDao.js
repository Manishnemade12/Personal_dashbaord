import { getDatabase } from '../database';
import { generateUUID } from '../../utils/uuid';

export const ReminderDao = {
  async getRemindersForEvent(eventClientId) {
    const db = await getDatabase();
    return await db.getAllAsync(
      `SELECT * FROM event_reminders 
       WHERE event_client_id = ? AND is_deleted = 0 
       ORDER BY offset_minutes ASC`,
      [eventClientId]
    );
  },

  async getUpcomingActiveReminders(horizonIso = null) {
    const db = await getDatabase();
    const nowIso = new Date().toISOString();
    let sql = `SELECT r.*, e.title as event_title, e.start_at as event_start_at, e.is_all_day 
               FROM event_reminders r
               JOIN calendar_events e ON r.event_client_id = e.client_id
               WHERE r.is_deleted = 0 
                 AND e.is_deleted = 0 
                 AND e.status != 'cancelled'
                 AND r.scheduled_trigger_time >= ?`;
    const params = [nowIso];

    if (horizonIso) {
      sql += ` AND r.scheduled_trigger_time <= ?`;
      params.push(horizonIso);
    }

    sql += ` ORDER BY r.scheduled_trigger_time ASC`;
    return await db.getAllAsync(sql, params);
  },

  async upsertReminder(remData) {
    const db = await getDatabase();
    const clientId = remData.client_id || remData.clientId || generateUUID();
    const now = new Date().toISOString();

    const existing = await db.getFirstAsync(
      `SELECT client_id FROM event_reminders WHERE client_id = ? OR (event_client_id = ? AND offset_minutes = ?)`,
      [clientId, remData.event_client_id, remData.offset_minutes]
    );

    if (existing) {
      await db.runAsync(
        `UPDATE event_reminders SET 
          offset_minutes = ?, reminder_type = ?, is_enabled = ?, 
          scheduled_trigger_time = ?, native_notification_id = COALESCE(?, native_notification_id),
          is_deleted = ?, updated_at = ?
         WHERE client_id = ?`,
        [
          remData.offset_minutes,
          remData.reminder_type || 'notification',
          remData.is_enabled !== false ? 1 : 0,
          remData.scheduled_trigger_time,
          remData.native_notification_id || null,
          remData.is_deleted ? 1 : 0,
          now,
          existing.client_id,
        ]
      );
      return existing.client_id;
    } else {
      await db.runAsync(
        `INSERT INTO event_reminders (
          client_id, server_id, event_client_id, offset_minutes, reminder_type,
          is_enabled, scheduled_trigger_time, native_notification_id, is_delivered,
          is_deleted, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, 0, ?, ?)`,
        [
          clientId,
          remData.server_id || null,
          remData.event_client_id,
          remData.offset_minutes,
          remData.reminder_type || 'notification',
          remData.is_enabled !== false ? 1 : 0,
          remData.scheduled_trigger_time,
          remData.native_notification_id || null,
          now,
          now,
        ]
      );
      return clientId;
    }
  },

  async updateNativeNotificationId(clientId, nativeId) {
    const db = await getDatabase();
    await db.runAsync(
      `UPDATE event_reminders SET native_notification_id = ?, updated_at = ? WHERE client_id = ?`,
      [nativeId, new Date().toISOString(), clientId]
    );
  },

  async markDelivered(clientId) {
    const db = await getDatabase();
    await db.runAsync(
      `UPDATE event_reminders SET is_delivered = 1, delivered_at = ?, updated_at = ? WHERE client_id = ?`,
      [new Date().toISOString(), new Date().toISOString(), clientId]
    );
  },

  async deleteRemindersForEvent(eventClientId) {
    const db = await getDatabase();
    await db.runAsync(
      `UPDATE event_reminders SET is_deleted = 1, updated_at = ? WHERE event_client_id = ?`,
      [new Date().toISOString(), eventClientId]
    );
  },
};

export default ReminderDao;

