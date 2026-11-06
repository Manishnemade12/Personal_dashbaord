const mongoose = require('mongoose');
const syncPlugin = require('./plugins/syncPlugin');

const StudyWeakQuestionSchema = new mongoose.Schema(
  {
    userId: { type: String, default: 'admin', index: true },
    subjectId: { type: String, required: true, index: true },
    questionHash: { type: String, required: true, index: true },
    question: { type: String, required: true },
    options: [{ type: String }],
    answer: { type: String, required: true },
    explanation: { type: String, default: '' },
    timesWrong: { type: Number, default: 1 },
    timesCorrect: { type: Number, default: 0 },
    mastered: { type: Boolean, default: false, index: true },
    lastWrongAt: { type: Date, default: Date.now },
    lastSeenAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

StudyWeakQuestionSchema.index({ userId: 1, subjectId: 1, questionHash: 1 }, { unique: true });
StudyWeakQuestionSchema.plugin(syncPlugin);

module.exports = mongoose.models.StudyWeakQuestion || mongoose.model('StudyWeakQuestion', StudyWeakQuestionSchema);

