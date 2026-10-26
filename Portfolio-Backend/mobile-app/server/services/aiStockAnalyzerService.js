const ProjectApi = require('../models/portfolio/ProjectApi');

const GROQ_MODEL = process.env.GROK_MODEL || 'openai/gpt-oss-120b';

/**
 * Retrieve Groq/Grok API Key from environment or ProjectApi vault
 */
async function getApiKey() {
  const envKey = process.env.GROK_API_KEY || process.env.GROQ_API_KEY || process.env.XAI_API_KEY;
  if (envKey && !envKey.includes('your_') && envKey.trim().length > 15) {
    return envKey.trim();
  }
  try {
    const doc = await ProjectApi.findOne({ 'apis.name': { $regex: /llm.*api.*key|grok/i } });
    if (doc) {
      const found = doc.apis.find((a) => /llm.*api.*key|grok/i.test(a.name));
      if (found && found.endpoint) {
        return found.endpoint.replace(/["']/g, '').trim();
      }
    }
  } catch (e) {}
  return '';
}

/**
 * Call Groq / Grok LLM with retry / fallback
 */
async function callGrokLlm(prompt, model = GROQ_MODEL) {
  const apiKey = await getApiKey();
  if (!apiKey) {
    throw new Error('No Grok/LLM API key found in .env or ProjectApi vault.');
  }

  const payload = {
    model: model,
    messages: [
      {
        role: 'system',
        content:
          'You are an elite Chief Investment Officer and SEBI-registered portfolio manager specializing in Indian equity markets (NSE/BSE). You evaluate user stock holdings objectively based on current market trends, valuation, entry price, and technical momentum to provide explicit Buy/Average, Hold, or Exit recommendations.',
      },
      {
        role: 'user',
        content: prompt,
      },
    ],
    temperature: 0.25,
  };

  let res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey.trim()}`,
    },
    body: JSON.stringify(payload),
  });

  // Fallback to llama-3.3-70b-versatile if primary model fails
  if (!res.ok && model !== 'llama-3.3-70b-versatile') {
    console.warn(`[Stock LLM ${model} Failed: ${res.status}], retrying with llama-3.3-70b-versatile...`);
    payload.model = 'llama-3.3-70b-versatile';
    res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey.trim()}`,
      },
      body: JSON.stringify(payload),
    });
  }

  if (!res.ok) {
    const errText = await res.text();
    console.warn(`[Stock LLM Final Error] ${res.status}: ${errText}`);
    throw new Error(`LLM API returned ${res.status}: ${errText}`);
  }

  const data = await res.json();
  const rawContent = data?.choices?.[0]?.message?.content || '';

  // Clean JSON string
  let cleanJson = rawContent.trim();
  if (cleanJson.startsWith('```json')) {
    cleanJson = cleanJson.replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim();
  } else if (cleanJson.startsWith('```')) {
    cleanJson = cleanJson.replace(/^```\s*/, '').replace(/```\s*$/, '').trim();
  }

  return JSON.parse(cleanJson);
}

/**
 * Intelligent algorithmic fallback when LLM is unreachable
 */
