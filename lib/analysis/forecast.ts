import type { Candle, Interval, MarketType, PriceForecast, StrategyProfileAnalysis, TechnicalAnalysis } from '@/lib/market/types';

function clamp(v:number,min:number,max:number){return Math.min(max,Math.max(min,v));}
function regressionSlope(values:number[]){ const n=values.length; if(n<2)return 0; const mx=(n-1)/2; const my=values.reduce((a,b)=>a+b,0)/n; let num=0,den=0; for(let i=0;i<n;i++){num+=(i-mx)*(values[i]-my);den+=(i-mx)**2;} return den?num/den:0; }
export function forecastGuides(interval:Interval): ReadonlyArray<readonly [string, number]>{
  if(interval==='15m') return [['1–4 giờ',4],['1–2 ngày',16],['3–7 ngày',40]] as const;
  if(interval==='1h') return [['6–24 giờ',8],['2–5 ngày',24],['1–3 tuần',72]] as const;
  if(interval==='4h') return [['1–3 ngày',6],['1–2 tuần',24],['3–8 tuần',72]] as const;
  if(interval==='1d') return [['3–7 ngày',5],['2–6 tuần',20],['2–6 tháng',60]] as const;
  return [['2–6 tuần',4],['2–6 tháng',12],['6–18 tháng',36]] as const;
}

export function forecastPriceBehavior(candles:Candle[], market:MarketType, interval:Interval, analysis:TechnicalAnalysis, strategy?:StrategyProfileAnalysis):PriceForecast{
  const closed=candles.slice(0,-1); const last=closed[closed.length-1]||candles[candles.length-1];
  const lookback=closed.slice(-Math.min(60,closed.length)); const closes=lookback.map(c=>Math.log(Math.max(c.close,1e-12)));
  const slope=regressionSlope(closes); const atrPct=(analysis.indicators.atr14.percent||0)/100; const rsi=analysis.indicators.rsi14.value||50; const macd=analysis.indicators.macd.histogram||0;
  const regimeBias=analysis.regime.direction==='BULLISH'?1:analysis.regime.direction==='BEARISH'?-1:0;
  const momentumBias=(rsi>55?0.35:rsi<45?-0.35:0)+(macd>0?0.25:macd<0?-0.25:0);
  const trendBias=clamp((slope*20)/(atrPct||0.01),-1,1);
  const composite=clamp(regimeBias*0.45+momentumBias*0.25+trendBias*0.30,-1,1);
  const confidence=Math.round(clamp(45+Math.abs(composite)*32+analysis.regime.confidence*0.18-(analysis.regime.key==='VOLATILE'?12:0),35,88));
  const horizonGuides=forecastGuides(interval);
  const labels=['Ngắn hạn','Trung hạn','Dài hạn'] as const; const keys=['SHORT','MEDIUM','LONG'] as const;
  const scenarios=horizonGuides.map(([timeGuide,bars],i)=>{
    const horizonScale=Math.sqrt(bars); const drift=clamp(slope*bars,-0.25,0.25); const strategyScale=strategy?.effective==='SHORT_TERM'?0.85:strategy?.effective==='LONG_TERM'?1.2:1;
    const expectedChange=(drift*0.7+composite*atrPct*horizonScale*0.8)*strategyScale;
    const volatility=Math.max(atrPct,market==='FOREX'?0.003:market==='STOCK'?0.012:0.02)*horizonScale;
    const expectedPrice=last.close*Math.exp(expectedChange); const rangeLow=expectedPrice*Math.exp(-volatility); const rangeHigh=expectedPrice*Math.exp(volatility);
    const threshold=(market==='FOREX'?0.0012:market==='STOCK'?0.003:0.004)*Math.sqrt(Math.max(1,bars/4)); const direction: 'UP' | 'DOWN' | 'SIDEWAYS'=expectedChange>threshold?'UP':expectedChange<-threshold?'DOWN':'SIDEWAYS';
    const probability=Math.round(clamp(50+Math.abs(composite)*28+(i===0?4:0),48,82));
    return {horizon:keys[i],label:labels[i],timeGuide,evaluationBars:bars,direction,directionLabel:direction==='UP'?'Thiên hướng tăng':direction==='DOWN'?'Thiên hướng giảm':'Thiên hướng đi ngang',probability,expectedPrice,expectedChangePercent:(expectedPrice/last.close-1)*100,rangeLow,rangeHigh,invalidationNote:'Kịch bản cần đánh giá lại nếu Market Regime/structure đảo chiều hoặc giá phá vùng invalidation của Signal Engine.',drivers:[`Regime: ${analysis.regime.label}`,`RSI ${rsi.toFixed(1)} • MACD histogram ${macd>=0?'+':''}${macd.toFixed(4)}`,`ATR ${((analysis.indicators.atr14.percent)||0).toFixed(2)}% • confidence regime ${analysis.regime.confidence}/100`]};
  });
  return {generatedAt:new Date().toISOString(),originTime:last.time,originPrice:last.close,methodology:'Scenario forecast: trend regression + regime + momentum + ATR uncertainty band. Không dùng dữ liệu tương lai.',confidence,overallBias:composite>0.18?'BULLISH':composite<-0.18?'BEARISH':'NEUTRAL',overallLabel:composite>0.18?'Thiên hướng tăng':composite<-0.18?'Thiên hướng giảm':'Trung tính / đi ngang',scenarios,disclaimer:'Dự báo là kịch bản xác suất từ dữ liệu lịch sử/kỹ thuật, không phải cam kết giá sẽ đạt mức dự kiến. Luôn dùng cùng Data Quality, SL/invalidation và quản trị rủi ro.'};
}
