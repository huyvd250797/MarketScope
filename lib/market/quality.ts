import type { Candle, DataQualityReport, Interval, MarketSnapshot, MarketType, TradeSignal } from './types';

const MIN_SIGNAL_CANDLES = 220;
const MIN_ANALYSIS_CANDLES = 60;
const MIN_BACKTEST_CANDLES = 280;

function intervalSeconds(interval: Interval) {
  if (interval === '15m') return 15 * 60;
  if (interval === '1h') return 60 * 60;
  if (interval === '4h') return 4 * 60 * 60;
  if (interval === '1d') return 24 * 60 * 60;
  return 7 * 24 * 60 * 60;
}

function freshnessLimitSeconds(market: MarketType, interval: Interval) {
  if (market === 'CRYPTO') {
    if (interval === '15m') return 45 * 60;
    if (interval === '1h') return 3 * 60 * 60;
    if (interval === '4h') return 12 * 60 * 60;
    if (interval === '1d') return 3 * 24 * 60 * 60;
    return 10 * 24 * 60 * 60;
  }

  // Stock VN có giờ đóng cửa, cuối tuần và ngày nghỉ. Ngưỡng cố ý rộng hơn
  // để không đánh dấu dữ liệu hợp lệ là stale chỉ vì thị trường đang đóng.
  if (interval === '15m' || interval === '1h') return 96 * 60 * 60;
  if (interval === '1d') return 7 * 24 * 60 * 60;
  return 21 * 24 * 60 * 60;
}

function countLargeGaps(candles: Candle[], market: MarketType, interval: Interval) {
  if (candles.length < 2) return 0;
  const expected = intervalSeconds(interval);
  let gaps = 0;
  for (let i = 1; i < candles.length; i += 1) {
    const diff = candles[i].time - candles[i - 1].time;
    if (market === 'CRYPTO') {
      if (diff > expected * 3.2) gaps += 1;
      continue;
    }

    if (interval === '15m' || interval === '1h') {
      // Chỉ coi là gap khi 2 nến cùng ngày UTC+7 nhưng cách nhau quá xa;
      // qua đêm/cuối tuần là khoảng nghỉ hợp lệ của thị trường.
      const a = new Date((candles[i - 1].time + 7 * 3600) * 1000).toISOString().slice(0, 10);
      const b = new Date((candles[i].time + 7 * 3600) * 1000).toISOString().slice(0, 10);
      if (a === b && diff > expected * 4.2) gaps += 1;
    } else if (interval === '1d') {
      if (diff > 4.2 * 24 * 60 * 60) gaps += 1;
    } else if (diff > 15 * 24 * 60 * 60) {
      gaps += 1;
    }
  }
  return gaps;
}

function invalidCandle(candle: Candle) {
  if (![candle.time, candle.open, candle.high, candle.low, candle.close, candle.volume].every(Number.isFinite)) return true;
  if (candle.time <= 0 || candle.open <= 0 || candle.high <= 0 || candle.low <= 0 || candle.close <= 0 || candle.volume < 0) return true;
  if (candle.high < candle.low) return true;
  if (candle.high < Math.max(candle.open, candle.close)) return true;
  if (candle.low > Math.min(candle.open, candle.close)) return true;
  return false;
}

function labelStatus(status: DataQualityReport['status']) {
  if (status === 'HEALTHY') return 'Dữ liệu tốt';
  if (status === 'DEGRADED') return 'Dữ liệu cần theo dõi';
  if (status === 'STALE_DATA') return 'Dữ liệu đã cũ';
  if (status === 'INVALID_DATA') return 'Dữ liệu không an toàn';
  return 'Lỗi nhà cung cấp';
}