function generateSmartStockFallback(stock) {
  const pnlPct = Number(stock.pnlPercent || 0);
  const buyPrice = Number(stock.averageBuyPrice || stock.latestPrice || 100);
  const curPrice = Number(stock.latestPrice || buyPrice);

  let verdict = 'HOLD_LONG_TERM';
  let verdictBadge = '🔵 Hold Long Term';
  let actionPlan = 'Hold your position. Business fundamentals are sound; monitor quarterly earnings.';
  let targetPrice = Math.round(curPrice * 1.18);
  let buyZone = `₹${Math.round(curPrice * 0.95)} - ₹${Math.round(curPrice * 0.98)}`;
  let stopLoss = Math.round(curPrice * 0.90);

  if (pnlPct < -8) {
    verdict = 'AVERAGE_DOWN';
    verdictBadge = '🟢 Average Down & Accumulate';
    actionPlan = `Price is currently ${Math.abs(pnlPct).toFixed(1)}% below your buy average (₹${buyPrice}). Accumulate in 2 tranches around ${buyZone} to bring your average down.`;
    targetPrice = Math.round(buyPrice * 1.12);
    stopLoss = Math.round(curPrice * 0.88);
  } else if (pnlPct > 28) {
    verdict = 'EXIT_OR_TRIM';
    verdictBadge = '🔴 Exit / Book Partial Profit';
    actionPlan = `Stock has delivered a solid ${pnlPct.toFixed(1)}% profit. Book 40-50% profit at current levels to lock gains and hold remaining with trailing stop loss at ₹${Math.round(curPrice * 0.92)}.`;
    targetPrice = Math.round(curPrice * 1.08);
    stopLoss = Math.round(curPrice * 0.92);
  }

  return {
    symbolOrCode: stock.symbolOrCode,
    instrumentName: stock.instrumentName || stock.symbolOrCode,
    averageBuyPrice: buyPrice,
    latestPrice: curPrice,
    quantity: Number(stock.quantity || 0),
    investedValue: Number(stock.investedValue || ((stock.quantity || 0) * buyPrice)),
    currentValue: Number(stock.currentValue || ((stock.quantity || 0) * curPrice)),
    pnl: stock.pnl || 0,
    pnlPercent: pnlPct,
    verdict,
    verdictBadge,
    conviction: 82,
    targetPrice,
    buyZone,
    stopLoss,
    actionPlan,
    fundamentalThesis: `${stock.instrumentName || stock.symbolOrCode} maintains resilient market standing in its sector with consistent operational efficiency.`,
    technicalTrend: `Trading ${curPrice >= buyPrice ? 'above' : 'below'} user acquisition cost. Daily momentum indicates consolidation with key support at ₹${stopLoss}.`,
    catalysts: ['Sectoral tailwinds & domestic demand', 'Capital expenditure cycle recovery'],
    risks: ['Margin contraction due to input costs', 'Broader market volatility'],
    riskRating: Math.abs(pnlPct) > 15 ? 'Medium' : 'Low',
    timeHorizon: verdict === 'EXIT_OR_TRIM' ? '1-3 Months' : '1-2 Years',
  };
}

/**
 * 1. Analyze a Single Stock with Dedicated Grok Request
 */
async function analyzeSingleStock(stock) {
  const pnlPct = Number(stock.pnlPercent || 0).toFixed(2);
  const pnl = Number(stock.pnl || 0).toFixed(2);
  const buyPrice = Number(stock.averageBuyPrice || 0).toFixed(2);
  const curPrice = Number(stock.latestPrice || 0).toFixed(2);
  const qty = Number(stock.quantity || 0);
  const investedVal = Number(stock.investedValue || 0).toFixed(2);
  const curVal = Number(stock.currentValue || 0).toFixed(2);

  const prompt = `
Analyze this Indian stock holding for the user's personal investment portfolio.

STOCK & USER POSITION DATA:
- Company Name: "${stock.instrumentName || stock.symbolOrCode}"
- Symbol / Ticker: "${stock.symbolOrCode}"
- Asset Class: "${stock.assetClass || 'Equity'}" (${stock.subCategory || 'Stocks'})
- User Quantity Held: ${qty} shares
- User Average Buy Price: ₹${buyPrice}
- Current Market Price: ₹${curPrice}
- Total Invested Amount: ₹${investedVal}
- Current Market Value: ₹${curVal}
- Net Profit / Loss: ₹${pnl} (${pnlPct}%)
- Today Day Change: ${stock.dayChange >= 0 ? '+' : ''}${stock.dayChange || 0} (${stock.dayChangePercent || 0}%)

ANALYSIS GOAL:
You must decide which of the following 3 actions the user should take right now:
1. "AVERAGE_DOWN" -> If the stock has good long-term potential, is trading at a discount or dip, and user should buy more to lower their average cost.
2. "HOLD_LONG_TERM" -> If the company is strong, fairly priced or compounding, and the user should patiently hold for multi-year wealth creation.
3. "EXIT_OR_TRIM" -> If user has made massive profits and should book partial/full profits, OR if the stock is facing structural headwinds/downtrend and user should cut losses.

Return a JSON object with this EXACT schema:
{
  "symbolOrCode": "${stock.symbolOrCode}",
  "instrumentName": "${stock.instrumentName || stock.symbolOrCode}",
  "averageBuyPrice": ${buyPrice},
  "latestPrice": ${curPrice},
  "pnl": ${pnl},
  "pnlPercent": ${pnlPct},
  "verdict": "AVERAGE_DOWN" | "HOLD_LONG_TERM" | "EXIT_OR_TRIM",
  "verdictBadge": "🟢 Average Down & Accumulate" | "🔵 Hold Long Term" | "🔴 Exit / Book Partial Profit",
  "conviction": 85,
  "targetPrice": 1250,
  "buyZone": "₹900 - ₹930",
  "stopLoss": 840,
  "actionPlan": "Detailed step-by-step guidance on how user should manage this holding (e.g. tranche buying, stop-loss trigger, or profit-taking level)",
  "fundamentalThesis": "2-3 sentences explaining business moat, earnings growth, and valuation",
  "technicalTrend": "1-2 sentences on current trend, support levels, and RSI/moving average structure",
  "catalysts": ["Short point 1", "Short point 2"],
  "risks": ["Risk point 1", "Risk point 2"],
  "riskRating": "Low" | "Medium" | "High",
  "timeHorizon": "1-3 Months" | "6-12 Months" | "1-2 Years" | "3+ Years"
}
Do not wrap in markdown fences. Output raw JSON only.`;

  try {
    const parsed = await callGrokLlm(prompt);
    return {
      ...parsed,
      symbolOrCode: stock.symbolOrCode,
      instrumentName: stock.instrumentName || stock.symbolOrCode,
      averageBuyPrice: Number(buyPrice),
      latestPrice: Number(curPrice),
      pnl: Number(pnl),
      pnlPercent: Number(pnlPct),
      quantity: qty,
      investedValue: Number(investedVal),
      currentValue: Number(curVal),
    };
  } catch (err) {
    console.warn(`[Grok LLM Failed for ${stock.symbolOrCode}] ${err.message}. Using intelligent fallback.`);
    return generateSmartStockFallback(stock);
  }
}

