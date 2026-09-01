import { getStockMetadata } from './symbols';
import type { Candle, Interval, MarketProvider, MarketSnapshot } from './types';

const intervalMap: Record<Exclude<Interval, '4h'>, { interval: string; range: string }> = {
  '15m': { interval: '15m', range: '1mo' },
  '1h': { interval: '1h', range: '3mo' },
  '1d': { interval: '1d', range: '3y' },
  '1w': { interval: '1wk', range: '10y' },
};

type YahooResult = {
  meta: {
    symbol?: string;
    currency?: string;
    exchangeName?: string;
    fullExchangeName?: string;
    instrumentType?: string;
    regularMarketPrice?: number;
    previousClose?: number;
    chartPreviousClose?: number;
    regularMarketTime?: number;
    regularMarketDayHigh?: number;
    regularMarketDayLow?: number;
    regularMarketVolume?: number;
    marketState?: string;
    longName?: string;
    shortName?: string;
  };
  timestamp?: number[];
  indicators?: {
    quote?: Array<{
      open?: Array<number | null>;
      high?: Array<number | null>;
      low?: Array<number | null>;
      close?: Array<number | null>;
      volume?: Array<number | null>;
    }>;
  };
};

type YahooResponse = {
  chart?: {
    result?: YahooResult[] | null;
    error?: { code?: string; description?: string } | null;
  };
};

function yahooCandidates(symbol: string): string[] {
  if (symbol.includes('.')) return [symbol];
  const meta = getStockMetadata(symbol);
  if (meta?.exchange === 'HNX') return [`${symbol}.HN`, `${symbol}.VN`];
  return [`${symbol}.VN`, `${symbol}.HN`];
}

async function fetchYahoo(symbol: string, interval: string, range: string): Promise<YahooResult> {
  const hosts = ['query1.finance.yahoo.com', 'query2.finance.yahoo.com'];
  let lastError: unknown;
  for (const host of hosts) {
    try {
      const url = `https://${host}/v8/finance/chart/${encodeURIComponent(symbol)}?interval=${encodeURIComponent(interval)}&range=${encodeURIComponent(range)}&events=div%2Csplits`;
      const response = await fetch(url, {
        signal: AbortSignal.timeout(8000),
        next: { revalidate: 30 },
        headers: {
          Accept: 'application/json',
          'User-Agent': 'Mozilla/5.0 (compatible; MarketScope/0.12.0)',
        },
      });
      if (!response.ok) throw new Error(`Yahoo HTTP ${response.status}`);
      const data = (await response.json()) as YahooResponse;
      const result = data.chart?.result?.[0];
      if (!result) throw new Error(data.chart?.error?.description || `Không có dữ liệu ${symbol}`);
      return result;
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError instanceof Error ? lastError : new Error(`Không thể kết nối Yahoo Finance cho ${symbol}`);
}

export function parseYahooResult(result: YahooResult): Candle[] {
  const timestamps = result.timestamp || [];
  const quote = result.indicators?.quote?.[0];
  if (!quote) return [];

  const candles: Candle[] = [];
  for (let i = 0; i < timestamps.length; i += 1) {
    const open = quote.open?.[i];
    const high = quote.high?.[i];
    const low = quote.low?.[i];
    const close = quote.close?.[i];
    const volume = quote.volume?.[i] ?? 0;
    if ([open, high, low, close].some((value) => value == null || !Number.isFinite(Number(value)))) continue;
    candles.push({
      time: Number(timestamps[i]),
      open: Number(open),
      high: Number(high),
      low: Number(low),
      close: Number(close),
      volume: Number(volume) || 0,
    });
  }
  return candles;
}

export class YahooVietnamStockProvider implements MarketProvider {
  readonly name = 'Yahoo Finance fallback';

  async getSnapshot(symbol: string, interval: Interval): Promise<MarketSnapshot> {
    if (interval === '4h') {
      throw new Error('Chứng khoán V0.12.0 chưa hỗ trợ timeframe 4h');
    }
    const cfg = intervalMap[interval];
    let result: YahooResult | undefined;
    let providerSymbol = '';
    let lastError: unknown;

    for (const candidate of yahooCandidates(symbol.toUpperCase())) {
      try {
        result = await fetchYahoo(candidate, cfg.interval, cfg.range);
        providerSymbol = candidate;
        break;
      } catch (error) {
        lastError = error;
      }
    }

    if (!result) {
      throw lastError instanceof Error ? lastError : new Error(`Không tìm thấy ${symbol}`);
    }

    const candles = parseYahooResult(result);
    if (candles.length < 2) throw new Error(`Không đủ dữ liệu nến cho ${symbol}`);

    const last = candles[candles.length - 1];
    const prev = result.meta.previousClose ?? result.meta.chartPreviousClose ?? candles[candles.length - 2].close;
    const currentPrice = result.meta.regularMarketPrice ?? last.close;
    const change = Number.isFinite(prev) ? currentPrice - Number(prev) : null;
    const changePercent = change != null && prev ? (change / Number(prev)) * 100 : null;
    const sessionCandles = candles.slice(-Math.min(candles.length, interval === '1d' || interval === '1w' ? 1 : 28));
    const dayHigh = result.meta.regularMarketDayHigh ?? (sessionCandles.length ? Math.max(...sessionCandles.map((c) => c.high)) : null);
    const dayLow = result.meta.regularMarketDayLow ?? (sessionCandles.length ? Math.min(...sessionCandles.map((c) => c.low)) : null);
    const volume = result.meta.regularMarketVolume ?? (sessionCandles.length ? sessionCandles.reduce((sum, c) => sum + c.volume, 0) : null);
    const localMeta = getStockMetadata(symbol.toUpperCase());

    return {
      market: 'STOCK',
      symbol: symbol.toUpperCase(),
      displayName: localMeta?.name || result.meta.longName || result.meta.shortName || symbol.toUpperCase(),
      exchange: localMeta?.exchange || result.meta.fullExchangeName || result.meta.exchangeName || 'VN',
      provider: this.name,
      providerSymbol,
      interval,
      currency: result.meta.currency || 'VND',
      currentPrice,
      previousClose: Number(prev) || null,
      change,
      changePercent,
      dayHigh,
      dayLow,
      volume,
      marketState: result.meta.marketState || 'UNKNOWN',
      dataAt: new Date((result.meta.regularMarketTime || last.time) * 1000).toISOString(),
      candles,
      fallbackUsed: true,
      warning: 'Nguồn fallback không chính thức. Nên cấu hình SSI FastConnect cho dữ liệu chứng khoán Việt Nam.',
    };
  }
}

export async function probeYahooHealth() {
  const startedAt = Date.now();
  const result = await fetchYahoo('FPT.VN', '1d', '5d');
  const candles = parseYahooResult(result);
  if (!candles.length) throw new Error('Yahoo health probe không trả OHLCV');
  return { latencyMs: Math.max(0, Date.now() - startedAt), message: 'Yahoo Finance fallback đang phản hồi dữ liệu Stock VN.' };
}
