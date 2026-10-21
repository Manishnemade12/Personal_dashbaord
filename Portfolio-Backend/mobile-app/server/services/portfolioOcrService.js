const InvestmentHolding = require('../models/InvestmentHolding');
const ProjectApi = require('../models/portfolio/ProjectApi');

const GROQ_MODEL = process.env.GROK_MODEL || 'openai/gpt-oss-120b';

/**
 * Common NSE / BSE Stock Dictionary for high-precision symbol resolution
 */
const COMMON_STOCKS_DICT = [
  { name: 'Reliance Industries', symbol: 'RELIANCE', alias: ['RELIANCE', 'RIL'] },
  { name: 'Tata Consultancy Services', symbol: 'TCS', alias: ['TCS'] },
  { name: 'HDFC Bank', symbol: 'HDFCBANK', alias: ['HDFC BANK', 'HDFCBANK'] },
  { name: 'Infosys', symbol: 'INFY', alias: ['INFOSYS', 'INFY'] },
  { name: 'ICICI Bank', symbol: 'ICICIBANK', alias: ['ICICI BANK', 'ICICIBANK'] },
  { name: 'State Bank of India', symbol: 'SBIN', alias: ['SBI', 'SBIN', 'STATE BANK'] },
  { name: 'Bharti Airtel', symbol: 'BHARTIARTL', alias: ['AIRTEL', 'BHARTIARTL'] },
  { name: 'ITC Limited', symbol: 'ITC', alias: ['ITC'] },
  { name: 'Tata Motors', symbol: 'TATAMOTORS', alias: ['TATA MOTORS', 'TATAMOTORS'] },
  { name: 'Larsen & Toubro', symbol: 'LT', alias: ['L&T', 'LT', 'LARSEN'] },
  { name: 'Bajaj Finance', symbol: 'BAJFINANCE', alias: ['BAJAJ FINANCE', 'BAJFINANCE'] },
  { name: 'Hindustan Unilever', symbol: 'HINDUNILVR', alias: ['HUL', 'HINDUSTAN UNILEVER'] },
  { name: 'Kotak Mahindra Bank', symbol: 'KOTAKBANK', alias: ['KOTAK', 'KOTAKBANK'] },
  { name: 'Axis Bank', symbol: 'AXISBANK', alias: ['AXIS BANK', 'AXISBANK'] },
  { name: 'Wipro', symbol: 'WIPRO', alias: ['WIPRO'] },
  { name: 'Adani Enterprises', symbol: 'ADANIENT', alias: ['ADANI ENT', 'ADANIENT'] },
  { name: 'Adani Ports', symbol: 'ADANIPORTS', alias: ['ADANI PORTS', 'ADANIPORTS'] },
  { name: 'Adani Power', symbol: 'ADANIPOWER', alias: ['ADANI POWER', 'ADANIPOWER'] },
  { name: 'Coal India', symbol: 'COALINDIA', alias: ['COAL INDIA', 'COALINDIA'] },
  { name: 'Power Grid Corporation', symbol: 'POWERGRID', alias: ['POWER GRID', 'POWERGRID'] },
  { name: 'NTPC Limited', symbol: 'NTPC', alias: ['NTPC'] },
  { name: 'ONGC', symbol: 'ONGC', alias: ['ONGC', 'OIL AND NATURAL'] },
  { name: 'Bharat Petroleum', symbol: 'BPCL', alias: ['BPCL', 'BHARAT PETROLEUM'] },
  { name: 'Indian Oil Corporation', symbol: 'IOC', alias: ['IOC', 'INDIAN OIL'] },
  { name: 'Tata Steel', symbol: 'TATASTEEL', alias: ['TATA STEEL', 'TATASTEEL'] },
  { name: 'Jindal Steel & Power', symbol: 'JINDALSTEL', alias: ['JINDAL STEEL', 'JINDALSTEL'] },
  { name: 'Hindalco Industries', symbol: 'HINDALCO', alias: ['HINDALCO'] },
  { name: 'National Aluminium', symbol: 'NATIONALUM', alias: ['NATIONALUM', 'NALCO'] },
  { name: 'Sun Pharma', symbol: 'SUNPHARMA', alias: ['SUN PHARMA', 'SUNPHARMA'] },
  { name: 'Cipla', symbol: 'CIPLA', alias: ['CIPLA'] },
  { name: 'Dr Reddys Laboratories', symbol: 'DRREDDY', alias: ['DR REDDY', 'DRREDDY'] },
  { name: 'Zomato', symbol: 'ZOMATO', alias: ['ZOMATO'] },
  { name: 'Jio Financial Services', symbol: 'JIOFIN', alias: ['JIOFIN', 'JIO FINANCIAL'] },
  { name: 'Rail Vikas Nigam', symbol: 'RVNL', alias: ['RVNL', 'RAIL VIKAS'] },
  { name: 'IRFC', symbol: 'IRFC', alias: ['IRFC', 'INDIAN RAILWAY FINANCE'] },
  { name: 'Suzlon Energy', symbol: 'SUZLON', alias: ['SUZLON'] },
  { name: 'NBCC India', symbol: 'NBCC', alias: ['NBCC'] },
  { name: 'HUDCO', symbol: 'HUDCO', alias: ['HUDCO'] },
  { name: 'IREDA', symbol: 'IREDA', alias: ['IREDA'] },
  { name: 'IDFC First Bank', symbol: 'IDFCFIRSTB', alias: ['IDFC FIRST', 'IDFCFIRSTB'] },
  { name: 'Tata Power', symbol: 'TATAPOWER', alias: ['TATA POWER', 'TATAPOWER'] },
  { name: 'Vedanta', symbol: 'VEDL', alias: ['VEDL', 'VEDANTA'] },
];

