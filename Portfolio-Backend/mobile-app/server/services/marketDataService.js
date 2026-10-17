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
    basePrice: 1215.0,
    keywords: ['reliance', 'ril', 'jio'],
  },
  {
    symbolOrCode: 'TCS.NS',
    instrumentName: 'Tata Consultancy Services Ltd',
    assetClass: 'Equity',
    subCategory: 'Large Cap Stocks',
    exchange: 'NSE',
    basePrice: 2350.0,
    keywords: ['tcs', 'tata', 'tech'],
  },
  {
    symbolOrCode: 'HDFCBANK.NS',
    instrumentName: 'HDFC Bank Ltd',
    assetClass: 'Equity',
    subCategory: 'Large Cap Stocks',
    exchange: 'NSE',
    basePrice: 726.85,
    keywords: ['hdfc', 'bank'],
  },
  {
    symbolOrCode: 'INFY.NS',
    instrumentName: 'Infosys Ltd',
    assetClass: 'Equity',
    subCategory: 'Large Cap Stocks',
    exchange: 'NSE',
    basePrice: 1110.0,
    keywords: ['infy', 'infosys'],
  },
  {
    symbolOrCode: 'ICICIBANK.NS',
    instrumentName: 'ICICI Bank Ltd',
    assetClass: 'Equity',
    subCategory: 'Large Cap Stocks',
    exchange: 'NSE',
    basePrice: 1389.4,
    keywords: ['icici', 'bank'],
  },
  {
    symbolOrCode: 'TATAMOTORS.NS',
    instrumentName: 'Tata Motors Ltd',
    assetClass: 'Equity',
    subCategory: 'Auto & EV',
    exchange: 'NSE',
    basePrice: 935.4,
    keywords: ['tata', 'motors', 'auto'],
  },
  {
    symbolOrCode: 'ITC.NS',
    instrumentName: 'ITC Ltd',
    assetClass: 'Equity',
    subCategory: 'FMCG Stocks',
    exchange: 'NSE',
    basePrice: 263.9,
    keywords: ['itc', 'fmcg'],
  },
  {
    symbolOrCode: 'BHARTIARTL.NS',
    instrumentName: 'Bharti Airtel Ltd',
    assetClass: 'Equity',
    subCategory: 'Telecom',
    exchange: 'NSE',
    basePrice: 1854.0,
    keywords: ['airtel', 'bharti', 'telecom'],
  },
  {
    symbolOrCode: 'SBIN.NS',
    instrumentName: 'State Bank of India',
    assetClass: 'Equity',
    subCategory: 'PSU Banking',
    exchange: 'NSE',
    basePrice: 960.0,
    keywords: ['sbi', 'sbin', 'psu'],
  },
  {
    symbolOrCode: 'BAJFINANCE.NS',
    instrumentName: 'Bajaj Finance Ltd',
    assetClass: 'Equity',
    subCategory: 'NBFC & Fintech',
    exchange: 'NSE',
    basePrice: 965.25,
    keywords: ['bajaj', 'finance'],
  },
  {
    symbolOrCode: 'LT.NS',
    instrumentName: 'Larsen & Toubro Ltd',
    assetClass: 'Equity',
    subCategory: 'Infrastructure',
    exchange: 'NSE',
    basePrice: 3632.0,
    keywords: ['l&t', 'lt', 'infra'],
  },

  // 2. Indian Gold ETFs (NSE) - Traded both as ETF and Gold Asset
  {
    symbolOrCode: 'GOLDBEES.NS',
    instrumentName: 'Nippon India ETF Gold BeES',
    assetClass: 'ETF',
    subCategory: 'Gold ETF',
    exchange: 'NSE',
    basePrice: 119.82,
    keywords: ['gold', 'bees', 'goldbees', 'commodity', 'nippon', 'gold etf'],
  },
  {
    symbolOrCode: 'HDFCGOLD.NS',
    instrumentName: 'HDFC Gold ETF',
    assetClass: 'ETF',
    subCategory: 'Gold ETF',
    exchange: 'NSE',
    basePrice: 123.86,
    keywords: ['gold', 'hdfc', 'hdfcgold', 'commodity', 'gold etf'],
  },
  {
    symbolOrCode: 'SETFGOLD.NS',
    instrumentName: 'SBI ETF Gold',
    assetClass: 'ETF',
    subCategory: 'Gold ETF',
    exchange: 'NSE',
    basePrice: 123.62,
    keywords: ['gold', 'sbi', 'sbigold', 'setfgold', 'commodity', 'gold etf'],
  },
  {
    symbolOrCode: 'GOLDIETF.NS',
    instrumentName: 'ICICI Prudential Gold ETF',
    assetClass: 'ETF',
    subCategory: 'Gold ETF',
    exchange: 'NSE',
    basePrice: 124.12,
    keywords: ['gold', 'icici', 'icicigold', 'goldietf', 'commodity', 'gold etf'],
  },
  {
    symbolOrCode: 'GOLD1.NS',
    instrumentName: 'Kotak Gold ETF',
    assetClass: 'ETF',
    subCategory: 'Gold ETF',
    exchange: 'NSE',
    basePrice: 120.98,
    keywords: ['gold', 'kotak', 'kotakgold', 'gold1', 'commodity', 'gold etf'],
  },
  {
    symbolOrCode: 'GOLDAXIS.NS',
    instrumentName: 'Axis Gold ETF',
    assetClass: 'ETF',
    subCategory: 'Gold ETF',
    exchange: 'NSE',
    basePrice: 120.63,
    keywords: ['gold', 'axis', 'axisgold', 'goldaxis', 'commodity', 'gold etf'],
  },
  {
    symbolOrCode: 'TATAGOLD.NS',
    instrumentName: 'Tata Gold ETF',
    assetClass: 'ETF',
    subCategory: 'Gold ETF',
    exchange: 'NSE',
    basePrice: 14.08,
    keywords: ['gold', 'tata', 'tatagold', 'commodity', 'gold etf'],
  },
  {
    symbolOrCode: 'BSLGOLDETF.NS',
    instrumentName: 'Aditya Birla Sun Life Gold ETF',
    assetClass: 'ETF',
    subCategory: 'Gold ETF',
    exchange: 'NSE',
    basePrice: 127.41,
    keywords: ['gold', 'birla', 'absl', 'bslgoldetf', 'commodity', 'gold etf'],
  },
  {
    symbolOrCode: 'QGOLDHALF.NS',
    instrumentName: 'Quantum Gold ETF',
    assetClass: 'ETF',
    subCategory: 'Gold ETF',
    exchange: 'NSE',
    basePrice: 120.05,
    keywords: ['gold', 'quantum', 'qgoldhalf', 'commodity', 'gold etf'],
  },

  // 3. Indian Silver ETFs (NSE) - Traded both as ETF and Commodity Asset
  {
    symbolOrCode: 'SILVERBEES.NS',
    instrumentName: 'Nippon India Silver ETF BeES',
    assetClass: 'ETF',
    subCategory: 'Silver ETF',
    exchange: 'NSE',
    basePrice: 197.57,
    keywords: ['silver', 'bees', 'silverbees', 'commodity', 'nippon', 'silver etf'],
  },
  {
    symbolOrCode: 'HDFCSILVER.NS',
    instrumentName: 'HDFC Silver ETF',
    assetClass: 'ETF',
    subCategory: 'Silver ETF',
    exchange: 'NSE',
    basePrice: 197.39,
    keywords: ['silver', 'hdfc', 'hdfcsilver', 'commodity', 'silver etf'],
  },
  {
    symbolOrCode: 'SILVERIETF.NS',
    instrumentName: 'ICICI Prudential Silver ETF',
    assetClass: 'ETF',
    subCategory: 'Silver ETF',
    exchange: 'NSE',
    basePrice: 206.23,
    keywords: ['silver', 'icici', 'icicisilver', 'silverietf', 'commodity', 'silver etf'],
  },
  {
    symbolOrCode: 'TATSILV.NS',
    instrumentName: 'Tata Silver ETF',
    assetClass: 'ETF',
    subCategory: 'Silver ETF',
    exchange: 'NSE',
    basePrice: 20.08,
    keywords: ['silver', 'tata', 'tatasilver', 'tatsilv', 'commodity', 'silver etf'],
  },
  {
    symbolOrCode: 'SBISILVER.NS',
    instrumentName: 'SBI Silver ETF',
    assetClass: 'ETF',
    subCategory: 'Silver ETF',
    exchange: 'NSE',
    basePrice: 202.7,
    keywords: ['silver', 'sbi', 'sbisilver', 'commodity', 'silver etf'],
  },
  {
    symbolOrCode: 'SILVERAXIS.NS',
    instrumentName: 'Axis Silver ETF',
    assetClass: 'ETF',
    subCategory: 'Silver ETF',
    exchange: 'NSE',
    basePrice: 205.6,
    keywords: ['silver', 'axis', 'axissilver', 'silveraxis', 'commodity', 'silver etf'],
  },
  {
    symbolOrCode: 'SILVER1.NS',
    instrumentName: 'Kotak Silver ETF',
    assetClass: 'ETF',
    subCategory: 'Silver ETF',
    exchange: 'NSE',
    basePrice: 20.06,
    keywords: ['silver', 'kotak', 'kotaksilver', 'silver1', 'commodity', 'silver etf'],
  },
  {
    symbolOrCode: 'SILVERBETA.NS',
    instrumentName: 'UTI Silver ETF',
    assetClass: 'ETF',
    subCategory: 'Silver ETF',
    exchange: 'NSE',
    basePrice: 199.26,
    keywords: ['silver', 'uti', 'utisilver', 'silverbeta', 'commodity', 'silver etf'],
  },
  {
    symbolOrCode: 'SILVERADD.NS',
    instrumentName: 'DSP Silver ETF',
    assetClass: 'ETF',
    subCategory: 'Silver ETF',
    exchange: 'NSE',
    basePrice: 19.88,
    keywords: ['silver', 'dsp', 'dspsilver', 'silveradd', 'commodity', 'silver etf'],
  },

  // 4. Indian Index, Sectoral & Global ETFs (NSE)
  {
    symbolOrCode: 'NIFTYBEES.NS',
    instrumentName: 'Nippon India Nifty 50 BeES ETF',
    assetClass: 'ETF',
    subCategory: 'Index ETF',
    exchange: 'NSE',
    basePrice: 261.51,
    keywords: ['nifty', 'bees', 'niftybees', 'index', 'etf'],
  },
  {
    symbolOrCode: 'BANKBEES.NS',
    instrumentName: 'Nippon India Nifty Bank BeES ETF',
    assetClass: 'ETF',
    subCategory: 'Sectoral ETF (Banking)',
    exchange: 'NSE',
    basePrice: 577.48,
    keywords: ['bank', 'bees', 'bankbees', 'banking', 'etf'],
  },
  {
    symbolOrCode: 'ITBEES.NS',
    instrumentName: 'Nippon India Nifty IT ETF',
    assetClass: 'ETF',
    subCategory: 'Sectoral ETF (IT)',
    exchange: 'NSE',
    basePrice: 34.12,
    keywords: ['it', 'bees', 'itbees', 'tech', 'etf'],
  },
  {
    symbolOrCode: 'JUNIORBEES.NS',
    instrumentName: 'Nippon India Nifty Next 50 ETF',
    assetClass: 'ETF',
    subCategory: 'Index ETF',
    exchange: 'NSE',
    basePrice: 743.18,
    keywords: ['junior', 'bees', 'juniorbees', 'next50', 'index', 'etf'],
  },
  {
    symbolOrCode: 'CPSEETF.NS',
    instrumentName: 'CPSE ETF (Central Public Sector)',
    assetClass: 'ETF',
    subCategory: 'Thematic ETF',
    exchange: 'NSE',
    basePrice: 88.65,
    keywords: ['cpse', 'psu', 'cpseetf', 'thematic', 'etf'],
  },
  {
    symbolOrCode: 'MON100.NS',
    instrumentName: 'Motilal Oswal Nasdaq 100 ETF',
    assetClass: 'ETF',
    subCategory: 'Global ETF',
    exchange: 'NSE',
    basePrice: 310.9,
    keywords: ['mon100', 'nasdaq', 'us', 'motilal', 'global', 'etf'],
  },
  {
    symbolOrCode: 'SETFNIF50.NS',
    instrumentName: 'SBI Nifty 50 ETF',
    assetClass: 'ETF',
    subCategory: 'Index ETF',
    exchange: 'NSE',
    basePrice: 247.09,
    keywords: ['sbi', 'nifty', 'setfnif50', 'index', 'etf'],
  },
  {
    symbolOrCode: 'HDFCNIFTY.NS',
    instrumentName: 'HDFC Nifty 50 ETF',
    assetClass: 'ETF',
    subCategory: 'Index ETF',
    exchange: 'NSE',
    basePrice: 258.92,
    keywords: ['hdfc', 'nifty', 'hdfcnifty', 'index', 'etf'],
  },
  {
    symbolOrCode: 'AUTOBEES.NS',
    instrumentName: 'Nippon India Nifty Auto ETF',
    assetClass: 'ETF',
    subCategory: 'Sectoral ETF (Auto)',
    exchange: 'NSE',
    basePrice: 264.7,
    keywords: ['auto', 'bees', 'autobees', 'automobile', 'etf'],
  },
  {
    symbolOrCode: 'PHARMABEES.NS',
    instrumentName: 'Nippon India Nifty Pharma ETF',
    assetClass: 'ETF',
    subCategory: 'Sectoral ETF (Pharma)',
    exchange: 'NSE',
    basePrice: 26.54,
    keywords: ['pharma', 'bees', 'pharmabees', 'healthcare', 'etf'],
  },
  {
    symbolOrCode: 'MID150BEES.NS',
    instrumentName: 'Nippon India Nifty Midcap 150 ETF',
    assetClass: 'ETF',
    subCategory: 'Midcap ETF',
    exchange: 'NSE',
    basePrice: 225.15,
    keywords: ['midcap', 'bees', 'mid150bees', 'index', 'etf'],
  },
  {
    symbolOrCode: 'LIQUIDBEES.NS',
    instrumentName: 'Nippon India Liquid BeES ETF',
    assetClass: 'ETF',
    subCategory: 'Liquid / Debt ETF',
    exchange: 'NSE',
    basePrice: 1000.0,
    keywords: ['liquid', 'bees', 'liquidbees', 'debt', 'etf'],
  },

  // 5. Leading Indian Mutual Funds (AMFI Scheme Codes)
  {
    symbolOrCode: '120716',
    instrumentName: 'Parag Parikh Flexi Cap Fund - Direct Plan - Growth',
    assetClass: 'Mutual Fund',
    subCategory: 'Flexi Cap Fund',
    exchange: 'AMFI',
    basePrice: 84.62,
    keywords: ['parag', 'parikh', 'ppfc', 'flexi'],
  },
  {
    symbolOrCode: '118989',
    instrumentName: 'HDFC Top 100 Fund - Direct Plan - Growth',
    assetClass: 'Mutual Fund',
    subCategory: 'Large Cap Fund',
    exchange: 'AMFI',
    basePrice: 1125.4,
    keywords: ['hdfc', 'top 100', 'large cap'],
  },
  {
    symbolOrCode: '120503',
    instrumentName: 'SBI Small Cap Fund - Direct Plan - Growth',
    assetClass: 'Mutual Fund',
    subCategory: 'Small Cap Fund',
    exchange: 'AMFI',
    basePrice: 178.25,
    keywords: ['sbi', 'small cap'],
  },
  {
    symbolOrCode: '119598',
    instrumentName: 'Mirae Asset Large Cap Fund - Direct Plan - Growth',
    assetClass: 'Mutual Fund',
    subCategory: 'Large Cap Fund',
    exchange: 'AMFI',
    basePrice: 122.9,
    keywords: ['mirae', 'large cap', 'bluechip'],
  },
  {
    symbolOrCode: '145552',
    instrumentName: 'Nippon India Small Cap Fund - Direct Plan - Growth',
    assetClass: 'Mutual Fund',
    subCategory: 'Small Cap Fund',
    exchange: 'AMFI',
    basePrice: 165.75,
    keywords: ['nippon', 'small cap'],
  },
  {
    symbolOrCode: '120828',
    instrumentName: 'ICICI Prudential Bluechip Fund - Direct Plan - Growth',
    assetClass: 'Mutual Fund',
    subCategory: 'Bluechip Fund',
    exchange: 'AMFI',
    basePrice: 108.45,
    keywords: ['icici', 'bluechip', 'large cap'],
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
  // Autocomplete & live search instruments (Stocks, ETFs, Mutual Funds, Gold & Silver) directly from market APIs
  async searchInstruments(query = '', type = '') {
    const q = query.trim();
    const qLower = q.toLowerCase();

    // 1. Match local curated list as fast cache & guaranteed high-quality Indian instruments
    const localMatches = CURATED_INSTRUMENTS.filter((inst) => {
      const isGoldOrSilver =
        inst.subCategory.toLowerCase().includes('gold') ||
        inst.subCategory.toLowerCase().includes('silver') ||
        inst.assetClass === 'Gold' ||
        inst.symbolOrCode.includes('GOLD') ||
        inst.symbolOrCode.includes('SILV');

      const isEtf =
        inst.assetClass === 'ETF' ||
        inst.subCategory.toLowerCase().includes('etf') ||
        inst.symbolOrCode.includes('BEES') ||
        inst.symbolOrCode.includes('ETF');

      let matchType = false;
      if (!type || type === 'all') {
        matchType = true;
      } else if (type === 'ETF') {
        // Any ETF (Index, Sectoral, Thematic, Gold, Silver) matches ETF tab
        matchType = isEtf;
      } else if (type === 'Gold') {
        // Any Gold or Silver ETF/Commodity matches Gold tab
        matchType = isGoldOrSilver;
      } else if (type === 'Equity' || type === 'stock') {
        matchType = inst.assetClass === 'Equity';
      } else if (type === 'Mutual Fund') {
        matchType = inst.assetClass === 'Mutual Fund';
      }

      if (!matchType) return false;
      if (!q) return true;

      const inKeywords = inst.keywords && inst.keywords.some((k) => k.toLowerCase().includes(qLower));
      return (
        inst.symbolOrCode.toLowerCase().includes(qLower) ||
        inst.instrumentName.toLowerCase().includes(qLower) ||
        inst.subCategory.toLowerCase().includes(qLower) ||
        inKeywords
      );
    }).map((inst) => {
      let targetAssetClass = inst.assetClass;
      if (type === 'ETF' && (inst.subCategory.includes('Gold') || inst.subCategory.includes('Silver'))) {
        targetAssetClass = 'ETF';
      } else if (type === 'Gold' && (inst.subCategory.includes('Gold') || inst.subCategory.includes('Silver'))) {
        targetAssetClass = 'Gold';
      }
      return {
        ...inst,
        assetClass: targetAssetClass,
      };
    });

    if (!q) {
      if (type === 'ETF') {
        const featuredSymbols = [
          'NIFTYBEES.NS',
          'BANKBEES.NS',
          'GOLDBEES.NS',
          'SILVERBEES.NS',
          'ITBEES.NS',
          'HDFCSILVER.NS',
          'HDFCGOLD.NS',
          'CPSEETF.NS',
          'MON100.NS',
          'JUNIORBEES.NS',
          'SETFGOLD.NS',
          'SILVERIETF.NS',
        ];
        return [...localMatches]
          .sort((a, b) => {
            const idxA = featuredSymbols.indexOf(a.symbolOrCode);
            const idxB = featuredSymbols.indexOf(b.symbolOrCode);
            if (idxA !== -1 && idxB !== -1) return idxA - idxB;
            if (idxA !== -1) return -1;
            if (idxB !== -1) return 1;
            return 0;
          })
          .slice(0, 12);
      }
      return localMatches.slice(0, 12);
    }

    // 2. If Mutual Fund: search official AMFI API (mfapi.in)
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

    // 3. For Stocks, ETFs, Gold & Silver: search live Yahoo Finance query search API
    try {
      const searchQueries = [q];
      if (type === 'ETF' && !qLower.includes('etf') && !qLower.includes('bees')) {
        searchQueries.push(`${q} etf`);
      }
      if (type === 'Gold' && (qLower.includes('silver') || qLower.includes('gold'))) {
        searchQueries.push(`${q} etf`);
      }

      const searchPromises = searchQueries.map((term) => {
        const url = `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(
          term
        )}&quotesCount=15&newsCount=0`;
        return fetchJson(url).catch(() => ({ quotes: [] }));
      });

      const searchResponses = await Promise.all(searchPromises);
      const allQuotes = [];
      const seenQuotes = new Set();
      for (const res of searchResponses) {
        if (res && Array.isArray(res.quotes)) {
          for (const quote of res.quotes) {
            if (quote.symbol && !seenQuotes.has(quote.symbol)) {
              seenQuotes.add(quote.symbol);
              allQuotes.push(quote);
            }
          }
        }
      }

      const apiMatches = [];
      for (const quote of allQuotes) {
        const sym = quote.symbol;
        if (!sym) continue;

        // Skip futures, options, indices unless relevant
        const quoteType = (quote.quoteType || '').toUpperCase();
        if (quoteType === 'FUTURE' || quoteType === 'OPTION') continue;

        const symUpper = sym.toUpperCase();
        const nameLower = (quote.longname || quote.shortname || '').toLowerCase();

        const isGold = symUpper.includes('GOLD') || nameLower.includes('gold');
        const isSilver = symUpper.includes('SILV') || nameLower.includes('silver');
        const isEtf =
          quoteType === 'ETF' ||
          symUpper.includes('BEES') ||
          symUpper.includes('ETF') ||
          symUpper.includes('IETF') ||
          nameLower.includes('etf') ||
          nameLower.includes('bees') ||
          isGold ||
          isSilver;

        let assetClass = 'Equity';
        let subCategory = 'Stocks';

        if (isGold) {
          assetClass = type === 'ETF' ? 'ETF' : 'Gold';
          subCategory = 'Gold ETF';
        } else if (isSilver) {
          assetClass = type === 'ETF' ? 'ETF' : 'Gold';
          subCategory = 'Silver ETF';
        } else if (isEtf) {
          assetClass = 'ETF';
          subCategory = 'Index / Sectoral ETF';
        } else {
          assetClass = 'Equity';
          subCategory = quote.exchDisp ? `${quote.exchDisp} Stock` : 'Equity Stock';
        }

        if (type && type !== 'all') {
          if (type === 'ETF' && !isEtf) continue;
          if (type === 'Gold' && !isGold && !isSilver) continue;
          if ((type === 'Equity' || type === 'stock') && isEtf && !symUpper.includes('.NS') && !symUpper.includes('.BO')) {
            continue;
          }
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

      // Prioritize Indian NSE/BSE stocks & ETFs at top of list
      combined.sort((a, b) => {
        const aIsIndian = a.symbolOrCode.endsWith('.NS') || a.symbolOrCode.endsWith('.BO') || a.exchange === 'NSE' || a.exchange === 'BSE';
        const bIsIndian = b.symbolOrCode.endsWith('.NS') || b.symbolOrCode.endsWith('.BO') || b.exchange === 'NSE' || b.exchange === 'BSE';
        if (aIsIndian && !bIsIndian) return -1;
        if (!aIsIndian && bIsIndian) return 1;
        return 0;
      });

      return combined.slice(0, 25);
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

    // Fallback if live API is temporarily unreachable
    const curated = CURATED_INSTRUMENTS.find((i) => i.symbolOrCode === schemeCode);
    const fallbackPrice = curated ? curated.basePrice : 0;
    return {
      symbolOrCode: schemeCode,
      instrumentName: curated?.instrumentName || schemeCode,
      price: fallbackPrice,
      date: new Date().toISOString().split('T')[0],
      change: 0,
      changePercent: 0,
      history: [],
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

    // Fallback: Never invent fake numbers like 500!
    const curated = CURATED_INSTRUMENTS.find(
      (i) => i.symbolOrCode === cleanSymbol || i.symbolOrCode.replace('.NS', '') === symbol
    );
    const fallbackPrice = curated ? curated.basePrice : 0;
    return {
      symbolOrCode: cleanSymbol,
      instrumentName: curated?.instrumentName || cleanSymbol,
      price: fallbackPrice,
      date: new Date().toISOString(),
      change: 0,
      changePercent: 0,
      history: [],
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

    // Process in batches of 5 to avoid network congestion / Yahoo timeouts
    const batchSize = 5;
    const enriched = [];

    for (let b = 0; b < holdings.length; b += batchSize) {
      const batch = holdings.slice(b, b + batchSize);
      const batchEnriched = await Promise.all(
        batch.map(async (holding) => {
          const h = holding.toObject ? holding.toObject() : { ...holding };
          try {
            const isFresh =
              !forceRefresh &&
              h.latestPrice > 0 &&
              h.latestPrice !== 500 &&
              h.latestPriceDate &&
              Date.now() - new Date(h.latestPriceDate).getTime() < CACHE_TTL_MS;

            let livePrice = h.latestPrice;
            let quote = null;

            if (!isFresh || h.latestPrice === 500) {
              quote = await this.getLiveQuote(h.symbolOrCode, h.assetClass);
              if (quote && quote.price > 0 && quote.isMarketOpen) {
                livePrice = quote.price;
                h.latestPrice = livePrice;
                h.latestPriceDate = quote.date || new Date();
                h.dayChange = quote.change || 0;
                h.dayChangePercent = quote.changePercent || 0;
                h.history = quote.history || [];
              } else {
                // If live quote fails, use real averageBuyPrice or previous valid price (never 500!)
                livePrice = (h.latestPrice > 0 && h.latestPrice !== 500) ? h.latestPrice : h.averageBuyPrice;
                h.latestPrice = livePrice;
                h.dayChange = 0;
                h.dayChangePercent = 0;
                h.history = [];
              }
            } else {
              h.dayChange = h.dayChange || 0;
              h.dayChangePercent = h.dayChangePercent || 0;
              h.history = h.history || [];
            }

            // Calculated Metrics from real values
            const currentVal = h.quantity * livePrice;
            const investedVal = h.quantity * (h.averageBuyPrice || livePrice);
            const pnl = currentVal - investedVal;
            const pnlPercent = investedVal > 0 ? (pnl / investedVal) * 100 : 0;

            h.currentValue = Number(currentVal.toFixed(2));
            h.investedValue = Number(investedVal.toFixed(2));
            h.pnl = Number(pnl.toFixed(2));
            h.pnlPercent = Number(pnlPercent.toFixed(2));
          } catch (err) {
            const safePrice = (h.latestPrice > 0 && h.latestPrice !== 500) ? h.latestPrice : h.averageBuyPrice;
            const currentVal = h.quantity * safePrice;
            const investedVal = h.quantity * h.averageBuyPrice;
            h.latestPrice = safePrice;
            h.currentValue = Number(currentVal.toFixed(2));
            h.investedValue = Number(investedVal.toFixed(2));
            h.pnl = Number((currentVal - investedVal).toFixed(2));
            h.pnlPercent = investedVal > 0 ? Number(((h.pnl / investedVal) * 100).toFixed(2)) : 0;
          }
          return h;
        })
      );
      enriched.push(...batchEnriched);
    }

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
