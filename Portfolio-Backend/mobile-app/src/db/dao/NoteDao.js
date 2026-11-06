import { getDatabase } from '../database';
import { generateUUID } from '../../utils/uuid';
import { SyncOutboxDao } from './SyncOutboxDao';

export const DEFAULT_NOTE_CATEGORIES = [
  { name: 'General', color: '#7e37d8', icon: 'folder-outline' },
  { name: 'Personal', color: '#3b82f6', icon: 'person-outline' },
  { name: 'Work', color: '#10b981', icon: 'briefcase-outline' },
  { name: 'Ideas', color: '#f59e0b', icon: 'bulb-outline' },
  { name: 'Diet & Health', color: '#ec4899', icon: 'fitness-outline' },
  { name: 'Finance', color: '#06b5dd', icon: 'cash-outline' },
];

export const formatNoteRow = (row) => {
  if (!row) return null;
  const primaryId = row.server_id || row.client_id;
  let parsedTags = [];
  try {
    parsedTags = row.tags ? JSON.parse(row.tags) : [];
  } catch (e) {
    parsedTags = [];
  }

  return {
    _id: primaryId,
    id: primaryId,
    client_id: row.client_id,
    clientId: row.client_id,
    server_id: row.server_id,
    serverId: row.server_id,
    userId: row.user_id || 'admin',
    title: row.title,
    description: row.description || '',
    category: row.category || 'General',
    color: row.color || '#7e37d8',
    isPinned: Boolean(row.is_pinned),
    tags: parsedTags,
    syncStatus: row.sync_status || 'SYNCED',
    isDeleted: Boolean(row.is_deleted),
    deletedAt: row.deleted_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
};

export const NoteDao = {
  // ================= Notes =================

  async getNotes(filters = {}) {
    const { category, search, pinnedOnly } = filters;
    const db = await getDatabase();
    let sql = `SELECT * FROM notes WHERE is_deleted = 0`;
    const params = [];

    if (category && category !== 'All') {
      sql += ` AND category = ?`;
      params.push(category);
    }

    if (pinnedOnly) {
      sql += ` AND is_pinned = 1`;
    }

    if (search && search.trim()) {
      const q = `%${search.trim().toLowerCase()}%`;
      sql += ` AND (LOWER(title) LIKE ? OR LOWER(description) LIKE ? OR LOWER(tags) LIKE ?)`;
      params.push(q, q, q);
    }

    sql += ` ORDER BY is_pinned DESC, updated_at DESC`;

    const rows = await db.getAllAsync(sql, params);
    return rows.map(formatNoteRow);
  },

  async getNoteById(id) {
    if (!id) return null;
    const db = await getDatabase();
    const row = await db.getFirstAsync(
      `SELECT * FROM notes WHERE (client_id = ? OR server_id = ?) AND is_deleted = 0`,
      [id, id]
    );
    return row ? formatNoteRow(row) : null;
  },

  async saveNote(noteData, isSyncPull = false) {
    const db = await getDatabase();
    const clientId = noteData.client_id || noteData.clientId || generateUUID();
    const serverId = noteData.server_id || noteData.serverId || (noteData._id && String(noteData._id).length === 24 ? String(noteData._id) : null);
    const now = new Date().toISOString();

    const existing = await db.getFirstAsync(
      `SELECT client_id, server_id FROM notes WHERE client_id = ? OR (server_id IS NOT NULL AND server_id = ?)`,
      [clientId, serverId]
    );

    const tagsStr = Array.isArray(noteData.tags)
      ? JSON.stringify(noteData.tags)
      : typeof noteData.tags === 'string'
      ? noteData.tags
      : '[]';

    const isPinnedVal = noteData.isPinned || noteData.is_pinned ? 1 : 0;

    if (existing) {
      const targetClientId = existing.client_id;
      await db.runAsync(
        `UPDATE notes SET
          server_id = COALESCE(?, server_id),
          title = ?, description = ?, category = ?, color = ?,
          is_pinned = ?, tags = ?, sync_status = ?, is_deleted = ?,
          deleted_at = ?, updated_at = ?
         WHERE client_id = ?`,
        [
          serverId,
          noteData.title,
          noteData.description || '',
          noteData.category || 'General',
          noteData.color || '#7e37d8',
          isPinnedVal,
          tagsStr,
          isSyncPull ? 'SYNCED' : 'PENDING_UPDATE',
          noteData.isDeleted || noteData.is_deleted ? 1 : 0,
          noteData.deletedAt || noteData.deleted_at || null,
          noteData.updatedAt || now,
          targetClientId,
        ]
      );

      if (!isSyncPull) {
        await SyncOutboxDao.enqueueMutation('note', 'UPDATE', targetClientId, {
          ...noteData,
          _id: existing.server_id || serverId,
        });
      }
      return await NoteDao.getNoteById(targetClientId);
    } else {
      await db.runAsync(
        `INSERT INTO notes (
          client_id, server_id, user_id, title, description, category,
          color, is_pinned, tags, sync_status, is_deleted, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)`,
        [
          clientId,
          serverId,
          noteData.userId || 'admin',
          noteData.title,
          noteData.description || '',
          noteData.category || 'General',
          noteData.color || '#7e37d8',
          isPinnedVal,
          tagsStr,
          isSyncPull ? 'SYNCED' : 'PENDING_CREATE',
          noteData.createdAt || now,
          noteData.updatedAt || now,
        ]
      );

      if (!isSyncPull) {
        await SyncOutboxDao.enqueueMutation('note', 'CREATE', clientId, noteData);
      }
      return await NoteDao.getNoteById(clientId);
    }
  },

  async deleteNote(id, isSyncPull = false) {
    if (!id) return;
    const db = await getDatabase();
    const now = new Date().toISOString();
    const note = await NoteDao.getNoteById(id);
    if (!note) return;

    await db.runAsync(
      `UPDATE notes SET is_deleted = 1, deleted_at = ?, sync_status = ? WHERE client_id = ?`,
      [now, isSyncPull ? 'SYNCED' : 'PENDING_DELETE', note.client_id]
    );

    if (!isSyncPull) {
      await SyncOutboxDao.enqueueMutation('note', 'DELETE', note.client_id, {
        _id: note.server_id,
      });
    }
  },

  async togglePin(id) {
    if (!id) return null;
    const db = await getDatabase();
    const note = await NoteDao.getNoteById(id);
    if (!note) return null;

    const newPinned = note.isPinned ? 0 : 1;
    const now = new Date().toISOString();

    await db.runAsync(
      `UPDATE notes SET is_pinned = ?, updated_at = ?, sync_status = 'PENDING_UPDATE' WHERE client_id = ?`,
      [newPinned, now, note.client_id]
    );

    await SyncOutboxDao.enqueueMutation('note', 'UPDATE', note.client_id, {
      _id: note.server_id,
      isPinned: Boolean(newPinned),
    });

    return await NoteDao.getNoteById(note.client_id);
  },

  // ================= Categories =================

  async getCategories() {
    const db = await getDatabase();

    // 1. Check if categories table is empty; if so, auto-seed defaults
    const countRow = await db.getFirstAsync(`SELECT COUNT(*) as count FROM note_categories WHERE is_deleted = 0`);
    if (!countRow || countRow.count === 0) {
      const now = new Date().toISOString();
      for (const cat of DEFAULT_NOTE_CATEGORIES) {
        const cId = generateUUID();
        await db.runAsync(
          `INSERT OR IGNORE INTO note_categories (
            client_id, user_id, name, color, icon, sync_status, is_deleted, created_at, updated_at
          ) VALUES (?, 'admin', ?, ?, ?, 'SYNCED', 0, ?, ?)`,
          [cId, cat.name, cat.color, cat.icon, now, now]
        );
      }
    }

    const rows = await db.getAllAsync(
      `SELECT * FROM note_categories WHERE is_deleted = 0 ORDER BY created_at ASC`
    );

    // Compute note counts per category from local SQLite notes table
    const counts = await db.getAllAsync(
      `SELECT category, COUNT(*) as count FROM notes WHERE is_deleted = 0 GROUP BY category`
    );
    const countMap = {};
    counts.forEach((c) => {
      countMap[c.category] = c.count;
    });

    return rows.map((r) => ({
      _id: r.server_id || r.client_id,
      id: r.server_id || r.client_id,
      client_id: r.client_id,
      clientId: r.client_id,
      server_id: r.server_id,
      serverId: r.server_id,
      name: r.name,
      color: r.color || '#7e37d8',
      icon: r.icon || 'folder-outline',
      count: countMap[r.name] || 0,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    }));
  },

  async saveCategory(catData, isSyncPull = false) {
    const db = await getDatabase();
    const clientId = catData.client_id || catData.clientId || generateUUID();
    const serverId = catData.server_id || catData.serverId || (catData._id && String(catData._id).length === 24 ? String(catData._id) : null);
    const now = new Date().toISOString();

    const existing = await db.getFirstAsync(
      `SELECT client_id, server_id FROM note_categories WHERE client_id = ? OR (server_id IS NOT NULL AND server_id = ?) OR name = ?`,
      [clientId, serverId, catData.name]
    );

    if (existing) {
      await db.runAsync(
        `UPDATE note_categories SET
          server_id = COALESCE(?, server_id),
          name = ?, color = ?, icon = ?, is_deleted = 0, sync_status = ?, updated_at = ?
         WHERE client_id = ?`,
        [
          serverId,
          catData.name,
          catData.color || '#7e37d8',
          catData.icon || 'folder-outline',
          isSyncPull ? 'SYNCED' : 'PENDING_UPDATE',
          now,
          existing.client_id,
        ]
      );
      if (!isSyncPull) {
        await SyncOutboxDao.enqueueMutation('note_category', 'UPDATE', existing.client_id, {
          ...catData,
          _id: existing.server_id || serverId,
        });
      }
      return existing.client_id;
    } else {
      await db.runAsync(
        `INSERT INTO note_categories (
          client_id, server_id, user_id, name, color, icon, sync_status, is_deleted, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, ?)`,
        [
          clientId,
          serverId,
          catData.userId || 'admin',
          catData.name,
          catData.color || '#7e37d8',
          catData.icon || 'folder-outline',
          isSyncPull ? 'SYNCED' : 'PENDING_CREATE',
          now,
          now,
        ]
      );
      if (!isSyncPull) {
        await SyncOutboxDao.enqueueMutation('note_category', 'CREATE', clientId, catData);
      }
      return clientId;
    }
  },

  async deleteCategory(name, isSyncPull = false) {
    if (!name) return;
    const db = await getDatabase();
    const now = new Date().toISOString();

    const cat = await db.getFirstAsync(
      `SELECT * FROM note_categories WHERE name = ? AND is_deleted = 0`,
      [name]
    );
    if (!cat) return;

    await db.runAsync(
      `UPDATE note_categories SET is_deleted = 1, sync_status = ? WHERE client_id = ?`,
      [isSyncPull ? 'SYNCED' : 'PENDING_DELETE', cat.client_id]
    );

    // Reassign existing notes in this category to 'General'
    await db.runAsync(
      `UPDATE notes SET category = 'General', updated_at = ?, sync_status = 'PENDING_UPDATE' 
       WHERE category = ? AND is_deleted = 0`,
      [now, name]
    );

    if (!isSyncPull) {
      await SyncOutboxDao.enqueueMutation('note_category', 'DELETE', cat.client_id, {
        _id: cat.server_id,
        name,
      });
    }
  },
};

export default NoteDao;