/**
 * 2. Analyze Multiple Stocks: Each Stock gets an INDEPENDENT Grok API Call, then results are synthesized!
 */
async function analyzeMultipleStocks(stocksList) {
  if (!Array.isArray(stocksList) || stocksList.length === 0) {
    return {
      summary: null,
      stocks: [],
    };
  }

  // Per user specification: Each stock MUST be sent to Grok API individually!
  console.log(`[AI Stock Analyzer] Launching ${stocksList.length} independent Grok LLM requests...`);

  const stockAnalyses = await Promise.all(
    stocksList.map(async (stock, idx) => {
      console.log(`[AI Stock Analyzer] [${idx + 1}/${stocksList.length}] Processing ${stock.symbolOrCode}...`);
      return await analyzeSingleStock(stock);
    })
  );

  // Synthesize Portfolio Summary
  let averageDownCount = 0;
  let holdCount = 0;
  let exitCount = 0;
  let totalInvested = 0;
  let totalCurrent = 0;

  stockAnalyses.forEach((s) => {
    if (s.verdict === 'AVERAGE_DOWN') averageDownCount++;
    else if (s.verdict === 'EXIT_OR_TRIM') exitCount++;
    else holdCount++;

    totalInvested += Number(s.investedValue || (s.quantity * s.averageBuyPrice) || 0);
    totalCurrent += Number(s.currentValue || (s.quantity * s.latestPrice) || 0);
  });

  const totalPnl = totalCurrent - totalInvested;
  const totalPnlPct = totalInvested > 0 ? (totalPnl / totalInvested) * 100 : 0;

  // Determine top opportunity and top risk
  const topAveragePick = stockAnalyses.find((s) => s.verdict === 'AVERAGE_DOWN');
  const topExitCandidate = stockAnalyses.find((s) => s.verdict === 'EXIT_OR_TRIM');

  let overallActionPlan = '';
  if (averageDownCount > 0 && exitCount > 0) {
    overallActionPlan = `Balanced Reallocation: Book partial profits in ${topExitCandidate?.instrumentName || 'high-flying stocks'} to free up liquidity and average down on ${topAveragePick?.instrumentName || 'undervalued leaders'} during market dips.`;
  } else if (averageDownCount > 0) {
    overallActionPlan = `Accumulation Phase: ${averageDownCount} of your stocks are trading in attractive accumulation zones. Stagger fresh capital in 2-3 tranches.`;
  } else if (exitCount > 0) {
    overallActionPlan = `Capital Protection: Consider trimming ${exitCount} holdings that have reached full valuations or are testing stop-losses to protect realized gains.`;
  } else {
    overallActionPlan = `Compounding Phase: All analyzed stocks show robust fundamentals and favorable trends. Maintain discipline and hold for long-term compound growth.`;
  }

  const summary = {
    portfolioHealthScore: Math.min(95, Math.max(50, Math.round(75 + totalPnlPct * 0.4))),
    totalStocksAnalyzed: stockAnalyses.length,
    averageDownCount,
    holdCount,
    exitCount,
    totalInvested: Number(totalInvested.toFixed(2)),
    totalCurrent: Number(totalCurrent.toFixed(2)),
    totalPnl: Number(totalPnl.toFixed(2)),
    totalPnlPercent: Number(totalPnlPct.toFixed(2)),
    overallActionPlan,
    topRecommendation: topAveragePick
      ? `Top Dip Buy: ${topAveragePick.instrumentName} (Buy zone: ${topAveragePick.buyZone})`
      : `Core Compounder: ${stockAnalyses[0]?.instrumentName}`,
    capitalRebalanceAdvice:
      exitCount > 0
        ? `Trim ${exitCount} overextended positions to harvest gains; redeploy into quality dip opportunities.`
        : `Hold 15-20% cash buffer to buy further pullbacks in high-conviction holdings.`,
  };

  return {
    success: true,
    analyzedAt: new Date(),
    summary,
    stocks: stockAnalyses,
  };
}

