const mongoose = require('mongoose');
const syncPlugin = require('./plugins/syncPlugin');

const AnswerItemSchema = new mongoose.Schema(
  {
    questionIdx: { type: Number, required: true },
    selectedAnswer: { type: String, default: '' },
    isCorrect: { type: Boolean, default: false },
  },
  { _id: false }
);

const StudyDailyQuizAttemptSchema = new mongoose.Schema(
  {
    userId: { type: String, default: 'admin', index: true },
    dailyQuizId: { type: String, required: true, index: true },
    subjectId: { type: String, required: true, index: true },
    quizDate: { type: String, required: true, index: true },
    answers: [AnswerItemSchema],
    score: { type: Number, required: true },
    totalQuestions: { type: Number, required: true },
    percentage: { type: Number, required: true },
    timeTaken: { type: Number, default: 0 },
    completed: { type: Boolean, default: true },
    startedAt: { type: Date, default: Date.now },
    completedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

StudyDailyQuizAttemptSchema.plugin(syncPlugin);

module.exports = mongoose.models.StudyDailyQuizAttempt || mongoose.model('StudyDailyQuizAttempt', StudyDailyQuizAttemptSchema);

