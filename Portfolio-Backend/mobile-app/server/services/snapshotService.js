const InvestmentHolding = require('../models/InvestmentHolding');
const InvestmentTransaction = require('../models/InvestmentTransaction');
const FinanceTransaction = require('../models/FinanceTransaction');
const PortfolioSnapshot = require('../models/PortfolioSnapshot');
const marketDataService = require('./marketDataService');

class SnapshotService {
  /**
   * Helper to format Date into YYYY-MM-DD string in UTC/local day
   */
  getDateStr(date = new Date()) {
    const d = new Date(date);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  /**
   * Calculate current cumulative liquid cash balance from Finance Transactions
   */
  async getCashBalance(userId = 'admin') {
    try {
      const transactions = await FinanceTransaction.find({ userId });
      let income = 0;
      let expense = 0;
      transactions.forEach((tx) => {
        const amt = Number(tx.amount) || 0;
        if (tx.type === 'income') income += amt;
        else if (tx.type === 'expense') expense += amt;
      });
      return Math.max(0, income - expense);
    } catch (e) {
      console.warn('[SnapshotService] Failed to calculate cash balance:', e.message);
      return 0;
    }
  }

  /**
   * Capture or update today's portfolio snapshot
   */
  async captureDailySnapshot(userId = 'admin', options = {}) {
    const { forceUpdate = false, source = 'automated_cron' } = options;
    const todayStr = this.getDateStr();
    const now = new Date();

    // Check if snapshot already exists for today
    const existing = await PortfolioSnapshot.findOne({ userId, dateStr: todayStr });
    if (existing && !forceUpdate) {
      return existing;
    }

    // 1. Fetch all user holdings and enrich with live quotes
    const rawHoldings = await InvestmentHolding.find({ userId });
    const enriched = await marketDataService.enrichHoldingsWithLiveData(rawHoldings, forceUpdate);

    let totalInvested = 0;
    let totalCurrentValue = 0;
    const holdingsSnapshot = [];

    enriched.forEach((h) => {
      const qty = Number(h.quantity) || 0;
      const buyPrice = Number(h.averageBuyPrice) || 0;
      const livePrice = Number(h.latestPrice) || buyPrice;
      const invested = Number(h.investedValue) || Number((qty * buyPrice).toFixed(2));
      const current = Number(h.currentValue) || Number((qty * livePrice).toFixed(2));
      const pnl = Number(h.pnl) || Number((current - invested).toFixed(2));
      const pnlPercent = Number(h.pnlPercent) || (invested > 0 ? Number(((pnl / invested) * 100).toFixed(2)) : 0);
      const dayChange = Number(h.dayChange) || 0;
      const dayChangePercent = Number(h.dayChangePercent) || 0;

      totalInvested += invested;
      totalCurrentValue += current;

      holdingsSnapshot.push({
        holdingId: h._id,
        symbolOrCode: h.symbolOrCode,
        instrumentName: h.instrumentName,
        assetClass: h.assetClass || 'Equity',
        subCategory: h.subCategory || 'Stocks',
        quantity: qty,
        averageBuyPrice: buyPrice,
        latestPrice: livePrice,
        investedValue: invested,
        currentValue: current,
        pnl,
        pnlPercent,
        dayChange,
        dayChangePercent,
      });
    });

    totalInvested = Number(totalInvested.toFixed(2));
    totalCurrentValue = Number(totalCurrentValue.toFixed(2));
    const overallPnl = Number((totalCurrentValue - totalInvested).toFixed(2));
    const overallPnlPercent =
      totalInvested > 0 ? Number(((overallPnl / totalInvested) * 100).toFixed(2)) : 0;

    // 2. Compute Cash Balance & Net Worth
    const cashBalance = await this.getCashBalance(userId);
    const totalNetWorth = Number((totalCurrentValue + cashBalance).toFixed(2));

    // 3. Compute Daily P&L compared to previous snapshot
    const previousSnapshot = await PortfolioSnapshot.findOne({
      userId,
      dateStr: { $lt: todayStr },
    }).sort({ dateStr: -1 });

    let dailyPnl = 0;
    let dailyPnlPercent = 0;

    if (previousSnapshot && previousSnapshot.totalNetWorth > 0) {
      // Daily return based on net worth change
      dailyPnl = Number((totalNetWorth - previousSnapshot.totalNetWorth).toFixed(2));
      dailyPnlPercent = Number(
        (((totalNetWorth - previousSnapshot.totalNetWorth) / previousSnapshot.totalNetWorth) * 100).toFixed(2)
      );
    } else {
      // Fallback: sum of today's holding day changes
      const holdingsDailyPnl = holdingsSnapshot.reduce((acc, item) => {
        return acc + item.dayChange * item.quantity;
      }, 0);
      dailyPnl = Number(holdingsDailyPnl.toFixed(2));
      dailyPnlPercent =
        totalCurrentValue > 0 ? Number(((dailyPnl / totalCurrentValue) * 100).toFixed(2)) : 0;
    }

    const snapshotData = {
      userId,
      date: now,
      dateStr: todayStr,
      totalNetWorth,
      totalInvested,
      totalCurrentValue,
      cashBalance,
      overallPnl,
      overallPnlPercent,
      dailyPnl,
      dailyPnlPercent,
      holdingsCount: holdingsSnapshot.length,
      holdingsSnapshot,
      source,
    };

    // Upsert to ensure uniqueness
    const snapshot = await PortfolioSnapshot.findOneAndUpdate(
      { userId, dateStr: todayStr },
      snapshotData,
      { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true }
    );

    return snapshot;
  }

  /**
   * Backfill historical snapshots based on recorded transaction history or seed baseline
   * so user gets meaningful time-series graphs without fabricated data.
   */
  async ensureHistoricalData(userId = 'admin') {
    const count = await PortfolioSnapshot.countDocuments({ userId });
    if (count > 0) {
      return count;
    }

    // Capture today's baseline snapshot
    await this.captureDailySnapshot(userId, { forceUpdate: true, source: 'manual_refresh' });

    // Check if buy transactions exist in the past
    const buyTxs = await InvestmentTransaction.find({ userId, type: 'BUY' }).sort({ date: 1 });
    if (buyTxs.length > 0) {
      const txDates = new Set();
      buyTxs.forEach((tx) => {
        if (tx.date) {
          const str = this.getDateStr(tx.date);
          if (str !== this.getDateStr()) txDates.add(str);
        }
      });

      // For dates where transactions occurred, construct approximate baseline snapshot
      for (const dStr of Array.from(txDates)) {
        const dObj = new Date(dStr);
        // Calculate cumulative investments up to that date
        const txsUpTo = buyTxs.filter((tx) => new Date(tx.date) <= dObj);
        const invSum = txsUpTo.reduce((acc, t) => acc + (Number(t.totalAmount) || 0), 0);

        if (invSum > 0) {
          await PortfolioSnapshot.findOneAndUpdate(
            { userId, dateStr: dStr },
            {
              userId,
              date: dObj,
              dateStr: dStr,
              totalNetWorth: invSum,
              totalInvested: invSum,
              totalCurrentValue: invSum,
              cashBalance: 0,
              overallPnl: 0,
              overallPnlPercent: 0,
              dailyPnl: 0,
              dailyPnlPercent: 0,
              holdingsCount: txsUpTo.length,
              holdingsSnapshot: [],
              source: 'historical_backfill',
            },
            { upsert: true, returnDocument: 'after' }
          );
        }
      }
    }

    return await PortfolioSnapshot.countDocuments({ userId });
  }

  /**
   * Get filtered historical snapshots for given range (1W, 1M, 1Y, ALL)
   */
  async getNetWorthHistory(userId = 'admin', range = '1M') {
    // Ensure at least today's snapshot exists
    await this.ensureHistoricalData(userId);

    const now = new Date();
    let startDate = new Date();

    if (range === '1W') {
      startDate.setDate(now.getDate() - 7);
    } else if (range === '1M') {
      startDate.setDate(now.getDate() - 30);
    } else if (range === '1Y') {
      startDate.setFullYear(now.getFullYear() - 1);
    } else {
      // ALL - go back 5 years
      startDate.setFullYear(now.getFullYear() - 5);
    }

    const startDateStr = this.getDateStr(startDate);
    const snapshots = await PortfolioSnapshot.find({
      userId,
      dateStr: { $gte: startDateStr },
    }).sort({ dateStr: 1 });

    if (!snapshots || snapshots.length === 0) {
      return {
        range,
        isAvailable: false,
        message: 'No historical net worth snapshots recorded yet for this time range.',
        snapshots: [],
        rangeSummary: null,
      };
    }

    const formattedSnapshots = snapshots.map((s) => {
      const d = new Date(s.dateStr || s.date);
      const label = d.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
      });

      return {
        id: s._id,
        date: s.date,
        dateStr: s.dateStr,
        label,
        netWorth: Number(s.totalNetWorth.toFixed(2)),
        investedValue: Number(s.totalInvested.toFixed(2)),
        currentValue: Number(s.totalCurrentValue.toFixed(2)),
        cashBalance: Number((s.cashBalance || 0).toFixed(2)),
        dailyPnl: Number(s.dailyPnl.toFixed(2)),
        dailyPnlPercent: Number(s.dailyPnlPercent.toFixed(2)),
        overallPnl: Number(s.overallPnl.toFixed(2)),
        overallPnlPercent: Number(s.overallPnlPercent.toFixed(2)),
        holdingsCount: s.holdingsCount,
      };
    });

