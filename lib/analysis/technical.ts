import type { Candle, MarketType, TechnicalAnalysis, TechnicalPoint } from '@/lib/market/types';

type Maybe = number | null;

type MacdSeries = {
  macd: Maybe[];
  signal: Maybe[];
  histogram: Maybe[];
};

type AdxSeries = {
  adx: Maybe[];
  plusDI: Maybe[];
  minusDI: Maybe[];
};

const round = (value: number | null, digits = 4): number | null => {
  if (value == null || !Number.isFinite(value)) return null;
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
};

function sma(values: number[], period: number): Maybe[] {
  const out: Maybe[] = Array(values.length).fill(null);
  if (period <= 0 || values.length < period) return out;
  let sum = 0;
  for (let i = 0; i < values.length; i += 1) {
    sum += values[i];
    if (i >= period) sum -= values[i - period];
    if (i >= period - 1) out[i] = sum / period;
  }
  return out;
}

function ema(values: number[], period: number): Maybe[] {
  const out: Maybe[] = Array(values.length).fill(null);
  if (period <= 0 || values.length < period) return out;
  const seed = values.slice(0, period).reduce((sum, value) => sum + value, 0) / period;
  out[period - 1] = seed;
  const multiplier = 2 / (period + 1);
  for (let i = period; i < values.length; i += 1) {
    out[i] = values[i] * multiplier + (out[i - 1] as number) * (1 - multiplier);
  }
  return out;
}

function emaNullable(values: Maybe[], period: number): Maybe[] {
  const out: Maybe[] = Array(values.length).fill(null);
  const first = values.findIndex((v) => v != null && Number.isFinite(v));
  if (first < 0) return out;
  const compact = values.slice(first).filter((v): v is number => v != null && Number.isFinite(v));
  const calculated = ema(compact, period);
  let j = 0;
  for (let i = first; i < values.length; i += 1) {
    if (values[i] == null || !Number.isFinite(values[i] as number)) continue;
    out[i] = calculated[j] ?? null;
    j += 1;
  }
  return out;
}


function wilderNullable(values: Maybe[], period: number): Maybe[] {
  const out: Maybe[] = Array(values.length).fill(null);
  const first = values.findIndex((v) => v != null && Number.isFinite(v));
  if (first < 0) return out;
  const valid: Array<{ index: number; value: number }> = [];
  for (let i = first; i < values.length; i += 1) {
    const value = values[i];
    if (value != null && Number.isFinite(value)) valid.push({ index: i, value });
  }
  if (valid.length < period) return out;
  let current = valid.slice(0, period).reduce((sum, item) => sum + item.value, 0) / period;
  out[valid[period - 1].index] = current;
  for (let i = period; i < valid.length; i += 1) {
    current = (current * (period - 1) + valid[i].value) / period;
    out[valid[i].index] = current;
  }
  return out;
}

function rsi(values: number[], period = 14): Maybe[] {
  const out: Maybe[] = Array(values.length).fill(null);
  if (values.length <= period) return out;
  let gains = 0;
  let losses = 0;
  for (let i = 1; i <= period; i += 1) {
    const delta = values[i] - values[i - 1];
    gains += Math.max(delta, 0);
    losses += Math.max(-delta, 0);
  }
  let avgGain = gains / period;
  let avgLoss = losses / period;
  out[period] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);
  for (let i = period + 1; i < values.length; i += 1) {
    const delta = values[i] - values[i - 1];
    avgGain = (avgGain * (period - 1) + Math.max(delta, 0)) / period;
    avgLoss = (avgLoss * (period - 1) + Math.max(-delta, 0)) / period;
    out[i] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);
  }
  return out;
}

function macd(values: number[]): MacdSeries {
  const fast = ema(values, 12);
  const slow = ema(values, 26);
  const macdLine: Maybe[] = values.map((_, i) => fast[i] != null && slow[i] != null ? (fast[i] as number) - (slow[i] as number) : null);
  const signal = emaNullable(macdLine, 9);
  const histogram = macdLine.map((value, i) => value != null && signal[i] != null ? value - (signal[i] as number) : null);
  return { macd: macdLine, signal, histogram };
}