/**
 * Retrieve Groq/Grok API Key
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
 * Call OCR.space to extract text from a base64 image or URL
 */
async function performOcr(imageSource) {
  try {
    const apiUrl = 'https://api.ocr.space/parse/image';
    const formData = new URLSearchParams();
    const apiKey = process.env.OCR_SPACE_API_KEY || 'helloworld';
    formData.append('apikey', apiKey);
    formData.append('language', 'eng');
    formData.append('isOverlayRequired', 'false');
    formData.append('detectOrientation', 'true');
    formData.append('scale', 'true');
    formData.append('isTable', 'true');

    if (imageSource.startsWith('http://') || imageSource.startsWith('https://')) {
      formData.append('url', imageSource);
    } else {
      let base64Clean = imageSource;
      if (!base64Clean.startsWith('data:')) {
        base64Clean = `data:image/jpeg;base64,${base64Clean}`;
      }
      formData.append('base64Image', base64Clean);
    }

    const res = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString(),
    });

    const data = await res.json();
    if (data?.IsErroredOnProcessing) {
      console.warn('[OCR.space warning]', data?.ErrorMessage || data?.ErrorDetails);
    }

    let parsedText = '';
    if (Array.isArray(data?.ParsedResults) && data.ParsedResults.length > 0) {
      parsedText = data.ParsedResults.map((p) => p.ParsedText || '')
        .filter(Boolean)
        .join('\n\n')
        .trim();
    }
    return parsedText;
  } catch (err) {
    console.warn('[performOcr error]', err.message);
    return '';
  }
}

/**
 * Parse OCR text using Groq LLM
 */
async function parseHoldingsWithLlm(ocrText) {
  const apiKey = await getApiKey();
  if (!apiKey) {
    throw new Error('No Groq LLM API key available');
  }

  const prompt = `You are a financial portfolio parser.
Analyze the following raw OCR text extracted from an Indian brokerage screenshot (such as Zerodha Kite, Groww, Angel One, Upstox, IndMoney, Dhan, etc.).

RAW OCR TEXT:
"""
${ocrText.slice(0, 4500)}
"""

TASK:
Extract all stock or fund holdings with their:
- symbolOrCode: Stock ticker symbol (e.g. TATAMOTORS, RELIANCE, INFY, HDFCBANK, SBIN, ITC). Do NOT append .NS or .BO unless required.
- instrumentName: Clean company or asset name.
- quantity: Positive number of shares or units.
- buyPrice: User's average purchase price / avg cost in INR.
- latestPrice: Current market price / LTP in INR (or buyPrice if not visible).
- assetClass: "Equity" or "Mutual Fund" or "ETF" or "Gold"
- subCategory: "Stocks" or sector name

Return ONLY a pure JSON array of objects with schema:
[
  {
    "symbolOrCode": "TATAMOTORS",
    "instrumentName": "Tata Motors Ltd",
    "quantity": 25,
    "buyPrice": 948.5,
    "latestPrice": 978.2,
    "assetClass": "Equity",
    "subCategory": "Stocks"
  }
]
Do not wrap in markdown fences. Output raw JSON only.`;

  const payload = {
    model: GROQ_MODEL,
    messages: [
      { role: 'system', content: 'You extract structured stock holdings from brokerage OCR text into JSON.' },
      { role: 'user', content: prompt },
    ],
    temperature: 0.1,
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
    throw new Error(`LLM returned status ${res.status}`);
  }

  const data = await res.json();
  const rawContent = data?.choices?.[0]?.message?.content || '';
  let cleanJson = rawContent.trim();
  if (cleanJson.startsWith('```json')) {
    cleanJson = cleanJson.replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim();
  } else if (cleanJson.startsWith('```')) {
    cleanJson = cleanJson.replace(/^```\s*/, '').replace(/```\s*$/, '').trim();
  }

  const parsed = JSON.parse(cleanJson);
  return Array.isArray(parsed) ? parsed : [parsed];
}

