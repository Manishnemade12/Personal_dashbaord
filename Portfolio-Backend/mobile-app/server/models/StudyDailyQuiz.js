const mongoose = require('mongoose');
const syncPlugin = require('./plugins/syncPlugin');

const DailyQuestionItemSchema = new mongoose.Schema(
  {
    question: { type: String, required: true },
    type: { type: String, default: 'mcq' },
    options: [{ type: String }],
    answer: { type: String, required: true },
    explanation: { type: String, default: '' },
  },
  { _id: false }
);

const StudyDailyQuizSchema = new mongoose.Schema(
  {
    userId: { type: String, default: 'admin', index: true },
    subjectId: { type: String, required: true, index: true },
    quizDate: { type: String, required: true, index: true }, // 'YYYY-MM-DD'
    questions: [DailyQuestionItemSchema],
    totalQuestions: { type: Number, default: 0 },
    difficulty: { type: String, enum: ['easy', 'medium', 'hard', 'mixed'], default: 'medium' },
    source: { type: String, enum: ['ai', 'pyq', 'manual'], default: 'ai' },
  },
  { timestamps: true }
);

StudyDailyQuizSchema.index({ userId: 1, subjectId: 1, quizDate: 1 });
StudyDailyQuizSchema.plugin(syncPlugin);

module.exports = mongoose.models.StudyDailyQuiz || mongoose.model('StudyDailyQuiz', StudyDailyQuizSchema);

