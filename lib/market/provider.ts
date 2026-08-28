import { BinanceProvider } from './binance';
import { SsiFastConnectProvider } from './ssi';
import type { Interval, MarketSnapshot, MarketType } from './types';
import { YahooVietnamStockProvider } from './yahoo';

const binance = new BinanceProvider();
const ssi = new SsiFastConnectProvider();
const yahoo = new YahooVietnamStockProvider();

function hasSsiCredentials(): boolean {
  return Boolean(process.env.SSI_API_KEY?.trim() && process.env.SSI_API_SECRET?.trim());
}

export async function getMarketSnapshot(market: MarketType, symbol: string, interval: Interval): Promise<MarketSnapshot> {
  if (market === 'CRYPTO') return binance.getSnapshot(symbol, interval);

  const mode = (process.env.STOCK_PROVIDER || 'AUTO').toUpperCase();
  const allowFallback = (process.env.ALLOW_STOCK_FALLBACK || 'true').toLowerCase() !== 'false';

  if (mode === 'YAHOO') return yahoo.getSnapshot(symbol, interval);

  if (mode === 'SSI') {
    return ssi.getSnapshot(symbol, interval);
  }

  if (hasSsiCredentials()) {
    try {
      return await ssi.getSnapshot(symbol, interval);
    } catch (error) {
      if (!allowFallback) throw error;
      const fallback = await yahoo.getSnapshot(symbol, interval);
      fallback.warning = `SSI gặp lỗi (${error instanceof Error ? error.message : 'unknown'}). Đang dùng Yahoo fallback.`;
      fallback.fallbackUsed = true;
      return fallback;
    }
  }

  if (!allowFallback) {
    throw new Error('Chưa cấu hình SSI FastConnect và fallback đã bị tắt');
  }
  return yahoo.getSnapshot(symbol, interval);
}
