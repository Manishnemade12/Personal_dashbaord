const express = require('express');
const router = express.Router();
const NotificationLog = require('../models/NotificationLog');

// GET /api/reminders/upcoming - Get imminent or active reminders
router.get('/upcoming', async (req, res) => {
  try {
    const userId = req.query.userId || 'admin';
    const now = new Date();
    const future24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const past2h = new Date(now.getTime() - 2 * 60 * 60 * 1000);

    const logs = await NotificationLog.find({
      userId,
      status: { $in: ['pending', 'delivered'] },
      scheduledFor: { $gte: past2h, $lte: future24h },
    })
      .populate('eventId', 'title startAt endAt location priority status calendarId')
      .sort({ scheduledFor: 1 });

    res.json(logs);
  } catch (error) {
    console.error('[Reminders Upcoming Error]', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/reminders/dismiss/:id - Mark reminder as dismissed
router.post('/dismiss/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await NotificationLog.findByIdAndUpdate(id, {
      status: 'dismissed',
      deliveredAt: new Date(),
    });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/reminders/logs - Get log history
router.get('/logs', async (req, res) => {
  try {
    const userId = req.query.userId || 'admin';
    const logs = await NotificationLog.find({ userId })
      .populate('eventId', 'title startAt')
      .sort({ createdAt: -1 })
      .limit(50);
    res.json(logs);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