/**
 * Fallback AI Chat Generator when Groq LLM API is unavailable
 * Evaluates ALL selected stocks simultaneously with target prices, stop-losses, and portfolio rebalancing
 */
function generateChatFallback(question, selectedStocks = []) {
  if (!Array.isArray(selectedStocks) || selectedStocks.length === 0) {
    return {
      text: `### 💡 Portfolio Strategy Overview
You currently do not have any specific stock selected for this query. 
To get a precise recommendation on whether to **Average Down**, **Hold Long Term**, or **Exit/Trim**, select one or more stocks from your list above.

**Key Disciplines:**
1. **Average Down Only Quality**: Stagger accumulation in 2-3 tranches when fundamentally sound stocks drop 8-15% from your buy average.
2. **Hold Compounding Leaders**: Give high-ROCE compounders at least 2-3 years to compound earnings.
3. **Trim at Overextension**: When a holding crosses 30-40% quick gains or tests crucial technical resistance, booking 30-50% profit to protect capital is prudent.`,
      stockAnalyses: [],
    };
  }

  const stockAnalyses = selectedStocks.map((s) => generateSmartStockFallback(s));

  const sections = stockAnalyses.map((item, idx) => {
    const buy = item.averageBuyPrice;
    const cur = item.latestPrice;
    const pnlPct = Number(item.pnlPercent || 0).toFixed(1);
    const sign = Number(pnlPct) >= 0 ? '+' : '';

    return `### [Stock ${idx + 1}] ${item.instrumentName} (${item.symbolOrCode}) — ${item.verdictBadge}
• **Your Cost Basis:** ₹${buy} | **Current Price:** ₹${cur} (${sign}${pnlPct}%)
• **Target Price:** ₹${item.targetPrice} | **Stop Loss:** ₹${item.stopLoss}
• **Accumulation Zone:** ${item.buyZone}
• **Conviction:** ${item.conviction}% | **Risk:** ${item.riskRating}
• **Action Plan:** ${item.actionPlan}
• **Technical Setup:** ${item.technicalTrend}`;
  });

  let portfolioSynthesis = '';
  if (stockAnalyses.length > 1) {
    const averagePicks = stockAnalyses.filter((s) => s.verdict === 'AVERAGE_DOWN');
    const exitPicks = stockAnalyses.filter((s) => s.verdict === 'EXIT_OR_TRIM');
    const holdPicks = stockAnalyses.filter((s) => s.verdict === 'HOLD_LONG_TERM');

    portfolioSynthesis = `\n\n### ⚖️ Multi-Stock Rebalancing Matrix (${stockAnalyses.length} Holdings Analyzed)
• **Priority Accumulation (Dip Buys):** ${averagePicks.length > 0 ? averagePicks.map(p => `**${p.instrumentName}** (Zone: ${p.buyZone})`).join(', ') : 'None in deep discount zone.'}
• **Capital Preservation / Trim:** ${exitPicks.length > 0 ? exitPicks.map(p => `**${p.instrumentName}** (Target: ₹${p.targetPrice})`).join(', ') : 'No urgent profit booking required.'}
• **Core Long-Term Compounders:** ${holdPicks.length > 0 ? holdPicks.map(p => `**${p.instrumentName}**`).join(', ') : 'N/A'}

💡 *Tip: Use the stock switcher dropdown above to toggle between analyzed holdings.*`;
  }

  const fullText = sections.join('\n\n') + portfolioSynthesis;
  return {
    text: fullText,
    stockAnalyses,
  };
}

/**
 * 3. Interactive AI Stock Chat: Answer user questions about their selected stocks
 */
