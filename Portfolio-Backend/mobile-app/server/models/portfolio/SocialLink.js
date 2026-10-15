const mongoose = require('mongoose');

const SocialLinkSchema = new mongoose.Schema(
  {
    Instagram: { type: String, default: '', trim: true },
    Twitter: { type: String, default: '', trim: true },
    Linkedin: { type: String, default: '', trim: true },
    Github: { type: String, default: '', trim: true },
    personalweb: { type: String, default: '', trim: true },
    youtube: { type: String, default: '', trim: true },
    discord: { type: String, default: '', trim: true },
    telegram: { type: String, default: '', trim: true },
  },
  { timestamps: true }
);

module.exports =
  mongoose.models.SocialLink || mongoose.model('SocialLink', SocialLinkSchema);
