const express = require('express');
const router = express.Router();
const Note = require('../models/Note');
const NoteCategory = require('../models/NoteCategory');

const DEFAULT_CATEGORIES = [
  { name: 'General', color: '#7e37d8', icon: 'document-text-outline' },
  { name: 'Personal', color: '#ec4899', icon: 'person-outline' },
  { name: 'Work', color: '#3b82f6', icon: 'briefcase-outline' },
  { name: 'Ideas', color: '#f59e0b', icon: 'bulb-outline' },
  { name: 'Diet & Health', color: '#10b981', icon: 'fitness-outline' },
  { name: 'Finance', color: '#06b6d4', icon: 'wallet-outline' },
];

/**
 * Helper to ensure default categories exist for user
 */
async function ensureDefaultCategories(userId = 'admin') {
  const count = await NoteCategory.countDocuments({ userId, isDeleted: { $ne: true } });
  if (count === 0) {
    await Promise.all(
      DEFAULT_CATEGORIES.map((cat) =>
        NoteCategory.create({ ...cat, userId }).catch(() => {})
      )
    );
  }
}

/**
 * GET /api/notes/categories
 * Get all categories with note count
 */
router.get('/categories', async (req, res) => {
  try {
    const userId = req.query.userId || 'admin';
    await ensureDefaultCategories(userId);

    const categories = await NoteCategory.find({ userId, isDeleted: { $ne: true } }).sort({ createdAt: 1 }).lean();

    // Compute note counts per category
    const notes = await Note.find({ userId, isDeleted: { $ne: true } }).select('category').lean();
    const countMap = {};
    let totalCount = 0;

    notes.forEach((n) => {
      const cat = (n.category || 'General').trim();
      countMap[cat] = (countMap[cat] || 0) + 1;
      totalCount++;
    });

    const enrichedCategories = categories.map((cat) => ({
      ...cat,
      count: countMap[cat.name] || 0,
    }));

    res.json({
      success: true,
      totalNotes: totalCount,
      categories: enrichedCategories,
    });
  } catch (error) {
    console.error('[Notes Categories GET Error]', error);
    res.status(500).json({ error: error.message || 'Failed to fetch categories' });
  }
});

/**
 * POST /api/notes/categories
 * Create a new custom category
 */
router.post('/categories', async (req, res) => {
  try {
    const userId = req.body.userId || 'admin';
    const { name, color = '#7e37d8', icon = 'folder-outline' } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Category name is required' });
    }

    const trimmedName = name.trim();
    const existing = await NoteCategory.findOne({ userId, name: trimmedName, isDeleted: { $ne: true } });
    if (existing) {
      return res.status(400).json({ error: 'Category already exists' });
    }

    const newCategory = await NoteCategory.create({
      userId,
      name: trimmedName,
      color,
      icon,
    });

    res.status(201).json({ success: true, category: newCategory });
  } catch (error) {
    console.error('[Notes Category POST Error]', error);
    res.status(500).json({ error: error.message || 'Failed to create category' });
  }
});

/**
 * DELETE /api/notes/categories/:name
 * Delete custom category and reassign notes to General
 */
router.delete('/categories/:name', async (req, res) => {
  try {
    const userId = req.query.userId || 'admin';
    const categoryName = decodeURIComponent(req.params.name).trim();

    if (categoryName.toLowerCase() === 'general') {
      return res.status(400).json({ error: 'Cannot delete default General category' });
    }

    await NoteCategory.deleteOne({ userId, name: categoryName });
    // Reassign notes belonging to this category to General
    await Note.updateMany({ userId, category: categoryName }, { category: 'General' });

    res.json({ success: true, message: `Category '${categoryName}' deleted and notes moved to General` });
  } catch (error) {
    console.error('[Notes Category DELETE Error]', error);
    res.status(500).json({ error: error.message || 'Failed to delete category' });
  }
});

/**
 * GET /api/notes
 * List all notes with search & category filtering
 */
