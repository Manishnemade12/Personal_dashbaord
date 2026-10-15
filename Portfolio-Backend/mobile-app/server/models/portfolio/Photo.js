const mongoose = require('mongoose');

const photoSchema = new mongoose.Schema(
  {
    title: { type: String },
    images: [{ type: String }],
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.models.Photo || mongoose.model('Photo', photoSchema);
