const mongoose = require('mongoose');
const syncPlugin = require('./plugins/syncPlugin');

const StudyDailyQuizConfigSchema = new mongoose.Schema(
  {
    userId: { type: String, default: 'admin', unique: true, index: true },
    enabled: { type: Boolean, default: true },
    scheduleTime: { type: String, default: '12:00:00' },
    timezone: { type: String, default: 'Asia/Kolkata' },
    difficulty: { type: String, enum: ['easy', 'medium', 'hard', 'mixed'], default: 'mixed' },
    includePyq: { type: Boolean, default: true },
    numQuestions: { type: Number, default: 10 },
  },
  { timestamps: true }
);

StudyDailyQuizConfigSchema.plugin(syncPlugin);

module.exports = mongoose.models.StudyDailyQuizConfig || mongoose.model('StudyDailyQuizConfig', StudyDailyQuizConfigSchema);

