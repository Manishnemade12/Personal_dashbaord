const mongoose = require('mongoose');

const NqtQuizAnswerSchema = new mongoose.Schema(
  {
    answerId: { type: String, required: true, unique: true, index: true },
    attemptId: { type: String, required: true, index: true },
    quizId: { type: String, required: true, index: true },
    questionId: { type: String, required: true, index: true },
    userId: { type: String, required: true, index: true },
    subjectId: { type: String, required: true, index: true },
    topicId: { type: String, required: true, index: true },
    selectedOption: { type: String, enum: ['A', 'B', 'C', 'D', null], default: null },
    correctOption: { type: String, enum: ['A', 'B', 'C', 'D'], required: true },
    isCorrect: { type: Boolean, required: true },
    isMarked: { type: Boolean, default: false },
    timeSpentSeconds: { type: Number, default: 0 },
    answeredAt: { type: Date, default: Date.now },
  },
  { timestamps: true, collection: 'nqt_quiz_answers' }
);

NqtQuizAnswerSchema.index({ userId: 1, topicId: 1, answeredAt: -1 });
NqtQuizAnswerSchema.index({ attemptId: 1, questionId: 1 }, { unique: true });

module.exports = mongoose.models.NqtQuizAnswer || mongoose.model('NqtQuizAnswer', NqtQuizAnswerSchema);
