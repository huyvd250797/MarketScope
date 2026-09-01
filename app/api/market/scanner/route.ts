import { NextRequest, NextResponse } from 'next/server';
import { analyzeOpportunity } from '@/lib/analysis/opportunity';
import { normalizeStrategyProfile } from '@/lib/analysis/strategy';
import { getMarketSnapshot } from '@/lib/market/provider';
import { cryptoSymbols, forexSymbols, stockSymbols } from '@/lib/market/symbols';
import type {
  Interval,
  MarketSnapshot,
  MarketType,
  OpportunityScannerItem,
  OpportunityScannerResponse,
  ScannerMarketFilter,
  ScannerScope,
  StrategyProfileKey,
} from '@/lib/market/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

type UniverseItem = { market: MarketType; symbol: string; interval: Interval };
type Candidate = { snapshot: MarketSnapshot; item: OpportunityScannerItem };

function parseMarket(value: string | null): ScannerMarketFilter {
  const key = String(value || 'ALL').toUpperCase();
  return key === 'CRYPTO' || key === 'STOCK' || key === 'FOREX' ? key : 'ALL';
}

function parseScope(value: string | null): ScannerScope {
  return String(value || 'QUICK').toUpperCase() === 'WIDE' ? 'WIDE' : 'QUICK';
}

function intervalFor(market: MarketType, profile: StrategyProfileKey): Interval {
  if (profile === 'SHORT_TERM') return '1h';
  if (profile === 'LONG_TERM') return '1w';
  if (profile === 'MEDIUM_TERM') return '1d';
  if (profile === 'SWING') return market === 'STOCK' ? '1d' : '4h';
  return market === 'STOCK' ? '1d' : '4h';
}

function buildUniverse(filter: ScannerMarketFilter, scope: ScannerScope, profile: StrategyProfileKey): UniverseItem[] {
  const singleCount = scope === 'WIDE' ? 12 : 8;
  const mixedCount = scope === 'WIDE' ? 6 : 4;
  const take = (market: MarketType, count: number) => {
    const source = market === 'CRYPTO' ? cryptoSymbols : market === 'STOCK' ? stockSymbols : forexSymbols;
    const priority = market === 'FOREX'
      ? ['XAUUSD', 'EURUSD', 'GBPUSD', 'USDJPY', 'USDCHF', 'AUDUSD', 'USDCAD', 'GBPJPY', 'EURJPY', 'XAGUSD', 'EURGBP', 'NZDUSD']
      : market === 'STOCK'
        ? ['FPT', 'HPG', 'VNM', 'VCB', 'MBB', 'TCB', 'MWG', 'SSI', 'DGC', 'GAS', 'VHM', 'PNJ']
        : ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT', 'XRPUSDT', 'LINKUSDT', 'AVAXUSDT', 'SUIUSDT', 'DOGEUSDT', 'ADAUSDT', 'LTCUSDT', 'BCHUSDT'];
    const ranked = priority.map((symbol) => source.find((item) => item.symbol === symbol)).filter((item): item is (typeof source)[number] => Boolean(item));
    return ranked.slice(0, count).map((item) => ({ market, symbol: item.symbol, interval: intervalFor(market, profile) }));
  };

  if (filter === 'CRYPTO' || filter === 'STOCK' || filter === 'FOREX') return take(filter, singleCount);
  return [...take('CRYPTO', mixedCount), ...take('STOCK', mixedCount), ...take('FOREX', mixedCount)];
}

async function mapWithConcurrency<T, R>(items: T[], concurrency: number, worker: (item: T) => Promise<R>): Promise<R[]> {
  const result: R[] = [];
  let index = 0;
  async function run() {
    while (index < items.length) {
      const current = items[index++];
      result.push(await worker(current));
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, () => run()));
  return result;
}

export async function GET(request: NextRequest) {
  const startedAt = Date.now();
  const marketFilter = parseMarket(request.nextUrl.searchParams.get('market'));
  const scope = parseScope(request.nextUrl.searchParams.get('scope'));
  const requestedProfile = normalizeStrategyProfile(request.nextUrl.searchParams.get('profile'));
  const requestedLimit = Number(request.nextUrl.searchParams.get('limit') || '8');
  const limit = Math.max(3, Math.min(12, Number.isFinite(requestedLimit) ? Math.round(requestedLimit) : 8));
  const universe = buildUniverse(marketFilter, scope, requestedProfile);
  const errors: OpportunityScannerResponse['errors'] = [];

  const scanned = await mapWithConcurrency(universe, 3, async (target): Promise<Candidate | null> => {
    try {
      const snapshot = await getMarketSnapshot(target.market, target.symbol, target.interval);
      const item = analyzeOpportunity(snapshot, requestedProfile, { validationOrigins: 0 });
      return { snapshot, item };
    } catch (error) {
      errors.push({ market: target.market, symbol: target.symbol, message: error instanceof Error ? error.message : 'Không thể phân tích' });
      return null;
    }
  });

  const preliminary = scanned.filter((entry): entry is Candidate => entry != null)
    .sort((a, b) => b.item.opportunity.score - a.item.opportunity.score);

  if (preliminary.length === 0) {
    return NextResponse.json({
      error: 'Scanner không lấy được dữ liệu từ các provider trong universe hiện tại.',
      generatedAt: new Date().toISOString(),
      marketFilter, requestedProfile, scope, universeSize: universe.length, scannedCount: 0, failedCount: errors.length, errors: errors.slice(0, 8),
    }, { status: 502, headers: { 'Cache-Control': 'no-store' } });
  }

  const enrichCount = Math.min(preliminary.length, Math.max(limit, Math.min(12, limit + 4)));
  const validationOrigins = scope === 'WIDE' ? 14 : 10;
  const enriched = await mapWithConcurrency(preliminary.slice(0, enrichCount), 2, async (candidate): Promise<OpportunityScannerItem> => {
    try {
      return analyzeOpportunity(candidate.snapshot, requestedProfile, { validationOrigins });
    } catch {
      return candidate.item;
    }
  });

  // Chỉ trả các ứng viên đã qua tầng validation. Shortlist rộng hơn limit để historical metrics
  // có thể thay đổi thứ hạng mà không làm card Top thiếu Forecast Accuracy.
  const items = enriched
    .sort((a, b) => b.opportunity.score - a.opportunity.score || b.signal.score - a.signal.score)
    .slice(0, limit);

  const payload: OpportunityScannerResponse = {
    generatedAt: new Date().toISOString(),
    marketFilter,
    requestedProfile,
    scope,
    universeSize: universe.length,
    scannedCount: preliminary.length,
    failedCount: errors.length,
    durationMs: Math.max(0, Date.now() - startedAt),
    items,
    errors: errors.slice(0, 8),
    methodology: [
      'Scanner chạy hai tầng: quét nhanh toàn universe rồi chạy Forecast Validation causal cho nhóm ứng viên tốt nhất.',
      'Opportunity Score = Signal 32% + Forecast 20% + Historical 18% + Risk/Reward 15% + Data Quality 15%.',
      'WAIT/AVOID, R:R thấp hoặc Data Quality không đạt sẽ bị giới hạn điểm để không đứng đầu chỉ nhờ một chỉ số đẹp.',
      'Crypto vẫn Spot/LONG-only; Forex chỉ phân tích; Scanner không tự đặt lệnh.',
    ],
  };

  return NextResponse.json(payload, {
    headers: {
      'Cache-Control': 's-maxage=30, stale-while-revalidate=60',
      'X-Scanner-Count': String(payload.scannedCount),
      'X-Scanner-Duration-Ms': String(payload.durationMs),
    },
  });
}
