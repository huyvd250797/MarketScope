import { NextRequest, NextResponse } from 'next/server';
import { getMarketSnapshot } from '@/lib/market/provider';
import { normalizeInputSymbol } from '@/lib/market/symbols';
import { analyzeTechnical } from '@/lib/analysis/technical';
import { assessMarketSnapshot, applyDataQualityGuard } from '@/lib/market/quality';
import { analyzeTradeSignal } from '@/lib/analysis/signal';
import { analyzePositionExit } from '@/lib/analysis/position';
import { normalizeStrategyProfile } from '@/lib/analysis/strategy';
import type { EffectiveStrategyProfile, Interval, MarketType, PortfolioCurrencyBucket, PortfolioPositionSnapshot, PortfolioRiskSnapshot } from '@/lib/market/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const intervals = new Set<Interval>(['15m', '1h', '4h', '1d', '1w']);

type InputPosition = {
  market?: unknown;
  symbol?: unknown;
  interval?: unknown;
  entryPrice?: unknown;
  quantity?: unknown;
  strategyProfile?: unknown;
};

function finitePositive(value: unknown, fallback?: number) {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

async function mapLimit<T, R>(items: T[], limit: number, worker: (item: T) => Promise<R>): Promise<R[]> {
  const output = new Array<R>(items.length);
  let cursor = 0;
  const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) {
      const index = cursor++;
      output[index] = await worker(items[index]);
    }
  });
  await Promise.all(runners);
  return output;
}

