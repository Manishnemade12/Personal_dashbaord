const mongoose = require('mongoose');

const StockChatMessageSchema = new mongoose.Schema(
  {
    id: { type: String },
    sender: { type: String, enum: ['user', 'ai'], required: true },
    text: { type: String, required: true },
    timestamp: { type: Date, default: Date.now },
  },
  { _id: false }
);

const AiStockChatSchema = new mongoose.Schema(
  {
    userId: { type: String, default: 'admin', index: true },
    title: { type: String, required: true, trim: true },
    selectedStocks: [
      {
        symbolOrCode: String,
        instrumentName: String,
        averageBuyPrice: Number,
        latestPrice: Number,
        quantity: Number,
        pnlPercent: Number,
      },
    ],
    messages: [StockChatMessageSchema],
    stockAnalyses: [mongoose.Schema.Types.Mixed],
  },
  { timestamps: true }
);

module.exports = mongoose.models.AiStockChat || mongoose.model('AiStockChat', AiStockChatSchema);
