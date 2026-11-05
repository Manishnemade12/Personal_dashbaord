const mongoose = require('mongoose');
const syncPlugin = require('../plugins/syncPlugin');

const blogSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    slug: { type: String, required: true },
    images: [{ type: String }],
    description: { type: String },
    blogcategory: [{ type: String }],
    tags: [{ type: String }],
    status: { type: String, default: 'draft' },
  },
  {
    timestamps: true,
  }
);

blogSchema.plugin(syncPlugin);

module.exports = mongoose.models.Blog || mongoose.model('Blog', blogSchema);
