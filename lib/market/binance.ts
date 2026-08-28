import type { Candle, Interval, MarketProvider, MarketSnapshot } from './types';

const intervalMap: Record<Interval, string> = {
  '15m': '15m',
  '1h': '1h',
  '4h': '4h',
  '1d': '1d',
  '1w': '1w',
};

const FALLBACK_BASES = [
  'https://api.binance.com',
  'https://api1.binance.com',
  'https://data-api.binance.vision',
];

function bases(): string[] {
  const configured = process.env.BINANCE_BASE_URL?.trim();
  return Array.from(new Set([configured, ...FALLBACK_BASES].filter(Boolean) as string[]));
}

async function fetchJson<T>(path: string): Promise<T> {
  let lastError: unknown;
  for (const base of bases()) {
    try {
      const response = await fetch(`${base}${path}`, {
        signal: AbortSignal.timeout(9000),
        next: { revalidate: 10 },
        headers: { Accept: 'application/json' },
      });
      if (!response.ok) {
        throw new Error(`Binance HTTP ${response.status}`);
      }
      return (await response.json()) as T;
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError instanceof Error ? lastError : new Error('Không thể kết nối Binance');
}

export function parseBinanceKlines(rows: unknown[][]): Candle[] {
  return rows
    .map((row) => ({
      time: Math.floor(Number(row[0]) / 1000),
      open: Number(row[1]),
      high: Number(row[2]),
      low: Number(row[3]),
      close: Number(row[4]),
      volume: Number(row[5]),
    }))
    .filter((c) => [c.time, c.open, c.high, c.low, c.close, c.volume].every(Number.isFinite));
}

type Ticker24h = {
  lastPrice: string;
  priceChange: string;
  priceChangePercent: string;
  highPrice: string;
  lowPrice: string;
  volume: string;
  closeTime: number;
};

export class BinanceProvider implements MarketProvider {
  readonly name = 'Binance Spot';

  async getSnapshot(symbol: string, interval: Interval): Promise<MarketSnapshot> {
    const safeSymbol = symbol.toUpperCase();
    const [klinesRaw, ticker] = await Promise.all([
      fetchJson<unknown[][]>(`/api/v3/klines?symbol=${encodeURIComponent(safeSymbol)}&interval=${intervalMap[interval]}&limit=500`),
      fetchJson<Ticker24h>(`/api/v3/ticker/24hr?symbol=${encodeURIComponent(safeSymbol)}`),
    ]);

    const candles = parseBinanceKlines(klinesRaw);
    if (candles.length < 2) throw new Error(`Không đủ dữ liệu nến cho ${safeSymbol}`);

    const currentPrice = Number(ticker.lastPrice);
    const change = Number(ticker.priceChange);
    const changePercent = Number(ticker.priceChangePercent);
    const previousClose = currentPrice - change;
    const last = candles[candles.length - 1];

    return {
      market: 'CRYPTO',
      symbol: safeSymbol,
      displayName: safeSymbol.replace(/USDT$/, ' / USDT'),
      exchange: 'Binance',
      provider: this.name,
      providerSymbol: safeSymbol,
      interval,
      currency: safeSymbol.endsWith('USDT') ? 'USDT' : safeSymbol.slice(-3),
      currentPrice,
      previousClose,
      change,
      changePercent,
      dayHigh: Number(ticker.highPrice),
      dayLow: Number(ticker.lowPrice),
      volume: Number(ticker.volume),
      marketState: 'OPEN 24/7',
      dataAt: new Date(Number(ticker.closeTime) || last.time * 1000).toISOString(),
      candles,
    };
  }
}
