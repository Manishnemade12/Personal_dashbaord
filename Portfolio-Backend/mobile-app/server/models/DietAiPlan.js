const mongoose = require('mongoose');

const DietAiPlanSchema = new mongoose.Schema(
  {
    userId: { type: String, default: 'admin', index: true },
    dateStr: { type: String, required: true },
    prompt: { type: String, default: '' },
    status: { type: String, enum: ['draft', 'accepted'], default: 'draft' },
    recommendations: { type: Array, default: [] },
    sourceEventIds: { type: Array, default: [] },
    messages: { type: Array, default: [] },
  },
  { timestamps: true }
);

module.exports = mongoose.models.DietAiPlan || mongoose.model('DietAiPlan', DietAiPlanSchema);
