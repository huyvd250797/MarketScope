import type { MarketSnapshot, PriceForecast } from '@/lib/market/types';

export default function ForecastPanel({ forecast, snapshot }: { forecast: PriceForecast; snapshot: MarketSnapshot }) {
  const digits = snapshot.currency === 'VND' ? 0 : snapshot.currentPrice >= 1000 ? 2 : 5;
  const fmt=(v:number)=>new Intl.NumberFormat(snapshot.currency==='VND'?'vi-VN':'en-US',{maximumFractionDigits:digits}).format(v);
  return (
    <section className="forecast-card">
      <div className="section-title-row"><div><h2>Dự báo hành vi giá</h2><span>Kịch bản xác suất theo nhiều mốc thời gian</span></div><span className={`forecast-bias ${forecast.overallBias.toLowerCase()}`}>{forecast.overallLabel}</span></div>
      <div className="forecast-summary"><strong>Confidence {forecast.confidence}/100</strong><span>{forecast.methodology}</span></div>
      <div className="forecast-grid">
        {forecast.scenarios.map((item)=><article key={item.horizon} className="forecast-item">
          <div className="forecast-item-head"><div><small>{item.label}</small><strong>{item.timeGuide}</strong></div><span className={item.direction.toLowerCase()}>{item.directionLabel}</span></div>
          <div className="forecast-price"><strong>{fmt(item.expectedPrice)}</strong><em className={item.expectedChangePercent>=0?'gain':'loss'}>{item.expectedChangePercent>=0?'+':''}{item.expectedChangePercent.toFixed(2)}%</em></div>
          <div className="forecast-range"><span>Vùng xác suất</span><b>{fmt(item.rangeLow)} – {fmt(item.rangeHigh)}</b></div>
          <div className="forecast-prob"><span style={{width:`${item.probability}%`}}/><small>Xác suất hướng: {item.probability}%</small></div>
          <details><summary>Yếu tố chính</summary>{item.drivers.map(x=><p key={x}>• {x}</p>)}<p>• {item.invalidationNote}</p></details>
        </article>)}
      </div>
      <p className="forecast-disclaimer">{forecast.disclaimer}</p>
    </section>
  );
}
