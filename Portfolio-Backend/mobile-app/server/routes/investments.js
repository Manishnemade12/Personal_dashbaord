const express = require('express');
const router = express.Router();
const InvestmentHolding = require('../models/InvestmentHolding');
const InvestmentTransaction = require('../models/InvestmentTransaction');
const marketDataService = require('../services/marketDataService');
const snapshotService = require('../services/snapshotService');
const aiStockAnalyzerService = require('../services/aiStockAnalyzerService');

// 1. GET /api/investments/holdings
router.get('/holdings', async (req, res) => {
  try {
    const userId = req.query.userId || 'admin';

    const rawHoldings = await InvestmentHolding.find({ userId }).sort({ createdAt: -1 });
    const isRefresh = req.query.refresh === 'true';
    const enriched = await marketDataService.enrichHoldingsWithLiveData(rawHoldings, isRefresh);

    // Save updated live prices back to database in background
    Promise.all(
      enriched.map((item) =>
        InvestmentHolding.findByIdAndUpdate(item._id, {
          latestPrice: item.latestPrice,
          latestPriceDate: new Date(),
        })
      )
    ).catch(() => {});

    res.json(enriched);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 2. POST /api/investments/holdings (Add asset with manual or auto buy price, live price tracked)
router.post('/holdings', async (req, res) => {
  try {
    const {
      symbolOrCode,
      quantity,
      buyPrice,
      assetClass = 'Equity',
      subCategory = 'Stocks',
      instrumentName,
      userId = 'admin',
      notes,
    } = req.body;

    if (!symbolOrCode || !quantity || Number(quantity) <= 0) {
      return res.status(400).json({ error: 'Valid symbol/code and quantity (>0) are required' });
    }

    // Auto-fetch real-time market price / NAV
    const quote = await marketDataService.getLiveQuote(symbolOrCode, assetClass);
    const livePrice = quote.price > 0 ? quote.price : 100.0;
    const finalBuyPrice = buyPrice && Number(buyPrice) > 0 ? Number(Number(buyPrice).toFixed(2)) : livePrice;
    const finalName = instrumentName || quote.instrumentName || symbolOrCode;

    // Check if user already holds this instrument
    let holding = await InvestmentHolding.findOne({ userId, symbolOrCode: symbolOrCode.trim() });

    if (holding) {
      // Average out buy price
      const oldQty = holding.quantity || 0;
      const addQty = Number(quantity);
      const totalCost = oldQty * holding.averageBuyPrice + addQty * finalBuyPrice;
      const newQty = oldQty + addQty;

      holding.quantity = newQty;
      holding.averageBuyPrice = Number((totalCost / newQty).toFixed(2));
      holding.latestPrice = livePrice;
      holding.latestPriceDate = new Date();
      if (subCategory) holding.subCategory = subCategory;
      await holding.save();
    } else {
      holding = await InvestmentHolding.create({
        userId,
        assetClass,
        subCategory,
        symbolOrCode: symbolOrCode.trim(),
        instrumentName: finalName,
        quantity: Number(quantity),
        averageBuyPrice: finalBuyPrice,
        latestPrice: livePrice,
        latestPriceDate: new Date(),
        exchange: assetClass === 'Mutual Fund' ? 'AMFI' : 'NSE',
      });
    }

    // Record buy transaction
    await InvestmentTransaction.create({
      holdingId: holding._id,
      userId,
      type: 'BUY',
      units: Number(quantity),
      pricePerUnit: finalBuyPrice,
      totalAmount: Number((Number(quantity) * finalBuyPrice).toFixed(2)),
      notes: notes || `Added ${quantity} units of ${finalName} @ ₹${finalBuyPrice}`,
    });

    res.status(201).json(holding);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// 2b. POST /api/investments/holdings/bulk (Bulk add confirmed holdings from AI or CSV)
router.post('/holdings/bulk', async (req, res) => {
  try {
    const { holdings, userId = 'admin' } = req.body;
    if (!Array.isArray(holdings) || holdings.length === 0) {
      return res.status(400).json({ error: 'Holdings array is required and must not be empty' });
    }

    const savedHoldings = [];

    for (const item of holdings) {
      const symbolOrCode = (item.symbolOrCode || item.symbol || '').trim();
      const quantity = Number(item.quantity);
      if (!symbolOrCode || !quantity || quantity <= 0) continue;

      const assetClass = item.assetClass || item.type || 'Equity';
      const subCategory = item.subCategory || 'Stocks';
      const buyPrice = Number(item.buyPrice) > 0 ? Number(Number(item.buyPrice).toFixed(2)) : 100.0;
      const instrumentName = item.instrumentName || item.name || symbolOrCode;

      // Auto-fetch real-time market price or use provided latestPrice
      let livePrice = Number(item.latestPrice) > 0 ? Number(item.latestPrice) : buyPrice;
      try {
        const quote = await marketDataService.getLiveQuote(symbolOrCode, assetClass);
        if (quote && quote.price > 0) livePrice = quote.price;
      } catch (e) {}

      let holding = await InvestmentHolding.findOne({ userId, symbolOrCode });
      if (holding) {
        const oldQty = holding.quantity || 0;
        const totalCost = oldQty * holding.averageBuyPrice + quantity * buyPrice;
        const newQty = oldQty + quantity;

        holding.quantity = newQty;
        holding.averageBuyPrice = Number((totalCost / newQty).toFixed(2));
        holding.latestPrice = livePrice;
        holding.latestPriceDate = new Date();
        if (subCategory) holding.subCategory = subCategory;
        await holding.save();
      } else {
        holding = await InvestmentHolding.create({
          userId,
          assetClass,
          subCategory,
          symbolOrCode,
          instrumentName,
          quantity,
          averageBuyPrice: buyPrice,
          latestPrice: livePrice,
          latestPriceDate: new Date(),
          exchange: assetClass === 'Mutual Fund' ? 'AMFI' : 'NSE',
        });
      }

      await InvestmentTransaction.create({
        holdingId: holding._id,
        userId,
        type: 'BUY',
        units: quantity,
        pricePerUnit: buyPrice,
        totalAmount: Number((quantity * buyPrice).toFixed(2)),
        notes: item.notes || `AI Imported ${quantity} units of ${instrumentName} @ ₹${buyPrice}`,
      });

      savedHoldings.push(holding);
    }

    res.status(201).json({
      success: true,
      count: savedHoldings.length,
      holdings: savedHoldings,
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// 2c. POST /api/investments/ai-extract (Extract stock holdings from image via xAI Grok Vision API)
router.post('/ai-extract', async (req, res) => {
  try {
    const { image, mimeType = 'image/jpeg', useDemo = false } = req.body;

    if (!image && !useDemo) {
      return res.status(400).json({ error: 'Image data (base64 or URL) is required' });
    }

    const apiKey = process.env.GROK_API_KEY || process.env.XAI_API_KEY;
    const isKeyConfigured = apiKey && !apiKey.includes('your_xai_grok') && !apiKey.includes('placeholder') && apiKey.trim().length > 10;

    // Demo / Sample portfolio holdings extracted from Zerodha / Groww screenshot for testing/fallback
    const demoHoldings = [
      {
        symbolOrCode: 'TATAMOTORS.NS',
        instrumentName: 'Tata Motors Limited',
        assetClass: 'Equity',
        subCategory: 'Automobile',
        quantity: 25,
        buyPrice: 948.50,
        latestPrice: 978.20,
        confidence: 0.98,
        notes: 'AI extracted: 25 shares @ ₹948.50 avg price',
      },
      {
        symbolOrCode: 'RELIANCE.NS',
        instrumentName: 'Reliance Industries Ltd',
        assetClass: 'Equity',
        subCategory: 'Energy & Oil',
        quantity: 10,
        buyPrice: 2840.00,
        latestPrice: 2920.40,
        confidence: 0.96,
        notes: 'AI extracted: 10 shares @ ₹2840.00 avg price',
      },
      {
        symbolOrCode: 'HDFCBANK.NS',
        instrumentName: 'HDFC Bank Limited',
        assetClass: 'Equity',
        subCategory: 'Banking',
        quantity: 15,
        buyPrice: 1590.25,
        latestPrice: 1645.00,
        confidence: 0.95,
        notes: 'AI extracted: 15 shares @ ₹1590.25 avg price',
      },
    ];

    if (!isKeyConfigured || useDemo) {
      return res.json({
        success: true,
        isDemo: true,
        message: isKeyConfigured
          ? 'Extracted successfully (Demo mode)'
          : 'Grok API Key not set in .env. Showing sample extracted holdings. Add GROK_API_KEY to .env for live AI extraction.',
        count: demoHoldings.length,
        holdings: demoHoldings,
        model: 'grok-2-vision-1212 (Demo Fallback)',
      });
    }

    // Format image URL
    let imageUrl = image;
    if (!image.startsWith('http://') && !image.startsWith('https://') && !image.startsWith('data:')) {
      imageUrl = `data:${mimeType};base64,${image}`;
    }

    const grokModel = process.env.GROK_MODEL || 'grok-2-vision-1212';

    const promptText = `Analyze this brokerage or investment portfolio screenshot (e.g. Zerodha Kite, Groww, Angel One, Upstox, IndMoney, Coin, Robinhood, etc.).
Extract all holdings or stocks visible in the image.
For each holding detected, determine:
- symbolOrCode: Stock ticker on NSE/BSE (e.g. TATAMOTORS.NS, RELIANCE.NS, INFY.NS, HDFCBANK.NS, etc.)
- instrumentName: Full company or asset name (e.g. 'Tata Motors Ltd', 'Reliance Industries Ltd')
- assetClass: Must be one of 'Equity', 'Mutual Fund', 'ETF', 'Gold'
- subCategory: Industry or cap (e.g. 'Large Cap', 'Mid Cap', 'Automobile', 'IT', 'Banking')
- quantity: Number of shares/units held (numeric)
- buyPrice: Average purchase price / avg cost per share in INR (numeric)
- latestPrice: Current Market Price / LTP in INR (numeric, or buyPrice if not visible)
- confidence: Extraction confidence between 0.5 and 1.0
- notes: Short info note

Return ONLY a valid JSON array of objects.
Example output format:
[
  {
    "symbolOrCode": "TATAMOTORS.NS",
    "instrumentName": "Tata Motors Ltd",
    "assetClass": "Equity",
    "subCategory": "Large Cap",
    "quantity": 25,
    "buyPrice": 948.5,
    "latestPrice": 978.2,
    "confidence": 0.95,
    "notes": "Extracted from portfolio screenshot"
  }
]
Do not output markdown backticks or any conversational text. Just the raw JSON array.`;

    const grokPayload = {
      model: grokModel,
      messages: [
        {
          role: 'system',
          content: 'You are a precise financial data extraction AI. You extract structured stock and portfolio holdings from images into pure JSON.',
        },
        {
          role: 'user',
          content: [
            { type: 'text', text: promptText },
            {
              type: 'image_url',
              image_url: {
                url: imageUrl,
              },
            },
          ],
        },
      ],
      temperature: 0.1,
    };

    const grokRes = await fetch('https://api.x.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(grokPayload),
    });

    if (!grokRes.ok) {
      const errText = await grokRes.text();
      console.error('[Grok Vision Error]', grokRes.status, errText);
      return res.status(502).json({
        error: `Grok API error (${grokRes.status}): ${errText}`,
        fallbackAvailable: true,
        demoHoldings,
      });
    }

    const grokData = await grokRes.json();
    const rawContent = grokData?.choices?.[0]?.message?.content || '';

    // Strip markdown code fences if model returned \`\`\`json ... \`\`\`
    let cleanJson = rawContent.trim();
    if (cleanJson.startsWith('```json')) {
      cleanJson = cleanJson.replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim();
    } else if (cleanJson.startsWith('```')) {
      cleanJson = cleanJson.replace(/^```\s*/, '').replace(/```\s*$/, '').trim();
    }

    let parsedHoldings = [];
    try {
      parsedHoldings = JSON.parse(cleanJson);
    } catch (parseErr) {
      console.warn('[Grok JSON Parse Error]', parseErr.message, 'Raw:', rawContent);
      const match = rawContent.match(/\[\s*\{[\s\S]*\}\s*\]/);
      if (match) {
        parsedHoldings = JSON.parse(match[0]);
      } else {
        throw new Error('Could not parse holdings JSON from Grok response');
      }
    }

    if (!Array.isArray(parsedHoldings)) {
      parsedHoldings = [parsedHoldings];
    }

    // Sanitize fields
    const sanitized = parsedHoldings.map((h) => ({
      symbolOrCode: (h.symbolOrCode || h.symbol || 'STOCK.NS').toUpperCase().trim(),
      instrumentName: h.instrumentName || h.name || h.symbolOrCode || 'Investment Asset',
      assetClass: ['Equity', 'Mutual Fund', 'ETF', 'Gold'].includes(h.assetClass) ? h.assetClass : 'Equity',
      subCategory: h.subCategory || 'Stocks',
      quantity: Number(h.quantity) || 1,
      buyPrice: Number(h.buyPrice) || 100.0,
      latestPrice: Number(h.latestPrice) || Number(h.buyPrice) || 100.0,
      confidence: Number(h.confidence) || 0.9,
      notes: h.notes || 'Extracted via Grok AI from image',
    }));

    res.json({
      success: true,
      isDemo: false,
      count: sanitized.length,
      holdings: sanitized,
      model: grokModel,
      rawUsage: grokData.usage,
    });
  } catch (err) {
    console.error('[AI Extract Error]', err);
    res.status(500).json({ error: err.message });
  }
});

// 3. POST /api/investments/transaction (Buy / Sell units with custom or live price & realized P&L calculation)
router.post('/transaction', async (req, res) => {
  try {
    const { holdingId, type, units, price, notes, userId = 'admin' } = req.body;

    if (!holdingId || !type || !units || Number(units) <= 0) {
      return res.status(400).json({ error: 'holdingId, type (BUY/SELL), and units are required' });
    }

    const holding = await InvestmentHolding.findById(holdingId);
    if (!holding) {
      return res.status(404).json({ error: 'Holding not found' });
    }

    // Fetch current live price if specific execution price not provided
    let livePrice = holding.latestPrice || holding.averageBuyPrice;
    try {
      const quote = await marketDataService.getLiveQuote(holding.symbolOrCode, holding.assetClass);
      if (quote && quote.price > 0) livePrice = quote.price;
    } catch (e) {}

    const execPrice = price && Number(price) > 0 ? Number(Number(price).toFixed(2)) : livePrice;
    const numUnits = Number(units);

    if (type === 'SELL') {
      if (numUnits > holding.quantity) {
        return res.status(400).json({
          error: `Cannot sell ${numUnits} units. Current holding balance is ${holding.quantity} units.`,
        });
      }

      const avgBuy = holding.averageBuyPrice || 0;
      const realizedGain = Number(((execPrice - avgBuy) * numUnits).toFixed(2));
      const pnlPercent = avgBuy > 0 ? Number((((execPrice - avgBuy) / avgBuy) * 100).toFixed(2)) : 0;

      holding.quantity = Number((holding.quantity - numUnits).toFixed(4));
      holding.latestPrice = execPrice;
      holding.latestPriceDate = new Date();
      await holding.save();

      const tx = await InvestmentTransaction.create({
        holdingId: holding._id,
        userId,
        type: 'SELL',
        units: numUnits,
        pricePerUnit: execPrice,
        totalAmount: Number((numUnits * execPrice).toFixed(2)),
        realizedGain,
        notes:
          notes ||
          `Sold ${numUnits} units @ ₹${execPrice} (${realizedGain >= 0 ? '+' : ''}₹${realizedGain} / ${pnlPercent}%)`,
      });

      return res.json({ success: true, holding, transaction: tx, realizedGain, pnlPercent });
    } else if (type === 'BUY') {
      const oldQty = holding.quantity;
      const totalCost = oldQty * holding.averageBuyPrice + numUnits * execPrice;
      const newQty = oldQty + numUnits;

      holding.quantity = Number(newQty.toFixed(4));
      holding.averageBuyPrice = Number((totalCost / newQty).toFixed(2));
      holding.latestPrice = execPrice;
      holding.latestPriceDate = new Date();
      await holding.save();

      const tx = await InvestmentTransaction.create({
        holdingId: holding._id,
        userId,
        type: 'BUY',
        units: numUnits,
        pricePerUnit: execPrice,
        totalAmount: Number((numUnits * execPrice).toFixed(2)),
        realizedGain: 0,
        notes: notes || `Bought ${numUnits} units @ ₹${execPrice}`,
      });

      return res.json({ success: true, holding, transaction: tx });
    } else {
      return res.status(400).json({ error: 'Invalid transaction type. Must be BUY or SELL.' });
    }
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// 3b. GET /api/investments/holdings/:id/transactions (Full buy/sell transaction history for a particular asset)
router.get('/holdings/:id/transactions', async (req, res) => {
  try {
    const holding = await InvestmentHolding.findById(req.params.id);
    if (!holding) {
      return res.status(404).json({ error: 'Holding not found' });
    }

    let transactions = await InvestmentTransaction.find({ holdingId: req.params.id }).sort({ date: -1, createdAt: -1 });

    // If no transactions in DB, synthesize initial BUY transaction from holding creation
    if (!transactions || transactions.length === 0) {
      transactions = [
        {
          _id: 'init_' + holding._id,
          holdingId: holding._id,
          userId: holding.userId,
          type: 'BUY',
          units: holding.quantity,
          pricePerUnit: holding.averageBuyPrice,
          totalAmount: Number((holding.quantity * holding.averageBuyPrice).toFixed(2)),
          realizedGain: 0,
          date: holding.createdAt || new Date(),
          notes: `Initial Position: ${holding.quantity} units @ ₹${holding.averageBuyPrice}`,
          isInitialPosition: true,
        },
      ];
    }

    const currentPrice = holding.latestPrice || holding.averageBuyPrice;
    const investedVal = Number((holding.quantity * holding.averageBuyPrice).toFixed(2));
    const currentVal = Number((holding.quantity * currentPrice).toFixed(2));
    const pnlVal = Number((currentVal - investedVal).toFixed(2));
    const pnlPct = holding.averageBuyPrice > 0 ? Number((((currentPrice - holding.averageBuyPrice) / holding.averageBuyPrice) * 100).toFixed(2)) : 0;

    res.json({
      success: true,
      holding: {
        _id: holding._id,
        symbolOrCode: holding.symbolOrCode,
        instrumentName: holding.instrumentName,
        assetClass: holding.assetClass,
        subCategory: holding.subCategory,
        quantity: holding.quantity,
        averageBuyPrice: holding.averageBuyPrice,
        latestPrice: currentPrice,
        investedValue: investedVal,
        currentValue: currentVal,
        pnl: pnlVal,
        pnlPercent: pnlPct,
        createdAt: holding.createdAt,
      },
      transactions,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 3c. GET /api/investments/transactions (List all user investment transactions)
router.get('/transactions', async (req, res) => {
  try {
    const { holdingId, userId = 'admin' } = req.query;
    const filter = { userId };
    if (holdingId) filter.holdingId = holdingId;

    const transactions = await InvestmentTransaction.find(filter)
      .populate('holdingId', 'symbolOrCode instrumentName assetClass subCategory')
      .sort({ date: -1, createdAt: -1 });

    res.json(transactions);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 4. PUT /api/investments/holdings/:id (Update holding quantity or cost basis manually)
router.put('/holdings/:id', async (req, res) => {
  try {
    const { quantity, averageBuyPrice, subCategory, instrumentName } = req.body;
    const holding = await InvestmentHolding.findById(req.params.id);
    if (!holding) {
      return res.status(404).json({ error: 'Holding not found' });
    }

    if (quantity !== undefined && Number(quantity) >= 0) {
      holding.quantity = Number(quantity);
    }
    if (averageBuyPrice !== undefined && Number(averageBuyPrice) >= 0) {
      holding.averageBuyPrice = Number(Number(averageBuyPrice).toFixed(2));
    }
    if (subCategory) holding.subCategory = subCategory;
    if (instrumentName) holding.instrumentName = instrumentName;

    await holding.save();
    res.json(holding);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// 5. DELETE /api/investments/holdings/:id
router.delete('/holdings/:id', async (req, res) => {
  try {
    const holding = await InvestmentHolding.findByIdAndDelete(req.params.id);
    if (!holding) {
      return res.status(404).json({ error: 'Holding not found' });
    }

    // Delete associated transactions
    await InvestmentTransaction.deleteMany({ holdingId: req.params.id });

    res.json({ success: true, message: 'Holding removed from portfolio' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 5. GET /api/investments/search (Autocomplete instruments from live market APIs)
router.get('/search', async (req, res) => {
  try {
    const { q = '', type = '' } = req.query;
    const results = await marketDataService.searchInstruments(q, type);
    res.json(results);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 6. GET /api/investments/price (Live quote + chart points)
router.get('/price', async (req, res) => {
  try {
    const { symbol = '', type = 'Equity' } = req.query;
    if (!symbol) {
      return res.status(400).json({ error: 'Symbol or scheme code is required' });
    }
    const quote = await marketDataService.getLiveQuote(symbol, type);
    res.json(quote);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 7. GET /api/investments/summary (Overall portfolio metrics & monthly target tracking)
router.get('/summary', async (req, res) => {
  try {
    const userId = req.query.userId || 'admin';

    const rawHoldings = await InvestmentHolding.find({ userId });
    const isRefresh = req.query.refresh === 'true';
    const enriched = await marketDataService.enrichHoldingsWithLiveData(rawHoldings, isRefresh);

    let totalPortfolioValue = 0;
    let totalInvested = 0;
    const assetMap = {};

    enriched.forEach((h) => {
      const cur = h.currentValue || 0;
      const inv = h.investedValue || 0;
      totalPortfolioValue += cur;
      totalInvested += inv;

      const cls = h.assetClass || 'Other';
      assetMap[cls] = (assetMap[cls] || 0) + cur;
    });

    const totalPnL = totalPortfolioValue - totalInvested;
    const totalPnLPercent =
      totalInvested > 0 ? Number(((totalPnL / totalInvested) * 100).toFixed(2)) : 0;

    // Asset allocation breakdown
    const assetAllocation = Object.keys(assetMap).map((cls) => ({
      assetClass: cls,
      value: Number(assetMap[cls].toFixed(2)),
      percent:
        totalPortfolioValue > 0
          ? Number(((assetMap[cls] / totalPortfolioValue) * 100).toFixed(1))
          : 0,
    }));

    // Find investments made in the current calendar month
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthTransactions = await InvestmentTransaction.find({
      userId,
      type: 'BUY',
      date: { $gte: startOfMonth },
    });

    const monthInvested = monthTransactions.reduce((sum, tx) => sum + (tx.totalAmount || 0), 0);

    // Recent transactions list
    const recentTransactions = await InvestmentTransaction.find({ userId })
      .populate('holdingId', 'instrumentName symbolOrCode assetClass')
      .sort({ date: -1 })
      .limit(6);

    res.json({
      totalPortfolioValue: Number(totalPortfolioValue.toFixed(2)),
      totalInvested: Number(totalInvested.toFixed(2)),
      totalPnL: Number(totalPnL.toFixed(2)),
      totalPnLPercent,
      assetAllocation,
      holdingsCount: enriched.length,
      recentTransactions,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 8. DELETE /api/investments/clear-all (Clear all holdings & transactions)
router.delete('/clear-all', async (req, res) => {
  try {
    const userId = req.query.userId || 'admin';
    const hRes = await InvestmentHolding.deleteMany({ userId });
    const tRes = await InvestmentTransaction.deleteMany({ userId });
    res.json({
      success: true,
      message: 'All investment holdings and transactions cleared.',
      deletedHoldings: hRes.deletedCount,
      deletedTransactions: tRes.deletedCount,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 9. GET /api/investments/analytics (Comprehensive portfolio analytics for charts)
router.get('/analytics', async (req, res) => {
  try {
    const userId = req.query.userId || 'admin';
    const rawHoldings = await InvestmentHolding.find({ userId });
    const enriched = await marketDataService.enrichHoldingsWithLiveData(rawHoldings);

    // Helper: classify sector/industry accurately
    const classifySector = (h) => {
      const name = (h.instrumentName || '').toLowerCase();
      const sub = (h.subCategory || '').toLowerCase();
      const sym = (h.symbolOrCode || '').toUpperCase().replace('.NS', '').replace('.BO', '');

      // Direct symbol maps for 100% precision
      if (['RECLTD', 'PFC', 'IRFC', 'IREDA', 'IFCI', 'IDFCFIRSTB', 'IDBI', 'BANKINDIA', 'RBLBANK', 'LTF', 'HUDCO', 'GROWW', 'ANGELONE', 'MONEYVIEW', 'PINELABS', 'HDFCBANK', 'ICICIBANK', 'KOTAKBANK', 'SBIN', 'AXISBANK', 'BAJFINANCE'].includes(sym)) {
        return 'Banking & Financial Services';
      }
      if (['ADANIPOWER', 'CESC', 'INOXWIND', 'IOC', 'MRPL', 'BHEL', 'NTPC', 'POWERGRID', 'TATAPOWER', 'ONGC', 'BPCL', 'RELIANCE'].includes(sym)) {
        return 'Energy, Power & Utilities';
      }
      if (['OLAELEC', 'ASHOKLEY', 'ARE&M', 'BELRISE', 'TATAMOTORS', 'MARUTI', 'M&M', 'BAJAJ-AUTO', 'HEROMOTOCO', 'EICHERMOT', 'TVSMOTOR'].includes(sym)) {
        return 'Automobile & Mobility';
      }
      if (['SAIL', 'NATIONALUM', 'PRADPME', 'TATASTEEL', 'HINDALCO', 'JUSL', 'VEDL', 'JSWSTEEL', 'COALINDIA', 'NMDC'].includes(sym)) {
        return 'Metals & Mining';
      }
      if (['IRCON', 'NBCC', 'LT', 'GMRINFRA', 'DLF', 'ULTRACEMCO', 'AMBUJACEM'].includes(sym)) {
        return 'Infrastructure & Construction';
      }
      if (['NOCIL', 'NFL', 'CHAMBLFERT', 'BAJAJHIND', 'UPL', 'PIIND', 'SRF', 'AARTIIND'].includes(sym)) {
        return 'Chemicals & Agriculture';
      }
      if (['KWIL', 'ITC', 'HINDUNILVR', 'NESTLEIND', 'BRITANNIA', 'DABUR', 'MARICO', 'GODREJCP', 'COLPAL'].includes(sym)) {
        return 'FMCG & Consumer Goods';
      }
      if (['PAR', 'PWL', 'MEESHO', 'TCS', 'INFY', 'WIPRO', 'HCLTECH', 'LTIM', 'TECHM', 'PERSISTENT', 'COFORGE'].includes(sym)) {
        return 'IT & Consumer Tech';
      }
      if (['PHARMAINAV', 'SUNPHARMA', 'CIPLA', 'DRREDDY', 'DIVISLAB', 'LUPIN', 'APOLLOHOSP'].includes(sym)) {
        return 'Pharma & Healthcare';
      }

      // Semantic Regex fallbacks
      if (/bank|financ|credit|nbfc|insur|wealth|broker|fintech|lending|paytm|payment|fund|capital|asset/i.test(name + sub + sym)) return 'Banking & Financial Services';
      if (/power|energy|electric|wind|solar|refiner|petrochem|oil|gas|ntpc|cesc|coal|grid|fuel/i.test(name + sub + sym)) return 'Energy, Power & Utilities';
      if (/auto|motor|vehicle|mobility|leyland|maruti|mahindra|eicher|battery|tyre/i.test(name + sub + sym)) return 'Automobile & Mobility';
      if (/metal|steel|aluminium|iron|copper|mining|zinc|mineral|forge/i.test(name + sub + sym)) return 'Metals & Mining';
      if (/infra|construction|build|contract|railway|urban|develop|engineer|cement/i.test(name + sub + sym)) return 'Infrastructure & Construction';
      if (/fertiliz|chemical|sugar|agri|pesticide|ethanol/i.test(name + sub + sym)) return 'Chemicals & Agriculture';
      if (/fmcg|consumer|food|dairy|ice cream|beverage|retail|packag/i.test(name + sub + sym)) return 'FMCG & Consumer Goods';
      if (/tech|software|digital|cloud|edtech|ecommerce|internet|saas|telecom|media/i.test(name + sub + sym)) return 'IT & Consumer Tech';
      if (/pharma|health|drug|hospital|medic|bio/i.test(name + sub + sym)) return 'Pharma & Healthcare';
      if (/gold|silver|commodit/i.test(name + sub + (h.assetClass || ''))) return 'Precious Metals & Gold';
      if (/etf|index|nifty|sensex/i.test(name + sub)) return 'Index & ETFs';

      return 'Diversified Holdings';
    };

    // Helper: classify market cap accurately
    const classifyMarketCap = (h) => {
      const cls = (h.assetClass || '').toLowerCase();
      const sub = (h.subCategory || '').toLowerCase();
      const sym = (h.symbolOrCode || '').toUpperCase().replace('.NS', '').replace('.BO', '');

      if (cls === 'gold' || cls === 'fixed income') return 'Non-Equity / Safe';
      if (/mutual fund/.test(cls)) {
        if (/large/.test(sub)) return 'Large Cap';
        if (/mid/.test(sub)) return 'Mid Cap';
        if (/small/.test(sub)) return 'Small Cap';
        return 'Flexi / Multi Cap';
      }

      // Large Caps (> ₹50,000 Cr m-cap)
      const largeCaps = [
        'IOC', 'ADANIPOWER', 'BANKINDIA', 'SAIL', 'RECLTD', 'PFC', 'IRFC', 'ASHOKLEY', 'BHEL',
        'IDFCFIRSTB', 'IREDA', 'HUDCO', 'RELIANCE', 'TCS', 'HDFCBANK', 'INFY', 'ICICIBANK',
        'SBIN', 'BHARTIARTL', 'ITC', 'KOTAKBANK', 'LT', 'HINDUNILVR', 'AXISBANK', 'TATAMOTORS',
        'NTPC', 'MARUTI', 'ONGC', 'SUNPHARMA', 'TITAN', 'POWERGRID', 'TATASTEEL', 'COALINDIA'
      ];
      if (largeCaps.includes(sym)) return 'Large Cap';

      // Mid Caps (₹15,000 Cr - ₹50,000 Cr)
      const midCaps = [
        'MRPL', 'NATIONALUM', 'CHAMBLFERT', 'RBLBANK', 'IDBI', 'ANGELONE', 'CESC', 'ARE&M',
        'INOXWIND', 'LTF', 'OLAELEC', 'MPHASIS', 'PERSISTENT', 'COFORGE', 'VOLTAS', 'TRENT',
        'INDIGO', 'FEDERALBNK', 'AARTIIND', 'SRF', 'PIIND', 'POLYCAB', 'MUTHOOTFIN'
      ];
      if (midCaps.includes(sym)) return 'Mid Cap';

      // Small Cap & Emerging High Growth (< ₹15,000 Cr)
      return 'Small & Emerging Cap';
    };

    // Helper: classify risk level accurately
    const classifyRisk = (h) => {
      const cls = (h.assetClass || '').toLowerCase();
      const sub = (h.subCategory || '').toLowerCase();
      const sym = (h.symbolOrCode || '').toUpperCase().replace('.NS', '').replace('.BO', '');

      if (cls === 'gold' || cls === 'fixed income') return 'Low Risk';
      if (/debt|liquid|overnight|gilt/.test(sub)) return 'Low Risk';

      // Low Risk: Bluechip Dividend Giants & Sovereign PSUs
      const lowRiskPSUs = ['IOC', 'IRFC', 'RECLTD', 'PFC', 'HUDCO', 'BANKINDIA', 'POWERGRID', 'NTPC'];
      if (lowRiskPSUs.includes(sym)) return 'Low Risk';

      // High Risk: High volatility, emerging EV, turnaround small caps, high beta
      const highRisk = ['OLAELEC', 'INOXWIND', 'ADANIPOWER', 'PWL', 'MEESHO', 'MONEYVIEW', 'PINELABS', 'PRADPME', 'NOCIL', 'NFL', 'NBCC', 'BELRISE', 'BAJAJHIND', 'IFCI', 'PAR'];
      if (highRisk.includes(sym)) return 'High Risk';

      return 'Moderate Risk';
    };

    // Aggregate data into multiple breakdowns
    const breakdowns = {
      byAssetClass: {},
      bySector: {},
      byMarketCap: {},
      byRiskLevel: {},
      bySubCategory: {},
    };

    let totalValue = 0;

    const pushItem = (bucketMap, key, item) => {
      if (!bucketMap[key]) {
        bucketMap[key] = { value: 0, items: [] };
      }
      bucketMap[key].value += item.value;
      bucketMap[key].items.push(item);
    };

    enriched.forEach((h) => {
      const curVal = h.currentValue || (h.quantity * (h.latestPrice || h.averageBuyPrice)) || 0;
      totalValue += curVal;

      const assetClass = h.assetClass || 'Other';
      const sector = classifySector(h);
      const mktCap = classifyMarketCap(h);
      const risk = classifyRisk(h);
      const subCat = h.subCategory || 'Uncategorized';

      const holdingBrief = {
        id: h._id,
        instrumentName: h.instrumentName,
        symbolOrCode: h.symbolOrCode,
        assetClass: h.assetClass,
        quantity: h.quantity,
        latestPrice: h.latestPrice || h.averageBuyPrice,
        value: Number(curVal.toFixed(2)),
      };

      pushItem(breakdowns.byAssetClass, assetClass, holdingBrief);
      pushItem(breakdowns.bySector, sector, holdingBrief);
      pushItem(breakdowns.byMarketCap, mktCap, holdingBrief);
      pushItem(breakdowns.byRiskLevel, risk, holdingBrief);
      pushItem(breakdowns.bySubCategory, subCat, holdingBrief);
    });

    // Convert maps to sorted arrays with percentages & items
    const toChartData = (map) =>
      Object.entries(map)
        .map(([name, data]) => ({
          name,
          value: Number(data.value.toFixed(2)),
          percent: totalValue > 0 ? Number(((data.value / totalValue) * 100).toFixed(1)) : 0,
          items: data.items.sort((a, b) => b.value - a.value),
        }))
        .sort((a, b) => b.value - a.value);

    // ==========================================
    // MONTHLY INVESTMENT TRENDS & DEPLOYMENTS
    // ==========================================
    const buyTransactions = await InvestmentTransaction.find({
      userId,
      type: 'BUY',
    })
      .populate('holdingId', 'instrumentName symbolOrCode assetClass subCategory')
      .sort({ date: 1 });

    const monthlyMap = {};

    // Seed trailing 6 calendar months
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const mKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const mLabel = d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      const mShort = d.toLocaleDateString('en-US', { month: 'short' });
      monthlyMap[mKey] = {
        month: mKey,
        monthLabel: mLabel,
        monthShort: mShort,
        year: d.getFullYear(),
        monthNumber: d.getMonth() + 1,
        totalInvested: 0,
        transactionsCount: 0,
        byAssetClass: {},
        instrumentsMap: {},
      };
    }

    // Populate from real buy transactions
    buyTransactions.forEach((tx) => {
      const txDate = new Date(tx.date || tx.createdAt || Date.now());
      const mKey = `${txDate.getFullYear()}-${String(txDate.getMonth() + 1).padStart(2, '0')}`;

      if (!monthlyMap[mKey]) {
        const mLabel = txDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
        const mShort = txDate.toLocaleDateString('en-US', { month: 'short' });
        monthlyMap[mKey] = {
          month: mKey,
          monthLabel: mLabel,
          monthShort: mShort,
          year: txDate.getFullYear(),
          monthNumber: txDate.getMonth() + 1,
          totalInvested: 0,
          transactionsCount: 0,
          byAssetClass: {},
          instrumentsMap: {},
        };
      }

      const amt = Number(tx.totalAmount) || 0;
      monthlyMap[mKey].totalInvested += amt;
      monthlyMap[mKey].transactionsCount += 1;

      const holding = tx.holdingId || {};
      const assetClass = holding.assetClass || 'Equity';
      const instName = holding.instrumentName || holding.symbolOrCode || 'Asset';

      monthlyMap[mKey].byAssetClass[assetClass] =
        (monthlyMap[mKey].byAssetClass[assetClass] || 0) + amt;

      if (!monthlyMap[mKey].instrumentsMap[instName]) {
        monthlyMap[mKey].instrumentsMap[instName] = {
          name: instName,
          symbol: holding.symbolOrCode || '',
          assetClass,
          amount: 0,
          units: 0,
        };
      }
      monthlyMap[mKey].instrumentsMap[instName].amount += amt;
      monthlyMap[mKey].instrumentsMap[instName].units += Number(tx.units) || 0;
    });

    // Fallback: if no individual buy transactions were recorded yet, aggregate from holdings' creation dates
    if (buyTransactions.length === 0 && enriched.length > 0) {
      enriched.forEach((h) => {
        const hDate = new Date(h.createdAt || Date.now());
        const mKey = `${hDate.getFullYear()}-${String(hDate.getMonth() + 1).padStart(2, '0')}`;
        if (!monthlyMap[mKey]) {
          const mLabel = hDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
          const mShort = hDate.toLocaleDateString('en-US', { month: 'short' });
          monthlyMap[mKey] = {
            month: mKey,
            monthLabel: mLabel,
            monthShort: mShort,
            year: hDate.getFullYear(),
            monthNumber: hDate.getMonth() + 1,
            totalInvested: 0,
            transactionsCount: 0,
            byAssetClass: {},
            instrumentsMap: {},
          };
        }
        const inv = Number(h.investedValue) || (Number(h.quantity) * Number(h.averageBuyPrice)) || 0;
        monthlyMap[mKey].totalInvested += inv;
        monthlyMap[mKey].transactionsCount += 1;
        const assetClass = h.assetClass || 'Equity';
        monthlyMap[mKey].byAssetClass[assetClass] =
          (monthlyMap[mKey].byAssetClass[assetClass] || 0) + inv;
      });
    }

    const monthlyTrends = Object.values(monthlyMap)
      .sort((a, b) => a.month.localeCompare(b.month))
      .map((m, idx, arr) => {
        const prevMonth = idx > 0 ? arr[idx - 1] : null;
        let momGrowth = 0;
        if (prevMonth && prevMonth.totalInvested > 0) {
          momGrowth = Number(
            (((m.totalInvested - prevMonth.totalInvested) / prevMonth.totalInvested) * 100).toFixed(1)
          );
        }

        const assetClassBreakdown = Object.entries(m.byAssetClass)
          .map(([cls, val]) => ({
            assetClass: cls,
            amount: Number(val.toFixed(2)),
            percent: m.totalInvested > 0 ? Number(((val / m.totalInvested) * 100).toFixed(1)) : 0,
          }))
          .sort((a, b) => b.amount - a.amount);

        const topInstruments = Object.values(m.instrumentsMap)
          .map((item) => ({
            ...item,
            amount: Number(item.amount.toFixed(2)),
            units: Number(item.units.toFixed(4)),
          }))
          .sort((a, b) => b.amount - a.amount);

        return {
          month: m.month,
          monthLabel: m.monthLabel,
          monthShort: m.monthShort,
          totalInvested: Number(m.totalInvested.toFixed(2)),
          transactionsCount: m.transactionsCount,
          assetsCount: Object.keys(m.instrumentsMap).length,
          momGrowth,
          byAssetClass: assetClassBreakdown,
          topInstruments,
        };
      });

    res.json({
      totalPortfolioValue: Number(totalValue.toFixed(2)),
      holdingsCount: enriched.length,
      byMonth: monthlyTrends,
      byAssetClass: toChartData(breakdowns.byAssetClass),
      bySector: toChartData(breakdowns.bySector),
      byMarketCap: toChartData(breakdowns.byMarketCap),
      byRiskLevel: toChartData(breakdowns.byRiskLevel),
      bySubCategory: toChartData(breakdowns.bySubCategory),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 8. STOCK PERFORMANCE INSIGHTS & FILTERS
// GET /api/investments/insights
// ==========================================
router.get('/insights', async (req, res) => {
  try {
    const userId = req.query.userId || 'admin';
    const sortBy = req.query.sortBy || 'today_best';
    const assetClass = req.query.assetClass || 'All';
    const search = req.query.search || '';

    const insightsData = await snapshotService.getStockPerformanceInsights(userId, {
      sortBy,
      assetClass,
      search,
    });

    res.json(insightsData);
  } catch (err) {
    console.error('[Investments Insights Error]', err);
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 9. HISTORICAL NET WORTH SNAPSHOTS & TIME SERIES
// GET /api/investments/net-worth-history
// ==========================================
router.get('/net-worth-history', async (req, res) => {
  try {
    const userId = req.query.userId || 'admin';
    const range = req.query.range || '1M'; // 1W, 1M, 1Y, ALL

    const historyData = await snapshotService.getNetWorthHistory(userId, range);
    res.json(historyData);
  } catch (err) {
    console.error('[Net Worth History Error]', err);
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 10. TRIGGER DAILY SNAPSHOT CAPTURE (MANUAL / SCHEDULED)
// POST /api/investments/snapshots/capture
// ==========================================
router.post('/snapshots/capture', async (req, res) => {
  try {
    const userId = req.body.userId || 'admin';
    const forceUpdate = req.body.forceUpdate !== false;

    const snapshot = await snapshotService.captureDailySnapshot(userId, {
      forceUpdate,
      source: 'manual_refresh',
    });

    res.status(200).json({
      success: true,
      message: 'Daily net worth snapshot captured successfully',
      snapshot,
    });
  } catch (err) {
    console.error('[Snapshot Capture Error]', err);
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 11. AI STOCK ANALYZER (INDIVIDUAL GROK LLM CALLS + PORTFOLIO SYNTHESIS)
// POST /api/investments/ai-analyzer
// ==========================================
router.post('/ai-analyzer', async (req, res) => {
  try {
    const userId = req.body.userId || 'admin';
    const { stockIds = [], stocks = [] } = req.body;

    let targetHoldings = [];

    if (Array.isArray(stocks) && stocks.length > 0) {
      targetHoldings = stocks;
    } else if (Array.isArray(stockIds) && stockIds.length > 0) {
      const raw = await InvestmentHolding.find({ _id: { $in: stockIds }, userId });
      targetHoldings = await marketDataService.enrichHoldingsWithLiveData(raw, false);
    } else {
      // If neither specified, fetch all equity/stock holdings for user
      const raw = await InvestmentHolding.find({
        userId,
        $or: [
          { assetClass: 'Equity' },
          { subCategory: { $regex: /stock|equity/i } },
        ],
      });
      targetHoldings = await marketDataService.enrichHoldingsWithLiveData(raw, false);
    }

    if (targetHoldings.length === 0) {
      return res.status(400).json({
        error: 'No valid stocks found to analyze. Please select at least one stock.',
      });
    }

    const result = await aiStockAnalyzerService.analyzeMultipleStocks(targetHoldings);
    res.json(result);
  } catch (err) {
    console.error('[AI Stock Analyzer Route Error]', err);
    res.status(500).json({ error: err.message || 'Failed to analyze stocks with AI.' });
  }
});

module.exports = router;
