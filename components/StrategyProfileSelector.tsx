'use client';

import type { MarketType, StrategyProfileAnalysis, StrategyProfileKey } from '@/lib/market/types';

const options: Array<{ key: StrategyProfileKey; label: string; compact: string }> = [
  { key: 'AUTO', label: 'AUTO', compact: 'AUTO' },
  { key: 'SHORT_TERM', label: 'Ngắn hạn', compact: 'Ngắn' },
  { key: 'SWING', label: 'Swing', compact: 'Swing' },
  { key: 'MEDIUM_TERM', label: 'Trung hạn', compact: 'Trung' },
  { key: 'LONG_TERM', label: 'Dài hạn', compact: 'Dài' },
];

type Props = {
  value: StrategyProfileKey;
  strategy?: StrategyProfileAnalysis;
  market: MarketType;
  onChange: (value: StrategyProfileKey) => void;
};

export default function StrategyProfileSelector({ value, strategy, market, onChange }: Props) {
  return (
    <section className="strategy-card">
      <div className="strategy-head">
        <div>
          <span className="strategy-eyebrow">STRATEGY PROFILE</span>
          <strong>{strategy ? `${value === 'AUTO' ? 'AUTO → ' : ''}${strategy.effectiveLabel}` : profileLabel(value)}</strong>
          <small>{strategy?.holdingGuide || 'Chọn horizon để hiệu chỉnh Entry / SL / TP / Backtest'}</small>
        </div>
        {strategy && <span className={`strategy-fit ${strategy.timeframeFit.toLowerCase()}`}>{strategy.timeframeFitLabel}</span>}
      </div>

      <div className="strategy-tabs" role="tablist" aria-label="Chọn chiến lược phân tích">
        {options.map((item) => (
          <button key={item.key} className={value === item.key ? 'active' : ''} onClick={() => onChange(item.key)} title={item.label}>
            <span className="strategy-label-full">{item.label}</span><span className="strategy-label-compact">{item.compact}</span>
          </button>
        ))}
      </div>

      {strategy && (
        <div className="strategy-smart-strip">
          <div>
            <span>{value === 'AUTO' ? 'SMART ANALYSIS' : 'AUTO ĐỀ XUẤT'}</span>
            <strong>{strategy.recommendedLabel}</strong>
          </div>
          <div><span>Confidence</span><strong>{strategy.confidence}/100</strong></div>
          <div><span>Timeframe ưu tiên</span><strong>{strategy.preferredIntervals.map(formatInterval).join(' / ')}</strong></div>
        </div>
      )}

      {strategy && (
        <details className="strategy-details">
          <summary>Vì sao chọn profile này?</summary>
          <div>
            <p>{strategy.description}</p>
            {strategy.rationale.map((item) => <p key={item}>• {item}</p>)}
            <p>• {market === 'CRYPTO' ? 'Crypto Spot' : market === 'FOREX' ? 'Forex' : 'Stock VN'} • LONG-only • không leverage.</p>
          </div>
        </details>
      )}
    </section>
  );
}

export function profileLabel(value: StrategyProfileKey) {
  if (value === 'SHORT_TERM') return 'Ngắn hạn';
  if (value === 'SWING') return 'Swing';
  if (value === 'MEDIUM_TERM') return 'Trung hạn';
  if (value === 'LONG_TERM') return 'Dài hạn';
  return 'AUTO';
}

export function effectiveProfileLabel(value?: string) {
  if (value === 'SHORT_TERM') return 'Ngắn hạn';
  if (value === 'SWING') return 'Swing';
  if (value === 'MEDIUM_TERM') return 'Trung hạn';
  if (value === 'LONG_TERM') return 'Dài hạn';
  return value || '-';
}

function formatInterval(value: string) {
  return value === '1d' ? '1D' : value === '1w' ? '1W' : value;
}
