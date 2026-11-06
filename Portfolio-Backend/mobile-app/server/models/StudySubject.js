const mongoose = require('mongoose');
const syncPlugin = require('./plugins/syncPlugin');

const StudySubjectSchema = new mongoose.Schema(
  {
    userId: { type: String, default: 'admin', index: true },
    name: { type: String, required: true, trim: true },
    description: { type: String, default: '', trim: true },
    orderIndex: { type: Number, default: 0 },
  },
  { timestamps: true }
);

StudySubjectSchema.plugin(syncPlugin);

module.exports = mongoose.models.StudySubject || mongoose.model('StudySubject', StudySubjectSchema);
