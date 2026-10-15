const mongoose = require('mongoose');

const educationItemSchema = new mongoose.Schema(
  {
    school: { type: String, default: '', trim: true },
    degree: { type: String, default: '', trim: true },
    fieldOfStudy: { type: String, default: '', trim: true },
    educationDescription: { type: String, default: '', trim: true },
    year: { type: String, default: '', trim: true },
    grade: { type: String, default: '', trim: true },
  },
  { _id: true }
);

const educationProfileSchema = new mongoose.Schema(
  {
    education: {
      type: [educationItemSchema],
      default: [],
    },
  },
  { timestamps: true }
);

module.exports =
  mongoose.models.Education || mongoose.model('Education', educationProfileSchema);
