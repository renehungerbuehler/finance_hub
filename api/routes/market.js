const express = require('express');
const router = express.Router();

const cache = new Map(); // symbol -> { data, fetchedAt }
const TTL = 15 * 60 * 1000;
const YF = 'https://query2.finance.yahoo.com';
const HEADERS = { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36' };

async function fetchQuote(symbol) {
  const url = `${YF}/v8/finance/chart/${symbol}?interval=1d&range=1mo`;
  const r = await fetch(url, { headers: HEADERS, signal: AbortSignal.timeout(8000) });
  const json = await r.json();
  const result = json?.chart?.result?.[0];
  if (!result) return null;
  const meta = result.meta;
  const closes = result.indicators?.quote?.[0]?.close || [];
  const timestamps = result.timestamp || [];
  const history = timestamps
    .map((t, i) => ({ date: new Date(t * 1000).toISOString().slice(0, 10), close: closes[i] }))
    .filter(h => h.close != null);
  const change = (meta.regularMarketPrice || 0) - (meta.previousClose || 0);
  const prevClose = meta.previousClose || meta.regularMarketPrice || 1;
  return {
    currentPrice: meta.regularMarketPrice,
    change,
    changePercent: (change / prevClose) * 100,
    currency: meta.currency || 'USD',
    exchangeName: meta.exchangeName || '',
    history,
  };
}

// GET /api/market/quotes?symbols=VT,CHSPI.SW,BTC-USD
router.get('/quotes', async (req, res) => {
  const symbols = (req.query.symbols || '')
    .split(',')
    .map(s => s.trim().toUpperCase())
    .filter(Boolean)
    .slice(0, 50);

  if (!symbols.length) return res.json({ quotes: {} });

  const now = Date.now();
  const toFetch = symbols.filter(s => !cache.has(s) || now - cache.get(s).fetchedAt > TTL);

  await Promise.allSettled(toFetch.map(async s => {
    try {
      const data = await fetchQuote(s);
      cache.set(s, { data, fetchedAt: Date.now() });
    } catch {
      cache.set(s, { data: null, fetchedAt: Date.now() });
    }
  }));

  const quotes = {};
  for (const s of symbols) quotes[s] = cache.get(s)?.data ?? null;
  res.json({ quotes });
});

// GET /api/market/search?q=vanguard
router.get('/search', async (req, res) => {
  const q = (req.query.q || '').trim();
  if (!q) return res.json({ results: [] });
  try {
    const url = `${YF}/v1/finance/search?q=${encodeURIComponent(q)}&lang=en-US&region=CH&quotesCount=8`;
    const r = await fetch(url, { headers: HEADERS, signal: AbortSignal.timeout(5000) });
    const json = await r.json();
    const results = (json?.quotes || [])
      .filter(item => ['EQUITY', 'ETF', 'CRYPTOCURRENCY'].includes(item.quoteType))
      .map(item => ({
        symbol: item.symbol,
        name: item.shortname || item.longname || item.symbol,
        exchange: item.exchange || '',
      }));
    res.json({ results });
  } catch {
    res.json({ results: [] });
  }
});

module.exports = router;
