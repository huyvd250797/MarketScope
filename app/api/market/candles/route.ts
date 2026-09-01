import { NextRequest, NextResponse } from 'next/server';
import { getMarketSnapshot } from '@/lib/market/provider';
import { normalizeInputSymbol } from '@/lib/market/symbols';
import { assessMarketSnapshot, applyDataQualityGuard } from '@/lib/market/quality';
import { analyzeTechnical } from '@/lib/analysis/technical';
import { analyzeTradeSignal } from '@/lib/analysis/signal';
import { backtestSignalEngine } from '@/lib/analysis/backtest';
import { normalizeStrategyProfile, resolveStrategyProfile } from '@/lib/analysis/strategy';
import { forecastPriceBehavior } from '@/lib/analysis/forecast';
import { calibrateForecast, validateForecastHistory } from '@/lib/analysis/forecastValidation';
import type { Interval, MarketType } from '@/lib/market/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const intervals = new Set<Interval>(['15m', '1h', '4h', '1d', '1w']);

export async function GET(request: NextRequest) {
  const marketParam = request.nextUrl.searchParams.get('market')?.toUpperCase();
  const market: MarketType = marketParam === 'STOCK' ? 'STOCK' : marketParam === 'FOREX' ? 'FOREX' : 'CRYPTO';
  const rawSymbol = request.nextUrl.searchParams.get('symbol') || '';
  const symbol = normalizeInputSymbol(market, rawSymbol);
  const requestedInterval = request.nextUrl.searchParams.get('interval') as Interval | null;
  const interval: Interval = requestedInterval && intervals.has(requestedInterval) ? requestedInterval : '1h';
  const requestedProfile = normalizeStrategyProfile(request.nextUrl.searchParams.get('profile'));
  const correlationId = crypto.randomUUID();
  const startedAt = Date.now();

  if (!symbol) {
    return NextResponse.json({ error: 'Vui lòng nhập mã tài sản', correlationId }, { status: 400 });
  }
  if (market === 'STOCK' && interval === '4h') {
    return NextResponse.json({ error: 'Chứng khoán V0.11.0 hỗ trợ 15m, 1h, 1d, 1w', correlationId }, { status: 400 });
  }

  try {
    const snapshot = await getMarketSnapshot(market, symbol, interval);
    const quality = assessMarketSnapshot(snapshot);
    snapshot.quality = quality;

    if (!quality.analysisAllowed) {
      return NextResponse.json({ ...snapshot, correlationId, requestDurationMs: Date.now() - startedAt }, {
        headers: {
          'Cache-Control': 'no-store',
          'X-Correlation-Id': correlationId,
          'X-Data-Quality': quality.status,
        },
      });
    }

    const analysis = analyzeTechnical(snapshot.candles, market);
    const strategy = resolveStrategyProfile(requestedProfile, market, interval, analysis);
    const rawForecast = forecastPriceBehavior(snapshot.candles, market, interval, analysis, strategy);
    const forecastValidation = quality.backtestAllowed
      ? validateForecastHistory(snapshot.candles, market, interval, strategy.effective)
      : undefined;
    const forecast = forecastValidation ? calibrateForecast(rawForecast, forecastValidation) : rawForecast;
    const rawSignal = analyzeTradeSignal(snapshot.candles, market, analysis, strategy.effective);
    const signal = applyDataQualityGuard(rawSignal, quality);
    const backtest = quality.backtestAllowed
      ? backtestSignalEngine(snapshot.candles, market, interval, signal, analysis.regime.key, strategy.effective)
      : undefined;

    return NextResponse.json({ ...snapshot, quality, analysis, strategy, forecast, forecastValidation, signal, backtest, correlationId, requestDurationMs: Date.now() - startedAt }, {
      headers: {
        'Cache-Control': market === 'CRYPTO' ? 's-maxage=10, stale-while-revalidate=20' : 's-maxage=30, stale-while-revalidate=60',
        'X-Correlation-Id': correlationId,
        'X-Data-Quality': quality.status,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Không thể lấy dữ liệu thị trường';
    console.error('[market/candles]', { correlationId, market, symbol, interval, durationMs: Date.now() - startedAt, message });
    return NextResponse.json({ error: message, correlationId }, { status: 502, headers: { 'Cache-Control': 'no-store', 'X-Correlation-Id': correlationId } });
  }
}
