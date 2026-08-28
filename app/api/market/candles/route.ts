import { NextRequest, NextResponse } from 'next/server';
import { getMarketSnapshot } from '@/lib/market/provider';
import { normalizeInputSymbol } from '@/lib/market/symbols';
import type { Interval, MarketType } from '@/lib/market/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const intervals = new Set<Interval>(['15m', '1h', '4h', '1d', '1w']);

export async function GET(request: NextRequest) {
  const marketParam = request.nextUrl.searchParams.get('market')?.toUpperCase();
  const market: MarketType = marketParam === 'STOCK' ? 'STOCK' : 'CRYPTO';
  const rawSymbol = request.nextUrl.searchParams.get('symbol') || '';
  const symbol = normalizeInputSymbol(market, rawSymbol);
  const requestedInterval = request.nextUrl.searchParams.get('interval') as Interval | null;
  const interval: Interval = requestedInterval && intervals.has(requestedInterval) ? requestedInterval : '1h';
  const correlationId = crypto.randomUUID();

  if (!symbol) {
    return NextResponse.json({ error: 'Vui lòng nhập mã tài sản', correlationId }, { status: 400 });
  }
  if (market === 'STOCK' && interval === '4h') {
    return NextResponse.json({ error: 'Chứng khoán V0.1.0 hỗ trợ 15m, 1h, 1d, 1w', correlationId }, { status: 400 });
  }

  try {
    const snapshot = await getMarketSnapshot(market, symbol, interval);
    return NextResponse.json({ ...snapshot, correlationId }, {
      headers: {
        'Cache-Control': market === 'CRYPTO' ? 's-maxage=10, stale-while-revalidate=20' : 's-maxage=30, stale-while-revalidate=60',
        'X-Correlation-Id': correlationId,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Không thể lấy dữ liệu thị trường';
    console.error('[market/candles]', { correlationId, market, symbol, interval, message });
    return NextResponse.json({ error: message, correlationId }, { status: 502, headers: { 'X-Correlation-Id': correlationId } });
  }
}
