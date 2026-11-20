const mongoose = require('mongoose');

const NqtTopicSchema = new mongoose.Schema(
  {
    topicId: { type: String, required: true, unique: true, index: true },
    subjectId: { type: String, required: true, index: true },
    name: { type: String, required: true },
    importance: { type: Number, min: 1, max: 5, default: 3 },
    frequency: { type: Number, min: 1, max: 5, default: 3 },
    difficulty: { type: String, enum: ['easy', 'medium', 'hard'], default: 'medium' },
  },
  { timestamps: true, collection: 'nqt_topics' }
);

module.exports = mongoose.models.NqtTopic || mongoose.model('NqtTopic', NqtTopicSchema);
