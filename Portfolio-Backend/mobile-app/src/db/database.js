import * as SQLite from 'expo-sqlite';
import { Platform } from 'react-native';
import { CREATE_TABLES_SQL, SCHEMA_VERSION } from './schema';

let dbInstance = null;
let initPromise = null;

/**
 * Initialize and open the local SQLite database.
 * Executes table creations and migration scripts sequentially.
 */
export const getDatabase = async () => {
  if (dbInstance) return dbInstance;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    try {
      const db = await SQLite.openDatabaseAsync('portfolio_local.db');

      // Enable foreign keys and Write-Ahead Logging (WAL) for maximum mobile performance
      try {
        await db.execAsync('PRAGMA foreign_keys = ON;');
        await db.execAsync('PRAGMA journal_mode = WAL;');
      } catch (pragmaErr) {
        console.warn('[SQLite PRAGMA Warning]', pragmaErr.message);
      }

      // Safe early migration for existing study_subjects table before CREATE_TABLES_SQL
      try {
        await db.execAsync("ALTER TABLE study_subjects ADD COLUMN field_id TEXT DEFAULT 'field_ssc';");
      } catch (alterErr) {
        // Safe to ignore if column exists or table not yet created
      }

      // Execute table creation statements
      for (const sql of CREATE_TABLES_SQL) {
        try {
          await db.execAsync(sql);
        } catch (tableErr) {
          console.error('[SQLite Table Creation Error]', tableErr.message, sql);
        }
      }

      // Ensure field_id column and index on study_subjects
      try {
        await db.execAsync("ALTER TABLE study_subjects ADD COLUMN field_id TEXT DEFAULT 'field_ssc';");
      } catch (alterErr) {}
      try {
        await db.execAsync("CREATE INDEX IF NOT EXISTS idx_study_subjects_field ON study_subjects(field_id, is_deleted);");
      } catch (idxErr) {}

      // Seed default study fields (SSC and Engineering) if table is empty
      try {
        const fieldCountRow = await db.getFirstAsync('SELECT COUNT(*) as count FROM study_fields WHERE is_deleted = 0');
        if (!fieldCountRow || fieldCountRow.count === 0) {
          const now = new Date().toISOString();
          await db.runAsync(
            `INSERT OR IGNORE INTO study_fields (client_id, name, code, description, icon, color, is_default, order_index, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, 1, 0, ?, ?)`,
            ['field_ssc', 'SSC Exam Prep', 'ssc', 'General Studies, Math, Reasoning & English for SSC CGL / CHSL', 'school-outline', '#6366f1', now, now]
          );
          await db.runAsync(
            `INSERT OR IGNORE INTO study_fields (client_id, name, code, description, icon, color, is_default, order_index, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, 0, 1, ?, ?)`,
            ['field_engineering', 'Engineering', 'engineering', 'Computer Science, Algorithms, Core Engineering & Tech Concepts', 'code-slash-outline', '#06b6d4', now, now]
          );
        }
        await db.runAsync("UPDATE study_subjects SET field_id = 'field_ssc' WHERE field_id IS NULL OR field_id = ''");
      } catch (seedErr) {
        console.warn('[SQLite Study Fields Seed Warning]', seedErr.message);
      }

      // Verify migration record
      try {
        const migrationRow = await db.getFirstAsync(
          'SELECT version FROM _schema_migrations WHERE version = ?',
          [SCHEMA_VERSION]
        );
        if (!migrationRow) {
          await db.runAsync(
            'INSERT INTO _schema_migrations (version, applied_at) VALUES (?, ?)',
            [SCHEMA_VERSION, new Date().toISOString()]
          );
        }
      } catch (migErr) {
        console.warn('[SQLite Migration Record Error]', migErr.message);
      }

      dbInstance = db;
      return dbInstance;
    } catch (err) {
      console.error('[SQLite Init Failed]', err);
      throw err;
    } finally {
      initPromise = null;
    }
  })();

  return initPromise;
};

/**
 * Execute SQL statement with parameters
 */
export const executeSql = async (sql, params = []) => {
  const db = await getDatabase();
  return await db.runAsync(sql, params);
};

/**
 * Fetch all matching rows
 */
export const queryAll = async (sql, params = []) => {
  const db = await getDatabase();
  return await db.getAllAsync(sql, params);
};

/**
 * Fetch single matching row
 */
export const queryFirst = async (sql, params = []) => {
  const db = await getDatabase();
  return await db.getFirstAsync(sql, params);
};

/**
 * Execute block within an ACID transaction
 */
export const withTransaction = async (action) => {
  const db = await getDatabase();
  return await db.withTransactionAsync(async () => {
    return await action(db);
  });
};

export default {
  getDatabase,
  executeSql,
  queryAll,
  queryFirst,
  withTransaction,
};

