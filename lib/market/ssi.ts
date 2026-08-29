import { getStockMetadata } from './symbols';
import type { Candle, Interval, MarketProvider, MarketSnapshot } from './types';

type SsiBar = {
  tradingDate?: string;
  openPrice?: number;
  highPrice?: number;
  lowPrice?: number;
  closePrice?: number;
  volume?: number;
};

function parseSsiTime(value: string | undefined): number {
  if (!value) return 0;
  const match = value.match(/^(\d{4})[\/-](\d{2})[\/-](\d{2})(?:[ T](\d{2}):(\d{2})(?::(\d{2}))?)?/);
  if (match) {
    const [, y, m, d, hh = '00', mm = '00', ss = '00'] = match;
    // SSI tradingDate is Vietnam local time (UTC+7, no DST).
    return Math.floor(Date.UTC(Number(y), Number(m) - 1, Number(d), Number(hh) - 7, Number(mm), Number(ss)) / 1000);
  }
  const direct = Date.parse(value);
  return Number.isFinite(direct) ? Math.floor(direct / 1000) : 0;
}

export function parseSsiBars(rows: SsiBar[]): Candle[] {
  return rows
    .map((row) => ({
      time: parseSsiTime(row.tradingDate),
      open: Number(row.openPrice),
      high: Number(row.highPrice),
      low: Number(row.lowPrice),
      close: Number(row.closePrice),
      volume: Number(row.volume) || 0,
    }))
    .filter((c) => c.time > 0 && [c.open, c.high, c.low, c.close, c.volume].every(Number.isFinite))
    .sort((a, b) => a.time - b.time);
}

function formatSsiDate(date: Date, includeTime = false): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: includeTime ? '2-digit' : undefined,
    minute: includeTime ? '2-digit' : undefined,
    second: includeTime ? '2-digit' : undefined,
    hour12: false,
  }).formatToParts(date);
  const get = (type: string) => parts.find((p) => p.type === type)?.value || '';
  const base = `${get('year')}/${get('month')}/${get('day')}`;
  return includeTime ? `${base} ${get('hour')}:${get('minute')}:${get('second')}` : base;
}

export class SsiFastConnectProvider implements MarketProvider {
  readonly name = 'SSI FastConnect';

  private credentials() {
    const apiKey = process.env.SSI_API_KEY?.trim();
    const apiSecret = process.env.SSI_API_SECRET?.trim();
    const clientId = process.env.SSI_CLIENT_ID?.trim();
    if (!apiKey || !apiSecret) {
      throw new Error('Chưa cấu hình SSI_API_KEY / SSI_API_SECRET');
    }
    return { apiKey, apiSecret, clientId };
  }

  async getSnapshot(symbol: string, interval: Interval): Promise<MarketSnapshot> {
    if (interval === '4h') throw new Error('SSI FastConnect không có nến 4h trực tiếp trong V0.7.0');

    const { Auth, Data } = await import('@ssi.developer/ssi-sdk');
    const credentials = this.credentials();
    const auth = new Auth({
      clientId: credentials.clientId || '',
      apiKey: credentials.apiKey,
      apiSecret: credentials.apiSecret,
      timeout: 9000,
      maxRetries: 2,
      retryDelay: 500,
    });

    await auth.authenticate();
    const data = new Data(auth);
    const now = new Date();
    const daysBack = interval === '15m' ? 30 : interval === '1h' ? 90 : interval === '1d' ? 1100 : 4200;
    const from = new Date(now.getTime() - daysBack * 86_400_000);
    const fromDate = formatSsiDate(from, interval === '15m' || interval === '1h');
    const toDate = formatSsiDate(now, interval === '15m' || interval === '1h');
    const md = data.marketData as unknown as Record<string, (...args: unknown[]) => Promise<SsiBar[]>>;

    const methodName: Record<Exclude<Interval, '4h'>, string> = {
      '15m': 'getOhlc15MinuteHistorical',
      '1h': 'getOhlc1HourHistorical',
      '1d': 'getOhlc1DayHistorical',
      '1w': 'getOhlc1WeekHistorical',
    };
    const method = md[methodName[interval]];
    if (typeof method !== 'function') throw new Error(`SSI SDK không hỗ trợ method ${methodName[interval]}`);

    const rows = await method.call(data.marketData, symbol.toUpperCase(), fromDate, toDate, 1, 500);
    const candles = parseSsiBars(Array.isArray(rows) ? rows : []);
    if (candles.length < 2) throw new Error(`SSI không trả đủ OHLCV cho ${symbol}`);

    const last = candles[candles.length - 1];
    const prev = candles[candles.length - 2];
    const summaryRaw = await data.marketData.getSecuritiesSummary(symbol.toUpperCase()).catch(() => null) as unknown;
    const summary = (Array.isArray(summaryRaw) ? summaryRaw[0] : summaryRaw) as Record<string, unknown> | null;
    const currentPrice = Number(summary?.closePrice ?? last.close) || last.close;
    const reportedChange = Number(summary?.priceChange);
    const previousClose = Number.isFinite(reportedChange) ? currentPrice - reportedChange : prev.close;
    const change = Number.isFinite(reportedChange) ? reportedChange : currentPrice - previousClose;
    const reportedChangePercent = Number(summary?.priceChangePercent);
    const meta = getStockMetadata(symbol.toUpperCase());

    return {
      market: 'STOCK',
      symbol: symbol.toUpperCase(),
      displayName: meta?.name || symbol.toUpperCase(),
      exchange: meta?.exchange || String(summary?.board ?? 'VN'),
      provider: this.name,
      providerSymbol: symbol.toUpperCase(),
      interval,
      currency: 'VND',
      currentPrice,
      previousClose,
      change,
      changePercent: Number.isFinite(reportedChangePercent) ? reportedChangePercent : (previousClose ? (change / previousClose) * 100 : null),
      dayHigh: Number(summary?.highPrice) || last.high,
      dayLow: Number(summary?.lowPrice) || last.low,
      volume: Number(summary?.totalMatch) || last.volume,
      marketState: 'SSI MARKET DATA',
      dataAt: new Date(last.time * 1000).toISOString(),
      candles,
    };
  }
}