function trueRange(candles: Candle[]): number[] {
  return candles.map((candle, i) => {
    if (i === 0) return candle.high - candle.low;
    const prevClose = candles[i - 1].close;
    return Math.max(candle.high - candle.low, Math.abs(candle.high - prevClose), Math.abs(candle.low - prevClose));
  });
}

function wilder(values: number[], period: number): Maybe[] {
  const out: Maybe[] = Array(values.length).fill(null);
  if (values.length < period) return out;
  const seed = values.slice(0, period).reduce((sum, value) => sum + value, 0) / period;
  out[period - 1] = seed;
  for (let i = period; i < values.length; i += 1) {
    out[i] = ((out[i - 1] as number) * (period - 1) + values[i]) / period;
  }
  return out;
}

function atr(candles: Candle[], period = 14): Maybe[] {
  return wilder(trueRange(candles), period);
}

function adx(candles: Candle[], period = 14): AdxSeries {
  const tr = trueRange(candles);
  const plusDM: number[] = [0];
  const minusDM: number[] = [0];
  for (let i = 1; i < candles.length; i += 1) {
    const upMove = candles[i].high - candles[i - 1].high;
    const downMove = candles[i - 1].low - candles[i].low;
    plusDM.push(upMove > downMove && upMove > 0 ? upMove : 0);
    minusDM.push(downMove > upMove && downMove > 0 ? downMove : 0);
  }
  const atrSeries = wilder(tr, period);
  const plusSmooth = wilder(plusDM, period);
  const minusSmooth = wilder(minusDM, period);
  const plusDI: Maybe[] = candles.map((_, i) => atrSeries[i] && plusSmooth[i] != null ? 100 * (plusSmooth[i] as number) / (atrSeries[i] as number) : null);
  const minusDI: Maybe[] = candles.map((_, i) => atrSeries[i] && minusSmooth[i] != null ? 100 * (minusSmooth[i] as number) / (atrSeries[i] as number) : null);
  const dx: Maybe[] = candles.map((_, i) => {
    if (plusDI[i] == null || minusDI[i] == null) return null;
    const sum = (plusDI[i] as number) + (minusDI[i] as number);
    return sum === 0 ? 0 : 100 * Math.abs((plusDI[i] as number) - (minusDI[i] as number)) / sum;
  });
  return { adx: wilderNullable(dx, period), plusDI, minusDI };
}

function rollingVwap(candles: Candle[], market: MarketType): Maybe[] {
  const out: Maybe[] = Array(candles.length).fill(null);
  // Intraday data uses a daily anchor. Daily/weekly data uses a rolling 20-bar VWAP proxy.
  const intraday = candles.length > 1 && candles[1].time - candles[0].time < 86_000;
  if (intraday) {
    let pv = 0;
    let volume = 0;
    let lastDay = '';
    candles.forEach((candle, i) => {
      const timeZone = market === 'STOCK' ? 'Asia/Ho_Chi_Minh' : 'UTC';
      const day = new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(candle.time * 1000));
      if (day !== lastDay) {
        pv = 0;
        volume = 0;
        lastDay = day;
      }
      const typical = (candle.high + candle.low + candle.close) / 3;
      pv += typical * candle.volume;
      volume += candle.volume;
      out[i] = volume > 0 ? pv / volume : typical;
    });
    return out;
  }

  const period = 20;
  let pv = 0;
  let volume = 0;
  for (let i = 0; i < candles.length; i += 1) {
    const typical = (candles[i].high + candles[i].low + candles[i].close) / 3;
    pv += typical * candles[i].volume;
    volume += candles[i].volume;
    if (i >= period) {
      const old = candles[i - period];
      pv -= ((old.high + old.low + old.close) / 3) * old.volume;
      volume -= old.volume;
    }
    if (i >= period - 1) out[i] = volume > 0 ? pv / volume : null;
  }
  return out;
}

