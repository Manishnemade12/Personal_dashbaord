const mongoose = require('mongoose');

const NqtOptionSchema = new mongoose.Schema(
  {
    label: { type: String, enum: ['A', 'B', 'C', 'D'], required: true },
    text: { type: String, required: true },
  },
  { _id: false }
);

const NqtSolutionSchema = new mongoose.Schema(
  {
    overview: { type: String, required: true },
    steps: [{ type: String }],
    shortcut: { type: String, required: true },
    formula: { type: String, required: true },
    alternatives: [{ type: String }],
    optionAnalysis: {
      A: { type: String, required: true },
      B: { type: String, required: true },
      C: { type: String, required: true },
      D: { type: String, required: true },
    },
    commonMistakes: { type: String, required: true },
  },
  { _id: false }
);

const NqtQuestionSchema = new mongoose.Schema(
  {
    questionId: { type: String, required: true, unique: true, index: true },
    quizId: { type: String, required: true, index: true },
    userId: { type: String, required: true, index: true },
    subjectId: { type: String, required: true, index: true },
    subjectName: { type: String, required: true },
    section: { type: String, required: true },
    topicId: { type: String, required: true, index: true },
    topicName: { type: String, required: true },
    prompt: { type: String, required: true },
    options: { type: [NqtOptionSchema], validate: (value) => value.length === 4 },
    answer: { type: String, enum: ['A', 'B', 'C', 'D'], required: true },
    solution: { type: NqtSolutionSchema, required: true },
    difficulty: { type: String, enum: ['easy', 'medium', 'hard', 'exam'], required: true },
    pattern: { type: String, default: 'Original TCS NQT-style practice' },
    estimatedSeconds: { type: Number, default: 90 },
    importance: { type: Number, default: 1 },
    orderIndex: { type: Number, default: 0 },
    source: { type: String, enum: ['ai'], default: 'ai' },
  },
  { timestamps: true, collection: 'nqt_questions' }
);

NqtQuestionSchema.index({ userId: 1, topicId: 1, createdAt: -1 });
NqtQuestionSchema.index({ userId: 1, prompt: 1 });

module.exports = mongoose.models.NqtQuestion || mongoose.model('NqtQuestion', NqtQuestionSchema);
