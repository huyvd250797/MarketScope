'use client';

import type { CSSProperties } from 'react';
import type { MarketSnapshot, TradeSignal } from '@/lib/market/types';

type Props = {
  signal: TradeSignal;
  snapshot: MarketSnapshot;
};

export default function SignalPanel({ signal, snapshot }: Props) {
  const tone = signal.decision === 'BUY' ? 'buy' : signal.decision === 'AVOID' ? 'avoid' : 'wait';
  const digits = snapshot.currency === 'VND' ? 0 : snapshot.currentPrice >= 1000 ? 2 : 6;

  return (
    <section className={`signal-card ${tone}`}>
      <div className="signal-title-row">
        <div>
          <h2>Trade Setup</h2>
          <span>{signal.strategy.label} • {signal.strategy.holdingGuide} • LONG-only • Entry / SL / TP</span>
        </div>
        <span className={`decision-pill ${tone}`}>{signal.decisionLabel}</span>
      </div>

      <div className={`signal-hero ${tone}`}>
        <div className="signal-hero-copy">
          <span className="signal-eyebrow">TÍN HIỆU HIỆN TẠI</span>
          <strong>{signal.setupLabel}</strong>
          <p>{decisionDescription(signal)}</p>
          <div className="signal-badges">
            <span>Score {signal.score}/100</span>
            <span>{signal.scoreLabel}</span>
            <span>{signal.dataSufficient ? 'Đủ dữ liệu' : 'Thiếu dữ liệu'}</span>
            <span>{signal.strategy.label}</span>
          </div>
        </div>
        <div className="signal-score" style={{ '--score': `${signal.score * 3.6}deg` } as CSSProperties}>
          <div><strong>{signal.score}</strong><span>/100</span></div>
        </div>
      </div>

      {signal.entryZone && signal.stopLoss ? (
        <>
          <div className="trade-level-grid">
            <LevelCard label="ENTRY LOW" value={formatPrice(signal.entryZone.low, digits)} tone="entry" />
            <LevelCard label="ENTRY HIGH" value={formatPrice(signal.entryZone.high, digits)} tone="entry" />
            <LevelCard label="STOP LOSS" value={formatPrice(signal.stopLoss.price, digits)} tone="stop" detail={`Risk ~${signal.stopLoss.riskPercent.toFixed(2)}%`} />
            <LevelCard label="R:R TP2" value={signal.riskReward.toTP2 == null ? '-' : `${signal.riskReward.toTP2.toFixed(2)}R`} tone="rr" />
          </div>

          <div className="target-grid">
            {signal.targets.map((target) => (
              <article className="target-card" key={target.key}>
                <div><span>{target.key}</span><em>{target.rewardRisk.toFixed(2)}R</em></div>
                <strong>{formatPrice(target.price, digits)}</strong>
                <small>+{target.profitPercent.toFixed(2)}% từ midpoint Entry</small>
              </article>
            ))}
          </div>

          <div className="entry-note"><span>⌖</span><p>{signal.entryZone.note}</p></div>
        </>
      ) : (
        <div className="no-entry-box">
          <strong>Không phát sinh vùng mua mới</strong>
          <p>Engine đang ưu tiên bảo toàn vốn. Entry/SL/TP chỉ xuất hiện khi có setup LONG đủ điều kiện cơ bản.</p>
        </div>
      )}

      <div className="score-breakdown">
        <h3>Signal Score breakdown</h3>
        <ScoreBar label="Trend" value={signal.breakdown.trend} max={25} />
        <ScoreBar label="Momentum" value={signal.breakdown.momentum} max={20} />
        <ScoreBar label="Structure" value={signal.breakdown.structure} max={20} />
        <ScoreBar label="Entry location" value={signal.breakdown.location} max={20} />
        <ScoreBar label="Risk quality" value={signal.breakdown.risk} max={15} />
      </div>

      <div className="signal-context-grid">
        <ContextMetric label="Support" value={formatNullable(signal.context.support, digits)} />
        <ContextMetric label="Resistance" value={formatNullable(signal.context.resistance, digits)} />
        <ContextMetric label="ATR" value={formatNullable(signal.context.atr, digits)} />
        <ContextMetric label="Volume" value={signal.context.volumeRatio == null ? '-' : `${signal.context.volumeRatio.toFixed(2)}x`} />
      </div>

      {(signal.positiveFactors.length > 0 || signal.warnings.length > 0) && (
        <div className="signal-reason-grid">
          <div className="signal-list positive">
            <strong>Điểm ủng hộ</strong>
            {signal.positiveFactors.length ? signal.positiveFactors.slice(0, 5).map((item) => <p key={item}>✓ {item}</p>) : <p>Chưa có yếu tố nổi bật.</p>}
          </div>
          <div className="signal-list warning">
            <strong>Cảnh báo / lý do chờ</strong>
            {signal.warnings.length ? signal.warnings.slice(0, 6).map((item) => <p key={item}>! {item}</p>) : <p>Không có cảnh báo kỹ thuật lớn.</p>}
          </div>
        </div>
      )}

      <details className="signal-details">
        <summary>Invalidation & guardrails</summary>
        <div className="details-body">
          <strong>Setup mất hiệu lực khi</strong>
          {signal.invalidation.map((item) => <p key={item}>• {item}</p>)}
          <strong>Guardrails hiện hành</strong>
          {signal.guardrails.map((item) => <p key={item}>• {item}</p>)}
        </div>
      </details>

      <div className="signal-disclaimer"><span>i</span><p>{signal.disclaimer}</p></div>
    </section>
  );
}