/**
 * Regex-based Brokerage Screenshot Parser (Deterministic fallback when LLM is offline)
 */
function parseHoldingsWithRegex(ocrText) {
  const lines = ocrText.split('\n').map((l) => l.trim()).filter(Boolean);
  const detected = [];
  const seenSymbols = new Set();

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Check if line matches any common stock name/alias
    for (const item of COMMON_STOCKS_DICT) {
      const isMatch = item.alias.some((alias) =>
        new RegExp(`\\b${alias.replace('&', '\\&')}\\b`, 'i').test(line)
      );

      if (isMatch && !seenSymbols.has(item.symbol)) {
        // Look within this line and the next 3 lines for numbers (Quantity and Prices)
        const combinedContext = lines.slice(i, i + 4).join(' ');
        // Find numbers with optional decimals and commas
        const numbers = (combinedContext.match(/₹?\s*[0-9]{1,3}(?:,[0-9]{3})*(?:\.[0-9]+)?|[0-9]+(?:\.[0-9]+)?/g) || [])
          .map((n) => Number(n.replace(/[₹,\s]/g, '')))
          .filter((n) => !isNaN(n) && n > 0);

        let quantity = 10;
        let buyPrice = 500;
        let latestPrice = 500;

        if (numbers.length >= 2) {
          // Typically in broker apps: [Qty, Avg Price, LTP] or [Avg, LTP, Qty]
          const intLike = numbers.find((n) => Number.isInteger(n) && n > 0 && n < 50000);
          const priceLikes = numbers.filter((n) => n > 10 && n !== intLike);

          if (intLike) quantity = intLike;
          if (priceLikes.length >= 2) {
            buyPrice = priceLikes[0];
            latestPrice = priceLikes[1];
          } else if (priceLikes.length === 1) {
            buyPrice = priceLikes[0];
            latestPrice = priceLikes[0];
          }
        }

        seenSymbols.add(item.symbol);
        detected.push({
          symbolOrCode: item.symbol,
          instrumentName: item.name,
          quantity,
          buyPrice,
          latestPrice,
          assetClass: 'Equity',
          subCategory: 'Stocks',
        });
        break;
      }
    }
  }

  return detected;
}

/**
 * Process Multiple Portfolio Screenshots:
 * - Runs OCR and extraction for each image
 * - Deduplicates across screenshots
 * - Cross-checks with database to detect MERGE (existing stock with weighted average) vs NEW
 */
