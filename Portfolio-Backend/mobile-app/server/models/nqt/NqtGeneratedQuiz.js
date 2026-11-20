const mongoose = require('mongoose');

const NqtGeneratedQuizSchema = new mongoose.Schema(
  {
    quizId: { type: String, required: true, unique: true, index: true },
    userId: { type: String, required: true, index: true },
    mode: { type: String, enum: ['mixed', 'subject', 'topic', 'full_mock'], required: true },
    subjectId: { type: String, default: null, index: true },
    topicId: { type: String, default: null, index: true },
    difficulty: { type: String, enum: ['easy', 'medium', 'hard', 'exam'], required: true },
    questionCount: { type: Number, required: true },
    durationSeconds: { type: Number, required: true },
    questionIds: [{ type: String }],
    config: { type: mongoose.Schema.Types.Mixed, default: {} },
    patternProfile: { type: String, required: true },
    promptVersion: { type: String, required: true },
    provider: { type: String, enum: ['groq', 'xai'], required: true },
    model: { type: String, required: true },
    source: { type: String, enum: ['ai'], default: 'ai' },
  },
  { timestamps: true, collection: 'nqt_generated_quizzes' }
);

NqtGeneratedQuizSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.models.NqtGeneratedQuiz || mongoose.model('NqtGeneratedQuiz', NqtGeneratedQuizSchema);
