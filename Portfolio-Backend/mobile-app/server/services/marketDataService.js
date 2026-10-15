const https = require('https');
const http = require('http');

// In-memory cache for quotes { [symbol]: { price, date, change, history, timestamp } }
const quoteCache = new Map();
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes cache

// Curated Popular Indian Instruments for instant autocomplete & high reliability
const CURATED_INSTRUMENTS = [
  // 1. Top Indian Stocks (NSE)
  {
    symbolOrCode: 'RELIANCE.NS',
    instrumentName: 'Reliance Industries Ltd',
    assetClass: 'Equity',
    subCategory: 'Large Cap Stocks',
    exchange: 'NSE',
    basePrice: 2840.5,
  },
  {
    symbolOrCode: 'TCS.NS',
    instrumentName: 'Tata Consultancy Services Ltd',
    assetClass: 'Equity',
    subCategory: 'Large Cap Stocks',
    exchange: 'NSE',
    basePrice: 4210.0,
  },
  {
    symbolOrCode: 'HDFCBANK.NS',
    instrumentName: 'HDFC Bank Ltd',
    assetClass: 'Equity',
    subCategory: 'Large Cap Stocks',
    exchange: 'NSE',
    basePrice: 1680.25,
  },
  {
    symbolOrCode: 'INFY.NS',
    instrumentName: 'Infosys Ltd',
    assetClass: 'Equity',
    subCategory: 'Large Cap Stocks',
    exchange: 'NSE',
    basePrice: 1915.8,
  },
  {
    symbolOrCode: 'ICICIBANK.NS',
    instrumentName: 'ICICI Bank Ltd',
    assetClass: 'Equity',
    subCategory: 'Large Cap Stocks',
    exchange: 'NSE',
    basePrice: 1245.5,
  },
  {
    symbolOrCode: 'TATAMOTORS.NS',
    instrumentName: 'Tata Motors Ltd',
    assetClass: 'Equity',
    subCategory: 'Auto & EV',
    exchange: 'NSE',
    basePrice: 935.4,
  },
  {
    symbolOrCode: 'ITC.NS',
    instrumentName: 'ITC Ltd',
    assetClass: 'Equity',
    subCategory: 'FMCG Stocks',
    exchange: 'NSE',
    basePrice: 502.1,
  },
  {
    symbolOrCode: 'BHARTIARTL.NS',
    instrumentName: 'Bharti Airtel Ltd',
    assetClass: 'Equity',
    subCategory: 'Telecom',
    exchange: 'NSE',
    basePrice: 1685.0,
  },
  {
    symbolOrCode: 'SBIN.NS',
    instrumentName: 'State Bank of India',
    assetClass: 'Equity',
    subCategory: 'PSU Banking',
    exchange: 'NSE',
    basePrice: 795.3,
  },
  {
    symbolOrCode: 'BAJFINANCE.NS',
    instrumentName: 'Bajaj Finance Ltd',
    assetClass: 'Equity',
    subCategory: 'NBFC & Fintech',
    exchange: 'NSE',
    basePrice: 7150.0,
  },
  {
    symbolOrCode: 'ZOMATO.NS',
    instrumentName: 'Zomato Ltd',
    assetClass: 'Equity',
    subCategory: 'Consumer Tech',
    exchange: 'NSE',
    basePrice: 275.6,
  },
  {
    symbolOrCode: 'LT.NS',
    instrumentName: 'Larsen & Toubro Ltd',
    assetClass: 'Equity',
    subCategory: 'Infrastructure',
    exchange: 'NSE',
    basePrice: 3560.0,
  },

  // 2. Popular Indian ETFs
  {
    symbolOrCode: 'NIFTYBEES.NS',
    instrumentName: 'Nippon India Nifty 50 BeES ETF',
    assetClass: 'ETF',
    subCategory: 'Index ETF',
    exchange: 'NSE',
    basePrice: 275.4,
  },
  {
    symbolOrCode: 'GOLDBEES.NS',
    instrumentName: 'Nippon India ETF Gold BeES',
    assetClass: 'Gold',
    subCategory: 'Gold ETF',
    exchange: 'NSE',
    basePrice: 68.5,
  },
  {
    symbolOrCode: 'BANKBEES.NS',
    instrumentName: 'Nippon India Nifty Bank BeES ETF',
    assetClass: 'ETF',
    subCategory: 'Sectoral ETF',
    exchange: 'NSE',
    basePrice: 545.2,
  },
  {
    symbolOrCode: 'MON100.NS',
    instrumentName: 'Motilal Oswal Nasdaq 100 ETF',
    assetClass: 'ETF',
    subCategory: 'Global ETF',
    exchange: 'NSE',
    basePrice: 182.1,
  },

  // 3. Leading Indian Mutual Funds (AMFI Scheme Codes)
  {
    symbolOrCode: '120716',
    instrumentName: 'Parag Parikh Flexi Cap Fund - Direct Plan - Growth',
    assetClass: 'Mutual Fund',
    subCategory: 'Flexi Cap Fund',
    exchange: 'AMFI',
    basePrice: 84.62,
  },
  {
    symbolOrCode: '118989',
    instrumentName: 'HDFC Top 100 Fund - Direct Plan - Growth',
    assetClass: 'Mutual Fund',
    subCategory: 'Large Cap Fund',
    exchange: 'AMFI',
    basePrice: 1125.4,
  },
  {
    symbolOrCode: '120503',
    instrumentName: 'SBI Small Cap Fund - Direct Plan - Growth',
    assetClass: 'Mutual Fund',
    subCategory: 'Small Cap Fund',
    exchange: 'AMFI',
    basePrice: 178.25,
  },
  {
    symbolOrCode: '119598',
    instrumentName: 'Mirae Asset Large Cap Fund - Direct Plan - Growth',
    assetClass: 'Mutual Fund',
    subCategory: 'Large Cap Fund',
    exchange: 'AMFI',
    basePrice: 122.9,
  },
  {
    symbolOrCode: '145552',
    instrumentName: 'Nippon India Small Cap Fund - Direct Plan - Growth',
    assetClass: 'Mutual Fund',
    subCategory: 'Small Cap Fund',
    exchange: 'AMFI',
    basePrice: 165.75,
  },
  {
    symbolOrCode: '120828',
    instrumentName: 'ICICI Prudential Bluechip Fund - Direct Plan - Growth',
    assetClass: 'Mutual Fund',
    subCategory: 'Bluechip Fund',
    exchange: 'AMFI',
    basePrice: 108.45,
  },
];

