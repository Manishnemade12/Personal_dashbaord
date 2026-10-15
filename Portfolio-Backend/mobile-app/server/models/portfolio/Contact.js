const mongoose = require('mongoose');

const contactSchema = new mongoose.Schema(
  {
    name: { type: String },
    lname: { type: String },
    email: { type: String },
    company: { type: String },
    phone: { type: String },
    country: { type: String },
    price: { type: String },
    description: { type: String },
    project: [{ type: String }],
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.models.Contact || mongoose.model('Contact', contactSchema);
