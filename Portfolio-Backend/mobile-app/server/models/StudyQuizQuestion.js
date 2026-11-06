const mongoose = require('mongoose');
const syncPlugin = require('./plugins/syncPlugin');

const StudyQuizQuestionSchema = new mongoose.Schema(
  {
    userId: { type: String, default: 'admin', index: true },
    chunkId: { type: String, required: true, index: true },
    question: { type: String, required: true },
    type: { type: String, enum: ['mcq', 'true_false', 'one_line'], default: 'mcq' },
    options: [{ type: String }],
    answer: { type: String, required: true },
    explanation: { type: String, default: '' },
    orderIndex: { type: Number, default: 0 },
  },
  { timestamps: true }
);

StudyQuizQuestionSchema.plugin(syncPlugin);

module.exports = mongoose.models.StudyQuizQuestion || mongoose.model('StudyQuizQuestion', StudyQuizQuestionSchema);