// Helper to perform HTTP/HTTPS GET request
function fetchJson(url, headers = {}) {
  return new Promise((resolve, reject) => {
    const isHttps = url.startsWith('https');
    const client = isHttps ? https : http;
    const req = client.get(
      url,
      {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          Accept: 'application/json, text/plain, */*',
          ...headers,
        },
        timeout: 6000,
      },
      (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          return fetchJson(res.headers.location, headers).then(resolve).catch(reject);
        }
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            reject(new Error(`Failed to parse JSON from ${url}: ${e.message}`));
          }
        });
      }
    );

    req.on('error', (err) => reject(err));
    req.on('timeout', () => {
      req.destroy();
      reject(new Error(`Request timeout for ${url}`));
    });
  });
}

class MarketDataService {
  // Autocomplete & live search instruments (Stocks, ETFs, Mutual Funds) directly from market APIs
  async searchInstruments(query = '', type = '') {
    const q = query.trim();
    const qLower = q.toLowerCase();

    // Local matches from curated list as base/fast cache
    const localMatches = CURATED_INSTRUMENTS.filter((inst) => {
      const matchType =
        !type ||
        type === 'all' ||
        inst.assetClass.toLowerCase() === type.toLowerCase() ||
        (type === 'stock' && inst.assetClass === 'Equity');

      if (!matchType) return false;
      if (!q) return true;

      return (
        inst.symbolOrCode.toLowerCase().includes(qLower) ||
        inst.instrumentName.toLowerCase().includes(qLower) ||
        inst.subCategory.toLowerCase().includes(qLower)
      );
    });

    if (!q) {
      return localMatches.slice(0, 8);
    }

    // 1. If Mutual Fund: search official AMFI API (mfapi.in)
    if (type === 'Mutual Fund') {
      try {
        const url = `https://api.mfapi.in/mf/search?q=${encodeURIComponent(q)}`;
        const mfResults = await fetchJson(url);
        if (Array.isArray(mfResults)) {
          const apiMatches = mfResults.slice(0, 15).map((item) => ({
            symbolOrCode: String(item.schemeCode),
            instrumentName: item.schemeName,
            assetClass: 'Mutual Fund',
            subCategory: 'Mutual Fund Scheme',
            exchange: 'AMFI',
            basePrice: 0,
          }));

          const seen = new Set(localMatches.map((m) => m.symbolOrCode));
          const combined = [...localMatches];
          for (const item of apiMatches) {
            if (!seen.has(item.symbolOrCode)) {
              seen.add(item.symbolOrCode);
              combined.push(item);
            }
          }
          return combined.slice(0, 20);
        }
      } catch (err) {
        console.log('[MF API Search Notice]:', err.message);
      }
      return localMatches;
    }

    // 2. For Stocks, ETFs, Gold: search live Yahoo Finance query search API
    try {
      const url = `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(
        q
      )}&quotesCount=15&newsCount=0`;
      const searchRes = await fetchJson(url);

      if (searchRes && Array.isArray(searchRes.quotes)) {
        const apiMatches = [];
        for (const quote of searchRes.quotes) {
          const sym = quote.symbol;
          if (!sym) continue;

          let assetClass = 'Equity';
          let subCategory = 'Stocks';
          const symUpper = sym.toUpperCase();
          const nameLower = (quote.longname || quote.shortname || '').toLowerCase();
          const isEtf = quote.quoteType === 'ETF' || symUpper.includes('BEES') || symUpper.includes('ETF');
          const isGold = symUpper.includes('GOLD') || nameLower.includes('gold');

          if (isGold) {
            assetClass = 'Gold';
            subCategory = 'Gold ETF / Commodity';
          } else if (isEtf) {
            assetClass = 'ETF';
            subCategory = 'Index / Sectoral ETF';
          } else {
            assetClass = 'Equity';
            subCategory = quote.exchDisp ? `${quote.exchDisp} Stock` : 'Equity Stock';
          }

          if (type && type !== 'all') {
            if (type === 'ETF' && assetClass !== 'ETF') continue;
            if (type === 'Gold' && assetClass !== 'Gold') continue;
            if ((type === 'Equity' || type === 'stock') && assetClass !== 'Equity') continue;
          }

          apiMatches.push({
            symbolOrCode: sym,
            instrumentName: quote.longname || quote.shortname || sym,
            assetClass,
            subCategory,
            exchange: quote.exchDisp || (symUpper.endsWith('.NS') ? 'NSE' : symUpper.endsWith('.BO') ? 'BSE' : 'NSE'),
            basePrice: 0,
          });
        }

        const seen = new Set(localMatches.map((m) => m.symbolOrCode));
        const combined = [...localMatches];
        for (const item of apiMatches) {
          if (!seen.has(item.symbolOrCode)) {
            seen.add(item.symbolOrCode);
            combined.push(item);
          }
        }

        // Prioritize Indian NSE/BSE stocks at top of list
        combined.sort((a, b) => {
          const aIsIndian = a.symbolOrCode.endsWith('.NS') || a.symbolOrCode.endsWith('.BO') || a.exchange === 'NSE' || a.exchange === 'BSE';
          const bIsIndian = b.symbolOrCode.endsWith('.NS') || b.symbolOrCode.endsWith('.BO') || b.exchange === 'NSE' || b.exchange === 'BSE';
          if (aIsIndian && !bIsIndian) return -1;
          if (!aIsIndian && bIsIndian) return 1;
          return 0;
        });

        return combined.slice(0, 20);
      }
    } catch (err) {
      console.log('[Stock API Search Notice]:', err.message);
    }

    return localMatches;
  }

