const mongoose = require('mongoose');
const syncPlugin = require('./plugins/syncPlugin');

const NoteSchema = new mongoose.Schema(
  {
    userId: { type: String, default: 'admin', index: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, default: '', trim: true },
    category: { type: String, default: 'General', trim: true, index: true },
    color: { type: String, default: '#7e37d8' },
    isPinned: { type: Boolean, default: false, index: true },
    tags: [{ type: String, trim: true }],
  },
  { timestamps: true }
);

NoteSchema.plugin(syncPlugin);

module.exports = mongoose.models.Note || mongoose.model('Note', NoteSchema);
