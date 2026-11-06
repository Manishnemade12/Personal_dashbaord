const mongoose = require('mongoose');
const syncPlugin = require('./plugins/syncPlugin');

const StudyUserStreakSchema = new mongoose.Schema(
  {
    userId: { type: String, default: 'admin', unique: true, index: true },
    currentStreak: { type: Number, default: 0 },
    longestStreak: { type: Number, default: 0 },
    lastActiveDate: { type: String, default: null }, // 'YYYY-MM-DD'
    totalQuizzesCompleted: { type: Number, default: 0 },
  },
  { timestamps: true }
);

StudyUserStreakSchema.plugin(syncPlugin);

module.exports = mongoose.models.StudyUserStreak || mongoose.model('StudyUserStreak', StudyUserStreakSchema);