  // Fetch live Mutual Fund NAV from official AMFI API (mfapi.in)
  async fetchMutualFundNav(schemeCode) {
    const cacheKey = `MF_${schemeCode}`;
    const cached = quoteCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      return cached;
    }

    try {
      const url = `https://api.mfapi.in/mf/${schemeCode}`;
      const res = await fetchJson(url);

      if (res && res.data && res.data.length > 0) {
        const latestEntry = res.data[0];
        const prevEntry = res.data[1] || latestEntry;
        const currentPrice = parseFloat(latestEntry.nav);
        const prevPrice = parseFloat(prevEntry.nav);
        const change = currentPrice - prevPrice;
        const changePercent = prevPrice > 0 ? (change / prevPrice) * 100 : 0;

        // Extract last 15 historical points for trend mini-chart
        const history = res.data.slice(0, 15).reverse().map((d) => ({
          date: d.date,
          price: parseFloat(d.nav),
        }));

        const result = {
          symbolOrCode: schemeCode,
          instrumentName: res.meta?.scheme_name || schemeCode,
          price: currentPrice,
          date: latestEntry.date,
          change: Number(change.toFixed(2)),
          changePercent: Number(changePercent.toFixed(2)),
          history,
          isMarketOpen: true,
          timestamp: Date.now(),
        };

        quoteCache.set(cacheKey, result);
        return result;
      }
    } catch (e) {
      console.log(`[MarketDataService] MFAPI fetch failed for ${schemeCode}:`, e.message);
    }

