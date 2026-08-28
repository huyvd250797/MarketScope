import { NextRequest, NextResponse } from 'next/server';
import { normalizeInputSymbol, searchLocalSymbols } from '@/lib/market/symbols';
import type { MarketType } from '@/lib/market/types';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const marketParam = request.nextUrl.searchParams.get('market')?.toUpperCase();
  const q = request.nextUrl.searchParams.get('q') || '';
  const market: MarketType = marketParam === 'STOCK' ? 'STOCK' : 'CRYPTO';
  const results = searchLocalSymbols(market, q, 8);
  const normalized = normalizeInputSymbol(market, q);

  if (q.trim() && normalized && !results.some((item) => item.symbol === normalized)) {
    results.unshift({
      symbol: normalized,
      name: market === 'CRYPTO' ? `${normalized} (custom pair)` : `${normalized} (mã nhập tay)`,
      exchange: market === 'CRYPTO' ? 'Binance' : 'VN',
      market,
    });
  }

  return NextResponse.json({ market, query: q, results: results.slice(0, 8) }, {
    headers: { 'Cache-Control': 'public, max-age=60, stale-while-revalidate=300' },
  });
}
