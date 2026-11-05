const mongoose = require('mongoose');
const syncPlugin = require('../plugins/syncPlugin');

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

skillSchema.plugin(syncPlugin);

module.exports = mongoose.models.Skills || mongoose.model('Skills', skillSchema);
