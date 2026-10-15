const mongoose = require('mongoose');

const skillSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: { type: String },
    images: [{ type: String }],
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.models.Skills || mongoose.model('Skills', skillSchema);