    const values = formattedSnapshots.map((s) => s.netWorth);
    const startVal = values[0];
    const endVal = values[values.length - 1];
    const periodChange = Number((endVal - startVal).toFixed(2));
    const periodChangePercent =
      startVal > 0 ? Number(((periodChange / startVal) * 100).toFixed(2)) : 0;

    let highestIdx = 0;
    let lowestIdx = 0;
    values.forEach((v, idx) => {
      if (v > values[highestIdx]) highestIdx = idx;
      if (v < values[lowestIdx]) lowestIdx = idx;
    });

    return {
      range,
      isAvailable: true,
      count: formattedSnapshots.length,
      snapshots: formattedSnapshots,
      rangeSummary: {
        startValue: startVal,
        endValue: endVal,
        periodChange,
        periodChangePercent,
        highestValue: values[highestIdx],
        highestDate: formattedSnapshots[highestIdx].label,
        lowestValue: values[lowestIdx],
        lowestDate: formattedSnapshots[lowestIdx].label,
      },
    };
  }

  /**
   * Compute comprehensive Stock Performance Insights
   */
  async getStockPerformanceInsights(userId = 'admin', options = {}) {
    const { sortBy = 'today_best', assetClass = 'All', search = '' } = options;

    const rawHoldings = await InvestmentHolding.find({ userId });
    const enriched = await marketDataService.enrichHoldingsWithLiveData(rawHoldings, false);

    // Filter by asset class & search
    let filtered = enriched;
    if (assetClass && assetClass !== 'All') {
      filtered = filtered.filter((h) => h.assetClass === assetClass);
    }
    if (search && search.trim()) {
      const q = search.toLowerCase().trim();
      filtered = filtered.filter(
        (h) =>
          h.symbolOrCode?.toLowerCase().includes(q) ||
          h.instrumentName?.toLowerCase().includes(q) ||
          h.subCategory?.toLowerCase().includes(q)
      );
    }

    // Map each holding to clear insight schema
    const allStockInsights = filtered.map((h) => {
      const qty = Number(h.quantity) || 0;
      const buyPrice = Number(h.averageBuyPrice) || 0;
      const currentPrice = Number(h.latestPrice) || buyPrice;
      const investedValue = Number(h.investedValue) || Number((qty * buyPrice).toFixed(2));
      const currentValue = Number(h.currentValue) || Number((qty * currentPrice).toFixed(2));
      const overallPnl = Number(h.pnl) || Number((currentValue - investedValue).toFixed(2));
      const overallPnlPercent =
        Number(h.pnlPercent) || (investedValue > 0 ? Number(((overallPnl / investedValue) * 100).toFixed(2)) : 0);

      const dayChangePerUnit = Number(h.dayChange) || 0;
      const todayPnl = Number((dayChangePerUnit * qty).toFixed(2));
      const todayPnlPercent = Number(h.dayChangePercent) || 0;

      return {
        id: h._id,
        symbolOrCode: h.symbolOrCode,
        instrumentName: h.instrumentName,
        assetClass: h.assetClass || 'Equity',
        subCategory: h.subCategory || 'Stocks',
        exchange: h.exchange || 'NSE',
        quantity: qty,
        averageBuyPrice: buyPrice,
        currentPrice,
        investedValue,
        currentValue,
        todayPnl,
        todayPnlPercent,
        overallPnl,
        overallPnlPercent,
        dayChange: dayChangePerUnit,
        allocationPercent: Number(h.allocationPercent) || 0,
      };
    });

    // 1. Identify Highlight Extremes across all available holdings
    // Top Gaining Stock Today
    const gainersToday = [...allStockInsights]
      .filter((s) => s.todayPnlPercent > 0)
      .sort((a, b) => b.todayPnlPercent - a.todayPnlPercent);
    const topGainerToday = gainersToday[0] || null;

    // Top Losing Stock Today
    const losersToday = [...allStockInsights]
      .filter((s) => s.todayPnlPercent < 0)
      .sort((a, b) => a.todayPnlPercent - b.todayPnlPercent);
    const topLoserToday = losersToday[0] || null;

    // Highest Overall Return
    const gainersOverall = [...allStockInsights]
      .filter((s) => s.overallPnl > 0)
      .sort((a, b) => b.overallPnl - a.overallPnl);
    const highestOverallReturn = gainersOverall[0] || null;

    // Highest Overall Loss
    const losersOverall = [...allStockInsights]
      .filter((s) => s.overallPnl < 0)
      .sort((a, b) => a.overallPnl - b.overallPnl);
    const highestOverallLoss = losersOverall[0] || null;

    // 2. Sort allStockInsights according to requested criteria
    const sortedInsights = [...allStockInsights].sort((a, b) => {
      switch (sortBy) {
        case 'today_best':
          return b.todayPnlPercent - a.todayPnlPercent;
        case 'today_worst':
          return a.todayPnlPercent - b.todayPnlPercent;
        case 'overall_highest_return':
          return b.overallPnl - a.overallPnl;
        case 'overall_highest_loss':
          return a.overallPnl - b.overallPnl;
        case 'overall_percent_highest':
          return b.overallPnlPercent - a.overallPnlPercent;
        case 'overall_percent_lowest':
          return a.overallPnlPercent - b.overallPnlPercent;
        case 'value_desc':
          return b.currentValue - a.currentValue;
        case 'name_asc':
          return a.instrumentName.localeCompare(b.instrumentName);
        default:
          return b.todayPnlPercent - a.todayPnlPercent;
      }
    });

    // 3. Aggregate Total Portfolio Summary
    const totalInvested = allStockInsights.reduce((sum, s) => sum + s.investedValue, 0);
    const totalCurrentValue = allStockInsights.reduce((sum, s) => sum + s.currentValue, 0);
    const totalOverallPnl = totalCurrentValue - totalInvested;
    const totalOverallPnlPercent =
      totalInvested > 0 ? (totalOverallPnl / totalInvested) * 100 : 0;
    const totalTodayPnl = allStockInsights.reduce((sum, s) => sum + s.todayPnl, 0);
    const totalTodayPnlPercent =
      totalCurrentValue > 0 ? (totalTodayPnl / totalCurrentValue) * 100 : 0;

    const cashBalance = await this.getCashBalance(userId);
    const totalNetWorth = totalCurrentValue + cashBalance;

    return {
      summary: {
        totalNetWorth: Number(totalNetWorth.toFixed(2)),
        totalInvested: Number(totalInvested.toFixed(2)),
        totalCurrentValue: Number(totalCurrentValue.toFixed(2)),
        cashBalance: Number(cashBalance.toFixed(2)),
        overallPnl: Number(totalOverallPnl.toFixed(2)),
        overallPnlPercent: Number(totalOverallPnlPercent.toFixed(2)),
        todayPnl: Number(totalTodayPnl.toFixed(2)),
        todayPnlPercent: Number(totalTodayPnlPercent.toFixed(2)),
        holdingsCount: allStockInsights.length,
        stocksCount: allStockInsights.filter((h) => h.assetClass === 'Equity').length,
        mutualFundsCount: allStockInsights.filter((h) => h.assetClass === 'Mutual Fund').length,
      },
      highlights: {
        topGainerToday,
        topLoserToday,
        highestOverallReturn,
        highestOverallLoss,
      },
      stocks: sortedInsights,
    };
  }
}

module.exports = new SnapshotService();
