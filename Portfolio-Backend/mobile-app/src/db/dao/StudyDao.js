import { getDatabase } from '../database';
import { generateUUID } from '../../utils/uuid';
import { SyncOutboxDao } from './SyncOutboxDao';

/**
 * Stable hash for a question (subject-scoped).
 * Uses a fast non-crypto 64-bit style hash on the normalized question text
 * so identical questions collide regardless of option order or minor whitespace.
 */
export function questionHash(q) {
  const text = (typeof q === 'string' ? q : q?.question || '').trim().toLowerCase().replace(/\s+/g, ' ');
  let h1 = 0xdeadbeef ^ 0;
  let h2 = 0x41c6ce57 ^ 0;
  for (let i = 0; i < text.length; i++) {
    const ch = text.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(16).padStart(13, '0');
}

export const formatFieldRow = (row) => {
  if (!row) return null;
  const id = row.server_id || row.client_id;
  return {
    _id: id,
    id: id,
    client_id: row.client_id,
    clientId: row.client_id,
    server_id: row.server_id,
    serverId: row.server_id,
    userId: row.user_id || 'admin',
    name: row.name,
    code: row.code || '',
    description: row.description || '',
    icon: row.icon || 'school-outline',
    color: row.color || '#6366f1',
    isDefault: Boolean(row.is_default),
    orderIndex: row.order_index ?? 0,
    syncStatus: row.sync_status || 'SYNCED',
    isDeleted: Boolean(row.is_deleted),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
};

export const formatSubjectRow = (row) => {
  if (!row) return null;
  const id = row.server_id || row.client_id;
  return {
    _id: id,
    id: id,
    client_id: row.client_id,
    clientId: row.client_id,
    server_id: row.server_id,
    serverId: row.server_id,
    userId: row.user_id || 'admin',
    fieldId: row.field_id || 'field_ssc',
    field_id: row.field_id || 'field_ssc',
    name: row.name,
    description: row.description || '',
    orderIndex: row.order_index ?? 0,
    syncStatus: row.sync_status || 'SYNCED',
    isDeleted: Boolean(row.is_deleted),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
};

export const formatChunkRow = (row, quizQuestions = []) => {
  if (!row) return null;
  const id = row.server_id || row.client_id;
  let keyPoints = [];
  try {
    keyPoints = row.key_points ? JSON.parse(row.key_points) : [];
  } catch (e) {
    keyPoints = [];
  }

  let terms = [];
  try {
    terms = row.terms ? JSON.parse(row.terms) : [];
  } catch (e) {
    terms = [];
  }

  return {
    _id: id,
    id: id,
    client_id: row.client_id,
    clientId: row.client_id,
    server_id: row.server_id,
    serverId: row.server_id,
    userId: row.user_id || 'admin',
    subjectId: row.subject_id,
    parentChunkId: row.parent_chunk_id || null,
    title: row.title,
    orderIndex: row.order_index ?? 0,
    order: row.order_index ?? 0,
    summary: row.summary || '',
    notes: row.notes || '',
    keyPoints,
    terms,
    quiz: quizQuestions,
    revised: Boolean(row.revised),
    syncStatus: row.sync_status || 'SYNCED',
    isDeleted: Boolean(row.is_deleted),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
};

export const formatQuizQuestionRow = (row) => {
  if (!row) return null;
  const id = row.server_id || row.client_id;
  let options = [];
  try {
    options = row.options ? JSON.parse(row.options) : [];
  } catch (e) {
    options = [];
  }

  return {
    _id: id,
    id: id,
    client_id: row.client_id,
    clientId: row.client_id,
    server_id: row.server_id,
    serverId: row.server_id,
    chunkId: row.chunk_id,
    question: row.question,
    type: row.type || 'mcq',
    options,
    answer: row.answer,
    explanation: row.explanation || '',
    orderIndex: row.order_index ?? 0,
  };
};

export const formatDailyQuizRow = (row) => {
  if (!row) return null;
  const id = row.server_id || row.client_id;
  let questions = [];
  try {
    questions = row.questions ? JSON.parse(row.questions) : [];
  } catch (e) {
    questions = [];
  }

  return {
    _id: id,
    id: id,
    client_id: row.client_id,
    clientId: row.client_id,
    server_id: row.server_id,
    serverId: row.server_id,
    userId: row.user_id || 'admin',
    subjectId: row.subject_id,
    subject_id: row.subject_id,
    quizDate: row.quiz_date,
    quiz_date: row.quiz_date,
    questions,
    totalQuestions: row.total_questions || questions.length,
    total_questions: row.total_questions || questions.length,
    difficulty: row.difficulty || 'medium',
    source: row.source || 'ai',
    syncStatus: row.sync_status || 'SYNCED',
    createdAt: row.created_at,
    created_at: row.created_at,
    updatedAt: row.updated_at,
  };
};

export const formatAttemptRow = (row) => {
  if (!row) return null;
  const id = row.server_id || row.client_id;
  let answers = [];
  try {
    answers = row.answers ? JSON.parse(row.answers) : [];
  } catch (e) {
    answers = [];
  }

  return {
    _id: id,
    id: id,
    client_id: row.client_id,
    clientId: row.client_id,
    server_id: row.server_id,
    serverId: row.server_id,
    userId: row.user_id || 'admin',
    dailyQuizId: row.daily_quiz_id,
    daily_quiz_id: row.daily_quiz_id,
    subjectId: row.subject_id,
    subject_id: row.subject_id,
    quizDate: row.quiz_date,
    quiz_date: row.quiz_date,
    answers,
    score: row.score,
    totalQuestions: row.total_questions,
    total_questions: row.total_questions,
    percentage: row.percentage,
    timeTaken: row.time_taken,
    time_taken: row.time_taken,
    completed: Boolean(row.completed),
    startedAt: row.started_at,
    started_at: row.started_at,
    completedAt: row.completed_at,
    completed_at: row.completed_at,
    createdAt: row.created_at,
  };
};

export const StudyDao = {
  // ================= 0. FIELDS / FOLDERS =================

  async getFields(userId = 'admin') {
    const db = await getDatabase();
    const rows = await db.getAllAsync(
      `SELECT * FROM study_fields WHERE is_deleted = 0 AND (user_id = ? OR user_id = 'admin') ORDER BY order_index ASC, created_at ASC`,
      [userId]
    );
    return rows.map(formatFieldRow);
  },

  async getFieldById(fieldId) {
    if (!fieldId) return null;
    const db = await getDatabase();
    const row = await db.getFirstAsync(
      `SELECT * FROM study_fields WHERE (client_id = ? OR server_id = ?) AND is_deleted = 0`,
      [fieldId, fieldId]
    );
    return row ? formatFieldRow(row) : null;
  },

  async createField({ name, description = '', icon = 'school-outline', color = '#6366f1', code = '' }, userId = 'admin', isSyncPull = false) {
    const db = await getDatabase();
    const trimmed = (name || '').trim();
    if (!trimmed) throw new Error('Field name is required');

    const existing = await db.getFirstAsync(
      `SELECT * FROM study_fields WHERE LOWER(name) = LOWER(?) AND is_deleted = 0 AND (user_id = ? OR user_id = 'admin')`,
      [trimmed, userId]
    );
    if (existing) {
      return formatFieldRow(existing);
    }

    const clientId = generateUUID();
    const now = new Date().toISOString();
    const maxOrder = await db.getFirstAsync(
      `SELECT MAX(order_index) as max_ord FROM study_fields WHERE is_deleted = 0 AND (user_id = ? OR user_id = 'admin')`,
      [userId]
    );
    const nextOrder = (maxOrder?.max_ord ?? -1) + 1;
    const cleanCode = code ? code.trim() : trimmed.toLowerCase().replace(/\s+/g, '_');

    await db.runAsync(
      `INSERT INTO study_fields (client_id, user_id, name, code, description, icon, color, is_default, order_index, sync_status, is_deleted, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, ?, 0, ?, ?)`,
      [clientId, userId, trimmed, cleanCode, description, icon, color, nextOrder, isSyncPull ? 'SYNCED' : 'PENDING', now, now]
    );

    const inserted = await db.getFirstAsync(`SELECT * FROM study_fields WHERE client_id = ?`, [clientId]);
    const formatted = formatFieldRow(inserted);

    if (!isSyncPull) {
      await SyncOutboxDao.enqueue('CREATE', 'study_field', clientId, {
        name: trimmed,
        code: cleanCode,
        description,
        icon,
        color,
        orderIndex: nextOrder,
        userId,
      });
    }

    return formatted;
  },

  async updateField(fieldId, updates = {}, userId = 'admin', isSyncPull = false) {
    if (!fieldId) return null;
    const db = await getDatabase();
    const now = new Date().toISOString();

    const target = await db.getFirstAsync(
      `SELECT client_id, server_id, name, code, description, icon, color FROM study_fields WHERE client_id = ? OR server_id = ?`,
      [fieldId, fieldId]
    );
    if (!target) return null;

    const newName = updates.name !== undefined ? updates.name.trim() : target.name;
    const newDesc = updates.description !== undefined ? updates.description : target.description;
    const newIcon = updates.icon !== undefined ? updates.icon : target.icon;
    const newColor = updates.color !== undefined ? updates.color : target.color;
    const newCode = updates.code !== undefined ? updates.code : target.code;

    await db.runAsync(
      `UPDATE study_fields SET name = ?, code = ?, description = ?, icon = ?, color = ?, sync_status = ?, updated_at = ? WHERE client_id = ?`,
      [newName, newCode, newDesc, newIcon, newColor, isSyncPull ? 'SYNCED' : 'PENDING', now, target.client_id]
    );

    if (!isSyncPull) {
      await SyncOutboxDao.enqueue('UPDATE', 'study_field', target.client_id, {
        name: newName,
        code: newCode,
        description: newDesc,
        icon: newIcon,
        color: newColor,
        userId,
      }, target.server_id);
    }

    const updated = await db.getFirstAsync(`SELECT * FROM study_fields WHERE client_id = ?`, [target.client_id]);
    return formatFieldRow(updated);
  },

  async deleteField(fieldId, userId = 'admin', isSyncPull = false) {
    if (!fieldId) return;
    const db = await getDatabase();
    const now = new Date().toISOString();

    const target = await db.getFirstAsync(
      `SELECT client_id, server_id, is_default FROM study_fields WHERE client_id = ? OR server_id = ?`,
      [fieldId, fieldId]
    );
    if (!target) return;
    if (target.is_default) {
      throw new Error('Default folder cannot be deleted');
    }

    await db.runAsync(
      `UPDATE study_fields SET is_deleted = 1, deleted_at = ?, sync_status = ?, updated_at = ? WHERE client_id = ?`,
      [now, isSyncPull ? 'SYNCED' : 'PENDING', now, target.client_id]
    );

    // Reassign subjects of this field to default field_ssc so data is safely retained
    await db.runAsync(
      `UPDATE study_subjects SET field_id = 'field_ssc', sync_status = 'PENDING', updated_at = ? WHERE field_id = ?`,
      [now, target.client_id]
    );

    if (!isSyncPull) {
      await SyncOutboxDao.enqueue('DELETE', 'study_field', target.client_id, {}, target.server_id);
    }
  },

  // ================= 1. SUBJECTS =================

  async getSubjects(userId = 'admin', fieldId = null) {
    const db = await getDatabase();
    let sql = `SELECT * FROM study_subjects WHERE is_deleted = 0 AND (user_id = ? OR user_id = 'admin')`;
    const params = [userId];
    if (fieldId) {
      if (fieldId === 'field_ssc') {
        sql += ` AND (field_id = ? OR field_id IS NULL OR field_id = '')`;
        params.push(fieldId);
      } else {
        sql += ` AND field_id = ?`;
        params.push(fieldId);
      }
    }
    sql += ` ORDER BY order_index ASC, created_at ASC`;
    const rows = await db.getAllAsync(sql, params);
    return rows.map(formatSubjectRow);
  },

  async getSubjectById(subjectId) {
    if (!subjectId) return null;
    const db = await getDatabase();
    const row = await db.getFirstAsync(
      `SELECT * FROM study_subjects WHERE (client_id = ? OR server_id = ?) AND is_deleted = 0`,
      [subjectId, subjectId]
    );
    return row ? formatSubjectRow(row) : null;
  },

  async createSubject(name, description = '', userId = 'admin', isSyncPull = false, fieldId = 'field_ssc') {
    const db = await getDatabase();
    const trimmed = (name || '').trim();
    if (!trimmed) throw new Error('Subject name is required');

    // Case-insensitive check for existing subject in same field
    const existing = await db.getFirstAsync(
      `SELECT * FROM study_subjects WHERE LOWER(name) = LOWER(?) AND is_deleted = 0 AND (user_id = ? OR user_id = 'admin') AND (field_id = ? OR (field_id IS NULL AND ? = 'field_ssc'))`,
      [trimmed, userId, fieldId, fieldId]
    );
    if (existing) {
      return formatSubjectRow(existing);
    }

    const clientId = generateUUID();
    const now = new Date().toISOString();

    const maxOrder = await db.getFirstAsync(
      `SELECT MAX(order_index) as max_ord FROM study_subjects WHERE is_deleted = 0 AND (user_id = ? OR user_id = 'admin')`,
      [userId]
    );
    const nextOrder = (maxOrder?.max_ord ?? -1) + 1;

    await db.runAsync(
      `INSERT INTO study_subjects (client_id, user_id, field_id, name, description, order_index, sync_status, is_deleted, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, ?)`,
      [clientId, userId, fieldId, trimmed, description, nextOrder, isSyncPull ? 'SYNCED' : 'PENDING', now, now]
    );

    const inserted = await db.getFirstAsync(`SELECT * FROM study_subjects WHERE client_id = ?`, [clientId]);
    const formatted = formatSubjectRow(inserted);

    if (!isSyncPull) {
      await SyncOutboxDao.enqueue('CREATE', 'study_subject', clientId, {
        name: trimmed,
        fieldId,
        description,
        orderIndex: nextOrder,
        userId,
      });
    }

    return formatted;
  },

  async deleteSubject(subjectId, userId = 'admin', isSyncPull = false) {
    if (!subjectId) return;
    const db = await getDatabase();
    const now = new Date().toISOString();

    const target = await db.getFirstAsync(
      `SELECT client_id, server_id FROM study_subjects WHERE client_id = ? OR server_id = ?`,
      [subjectId, subjectId]
    );
    if (!target) return;

    // Soft delete subject
    await db.runAsync(
      `UPDATE study_subjects SET is_deleted = 1, deleted_at = ?, sync_status = ?, updated_at = ? WHERE client_id = ?`,
      [now, isSyncPull ? 'SYNCED' : 'PENDING', now, target.client_id]
    );

    // Soft delete all chunks under this subject
    await db.runAsync(
      `UPDATE study_chunks SET is_deleted = 1, deleted_at = ?, sync_status = ?, updated_at = ? WHERE subject_id = ? OR subject_id = ?`,
      [now, isSyncPull ? 'SYNCED' : 'PENDING', now, target.client_id, target.server_id || '']
    );

    if (!isSyncPull) {
      await SyncOutboxDao.enqueue('DELETE', 'study_subject', target.client_id, {}, target.server_id);
    }
  },

  // ================= 2. CHUNKS & IN-CHUNK QUIZZES =================

  async getChunks(subjectId = null, userId = 'admin', fieldId = null) {
    const db = await getDatabase();
    let sql = `SELECT * FROM study_chunks WHERE is_deleted = 0 AND (user_id = ? OR user_id = 'admin')`;
    const params = [userId];

    if (subjectId) {
      sql += ` AND (subject_id = ? OR subject_id IN (SELECT client_id FROM study_subjects WHERE server_id = ?))`;
      params.push(subjectId, subjectId);
    } else if (fieldId) {
      if (fieldId === 'field_ssc') {
        sql += ` AND subject_id IN (SELECT client_id FROM study_subjects WHERE is_deleted = 0 AND (field_id = ? OR field_id IS NULL OR field_id = ''))`;
        params.push(fieldId);
      } else {
        sql += ` AND subject_id IN (SELECT client_id FROM study_subjects WHERE is_deleted = 0 AND field_id = ?)`;
        params.push(fieldId);
      }
    }

    sql += ` ORDER BY order_index ASC, created_at ASC`;
    const chunkRows = await db.getAllAsync(sql, params);

    // Fetch quiz questions for these chunks
    const chunkIds = chunkRows.map((r) => r.client_id);
    let quizRows = [];
    if (chunkIds.length > 0) {
      const placeholders = chunkIds.map(() => '?').join(',');
      quizRows = await db.getAllAsync(
        `SELECT * FROM study_quiz_questions WHERE is_deleted = 0 AND chunk_id IN (${placeholders}) ORDER BY order_index ASC`,
        chunkIds
      );
    }

    const quizMap = new Map();
    for (const q of quizRows) {
      const list = quizMap.get(q.chunk_id) || [];
      list.push(formatQuizQuestionRow(q));
      quizMap.set(q.chunk_id, list);
    }

    return chunkRows.map((c) => formatChunkRow(c, quizMap.get(c.client_id) || []));
  },

  async getChunkById(chunkId) {
    if (!chunkId) return null;
    const db = await getDatabase();
    const row = await db.getFirstAsync(
      `SELECT * FROM study_chunks WHERE (client_id = ? OR server_id = ?) AND is_deleted = 0`,
      [chunkId, chunkId]
    );
    if (!row) return null;

    const quizRows = await db.getAllAsync(
      `SELECT * FROM study_quiz_questions WHERE (chunk_id = ? OR chunk_id = ?) AND is_deleted = 0 ORDER BY order_index ASC`,
      [row.client_id, row.server_id || '']
    );

    return formatChunkRow(row, quizRows.map(formatQuizQuestionRow));
  },

  async createChunk(chunkInput, userId = 'admin', isSyncPull = false) {
    const db = await getDatabase();
    const clientId = chunkInput.client_id || chunkInput.clientId || generateUUID();
    const now = new Date().toISOString();

    const subjectId = chunkInput.subjectId || chunkInput.subject_id;
    const parentChunkId = chunkInput.parentChunkId || chunkInput.parent_chunk_id || null;
    const title = (chunkInput.title || 'Untitled').trim();
    const summary = chunkInput.summary || '';
    const notes = chunkInput.notes || '';
    const keyPoints = Array.isArray(chunkInput.keyPoints) ? chunkInput.keyPoints : [];
    const terms = Array.isArray(chunkInput.terms) ? chunkInput.terms : [];
    const quiz = Array.isArray(chunkInput.quiz) ? chunkInput.quiz : [];

    // Order calculation
    let orderIndex = chunkInput.orderIndex ?? chunkInput.order;
    if (orderIndex === undefined || orderIndex === null) {
      const orderQuery = parentChunkId
        ? `SELECT COUNT(*) as count FROM study_chunks WHERE parent_chunk_id = ? AND is_deleted = 0`
        : `SELECT COUNT(*) as count FROM study_chunks WHERE subject_id = ? AND parent_chunk_id IS NULL AND is_deleted = 0`;
      const countRes = await db.getFirstAsync(orderQuery, [parentChunkId || subjectId]);
      orderIndex = countRes?.count || 0;
    }

    await db.runAsync(
      `INSERT INTO study_chunks (
        client_id, user_id, subject_id, parent_chunk_id, title, order_index,
        summary, notes, key_points, terms, revised, sync_status, is_deleted, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, 0, ?, ?)`,
      [
        clientId, userId, subjectId, parentChunkId, title, orderIndex,
        summary, notes, JSON.stringify(keyPoints), JSON.stringify(terms),
        isSyncPull ? 'SYNCED' : 'PENDING', now, now
      ]
    );

    // Save in-chunk quiz questions
    const createdQuiz = [];
    for (let i = 0; i < quiz.length; i++) {
      const q = quiz[i];
      const qClientId = q.client_id || q.clientId || generateUUID();
      const optionsStr = JSON.stringify(Array.isArray(q.options) ? q.options : []);

      await db.runAsync(
        `INSERT INTO study_quiz_questions (
          client_id, user_id, chunk_id, question, type, options, answer, explanation, order_index,
          sync_status, is_deleted, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)`,
        [
          qClientId, userId, clientId, q.question, q.type || 'mcq',
          optionsStr, q.answer, q.explanation || '', i,
          isSyncPull ? 'SYNCED' : 'PENDING', now, now
        ]
      );

      createdQuiz.push({
        id: qClientId,
        chunkId: clientId,
        question: q.question,
        type: q.type || 'mcq',
        options: Array.isArray(q.options) ? q.options : [],
        answer: q.answer,
        explanation: q.explanation || '',
        orderIndex: i,
      });

      if (!isSyncPull) {
        await SyncOutboxDao.enqueue('CREATE', 'study_quiz_question', qClientId, {
          chunkId: clientId,
          question: q.question,
          type: q.type || 'mcq',
          options: Array.isArray(q.options) ? q.options : [],
          answer: q.answer,
          explanation: q.explanation || '',
          orderIndex: i,
          userId,
        });
      }
    }

    if (!isSyncPull) {
      await SyncOutboxDao.enqueue('CREATE', 'study_chunk', clientId, {
        subjectId,
        parentChunkId,
        title,
        orderIndex,
        summary,
        notes,
        keyPoints,
        terms,
        revised: false,
        userId,
      });
    }

    const inserted = await db.getFirstAsync(`SELECT * FROM study_chunks WHERE client_id = ?`, [clientId]);
    return formatChunkRow(inserted, createdQuiz);
  },

  async updateChunk(chunkId, patch, isSyncPull = false) {
    if (!chunkId) return null;
    const db = await getDatabase();
    const now = new Date().toISOString();

    const target = await db.getFirstAsync(
      `SELECT * FROM study_chunks WHERE client_id = ? OR server_id = ?`,
      [chunkId, chunkId]
    );
    if (!target) return null;

    const updates = [];
    const params = [];
    const payload = {};

    if (patch.title !== undefined) {
      updates.push('title = ?');
      params.push(patch.title);
      payload.title = patch.title;
    }
    if (patch.summary !== undefined) {
      updates.push('summary = ?');
      params.push(patch.summary);
      payload.summary = patch.summary;
    }
    if (patch.notes !== undefined) {
      updates.push('notes = ?');
      params.push(patch.notes);
      payload.notes = patch.notes;
    }
    if (patch.keyPoints !== undefined) {
      const kp = JSON.stringify(patch.keyPoints);
      updates.push('key_points = ?');
      params.push(kp);
      payload.keyPoints = patch.keyPoints;
    }
    if (patch.terms !== undefined) {
      const tm = JSON.stringify(patch.terms);
      updates.push('terms = ?');
      params.push(tm);
      payload.terms = patch.terms;
    }
    if (patch.revised !== undefined) {
      const rev = patch.revised ? 1 : 0;
      updates.push('revised = ?');
      params.push(rev);
      payload.revised = Boolean(patch.revised);
    }
    if (patch.orderIndex !== undefined || patch.order !== undefined) {
      const ord = patch.orderIndex ?? patch.order;
      updates.push('order_index = ?');
      params.push(ord);
      payload.orderIndex = ord;
    }

    if (updates.length === 0) return formatChunkRow(target);

    updates.push('updated_at = ?');
    params.push(now);

    if (!isSyncPull) {
      updates.push("sync_status = 'PENDING'");
    }

    params.push(target.client_id);
    await db.runAsync(`UPDATE study_chunks SET ${updates.join(', ')} WHERE client_id = ?`, params);

    if (!isSyncPull) {
      await SyncOutboxDao.enqueue('UPDATE', 'study_chunk', target.client_id, payload, target.server_id);
    }

    return this.getChunkById(target.client_id);
  },

  async deleteChunk(chunkId, isSyncPull = false) {
    if (!chunkId) return;
    const db = await getDatabase();
    const now = new Date().toISOString();

    const target = await db.getFirstAsync(
      `SELECT client_id, server_id FROM study_chunks WHERE client_id = ? OR server_id = ?`,
      [chunkId, chunkId]
    );
    if (!target) return;

    // Soft delete chunk and sub-chunks
    await db.runAsync(
      `UPDATE study_chunks SET is_deleted = 1, deleted_at = ?, sync_status = ?, updated_at = ? WHERE client_id = ? OR parent_chunk_id = ?`,
      [now, isSyncPull ? 'SYNCED' : 'PENDING', now, target.client_id, target.client_id]
    );

    if (!isSyncPull) {
      await SyncOutboxDao.enqueue('DELETE', 'study_chunk', target.client_id, {}, target.server_id);
    }
  },

  /**
   * Import complete hierarchical tree (generated by AI chunker or imported manually)
   */
  async importTree(tree, target = {}, userId = 'admin') {
    if (!tree?.subjects?.length) throw new Error('No subjects found in tree');

    // Case 1: Target parent chunk -> all incoming chunks become children of that parent chunk
    if (target.parentChunkId) {
      const parent = await this.getChunkById(target.parentChunkId);
      if (!parent) throw new Error('Target parent chunk not found');
      const subjectId = parent.subjectId;

      const flatChunks = tree.subjects.flatMap((s) => s.chunks || []);
      for (const c of flatChunks) {
        await this.createChunk(
          {
            subjectId,
            parentChunkId: target.parentChunkId,
            title: c.title,
            summary: c.summary || '',
            notes: c.notes || '',
            keyPoints: c.keyPoints || [],
            terms: c.terms || [],
            quiz: c.quiz || [],
          },
          userId
        );
      }
      return;
    }

    // Case 2: Standard tree import
    for (const s of tree.subjects) {
      let subjectId = target.subjectId;
      if (!subjectId) {
        const createdSubj = await this.createSubject(s.name, s.description || '', userId, false, target.fieldId || 'field_ssc');
        subjectId = createdSubj.id;
      }

      for (const c of s.chunks || []) {
        const parentChunk = await this.createChunk(
          {
            subjectId,
            parentChunkId: null,
            title: c.title,
            summary: c.summary || '',
            notes: c.notes || '',
            keyPoints: c.keyPoints || [],
            terms: c.terms || [],
            quiz: c.quiz || [],
          },
          userId
        );

        for (const child of c.children || []) {
          await this.createChunk(
            {
              subjectId,
              parentChunkId: parentChunk.id,
              title: child.title,
              summary: child.summary || '',
              notes: child.notes || '',
              keyPoints: child.keyPoints || [],
              terms: child.terms || [],
              quiz: child.quiz || [],
            },
            userId
          );
        }
      }
    }
  },

  // ================= 3. DAILY QUIZZES & ATTEMPTS =================

  async getTodayQuizzes(dateStr, userId = 'admin') {
    const today = dateStr || new Date().toISOString().split('T')[0];
    const db = await getDatabase();
    const rows = await db.getAllAsync(
      `SELECT * FROM study_daily_quizzes WHERE quiz_date = ? AND is_deleted = 0 AND (user_id = ? OR user_id = 'admin') ORDER BY created_at DESC`,
      [today, userId]
    );
    return rows.map(formatDailyQuizRow);
  },

  async getDailyQuizById(quizId) {
    if (!quizId) return null;
    const db = await getDatabase();
    const row = await db.getFirstAsync(
      `SELECT * FROM study_daily_quizzes WHERE (client_id = ? OR server_id = ?) AND is_deleted = 0`,
      [quizId, quizId]
    );
    return row ? formatDailyQuizRow(row) : null;
  },

  async saveDailyQuiz(quizData, userId = 'admin', isSyncPull = false) {
    const db = await getDatabase();
    const clientId = quizData.client_id || quizData.clientId || generateUUID();
    const now = new Date().toISOString();
    const today = quizData.quizDate || quizData.quiz_date || now.split('T')[0];
    const questions = Array.isArray(quizData.questions) ? quizData.questions : [];
    const questionsJson = JSON.stringify(questions);

    await db.runAsync(
      `INSERT INTO study_daily_quizzes (
        client_id, user_id, subject_id, quiz_date, questions, total_questions, difficulty, source,
        sync_status, is_deleted, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)`,
      [
        clientId, userId, quizData.subjectId || quizData.subject_id, today,
        questionsJson, questions.length, quizData.difficulty || 'medium', quizData.source || 'ai',
        isSyncPull ? 'SYNCED' : 'PENDING', now, now
      ]
    );

    if (!isSyncPull) {
      await SyncOutboxDao.enqueue('CREATE', 'study_daily_quiz', clientId, {
        subjectId: quizData.subjectId || quizData.subject_id,
        quizDate: today,
        questions,
        totalQuestions: questions.length,
        difficulty: quizData.difficulty || 'medium',
        source: quizData.source || 'ai',
        userId,
      });
    }

    const inserted = await db.getFirstAsync(`SELECT * FROM study_daily_quizzes WHERE client_id = ?`, [clientId]);
    return formatDailyQuizRow(inserted);
  },

  async getAttempts(limit = 50, userId = 'admin') {
    const db = await getDatabase();
    const rows = await db.getAllAsync(
      `SELECT * FROM study_daily_quiz_attempts WHERE is_deleted = 0 AND (user_id = ? OR user_id = 'admin') ORDER BY completed_at DESC LIMIT ?`,
      [userId, limit]
    );
    return rows.map(formatAttemptRow);
  },

  async getAttemptById(attemptId) {
    if (!attemptId) return null;
    const db = await getDatabase();
    const row = await db.getFirstAsync(
      `SELECT * FROM study_daily_quiz_attempts WHERE (client_id = ? OR server_id = ?) AND is_deleted = 0`,
      [attemptId, attemptId]
    );
    if (!row) return null;

    const formatted = formatAttemptRow(row);
    // Attach quiz definition
    const quiz = await this.getDailyQuizById(row.daily_quiz_id);
    formatted.daily_quiz = quiz;
    return formatted;
  },

  /**
   * Complete quiz attempt recorder:
   * 1. Saves attempt in SQLite.
   * 2. Tracks weak questions (wrong answers increment, correct answers advance mastery).
   * 3. Bumps streak calculation.
   * 4. Enqueues outbox records.
   */
  async recordQuizAttempt(attemptData, userId = 'admin', isSyncPull = false) {
    const db = await getDatabase();
    const clientId = attemptData.client_id || attemptData.clientId || generateUUID();
    const now = new Date().toISOString();
    const answers = Array.isArray(attemptData.answers) ? attemptData.answers : [];
    const answersJson = JSON.stringify(answers);

    await db.runAsync(
      `INSERT INTO study_daily_quiz_attempts (
        client_id, user_id, daily_quiz_id, subject_id, quiz_date, answers, score,
        total_questions, percentage, time_taken, completed, started_at, completed_at,
        sync_status, is_deleted, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?, 0, ?, ?)`,
      [
        clientId, userId, attemptData.dailyQuizId || attemptData.daily_quiz_id,
        attemptData.subjectId || attemptData.subject_id, attemptData.quizDate || attemptData.quiz_date,
        answersJson, attemptData.score, attemptData.totalQuestions || attemptData.total_questions,
        attemptData.percentage, attemptData.timeTaken || attemptData.time_taken || 0,
        attemptData.startedAt || attemptData.started_at || now,
        attemptData.completedAt || attemptData.completed_at || now,
        isSyncPull ? 'SYNCED' : 'PENDING', now, now
      ]
    );

    if (!isSyncPull) {
      await SyncOutboxDao.enqueue('CREATE', 'study_daily_quiz_attempt', clientId, {
        dailyQuizId: attemptData.dailyQuizId || attemptData.daily_quiz_id,
        subjectId: attemptData.subjectId || attemptData.subject_id,
        quizDate: attemptData.quizDate || attemptData.quiz_date,
        answers,
        score: attemptData.score,
        totalQuestions: attemptData.totalQuestions || attemptData.total_questions,
        percentage: attemptData.percentage,
        timeTaken: attemptData.timeTaken || attemptData.time_taken || 0,
        completed: true,
        startedAt: attemptData.startedAt || attemptData.started_at || now,
        completedAt: attemptData.completedAt || attemptData.completed_at || now,
        userId,
      });
    }

    // Process questions for weak topic tracking
    const questions = attemptData.questions || [];
    if (questions.length > 0) {
      for (const ans of answers) {
        const q = questions[ans.questionIdx];
        if (!q) continue;
        const qHash = questionHash(q);

        if (ans.selectedAnswer && !ans.isCorrect) {
          // Wrong Answer -> increment times_wrong, un-master
          const existing = await db.getFirstAsync(
            `SELECT * FROM study_weak_questions WHERE subject_id = ? AND question_hash = ? AND (user_id = ? OR user_id = 'admin')`,
            [attemptData.subjectId || attemptData.subject_id, qHash, userId]
          );

          if (existing) {
            await db.runAsync(
              `UPDATE study_weak_questions SET
                times_wrong = times_wrong + 1,
                mastered = 0,
                last_wrong_at = ?,
                last_seen_at = ?,
                sync_status = 'PENDING',
                updated_at = ?
               WHERE client_id = ?`,
              [now, now, now, existing.client_id]
            );
            if (!isSyncPull) {
              await SyncOutboxDao.enqueue('UPDATE', 'study_weak_question', existing.client_id, {
                timesWrong: existing.times_wrong + 1,
                mastered: false,
                lastWrongAt: now,
                lastSeenAt: now,
              }, existing.server_id);
            }
          } else {
            const weakClientId = generateUUID();
            await db.runAsync(
              `INSERT INTO study_weak_questions (
                client_id, user_id, subject_id, question_hash, question, options, answer,
                explanation, times_wrong, times_correct, mastered, last_wrong_at, last_seen_at,
                sync_status, is_deleted, created_at, updated_at
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, 0, 0, ?, ?, 'PENDING', 0, ?, ?)`,
              [
                weakClientId, userId, attemptData.subjectId || attemptData.subject_id, qHash,
                q.question, JSON.stringify(q.options || []), q.answer, q.explanation || '',
                now, now, now, now
              ]
            );
            if (!isSyncPull) {
              await SyncOutboxDao.enqueue('CREATE', 'study_weak_question', weakClientId, {
                subjectId: attemptData.subjectId || attemptData.subject_id,
                questionHash: qHash,
                question: q.question,
                options: q.options || [],
                answer: q.answer,
                explanation: q.explanation || '',
                timesWrong: 1,
                timesCorrect: 0,
                mastered: false,
                lastWrongAt: now,
                lastSeenAt: now,
                userId,
              });
            }
          }
        } else if (ans.selectedAnswer && ans.isCorrect) {
          // Right Answer -> increment times_correct, mark mastered if >= 2
          const existing = await db.getFirstAsync(
            `SELECT * FROM study_weak_questions WHERE subject_id = ? AND question_hash = ? AND (user_id = ? OR user_id = 'admin')`,
            [attemptData.subjectId || attemptData.subject_id, qHash, userId]
          );
          if (existing) {
            const nextCorrect = (existing.times_correct || 0) + 1;
            const isMastered = nextCorrect >= 2 ? 1 : existing.mastered;
            await db.runAsync(
              `UPDATE study_weak_questions SET
                times_correct = ?,
                mastered = ?,
                last_seen_at = ?,
                sync_status = 'PENDING',
                updated_at = ?
               WHERE client_id = ?`,
              [nextCorrect, isMastered, now, now, existing.client_id]
            );
            if (!isSyncPull) {
              await SyncOutboxDao.enqueue('UPDATE', 'study_weak_question', existing.client_id, {
                timesCorrect: nextCorrect,
                mastered: Boolean(isMastered),
                lastSeenAt: now,
              }, existing.server_id);
            }
          }
        }
      }
    }

    // Bump user streak
    await this.bumpStreak(userId, isSyncPull);

    const inserted = await db.getFirstAsync(`SELECT * FROM study_daily_quiz_attempts WHERE client_id = ?`, [clientId]);
    return formatAttemptRow(inserted);
  },

  // ================= 4. STREAK ENGINE =================

  async getUserStreak(userId = 'admin') {
    const db = await getDatabase();
    const row = await db.getFirstAsync(
      `SELECT * FROM study_user_streaks WHERE is_deleted = 0 AND (user_id = ? OR user_id = 'admin')`,
      [userId]
    );
    if (!row) {
      return {
        currentStreak: 0,
        current_streak: 0,
        longestStreak: 0,
        longest_streak: 0,
        lastActiveDate: null,
        last_active_date: null,
        totalQuizzesCompleted: 0,
        total_quizzes_completed: 0,
      };
    }
    return {
      currentStreak: row.current_streak,
      current_streak: row.current_streak,
      longestStreak: row.longest_streak,
      longest_streak: row.longest_streak,
      lastActiveDate: row.last_active_date,
      last_active_date: row.last_active_date,
      totalQuizzesCompleted: row.total_quizzes_completed,
      total_quizzes_completed: row.total_quizzes_completed,
    };
  },

  async bumpStreak(userId = 'admin', isSyncPull = false) {
    const db = await getDatabase();
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    const now = new Date().toISOString();

    const row = await db.getFirstAsync(
      `SELECT * FROM study_user_streaks WHERE is_deleted = 0 AND (user_id = ? OR user_id = 'admin')`,
      [userId]
    );

    if (!row) {
      const clientId = generateUUID();
      await db.runAsync(
        `INSERT INTO study_user_streaks (
          client_id, user_id, current_streak, longest_streak, last_active_date,
          total_quizzes_completed, sync_status, is_deleted, created_at, updated_at
        ) VALUES (?, ?, 1, 1, ?, 1, 'PENDING', 0, ?, ?)`,
        [clientId, userId, todayStr, now, now]
      );
      if (!isSyncPull) {
        await SyncOutboxDao.enqueue('CREATE', 'study_user_streak', clientId, {
          currentStreak: 1,
          longestStreak: 1,
          lastActiveDate: todayStr,
          totalQuizzesCompleted: 1,
          userId,
        });
      }
      return;
    }

    let current = row.current_streak ?? 0;
    const last = row.last_active_date ? new Date(row.last_active_date) : null;
    const totalDone = (row.total_quizzes_completed ?? 0) + 1;

    if (!last) {
      current = 1;
    } else {
      const diffDays = Math.floor(
        (Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()) -
          Date.UTC(last.getUTCFullYear(), last.getUTCMonth(), last.getUTCDate())) /
          (1000 * 60 * 60 * 24)
      );
      if (diffDays === 0) {
        // Already active today; keep current streak
      } else if (diffDays === 1) {
        current += 1;
      } else {
        current = 1; // Streak broken, restart at 1
      }
    }

    const longest = Math.max(current, row.longest_streak ?? 0);

    await db.runAsync(
      `UPDATE study_user_streaks SET
        current_streak = ?,
        longest_streak = ?,
        last_active_date = ?,
        total_quizzes_completed = ?,
        sync_status = 'PENDING',
        updated_at = ?
       WHERE client_id = ?`,
      [current, longest, todayStr, totalDone, now, row.client_id]
    );

    if (!isSyncPull) {
      await SyncOutboxDao.enqueue('UPDATE', 'study_user_streak', row.client_id, {
        currentStreak: current,
        longestStreak: longest,
        lastActiveDate: todayStr,
        totalQuizzesCompleted: totalDone,
      }, row.server_id);
    }
  },

  // ================= 5. WEAK TOPICS =================

  async getWeakQuestions(options = {}, userId = 'admin') {
    const { subjectId, tab = 'active', limit = 50 } = options;
    const db = await getDatabase();

    let sql = `SELECT * FROM study_weak_questions WHERE is_deleted = 0 AND (user_id = ? OR user_id = 'admin')`;
    const params = [userId];

    if (subjectId) {
      sql += ` AND subject_id = ?`;
      params.push(subjectId);
    }

    if (tab === 'mastered') {
      sql += ` AND mastered = 1`;
    } else if (tab === 'active') {
      sql += ` AND mastered = 0`;
    }

    sql += ` ORDER BY times_wrong DESC, last_wrong_at DESC LIMIT ?`;
    params.push(limit);

    const rows = await db.getAllAsync(sql, params);
    return rows.map((r) => {
      let options = [];
      try {
        options = r.options ? JSON.parse(r.options) : [];
      } catch (e) {
        options = [];
      }
      return {
        id: r.server_id || r.client_id,
        client_id: r.client_id,
        server_id: r.server_id,
        subject_id: r.subject_id,
        question_hash: r.question_hash,
        question: r.question,
        options,
        answer: r.answer,
        explanation: r.explanation || '',
        times_wrong: r.times_wrong,
        times_correct: r.times_correct,
        mastered: Boolean(r.mastered),
        last_wrong_at: r.last_wrong_at,
        last_seen_at: r.last_seen_at,
      };
    });
  },

  async markWeakMastered(weakId, isSyncPull = false) {
    if (!weakId) return;
    const db = await getDatabase();
    const now = new Date().toISOString();

    const target = await db.getFirstAsync(
      `SELECT client_id, server_id FROM study_weak_questions WHERE client_id = ? OR server_id = ?`,
      [weakId, weakId]
    );
    if (!target) return;

    await db.runAsync(
      `UPDATE study_weak_questions SET
        mastered = 1,
        times_correct = 99,
        sync_status = ?,
        updated_at = ?
       WHERE client_id = ?`,
      [isSyncPull ? 'SYNCED' : 'PENDING', now, target.client_id]
    );

    if (!isSyncPull) {
      await SyncOutboxDao.enqueue('UPDATE', 'study_weak_question', target.client_id, {
        mastered: true,
        timesCorrect: 99,
      }, target.server_id);
    }
  },

  async deleteWeakQuestion(weakId, isSyncPull = false) {
    if (!weakId) return;
    const db = await getDatabase();
    const now = new Date().toISOString();

    const target = await db.getFirstAsync(
      `SELECT client_id, server_id FROM study_weak_questions WHERE client_id = ? OR server_id = ?`,
      [weakId, weakId]
    );
    if (!target) return;

    await db.runAsync(
      `UPDATE study_weak_questions SET is_deleted = 1, deleted_at = ?, sync_status = ?, updated_at = ? WHERE client_id = ?`,
      [now, isSyncPull ? 'SYNCED' : 'PENDING', now, target.client_id]
    );

    if (!isSyncPull) {
      await SyncOutboxDao.enqueue('DELETE', 'study_weak_question', target.client_id, {}, target.server_id);
    }
  },

  // ================= 6. REVISION STATS & AGGREGATIONS =================

  async getRevisionStats(userId = 'admin') {
    const subjects = await this.getSubjects(userId);
    const attempts = await this.getAttempts(200, userId);
    const weakQuestions = await this.getWeakQuestions({ limit: 1000 }, userId);

    const subjectStatsMap = new Map();
    for (const s of subjects) {
      subjectStatsMap.set(s.id, {
        subjectId: s.id,
        subjectName: s.name,
        attempts: 0,
        avgPct: 0,
        lastPct: null,
        activeWeak: 0,
        mastered: 0,
        totalWrongs: 0,
      });
    }

    const sumBySubject = new Map();
    for (const a of attempts) {
      const st = subjectStatsMap.get(a.subject_id);
      if (!st) continue;
      st.attempts += 1;
      sumBySubject.set(a.subject_id, (sumBySubject.get(a.subject_id) || 0) + Number(a.percentage || 0));
      if (st.lastPct === null) st.lastPct = Number(a.percentage || 0);
    }

    sumBySubject.forEach((totalPct, subjId) => {
      const st = subjectStatsMap.get(subjId);
      if (st && st.attempts > 0) st.avgPct = totalPct / st.attempts;
    });

    for (const w of weakQuestions) {
      const st = subjectStatsMap.get(w.subject_id);
      if (!st) continue;
      if (w.mastered) {
        st.mastered += 1;
      } else {
        st.activeWeak += 1;
      }
      st.totalWrongs += w.times_wrong || 0;
    }

    const totalAttempts = attempts.length;
    const totalCorrect = attempts.reduce((acc, a) => acc + (a.score || 0), 0);
    const totalQ = attempts.reduce((acc, a) => acc + (a.total_questions || 0), 0);
    const overallAccuracy = totalQ ? (totalCorrect / totalQ) * 100 : 0;
    const activeWeakCount = weakQuestions.filter((w) => !w.mastered).length;
    const masteredCount = weakQuestions.filter((w) => w.mastered).length;

    const subjectStats = Array.from(subjectStatsMap.values())
      .filter((s) => s.attempts > 0 || s.activeWeak > 0)
      .sort((a, b) => b.activeWeak - a.activeWeak);

    return {
      totals: {
        totalAttempts,
        accuracy: overallAccuracy,
        activeWeak: activeWeakCount,
        mastered: masteredCount,
      },
      subjectStats,
    };
  },

  // ================= SYNC PULL INGESTION =================

  async saveSubject(subjData, isSyncPull = false) {
    const db = await getDatabase();
    const clientId = subjData.client_id || subjData.clientId || generateUUID();
    const serverId = subjData.server_id || subjData.serverId || (subjData._id ? String(subjData._id) : null);
    const now = new Date().toISOString();
    const existing = await db.getFirstAsync(
      `SELECT client_id, server_id FROM study_subjects WHERE client_id = ? OR (server_id IS NOT NULL AND server_id = ?)`,
      [clientId, serverId]
    );

    const name = subjData.name || 'Untitled Subject';
    const description = subjData.description || '';
    const orderIndex = subjData.orderIndex ?? subjData.order_index ?? 0;
    const isDeleted = subjData.isDeleted || subjData.is_deleted ? 1 : 0;
    const deletedAt = subjData.deletedAt || subjData.deleted_at || null;
    const createdAt = subjData.createdAt || subjData.created_at || now;
    const updatedAt = subjData.updatedAt || subjData.updated_at || now;

    if (existing) {
      await db.runAsync(
        `UPDATE study_subjects SET
          server_id = COALESCE(?, server_id),
          name = ?,
          description = ?,
          order_index = ?,
          sync_status = ?,
          is_deleted = ?,
          deleted_at = ?,
          updated_at = ?
         WHERE client_id = ?`,
        [serverId, name, description, orderIndex, isSyncPull ? 'SYNCED' : 'PENDING', isDeleted, deletedAt, updatedAt, existing.client_id]
      );
    } else {
      await db.runAsync(
        `INSERT INTO study_subjects (
          client_id, server_id, user_id, name, description, order_index,
          sync_status, is_deleted, deleted_at, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [clientId, serverId, subjData.userId || 'admin', name, description, orderIndex, isSyncPull ? 'SYNCED' : 'PENDING', isDeleted, deletedAt, createdAt, updatedAt]
      );
    }
  },

  async saveChunk(chunkData, isSyncPull = false) {
    const db = await getDatabase();
    const clientId = chunkData.client_id || chunkData.clientId || generateUUID();
    const serverId = chunkData.server_id || chunkData.serverId || (chunkData._id ? String(chunkData._id) : null);
    const now = new Date().toISOString();
    const existing = await db.getFirstAsync(
      `SELECT client_id, server_id FROM study_chunks WHERE client_id = ? OR (server_id IS NOT NULL AND server_id = ?)`,
      [clientId, serverId]
    );

    const subjectId = chunkData.subjectId || chunkData.subject_id;
    const parentChunkId = chunkData.parentChunkId || chunkData.parent_chunk_id || null;
    const title = chunkData.title || 'Untitled';
    const orderIndex = chunkData.orderIndex ?? chunkData.order_index ?? 0;
    const summary = chunkData.summary || '';
    const notes = chunkData.notes || '';
    const keyPointsStr = Array.isArray(chunkData.keyPoints)
      ? JSON.stringify(chunkData.keyPoints)
      : typeof chunkData.keyPoints === 'string'
      ? chunkData.keyPoints
      : '[]';
    const termsStr = Array.isArray(chunkData.terms)
      ? JSON.stringify(chunkData.terms)
      : typeof chunkData.terms === 'string'
      ? chunkData.terms
      : '[]';
    const revised = chunkData.revised ? 1 : 0;
    const isDeleted = chunkData.isDeleted || chunkData.is_deleted ? 1 : 0;
    const deletedAt = chunkData.deletedAt || chunkData.deleted_at || null;
    const createdAt = chunkData.createdAt || chunkData.created_at || now;
    const updatedAt = chunkData.updatedAt || chunkData.updated_at || now;

    if (existing) {
      await db.runAsync(
        `UPDATE study_chunks SET
          server_id = COALESCE(?, server_id),
          subject_id = ?,
          parent_chunk_id = ?,
          title = ?,
          order_index = ?,
          summary = ?,
          notes = ?,
          key_points = ?,
          terms = ?,
          revised = ?,
          sync_status = ?,
          is_deleted = ?,
          deleted_at = ?,
          updated_at = ?
         WHERE client_id = ?`,
        [serverId, subjectId, parentChunkId, title, orderIndex, summary, notes, keyPointsStr, termsStr, revised, isSyncPull ? 'SYNCED' : 'PENDING', isDeleted, deletedAt, updatedAt, existing.client_id]
      );
    } else {
      await db.runAsync(
        `INSERT INTO study_chunks (
          client_id, server_id, user_id, subject_id, parent_chunk_id, title,
          order_index, summary, notes, key_points, terms, revised,
          sync_status, is_deleted, deleted_at, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [clientId, serverId, chunkData.userId || 'admin', subjectId, parentChunkId, title, orderIndex, summary, notes, keyPointsStr, termsStr, revised, isSyncPull ? 'SYNCED' : 'PENDING', isDeleted, deletedAt, createdAt, updatedAt]
      );
    }
  },

  async saveWeakQuestion(wData, isSyncPull = false) {
    const db = await getDatabase();
    const clientId = wData.client_id || wData.clientId || generateUUID();
    const serverId = wData.server_id || wData.serverId || (wData._id ? String(wData._id) : null);
    const now = new Date().toISOString();
    const existing = await db.getFirstAsync(
      `SELECT client_id, server_id FROM study_weak_questions WHERE client_id = ? OR (server_id IS NOT NULL AND server_id = ?)`,
      [clientId, serverId]
    );

    const subjectId = wData.subjectId || wData.subject_id;
    const qHash = wData.questionHash || wData.question_hash;
    const optionsStr = Array.isArray(wData.options) ? JSON.stringify(wData.options) : '[]';
    const isDeleted = wData.isDeleted || wData.is_deleted ? 1 : 0;

    if (existing) {
      await db.runAsync(
        `UPDATE study_weak_questions SET
          server_id = COALESCE(?, server_id),
          times_wrong = ?,
          times_correct = ?,
          mastered = ?,
          last_wrong_at = ?,
          last_seen_at = ?,
          sync_status = ?,
          is_deleted = ?,
          updated_at = ?
         WHERE client_id = ?`,
        [
          serverId, wData.timesWrong ?? wData.times_wrong ?? 1,
          wData.timesCorrect ?? wData.times_correct ?? 0,
          wData.mastered ? 1 : 0,
          wData.lastWrongAt || wData.last_wrong_at,
          wData.lastSeenAt || wData.last_seen_at,
          isSyncPull ? 'SYNCED' : 'PENDING', isDeleted, now, existing.client_id
        ]
      );
    } else {
      await db.runAsync(
        `INSERT INTO study_weak_questions (
          client_id, server_id, user_id, subject_id, question_hash, question,
          options, answer, explanation, times_wrong, times_correct, mastered,
          last_wrong_at, last_seen_at, sync_status, is_deleted, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          clientId, serverId, wData.userId || 'admin', subjectId, qHash,
          wData.question, optionsStr, wData.answer, wData.explanation || '',
          wData.timesWrong ?? wData.times_wrong ?? 1,
          wData.timesCorrect ?? wData.times_correct ?? 0,
          wData.mastered ? 1 : 0,
          wData.lastWrongAt || wData.last_wrong_at || now,
          wData.lastSeenAt || wData.last_seen_at || now,
          isSyncPull ? 'SYNCED' : 'PENDING', isDeleted, now, now
        ]
      );
    }
  },

  // ================= 7. QUIZ CONFIG =================

  async getQuizConfig(userId = 'admin') {
    const db = await getDatabase();
    const row = await db.getFirstAsync(
      `SELECT * FROM study_daily_quiz_config WHERE is_deleted = 0 AND (user_id = ? OR user_id = 'admin')`,
      [userId]
    );

    if (!row) {
      return {
        enabled: true,
        scheduleTime: '12:00:00',
        timezone: 'Asia/Kolkata',
        difficulty: 'mixed',
        includePyq: true,
        numQuestions: 10,
      };
    }

    return {
      id: row.server_id || row.client_id,
      enabled: Boolean(row.enabled),
      scheduleTime: row.schedule_time,
      timezone: row.timezone,
      difficulty: row.difficulty,
      includePyq: Boolean(row.include_pyq),
      numQuestions: row.num_questions,
    };
  },

  async updateQuizConfig(patch, userId = 'admin', isSyncPull = false) {
    const db = await getDatabase();
    const now = new Date().toISOString();
    const existing = await db.getFirstAsync(
      `SELECT * FROM study_daily_quiz_config WHERE is_deleted = 0 AND (user_id = ? OR user_id = 'admin')`,
      [userId]
    );

    const merged = {
      enabled: patch.enabled !== undefined ? patch.enabled : existing?.enabled ?? 1,
      scheduleTime: patch.scheduleTime || patch.schedule_time || existing?.schedule_time || '12:00:00',
      timezone: patch.timezone || existing?.timezone || 'Asia/Kolkata',
      difficulty: patch.difficulty || existing?.difficulty || 'mixed',
      includePyq: patch.includePyq !== undefined ? patch.includePyq : existing?.include_pyq ?? 1,
      numQuestions: patch.numQuestions || patch.num_questions || existing?.num_questions || 10,
    };

    if (!existing) {
      const clientId = generateUUID();
      await db.runAsync(
        `INSERT INTO study_daily_quiz_config (
          client_id, user_id, enabled, schedule_time, timezone, difficulty,
          include_pyq, num_questions, sync_status, is_deleted, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'PENDING', 0, ?, ?)`,
        [
          clientId, userId, merged.enabled ? 1 : 0, merged.scheduleTime, merged.timezone,
          merged.difficulty, merged.includePyq ? 1 : 0, merged.numQuestions, now, now
        ]
      );
      if (!isSyncPull) {
        await SyncOutboxDao.enqueue('CREATE', 'study_daily_quiz_config', clientId, {
          ...merged,
          userId,
        });
      }
    } else {
      await db.runAsync(
        `UPDATE study_daily_quiz_config SET
          enabled = ?,
          schedule_time = ?,
          timezone = ?,
          difficulty = ?,
          include_pyq = ?,
          num_questions = ?,
          sync_status = 'PENDING',
          updated_at = ?
         WHERE client_id = ?`,
        [
          merged.enabled ? 1 : 0, merged.scheduleTime, merged.timezone, merged.difficulty,
          merged.includePyq ? 1 : 0, merged.numQuestions, now, existing.client_id
        ]
      );
      if (!isSyncPull) {
        await SyncOutboxDao.enqueue('UPDATE', 'study_daily_quiz_config', existing.client_id, merged, existing.server_id);
      }
    }

    return merged;
  },

  // ================= 8. UNIFIED SEARCH =================

  async searchAll(query, userId = 'admin') {
    if (!query || !query.trim()) return [];
    const q = query.trim().toLowerCase();
    const subjects = await this.getSubjects(userId);
    const chunks = await this.getChunks(null, userId);

    const results = [];
    for (const c of chunks) {
      const subject = subjects.find((s) => s.id === c.subjectId);
      const haystack = [
        c.title,
        c.summary,
        c.notes,
        ...(c.keyPoints || []),
        ...(c.terms || []).map((t) => `${t.term} ${t.meaning}`),
        ...(c.quiz || []).map((q) => `${q.question} ${q.answer}`),
        subject?.name || '',
      ]
        .join(' ')
        .toLowerCase();

      if (haystack.includes(q)) {
        results.push({
          c,
          chunk: c,
          subject,
        });
      }
    }

    return results;
  },
};
