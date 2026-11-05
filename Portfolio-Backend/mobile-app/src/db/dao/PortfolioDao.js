import { getDatabase } from '../database';
import { generateUUID } from '../../utils/uuid';
import { SyncOutboxDao } from './SyncOutboxDao';

export const PortfolioDao = {
  // ================= Blogs =================

  async getBlogs(status = null) {
    const db = await getDatabase();
    let sql = `SELECT * FROM portfolio_blogs WHERE is_deleted = 0`;
    const params = [];
    if (status && status !== 'all') {
      sql += ` AND status = ?`;
      params.push(status);
    }
    sql += ` ORDER BY created_at DESC`;
    const rows = await db.getAllAsync(sql, params);
    return rows.map((r) => ({
      _id: r.server_id || r.client_id,
      client_id: r.client_id,
      server_id: r.server_id,
      title: r.title,
      slug: r.slug,
      content: r.content,
      excerpt: r.excerpt,
      tags: r.tags ? JSON.parse(r.tags) : [],
      coverImage: r.cover_image_uri,
      status: r.status,
      syncStatus: r.sync_status,
      createdAt: r.created_at,
    }));
  },

  async saveBlog(blogData, isSyncPull = false) {
    const db = await getDatabase();
    const clientId = blogData.client_id || blogData.clientId || generateUUID();
    const serverId = blogData.server_id || blogData.serverId || blogData._id || null;
    const now = new Date().toISOString();

    const existing = await db.getFirstAsync(
      `SELECT client_id, server_id FROM portfolio_blogs WHERE client_id = ? OR (server_id IS NOT NULL AND server_id = ?)`,
      [clientId, serverId]
    );

    const tagsStr = Array.isArray(blogData.tags)
      ? JSON.stringify(blogData.tags)
      : blogData.tags || '[]';

    if (existing) {
      await db.runAsync(
        `UPDATE portfolio_blogs SET 
          server_id = COALESCE(?, server_id),
          title = ?, slug = ?, content = ?, excerpt = ?, tags = ?,
          cover_image_uri = ?, status = ?, sync_status = ?, is_deleted = ?, updated_at = ?
         WHERE client_id = ?`,
        [
          serverId,
          blogData.title,
          blogData.slug || '',
          blogData.content || '',
          blogData.excerpt || '',
          tagsStr,
          blogData.coverImage || blogData.cover_image_uri || '',
          blogData.status || 'draft',
          isSyncPull ? 'SYNCED' : 'PENDING_UPDATE',
          blogData.isDeleted || blogData.is_deleted ? 1 : 0,
          now,
          existing.client_id,
        ]
      );
      if (!isSyncPull) {
        await SyncOutboxDao.enqueueMutation('portfolio_blog', 'UPDATE', existing.client_id, {
          ...blogData,
          _id: existing.server_id || serverId,
        });
      }
      return existing.client_id;
    } else {
      await db.runAsync(
        `INSERT INTO portfolio_blogs (
          client_id, server_id, title, slug, content, excerpt, tags,
          cover_image_uri, status, sync_status, is_deleted, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)`,
        [
          clientId,
          serverId,
          blogData.title,
          blogData.slug || '',
          blogData.content || '',
          blogData.excerpt || '',
          tagsStr,
          blogData.coverImage || blogData.cover_image_uri || '',
          blogData.status || 'draft',
          isSyncPull ? 'SYNCED' : 'PENDING_CREATE',
          now,
          now,
        ]
      );
      if (!isSyncPull) {
        await SyncOutboxDao.enqueueMutation('portfolio_blog', 'CREATE', clientId, blogData);
      }
      return clientId;
    }
  },

  async deleteBlog(clientId, isSyncPull = false) {
    const db = await getDatabase();
    const existing = await db.getFirstAsync(
      `SELECT client_id, server_id FROM portfolio_blogs WHERE client_id = ? OR server_id = ?`,
      [clientId, clientId]
    );
    if (!existing) return;

    await db.runAsync(
      `UPDATE portfolio_blogs SET is_deleted = 1, sync_status = ? WHERE client_id = ?`,
      [isSyncPull ? 'SYNCED' : 'PENDING_DELETE', existing.client_id]
    );

    if (!isSyncPull) {
      await SyncOutboxDao.enqueueMutation('portfolio_blog', 'DELETE', existing.client_id, {
        _id: existing.server_id,
      });
    }
  },

  // ================= Projects =================

  async getProjects(status = null) {
    const db = await getDatabase();
    let sql = `SELECT * FROM portfolio_projects WHERE is_deleted = 0`;
    const params = [];
    if (status && status !== 'all') {
      sql += ` AND status = ?`;
      params.push(status);
    }
    sql += ` ORDER BY sort_order ASC, created_at DESC`;
    const rows = await db.getAllAsync(sql, params);
    return rows.map((r) => ({
      _id: r.server_id || r.client_id,
      client_id: r.client_id,
      server_id: r.server_id,
      title: r.title,
      description: r.description,
      techStack: r.tech_stack ? JSON.parse(r.tech_stack) : [],
      githubUrl: r.github_url,
      liveUrl: r.live_url,
      image: r.image_uri,
      status: r.status,
      sortOrder: r.sort_order,
      syncStatus: r.sync_status,
      createdAt: r.created_at,
    }));
  },

  async saveProject(projData, isSyncPull = false) {
    const db = await getDatabase();
    const clientId = projData.client_id || projData.clientId || generateUUID();
    const serverId = projData.server_id || projData.serverId || projData._id || null;
    const now = new Date().toISOString();

    const existing = await db.getFirstAsync(
      `SELECT client_id, server_id FROM portfolio_projects WHERE client_id = ? OR (server_id IS NOT NULL AND server_id = ?)`,
      [clientId, serverId]
    );

    const techStr = Array.isArray(projData.techStack)
      ? JSON.stringify(projData.techStack)
      : projData.tech_stack || '[]';

    if (existing) {
      await db.runAsync(
        `UPDATE portfolio_projects SET
          server_id = COALESCE(?, server_id),
          title = ?, description = ?, tech_stack = ?, github_url = ?, live_url = ?,
          image_uri = ?, status = ?, sort_order = ?, sync_status = ?, is_deleted = ?, updated_at = ?
         WHERE client_id = ?`,
        [
          serverId,
          projData.title,
          projData.description || '',
          techStr,
          projData.githubUrl || projData.github_url || '',
          projData.liveUrl || projData.live_url || '',
          projData.image || projData.image_uri || '',
          projData.status || 'publish',
          Number(projData.sortOrder || projData.sort_order || 0),
          isSyncPull ? 'SYNCED' : 'PENDING_UPDATE',
          projData.isDeleted || projData.is_deleted ? 1 : 0,
          now,
          existing.client_id,
        ]
      );
      if (!isSyncPull) {
        await SyncOutboxDao.enqueueMutation('portfolio_project', 'UPDATE', existing.client_id, {
          ...projData,
          _id: existing.server_id || serverId,
        });
      }
      return existing.client_id;
    } else {
      await db.runAsync(
        `INSERT INTO portfolio_projects (
          client_id, server_id, title, description, tech_stack, github_url, live_url,
          image_uri, status, sort_order, sync_status, is_deleted, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)`,
        [
          clientId,
          serverId,
          projData.title,
          projData.description || '',
          techStr,
          projData.githubUrl || projData.github_url || '',
          projData.liveUrl || projData.live_url || '',
          projData.image || projData.image_uri || '',
          projData.status || 'publish',
          Number(projData.sortOrder || projData.sort_order || 0),
          isSyncPull ? 'SYNCED' : 'PENDING_CREATE',
          now,
          now,
        ]
      );
      if (!isSyncPull) {
        await SyncOutboxDao.enqueueMutation('portfolio_project', 'CREATE', clientId, projData);
      }
      return clientId;
    }
  },

  async deleteProject(clientId, isSyncPull = false) {
    const db = await getDatabase();
    const existing = await db.getFirstAsync(
      `SELECT client_id, server_id FROM portfolio_projects WHERE client_id = ? OR server_id = ?`,
      [clientId, clientId]
    );
    if (!existing) return;

    await db.runAsync(
      `UPDATE portfolio_projects SET is_deleted = 1, sync_status = ? WHERE client_id = ?`,
      [isSyncPull ? 'SYNCED' : 'PENDING_DELETE', existing.client_id]
    );

    if (!isSyncPull) {
      await SyncOutboxDao.enqueueMutation('portfolio_project', 'DELETE', existing.client_id, {
        _id: existing.server_id,
      });
    }
  },

  // ================= Skills =================

  async getSkills() {
    const db = await getDatabase();
    const rows = await db.getAllAsync(`SELECT * FROM portfolio_skills WHERE is_deleted = 0 ORDER BY category ASC, name ASC`);
    return rows.map((r) => ({
      _id: r.server_id || r.client_id,
      client_id: r.client_id,
      name: r.name,
      category: r.category,
      level: r.level,
      icon: r.icon,
      syncStatus: r.sync_status,
    }));
  },

  async saveSkill(skillData, isSyncPull = false) {
    const db = await getDatabase();
    const clientId = skillData.client_id || skillData.clientId || generateUUID();
    const serverId = skillData.server_id || skillData.serverId || skillData._id || null;
    const now = new Date().toISOString();

    const existing = await db.getFirstAsync(
      `SELECT client_id, server_id FROM portfolio_skills WHERE client_id = ? OR (server_id IS NOT NULL AND server_id = ?)`,
      [clientId, serverId]
    );

    if (existing) {
      await db.runAsync(
        `UPDATE portfolio_skills SET 
          server_id = COALESCE(?, server_id),
          name = ?, category = ?, level = ?, icon = ?, sync_status = ?, updated_at = ?
         WHERE client_id = ?`,
        [
          serverId,
          skillData.name,
          skillData.category || 'General',
          Number(skillData.level || 80),
          skillData.icon || '',
          isSyncPull ? 'SYNCED' : 'PENDING_UPDATE',
          now,
          existing.client_id,
        ]
      );
      if (!isSyncPull) {
        await SyncOutboxDao.enqueueMutation('portfolio_skill', 'UPDATE', existing.client_id, {
          ...skillData,
          _id: existing.server_id || serverId,
        });
      }
      return existing.client_id;
    } else {
      await db.runAsync(
        `INSERT INTO portfolio_skills (client_id, server_id, name, category, level, icon, sync_status, is_deleted, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, ?)`,
        [
          clientId,
          serverId,
          skillData.name,
          skillData.category || 'General',
          Number(skillData.level || 80),
          skillData.icon || '',
          isSyncPull ? 'SYNCED' : 'PENDING_CREATE',
          now,
          now,
        ]
      );
      if (!isSyncPull) {
        await SyncOutboxDao.enqueueMutation('portfolio_skill', 'CREATE', clientId, skillData);
      }
      return clientId;
    }
  },

  async deleteSkill(clientId, isSyncPull = false) {
    const db = await getDatabase();
    const existing = await db.getFirstAsync(
      `SELECT client_id, server_id FROM portfolio_skills WHERE client_id = ? OR server_id = ?`,
      [clientId, clientId]
    );
    if (!existing) return;

    await db.runAsync(`UPDATE portfolio_skills SET is_deleted = 1, sync_status = ? WHERE client_id = ?`, [
      isSyncPull ? 'SYNCED' : 'PENDING_DELETE',
      existing.client_id,
    ]);

    if (!isSyncPull) {
      await SyncOutboxDao.enqueueMutation('portfolio_skill', 'DELETE', existing.client_id, {
        _id: existing.server_id,
      });
    }
  },

  // ================= Photos / Gallery =================

  async getPhotos() {
    const db = await getDatabase();
    const rows = await db.getAllAsync(`SELECT * FROM portfolio_photos WHERE is_deleted = 0 ORDER BY created_at DESC`);
    return rows.map((r) => ({
      _id: r.server_id || r.client_id,
      client_id: r.client_id,
      title: r.title,
      url: r.url,
      category: r.category,
      caption: r.caption,
      syncStatus: r.sync_status,
    }));
  },

  async savePhoto(photoData, isSyncPull = false) {
    const db = await getDatabase();
    const clientId = photoData.client_id || photoData.clientId || generateUUID();
    const serverId = photoData.server_id || photoData.serverId || photoData._id || null;
    const now = new Date().toISOString();

    await db.runAsync(
      `INSERT INTO portfolio_photos (client_id, server_id, title, url, category, caption, sync_status, is_deleted, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, ?)`,
      [
        clientId,
        serverId,
        photoData.title || '',
        photoData.url || '',
        photoData.category || 'General',
        photoData.caption || '',
        isSyncPull ? 'SYNCED' : 'PENDING_CREATE',
        now,
        now,
      ]
    );

    if (!isSyncPull) {
      await SyncOutboxDao.enqueueMutation('portfolio_photo', 'CREATE', clientId, photoData);
    }
    return clientId;
  },

  // ================= Contacts =================

  async getContacts() {
    const db = await getDatabase();
    return await db.getAllAsync(`SELECT * FROM portfolio_contacts ORDER BY created_at DESC`);
  },

  async saveContact(contactData) {
    const db = await getDatabase();
    const clientId = contactData.client_id || contactData.clientId || generateUUID();
    const serverId = contactData.server_id || contactData.serverId || contactData._id || null;
    const now = new Date().toISOString();

    await db.runAsync(
      `INSERT INTO portfolio_contacts (client_id, server_id, name, email, subject, message, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        clientId,
        serverId,
        contactData.name,
        contactData.email,
        contactData.subject || '',
        contactData.message,
        contactData.status || 'unread',
        now,
      ]
    );
    return clientId;
  },
};

export default PortfolioDao;

