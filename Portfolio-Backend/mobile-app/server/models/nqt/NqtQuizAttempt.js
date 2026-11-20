const mongoose = require('mongoose');

const NqtQuizAttemptSchema = new mongoose.Schema(
  {
    attemptId: { type: String, required: true, unique: true, index: true },
    quizId: { type: String, required: true, index: true },
    userId: { type: String, required: true, index: true },
    score: { type: Number, required: true },
    correctCount: { type: Number, required: true },
    incorrectCount: { type: Number, required: true },
    unansweredCount: { type: Number, required: true },
    accuracy: { type: Number, required: true },
    timeTakenSeconds: { type: Number, default: 0 },
    startedAt: { type: Date, default: Date.now },
    completedAt: { type: Date, default: Date.now },
  },
  { timestamps: true, collection: 'nqt_quiz_attempts' }
);

NqtQuizAttemptSchema.index({ userId: 1, completedAt: -1 });

module.exports = mongoose.models.NqtQuizAttempt || mongoose.model('NqtQuizAttempt', NqtQuizAttemptSchema);
