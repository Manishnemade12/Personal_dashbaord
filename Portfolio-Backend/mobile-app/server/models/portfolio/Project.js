const mongoose = require('mongoose');
const syncPlugin = require('../plugins/syncPlugin');

const projectSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    slug: { type: String, required: true },
    images: [{ type: String }],
    description: { type: String },
    client: { type: String },
    projectcategory: [{ type: String }],
    tags: [{ type: String }],
    livepreview: { type: String },
    status: { type: String, default: 'draft' },
  },
  {
    timestamps: true,
  }
);

projectSchema.plugin(syncPlugin);

module.exports = mongoose.models.Project || mongoose.model('Project', projectSchema);
