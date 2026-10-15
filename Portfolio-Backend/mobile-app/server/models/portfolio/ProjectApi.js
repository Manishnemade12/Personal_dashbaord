const mongoose = require('mongoose');

const ApiEndpointSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  endpoint: { type: String, required: true, trim: true },
  method: { type: String, enum: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'], default: 'GET' },
  description: { type: String, default: '', trim: true },
});

const ProjectApiSchema = new mongoose.Schema(
  {
    projectName: { type: String, required: true, trim: true },
    description: { type: String, default: '', trim: true },
    apis: [ApiEndpointSchema],
  },
  { timestamps: true }
);

module.exports =
  mongoose.models.ProjectApi || mongoose.model('ProjectApi', ProjectApiSchema);
