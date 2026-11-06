const express = require('express');
const router = express.Router();
const CalendarEvent = require('../models/CalendarEvent');
const NotificationLog = require('../models/NotificationLog');
const Calendar = require('../models/Calendar');
const CalendarAiPlan = require('../models/CalendarAiPlan');
const aiRoutinePlannerService = require('../services/aiRoutinePlannerService');
const { classifyDraftOperation, extractEventTarget } = require('../services/calendarDraftOperation');

const toTimeString = (date) => {
  const value = new Date(date);
  return `${String(value.getHours()).padStart(2, '0')}:${String(value.getMinutes()).padStart(2, '0')}`;
};

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

    const query = { userId, isDeleted: { $ne: true } };

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
    let {
      calendarId,
      targetDateStr,
      userGoal,
      planCategory,
      intensity,
      recurrenceRule,
      dietLibraryItemIds,
      userId = 'admin',
    } = req.body;
    const result = await aiRoutinePlannerService.generateAiRoutine({
      userId,
      calendarId,
      targetDateStr,
      userGoal,
      planCategory,
      intensity,
      recurrenceRule,
      dietLibraryItemIds,
    });

    if (Array.isArray(result?.routine) && result.routine.length > 0) {
      const savedPlan = await CalendarAiPlan.create({
        userId,
        calendarId,
        dateStr: targetDateStr,
        prompt: userGoal,
        recurrenceRule: recurrenceRule || { frequency: 'none' },
        routine: result.routine,
        messages: [{ role: 'assistant', text: 'Draft saved temporarily. Ask me to revise, regenerate, move, remove, or explain any event before accepting.' }],
      });
      result.planId = savedPlan._id;
      result.messages = savedPlan.messages;
    }
    res.json(result);
  } catch (error) {
    console.error('[AI Routine Route Error]', error);
    res.status(500).json({ error: error.message || 'Failed to generate AI routine' });
  }
});

