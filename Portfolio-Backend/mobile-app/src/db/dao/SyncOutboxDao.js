import { getDatabase } from '../database';
import { generateUUID } from '../../utils/uuid';

export const SyncOutboxDao = {
  /**
   * Enqueue a new mutation into the persistent outbox table
   */
  async enqueueMutation(entityName, action, clientId, payload) {
    const db = await getDatabase();
    const mutationId = generateUUID();
    const now = new Date().toISOString();

    await db.runAsync(
      `INSERT INTO sync_outbox (
        mutation_id, entity_name, action, client_id, payload, status, retry_count, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, 'PENDING', 0, ?, ?)`,
      [mutationId, entityName, action, clientId, JSON.stringify(payload || {}), now, now]
    );

    return mutationId;
  },

  /**
   * Get all pending mutations ordered chronologically
   */
  async getPendingMutations(limit = 50) {
    const db = await getDatabase();
    const rows = await db.getAllAsync(
      `SELECT * FROM sync_outbox 
       WHERE status = 'PENDING' 
       ORDER BY created_at ASC 
       LIMIT ?`,
      [limit]
    );

    return rows.map((r) => ({
      mutationId: r.mutation_id,
      entity: r.entity_name,
      action: r.action,
      clientId: r.client_id,
      payload: JSON.parse(r.payload || '{}'),
      retryCount: r.retry_count,
      createdAt: r.created_at,
    }));
  },

  /**
   * Get count of pending mutations
   */
  async getPendingCount() {
    const db = await getDatabase();
    const row = await db.getFirstAsync(
      `SELECT COUNT(*) as count FROM sync_outbox WHERE status = 'PENDING'`
    );
    return row?.count || 0;
  },

  /**
   * Mark mutation as COMPLETED (remove from queue)
   */
  async markCompleted(mutationId) {
    const db = await getDatabase();
    await db.runAsync(`DELETE FROM sync_outbox WHERE mutation_id = ?`, [mutationId]);
  },

  /**
   * Record failure and increment retry counter
   */
  async recordFailure(mutationId, errorMsg) {
    const db = await getDatabase();
    const now = new Date().toISOString();
    await db.runAsync(
      `UPDATE sync_outbox 
       SET retry_count = retry_count + 1, last_error = ?, updated_at = ? 
       WHERE mutation_id = ?`,
      [String(errorMsg || 'Sync error'), now, mutationId]
    );
  },

  /**
   * Clear all outbox entries (e.g. for reset/testing)
   */
  async clearAll() {
    const db = await getDatabase();
    await db.runAsync(`DELETE FROM sync_outbox`);
  },
};

export default SyncOutboxDao;

