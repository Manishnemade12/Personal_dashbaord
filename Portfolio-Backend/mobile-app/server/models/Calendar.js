const mongoose = require('mongoose');

const CalendarSchema = new mongoose.Schema(
  {
    userId: { type: String, default: 'admin' },
    name: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    color: { type: String, default: '#7e37d8' }, // Hex color code
    isDefault: { type: Boolean, default: false },
    isVisible: { type: Boolean, default: true },
    isArchived: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = mongoose.models.Calendar || mongoose.model('Calendar', CalendarSchema);
