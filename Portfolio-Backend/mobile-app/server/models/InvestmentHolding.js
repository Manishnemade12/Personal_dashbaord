const mongoose = require('mongoose');

const InvestmentHoldingSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      default: 'admin',
    },
    assetClass: {
      type: String,
      enum: ['Equity', 'Mutual Fund', 'ETF', 'Gold', 'Fixed Income'],
      required: true,
    },
    subCategory: {
      type: String,
      default: 'Stocks', // e.g. 'Large Cap Stocks', 'Flexi Cap Fund', 'Nifty ETF', 'Digital Gold'
    },
    symbolOrCode: {
      type: String,
      required: true,
      trim: true,
    },
    instrumentName: {
      type: String,
      required: true,
      trim: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: 0,
    },
    averageBuyPrice: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    latestPrice: {
      type: Number,
      default: 0,
    },
    latestPriceDate: {
      type: Date,
      default: Date.now,
    },
    currency: {
      type: String,
      default: 'INR',
    },
    exchange: {
      type: String,
      enum: ['NSE', 'BSE', 'AMFI', 'MCX'],
      default: 'NSE',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('InvestmentHolding', InvestmentHoldingSchema);
