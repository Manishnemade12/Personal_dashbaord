import { getDatabase } from '../database';
import { generateUUID } from '../../utils/uuid';
import { SyncOutboxDao } from './SyncOutboxDao';

export const formatCalendarRow = (row) => {
  if (!row) return null;
  const primaryId = row.server_id || row.client_id;
  return {
    _id: primaryId,
    id: primaryId,
    client_id: row.client_id,
    clientId: row.client_id,
    server_id: row.server_id,
    serverId: row.server_id,
    userId: row.user_id || 'admin',
    name: row.name,
    description: row.description || '',
    color: row.color || '#7e37d8',
    isDefault: Boolean(row.is_default),
    isVisible: row.is_visible !== 0,
    isArchived: Boolean(row.is_archived),
    syncStatus: row.sync_status || 'SYNCED',
    isDeleted: Boolean(row.is_deleted),
    deletedAt: row.deleted_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
};

export const formatEventRow = (row) => {
  if (!row) return null;
  const primaryId = row.server_id || row.client_id;
  return {
    _id: primaryId,
    id: primaryId,
    client_id: row.client_id,
    clientId: row.client_id,
    server_id: row.server_id,
    serverId: row.server_id,
    calendarId: row.calendar_server_id || row.calendar_client_id,
    calendarClientId: row.calendar_client_id,
    calendarServerId: row.calendar_server_id,
    userId: row.user_id || 'admin',
    title: row.title,
    description: row.description || '',
    startAt: row.start_at,
    endAt: row.end_at,
    isAllDay: Boolean(row.is_all_day),
    color: row.color || '',
    location: row.location || '',
    priority: row.priority || 'medium',
    status: row.status || 'scheduled',
    recurrenceRule: row.recurrence_rule ? JSON.parse(row.recurrence_rule) : null,
    reminders: row.reminders_json ? JSON.parse(row.reminders_json) : [],
    syncStatus: row.sync_status || 'SYNCED',
    isDeleted: Boolean(row.is_deleted),
    deletedAt: row.deleted_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
};

export const CalendarDao = {
  // ================= Calendars =================

  async getCalendars() {
    const db = await getDatabase();
    const rows = await db.getAllAsync(
      `SELECT * FROM calendars WHERE is_deleted = 0 ORDER BY is_default DESC, name ASC`
    );
    return rows.map(formatCalendarRow);
  },

  async getCalendarById(id) {
    if (!id) return null;
    const db = await getDatabase();
    const row = await db.getFirstAsync(
      `SELECT * FROM calendars WHERE (client_id = ? OR server_id = ?) AND is_deleted = 0`,
      [id, id]
    );
    return row ? formatCalendarRow(row) : null;
  },

  async upsertCalendar(calData, isSyncPull = false) {
    const db = await getDatabase();
    const clientId = calData.client_id || calData.clientId || generateUUID();
    const serverId = calData.server_id || calData.serverId || calData._id || null;
    const now = new Date().toISOString();

    const existing = await db.getFirstAsync(
      `SELECT client_id, server_id FROM calendars WHERE client_id = ? OR (server_id IS NOT NULL AND server_id = ?)`,
      [clientId, serverId]
    );

    if (existing) {
      await db.runAsync(
        `UPDATE calendars SET 
          server_id = COALESCE(?, server_id),
          name = ?, description = ?, color = ?, is_default = ?, is_visible = ?, 
          sync_status = ?, is_deleted = ?, deleted_at = ?, updated_at = ?
         WHERE client_id = ?`,
        [
          serverId,
          calData.name,
          calData.description || '',
          calData.color || '#7e37d8',
          calData.is_default || calData.isDefault ? 1 : 0,
          calData.is_visible !== false && calData.isVisible !== false ? 1 : 0,
          isSyncPull ? 'SYNCED' : 'PENDING_UPDATE',
          calData.isDeleted || calData.is_deleted ? 1 : 0,
          calData.deletedAt || calData.deleted_at || null,
          now,
          existing.client_id,
        ]
      );
      if (!isSyncPull) {
        await SyncOutboxDao.enqueueMutation('calendar', 'UPDATE', existing.client_id, {
          ...calData,
          _id: existing.server_id || serverId,
        });
      }
      return existing.client_id;
    } else {
      await db.runAsync(
        `INSERT INTO calendars (
          client_id, server_id, user_id, name, description, color, is_default, is_visible,
          sync_status, is_deleted, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)`,
        [
          clientId,
          serverId,
          calData.userId || 'admin',
          calData.name,
          calData.description || '',
          calData.color || '#7e37d8',
          calData.is_default || calData.isDefault ? 1 : 0,
          calData.is_visible !== false && calData.isVisible !== false ? 1 : 0,
          isSyncPull ? 'SYNCED' : 'PENDING_CREATE',
          now,
          now,
        ]
      );
      if (!isSyncPull) {
        await SyncOutboxDao.enqueueMutation('calendar', 'CREATE', clientId, calData);
      }
      return clientId;
    }
  },

  async deleteCalendar(id, isSyncPull = false) {
    if (!id) return;
    const db = await getDatabase();
    const now = new Date().toISOString();
    const cal = await CalendarDao.getCalendarById(id);
    if (!cal) return;

    await db.runAsync(
      `UPDATE calendars SET is_deleted = 1, deleted_at = ?, sync_status = ? WHERE client_id = ?`,
      [now, isSyncPull ? 'SYNCED' : 'PENDING_DELETE', cal.client_id]
    );

    // Also mark all associated events deleted
    await db.runAsync(
      `UPDATE calendar_events SET is_deleted = 1, deleted_at = ?, sync_status = ? 
       WHERE calendar_client_id = ? OR (calendar_server_id IS NOT NULL AND calendar_server_id = ?)`,
      [now, isSyncPull ? 'SYNCED' : 'PENDING_DELETE', cal.client_id, cal.server_id || '']
    );

    if (!isSyncPull) {
      await SyncOutboxDao.enqueueMutation('calendar', 'DELETE', cal.client_id, {
        _id: cal.server_id,
      });
    }
  },

  // ================= Calendar Events =================

  async getEventsInRange(startIso, endIso, calendarClientId = null) {
    const db = await getDatabase();
    let sql = `SELECT * FROM calendar_events WHERE is_deleted = 0`;
    const params = [];

    if (startIso && endIso) {
      sql += ` AND start_at <= ? AND end_at >= ?`;
      params.push(endIso, startIso);
    }
    if (calendarClientId && calendarClientId !== 'all') {
      sql += ` AND (calendar_client_id = ? OR calendar_server_id = ?)`;
      params.push(calendarClientId, calendarClientId);
    }
    sql += ` ORDER BY start_at ASC`;

    const rows = await db.getAllAsync(sql, params);
    return rows.map(formatEventRow);
  },

  async getAllEvents() {
    const db = await getDatabase();
    const rows = await db.getAllAsync(
      `SELECT * FROM calendar_events WHERE is_deleted = 0 ORDER BY start_at ASC`
    );
    return rows.map(formatEventRow);
  },

  async getEventById(clientId) {
    const db = await getDatabase();
    const row = await db.getFirstAsync(
      `SELECT * FROM calendar_events WHERE client_id = ? OR server_id = ?`,
      [clientId, clientId]
    );
    return row ? formatEventRow(row) : null;
  },

  async saveEvent(eventData, isSyncPull = false) {
    const db = await getDatabase();
    const clientId = eventData.client_id || eventData.clientId || generateUUID();
    const serverId = eventData.server_id || eventData.serverId || eventData._id || null;
    const now = new Date().toISOString();

    // Cross-resolve calendar IDs if one of them is missing
    let calClientId = eventData.calendarClientId || null;
    let calServerId = eventData.calendarServerId || null;
    const rawCalId = eventData.calendarId?._id || eventData.calendarId || null;

    if (rawCalId && (!calClientId || !calServerId)) {
      try {
        const matchedCal = await db.getFirstAsync(
          `SELECT client_id, server_id FROM calendars WHERE client_id = ? OR server_id = ?`,
          [rawCalId, rawCalId]
        );
        if (matchedCal) {
          calClientId = calClientId || matchedCal.client_id;
          calServerId = calServerId || matchedCal.server_id;
        } else {
          if (!calClientId) calClientId = rawCalId;
          if (!calServerId && rawCalId.length === 24) calServerId = rawCalId;
        }
      } catch (e) {
        calClientId = calClientId || rawCalId;
      }
    }

    const existing = await db.getFirstAsync(
      `SELECT client_id, server_id FROM calendar_events WHERE client_id = ? OR (server_id IS NOT NULL AND server_id = ?)`,
      [clientId, serverId]
    );

    const recurrenceStr = typeof eventData.recurrenceRule === 'object'
      ? JSON.stringify(eventData.recurrenceRule)
      : eventData.recurrence_rule || null;

    const remindersStr = Array.isArray(eventData.reminders)
      ? JSON.stringify(eventData.reminders)
      : eventData.reminders_json || '[]';

    if (existing) {
      const targetClientId = existing.client_id;
      await db.runAsync(
        `UPDATE calendar_events SET
          server_id = COALESCE(?, server_id),
          calendar_client_id = COALESCE(?, calendar_client_id),
          calendar_server_id = COALESCE(?, calendar_server_id),
          title = ?, description = ?, start_at = ?, end_at = ?, is_all_day = ?,
          color = ?, location = ?, priority = ?, status = ?, recurrence_rule = ?,
          reminders_json = ?, sync_status = ?, is_deleted = ?, deleted_at = ?, updated_at = ?
         WHERE client_id = ?`,
        [
          serverId,
          calClientId,
          calServerId,
          eventData.title,
          eventData.description || '',
          new Date(eventData.startAt || eventData.start_at).toISOString(),
          new Date(eventData.endAt || eventData.end_at).toISOString(),
          eventData.isAllDay || eventData.is_all_day ? 1 : 0,
          eventData.color || '',
          eventData.location || '',
          eventData.priority || 'medium',
          eventData.status || 'scheduled',
          recurrenceStr,
          remindersStr,
          isSyncPull ? 'SYNCED' : 'PENDING_UPDATE',
          eventData.isDeleted || eventData.is_deleted ? 1 : 0,
          eventData.deletedAt || eventData.deleted_at || null,
          now,
          targetClientId,
        ]
      );

      if (!isSyncPull) {
        await SyncOutboxDao.enqueueMutation('calendar_event', 'UPDATE', targetClientId, {
          ...eventData,
          _id: existing.server_id || serverId,
        });
      }
      return await CalendarDao.getEventById(targetClientId);
    } else {
      await db.runAsync(
        `INSERT INTO calendar_events (
          client_id, server_id, calendar_client_id, calendar_server_id, user_id,
          title, description, start_at, end_at, is_all_day, color, location,
          priority, status, recurrence_rule, reminders_json, sync_status, is_deleted,
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)`,
        [
          clientId,
          serverId,
          calClientId || '',
          calServerId || '',
          eventData.userId || 'admin',
          eventData.title,
          eventData.description || '',
          new Date(eventData.startAt || eventData.start_at).toISOString(),
          new Date(eventData.endAt || eventData.end_at).toISOString(),
          eventData.isAllDay || eventData.is_all_day ? 1 : 0,
          eventData.color || '',
          eventData.location || '',
          eventData.priority || 'medium',
          eventData.status || 'scheduled',
          recurrenceStr,
          remindersStr,
          isSyncPull ? 'SYNCED' : 'PENDING_CREATE',
          now,
          now,
        ]
      );

      if (!isSyncPull) {
        await SyncOutboxDao.enqueueMutation('calendar_event', 'CREATE', clientId, eventData);
      }
      return await CalendarDao.getEventById(clientId);
    }
  },

  async deleteEvent(clientId, isSyncPull = false) {
    const db = await getDatabase();
    const now = new Date().toISOString();
    const event = await CalendarDao.getEventById(clientId);
    if (!event) return;

    await db.runAsync(
      `UPDATE calendar_events SET is_deleted = 1, deleted_at = ?, sync_status = ? WHERE client_id = ?`,
      [now, isSyncPull ? 'SYNCED' : 'PENDING_DELETE', event.client_id]
    );

    // Also mark associated reminders deleted
    await db.runAsync(
      `UPDATE event_reminders SET is_deleted = 1, updated_at = ? WHERE event_client_id = ?`,
      [now, event.client_id]
    );

    if (!isSyncPull) {
      await SyncOutboxDao.enqueueMutation('calendar_event', 'DELETE', event.client_id, {
        _id: event.server_id,
      });
    }
  },

  async clearAllEvents(calendarId = null) {
    const db = await getDatabase();
    const now = new Date().toISOString();
    if (calendarId && calendarId !== 'all') {
      await db.runAsync(
        `UPDATE calendar_events SET is_deleted = 1, deleted_at = ?, sync_status = 'PENDING_DELETE' 
         WHERE calendar_client_id = ? OR calendar_server_id = ?`,
        [now, calendarId, calendarId]
      );
    } else {
      await db.runAsync(
        `UPDATE calendar_events SET is_deleted = 1, deleted_at = ?, sync_status = 'PENDING_DELETE'`
      );
    }
  },
};

export default CalendarDao;