export async function POST(request: NextRequest) {
  const correlationId = crypto.randomUUID();
  try {
    const body = await request.json() as { positions?: InputPosition[] };
    const raw = Array.isArray(body.positions) ? body.positions.slice(0, 30) : [];
    if (raw.length === 0) {
      return NextResponse.json({ error: 'Chưa có vị thế để phân tích danh mục', correlationId }, { status: 400 });
    }

    const valid = raw.map((item) => {
      const rawMarket=String(item.market).toUpperCase();
      const market: MarketType = rawMarket === 'STOCK' ? 'STOCK' : rawMarket === 'FOREX' ? 'FOREX' : 'CRYPTO';
      const symbol = normalizeInputSymbol(market, String(item.symbol || ''));
      const intervalCandidate = String(item.interval || (market === 'STOCK' ? '1d' : '1h')) as Interval;
      const interval: Interval = intervals.has(intervalCandidate) && !(market === 'STOCK' && intervalCandidate === '4h') ? intervalCandidate : market === 'STOCK' ? '1d' : '1h';
      const entryPrice = finitePositive(item.entryPrice);
      const quantity = finitePositive(item.quantity, 1) as number;
      const normalizedProfile = normalizeStrategyProfile(String(item.strategyProfile || 'SWING'));
      const strategyProfile: EffectiveStrategyProfile = normalizedProfile === 'AUTO' ? 'SWING' : normalizedProfile;
      if (!symbol || !entryPrice) throw new Error('Có vị thế thiếu mã hoặc giá vốn hợp lệ.');
      return { market, symbol, interval, entryPrice, quantity, strategyProfile };
    });

    const positions = await mapLimit(valid, 3, async (item): Promise<PortfolioPositionSnapshot> => {
      const snapshot = await getMarketSnapshot(item.market, item.symbol, item.interval);
      const quality = assessMarketSnapshot(snapshot);
      snapshot.quality = quality;
      if (!quality.analysisAllowed) throw new Error(`${snapshot.symbol}: ${quality.blockers[0] || 'Data Quality không đủ để phân tích vị thế'}`);
      const analysis = analyzeTechnical(snapshot.candles, item.market);
      const signal = applyDataQualityGuard(analyzeTradeSignal(snapshot.candles, item.market, analysis, item.strategyProfile), quality);
      const position = analyzePositionExit(snapshot.candles, item.market, item.interval, analysis, signal, item.entryPrice, item.strategyProfile);
      const costBasis = item.entryPrice * item.quantity;
      const currentValue = snapshot.currentPrice * item.quantity;
      const pnlValue = currentValue - costBasis;
      const riskFromEntryValue = Math.max(0, (item.entryPrice - position.protection.defensiveStop) * item.quantity);
      const downsideToStopValue = Math.max(0, (snapshot.currentPrice - position.protection.defensiveStop) * item.quantity);
      return {
        market: item.market,
        symbol: snapshot.symbol,
        interval: item.interval,
        currency: snapshot.currency,
        quantity: item.quantity,
        entryPrice: item.entryPrice,
        strategyProfile: item.strategyProfile,
        currentPrice: snapshot.currentPrice,
        costBasis,
        currentValue,
        pnlValue,
        pnlPercent: costBasis > 0 ? (pnlValue / costBasis) * 100 : 0,
        defensiveStop: position.protection.defensiveStop,
        riskFromEntryValue,
        downsideToStopValue,
        action: position.action,
        actionLabel: position.actionLabel,
        status: position.status,
        statusLabel: position.statusLabel,
        regime: position.context.regime,
        dataQualityStatus: quality.status,
        dataQualityScore: quality.score,
        warning: [snapshot.warning, quality.status !== 'HEALTHY' ? `Data Quality: ${quality.statusLabel} (${quality.score}/100)` : null].filter(Boolean).join(' • ') || undefined,
      };
    });

    const byCurrency = new Map<string, PortfolioPositionSnapshot[]>();
    for (const item of positions) {
      const key = item.currency || 'UNKNOWN';
      byCurrency.set(key, [...(byCurrency.get(key) || []), item]);
    }

    const buckets: PortfolioCurrencyBucket[] = [...byCurrency.entries()].map(([currency, items]) => {
      const invested = items.reduce((sum, item) => sum + item.costBasis, 0);
      const currentValue = items.reduce((sum, item) => sum + item.currentValue, 0);
      const pnlValue = items.reduce((sum, item) => sum + item.pnlValue, 0);
      const largest = [...items].sort((a, b) => b.currentValue - a.currentValue)[0];
      return {
        currency,
        positionCount: items.length,
        invested,
        currentValue,
        pnlValue,
        pnlPercent: invested > 0 ? (pnlValue / invested) * 100 : 0,
        riskFromEntryValue: items.reduce((sum, item) => sum + item.riskFromEntryValue, 0),
        downsideToStopValue: items.reduce((sum, item) => sum + item.downsideToStopValue, 0),
        largestPositionWeight: currentValue > 0 && largest ? (largest.currentValue / currentValue) * 100 : 0,
        largestPositionSymbol: largest?.symbol || null,
      };
    });

    const warnings: string[] = [];
    for (const bucket of buckets) {
      if (bucket.largestPositionWeight >= 50) warnings.push(`${bucket.largestPositionSymbol} chiếm ${bucket.largestPositionWeight.toFixed(1)}% nhóm ${bucket.currency}: mức tập trung rất cao.`);
      else if (bucket.largestPositionWeight >= 35) warnings.push(`${bucket.largestPositionSymbol} chiếm ${bucket.largestPositionWeight.toFixed(1)}% nhóm ${bucket.currency}: nên theo dõi concentration risk.`);
    }
    const degradedData = positions.filter((item) => item.dataQualityStatus && item.dataQualityStatus !== 'HEALTHY');
    if (degradedData.length) warnings.push(`${degradedData.length} vị thế có dữ liệu cần kiểm tra: ${degradedData.map((item) => item.symbol).join(', ')}.`);
    const risky = positions.filter((item) => item.action === 'EXIT_RISK' || item.action === 'REDUCE_RISK');
    if (risky.length) warnings.push(`${risky.length} vị thế đang ở trạng thái giảm rủi ro / phá mốc bảo vệ: ${risky.map((item) => item.symbol).join(', ')}.`);
    const bearish = positions.filter((item) => item.regime === 'DOWNTREND' || item.regime === 'STRONG_DOWNTREND');
    if (bearish.length >= Math.max(2, Math.ceil(positions.length / 2))) warnings.push('Nhiều vị thế cùng ở regime giảm; rủi ro tương quan danh mục có thể tăng đồng thời.');

    const status: PortfolioRiskSnapshot['status'] = risky.length >= 2 || warnings.some((item) => item.includes('rất cao')) ? 'HIGH_RISK' : warnings.length ? 'WATCH' : 'HEALTHY';
    const statusLabel = status === 'HEALTHY' ? 'Danh mục ổn định' : status === 'WATCH' ? 'Cần theo dõi' : 'Rủi ro cao';
    const result: PortfolioRiskSnapshot = {
      generatedAt: new Date().toISOString(),
      status,
      statusLabel,
      positions,
      buckets,
      profitablePositions: positions.filter((item) => item.pnlValue > 0).length,
      losingPositions: positions.filter((item) => item.pnlValue < 0).length,
      riskPositions: risky.length,
      warnings,
      notes: [
        'Không cộng trực tiếp VND với USD/USDT; MarketScope tách danh mục theo từng đồng tiền để tránh tổng vốn sai.',
        'Risk to Stop là ước lượng theo mốc bảo vệ kỹ thuật của từng Position Engine, không phải mức lỗ tối đa được đảm bảo.',
        'Dữ liệu giá vốn/số lượng chỉ được dùng trong request tính danh mục và không được lưu bởi API MarketScope.',
        'V0.13.0 giữ Data Quality theo từng vị thế; dữ liệu stale/degraded phải được kiểm tra trước khi ra quyết định.',
      ],
    };
    return NextResponse.json({ ...result, correlationId }, { headers: { 'Cache-Control': 'no-store', 'X-Correlation-Id': correlationId } });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Không thể phân tích danh mục';
    console.error('[market/portfolio]', { correlationId, message });
    return NextResponse.json({ error: message, correlationId }, { status: 502, headers: { 'X-Correlation-Id': correlationId } });
  }
}
