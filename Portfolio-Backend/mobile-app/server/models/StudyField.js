const mongoose = require('mongoose');
const syncPlugin = require('./plugins/syncPlugin');

const StudyFieldSchema = new mongoose.Schema(
  {
    userId: { type: String, default: 'admin', index: true },
    name: { type: String, required: true, trim: true },
    code: { type: String, trim: true, default: '' },
    description: { type: String, default: '', trim: true },
    icon: { type: String, default: 'school-outline' },
    color: { type: String, default: '#6366f1' },
    isDefault: { type: Boolean, default: false },
    orderIndex: { type: Number, default: 0 },
  },
  { timestamps: true }
);

StudyFieldSchema.index({ userId: 1, isDeleted: 1 });
StudyFieldSchema.plugin(syncPlugin);

module.exports = mongoose.models.StudyField || mongoose.model('StudyField', StudyFieldSchema);