function points(candles: Candle[], values: Maybe[]): TechnicalPoint[] {
  const out: TechnicalPoint[] = [];
  for (let i = 0; i < candles.length; i += 1) {
    const value = values[i];
    if (value != null && Number.isFinite(value)) out.push({ time: candles[i].time, value: round(value, 8) as number });
  }
  return out;
}

function last(values: Maybe[]): number | null {
  for (let i = values.length - 1; i >= 0; i -= 1) {
    const value = values[i];
    if (value != null && Number.isFinite(value)) return value;
  }
  return null;
}

function slopePercent(values: Maybe[], lookback = 5): number | null {
  const valid = values.map((value, index) => ({ value, index })).filter((item): item is { value: number; index: number } => item.value != null && Number.isFinite(item.value));
  if (valid.length <= lookback) return null;
  const current = valid[valid.length - 1].value;
  const previous = valid[valid.length - 1 - lookback].value;
  return previous === 0 ? null : ((current - previous) / Math.abs(previous)) * 100;
}

function detectStructure(candles: Candle[]): TechnicalAnalysis['regime']['structure'] {
  const window = candles.slice(-80);
  if (window.length < 12) return 'UNCONFIRMED';
  const highs: number[] = [];
  const lows: number[] = [];
  const radius = 2;
  for (let i = radius; i < window.length - radius; i += 1) {
    const segment = window.slice(i - radius, i + radius + 1);
    if (window[i].high >= Math.max(...segment.map((c) => c.high))) highs.push(window[i].high);
    if (window[i].low <= Math.min(...segment.map((c) => c.low))) lows.push(window[i].low);
  }
  if (highs.length < 2 || lows.length < 2) return 'UNCONFIRMED';
  const h1 = highs[highs.length - 2];
  const h2 = highs[highs.length - 1];
  const l1 = lows[lows.length - 2];
  const l2 = lows[lows.length - 1];
  if (h2 > h1 && l2 > l1) return 'HH_HL';
  if (h2 < h1 && l2 < l1) return 'LH_LL';
  return 'RANGE';
}

function rsiStatus(value: number | null): string {
  if (value == null) return 'Chưa đủ dữ liệu';
  if (value >= 70) return 'Quá mua';
  if (value <= 30) return 'Quá bán';
  if (value >= 55) return 'Động lượng tăng';
  if (value <= 45) return 'Động lượng giảm';
  return 'Trung tính';
}

export type PreparedTechnical = {
  candles: Candle[];
  market: MarketType;
  closes: number[];
  ema20: Maybe[];
  ema50: Maybe[];
  ema200: Maybe[];
  rsi14: Maybe[];
  macdSeries: MacdSeries;
  atr14: Maybe[];
  adx14: AdxSeries;
  vwap: Maybe[];
};

export function prepareTechnical(candles: Candle[], market: MarketType): PreparedTechnical {
  const closes = candles.map((c) => c.close);
  return {
    candles,
    market,
    closes,
    ema20: ema(closes, 20),
    ema50: ema(closes, 50),
    ema200: ema(closes, 200),
    rsi14: rsi(closes, 14),
    macdSeries: macd(closes),
    atr14: atr(candles, 14),
    adx14: adx(candles, 14),
    vwap: rollingVwap(candles, market),
  };
}

function valueAt(values: Maybe[], index: number): number | null {
  const value = values[index];
  return value != null && Number.isFinite(value) ? value : null;
}

function slopePercentAt(values: Maybe[], index: number, lookback = 5): number | null {
  const valid: number[] = [];
  for (let i = index; i >= 0 && valid.length <= lookback; i -= 1) {
    const value = values[i];
    if (value != null && Number.isFinite(value)) valid.push(value);
  }
  if (valid.length <= lookback) return null;
  const current = valid[0];
  const previous = valid[lookback];
  return previous === 0 ? null : ((current - previous) / Math.abs(previous)) * 100;
}

function pointsUntil(candles: Candle[], values: Maybe[], endIndex: number): TechnicalPoint[] {
  const out: TechnicalPoint[] = [];
  for (let i = 0; i <= endIndex && i < candles.length; i += 1) {
    const value = values[i];
    if (value != null && Number.isFinite(value)) out.push({ time: candles[i].time, value: round(value, 8) as number });
  }
  return out;
}

