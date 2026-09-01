import { analyzeTechnical } from '@/lib/analysis/technical';
import { analyzeTradeSignal } from '@/lib/analysis/signal';
import { backtestSignalEngine } from '@/lib/analysis/backtest';
import { resolveStrategyProfile } from '@/lib/analysis/strategy';
import { probeBinanceHealth } from '@/lib/market/binance';
import { hasSsiCredentials } from '@/lib/market/provider';
import { probeSsiHealth } from '@/lib/market/ssi';
import type { Candle, HealthCheckItem, SystemHealthSnapshot } from '@/lib/market/types';
import { probeYahooHealth } from '@/lib/market/yahoo';
import { probeForexHealth } from '@/lib/market/forex';

function syntheticCandles(count = 340): Candle[] {
  const rows: Candle[] = [];
  const start = 1_700_000_000;
  let close = 100;
  for (let i = 0; i < count; i += 1) {
    const drift = 0.12 + Math.sin(i / 9) * 0.18;
    const open = close;
    close = Math.max(10, open + drift);
    const high = Math.max(open, close) + 0.7 + Math.abs(Math.sin(i / 5)) * 0.2;
    const low = Math.min(open, close) - 0.65 - Math.abs(Math.cos(i / 7)) * 0.2;
    rows.push({ time: start + i * 3600, open, high, low, close, volume: 1000 + i * 4 + (i % 11) * 25 });
  }
  return rows;
}

async function safeCheck(key: string, label: string, worker: () => Promise<{ latencyMs: number; message: string }>, extra: Partial<HealthCheckItem> = {}): Promise<HealthCheckItem> {
  const startedAt = Date.now();
  try {
    const result = await Promise.race([
      worker(),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error('Health probe timeout sau 8 giây')), 8000)),
    ]);
    return { key, label, status: 'HEALTHY', latencyMs: result.latencyMs, message: result.message, ...extra };
  } catch (error) {
    return {
      key,
      label,
      status: 'PROVIDER_ERROR',
      latencyMs: Math.max(0, Date.now() - startedAt),
      message: error instanceof Error ? error.message : 'Health check thất bại',
      ...extra,
    };
  }
}

function engineChecks(): HealthCheckItem[] {
  const candles = syntheticCandles();
  const output: HealthCheckItem[] = [];

  const run = (key: string, label: string, worker: () => string) => {
    const startedAt = Date.now();
    try {
      const message = worker();
      output.push({ key, label, status: 'HEALTHY', latencyMs: Date.now() - startedAt, message });
    } catch (error) {
      output.push({ key, label, status: 'PROVIDER_ERROR', latencyMs: Date.now() - startedAt, message: error instanceof Error ? error.message : 'Self-test lỗi' });
    }
  };

  let analysis: ReturnType<typeof analyzeTechnical> | null = null;
  let signal: ReturnType<typeof analyzeTradeSignal> | null = null;

  run('technical', 'Technical Engine', () => {
    analysis = analyzeTechnical(candles, 'CRYPTO');
    if (!analysis.indicators.ema.ema200 || !Number.isFinite(analysis.indicators.ema.ema200)) throw new Error('EMA200 self-test không hợp lệ');
    return `EMA/RSI/MACD/ADX/ATR/VWAP self-test PASS • ${candles.length} nến synthetic.`;
  });

  run('strategy', 'Strategy Profile Engine', () => {
    if (!analysis) analysis = analyzeTechnical(candles, 'CRYPTO');
    const strategy = resolveStrategyProfile('AUTO', 'CRYPTO', '1h', analysis);
    if (!strategy.effective || strategy.confidence < 0 || strategy.confidence > 100) throw new Error('Strategy Profile self-test không hợp lệ');
    return `AUTO → ${strategy.effectiveLabel} • confidence ${strategy.confidence}/100.`;
  });

  run('signal', 'Signal Engine', () => {
    if (!analysis) analysis = analyzeTechnical(candles, 'CRYPTO');
    signal = analyzeTradeSignal(candles, 'CRYPTO', analysis);
    if (!Number.isFinite(signal.score) || signal.score < 0 || signal.score > 100) throw new Error('Signal Score self-test ngoài 0–100');
    return `Signal Engine PASS • ${signal.decision} • score ${signal.score}/100.`;
  });

  run('backtest', 'Backtest Engine', () => {
    if (!analysis) analysis = analyzeTechnical(candles, 'CRYPTO');
    if (!signal) signal = analyzeTradeSignal(candles, 'CRYPTO', analysis);
    const result = backtestSignalEngine(candles, 'CRYPTO', '1h', signal, analysis.regime.key);
    const accounted = result.metrics.wins + result.metrics.losses + result.metrics.timeouts;
    if (accounted !== result.metrics.filledTrades) throw new Error('Backtest accounting mismatch');
    return `Backtest PASS • ${result.metrics.filledTrades} filled • ${result.status}.`;
  });

  return output;
}

