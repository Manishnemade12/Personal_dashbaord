const mongoose = require('mongoose');
const syncPlugin = require('./plugins/syncPlugin');

const NoteCategorySchema = new mongoose.Schema(
  {
    userId: { type: String, default: 'admin', index: true },
    name: { type: String, required: true, trim: true },
    color: { type: String, default: '#7e37d8' },
    icon: { type: String, default: 'folder-outline' },
  },
  { timestamps: true }
);

NoteCategorySchema.index({ userId: 1, name: 1 }, { unique: true });
NoteCategorySchema.plugin(syncPlugin);

module.exports = mongoose.models.NoteCategory || mongoose.model('NoteCategory', NoteCategorySchema);

