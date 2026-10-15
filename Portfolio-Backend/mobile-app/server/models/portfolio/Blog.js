const mongoose = require('mongoose');

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

module.exports = mongoose.models.Blog || mongoose.model('Blog', blogSchema);
