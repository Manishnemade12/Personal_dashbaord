const mongoose = require('mongoose');

const profSchema = new mongoose.Schema(
  {
    name: { type: String },
    email: { type: String },
    description: { type: String },
    profession: { type: String },
    work1Title: { type: String },
    work1Description: { type: String },
    work2Title: { type: String },
    work2Description: { type: String },
    work3Title: { type: String },
    work3Description: { type: String },
    work4Title: { type: String },
    work4Description: { type: String },
    images: [{ type: String }],
  },
  { timestamps: true }
);

module.exports = mongoose.models.prof || mongoose.model('prof', profSchema);
