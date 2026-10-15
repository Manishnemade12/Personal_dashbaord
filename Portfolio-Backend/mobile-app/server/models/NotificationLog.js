const mongoose = require('mongoose');

const NotificationLogSchema = new mongoose.Schema(
  {
    userId: { type: String, default: 'admin', index: true },
    eventId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CalendarEvent',
      index: true,
    },
    reminderId: { type: mongoose.Schema.Types.ObjectId },
    title: { type: String, required: true },
    body: { type: String, default: '' },
    scheduledFor: { type: Date, required: true, index: true },
    deliveredAt: { type: Date, default: null },
    status: {
      type: String,
      enum: ['pending', 'delivered', 'cancelled', 'dismissed'],
      default: 'pending',
      index: true,
    },
    deduplicationKey: { type: String, unique: true, index: true },
  },
  { timestamps: true }
);

module.exports =
  mongoose.models.NotificationLog ||
  mongoose.model('NotificationLog', NotificationLogSchema);