function decisionDescription(signal: TradeSignal) {
  if (signal.decisionLabel === 'DATA STALE') return 'Dữ liệu thị trường đã vượt ngưỡng freshness. V0.10.0 khóa Entry/SL/TP cho tới khi provider trả dữ liệu mới.';
  if (signal.decisionLabel === 'DATA CHECK') return 'Data Quality Guard phát hiện dữ liệu chưa đạt điều kiện an toàn. Tín hiệu mở vị thế mới đang bị khóa.';
  if (signal.decision === 'BUY') return 'Các rule kỹ thuật đang đồng thuận và giá còn nằm trong/đủ gần vùng Entry. Đây là setup tham khảo, không phải cam kết lợi nhuận.';
  if (signal.decision === 'AVOID') return 'Một hoặc nhiều guardrail rủi ro đang bị vi phạm. Engine LONG-only ưu tiên không mở vị thế mới.';
  return signal.entryZone
    ? 'Setup đang hình thành nhưng chưa đủ điều kiện thực thi hoặc giá chưa ở vị trí phù hợp. Ưu tiên chờ thay vì mua đuổi.'
    : 'Chưa có setup LONG rõ ràng theo rule hiện tại.';
}

function LevelCard({ label, value, tone, detail }: { label: string; value: string; tone: string; detail?: string }) {
  return <article className={`trade-level ${tone}`}><span>{label}</span><strong>{value}</strong>{detail && <small>{detail}</small>}</article>;
}

function ScoreBar({ label, value, max }: { label: string; value: number; max: number }) {
  const width = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div className="score-row">
      <div><span>{label}</span><strong>{value}/{max}</strong></div>
      <div className="score-track"><i style={{ width: `${width}%` }} /></div>
    </div>
  );
}

function ContextMetric({ label, value }: { label: string; value: string }) {
  return <div className="signal-context"><span>{label}</span><strong>{value}</strong></div>;
}

function formatPrice(value: number, digits: number) {
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: Math.max(0, digits) }).format(value);
}

function formatNullable(value: number | null, digits: number) {
  if (value == null || !Number.isFinite(value)) return '-';
  return formatPrice(value, digits);
}
