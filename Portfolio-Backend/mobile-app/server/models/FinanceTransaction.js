const mongoose = require('mongoose');

const SubItemSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  amount: { type: Number, required: true, min: 0 },
}, { _id: true });

const FinanceTransactionSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      default: 'admin',
    },
    type: {
      type: String,
      enum: ['income', 'expense'],
      required: true,
    },
    category: {
      type: String,
      enum: [
        'Salary',
        'Freelance',
        'Investment Return',
        'Rental',
        'Other Income',
        'Food & Dining',
        'Travel & Transport',
        'Shopping',
        'Bills & Utilities',
        'Health & Fitness',
        'Entertainment',
        'Education',
        'Groceries',
        'Personal Care',
        'Other Expense',
      ],
      required: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
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
    paymentMode: {
      type: String,
      enum: ['UPI', 'Credit Card', 'Debit Card', 'Net Banking', 'Cash'],
      default: 'UPI',
    },
    // Sub-items: detailed breakdown within a category
    // e.g., Food & Dining -> [{name: "Pizza", amount: 450}, {name: "Coffee", amount: 150}]
    subItems: {
      type: [SubItemSchema],
      default: [],
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('FinanceTransaction', FinanceTransactionSchema);