    // Fallback to curated base price if live API is temporarily unreachable
    const curated = CURATED_INSTRUMENTS.find((i) => i.symbolOrCode === schemeCode);
    const fallbackPrice = curated ? curated.basePrice : 100.0;
    return {
      symbolOrCode: schemeCode,
      instrumentName: curated?.instrumentName || schemeCode,
      price: fallbackPrice,
      date: new Date().toISOString().split('T')[0],
      change: 0,
      changePercent: 0,
      history: [{ date: 'Today', price: fallbackPrice }],
      isMarketOpen: false,
      timestamp: Date.now(),
    };
  }

  // Fetch live Stock or ETF quote from Yahoo Finance query API
  async fetchStockQuote(symbol) {
    const cleanSymbol = symbol.toUpperCase().endsWith('.NS') || symbol.toUpperCase().endsWith('.BO')
      ? symbol.toUpperCase()
      : `${symbol.toUpperCase()}.NS`;

    const cacheKey = `STOCK_${cleanSymbol}`;
    const cached = quoteCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      return cached;
    }

    try {
      const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(
        cleanSymbol
      )}?range=1mo&interval=1d`;
      const res = await fetchJson(url);

      const resultObj = res?.chart?.result?.[0];
      if (resultObj) {
        const meta = resultObj.meta;
        const currentPrice =
          meta?.regularMarketPrice ||
          meta?.chartPreviousClose ||
          meta?.previousClose ||
          0;

        const prevClose = meta?.previousClose || meta?.chartPreviousClose || currentPrice;
        const change = currentPrice - prevClose;
        const changePercent = prevClose > 0 ? (change / prevClose) * 100 : 0;

        // Build history array from timestamps and closes
        const timestamps = resultObj.timestamp || [];
        const closes = resultObj.indicators?.quote?.[0]?.close || [];
        const history = [];

        for (let i = 0; i < timestamps.length; i++) {
          if (closes[i] != null) {
            const d = new Date(timestamps[i] * 1000);
            history.push({
              date: `${d.getDate()}/${d.getMonth() + 1}`,
              price: Number(closes[i].toFixed(2)),
            });
          }
        }

        const result = {
          symbolOrCode: cleanSymbol,
          instrumentName: meta?.shortName || meta?.longName || cleanSymbol,
          price: Number(currentPrice.toFixed(2)),
          date: new Date(meta?.regularMarketTime * 1000 || Date.now()).toISOString(),
          change: Number(change.toFixed(2)),
          changePercent: Number(changePercent.toFixed(2)),
          history: history.slice(-15),
          isMarketOpen: true,
          timestamp: Date.now(),
        };

        quoteCache.set(cacheKey, result);
        return result;
      }
    } catch (e) {
      console.log(`[MarketDataService] Yahoo quote failed for ${cleanSymbol}:`, e.message);
    }

    // Fallback to curated base price if market closed or offline
    const curated = CURATED_INSTRUMENTS.find(
      (i) => i.symbolOrCode === cleanSymbol || i.symbolOrCode.replace('.NS', '') === symbol
    );
    const fallbackPrice = curated ? curated.basePrice : 500.0;
    return {
      symbolOrCode: cleanSymbol,
      instrumentName: curated?.instrumentName || cleanSymbol,
      price: fallbackPrice,
      date: new Date().toISOString(),
      change: 0,
      changePercent: 0,
      history: [{ date: 'Today', price: fallbackPrice }],
      isMarketOpen: false,
      timestamp: Date.now(),
    };
  }

  // Unified quote fetcher for any instrument
  async getLiveQuote(symbolOrCode, assetClass = 'Equity') {
    // Check if it's a mutual fund
    const isMF =
      assetClass === 'Mutual Fund' ||
      /^\d{5,6}$/.test(symbolOrCode.trim()) ||
      CURATED_INSTRUMENTS.some(
        (i) => i.symbolOrCode === symbolOrCode && i.assetClass === 'Mutual Fund'
      );

    if (isMF) {
      return this.fetchMutualFundNav(symbolOrCode.trim());
    } else {
      return this.fetchStockQuote(symbolOrCode.trim());
    }
  }

  // Batch refresh prices for a list of holdings
  async enrichHoldingsWithLiveData(holdings, forceRefresh = false) {
    if (!Array.isArray(holdings) || holdings.length === 0) return [];

    const enriched = await Promise.all(
      holdings.map(async (holding) => {
        const h = holding.toObject ? holding.toObject() : { ...holding };
        try {
          const isFresh =
            !forceRefresh &&
            h.latestPrice > 0 &&
            h.latestPriceDate &&
            Date.now() - new Date(h.latestPriceDate).getTime() < CACHE_TTL_MS;

          let livePrice = h.latestPrice;
          let quote = null;

          if (!isFresh) {
            quote = await this.getLiveQuote(h.symbolOrCode, h.assetClass);
            livePrice = quote.price > 0 ? quote.price : h.latestPrice || h.averageBuyPrice;
            h.latestPrice = livePrice;
            h.latestPriceDate = quote.date || new Date();
            h.dayChange = quote.change || 0;
            h.dayChangePercent = quote.changePercent || 0;
            h.history = quote.history || [];
          } else {
            h.dayChange = h.dayChange || 0;
            h.dayChangePercent = h.dayChangePercent || 0;
            h.history = h.history || [];
          }

          // Calculated Metrics
          const currentVal = h.quantity * livePrice;
          const investedVal = h.quantity * (h.averageBuyPrice || livePrice);
          const pnl = currentVal - investedVal;
          const pnlPercent = investedVal > 0 ? (pnl / investedVal) * 100 : 0;

          h.currentValue = Number(currentVal.toFixed(2));
          h.investedValue = Number(investedVal.toFixed(2));
          h.pnl = Number(pnl.toFixed(2));
          h.pnlPercent = Number(pnlPercent.toFixed(2));
        } catch (err) {
          const currentVal = h.quantity * (h.latestPrice || h.averageBuyPrice);
          const investedVal = h.quantity * h.averageBuyPrice;
          h.currentValue = Number(currentVal.toFixed(2));
          h.investedValue = Number(investedVal.toFixed(2));
          h.pnl = Number((currentVal - investedVal).toFixed(2));
          h.pnlPercent = investedVal > 0 ? Number(((h.pnl / investedVal) * 100).toFixed(2)) : 0;
        }
        return h;
      })
    );

    // Compute portfolio allocation percentage
    const totalPortfolioVal = enriched.reduce((sum, item) => sum + (item.currentValue || 0), 0);
    return enriched.map((item) => ({
      ...item,
      allocationPercent:
        totalPortfolioVal > 0
          ? Number(((item.currentValue / totalPortfolioVal) * 100).toFixed(1))
          : 0,
    }));
  }
}

module.exports = new MarketDataService();