router.get('/', async (req, res) => {
  try {
    const userId = req.query.userId || 'admin';
    const { category, search, pinnedOnly } = req.query;

    const filter = { userId, isDeleted: { $ne: true } };

    if (category && category !== 'All') {
      filter.category = category.trim();
    }

    if (pinnedOnly === 'true') {
      filter.isPinned = true;
    }

    if (search && search.trim()) {
      const q = search.trim();
      const regex = new RegExp(q, 'i');
      filter.$or = [{ title: regex }, { description: regex }, { tags: regex }, { category: regex }];
    }

    const notes = await Note.find(filter)
      .sort({ isPinned: -1, updatedAt: -1, createdAt: -1 })
      .lean();

    res.json(notes);
  } catch (error) {
    console.error('[Notes GET Error]', error);
    res.status(500).json({ error: error.message || 'Failed to fetch notes' });
  }
});

/**
 * GET /api/notes/:id
 * Get single note
 */
router.get('/:id', async (req, res) => {
  try {
    const note = await Note.findById(req.params.id);
    if (!note || note.isDeleted) {
      return res.status(404).json({ error: 'Note not found' });
    }
    res.json(note);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/notes
 * Create a new note
 */
router.post('/', async (req, res) => {
  try {
    const userId = req.body.userId || 'admin';
    const { title, description = '', category = 'General', color, isPinned = false, tags = [] } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ error: 'Note title is required' });
    }

    const trimmedTitle = title.trim();
    const trimmedCat = (category || 'General').trim();

    // Ensure category exists in NoteCategory table
    const existingCat = await NoteCategory.findOne({ userId, name: trimmedCat, isDeleted: { $ne: true } });
    if (!existingCat) {
      await NoteCategory.create({
        userId,
        name: trimmedCat,
        color: color || '#7e37d8',
        icon: 'folder-outline',
      }).catch(() => {});
    }

    const note = await Note.create({
      userId,
      title: trimmedTitle,
      description: description.trim(),
      category: trimmedCat,
      color: color || (existingCat ? existingCat.color : '#7e37d8'),
      isPinned: Boolean(isPinned),
      tags: Array.isArray(tags) ? tags : [],
    });

    res.status(201).json(note);
  } catch (error) {
    console.error('[Notes POST Error]', error);
    res.status(500).json({ error: error.message || 'Failed to create note' });
  }
});

/**
 * PUT /api/notes/:id
 * Update a note
 */
router.put('/:id', async (req, res) => {
  try {
    const { title, description, category, color, isPinned, tags } = req.body;
    const update = {};

    if (title !== undefined) update.title = title.trim();
    if (description !== undefined) update.description = description.trim();
    if (category !== undefined) update.category = category.trim();
    if (color !== undefined) update.color = color;
    if (isPinned !== undefined) update.isPinned = Boolean(isPinned);
    if (tags !== undefined) update.tags = Array.isArray(tags) ? tags : [];

    const updated = await Note.findByIdAndUpdate(req.params.id, update, { new: true });
    if (!updated) {
      return res.status(404).json({ error: 'Note not found' });
    }

    res.json(updated);
  } catch (error) {
    console.error('[Notes PUT Error]', error);
    res.status(500).json({ error: error.message || 'Failed to update note' });
  }
});

/**
 * PATCH /api/notes/:id/pin
 * Toggle pin status
 */
router.patch('/:id/pin', async (req, res) => {
  try {
    const note = await Note.findById(req.params.id);
    if (!note) {
      return res.status(404).json({ error: 'Note not found' });
    }

    note.isPinned = !note.isPinned;
    await note.save();

    res.json({ success: true, isPinned: note.isPinned, note });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /api/notes/:id
 * Delete note
 */
router.delete('/:id', async (req, res) => {
  try {
    const deleted = await Note.findByIdAndDelete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: 'Note not found' });
    }
    res.json({ success: true, message: 'Note deleted successfully' });
  } catch (error) {
    console.error('[Notes DELETE Error]', error);
    res.status(500).json({ error: error.message || 'Failed to delete note' });
  }
});

module.exports = router;

