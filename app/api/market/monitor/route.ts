import { NextRequest, NextResponse } from 'next/server';
import { getMarketSnapshot } from '@/lib/market/provider';
import { normalizeInputSymbol } from '@/lib/market/symbols';
import { analyzeTechnical } from '@/lib/analysis/technical';
import { analyzeTradeSignal } from '@/lib/analysis/signal';
import { backtestSignalEngine } from '@/lib/analysis/backtest';
import type { Interval, MarketType, WatchlistMonitorSnapshot } from '@/lib/market/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const intervals = new Set<Interval>(['15m', '1h', '4h', '1d', '1w']);

export async function GET(request: NextRequest) {
  const marketParam = request.nextUrl.searchParams.get('market')?.toUpperCase();
  const market: MarketType = marketParam === 'STOCK' ? 'STOCK' : 'CRYPTO';
  const rawSymbol = request.nextUrl.searchParams.get('symbol') || '';
  const symbol = normalizeInputSymbol(market, rawSymbol);
  const requestedInterval = request.nextUrl.searchParams.get('interval') as Interval | null;
  const interval: Interval = requestedInterval && intervals.has(requestedInterval) ? requestedInterval : market === 'STOCK' ? '1d' : '1h';
  const correlationId = crypto.randomUUID();

  if (!symbol) {
    return NextResponse.json({ error: 'Vui lòng nhập mã tài sản', correlationId }, { status: 400 });
  }
  if (market === 'STOCK' && interval === '4h') {
    return NextResponse.json({ error: 'Chứng khoán V0.7.0 hỗ trợ 15m, 1h, 1d, 1w', correlationId }, { status: 400 });
  }

  try {
    const snapshot = await getMarketSnapshot(market, symbol, interval);
    const analysis = analyzeTechnical(snapshot.candles, market);
    const signal = analyzeTradeSignal(snapshot.candles, market, analysis);
    const backtest = backtestSignalEngine(snapshot.candles, market, interval, signal, analysis.regime.key);
    const calibration = backtest.calibration;

    const compact: WatchlistMonitorSnapshot = {
      market,
      symbol: snapshot.symbol,
      displayName: snapshot.displayName,
      exchange: snapshot.exchange,
      provider: snapshot.provider,
      interval,
      currency: snapshot.currency,
      currentPrice: snapshot.currentPrice,
      changePercent: snapshot.changePercent,
      marketState: snapshot.marketState,
      dataAt: snapshot.dataAt,
      regime: {
        key: analysis.regime.key,
        label: analysis.regime.label,
        direction: analysis.regime.direction,
        confidence: analysis.regime.confidence,
      },
      signal: {
        decision: signal.decision,
        decisionLabel: signal.decisionLabel,
        setup: signal.setup,
        setupLabel: signal.setupLabel,
        score: signal.score,
        scoreLabel: signal.scoreLabel,
        entryZone: signal.entryZone,
        stopLoss: signal.stopLoss,
        targets: signal.targets,
      },
      calibration: {
        applicable: calibration.applicable,
        quality: calibration.quality,
        qualityLabel: calibration.qualityLabel,
        calibratedWinRate: calibration.calibratedWinRate,
        resolvedTrades: calibration.resolvedTrades,
        expectancyR: calibration.expectancyR,
        profitFactor: calibration.profitFactor,
        estimatedTimeToTp1: calibration.estimatedTimeToTp1,
        matchedBy: calibration.matchedBy,
      },
      warning: snapshot.warning,
    };

    return NextResponse.json({ ...compact, correlationId }, {
      headers: {
        'Cache-Control': market === 'CRYPTO' ? 's-maxage=15, stale-while-revalidate=30' : 's-maxage=45, stale-while-revalidate=90',
        'X-Correlation-Id': correlationId,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Không thể lấy dữ liệu theo dõi';
    console.error('[market/monitor]', { correlationId, market, symbol, interval, message });
    return NextResponse.json({ error: message, correlationId }, { status: 502, headers: { 'X-Correlation-Id': correlationId } });
  }
}
