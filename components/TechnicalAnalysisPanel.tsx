'use client';

import type { CSSProperties } from 'react';
import type { MarketSnapshot, TechnicalAnalysis } from '@/lib/market/types';

type Props = {
  analysis: TechnicalAnalysis;
  snapshot: MarketSnapshot;
};

export default function TechnicalAnalysisPanel({ analysis, snapshot }: Props) {
  const { regime, indicators } = analysis;
  const tone = regime.direction === 'BULLISH' ? 'bullish' : regime.direction === 'BEARISH' ? 'bearish' : 'neutral';
  const digits = snapshot.currency === 'VND' ? 0 : snapshot.currentPrice >= 1000 ? 2 : 6;

  return (
    <section className="analysis-card">
      <div className="analysis-title-row">
        <div>
          <h2>Market Regime</h2>
          <span>EMA • RSI • MACD • ADX • ATR • VWAP • Structure</span>
        </div>
        <span className="analysis-sample">{analysis.sampleSize} nến</span>
      </div>

      <div className={`regime-summary ${tone}`}>
        <div className="regime-main">
          <span className="regime-eyebrow">TRẠNG THÁI THỊ TRƯỜNG</span>
          <strong>{regime.label}</strong>
          <p>{regime.description}</p>
        </div>
        <div className="confidence-ring" style={{ '--confidence': `${regime.confidence * 3.6}deg` } as CSSProperties}>
          <div><strong>{regime.confidence}</strong><span>/100</span></div>
        </div>
      </div>

      <div className="regime-meta-grid">
        <MiniMetric label="Hướng" value={regime.direction === 'BULLISH' ? 'Tăng' : regime.direction === 'BEARISH' ? 'Giảm' : 'Trung tính'} tone={tone} />
        <MiniMetric label="Cấu trúc" value={formatStructure(regime.structure)} />
        <MiniMetric label="EMA" value={indicators.ema.status} />
        <MiniMetric label="ADX" value={valueOrDash(indicators.adx14.value, 1)} suffix={indicators.adx14.value == null ? '' : ''} />
      </div>

      <div className="indicator-grid">
        <IndicatorCard
          title="EMA 20 / 50 / 200"
          value={`${formatPrice(indicators.ema.ema20, digits)} / ${formatPrice(indicators.ema.ema50, digits)} / ${formatPrice(indicators.ema.ema200, digits)}`}
          status={indicators.ema.status}
          detail={`Slope EMA20: ${signed(indicators.ema.slope20Percent, 2)}%`}
        />
        <IndicatorCard
          title="RSI 14"
          value={valueOrDash(indicators.rsi14.value, 1)}
          status={indicators.rsi14.status}
          meter={indicators.rsi14.value}
          meterMax={100}
        />
        <IndicatorCard
          title="MACD 12-26-9"
          value={formatPrice(indicators.macd.value, Math.min(6, digits + 2))}
          status={indicators.macd.status}
          detail={`Histogram: ${signed(indicators.macd.histogram, Math.min(6, digits + 2))}`}
        />
        <IndicatorCard
          title="ADX 14"
          value={valueOrDash(indicators.adx14.value, 1)}
          status={indicators.adx14.status}
          detail={`+DI ${valueOrDash(indicators.adx14.plusDI, 1)} • -DI ${valueOrDash(indicators.adx14.minusDI, 1)}`}
          meter={indicators.adx14.value}
          meterMax={60}
        />
        <IndicatorCard
          title="ATR 14"
          value={formatPrice(indicators.atr14.value, digits)}
          status={indicators.atr14.status}
          detail={`${valueOrDash(indicators.atr14.percent, 2)}% giá hiện tại`}
        />
        <IndicatorCard
          title="VWAP"
          value={formatPrice(indicators.vwap.value, digits)}
          status={indicators.vwap.status}
          detail={`Khoảng cách: ${signed(indicators.vwap.distancePercent, 2)}%`}
        />
      </div>

      <div className="analysis-note">
        <span>i</span>
        <p>V0.2.0 chỉ phân loại xu hướng, động lượng và biến động. <b>Chưa tạo Entry / SL / TP hay xác suất thắng</b>; các phần đó thuộc các phiên bản tiếp theo theo roadmap.</p>
      </div>
    </section>
  );
}

function MiniMetric({ label, value, tone = 'neutral', suffix = '' }: { label: string; value: string; tone?: string; suffix?: string }) {
  return <div className={`regime-mini ${tone}`}><span>{label}</span><strong>{value}{suffix}</strong></div>;
}

function IndicatorCard({ title, value, status, detail, meter, meterMax = 100 }: { title: string; value: string; status: string; detail?: string; meter?: number | null; meterMax?: number }) {
  const width = meter == null ? 0 : Math.max(0, Math.min(100, (meter / meterMax) * 100));
  return (
    <article className="indicator-card">
      <span className="indicator-title">{title}</span>
      <strong className="indicator-value">{value}</strong>
      <span className="indicator-status">{status}</span>
      {detail && <small>{detail}</small>}
      {meter != null && <div className="indicator-meter"><i style={{ width: `${width}%` }} /></div>}
    </article>
  );
}

function formatStructure(value: TechnicalAnalysis['regime']['structure']) {
  if (value === 'HH_HL') return 'HH / HL';
  if (value === 'LH_LL') return 'LH / LL';
  if (value === 'RANGE') return 'Range';
  return 'Chưa rõ';
}

function formatPrice(value: number | null, digits: number) {
  if (value == null || !Number.isFinite(value)) return '-';
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: Math.max(0, digits) }).format(value);
}

function valueOrDash(value: number | null, digits: number) {
  return value == null || !Number.isFinite(value) ? '-' : value.toFixed(digits);
}

function signed(value: number | null, digits: number) {
  if (value == null || !Number.isFinite(value)) return '-';
  return `${value > 0 ? '+' : ''}${value.toFixed(digits)}`;
}
