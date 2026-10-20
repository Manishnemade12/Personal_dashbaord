const mongoose = require('mongoose');

const EmailDraftSchema = new mongoose.Schema(
  {
    company: { type: String, default: '' },
    role: { type: String, default: '' },
    recipient: { type: String, default: '' },
    tone: { type: String, default: 'pitch' },
    jdText: { type: String, default: '' },
    jdImageUrl: { type: String, default: '' },
    subject: { type: String, default: '' },
    emailBody: { type: String, default: '' },
    keyHighlights: [{ type: String }],
    createdAt: { type: Date, default: Date.now },
  },
  { _id: true }
);

const AiColdEmailConversationSchema = new mongoose.Schema(
  {
    userId: { type: String, default: 'admin', index: true },
    title: { type: String, default: 'New Application', trim: true },
    resumeText: { type: String, default: '' },
    resumeFileName: { type: String, default: '' },
    resumeFileUrl: { type: String, default: '' },
    resumeWordCount: { type: Number, default: 0 },
    resumeUploadedAt: { type: Date },
    targetCompany: { type: String, default: '' },
    targetRole: { type: String, default: '' },
    recipient: { type: String, default: '' },
    preferredTone: { type: String, default: 'pitch' },
    jdText: { type: String, default: '' },
    jdImageUrl: { type: String, default: '' },
    emails: [EmailDraftSchema],
  },
  {
    timestamps: true,
  }
);

// Virtual for email count and hasResume
AiColdEmailConversationSchema.virtual('emailCount').get(function () {
  return this.emails ? this.emails.length : 0;
});

AiColdEmailConversationSchema.virtual('hasResume').get(function () {
  return !!(this.resumeText && this.resumeText.trim().length > 0);
});

AiColdEmailConversationSchema.set('toJSON', { virtuals: true });
AiColdEmailConversationSchema.set('toObject', { virtuals: true });

module.exports =
  mongoose.models.AiColdEmailConversation ||
  mongoose.model('AiColdEmailConversation', AiColdEmailConversationSchema);