export function analyzeTechnicalAt(prepared: PreparedTechnical, endIndex: number, includeSeries = false): TechnicalAnalysis {
  const { candles, market, closes, ema20, ema50, ema200, rsi14, macdSeries, atr14, adx14, vwap } = prepared;
  const index = Math.max(0, Math.min(endIndex, candles.length - 1));
  const price = closes[index] ?? 0;
  const e20 = valueAt(ema20, index);
  const e50 = valueAt(ema50, index);
  const e200 = valueAt(ema200, index);
  const rsiValue = valueAt(rsi14, index);
  const macdValue = valueAt(macdSeries.macd, index);
  const macdSignal = valueAt(macdSeries.signal, index);
  const macdHist = valueAt(macdSeries.histogram, index);
  const adxValue = valueAt(adx14.adx, index);
  const plusDI = valueAt(adx14.plusDI, index);
  const minusDI = valueAt(adx14.minusDI, index);
  const atrValue = valueAt(atr14, index);
  const vwapValue = valueAt(vwap, index);
  const atrPercent = atrValue != null && price ? (atrValue / price) * 100 : null;
  const vwapDistance = vwapValue != null && vwapValue ? ((price - vwapValue) / vwapValue) * 100 : null;
  const structure = detectStructure(candles.slice(Math.max(0, index - 79), index + 1));

  const bullishAlignment = e20 != null && e50 != null && e200 != null && price > e20 && e20 > e50 && e50 > e200;
  const bearishAlignment = e20 != null && e50 != null && e200 != null && price < e20 && e20 < e50 && e50 < e200;
  const trendStrong = (adxValue ?? 0) >= 25;
  const trendPresent = (adxValue ?? 0) >= 20;
  const highVolThreshold = market === 'CRYPTO' ? 4 : 3;
  const highVolatility = atrPercent != null && atrPercent >= highVolThreshold;
  const emaSlope = slopePercentAt(ema20, index);
  const emaSpreadPercent = e20 != null && e50 != null && price ? Math.abs(e20 - e50) / price * 100 : 0;
  const minSlope = market === 'CRYPTO' ? 0.05 : 0.04;
  const minSpread = market === 'CRYPTO' ? 0.08 : 0.06;
  const upwardMomentum = e20 != null && e50 != null && e20 > e50 && (emaSlope ?? 0) > minSlope && emaSpreadPercent >= minSpread && structure !== 'LH_LL';
  const downwardMomentum = e20 != null && e50 != null && e20 < e50 && (emaSlope ?? 0) < -minSlope && emaSpreadPercent >= minSpread && structure !== 'HH_HL';

  let key: TechnicalAnalysis['regime']['key'] = 'RANGE';
  let label = 'Đi ngang / tích lũy';
  let direction: TechnicalAnalysis['regime']['direction'] = 'NEUTRAL';
  if (bullishAlignment && upwardMomentum && trendStrong) {
    key = 'STRONG_UPTREND'; label = 'Xu hướng tăng mạnh'; direction = 'BULLISH';
  } else if (bearishAlignment && downwardMomentum && trendStrong) {
    key = 'STRONG_DOWNTREND'; label = 'Xu hướng giảm mạnh'; direction = 'BEARISH';
  } else if (upwardMomentum && (trendPresent || bullishAlignment)) {
    key = 'UPTREND'; label = 'Xu hướng tăng'; direction = 'BULLISH';
  } else if (downwardMomentum && (trendPresent || bearishAlignment)) {
    key = 'DOWNTREND'; label = 'Xu hướng giảm'; direction = 'BEARISH';
  } else if (highVolatility) {
    key = 'VOLATILE'; label = 'Biến động cao'; direction = 'NEUTRAL';
  }

  let confidence: number;
  if (direction === 'NEUTRAL') {
    confidence = 50;
    if (Math.abs(emaSlope ?? 0) < minSlope) confidence += 15;
    if (emaSpreadPercent < minSpread * 1.5) confidence += 10;
    if (structure === 'RANGE') confidence += 10;
    if (trendStrong && key === 'RANGE') confidence -= 10;
    if (key === 'VOLATILE' && highVolatility) confidence += 15;
  } else {
    confidence = 45;
    if (bullishAlignment || bearishAlignment) confidence += 20;
    if (trendStrong) confidence += 15;
    else if (trendPresent) confidence += 8;
    if ((direction === 'BULLISH' && structure === 'HH_HL') || (direction === 'BEARISH' && structure === 'LH_LL')) confidence += 10;
    if ((direction === 'BULLISH' && (macdHist ?? 0) > 0) || (direction === 'BEARISH' && (macdHist ?? 0) < 0)) confidence += 7;
    if (highVolatility) confidence -= 5;
  }
  confidence = Math.max(25, Math.min(95, confidence));

  const emaStatus = bullishAlignment ? 'Bullish alignment' : bearishAlignment ? 'Bearish alignment' : 'Mixed / chưa đồng thuận';
  const macdStatus = macdValue == null || macdSignal == null ? 'Chưa đủ dữ liệu' : macdValue > macdSignal ? 'MACD trên Signal' : 'MACD dưới Signal';
  const adxStatus = adxValue == null ? 'Chưa đủ dữ liệu' : adxValue >= 25 ? 'Xu hướng mạnh' : adxValue >= 20 ? 'Xu hướng hình thành' : 'Xu hướng yếu';
  const atrStatus = atrPercent == null ? 'Chưa đủ dữ liệu' : highVolatility ? 'Biến động cao' : 'Biến động bình thường';
  const vwapStatus = vwapDistance == null ? 'Chưa đủ dữ liệu' : vwapDistance > 0.2 ? 'Giá trên VWAP' : vwapDistance < -0.2 ? 'Giá dưới VWAP' : 'Giá sát VWAP';

  return {
    computedAt: new Date().toISOString(),
    sampleSize: index + 1,
    regime: {
      key,
      label,
      direction,
      confidence,
      structure,
      description: `${label}; ADX ${adxValue == null ? 'N/A' : adxValue.toFixed(1)}; cấu trúc ${structure}. Đây là phân loại trạng thái thị trường, chưa phải tín hiệu mua/bán.`,
    },
    indicators: {
      ema: { ema20: round(e20, 8), ema50: round(e50, 8), ema200: round(e200, 8), slope20Percent: round(emaSlope, 3), status: emaStatus },
      rsi14: { value: round(rsiValue, 2), status: rsiStatus(rsiValue) },
      macd: { value: round(macdValue, 8), signal: round(macdSignal, 8), histogram: round(macdHist, 8), status: macdStatus },
      adx14: { value: round(adxValue, 2), plusDI: round(plusDI, 2), minusDI: round(minusDI, 2), status: adxStatus },
      atr14: { value: round(atrValue, 8), percent: round(atrPercent, 2), status: atrStatus },
      vwap: { value: round(vwapValue, 8), distancePercent: round(vwapDistance, 2), status: vwapStatus },
    },
    series: includeSeries ? {
      ema20: pointsUntil(candles, ema20, index),
      ema50: pointsUntil(candles, ema50, index),
      ema200: pointsUntil(candles, ema200, index),
      vwap: pointsUntil(candles, vwap, index),
      rsi14: pointsUntil(candles, rsi14, index),
      macd: pointsUntil(candles, macdSeries.macd, index),
      macdSignal: pointsUntil(candles, macdSeries.signal, index),
      macdHistogram: pointsUntil(candles, macdSeries.histogram, index),
      adx14: pointsUntil(candles, adx14.adx, index),
    } : {
      ema20: [], ema50: [], ema200: [], vwap: [], rsi14: [], macd: [], macdSignal: [], macdHistogram: [], adx14: [],
    },
  };
}

export function analyzeTechnical(candles: Candle[], market: MarketType): TechnicalAnalysis {
  const prepared = prepareTechnical(candles, market);
  return analyzeTechnicalAt(prepared, candles.length - 1, true);
}

