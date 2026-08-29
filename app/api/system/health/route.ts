import { NextResponse } from 'next/server';
import { getSystemHealth } from '@/lib/observability/health';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const correlationId = crypto.randomUUID();
  const startedAt = Date.now();
  try {
    const health = await getSystemHealth();
    return NextResponse.json({ ...health, correlationId, durationMs: Date.now() - startedAt }, {
      headers: { 'Cache-Control': 'no-store', 'X-Correlation-Id': correlationId },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Không thể chạy system diagnostics';
    console.error('[system/health]', { correlationId, message });
    return NextResponse.json({ error: message, correlationId }, { status: 502, headers: { 'Cache-Control': 'no-store', 'X-Correlation-Id': correlationId } });
  }
}
