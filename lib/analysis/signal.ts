import type { Candle, MarketType, TechnicalAnalysis, TradeSignal } from '@/lib/market/types';

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

const round = (value: number | null, digits = 8): number | null => {
  if (value == null || !Number.isFinite(value)) return null;
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
};

function average(values: number[]) {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function recentPivotLevels(candles: Candle[], radius = 2) {
  const window = candles.slice(-100, -1);
  const highs: number[] = [];
  const lows: number[] = [];

  for (let i = radius; i < window.length - radius; i += 1) {
    const sample = window.slice(i - radius, i + radius + 1);
    if (window[i].high >= Math.max(...sample.map((c) => c.high))) highs.push(window[i].high);
    if (window[i].low <= Math.min(...sample.map((c) => c.low))) lows.push(window[i].low);
  }

  return { highs, lows };
}

function nearestBelow(values: Array<number | null | undefined>, price: number): number | null {
  const valid = values.filter((value): value is number => value != null && Number.isFinite(value) && value < price);
  if (!valid.length) return null;
  return Math.max(...valid);
}

function nearestAbove(values: Array<number | null | undefined>, price: number): number | null {
  const valid = values.filter((value): value is number => value != null && Number.isFinite(value) && value > price);
  if (!valid.length) return null;
  return Math.min(...valid);
}

function signalLabel(score: number) {
  if (score >= 85) return 'Đồng thuận rất cao';
  if (score >= 72) return 'Đồng thuận cao';
  if (score >= 58) return 'Đồng thuận trung bình';
  return 'Đồng thuận thấp';
}

export function analyzeTradeSignal(candles: Candle[], market: MarketType, analysis: TechnicalAnalysis): TradeSignal {
  const current = candles[candles.length - 1];
  const currentPrice = current?.close ?? 0;
  const atr = analysis.indicators.atr14.value ?? (currentPrice > 0 ? currentPrice * (market === 'CRYPTO' ? 0.02 : 0.015) : 0);
  const atrPercent = analysis.indicators.atr14.percent;
  const ema20 = analysis.indicators.ema.ema20;
  const ema50 = analysis.indicators.ema.ema50;
  const vwap = analysis.indicators.vwap.value;
  const rsi = analysis.indicators.rsi14.value;
  const macdHistogram = analysis.indicators.macd.histogram;
  const adx = analysis.indicators.adx14.value;
  const plusDI = analysis.indicators.adx14.plusDI;
  const minusDI = analysis.indicators.adx14.minusDI;
  const dataSufficient = candles.length >= 220 && analysis.indicators.ema.ema200 != null && atr > 0;

  const pivots = recentPivotLevels(candles);
  const fallbackSupport = candles.length > 12 ? Math.min(...candles.slice(-20, -1).map((c) => c.low)) : null;
  const fallbackResistance = candles.length > 12 ? Math.max(...candles.slice(-20, -1).map((c) => c.high)) : null;
  const pivotSupport = nearestBelow(pivots.lows, currentPrice) ?? fallbackSupport;
  const pivotResistance = nearestAbove(pivots.highs, currentPrice) ?? fallbackResistance;
  const resistanceBefore = candles.length > 22 ? Math.max(...candles.slice(-22, -2).map((c) => c.high)) : fallbackResistance;

  const recentVolumes = candles.slice(-21, -1).map((c) => c.volume).filter((v) => Number.isFinite(v) && v > 0);
  const avgVolume = average(recentVolumes);
  const volumeRatio = avgVolume > 0 ? current.volume / avgVolume : null;
  const breakout = resistanceBefore != null && currentPrice > resistanceBefore + atr * 0.05 && (volumeRatio ?? 0) >= 1.15;

  const dynamicSupport = nearestBelow([ema20, vwap, pivotSupport], currentPrice);
  const rangeSupport = pivotSupport ?? fallbackSupport;
  const rangeDistanceAtr = rangeSupport != null && atr > 0 ? (currentPrice - rangeSupport) / atr : null;

  let setup: TradeSignal['setup'] = 'NO_SETUP';
  let setupLabel = 'Chưa có setup rõ ràng';
  if (breakout && analysis.regime.direction !== 'BEARISH') {
    setup = 'BREAKOUT';
    setupLabel = 'Breakout có xác nhận khối lượng';
  } else if (analysis.regime.direction === 'BULLISH') {
    setup = 'TREND_PULLBACK';
    setupLabel = 'Pullback theo xu hướng tăng';
  } else if (analysis.regime.key === 'RANGE' && rangeDistanceAtr != null && rangeDistanceAtr <= 1.1 && (rsi ?? 50) <= 58) {
    setup = 'RANGE_REBOUND';
    setupLabel = 'Phản ứng tại hỗ trợ trong vùng đi ngang';
  }

  let entryCenter = currentPrice;
  if (setup === 'BREAKOUT' && resistanceBefore != null) {
    entryCenter = resistanceBefore + atr * 0.1;
  } else if (setup === 'TREND_PULLBACK') {
    const support = dynamicSupport ?? ema20 ?? vwap ?? currentPrice - atr * 0.45;
    entryCenter = currentPrice - support > atr * 2.2 ? currentPrice - atr * 0.8 : support;
  } else if (setup === 'RANGE_REBOUND' && rangeSupport != null) {
    entryCenter = rangeSupport + atr * 0.35;
  }

  const zoneHalf = setup === 'BREAKOUT' ? atr * 0.23 : atr * 0.30;
  let entryLow = Math.max(0, entryCenter - zoneHalf);
  let entryHigh = entryCenter + zoneHalf;
  if (entryHigh <= entryLow) entryHigh = entryLow + Math.max(atr * 0.25, currentPrice * 0.001);
  const entryMid = (entryLow + entryHigh) / 2;

  const structuralSupport = nearestBelow([pivotSupport, ema50, ema20, vwap], entryLow) ?? pivotSupport;
  const stopByAtr = entryLow - atr * (setup === 'BREAKOUT' ? 1.05 : 0.9);
  const stopByStructure = structuralSupport != null ? structuralSupport - atr * 0.3 : stopByAtr;
  let stopPrice = Math.min(stopByAtr, stopByStructure);
  if (!(stopPrice > 0 && stopPrice < entryLow)) stopPrice = Math.max(entryLow - atr, entryLow * 0.94);

  const riskPerUnit = Math.max(entryMid - stopPrice, currentPrice * 0.001);
  const stopRiskPercent = entryMid > 0 ? (riskPerUnit / entryMid) * 100 : 0;

  let tp1 = entryMid + riskPerUnit;
  if (pivotResistance != null && pivotResistance > entryMid + riskPerUnit * 0.65 && pivotResistance < entryMid + riskPerUnit * 1.45) {
    tp1 = Math.max(entryMid + riskPerUnit * 0.7, pivotResistance - atr * 0.08);
  }
  const tp2 = Math.max(entryMid + riskPerUnit * 2, tp1 + atr * 0.8);
  const tp3 = Math.max(entryMid + riskPerUnit * 3, tp2 + atr * 1.1);

  const rr1 = (tp1 - entryMid) / riskPerUnit;
  const rr2 = (tp2 - entryMid) / riskPerUnit;
  const rr3 = (tp3 - entryMid) / riskPerUnit;

  let trendScore = 0;
  if (analysis.regime.key === 'STRONG_UPTREND') trendScore = 25;
  else if (analysis.regime.key === 'UPTREND') trendScore = 22;
  else if (analysis.regime.key === 'RANGE') trendScore = 12;
  else if (analysis.regime.key === 'VOLATILE') trendScore = 7;
  else if (analysis.regime.key === 'DOWNTREND') trendScore = 3;
  if (ema20 != null && ema50 != null && currentPrice > ema20 && ema20 > ema50) trendScore = clamp(trendScore + 2, 0, 25);

  let momentumScore = 0;
  if (rsi != null) {
    if (rsi >= 48 && rsi <= 66) momentumScore += 8;
    else if (rsi >= 42 && rsi <= 72) momentumScore += 6;
    else if (rsi >= 32 && rsi < 42) momentumScore += 3;
    else if (rsi > 72 && rsi < 80) momentumScore += 2;
  }
  if ((macdHistogram ?? 0) > 0) momentumScore += 7;
  else if ((macdHistogram ?? 0) > -Math.abs(currentPrice) * 0.0005) momentumScore += 3;
  if (plusDI != null && minusDI != null && plusDI > minusDI) momentumScore += 3;
  if ((adx ?? 0) >= 20) momentumScore += 2;
  momentumScore = clamp(momentumScore, 0, 20);

  let structureScore = 8;
  if (analysis.regime.structure === 'HH_HL') structureScore = 20;
  else if (analysis.regime.structure === 'RANGE') structureScore = 12;
  else if (analysis.regime.structure === 'LH_LL') structureScore = 1;
  if (breakout) structureScore = clamp(structureScore + 3, 0, 20);

  const distanceFromZoneAtr = atr > 0
    ? currentPrice > entryHigh
      ? (currentPrice - entryHigh) / atr
      : currentPrice < entryLow
        ? (entryLow - currentPrice) / atr
        : 0
    : 0;
  let locationScore = distanceFromZoneAtr <= 0.15 ? 16 : distanceFromZoneAtr <= 0.5 ? 12 : distanceFromZoneAtr <= 1 ? 7 : 3;
  const vwapDistance = analysis.indicators.vwap.distancePercent;
  if (vwapDistance != null && vwapDistance >= -0.8 && vwapDistance <= 2.0) locationScore += 4;
  locationScore = clamp(locationScore, 0, 20);

  const highVolThreshold = market === 'CRYPTO' ? 4 : 3;
  const extremeVolThreshold = market === 'CRYPTO' ? 7.5 : 5.5;
  let riskScore = dataSufficient ? 5 : 1;
  if (atrPercent != null && atrPercent <= highVolThreshold) riskScore += 5;
  else if (atrPercent != null && atrPercent <= extremeVolThreshold) riskScore += 2;
  if ((volumeRatio ?? 1) >= 1.05) riskScore += 3;
  if (stopRiskPercent <= (market === 'CRYPTO' ? 6 : 4.5)) riskScore += 2;
  riskScore = clamp(riskScore, 0, 15);

  const breakdown = {
    trend: trendScore,
    momentum: momentumScore,
    structure: structureScore,
    location: locationScore,
    risk: riskScore,
  };
  let score = Math.round(trendScore + momentumScore + structureScore + locationScore + riskScore);

  const positiveFactors: string[] = [];
  const warnings: string[] = [];
  const invalidation: string[] = [];

  if (analysis.regime.direction === 'BULLISH') positiveFactors.push(`Market Regime đang ${analysis.regime.label.toLowerCase()}.`);
  if (analysis.regime.structure === 'HH_HL') positiveFactors.push('Cấu trúc giá HH/HL đang ủng hộ chiều mua.');
  if ((macdHistogram ?? 0) > 0) positiveFactors.push('MACD histogram dương, động lượng ngắn hạn đang thuận chiều.');
  if (plusDI != null && minusDI != null && plusDI > minusDI) positiveFactors.push('+DI đang lớn hơn -DI.');
  if (breakout) positiveFactors.push(`Giá phá vùng cản gần nhất với volume khoảng ${(volumeRatio ?? 0).toFixed(2)}x trung bình 20 nến.`);
  if (distanceFromZoneAtr <= 0.35) positiveFactors.push('Giá hiện tại đang ở gần vùng Entry dự kiến.');

  if (!dataSufficient) warnings.push('Chưa đủ ít nhất 220 nến/EMA200 để đánh giá tín hiệu đầy đủ.');
  if (analysis.regime.direction === 'BEARISH') warnings.push('Regime đang giảm; chiến lược LONG-only ưu tiên đứng ngoài.');
  if ((rsi ?? 0) >= 72) warnings.push(`RSI ${rsi?.toFixed(1)} đang cao, rủi ro mua đuổi tăng.`);
  if (atrPercent != null && atrPercent > highVolThreshold) warnings.push(`ATR ${atrPercent.toFixed(2)}% cho thấy biến động cao hơn ngưỡng thông thường.`);
  if (distanceFromZoneAtr > 0.5 && currentPrice > entryHigh) warnings.push('Giá đã chạy xa vùng Entry; không nên mua đuổi theo tín hiệu này.');
  if (rr1 < 0.9) warnings.push('TP1 đang cho R:R thấp; cần ưu tiên chờ vùng giá tốt hơn.');
  if (stopRiskPercent > (market === 'CRYPTO' ? 8 : 6)) warnings.push(`Khoảng SL khoảng ${stopRiskPercent.toFixed(2)}% là khá rộng.`);
  if (setup === 'NO_SETUP') warnings.push('Chưa hình thành setup LONG rõ ràng theo các rule của V0.3.0.');

  invalidation.push(`Đóng nến dưới ${formatLevel(stopPrice, market)} làm mất hiệu lực setup hiện tại.`);
  if (analysis.regime.direction === 'BULLISH') invalidation.push('Market Regime chuyển sang DOWNTREND/STRONG_DOWNTREND.');
  if (analysis.regime.structure === 'HH_HL') invalidation.push('Cấu trúc HH/HL bị phá và hình thành Lower Low mới.');

  const extremeVolatility = atrPercent != null && atrPercent >= extremeVolThreshold;
  const hardAvoid = analysis.regime.direction === 'BEARISH' || (rsi ?? 0) >= 80 || extremeVolatility || score < 40;
  const rangeCandidate = analysis.regime.key === 'RANGE' && setup === 'RANGE_REBOUND' && (rsi ?? 50) <= 58;
  const bullishCandidate = analysis.regime.direction === 'BULLISH' && (setup === 'TREND_PULLBACK' || setup === 'BREAKOUT');
  const inExecutableZone = currentPrice >= entryLow - atr * 0.15 && currentPrice <= entryHigh + atr * 0.35;

  let decision: TradeSignal['decision'] = 'WAIT';
  if (hardAvoid) decision = 'AVOID';
  else if (dataSufficient && score >= 72 && (bullishCandidate || rangeCandidate) && inExecutableZone && (rsi ?? 50) <= 72 && rr1 >= 0.9) decision = 'BUY';

  if (decision === 'AVOID') score = Math.min(score, 59);
  if (decision === 'BUY' && positiveFactors.length < 2) decision = 'WAIT';

  const entryZone = decision === 'AVOID' || setup === 'NO_SETUP' ? null : {
    low: round(entryLow) as number,
    high: round(entryHigh) as number,
    midpoint: round(entryMid) as number,
    note: setup === 'BREAKOUT'
      ? 'Vùng retest quanh kháng cự vừa bị phá; tránh mua nếu giá mở rộng quá xa vùng này.'
      : setup === 'RANGE_REBOUND'
        ? 'Vùng phản ứng gần hỗ trợ của range; chỉ hợp lệ khi hỗ trợ chưa bị phá.'
        : 'Vùng pullback quanh hỗ trợ động/structure; ưu tiên chờ giá quay về vùng thay vì mua đuổi.',
  };

  const targets = entryZone ? [
    { key: 'TP1' as const, price: round(tp1) as number, profitPercent: round((tp1 - entryMid) / entryMid * 100, 2) as number, rewardRisk: round(rr1, 2) as number, note: 'Chốt một phần / đưa rủi ro về thấp hơn khi cấu trúc cho phép.' },
    { key: 'TP2' as const, price: round(tp2) as number, profitPercent: round((tp2 - entryMid) / entryMid * 100, 2) as number, rewardRisk: round(rr2, 2) as number, note: 'Mục tiêu chính theo khoảng rủi ro của setup.' },
    { key: 'TP3' as const, price: round(tp3) as number, profitPercent: round((tp3 - entryMid) / entryMid * 100, 2) as number, rewardRisk: round(rr3, 2) as number, note: 'Mục tiêu mở rộng; chỉ giữ nếu xu hướng và động lượng còn duy trì.' },
  ] : [];

  return {
    generatedAt: new Date().toISOString(),
    side: 'LONG',
    decision,
    decisionLabel: decision === 'BUY' ? 'BUY SETUP' : decision === 'WAIT' ? 'WAIT' : 'AVOID',
    setup,
    setupLabel,
    score,
    scoreLabel: signalLabel(score),
    dataSufficient,
    entryZone,
    stopLoss: entryZone ? {
      price: round(stopPrice) as number,
      riskPercent: round(stopRiskPercent, 2) as number,
      note: 'SL kỹ thuật đặt dưới vùng hỗ trợ/ATR. Đây không phải mức lỗ tối đa phù hợp cho mọi tài khoản.',
    } : null,
    invalidation,
    targets,
    riskReward: {
      toTP1: entryZone ? round(rr1, 2) : null,
      toTP2: entryZone ? round(rr2, 2) : null,
      toTP3: entryZone ? round(rr3, 2) : null,
    },
    context: {
      support: round(pivotSupport),
      resistance: round(pivotResistance ?? resistanceBefore),
      atr: round(atr),
      atrPercent: round(atrPercent, 2),
      volumeRatio: round(volumeRatio, 2),
      distanceFromEntryAtr: round(distanceFromZoneAtr, 2),
    },
    breakdown,
    positiveFactors,
    warnings,
    guardrails: [
      'LONG-only: MarketScope hiện không tạo lệnh SHORT và không khuyến nghị đòn bẩy.',
      'Signal Score là điểm đồng thuận rule-based, không phải xác suất thắng.',
      'Không mua đuổi nếu giá đã vượt xa Entry Zone; chờ setup mới hoặc retest.',
      'Win rate/expectancy V0.5.0 được tính riêng từ backtest lịch sử; không suy diễn trực tiếp từ Signal Score.',
    ],
    disclaimer: 'Tín hiệu được tạo tự động từ OHLCV và chỉ báo kỹ thuật, mang tính tham khảo. Không có tín hiệu nào đảm bảo lợi nhuận; luôn tự đánh giá rủi ro trước khi giao dịch.',
  };
}

function formatLevel(value: number, market: MarketType) {
  return new Intl.NumberFormat(market === 'STOCK' ? 'vi-VN' : 'en-US', {
    maximumFractionDigits: market === 'STOCK' ? 0 : value >= 1000 ? 2 : value >= 1 ? 4 : 8,
  }).format(value);
}
