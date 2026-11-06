const mongoose = require('mongoose');
const syncPlugin = require('./plugins/syncPlugin');

const TermSchema = new mongoose.Schema(
  {
    term: { type: String, required: true },
    meaning: { type: String, required: true },
  },
  { _id: false }
);

const StudyChunkSchema = new mongoose.Schema(
  {
    userId: { type: String, default: 'admin', index: true },
    subjectId: { type: String, required: true, index: true },
    parentChunkId: { type: String, default: null, index: true },
    title: { type: String, required: true, trim: true },
    orderIndex: { type: Number, default: 0 },
    summary: { type: String, default: '' },
    notes: { type: String, default: '' },
    keyPoints: [{ type: String }],
    terms: [TermSchema],
    revised: { type: Boolean, default: false, index: true },
  },
  { timestamps: true }
);

StudyChunkSchema.plugin(syncPlugin);

module.exports = mongoose.models.StudyChunk || mongoose.model('StudyChunk', StudyChunkSchema);

