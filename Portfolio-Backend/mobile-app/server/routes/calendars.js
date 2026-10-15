const express = require('express');
const router = express.Router();
const Calendar = require('../models/Calendar');
const CalendarEvent = require('../models/CalendarEvent');

const DEFAULT_CALENDARS = [
  { name: 'Personal', color: '#7e37d8', description: 'Personal events & life tasks', isDefault: true },
  { name: 'Work', color: '#3b82f6', description: 'Work meetings, deadlines & sprints', isDefault: false },
  { name: 'Fitness', color: '#10b981', description: 'Gym, workouts, runs & health routines', isDefault: false },
  { name: 'Exam Preparation', color: '#f59e0b', description: 'Study sessions, exams & revisions', isDefault: false },
  { name: 'Projects', color: '#ec4899', description: 'Client deliveries, launches & milestones', isDefault: false },
];

// GET /api/calendars - List user calendars (seeds default if none exist)
router.get('/', async (req, res) => {
  try {
    const userId = req.query.userId || 'admin';
    let calendars = await Calendar.find({ userId, isArchived: false }).sort({ isDefault: -1, createdAt: 1 });

    if (calendars.length === 0) {
      // Auto seed default calendars
      const created = await Promise.all(
        DEFAULT_CALENDARS.map((cal) =>
          Calendar.create({ ...cal, userId })
        )
      );
      calendars = created;
    }

    res.json(calendars);
  } catch (error) {
    console.error('[Calendar GET Error]', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/calendars - Create new calendar
router.post('/', async (req, res) => {
  try {
    const { name, description, color, isDefault } = req.body;
    const userId = req.body.userId || 'admin';

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Calendar name is required' });
    }

    if (isDefault) {
      // Reset any existing default
      await Calendar.updateMany({ userId }, { isDefault: false });
    }

    const calendar = await Calendar.create({
      userId,
      name: name.trim(),
      description: description || '',
      color: color || '#7e37d8',
      isDefault: !!isDefault,
      isVisible: true,
      isArchived: false,
    });

    res.status(201).json(calendar);
  } catch (error) {
    console.error('[Calendar POST Error]', error);
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/calendars/:id - Update calendar
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, color, isVisible, isArchived, isDefault } = req.body;

    const calendar = await Calendar.findById(id);
    if (!calendar) {
      return res.status(404).json({ error: 'Calendar not found' });
    }

    if (isDefault) {
      await Calendar.updateMany({ userId: calendar.userId }, { isDefault: false });
      calendar.isDefault = true;
    }

    if (name !== undefined) calendar.name = name.trim();
    if (description !== undefined) calendar.description = description;
    if (color !== undefined) calendar.color = color;
    if (isVisible !== undefined) calendar.isVisible = isVisible;
    if (isArchived !== undefined) calendar.isArchived = isArchived;

    await calendar.save();
    res.json(calendar);
  } catch (error) {
    console.error('[Calendar PUT Error]', error);
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/calendars/:id - Delete calendar + cascade associated events
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const calendar = await Calendar.findById(id);
    if (!calendar) {
      return res.status(404).json({ error: 'Calendar not found' });
    }

    // Delete associated events
    await CalendarEvent.deleteMany({ calendarId: id });
    await Calendar.deleteOne({ _id: id });

    res.json({ success: true, message: 'Calendar and associated events deleted' });
  } catch (error) {
    console.error('[Calendar DELETE Error]', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