// Discuss or revise a draft routine. This endpoint never creates calendar events.
router.post('/ai-routine-chat', async (req, res) => {
  try {
    let {
      message = '',
      routine = [],
      targetDateStr,
      calendarId,
      userId = 'admin',
      executeOperations = false,
      planId,
    } = req.body;
    // Chat only edits the temporary draft. Database writes happen after acceptance.
    executeOperations = false;
    const text = String(message).trim();
    if (!text) return res.status(400).json({ error: 'Message is required.' });
    if (!Array.isArray(routine) && !planId) return res.status(400).json({ error: 'Routine draft is required.' });

    let savedPlan = null;
    if (planId) {
      savedPlan = await CalendarAiPlan.findOne({ _id: planId, userId, status: 'draft' });
      if (!savedPlan) return res.status(404).json({ error: 'Temporary AI draft was not found or is no longer active.' });
      routine = savedPlan.routine;
    }

    const lower = text.toLowerCase();
    let updatedRoutine = routine.map((item) => ({ ...item }));
    let reply = 'I can revise the draft without changing your calendar. Ask me to move, remove, or explain an event.';
    let operationResult = null;
    const aiOperation = await aiRoutinePlannerService.interpretDraftMessage({
      message: text,
      routine,
      recurrenceRule: savedPlan?.recurrenceRule,
    });
    const operation = aiOperation?.type && aiOperation.type !== 'unknown'
      ? {
          type: aiOperation.type,
          match: aiOperation.time ? [`at ${aiOperation.time}`, aiOperation.time, '', ''] : null,
          hour: aiOperation.time ? Number(aiOperation.time.split(':')[0]) : undefined,
          minute: aiOperation.time ? Number(aiOperation.time.split(':')[1]) : undefined,
          target: aiOperation.target || '',
        }
      : classifyDraftOperation(text);
    const timeMatch = operation.match;
    const wantsRecreate = operation.type === 'replace-plan';

    if (wantsRecreate) {
      const { hour, minute } = operation;
      const firstStart = updatedRoutine.length ? new Date(updatedRoutine[0].startAt) : null;
      const requestedStart = firstStart ? new Date(firstStart) : null;
      const shiftMs = requestedStart
        ? (requestedStart.setHours(hour, minute, 0, 0), requestedStart.getTime() - firstStart.getTime())
        : 0;

      updatedRoutine = updatedRoutine.map((item) => {
        const start = new Date(item.startAt);
        const end = new Date(item.endAt);
        const duration = Math.max(end.getTime() - start.getTime(), 30 * 60 * 1000);
        start.setTime(start.getTime() + shiftMs);
        return { ...item, startAt: start, endAt: new Date(start.getTime() + duration), calendarId: item.calendarId || calendarId };
      });

      if (executeOperations && calendarId) {
        const deleted = await CalendarEvent.deleteMany({ userId, calendarId });
        const created = [];
        for (const item of updatedRoutine) {
          if (!item.title || !item.startAt) continue;
          const event = await CalendarEvent.create({
            userId,
            calendarId,
            title: String(item.title).trim(),
            description: item.description || '',
            startAt: new Date(item.startAt),
            endAt: new Date(item.endAt || new Date(item.startAt).getTime() + 60 * 60 * 1000),
            priority: item.priority || 'medium',
            status: 'scheduled',
            recurrenceRule: item.recurrenceRule || { frequency: 'none' },
            reminders: [{ offsetMinutes: 15, isEnabled: true }],
          });
          await syncNotificationLogs(event);
          created.push(event);
        }
        operationResult = { type: 'replace-plan', deleted: deleted.deletedCount || 0, created: created.length };
        reply = `Deleted ${operationResult.deleted} existing event${operationResult.deleted === 1 ? '' : 's'} and recreated ${operationResult.created} draft event${operationResult.created === 1 ? '' : 's'} from ${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}.`;
      } else {
        reply = `Recreated the draft timing from ${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}. Review the pending changes, then press Accept to write them.`;
      }
    } else if (operation.type === 'remove-all' || operation.type === 'remove-event') {
      const before = updatedRoutine.length;
      const targetText = operation.target || extractEventTarget(text);
      if (operation.type === 'remove-all') {
        updatedRoutine = [];
        if (executeOperations && calendarId) {
          const result = await CalendarEvent.deleteMany({ userId, calendarId });
          operationResult = { type: 'delete-all', count: result.deletedCount || 0 };
          reply = `Removed ${operationResult.count} event${operationResult.count === 1 ? '' : 's'} from the calendar and cleared the draft.`;
        } else {
          reply = 'All draft routine items were removed. Review the pending removals, then press Accept to write them.';
        }
      } else {
        updatedRoutine = updatedRoutine.filter((item) => !targetText || !`${item.title || ''} ${item.description || ''}`.toLowerCase().includes(targetText));
        if (executeOperations && calendarId && targetText) {
          const search = new RegExp(targetText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
          const result = await CalendarEvent.deleteMany({
            userId,
            calendarId,
            $or: [{ title: search }, { description: search }],
          });
          operationResult = { type: 'delete', count: result.deletedCount || 0 };
        }
        reply = updatedRoutine.length < before
          ? operationResult
            ? `Removed ${operationResult.count} matching database event${operationResult.count === 1 ? '' : 's'} and updated the draft.`
            : 'I removed the matching item from the draft. Review the pending removal, then press Accept to write it.'
          : 'I could not find a matching draft item. Try the exact event title.';
      }
    } else if (operation.type === 'shift-plan' || operation.type === 'move-event') {
      const { hour, minute } = operation;
      const isPlanStart = operation.type === 'shift-plan';
      const targetText = isPlanStart ? '' : (operation.target || extractEventTarget(text, timeMatch?.[0]));
      let changed = false;
      let shiftMs = 0;
      if (isPlanStart && updatedRoutine.length) {
        const firstStart = new Date(updatedRoutine[0].startAt);
        const requestedStart = new Date(firstStart);
        requestedStart.setHours(hour, minute, 0, 0);
        shiftMs = requestedStart.getTime() - firstStart.getTime();
      }
      updatedRoutine = updatedRoutine.map((item) => {
        if (targetText && !`${item.title || ''} ${item.description || ''}`.toLowerCase().includes(targetText)) return item;
        const start = new Date(item.startAt);
        const end = new Date(item.endAt);
        const duration = Math.max(end.getTime() - start.getTime(), 30 * 60 * 1000);
        if (isPlanStart) {
          start.setTime(start.getTime() + shiftMs);
        } else {
          start.setHours(hour, minute, 0, 0);
        }
        changed = true;
        return { ...item, startAt: start, endAt: new Date(start.getTime() + duration) };
      });
      if (executeOperations && calendarId && changed) {
        const search = targetText
          ? new RegExp(targetText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')
          : null;
        const draftTitles = updatedRoutine
          .map((item) => String(item.title || '').trim())
          .filter(Boolean)
          .map((title) => new RegExp(title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'));
        const existingEvents = await CalendarEvent.find({
          userId,
          calendarId,
          $or: search
            ? [{ title: search }, { description: search }]
            : draftTitles.map((title) => ({ title })),
        }).sort({ startAt: 1 });
        for (const existing of existingEvents) {
          const start = new Date(existing.startAt);
          const end = new Date(existing.endAt);
          const duration = Math.max(end.getTime() - start.getTime(), 30 * 60 * 1000);
          if (isPlanStart) {
            start.setTime(start.getTime() + shiftMs);
          } else {
            start.setHours(hour, minute, 0, 0);
          }
          existing.startAt = start;
          existing.endAt = new Date(start.getTime() + duration);
          await existing.save();
          await syncNotificationLogs(existing);
          operationResult = { type: 'move', count: existingEvents.length };
        }
      }
      reply = changed
        ? operationResult
          ? `${isPlanStart ? 'Shifted the draft plan' : 'Moved the draft'} and updated ${operationResult.count} matching calendar event${operationResult.count === 1 ? '' : 's'}.`
          : isPlanStart
            ? `Shifted the entire draft so it starts at ${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}. Review the pending changes, then press Accept.`
            : `I moved the draft item to ${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}. Review the pending change, then press Accept.`
        : 'I could not find a matching draft item. Include part of its exact title.';
    } else if (operation.type === 'explain') {
      reply = updatedRoutine.map((item) => `${item.title}: ${item.conflictResolution || item.coOccurrenceNote || 'No conflict noted.'}`).join(' ');
    } else if (operation.type === 'list') {
      reply = updatedRoutine.length ? updatedRoutine.map((item) => `${item.title} at ${toTimeString(item.startAt)}`).join(' • ') : 'The draft is empty. Go back and generate a new routine.';
    }

    if (savedPlan) {
      savedPlan.routine = updatedRoutine;
      if (operation.type === 'replace-plan') savedPlan.operation = 'replace';
      savedPlan.messages.push(
        { role: 'user', text },
        { role: 'assistant', text: reply }
      );
      await savedPlan.save();
    }

    const beforeByTitle = new Map((routine || []).map((item) => [String(item.title || ''), item]));
    const changes = [];
    for (const item of updatedRoutine) {
      const key = String(item.title || '');
      const before = beforeByTitle.get(key);
      if (!before) changes.push({ type: 'added', title: item.title, item });
      else if (String(before.startAt) !== String(item.startAt) || String(before.endAt) !== String(item.endAt) || String(before.description || '') !== String(item.description || '')) {
        changes.push({ type: 'updated', title: item.title, before, after: item });
      }
      beforeByTitle.delete(key);
    }
    for (const item of beforeByTitle.values()) changes.push({ type: 'removed', title: item.title, item });

    res.json({
      success: true,
      reply,
      targetDateStr,
      routine: updatedRoutine,
      calendarChanged: false,
      operationResult: null,
      changes,
      planId: savedPlan?._id || planId || null,
      requiresCalendarReplace: savedPlan?.operation === 'replace',
    });
  } catch (error) {
    console.error('[AI Routine Chat Error]', error);
    res.status(500).json({ error: error.message || 'Failed to update routine draft' });
  }
});

router.post('/ai-routine-plan/:id/accept', async (req, res) => {
  try {
    const plan = await CalendarAiPlan.findOne(
      { _id: req.params.id, userId: req.body.userId || 'admin', status: 'draft' },
    );
    if (!plan) return res.status(404).json({ error: 'Temporary AI draft was not found.' });
    if (plan.operation === 'replace') {
      await CalendarEvent.deleteMany({ userId: plan.userId, calendarId: plan.calendarId });
      for (const item of plan.routine) {
        const event = await CalendarEvent.create({
          userId: plan.userId,
          calendarId: plan.calendarId,
          title: String(item.title || '').trim(),
          description: item.description || '',
          startAt: new Date(item.startAt),
          endAt: new Date(item.endAt || new Date(item.startAt).getTime() + 60 * 60 * 1000),
          priority: item.priority || 'medium',
          status: 'scheduled',
          recurrenceRule: item.recurrenceRule || plan.recurrenceRule || { frequency: 'none' },
          reminders: [{ offsetMinutes: 15, isEnabled: true }],
        });
        await syncNotificationLogs(event);
      }
    }
    plan.status = 'accepted';
    await plan.save();
    res.json({ success: true, planId: plan._id, status: plan.status, operation: plan.operation });
  } catch (error) {
    res.status(500).json({ error: error.message || 'Failed to accept temporary AI draft.' });
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
        recurrenceRule: item.recurrenceRule || { frequency: 'none' },
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
    const calendarId = req.query.calendarId;
    const eventFilter = { userId };
    if (calendarId) eventFilter.calendarId = calendarId;
    const eventsToDelete = await CalendarEvent.find(eventFilter).select('_id').lean();
    const eventIds = eventsToDelete.map((event) => event._id);
    if (eventIds.length > 0) await NotificationLog.deleteMany({ eventId: { $in: eventIds } });
    const evRes = await CalendarEvent.deleteMany(eventFilter);
    res.json({
      success: true,
      message: calendarId ? 'Calendar events cleared' : 'All calendar events cleared',
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
