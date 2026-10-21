const express = require('express');
const router = express.Router();
const CalendarEvent = require('../models/CalendarEvent');
const NotificationLog = require('../models/NotificationLog');
const Calendar = require('../models/Calendar');
const aiRoutinePlannerService = require('../services/aiRoutinePlannerService');

// Helper to schedule notification logs
const syncNotificationLogs = async (event) => {
  try {
    // Delete existing pending logs for this event
    await NotificationLog.deleteMany({ eventId: event._id, status: 'pending' });

    if (!event.reminders || event.reminders.length === 0) return;

    const logsToCreate = [];
    for (const rem of event.reminders) {
      if (!rem.isEnabled) continue;
      const offsetMs = (rem.offsetMinutes || 0) * 60 * 1000;
      const scheduledFor = new Date(new Date(event.startAt).getTime() - offsetMs);

      // Only schedule if it is in future or within 10 minutes past
      const now = new Date();
      if (scheduledFor.getTime() > now.getTime() - 10 * 60 * 1000) {
        const deduplicationKey = `${event._id}_${rem.offsetMinutes}_${scheduledFor.getTime()}`;
        logsToCreate.push({
          userId: event.userId,
          eventId: event._id,
          reminderId: rem._id,
          title: `Upcoming: ${event.title}`,
          body: rem.offsetMinutes === 0
            ? `Event starting now at ${new Date(event.startAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
            : `Event starting in ${rem.offsetMinutes} mins`,
          scheduledFor,
          status: 'pending',
          deduplicationKey,
        });
      }
    }

    if (logsToCreate.length > 0) {
      for (const log of logsToCreate) {
        await NotificationLog.updateOne(
          { deduplicationKey: log.deduplicationKey },
          { $set: log },
          { upsert: true }
        );
      }
    }
  } catch (err) {
    console.error('[NotificationLog Sync Error]', err.message);
  }
};

// GET /api/calendar-events - Filterable list of events
router.get('/', async (req, res) => {
  try {
    const { calendarId, start, end, search, status } = req.query;
    const userId = req.query.userId || 'admin';

    const query = { userId };

    if (calendarId) {
      query.calendarId = calendarId;
    }

    if (status) {
      query.status = status;
    }

    if (start || end) {
      query.startAt = {};
      if (start) query.startAt.$gte = new Date(start);
      if (end) query.startAt.$lte = new Date(end);
    }

    if (search && search.trim()) {
      const regex = new RegExp(search.trim(), 'i');
      query.$or = [{ title: regex }, { description: regex }, { location: regex }];
    }

    const events = await CalendarEvent.find(query)
      .populate('calendarId', 'name color isDefault')
      .sort({ startAt: 1 });

    res.json(events);
  } catch (error) {
    console.error('[CalendarEvent GET Error]', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/calendar-events/:id
router.get('/:id', async (req, res) => {
  try {
    const event = await CalendarEvent.findById(req.params.id).populate('calendarId');
    if (!event) return res.status(404).json({ error: 'Event not found' });
    res.json(event);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/calendar-events/ai-routine - Generate cross-calendar aware AI routine
router.post('/ai-routine', async (req, res) => {
  try {
    const { calendarId, targetDateStr, userGoal, planCategory, intensity, userId = 'admin' } = req.body;
    const result = await aiRoutinePlannerService.generateAiRoutine({
      userId,
      calendarId,
      targetDateStr,
      userGoal,
      planCategory,
      intensity,
    });
    res.json(result);
  } catch (error) {
    console.error('[AI Routine Route Error]', error);
    res.status(500).json({ error: error.message || 'Failed to generate AI routine' });
  }
});

// POST /api/calendar-events/bulk - Create multiple events in bulk (for accepted AI routines)
router.post('/bulk', async (req, res) => {
  try {
    const { events = [], userId = 'admin' } = req.body;
    if (!Array.isArray(events) || events.length === 0) {
      return res.status(400).json({ error: 'Array of events is required' });
    }

    const createdList = [];
    for (const item of events) {
      if (!item.title || !item.startAt || !item.calendarId) continue;
      const ev = await CalendarEvent.create({
        userId,
        calendarId: item.calendarId,
        title: item.title.trim(),
        description: item.description || '',
        startAt: new Date(item.startAt),
        endAt: new Date(item.endAt || new Date(item.startAt).getTime() + 60 * 60 * 1000),
        isAllDay: !!item.isAllDay,
        color: item.color || '',
        location: item.location || '',
        priority: item.priority || 'medium',
        status: 'scheduled',
        reminders: [{ offsetMinutes: 15, isEnabled: true }],
      });
      await syncNotificationLogs(ev);
      createdList.push(ev);
    }

    res.status(201).json({
      success: true,
      count: createdList.length,
      events: createdList,
    });
  } catch (error) {
    console.error('[CalendarEvent BULK POST Error]', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/calendar-events - Create new event
router.post('/', async (req, res) => {
  try {
    const {
      calendarId,
      title,
      description,
      startAt,
      endAt,
      isAllDay,
      color,
      location,
      priority,
      status,
      recurrenceRule,
      reminders,
    } = req.body;
    const userId = req.body.userId || 'admin';

    if (!title || !title.trim()) {
      return res.status(400).json({ error: 'Event title is required' });
    }
    if (!startAt) {
      return res.status(400).json({ error: 'Start date/time is required' });
    }

    let targetCalendarId = calendarId;
    if (!targetCalendarId) {
      let cal = (await Calendar.findOne({ userId, isDefault: true })) || (await Calendar.findOne({ userId }));
      if (!cal) {
        cal = await Calendar.create({
          userId,
          name: 'Personal',
          color: '#7e37d8',
          description: 'Personal events',
          isDefault: true,
          isVisible: true,
        });
      }
      targetCalendarId = cal._id;
    }

    const startDate = new Date(startAt);
    if (isNaN(startDate.getTime())) {
      return res.status(400).json({ error: 'Valid start date/time is required' });
    }
    const endDate = endAt && !isNaN(new Date(endAt).getTime())
      ? new Date(endAt)
      : new Date(startDate.getTime() + 60 * 60 * 1000);

    const event = await CalendarEvent.create({
      calendarId: targetCalendarId,
      userId,
      title: title.trim(),
      description: description || '',
      startAt: startDate,
      endAt: endDate,
      isAllDay: !!isAllDay,
      color: color || '',
      location: location || '',
      priority: priority || 'medium',
      status: status || 'scheduled',
      recurrenceRule: recurrenceRule || { frequency: 'none' },
      reminders: reminders && reminders.length > 0 ? reminders : [{ offsetMinutes: 15, isEnabled: true }],
    });

    await syncNotificationLogs(event);
    const populated = await CalendarEvent.findById(event._id).populate('calendarId');
    res.status(201).json(populated);
  } catch (error) {
    console.error('[CalendarEvent POST Error]', error);
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/calendar-events/:id - Update event
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const event = await CalendarEvent.findById(id);
    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    if (updateData.title) event.title = updateData.title.trim();
    if (updateData.description !== undefined) event.description = updateData.description;
    if (updateData.calendarId) event.calendarId = updateData.calendarId;
    if (updateData.startAt) event.startAt = new Date(updateData.startAt);
    if (updateData.endAt) event.endAt = new Date(updateData.endAt);
    if (updateData.isAllDay !== undefined) event.isAllDay = updateData.isAllDay;
    if (updateData.color !== undefined) event.color = updateData.color;
    if (updateData.location !== undefined) event.location = updateData.location;
    if (updateData.priority) event.priority = updateData.priority;
    if (updateData.status) event.status = updateData.status;
    if (updateData.recurrenceRule) event.recurrenceRule = updateData.recurrenceRule;
    if (updateData.reminders) event.reminders = updateData.reminders;

    await event.save();
    await syncNotificationLogs(event);

    const populated = await CalendarEvent.findById(event._id).populate('calendarId');
    res.json(populated);
  } catch (error) {
    console.error('[CalendarEvent PUT Error]', error);
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/calendar-events/clear-all
router.delete('/clear-all', async (req, res) => {
  try {
    const userId = req.query.userId || 'admin';
    await NotificationLog.deleteMany({ userId });
    const evRes = await CalendarEvent.deleteMany({ userId });
    res.json({
      success: true,
      message: 'All calendar events cleared',
      deletedEvents: evRes.deletedCount,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/calendar-events/:id
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await NotificationLog.deleteMany({ eventId: id });
    await CalendarEvent.deleteOne({ _id: id });
    res.json({ success: true, message: 'Event deleted' });
  } catch (error) {
    console.error('[CalendarEvent DELETE Error]', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
