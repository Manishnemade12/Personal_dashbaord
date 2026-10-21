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
  { name: 'Central Depository Services', symbol: 'CDSL', alias: ['CDSL'] },
  { name: 'BSE Limited', symbol: 'BSE', alias: ['BSE', 'BSE LTD'] },
  { name: 'Hindustan Aeronautics', symbol: 'HAL', alias: ['HAL', 'HINDUSTAN AERONAUTICS'] },
  { name: 'Bharat Electronics', symbol: 'BEL', alias: ['BEL', 'BHARAT ELECTRONICS'] },
  { name: 'Trent Limited', symbol: 'TRENT', alias: ['TRENT'] },
  { name: 'Mazagon Dock Shipbuilders', symbol: 'MAZDOCK', alias: ['MAZDOCK', 'MAZAGON DOCK', 'MAZAGON'] },
  { name: 'Cochin Shipyard', symbol: 'COCHINSHIP', alias: ['COCHIN SHIP', 'COCHINSHIP'] },
  { name: 'Titan Company', symbol: 'TITAN', alias: ['TITAN'] },
  { name: 'Maruti Suzuki', symbol: 'MARUTI', alias: ['MARUTI', 'MARUTI SUZUKI'] },
  { name: 'Mahindra & Mahindra', symbol: 'M&M', alias: ['M&M', 'MAHINDRA'] },
  { name: 'Hero MotoCorp', symbol: 'HEROMOTOCO', alias: ['HERO MOTOCORP', 'HEROMOTOCO'] },
  { name: 'Bajaj Auto', symbol: 'BAJAJ-AUTO', alias: ['BAJAJ AUTO', 'BAJAJ-AUTO'] },
  { name: 'Eicher Motors', symbol: 'EICHERMOT', alias: ['EICHER', 'EICHERMOT'] },
  { name: 'Asian Paints', symbol: 'ASIANPAINT', alias: ['ASIAN PAINTS', 'ASIANPAINT'] },
  { name: 'Pidilite Industries', symbol: 'PIDILITIND', alias: ['PIDILITE', 'PIDILITIND'] },
  { name: 'Polycab India', symbol: 'POLYCAB', alias: ['POLYCAB'] },
  { name: 'Havells India', symbol: 'HAVELLS', alias: ['HAVELLS'] },
  { name: 'Dixon Technologies', symbol: 'DIXON', alias: ['DIXON'] },
  { name: 'Ambuja Cements', symbol: 'AMBUJACEM', alias: ['AMBUJA', 'AMBUJACEM'] },
  { name: 'UltraTech Cement', symbol: 'ULTRACEMCO', alias: ['ULTRATECH', 'ULTRACEMCO'] },
  { name: 'Persistent Systems', symbol: 'PERSISTENT', alias: ['PERSISTENT'] },
  { name: 'Coforge', symbol: 'COFORGE', alias: ['COFORGE'] },
  { name: 'KPIT Technologies', symbol: 'KPITTECH', alias: ['KPIT', 'KPITTECH'] },
  { name: 'Tata Elxsi', symbol: 'TATAELXSI', alias: ['TATA ELXSI', 'TATAELXSI'] },
  { name: 'LTIMindtree', symbol: 'LTIM', alias: ['LTIM', 'LTIMINDTREE'] },
  { name: 'Tech Mahindra', symbol: 'TECHM', alias: ['TECH MAHINDRA', 'TECHM'] },
  { name: 'HCL Technologies', symbol: 'HCLTECH', alias: ['HCL', 'HCLTECH'] },
  { name: 'IRCTC', symbol: 'IRCTC', alias: ['IRCTC'] },
  { name: 'BHEL', symbol: 'BHEL', alias: ['BHEL'] },
  { name: 'Steel Authority of India', symbol: 'SAIL', alias: ['SAIL'] },
  { name: 'GAIL India', symbol: 'GAIL', alias: ['GAIL'] },
  { name: 'NHPC Limited', symbol: 'NHPC', alias: ['NHPC'] },
  { name: 'SJVN Limited', symbol: 'SJVN', alias: ['SJVN'] },
  { name: 'Power Finance Corp', symbol: 'PFC', alias: ['PFC'] },
  { name: 'REC Limited', symbol: 'RECLTD', alias: ['REC', 'RECLTD'] },
  { name: 'Muthoot Finance', symbol: 'MUTHOOTFIN', alias: ['MUTHOOT', 'MUTHOOTFIN'] },
  { name: 'Canara Bank', symbol: 'CANBK', alias: ['CANARA BANK', 'CANBK'] },
  { name: 'Punjab National Bank', symbol: 'PNB', alias: ['PNB', 'PUNJAB NATIONAL'] },
  { name: 'Bank of Baroda', symbol: 'BANKBARODA', alias: ['BANK OF BARODA', 'BANKBARODA'] },
  { name: 'Union Bank of India', symbol: 'UNIONBANK', alias: ['UNION BANK', 'UNIONBANK'] },
  { name: 'Yes Bank', symbol: 'YESBANK', alias: ['YES BANK', 'YESBANK'] },
  { name: 'Federal Bank', symbol: 'FEDERALBNK', alias: ['FEDERAL BANK', 'FEDERALBNK'] },
  { name: 'IndusInd Bank', symbol: 'INDUSINDBK', alias: ['INDUSIND', 'INDUSINDBK'] },
  { name: 'Tata Consumer Products', symbol: 'TATACONSUM', alias: ['TATA CONSUMER', 'TATACONSUM'] },
  { name: 'Varun Beverages', symbol: 'VBL', alias: ['VBL', 'VARUN BEVERAGES'] },
  { name: 'One97 Communications (Paytm)', symbol: 'PAYTM', alias: ['PAYTM', 'ONE97'] },
  { name: 'FSN E-Commerce (Nykaa)', symbol: 'NYKAA', alias: ['NYKAA'] },
  { name: 'PB Fintech (PolicyBazaar)', symbol: 'POLICYBZR', alias: ['POLICYBAZAAR', 'POLICYBZR', 'PB FINTECH'] },
  { name: 'Ola Electric', symbol: 'OLAELEC', alias: ['OLA ELECTRIC', 'OLAELEC'] },
  { name: 'Swiggy', symbol: 'SWIGGY', alias: ['SWIGGY'] },
  { name: 'Kalyan Jewellers', symbol: 'KALYANKJIL', alias: ['KALYAN', 'KALYANKJIL'] },
  { name: 'Premier Energies', symbol: 'PREMIERENE', alias: ['PREMIER ENERGIES', 'PREMIERENE'] },
  { name: 'Waaree Energies', symbol: 'WAAREEENER', alias: ['WAAREE', 'WAAREEENER'] },
  { name: 'Nippon India ETF Nifty BeES', symbol: 'NIFTYBEES', alias: ['NIFTYBEES', 'NIFTY BEES'] },
  { name: 'Nippon India ETF Gold BeES', symbol: 'GOLDBEES', alias: ['GOLDBEES', 'GOLD BEES'] },
  { name: 'Nippon India ETF Bank BeES', symbol: 'BANKBEES', alias: ['BANKBEES', 'BANK BEES'] },
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
 * Parse OCR text using Groq LLM with strict Indian Brokerage parsing rules
 */