export function assessMarketSnapshot(snapshot: MarketSnapshot, nowMs = Date.now()): DataQualityReport {
  const candles = snapshot.candles || [];
  const warnings: string[] = [];
  const blockers: string[] = [];
  const seen = new Set<number>();
  let duplicates = 0;
  let nonMonotonic = 0;
  let invalidOhlc = 0;
  let zeroVolumes = 0;

  for (let i = 0; i < candles.length; i += 1) {
    const candle = candles[i];
    if (seen.has(candle.time)) duplicates += 1;
    seen.add(candle.time);
    if (i > 0 && candle.time <= candles[i - 1].time) nonMonotonic += 1;
    if (invalidCandle(candle)) invalidOhlc += 1;
    if (candle.volume === 0) zeroVolumes += 1;
  }

  const largeGaps = countLargeGaps(candles, snapshot.market, snapshot.interval);
  const zeroVolumeRatio = candles.length ? zeroVolumes / candles.length : 1;
  const dataAtMs = Date.parse(snapshot.dataAt);
  const maxAgeSeconds = freshnessLimitSeconds(snapshot.market, snapshot.interval);
  const ageSecondsRaw = Number.isFinite(dataAtMs) ? Math.round((nowMs - dataAtMs) / 1000) : Number.POSITIVE_INFINITY;
  const ageSeconds = Number.isFinite(ageSecondsRaw) ? Math.max(0, ageSecondsRaw) : maxAgeSeconds * 10;
  const futureTimestamp = Number.isFinite(dataAtMs) && dataAtMs - nowMs > 5 * 60 * 1000;
  const stale = !Number.isFinite(dataAtMs) || ageSecondsRaw > maxAgeSeconds;
  const aging = !stale && ageSecondsRaw > maxAgeSeconds * 0.55;

  let freshness: DataQualityReport['freshness'];
  if (futureTimestamp) {
    freshness = { ageSeconds: 0, maxAgeSeconds, status: 'FUTURE_TIMESTAMP', label: 'Timestamp nằm trong tương lai' };
  } else if (stale) {
    freshness = { ageSeconds, maxAgeSeconds, status: 'STALE', label: 'Quá ngưỡng freshness' };
  } else if (aging) {
    freshness = { ageSeconds, maxAgeSeconds, status: 'AGING', label: 'Dữ liệu đang cũ dần' };
  } else {
    freshness = { ageSeconds, maxAgeSeconds, status: 'FRESH', label: 'Dữ liệu mới' };
  }

  const lastClose = candles.length ? candles[candles.length - 1].close : null;
  const priceDifferencePercent = lastClose && snapshot.currentPrice > 0
    ? Math.abs(snapshot.currentPrice - lastClose) / lastClose * 100
    : null;

  if (candles.length < MIN_ANALYSIS_CANDLES) blockers.push(`Chỉ có ${candles.length} nến; cần ít nhất ${MIN_ANALYSIS_CANDLES} nến để phân tích kỹ thuật cơ bản.`);
  else if (candles.length < MIN_SIGNAL_CANDLES) blockers.push(`Chỉ có ${candles.length} nến; cần ít nhất ${MIN_SIGNAL_CANDLES} nến để phát tín hiệu Entry/SL/TP.`);
  else if (candles.length < MIN_BACKTEST_CANDLES) warnings.push(`Lịch sử ${candles.length} nến còn mỏng cho backtest/calibration.`);

  if (futureTimestamp) blockers.push('Timestamp dữ liệu vượt quá thời gian máy chủ; tín hiệu bị khóa để tránh phân tích sai thời điểm.');
  if (stale) blockers.push(`Dữ liệu đã vượt ngưỡng freshness ${formatDuration(maxAgeSeconds)}; không phát BUY cho tới khi có dữ liệu mới.`);
  else if (aging) warnings.push(`Dữ liệu đang gần ngưỡng stale (${formatDuration(ageSeconds)} tuổi).`);

  if (invalidOhlc > 0) blockers.push(`Phát hiện ${invalidOhlc} nến OHLC không hợp lệ.`);
  if (nonMonotonic > 0) blockers.push(`Phát hiện ${nonMonotonic} timestamp không tăng dần.`);
  if (duplicates > 0) {
    const text = `Phát hiện ${duplicates} timestamp nến bị trùng.`;
    if (duplicates / Math.max(1, candles.length) > 0.01) blockers.push(text);
    else warnings.push(text);
  }
  if (largeGaps > 0) warnings.push(`Phát hiện ${largeGaps} khoảng trống dữ liệu lớn hơn kỳ vọng.`);
  if (zeroVolumeRatio >= 0.5) warnings.push(`${(zeroVolumeRatio * 100).toFixed(1)}% nến có volume = 0; chất lượng volume indicator có thể giảm.`);
  if (priceDifferencePercent != null && priceDifferencePercent > 15) blockers.push(`Giá hiện tại lệch ${priceDifferencePercent.toFixed(1)}% so với close nến cuối; có thể có lỗi scale/split/provider.`);
  else if (priceDifferencePercent != null && priceDifferencePercent > 5) warnings.push(`Giá hiện tại lệch ${priceDifferencePercent.toFixed(1)}% so với close nến cuối.`);

  let score = 100;
  score -= Math.min(30, invalidOhlc * 15);
  score -= Math.min(20, nonMonotonic * 10);
  score -= Math.min(15, duplicates * 4);
  score -= Math.min(15, largeGaps * 3);
  if (aging) score -= 8;
  if (stale) score -= 35;
  if (futureTimestamp) score -= 35;
  if (candles.length < MIN_SIGNAL_CANDLES) score -= 25;
  else if (candles.length < MIN_BACKTEST_CANDLES) score -= 8;
  if (zeroVolumeRatio >= 0.5) score -= 10;
  if (priceDifferencePercent != null && priceDifferencePercent > 15) score -= 30;
  else if (priceDifferencePercent != null && priceDifferencePercent > 5) score -= 8;
  score = Math.max(0, Math.min(100, Math.round(score)));

  let status: DataQualityReport['status'] = 'HEALTHY';
  if (futureTimestamp || invalidOhlc > 0 || nonMonotonic > 0 || (priceDifferencePercent != null && priceDifferencePercent > 15) || candles.length < MIN_ANALYSIS_CANDLES) status = 'INVALID_DATA';
  else if (stale) status = 'STALE_DATA';
  else if (warnings.length > 0 || blockers.length > 0) status = 'DEGRADED';

  const analysisAllowed = candles.length >= MIN_ANALYSIS_CANDLES && invalidOhlc === 0 && nonMonotonic === 0 && !futureTimestamp;
  const signalAllowed = analysisAllowed && candles.length >= MIN_SIGNAL_CANDLES && !stale && blockers.length === 0;
  const backtestAllowed = candles.length >= MIN_BACKTEST_CANDLES && invalidOhlc === 0 && nonMonotonic === 0;

  return {
    checkedAt: new Date(nowMs).toISOString(),
    status,
    statusLabel: labelStatus(status),
    score,
    signalAllowed,
    analysisAllowed,
    backtestAllowed,
    freshness,
    candles: {
      count: candles.length,
      minimumForSignal: MIN_SIGNAL_CANDLES,
      duplicateTimestamps: duplicates,
      nonMonotonicTimestamps: nonMonotonic,
      invalidOhlc,
      largeGaps,
      zeroVolumeRatio: Math.round(zeroVolumeRatio * 1000) / 1000,
    },
    priceConsistency: {
      lastCandleClose: lastClose,
      differencePercent: priceDifferencePercent == null ? null : Math.round(priceDifferencePercent * 100) / 100,
    },
    warnings,
    blockers,
  };
}