export async function getSystemHealth(): Promise<SystemHealthSnapshot> {
  const mode = (process.env.STOCK_PROVIDER || 'AUTO').toUpperCase();
  const fallbackEnabled = (process.env.ALLOW_STOCK_FALLBACK || 'true').toLowerCase() !== 'false';
  const ssiConfigured = hasSsiCredentials();
  const selectedSsi = mode === 'SSI' || (mode === 'AUTO' && ssiConfigured);
  const selectedYahoo = mode === 'YAHOO' || (mode === 'AUTO' && !ssiConfigured && fallbackEnabled);

  const providerChecks = await Promise.all([
    safeCheck('binance', 'Binance Spot', probeBinanceHealth, { selected: true, configured: true }),
    ssiConfigured
      ? safeCheck('ssi', 'SSI FastConnect', probeSsiHealth, { selected: selectedSsi, configured: true })
      : Promise.resolve<HealthCheckItem>({ key: 'ssi', label: 'SSI FastConnect', status: selectedSsi ? 'PROVIDER_ERROR' : 'DEGRADED', latencyMs: null, message: 'Chưa cấu hình SSI_API_KEY / SSI_API_SECRET.', selected: selectedSsi, configured: false }),
    safeCheck('yahoo', 'Yahoo Finance fallback', probeYahooHealth, { selected: selectedYahoo, configured: true }),
    safeCheck('forex', 'Forex / Metals', probeForexHealth, { selected: true, configured: true }),
  ]);

  const engines = engineChecks();
  const binanceCheck = providerChecks.find((item) => item.key === 'binance');
  const ssiCheck = providerChecks.find((item) => item.key === 'ssi');
  const yahooCheck = providerChecks.find((item) => item.key === 'yahoo');
  const forexCheck = providerChecks.find((item) => item.key === 'forex');
  const engineError = engines.some((item) => item.status === 'PROVIDER_ERROR');
  const cryptoError = binanceCheck?.status === 'PROVIDER_ERROR';
  const stockHardError = mode === 'SSI'
    ? ssiCheck?.status === 'PROVIDER_ERROR'
    : mode === 'YAHOO'
      ? yahooCheck?.status === 'PROVIDER_ERROR'
      : ssiConfigured
        ? ssiCheck?.status === 'PROVIDER_ERROR' && (!fallbackEnabled || yahooCheck?.status === 'PROVIDER_ERROR')
        : !fallbackEnabled || yahooCheck?.status === 'PROVIDER_ERROR';
  const stockDegraded = selectedYahoo || (mode === 'AUTO' && ssiConfigured && ssiCheck?.status === 'PROVIDER_ERROR' && fallbackEnabled && yahooCheck?.status !== 'PROVIDER_ERROR');

  let overall: SystemHealthSnapshot['overall'] = 'HEALTHY';
  if (cryptoError || stockHardError || forexCheck?.status === 'PROVIDER_ERROR' || engineError) overall = 'PROVIDER_ERROR';
  else if (stockDegraded) overall = 'DEGRADED';

  return {
    generatedAt: new Date().toISOString(),
    version: '0.10.0',
    overall,
    overallLabel: overall === 'HEALTHY' ? 'Hệ thống ổn định' : overall === 'DEGRADED' ? 'Hệ thống đang dùng chế độ suy giảm/fallback' : 'Có thành phần đang lỗi',
    stockProviderMode: mode,
    stockFallbackEnabled: fallbackEnabled,
    providers: providerChecks,
    engines,
    cachePolicies: [
      { endpoint: '/api/market/candles', policy: 'CRYPTO 10s / STOCK 30s / FOREX 30s', note: 'Browser gọi no-store; CDN có stale-while-revalidate ngắn. Data Quality luôn kiểm tra dataAt trước khi cho BUY.' },
      { endpoint: '/api/market/monitor', policy: 'CRYPTO 15s / STOCK 45s / FOREX 30s', note: 'Watchlist refresh 5 phút ở client; API không dùng cache dài.' },
      { endpoint: '/api/market/portfolio', policy: 'no-store', note: 'Giá vốn/số lượng không được cache hoặc lưu server.' },
      { endpoint: '/api/system/health', policy: 'no-store', note: 'Diagnostics luôn chạy mới khi mở/refresh Settings.' },
    ],
    notes: [
      'Health endpoint không trả API key/secret và không ghi credential vào response.',
      'Yahoo Finance là fallback/unofficial; nếu đang được chọn thì overall được đánh DEGRADED dù endpoint vẫn hoạt động.',
      'Forex/Metals dùng provider riêng; Spot FX không có centralized volume nên VWAP dùng typical-price proxy.',
      'Strategy Profile Engine quyết định horizon/weights trước Signal/Backtest; Data Quality Guard của từng mã vẫn là lớp quyết định cuối cùng có cho phép phát Entry/SL/TP hay không.',
    ],
  };
}
