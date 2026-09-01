import type { ForecastValidationResult, MarketSnapshot, PriceForecast } from '@/lib/market/types';

function pct(value: number | null | undefined, digits = 1) {
  return value == null || !Number.isFinite(value) ? '—' : `${value.toFixed(digits)}%`;
}

export default function ForecastPanel({ forecast, validation, snapshot }: { forecast: PriceForecast; validation?: ForecastValidationResult; snapshot: MarketSnapshot }) {
  const digits = snapshot.currency === 'VND' ? 0 : snapshot.currentPrice >= 1000 ? 2 : 5;
  const fmt = (v:number) => new Intl.NumberFormat(snapshot.currency === 'VND' ? 'vi-VN' : 'en-US', { maximumFractionDigits: digits }).format(v);
  const calibrated = forecast.calibratedConfidence ?? forecast.confidence;
  const raw = forecast.rawConfidence ?? forecast.confidence;

  return (
    <section className="forecast-card">
      <div className="section-title-row">
        <div><h2>Dự báo hành vi giá</h2><span>Kịch bản xác suất + kiểm chứng lịch sử causal</span></div>
        <span className={`forecast-bias ${forecast.overallBias.toLowerCase()}`}>{forecast.overallLabel}</span>
      </div>

      <div className="forecast-confidence-grid">
        <div className="forecast-confidence-main">
          <small>CONFIDENCE ĐÃ HIỆU CHỈNH</small>
          <strong>{calibrated}/100</strong>
          <span>{forecast.calibration?.qualityLabel || 'Chưa có calibration'}</span>
        </div>
        <div className="forecast-confidence-side">
          <div><span>Raw confidence</span><b>{raw}/100</b></div>
          <div><span>Direction accuracy</span><b>{pct(validation?.overall.calibratedDirectionAccuracy)}</b></div>
          <div><span>Range hit</span><b>{pct(validation?.overall.rangeHitRate)}</b></div>
          <div><span>Mẫu kiểm chứng</span><b>{validation?.evaluatedScenarios ?? 0}</b></div>
        </div>
      </div>

      <div className="forecast-summary"><strong>{forecast.methodology}</strong><span>Historical accuracy không phải xác suất chắc chắn của forecast hiện tại.</span></div>

      <div className="forecast-grid">
        {forecast.scenarios.map((item) => {
          const metrics = validation?.horizons[item.horizon];
          const calibratedProbability = item.calibratedProbability ?? item.probability;
          return <article key={item.horizon} className="forecast-item">
            <div className="forecast-item-head"><div><small>{item.label}</small><strong>{item.timeGuide}</strong></div><span className={item.direction.toLowerCase()}>{item.directionLabel}</span></div>
            <div className="forecast-price"><strong>{fmt(item.expectedPrice)}</strong><em className={item.expectedChangePercent>=0?'gain':'loss'}>{item.expectedChangePercent>=0?'+':''}{item.expectedChangePercent.toFixed(2)}%</em></div>
            <div className="forecast-range"><span>Vùng xác suất</span><b>{fmt(item.rangeLow)} – {fmt(item.rangeHigh)}</b></div>
            <div className="forecast-prob"><span style={{width:`${calibratedProbability}%`}}/><small>Directional confidence: {calibratedProbability}% {item.rawProbability != null && item.rawProbability !== calibratedProbability ? `(raw ${item.rawProbability}%)` : ''}</small></div>

            <div className="forecast-history-mini">
              <div><span>Đúng hướng</span><b>{pct(metrics?.calibratedDirectionAccuracy)}</b></div>
              <div><span>Trong vùng</span><b>{pct(metrics?.rangeHitRate)}</b></div>
              <div><span>Sai số TB</span><b>{pct(metrics?.avgAbsoluteErrorPercent)}</b></div>
              <div><span>Mẫu</span><b>{metrics?.samples ?? 0}</b></div>
            </div>

            <details><summary>Yếu tố chính & phương pháp</summary>{item.drivers.map(x=><p key={x}>• {x}</p>)}<p>• {item.invalidationNote}</p>{metrics && <p>• Historical calibration gap: {pct(metrics.calibrationGap)}.</p>}</details>
          </article>;
        })}
      </div>

      {validation && <details className="forecast-validation-detail">
        <summary>Xem phương pháp Forecast Validation</summary>
        {validation.methodology.map((item) => <p key={item}>• {item}</p>)}
        <p>• Validation origins: {validation.sampleOrigins} • scenarios: {validation.evaluatedScenarios}.</p>
      </details>}
      <p className="forecast-disclaimer">{forecast.disclaimer}</p>
    </section>
  );
}
