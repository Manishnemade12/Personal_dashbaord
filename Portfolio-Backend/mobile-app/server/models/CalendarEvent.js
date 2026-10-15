const mongoose = require('mongoose');

const CalendarEventSchema = new mongoose.Schema(
  {
    calendarId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Calendar',
      required: true,
      index: true,
    },
    userId: { type: String, default: 'admin', index: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    startAt: { type: Date, required: true, index: true },
    endAt: { type: Date, required: true, index: true },
    isAllDay: { type: Boolean, default: false },
    color: { type: String, default: '' }, // Custom color or empty to use calendar's color
    location: { type: String, default: '' },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high'],
      default: 'medium',
    },
    status: {
      type: String,
      enum: ['scheduled', 'completed', 'cancelled'],
      default: 'scheduled',
    },
    recurrenceRule: {
      frequency: {
        type: String,
        enum: ['none', 'daily', 'weekly', 'monthly'],
        default: 'none',
      },
      interval: { type: Number, default: 1 },
      until: { type: Date, default: null },
    },
    reminders: [
      {
        offsetMinutes: { type: Number, default: 15 },
        reminderType: { type: String, default: 'notification' },
        isEnabled: { type: Boolean, default: true },
      },
    ],
  },
  { timestamps: true }
);

module.exports =
  mongoose.models.CalendarEvent || mongoose.model('CalendarEvent', CalendarEventSchema);
