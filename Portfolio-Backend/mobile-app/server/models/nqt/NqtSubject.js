const mongoose = require('mongoose');

const NqtSubjectSchema = new mongoose.Schema(
  {
    subjectId: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true },
    section: { type: String, required: true },
    examWeight: { type: Number, default: 1 },
    orderIndex: { type: Number, default: 0 },
  },
  { timestamps: true, collection: 'nqt_subjects' }
);

module.exports = mongoose.models.NqtSubject || mongoose.model('NqtSubject', NqtSubjectSchema);