async function chatWithStockAi({ question, selectedStocks = [], history = [] }) {
  if (!question || !question.trim()) {
    throw new Error('Question is required');
  }

  // Pre-calculate smart evaluations for all selected stocks
  const stockAnalyses = Array.isArray(selectedStocks)
    ? selectedStocks.map((s) => generateSmartStockFallback(s))
    : [];

  // Format stock context for LLM prompt
  let stockContext = 'No specific stocks selected.';
  if (Array.isArray(selectedStocks) && selectedStocks.length > 0) {
    stockContext = selectedStocks
      .map((s, idx) => {
        const buy = Number(s.averageBuyPrice || s.buyPrice || 0);
        const cur = Number(s.latestPrice || buy);
        const pnl = Number(s.pnl || (cur - buy) * (s.quantity || 1));
        const pnlPct = buy > 0 ? (((cur - buy) / buy) * 100).toFixed(2) : '0';
        return `[Stock ${idx + 1}]
- Name: ${s.instrumentName || s.symbolOrCode}
- Symbol: ${s.symbolOrCode}
- User Buy Price: ₹${buy}
- Current Market Price: ₹${cur}
- Quantity Held: ${s.quantity || 0}
- Current P&L: ₹${pnl.toFixed(2)} (${pnlPct}%)
- Day Change: ${s.dayChange || 0} (${s.dayChangePercent || 0}%)`;
      })
      .join('\n\n');
  }

  const systemPrompt = `You are an elite Chief Investment Officer and SEBI-registered portfolio manager specializing in Indian equity markets (NSE/BSE).
You are discussing the user's specific stock portfolio holdings with them.
The user's currently selected stocks with exact entry and current prices:
${stockContext}

CRITICAL FORMATTING INSTRUCTIONS:
- NEVER OUTPUT RAW LATEX SYNTAX. Do NOT use \\frac, \\times, \\text{}, $$, \\approx, \\pm, \\cdot, or LaTeX delimiters.
- Write all math, formulas, and calculations in clean plain text with standard Unicode characters (use "×" for multiplication, "/" for division, "≈" for approximately, "±" for plus-minus).
- Always use the Indian Rupee symbol "₹" (e.g. ₹1,250) for all monetary values.
- Structure responses clearly with Markdown headings (###), clean bullet points (•), and bold highlights (**bold**) for key metrics like Target Price, Stop Loss, and Buy Zones.
- If multiple stocks are selected, evaluate each stock clearly under its own sub-heading before providing a comparative synthesis.

GUIDELINES FOR YOUR ANALYSIS:
1. Always ground your analysis in the user's real numbers (their buy average price, current market price, and profit/loss).
2. Explicitly advise whether to AVERAGE DOWN (if fundamentally solid and trading at a dip), HOLD (for long term compounding), or EXIT/TRIM (to book profits or cut losses).
3. Provide realistic target price levels, key support zones for averaging, and sensible stop-loss levels.
4. Keep the tone professional, objective, actionable, and encouraging.
5. If the user asks in Hindi or Hinglish, answer in fluent, respectful Hinglish or Hindi as requested. Otherwise answer in clear English.`;

  const messages = [
    { role: 'system', content: systemPrompt },
  ];

  if (Array.isArray(history)) {
    history.slice(-6).forEach((h) => {
      if (h.sender === 'user' || h.role === 'user') {
        messages.push({ role: 'user', content: h.text || h.content || '' });
      } else if (h.sender === 'ai' || h.role === 'assistant') {
        messages.push({ role: 'assistant', content: h.text || h.content || '' });
      }
    });
  }

  messages.push({ role: 'user', content: question.trim() });

  try {
    const apiKey = await getApiKey();
    if (!apiKey) {
      throw new Error('No Grok/LLM API key available');
    }

    const payload = {
      model: GROQ_MODEL,
      messages,
      temperature: 0.35,
    };

    let res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey.trim()}`,
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok && payload.model !== 'llama-3.3-70b-versatile') {
      payload.model = 'llama-3.3-70b-versatile';
      res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey.trim()}`,
        },
        body: JSON.stringify(payload),
      });
    }

    if (!res.ok) {
      throw new Error(`Groq LLM returned status ${res.status}`);
    }

    const data = await res.json();
    const answer = data?.choices?.[0]?.message?.content || '';
    return {
      success: true,
      answer,
      stockAnalyses,
    };
  } catch (err) {
    console.warn('[Stock Chat Fallback Triggered]', err.message);
    const fallbackResult = generateChatFallback(question, selectedStocks);
    return {
      success: true,
      answer: fallbackResult.text,
      stockAnalyses: fallbackResult.stockAnalyses,
      isFallback: true,
    };
  }
}

module.exports = {
  analyzeSingleStock,
  analyzeMultipleStocks,
  chatWithStockAi,
  generateChatFallback,
};

