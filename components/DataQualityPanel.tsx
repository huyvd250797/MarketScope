'use client';

import type { DataQualityReport, ProviderDiagnostics } from '@/lib/market/types';

type Props = {
  quality: DataQualityReport;
  provider?: ProviderDiagnostics;
  compact?: boolean;
};

export default function DataQualityPanel({ quality, provider, compact = false }: Props) {
  const tone = quality.status.toLowerCase().replace('_data', '').replace('_', '-');
  return (
    <details className={`data-quality-card ${tone} ${compact ? 'compact' : ''}`} open={!compact && quality.status !== 'HEALTHY'}>
      <summary>
        <div className="dq-summary-main">
          <span className={`dq-dot ${tone}`} />
          <div><strong>{quality.statusLabel}</strong><small>Quality {quality.score}/100 • {quality.signalAllowed ? 'Signal được phép' : 'Signal đang bị khóa'}</small></div>
        </div>
        <div className="dq-summary-meta">
          <span>{quality.freshness.label}</span>
          <b>{quality.candles.count} nến</b>
        </div>
      </summary>
      <div className="dq-body">
        <div className="dq-grid">
          <Metric label="Freshness" value={formatAge(quality.freshness.ageSeconds)} note={`Ngưỡng ${formatAge(quality.freshness.maxAgeSeconds)}`} />
          <Metric label="OHLC lỗi" value={String(quality.candles.invalidOhlc)} note={`${quality.candles.duplicateTimestamps} duplicate`} />
          <Metric label="Data gaps" value={String(quality.candles.largeGaps)} note={`${(quality.candles.zeroVolumeRatio * 100).toFixed(0)}% volume = 0`} />
          <Metric label="Provider" value={provider?.route || '-'} note={provider ? `${provider.latencyMs} ms` : 'Chưa có trace'} />
        </div>
        {provider && (
          <div className="dq-provider-line">
            <span>{provider.selectedProvider}</span>
            <b>{provider.requestedMode}</b>
            {provider.fallbackUsed && <em>FALLBACK</em>}
          </div>
        )}
        {provider?.fallbackReason && <p className="dq-warning">⚠ {provider.fallbackReason}</p>}
        {quality.blockers.map((item) => <p className="dq-blocker" key={item}>! {item}</p>)}
        {quality.warnings.map((item) => <p className="dq-warning" key={item}>• {item}</p>)}
        {!quality.blockers.length && !quality.warnings.length && <p className="dq-ok">✓ Freshness, OHLC, timestamp và số lượng nến đều đạt guardrail hiện tại.</p>}
      </div>
    </details>
  );
}

function Metric({ label, value, note }: { label: string; value: string; note: string }) {
  return <div className="dq-metric"><span>{label}</span><strong>{value}</strong><small>{note}</small></div>;
}

function formatAge(seconds: number) {
  if (!Number.isFinite(seconds)) return '-';
  if (seconds < 60) return `${Math.max(0, Math.round(seconds))}s`;
  if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
  if (seconds < 86_400) return `${Math.round(seconds / 3600)}h`;
  return `${Math.round(seconds / 86_400)}d`;
}
