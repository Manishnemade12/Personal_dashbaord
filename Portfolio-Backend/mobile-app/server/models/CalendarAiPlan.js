const mongoose = require('mongoose');

const CalendarAiPlanSchema = new mongoose.Schema(
  {
    userId: { type: String, default: 'admin', index: true },
    calendarId: { type: mongoose.Schema.Types.ObjectId, ref: 'Calendar', required: true, index: true },
    dateStr: { type: String, required: true },
    prompt: { type: String, default: '' },
    recurrenceRule: { type: Object, default: { frequency: 'none' } },
    status: { type: String, enum: ['draft', 'accepted', 'discarded'], default: 'draft' },
    routine: { type: Array, default: [] },
    messages: { type: Array, default: [] },
  },
  { timestamps: true }
);

module.exports = mongoose.models.CalendarAiPlan || mongoose.model('CalendarAiPlan', CalendarAiPlanSchema);
