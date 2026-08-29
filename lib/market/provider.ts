import { BinanceProvider } from './binance';
import { SsiFastConnectProvider } from './ssi';
import type { Interval, MarketSnapshot, MarketType, ProviderDiagnostics } from './types';
import { YahooVietnamStockProvider } from './yahoo';

const binance = new BinanceProvider();
const ssi = new SsiFastConnectProvider();
const yahoo = new YahooVietnamStockProvider();

export function hasSsiCredentials(): boolean {
  return Boolean(process.env.SSI_API_KEY?.trim() && process.env.SSI_API_SECRET?.trim());
}

function elapsed(startedAt: number) {
  return Math.max(0, Date.now() - startedAt);
}

function withDiagnostics(snapshot: MarketSnapshot, diagnostics: ProviderDiagnostics): MarketSnapshot {
  return { ...snapshot, providerDiagnostics: diagnostics };
}

export async function getMarketSnapshot(market: MarketType, symbol: string, interval: Interval): Promise<MarketSnapshot> {
  const startedAt = Date.now();

  if (market === 'CRYPTO') {
    const snapshot = await binance.getSnapshot(symbol, interval);
    return withDiagnostics(snapshot, {
      requestedMode: 'BINANCE_PUBLIC',
      selectedProvider: snapshot.provider,
      route: 'PRIMARY',
      configured: true,
      fallbackUsed: false,
      fallbackReason: null,
      latencyMs: elapsed(startedAt),
    });
  }

  const mode = (process.env.STOCK_PROVIDER || 'AUTO').toUpperCase();
  const allowFallback = (process.env.ALLOW_STOCK_FALLBACK || 'true').toLowerCase() !== 'false';
  const ssiConfigured = hasSsiCredentials();

  if (mode === 'YAHOO') {
    const snapshot = await yahoo.getSnapshot(symbol, interval);
    return withDiagnostics(snapshot, {
      requestedMode: mode,
      selectedProvider: snapshot.provider,
      route: 'DIRECT',
      configured: true,
      fallbackUsed: true,
      fallbackReason: 'STOCK_PROVIDER=YAHOO: đang dùng nguồn fallback/unofficial theo cấu hình.',
      latencyMs: elapsed(startedAt),
    });
  }

  if (mode === 'SSI') {
    const snapshot = await ssi.getSnapshot(symbol, interval);
    return withDiagnostics(snapshot, {
      requestedMode: mode,
      selectedProvider: snapshot.provider,
      route: 'PRIMARY',
      configured: ssiConfigured,
      fallbackUsed: false,
      fallbackReason: null,
      latencyMs: elapsed(startedAt),
    });
  }

  if (ssiConfigured) {
    try {
      const snapshot = await ssi.getSnapshot(symbol, interval);
      return withDiagnostics(snapshot, {
        requestedMode: mode,
        selectedProvider: snapshot.provider,
        route: 'PRIMARY',
        configured: true,
        fallbackUsed: false,
        fallbackReason: null,
        latencyMs: elapsed(startedAt),
      });
    } catch (error) {
      if (!allowFallback) throw error;
      const reason = error instanceof Error ? error.message : 'unknown';
      const fallback = await yahoo.getSnapshot(symbol, interval);
      fallback.warning = `SSI gặp lỗi (${reason}). Đang dùng Yahoo fallback.`;
      fallback.fallbackUsed = true;
      return withDiagnostics(fallback, {
        requestedMode: mode,
        selectedProvider: fallback.provider,
        route: 'FALLBACK',
        configured: true,
        fallbackUsed: true,
        fallbackReason: `SSI lỗi: ${reason}`,
        latencyMs: elapsed(startedAt),
      });
    }
  }

  if (!allowFallback) {
    throw new Error('Chưa cấu hình SSI FastConnect và fallback đã bị tắt');
  }

  const fallback = await yahoo.getSnapshot(symbol, interval);
  fallback.warning = 'SSI chưa được cấu hình. Đang dùng Yahoo Finance fallback để preview dữ liệu Stock VN.';
  fallback.fallbackUsed = true;
  return withDiagnostics(fallback, {
    requestedMode: mode,
    selectedProvider: fallback.provider,
    route: 'FALLBACK',
    configured: false,
    fallbackUsed: true,
    fallbackReason: 'SSI credentials chưa cấu hình.',
    latencyMs: elapsed(startedAt),
  });
}
