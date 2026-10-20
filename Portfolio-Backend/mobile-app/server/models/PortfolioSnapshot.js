const mongoose = require('mongoose');

const PortfolioSnapshotSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      default: 'admin',
      required: true,
      index: true,
    },
    date: {
      type: Date,
      required: true,
    },
    dateStr: {
      type: String,
      required: true, // YYYY-MM-DD format
      index: true,
    },
    totalNetWorth: {
      type: Number,
      required: true,
      default: 0,
    },
    totalInvested: {
      type: Number,
      required: true,
      default: 0,
    },
    totalCurrentValue: {
      type: Number,
      required: true,
      default: 0,
    },
    cashBalance: {
      type: Number,
      default: 0,
    },
    overallPnl: {
      type: Number,
      default: 0,
    },
    overallPnlPercent: {
      type: Number,
      default: 0,
    },
    dailyPnl: {
      type: Number,
      default: 0,
    },
    dailyPnlPercent: {
      type: Number,
      default: 0,
    },
    holdingsCount: {
      type: Number,
      default: 0,
    },
    holdingsSnapshot: [
      {
        holdingId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'InvestmentHolding',
        },
        symbolOrCode: { type: String, required: true },
        instrumentName: { type: String, required: true },
        assetClass: { type: String, default: 'Equity' },
        subCategory: { type: String, default: 'Stocks' },
        quantity: { type: Number, required: true },
        averageBuyPrice: { type: Number, required: true },
        latestPrice: { type: Number, required: true },
        investedValue: { type: Number, required: true },
        currentValue: { type: Number, required: true },
        pnl: { type: Number, default: 0 },
        pnlPercent: { type: Number, default: 0 },
        dayChange: { type: Number, default: 0 },
        dayChangePercent: { type: Number, default: 0 },
      },
    ],
    source: {
      type: String,
      enum: ['automated_cron', 'manual_refresh', 'transaction_trigger', 'historical_backfill'],
      default: 'automated_cron',
    },
  },
  { timestamps: true }
);

// Prevent duplicate snapshots for same user and same calendar date
PortfolioSnapshotSchema.index({ userId: 1, dateStr: 1 }, { unique: true });

module.exports =
  mongoose.models.PortfolioSnapshot ||
  mongoose.model('PortfolioSnapshot', PortfolioSnapshotSchema);