async function processMultipleImages(imagesArray = [], userId = 'admin', forceDemo = false) {
  let allExtracted = [];

  if (forceDemo || !imagesArray || imagesArray.length === 0) {
    // Standard realistic demo holdings for user testing
    allExtracted = [
      {
        symbolOrCode: 'TATAMOTORS',
        instrumentName: 'Tata Motors Limited',
        quantity: 25,
        buyPrice: 948.5,
        latestPrice: 978.2,
        assetClass: 'Equity',
        subCategory: 'Automobile',
      },
      {
        symbolOrCode: 'RELIANCE',
        instrumentName: 'Reliance Industries Ltd',
        quantity: 10,
        buyPrice: 2840.0,
        latestPrice: 2920.4,
        assetClass: 'Equity',
        subCategory: 'Energy & Oil',
      },
      {
        symbolOrCode: 'HDFCBANK',
        instrumentName: 'HDFC Bank Limited',
        quantity: 15,
        buyPrice: 1590.25,
        latestPrice: 1645.0,
        assetClass: 'Equity',
        subCategory: 'Banking',
      },
    ];
  } else {
    for (let idx = 0; idx < imagesArray.length; idx++) {
      const img = imagesArray[idx];
      console.log(`[Portfolio OCR] Processing screenshot ${idx + 1}/${imagesArray.length}...`);

      const ocrText = await performOcr(img);
      console.log(`[Portfolio OCR] OCR text length for image ${idx + 1}: ${ocrText.length} chars`);

      let extractedForImg = [];
      if (ocrText && ocrText.trim().length > 10) {
        try {
          extractedForImg = await parseHoldingsWithLlm(ocrText);
          console.log(`[Portfolio OCR] LLM extracted ${extractedForImg.length} holdings from image ${idx + 1}`);
        } catch (llmErr) {
          console.warn(`[Portfolio OCR LLM Fallback] ${llmErr.message}. Trying regex parser...`);
          extractedForImg = parseHoldingsWithRegex(ocrText);
          console.log(`[Portfolio OCR Regex] Extracted ${extractedForImg.length} holdings from image ${idx + 1}`);
        }
      }

      // Merge into allExtracted
      if (Array.isArray(extractedForImg) && extractedForImg.length > 0) {
        allExtracted.push(...extractedForImg);
      }
    }
  }

  // Deduplicate extracted holdings across multiple screenshots (same symbol)
  const dedupedMap = new Map();
  allExtracted.forEach((h) => {
    const sym = (h.symbolOrCode || '').toUpperCase().trim();
    if (!sym) return;

    if (dedupedMap.has(sym)) {
      const existing = dedupedMap.get(sym);
      const totalQty = (existing.quantity || 0) + (h.quantity || 0);
      const totalCost =
        (existing.quantity || 0) * (existing.buyPrice || 0) +
        (h.quantity || 0) * (h.buyPrice || 0);
      const weightedBuy = totalQty > 0 ? totalCost / totalQty : h.buyPrice;

      dedupedMap.set(sym, {
        ...existing,
        quantity: totalQty,
        buyPrice: Number(weightedBuy.toFixed(2)),
        latestPrice: h.latestPrice || existing.latestPrice,
      });
    } else {
      dedupedMap.set(sym, {
        ...h,
        symbolOrCode: sym,
        quantity: Number(h.quantity) || 1,
        buyPrice: Number(h.buyPrice) || 100,
        latestPrice: Number(h.latestPrice) || Number(h.buyPrice) || 100,
      });
    }
  });

  const finalHoldingsList = Array.from(dedupedMap.values());

  // Cross-reference with database holdings to show MERGE vs NEW status
  const userHoldings = await InvestmentHolding.find({ userId });
  const userHoldingsMap = new Map();
  userHoldings.forEach((uh) => {
    const symClean = uh.symbolOrCode.replace(/\.(NS|BO)$/i, '').toUpperCase().trim();
    userHoldingsMap.set(symClean, uh);
    userHoldingsMap.set(uh.symbolOrCode.toUpperCase().trim(), uh);
  });

  const enrichedForVerification = finalHoldingsList.map((item, idx) => {
    const cleanSym = item.symbolOrCode.replace(/\.(NS|BO)$/i, '').toUpperCase().trim();
    const existing = userHoldingsMap.get(cleanSym) || userHoldingsMap.get(item.symbolOrCode);

    if (existing) {
      const oldQty = Number(existing.quantity || 0);
      const oldAvg = Number(existing.averageBuyPrice || 0);
      const addQty = Number(item.quantity || 0);
      const addBuy = Number(item.buyPrice || 0);

      const newQty = oldQty + addQty;
      const newAvg = newQty > 0 ? (oldQty * oldAvg + addQty * addBuy) / newQty : addBuy;

      return {
        id: `extracted-${Date.now()}-${idx}`,
        symbolOrCode: item.symbolOrCode,
        instrumentName: existing.instrumentName || item.instrumentName,
        assetClass: existing.assetClass || item.assetClass || 'Equity',
        subCategory: existing.subCategory || item.subCategory || 'Stocks',
        quantity: addQty,
        buyPrice: addBuy,
        latestPrice: item.latestPrice || existing.latestPrice || addBuy,
        isSelected: true,
        isExisting: true,
        existingHoldingId: existing._id,
        existingQuantity: oldQty,
        existingAverageBuyPrice: oldAvg,
        calculatedNewQuantity: newQty,
        calculatedNewAvgPrice: Number(newAvg.toFixed(2)),
        badgeText: '🟢 Merge With Existing',
        badgeNote: `Currently hold ${oldQty} @ ₹${oldAvg}. Adding ${addQty} @ ₹${addBuy} → New Avg ₹${newAvg.toFixed(2)}`,
      };
    } else {
      return {
        id: `extracted-${Date.now()}-${idx}`,
        symbolOrCode: item.symbolOrCode,
        instrumentName: item.instrumentName || item.symbolOrCode,
        assetClass: item.assetClass || 'Equity',
        subCategory: item.subCategory || 'Stocks',
        quantity: Number(item.quantity || 1),
        buyPrice: Number(item.buyPrice || 100),
        latestPrice: Number(item.latestPrice || item.buyPrice || 100),
        isSelected: true,
        isExisting: false,
        existingHoldingId: null,
        existingQuantity: 0,
        existingAverageBuyPrice: 0,
        calculatedNewQuantity: Number(item.quantity || 1),
        calculatedNewAvgPrice: Number(item.buyPrice || 100),
        badgeText: '🔵 New Asset',
        badgeNote: `Will create a new portfolio holding with ${item.quantity} units @ ₹${item.buyPrice}`,
      };
    }
  });

  return {
    success: true,
    count: enrichedForVerification.length,
    holdings: enrichedForVerification,
  };
}

module.exports = {
  performOcr,
  parseHoldingsWithLlm,
  parseHoldingsWithRegex,
  processMultipleImages,
};