export function applyDataQualityGuard(signal: TradeSignal, quality: DataQualityReport): TradeSignal {
  if (quality.signalAllowed) return signal;
  const reason = quality.blockers[0] || 'Data Quality Guard đang khóa tín hiệu mới.';
  return {
    ...signal,
    decision: 'WAIT',
    decisionLabel: quality.status === 'STALE_DATA' ? 'DATA STALE' : 'DATA CHECK',
    dataSufficient: false,
    scoreLabel: 'Bị khóa bởi Data Quality',
    entryZone: null,
    stopLoss: null,
    targets: [],
    riskReward: { toTP1: null, toTP2: null, toTP3: null },
    warnings: [`Data Quality Guard: ${reason}`, ...signal.warnings].slice(0, 8),
    guardrails: [
      `V0.9.0 khóa Entry/SL/TP khi data quality không đạt: ${quality.statusLabel}.`,
      ...signal.guardrails,
    ],
    disclaimer: `${signal.disclaimer} Tín hiệu hiện tại đang bị Data Quality Guard khóa cho tới khi dữ liệu đạt điều kiện freshness/integrity.`,
  };
}

export function formatDuration(seconds: number) {
  if (!Number.isFinite(seconds)) return '-';
  if (seconds < 60) return `${Math.max(0, Math.round(seconds))} giây`;
  if (seconds < 3600) return `${Math.round(seconds / 60)} phút`;
  if (seconds < 86_400) return `${Math.round(seconds / 3600)} giờ`;
  return `${Math.round(seconds / 86_400)} ngày`;
}
