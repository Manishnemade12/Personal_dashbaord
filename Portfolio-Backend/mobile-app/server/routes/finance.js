const express = require('express');
const router = express.Router();
const FinanceTransaction = require('../models/FinanceTransaction');
const FinanceBudget = require('../models/FinanceBudget');
const InvestmentTransaction = require('../models/InvestmentTransaction');
require('../models/InvestmentHolding');

// Helper to get default YYYY-MM
const getCurrentMonthStr = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
};

const DUMMY_NOTES = [
  'Monthly Tech Salary Credit',
  'Web UI Consultancy & Design',
  'Groceries, Supermarket & Dining',
  'Broadband, Electricity & Mobile bill',
  'Fuel & Metro card recharge',
  'Ergonomic Desk Accessories & Clothes',
  'Gym Subscription & Protein',
  'OTT Streaming Subscriptions',
];

// Purge any previously seeded dummy transactions so only REAL user data is kept
async function purgeDummyFinanceData(userId = 'admin') {
  try {
    await FinanceTransaction.deleteMany({
      userId,
      notes: { $in: DUMMY_NOTES },
    });
  } catch (e) {
    console.log('[Finance Route] Purge notice:', e.message);
  }
}

// 1. GET /api/finance/transactions
router.get('/transactions', async (req, res) => {
  try {
    const userId = req.query.userId || 'admin';
    await purgeDummyFinanceData(userId);

    const { month, category, type, search } = req.query;
    const filter = { userId };

    if (type && type !== 'all') {
      filter.type = type;
    }

    if (category && category !== 'all') {
      filter.category = category;
    }

    if (search) {
      filter.$or = [
        { notes: { $regex: search, $options: 'i' } },
        { category: { $regex: search, $options: 'i' } },
      ];
    }

    if (month) {
      const [y, m] = month.split('-').map(Number);
      const start = new Date(y, m - 1, 1);
      const end = new Date(y, m, 0, 23, 59, 59, 999);
      filter.date = { $gte: start, $lte: end };
    }

    const transactions = await FinanceTransaction.find(filter).sort({ date: -1 });
    res.json(transactions);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 2. POST /api/finance/transactions
router.post('/transactions', async (req, res) => {
  try {
    const { type, category, amount, date, notes, paymentMode, subItems, userId = 'admin' } = req.body;

    if (!type || !category || amount == null) {
      return res.status(400).json({ error: 'type, category, and amount are required' });
    }

    const transaction = await FinanceTransaction.create({
      userId,
      type,
      category,
      amount: Number(amount),
      date: date ? new Date(date) : new Date(),
      notes: notes || '',
      paymentMode: paymentMode || 'UPI',
      subItems: Array.isArray(subItems) ? subItems : [],
    });

    res.status(201).json(transaction);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// 3. PUT /api/finance/transactions/:id
router.put('/transactions/:id', async (req, res) => {
  try {
    const updated = await FinanceTransaction.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!updated) {
      return res.status(404).json({ error: 'Transaction not found' });
    }
    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// 4. DELETE /api/finance/transactions/:id
router.delete('/transactions/:id', async (req, res) => {
  try {
    const deleted = await FinanceTransaction.findByIdAndDelete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: 'Transaction not found' });
    }
    res.json({ success: true, message: 'Transaction deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 5. GET /api/finance/budget
router.get('/budget', async (req, res) => {
  try {
    const userId = req.query.userId || 'admin';
    const month = req.query.month || getCurrentMonthStr();

    let budget = await FinanceBudget.findOne({ userId, month });
    if (!budget) {
      // Find latest previous budget as fallback, or default values
      const prev = await FinanceBudget.findOne({ userId }).sort({ month: -1 });
      budget = {
        userId,
        month,
        monthlyIncome: prev?.monthlyIncome || 0,
        spendingLimit: prev?.spendingLimit || 0,
        investmentTarget: prev?.investmentTarget || 0,
      };
    }

    res.json(budget);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Clear all transactions for clean slate
router.delete('/clear-all', async (req, res) => {
  try {
    const userId = req.query.userId || 'admin';
    await FinanceTransaction.deleteMany({ userId });
    await FinanceBudget.deleteMany({ userId });
    res.json({ success: true, message: 'All financial data reset' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 6. POST /api/finance/budget (Set or update budget)
router.post('/budget', async (req, res) => {
  try {
    const userId = req.body.userId || 'admin';
    const month = req.body.month || getCurrentMonthStr();
    const { monthlyIncome, spendingLimit, investmentTarget } = req.body;

    const budget = await FinanceBudget.findOneAndUpdate(
      { userId, month },
      {
        monthlyIncome: Number(monthlyIncome) || 0,
        spendingLimit: Number(spendingLimit) || 0,
        investmentTarget: Number(investmentTarget) || 0,
      },
      { upsert: true, new: true, runValidators: true }
    );

    res.json(budget);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// 7. GET /api/finance/summary (Aggregated monthly overview)
router.get('/summary', async (req, res) => {
  try {
    const userId = req.query.userId || 'admin';
    const month = req.query.month || getCurrentMonthStr();

    await purgeDummyFinanceData(userId);

    const [y, m] = month.split('-').map(Number);
    const start = new Date(y, m - 1, 1);
    const end = new Date(y, m, 0, 23, 59, 59, 999);

    const [transactions, budgetDoc, investmentTxs] = await Promise.all([
      FinanceTransaction.find({
        userId,
        date: { $gte: start, $lte: end },
      }).sort({ date: -1 }),
      FinanceBudget.findOne({ userId, month }),
      InvestmentTransaction.find({
        userId,
        type: 'BUY',
        date: { $gte: start, $lte: end },
      })
        .populate('holdingId', 'instrumentName symbolOrCode assetClass subCategory')
        .sort({ date: -1 }),
    ]);

    const budget = budgetDoc || {
      monthlyIncome: 0,
      spendingLimit: 0,
      investmentTarget: 0,
    };

    let totalIncome = 0;
    let totalExpense = 0;
    const categoryMap = {};
    const categoryCountMap = {};
    const dailyMap = {};

    transactions.forEach((tx) => {
      const amt = tx.amount || 0;
      const day = new Date(tx.date).getDate();

      if (tx.type === 'income') {
        totalIncome += amt;
      } else {
        totalExpense += amt;

        // Category breakdown
        categoryMap[tx.category] = (categoryMap[tx.category] || 0) + amt;
        categoryCountMap[tx.category] = (categoryCountMap[tx.category] || 0) + 1;

        // Daily trend
        dailyMap[day] = (dailyMap[day] || 0) + amt;
      }
    });

    // If transactions don't have explicit income record, fallback to user's set budget income if any
    if (totalIncome === 0 && budget.monthlyIncome > 0) {
      totalIncome = budget.monthlyIncome;
    }

    // Process coupled investments for the month
    let monthlyInvested = 0;
    const assetClassInvestMap = {};
    const instrumentInvestMap = {};

    investmentTxs.forEach((itx) => {
      const amt = Number(itx.totalAmount) || 0;
      monthlyInvested += amt;

      const holding = itx.holdingId || {};
      const assetClass = holding.assetClass || 'Equity';
      const name = holding.instrumentName || holding.symbolOrCode || 'Investment';
      const symbol = holding.symbolOrCode || '';

      assetClassInvestMap[assetClass] = (assetClassInvestMap[assetClass] || 0) + amt;

      if (!instrumentInvestMap[name]) {
        instrumentInvestMap[name] = {
          name,
          symbol,
          assetClass,
          totalAmount: 0,
          units: 0,
          latestPrice: itx.pricePerUnit,
          lastDate: itx.date,
          transactionsCount: 0,
        };
      }
      instrumentInvestMap[name].totalAmount += amt;
      instrumentInvestMap[name].units += Number(itx.units) || 0;
      instrumentInvestMap[name].transactionsCount += 1;
    });

    const investedByAssetClass = Object.keys(assetClassInvestMap).map((cls) => ({
      assetClass: cls,
      amount: Number(assetClassInvestMap[cls].toFixed(2)),
      percent:
        monthlyInvested > 0
          ? Number(((assetClassInvestMap[cls] / monthlyInvested) * 100).toFixed(1))
          : 0,
    })).sort((a, b) => b.amount - a.amount);

    const investedByInstrument = Object.values(instrumentInvestMap)
      .map((item) => ({
        ...item,
        totalAmount: Number(item.totalAmount.toFixed(2)),
        units: Number(item.units.toFixed(4)),
        percentOfInvestments:
          monthlyInvested > 0
            ? Number(((item.totalAmount / monthlyInvested) * 100).toFixed(1))
            : 0,
      }))
      .sort((a, b) => b.totalAmount - a.totalAmount);

    const investmentTransactionsThisMonth = investmentTxs.map((itx) => ({
      _id: itx._id,
      holdingId: itx.holdingId?._id,
      instrumentName: itx.holdingId?.instrumentName || itx.holdingId?.symbolOrCode || 'Asset',
      symbolOrCode: itx.holdingId?.symbolOrCode || '',
      assetClass: itx.holdingId?.assetClass || 'Equity',
      subCategory: itx.holdingId?.subCategory || '',
      units: itx.units,
      pricePerUnit: itx.pricePerUnit,
      totalAmount: itx.totalAmount,
      date: itx.date,
      notes: itx.notes,
    }));

    // Budget and Cashflow Calculations
    const totalOutflow = totalExpense + monthlyInvested;
    const netSavings = totalIncome - totalOutflow;

    const remainingBudget =
      budget.spendingLimit > 0 ? Math.max(0, budget.spendingLimit - totalExpense) : 0;
    const budgetSpentPercent =
      budget.spendingLimit > 0
        ? Math.min(100, Math.round((totalExpense / budget.spendingLimit) * 100))
        : 0;

    const investmentTarget = Number(budget.investmentTarget) || 0;
    const investmentTargetProgress =
      investmentTarget > 0 ? Math.min(100, Math.round((monthlyInvested / investmentTarget) * 100)) : 0;
    const remainingInvestmentTarget =
      investmentTarget > 0 ? Math.max(0, investmentTarget - monthlyInvested) : 0;

    // Convert category map to sorted list with transaction count
    const categoryBreakdown = Object.keys(categoryMap)
      .map((cat) => ({
        category: cat,
        amount: categoryMap[cat],
        count: categoryCountMap[cat] || 0,
        percent:
          totalExpense > 0 ? Number(((categoryMap[cat] / totalExpense) * 100).toFixed(1)) : 0,
      }))
      .sort((a, b) => b.amount - a.amount);

    // Build day trend points
    const daysInMonth = new Date(y, m, 0).getDate();
    const dailySpending = [];
    for (let d = 1; d <= daysInMonth; d++) {
      dailySpending.push({
        day: d,
        amount: dailyMap[d] || 0,
      });
    }

    res.json({
      month,
      monthlyIncome: totalIncome,
      spendingLimit: budget.spendingLimit,
      totalSpent: totalExpense,
      monthlyInvested: Number(monthlyInvested.toFixed(2)),
      totalOutflow: Number(totalOutflow.toFixed(2)),
      netSavings: Number(netSavings.toFixed(2)),
      remainingBudget,
      budgetSpentPercent,
      investmentTarget,
      investmentTargetProgress,
      remainingInvestmentTarget,
      investedByAssetClass,
      investedByInstrument,
      investmentTransactionsThisMonth,
      categoryBreakdown,
      dailySpending,
      transactionCount: transactions.length,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
