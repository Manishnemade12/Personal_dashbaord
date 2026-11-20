const mongoose = require('mongoose');

const NqtTopicPerformanceSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true },
    topicId: { type: String, required: true },
    subjectId: { type: String, required: true, index: true },
    questionsSeen: { type: Number, default: 0 },
    correctCount: { type: Number, default: 0 },
    incorrectCount: { type: Number, default: 0 },
    unansweredCount: { type: Number, default: 0 },
    totalTimeSeconds: { type: Number, default: 0 },
    lastAttemptAt: { type: Date, default: null },
  },
  { timestamps: true, collection: 'nqt_topic_performance' }
);

NqtTopicPerformanceSchema.index({ userId: 1, topicId: 1 }, { unique: true });

module.exports = mongoose.models.NqtTopicPerformance || mongoose.model('NqtTopicPerformance', NqtTopicPerformanceSchema);