async function parseHoldingsWithLlm(ocrText) {
  const apiKey = await getApiKey();
  if (!apiKey) {
    throw new Error('No Groq LLM API key available');
  }

  const prompt = `You are an elite Chief Investment Officer and precision financial OCR parser for Indian stock brokers (Zerodha Kite, Groww, Angel One, Upstox, IndMoney, Dhan, etc.).

Analyze this raw OCR text extracted from brokerage portfolio screenshot(s):
"""
${ocrText.slice(0, 5000)}
"""

CRITICAL EXTRACTION RULES (INDIAN STOCK BROKERS):
1. "buyPrice" vs "latestPrice":
   - "buyPrice" is strictly the user's AVERAGE PURCHASE COST (labeled as "Avg.", "Avg. cost", "Avg price", "Purchase price", "Cost price", "Avg:", or shown inline like "Qty. 10 • Avg. 2800" -> buyPrice=2800).
   - "latestPrice" is the CURRENT MARKET PRICE (LTP) (labeled as "LTP", "Last Price", "CMP", "Market price", or shown like "LTP 2650 (-5.4%)" -> latestPrice=2650).
   - STRICT CONSTRAINT: NEVER set buyPrice equal to LTP if an average buy price or avg cost is visible! If both are visible, buyPrice MUST be the average purchase cost, and latestPrice MUST be the LTP.
2. "quantity":
   - "quantity" is strictly the positive integer number of shares or units held (labeled as "Qty", "Qty.", "Shares", "Units", or "50 shares").
   - NEVER use P&L amount, day change, total investment amount, or percentage numbers as quantity!
   - If total invested amount and average buy price are shown, quantity = Math.round(Invested / buyPrice).
3. "symbolOrCode":
   - Clean ticker (e.g. RELIANCE, TCS, INFY, HDFCBANK, TATAMOTORS, SBIN). Strip any .NS or .BO suffix.
4. Output format:
   Return ONLY a valid JSON array of objects with schema:
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
      { role: 'system', content: 'You extract structured stock holdings from brokerage OCR text into JSON without confusing LTP with Buy Price.' },
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
 * Dual-Pass Deterministic Indian Brokerage Parser:
 * Pass 1: High-precision dictionary matching for top Indian stocks & aliases
 * Pass 2: Universal Generic Broker Layout & Financial Signal Extractor (catches ANY ticker or company row with Qty + Avg/LTP/Invested)
 */
function parseHoldingsWithRegex(ocrText) {
  const lines = ocrText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  const METRIC_PREFIXES = /^(QTY|AVG|AVERAGE|INVESTED|INVESTMENTS?|LTP|CMP|CURRENT|CUR|PROFIT|LOSS|P&L|PNL|TOTAL|SHARES|UNITS|VALUE|RETURNS?|CHANGE|DATE|FILTER|HOLDINGS?|PORTFOLIOS?|EQUITY|BUY|SELL|DAY|OVERALL|NET|CHARGES|TAX|UNREALIZED|REALIZED)\b/i;

  const detected = [];
  const seenSymbols = new Set();

  // Helper to extract numbers & metrics from a block of text around a candidate
  const extractMetricsFromBlock = (block) => {
    let quantity = null;
    let buyPrice = null;
    let latestPrice = null;
    let investedAmount = null;

    // 1. Zerodha / Kite inline: "Qty. 25 • Avg. 1,420.50" or "Qty: 25 | Avg: 1420"
    const inlineZerodha = block.match(/Qty\.?\s*[:\s]*([0-9,]+)\s*(?:•|\s*\|\s*|-|\s+)\s*Avg\.?\s*(?:cost|price)?[:\s]*₹?\s*([0-9,]+(?:\.[0-9]+)?)/i);
    if (inlineZerodha) {
      quantity = Number(inlineZerodha[1].replace(/,/g, ''));
      buyPrice = Number(inlineZerodha[2].replace(/,/g, ''));
    }

    // 2. Groww inline: "25 shares • Avg ₹385.50"
    if (!quantity || !buyPrice) {
      const inlineGroww = block.match(/([0-9,]+)\s*shares?\s*(?:•|\s*\|\s*|-|\s+)\s*Avg\s*₹?\s*([0-9,]+(?:\.[0-9]+)?)/i);
      if (inlineGroww) {
        quantity = Number(inlineGroww[1].replace(/,/g, ''));
        buyPrice = Number(inlineGroww[2].replace(/,/g, ''));
      }
    }

    // 3. Angel One / Upstox inline: "Qty 500 Avg 21.40"
    if (!quantity || !buyPrice) {
      const inlineAngel = block.match(/Qty\s*[:\s]*([0-9,]+)\s+Avg\s*[:\s]*₹?\s*([0-9,]+(?:\.[0-9]+)?)/i);
      if (inlineAngel) {
        quantity = Number(inlineAngel[1].replace(/,/g, ''));
        buyPrice = Number(inlineAngel[2].replace(/,/g, ''));
      }
    }

    // 4. Standalone Qty label
    if (!quantity) {
      const qtyMatch = block.match(/(?:Qty\.?|Quantity|Shares|Units)[:\s]*([0-9,]+)/i) ||
        block.match(/([0-9,]+)\s*(?:shares|units|qty)\b/i);
      if (qtyMatch) {
        quantity = Number(qtyMatch[1].replace(/,/g, ''));
      }
    }

    // 5. Standalone Buy Price label
    if (!buyPrice) {
      const avgMatch = block.match(/(?:Avg\.?\s*(?:cost|price)?|Average|Buy\s*Price|Purchase\s*Price)[:\s]*₹?\s*([0-9,]+(?:\.[0-9]+)?)/i);
      if (avgMatch) {
        buyPrice = Number(avgMatch[1].replace(/,/g, ''));
      }
    }

    // 6. LTP / Current Price (Prioritize explicit LTP / CMP over total current portfolio value)
    const ltpMatch = block.match(/(?:LTP|CMP|Last\s*Price|Market\s*Price)[:\s]*₹?\s*([0-9,]+(?:\.[0-9]+)?)/i);
    if (ltpMatch) {
      latestPrice = Number(ltpMatch[1].replace(/,/g, ''));
    } else {
      const curMatch = block.match(/(?:Current|Cur\.?\s*val)[:\s]*₹?\s*([0-9,]+(?:\.[0-9]+)?)/i);
      if (curMatch) {
        const rawVal = Number(curMatch[1].replace(/,/g, ''));
        if (quantity && quantity > 1 && rawVal > (buyPrice || 100) * 1.5) {
          latestPrice = Number((rawVal / quantity).toFixed(2));
        } else {
          latestPrice = rawVal;
        }
      }
    }

    // 7. Invested Amount
    const invMatch = block.match(/(?:Invested|Investment|Total\s*Cost)[:\s]*₹?\s*([0-9,]+(?:\.[0-9]+)?)/i);
    if (invMatch) {
      investedAmount = Number(invMatch[1].replace(/,/g, ''));
    }

    // Cross-calculate if one field is missing
    if (investedAmount && buyPrice && (!quantity || quantity <= 0)) {
      quantity = Math.round(investedAmount / buyPrice);
    } else if (investedAmount && quantity && (!buyPrice || buyPrice <= 0)) {
      buyPrice = Number((investedAmount / quantity).toFixed(2));
    }

    // Fallback: search for numbers if labeled extraction missed
    if (!buyPrice || !quantity) {
      const numbers = (block.match(/₹?\s*[0-9]{1,3}(?:,[0-9]{3})*(?:\.[0-9]+)?|[0-9]+(?:\.[0-9]+)?/g) || [])
        .map((n) => Number(n.replace(/[₹,\s]/g, '')))
        .filter((n) => !isNaN(n) && n > 0 && n < 500000);

      if (numbers.length >= 2) {
        const intCandidates = numbers.filter((n) => Number.isInteger(n) && n > 0 && n <= 10000);
        const priceCandidates = numbers.filter((n) => n > 10 && !intCandidates.includes(n));
        if (!quantity && intCandidates.length > 0) quantity = intCandidates[0];
        if (!buyPrice && priceCandidates.length > 0) buyPrice = priceCandidates[0];
        if (!latestPrice && priceCandidates.length > 1) latestPrice = priceCandidates[1];
      }
    }

    return { quantity, buyPrice, latestPrice, investedAmount };
  };

  // PASS 1: High-precision Dictionary Matching
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    for (const item of COMMON_STOCKS_DICT) {
      const isMatch = item.alias.some((alias) =>
        new RegExp(`\\b${alias.replace('&', '\\&')}\\b`, 'i').test(line)
      );

      if (isMatch && !seenSymbols.has(item.symbol)) {
        const block = lines.slice(Math.max(0, i - 1), Math.min(lines.length, i + 7)).join('\n');
        const metrics = extractMetricsFromBlock(block);

        const finalQty = metrics.quantity && metrics.quantity > 0 ? metrics.quantity : 10;
        const finalBuy = metrics.buyPrice && metrics.buyPrice > 0 ? metrics.buyPrice : (metrics.latestPrice || 100);
        const finalLtp = metrics.latestPrice && metrics.latestPrice > 0 ? metrics.latestPrice : finalBuy;

        seenSymbols.add(item.symbol);
        detected.push({
          symbolOrCode: item.symbol,
          instrumentName: item.name,
          quantity: finalQty,
          buyPrice: finalBuy,
          latestPrice: finalLtp,
          assetClass: 'Equity',
          subCategory: 'Stocks',
        });
        break;
      }
    }
  }

  // PASS 2: Universal Generic Broker Layout & Financial Signal Extractor
  // Scans for ANY stock / ticker not captured by the dictionary
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (METRIC_PREFIXES.test(line)) continue;
    if (/\b(shares?|units?|invested|returns?|profit|loss|p&l)\b/i.test(line) && /\d/.test(line)) continue;

    const isSingleTicker = /^[A-Z0-9&-]{2,15}$/.test(line) && !/^\d+$/.test(line);
    const isCompanyName = /^[A-Z][a-zA-Z0-9&.\s-]{2,35}$/.test(line) &&
      !/^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\b/i.test(line) &&
      !/^\d+[\s\w]*$/.test(line);

    if (isSingleTicker || isCompanyName) {
      const block = lines.slice(i + 1, Math.min(lines.length, i + 7)).join('\n');
      const metrics = extractMetricsFromBlock(block);

      if (metrics.quantity && metrics.quantity > 0 && (metrics.buyPrice || metrics.latestPrice || metrics.investedAmount)) {
        let cleanSym = line.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
        if (cleanSym.length > 12) cleanSym = cleanSym.slice(0, 12);

        if (!seenSymbols.has(cleanSym) && cleanSym.length >= 2) {
          seenSymbols.add(cleanSym);
          detected.push({
            symbolOrCode: cleanSym,
            instrumentName: line.replace(/[^\w\s&.-]/g, '').trim(),
            quantity: metrics.quantity,
            buyPrice: metrics.buyPrice || (metrics.investedAmount ? Number((metrics.investedAmount / metrics.quantity).toFixed(2)) : (metrics.latestPrice || 100)),
            latestPrice: metrics.latestPrice || metrics.buyPrice || 100,
            assetClass: 'Equity',
            subCategory: 'Stocks',
          });
        }
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
  console.log(`[Portfolio OCR Total] Extracted ${finalHoldingsList.length} unique holdings across screenshots: ${finalHoldingsList.map(h => `${h.symbolOrCode}(Qty:${h.quantity}@${h.buyPrice})`).join(', ')}`);

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
