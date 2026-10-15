const mongoose = require('mongoose');

const InvestmentTransactionSchema = new mongoose.Schema(
  {
    holdingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'InvestmentHolding',
      required: true,
    },
    userId: {
      type: String,
      default: 'admin',
    },
    type: {
      type: String,
      enum: ['BUY', 'SELL'],
      required: true,
    },
    units: {
      type: Number,
      required: true,
      min: 0,
    },
    pricePerUnit: {
      type: Number,
      required: true,
      min: 0,
    },
    totalAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    realizedGain: {
      type: Number,
      default: 0,
    },
    date: {
      type: Date,
      default: Date.now,
    },
    notes: {
      type: String,
      trim: true,
      default: '',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('InvestmentTransaction', InvestmentTransactionSchema);
