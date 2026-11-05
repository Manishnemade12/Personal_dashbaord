const mongoose = require('mongoose');
const syncPlugin = require('../plugins/syncPlugin');

const photoSchema = new mongoose.Schema(
  {
    title: { type: String },
    images: [{ type: String }],
  },
  {
    timestamps: true,
  }
);

photoSchema.plugin(syncPlugin);

module.exports = mongoose.models.Photo || mongoose.model('Photo', photoSchema);
