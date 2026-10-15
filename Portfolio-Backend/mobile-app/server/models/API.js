const mongoose = require('mongoose');

const APISchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    url: { type: String, required: true, trim: true },
    method: { type: String, enum: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'], default: 'GET' },
    category: { type: String, default: 'General', trim: true },
    description: { type: String, default: '', trim: true },
    status: { type: String, enum: ['active', 'testing', 'deprecated'], default: 'active' },
  },
  { timestamps: true }
);

module.exports = mongoose.models.API || mongoose.model('API', APISchema);
