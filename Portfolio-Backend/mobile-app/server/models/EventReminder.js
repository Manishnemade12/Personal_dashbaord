const mongoose = require('mongoose');

const EventReminderSchema = new mongoose.Schema(
  {
    eventId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CalendarEvent',
      required: true,
      index: true,
    },
    userId: { type: String, default: 'admin', index: true },
    reminderType: {
      type: String,
      enum: ['notification', 'popup', 'email'],
      default: 'notification',
    },
    offsetMinutes: { type: Number, required: true }, // e.g. 0, 5, 15, 30, 60, 1440
    isEnabled: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports =
  mongoose.models.EventReminder || mongoose.model('EventReminder', EventReminderSchema);
