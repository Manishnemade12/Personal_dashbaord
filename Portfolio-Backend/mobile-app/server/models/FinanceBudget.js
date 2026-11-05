const mongoose = require('mongoose');
const syncPlugin = require('./plugins/syncPlugin');

const FinanceBudgetSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      default: 'admin',
    },
    month: {
      type: String,
      required: true, // Format: 'YYYY-MM'
    },
    monthlyIncome: {
      type: Number,
      default: 0,
      min: 0,
    },
    spendingLimit: {
      type: Number,
      default: 0,
      min: 0,
    },
    investmentTarget: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  { timestamps: true }
);

// Unique compound index per user and month
FinanceBudgetSchema.index({ userId: 1, month: 1 }, { unique: true });
FinanceBudgetSchema.plugin(syncPlugin);

module.exports = mongoose.model('FinanceBudget', FinanceBudgetSchema);
