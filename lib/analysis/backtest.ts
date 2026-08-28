import { analyzeTechnicalAt, prepareTechnical } from '@/lib/analysis/technical';
import { analyzeTradeSignal } from '@/lib/analysis/signal';
import type {
  BacktestCalibration,
  BacktestMetrics,
  BacktestResult,
  BacktestTrade,
  Candle,
  Interval,
  MarketType,
  TechnicalAnalysis,
  TradeSignal,
} from '@/lib/market/types';

const WARMUP_CANDLES = 220;
const MIN_HISTORY_CANDLES = 280;
const MAX_RECENT_TRADES = 12;

const intervalConfig: Record<Interval, { entryWaitBars: number; maxHoldBars: number }> = {
  '15m': { entryWaitBars: 8, maxHoldBars: 64 },
  '1h': { entryWaitBars: 6, maxHoldBars: 48 },
  '4h': { entryWaitBars: 5, maxHoldBars: 30 },
  '1d': { entryWaitBars: 4, maxHoldBars: 25 },
  '1w': { entryWaitBars: 3, maxHoldBars: 16 },
};

const round = (value: number | null, digits = 2): number | null => {
  if (value == null || !Number.isFinite(value)) return null;
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
};

const mean = (values: number[]) => values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;

function median(values: number[]) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

function scoreBand(score: number) {
  if (score >= 90) return '90-100';
  if (score >= 80) return '80-89';
  if (score >= 70) return '70-79';
  if (score >= 60) return '60-69';
  return '<60';
}

function simulateTrade(candles: Candle[], signalIndex: number, signal: TradeSignal, regime: TechnicalAnalysis['regime']['key'], interval: Interval): BacktestTrade | null {
  const entry = signal.entryZone;
  const stop = signal.stopLoss;
  const tp1 = signal.targets.find((target) => target.key === 'TP1');
  const tp2 = signal.targets.find((target) => target.key === 'TP2');
  const tp3 = signal.targets.find((target) => target.key === 'TP3');
  if (!entry || !stop || !tp1 || !tp2 || !tp3) return null;

  const cfg = intervalConfig[interval];
  const firstFutureIndex = signalIndex + 1;
  const lastEntryIndex = Math.min(candles.length - 1, signalIndex + cfg.entryWaitBars);
  if (firstFutureIndex > lastEntryIndex) return null;

  let fillIndex = -1;
  let fillPrice = 0;
  for (let index = firstFutureIndex; index <= lastEntryIndex; index += 1) {
    const candle = candles[index];
    const intersectsEntry = candle.low <= entry.high && candle.high >= entry.low;
    if (!intersectsEntry) continue;
    fillIndex = index;
    // Conservative LONG fill: use the upper edge unless the candle opens inside the zone.
    if (candle.open >= entry.low && candle.open <= entry.high) fillPrice = candle.open;
    else fillPrice = candle.open < entry.low ? entry.low : entry.high;
    break;
  }
  if (fillIndex < 0 || !(fillPrice > stop.price)) return null;

  const risk = fillPrice - stop.price;
  const lastHoldIndex = Math.min(candles.length - 1, fillIndex + cfg.maxHoldBars - 1);
  let tp1Hit = false;
  let tp2Hit = false;
  let tp3Hit = false;
  let barsToTp1: number | null = null;
  let benchmarkExitIndex = lastHoldIndex;
  let stoppedBeforeTp1 = false;

  for (let index = fillIndex; index <= lastHoldIndex; index += 1) {
    const candle = candles[index];

    // OHLC cannot reveal intrabar ordering. If SL and TP are touched in the same candle,
    // count SL first to avoid optimistic bias.
    if (candle.low <= stop.price) {
      if (!tp1Hit) {
        stoppedBeforeTp1 = true;
        benchmarkExitIndex = index;
      }
      break;
    }

    if (!tp1Hit && candle.high >= tp1.price) {
      tp1Hit = true;
      barsToTp1 = index - fillIndex + 1;
      benchmarkExitIndex = index;
    }
    if (!tp2Hit && candle.high >= tp2.price) tp2Hit = true;
    if (!tp3Hit && candle.high >= tp3.price) tp3Hit = true;
  }

  let outcome: BacktestTrade['outcome'];
  let realizedR: number;
  let exitPrice: number;
  if (stoppedBeforeTp1) {
    outcome = 'LOSS';
    realizedR = -1;
    exitPrice = stop.price;
  } else if (tp1Hit) {
    outcome = 'WIN';
    realizedR = (tp1.price - fillPrice) / risk;
    exitPrice = tp1.price;
  } else {
    outcome = 'TIMEOUT';
    exitPrice = candles[lastHoldIndex].close;
    realizedR = Math.max(-1, Math.min((tp1.price - fillPrice) / risk, (exitPrice - fillPrice) / risk));
    benchmarkExitIndex = lastHoldIndex;
  }

  const exitCandle = candles[benchmarkExitIndex];
  return {
    signalTime: candles[signalIndex].time,
    fillTime: candles[fillIndex].time,
    exitTime: exitCandle.time,
    setup: signal.setup,
    regime,
    score: signal.score,
    scoreBand: scoreBand(signal.score),
    entryPrice: fillPrice,
    stopPrice: stop.price,
    tp1Price: tp1.price,
    outcome,
    realizedR: round(realizedR, 3) as number,
    returnPercent: round(((exitPrice - fillPrice) / fillPrice) * 100, 2) as number,
    barsHeld: benchmarkExitIndex - fillIndex + 1,
    barsToTp1,
    tp1Hit,
    tp2Hit,
    tp3Hit,
  };
}

function calculateMetrics(trades: BacktestTrade[], noFillSignals = 0): BacktestMetrics {
  const wins = trades.filter((trade) => trade.outcome === 'WIN').length;
  const losses = trades.filter((trade) => trade.outcome === 'LOSS').length;
  const timeouts = trades.filter((trade) => trade.outcome === 'TIMEOUT').length;
  const resolvedTrades = wins + losses;
  const rawWinRate = resolvedTrades ? wins / resolvedTrades * 100 : null;
  const calibratedWinRate = resolvedTrades ? (wins + 2) / (resolvedTrades + 4) * 100 : null;
  const positiveR = trades.filter((trade) => trade.realizedR > 0).reduce((sum, trade) => sum + trade.realizedR, 0);
  const negativeR = Math.abs(trades.filter((trade) => trade.realizedR < 0).reduce((sum, trade) => sum + trade.realizedR, 0));
  const expectancyR = mean(trades.map((trade) => trade.realizedR));

  let equity = 0;
  let peak = 0;
  let maxDrawdownR = 0;
  for (const trade of trades) {
    equity += trade.realizedR;
    peak = Math.max(peak, equity);
    maxDrawdownR = Math.max(maxDrawdownR, peak - equity);
  }

  return {
    filledTrades: trades.length,
    resolvedTrades,
    wins,
    losses,
    timeouts,
    noFillSignals,
    winRate: round(rawWinRate, 1),
    calibratedWinRate: round(calibratedWinRate, 1),
    resolutionRate: trades.length ? round(resolvedTrades / trades.length * 100, 1) : null,
    expectancyR: round(expectancyR, 3),
    profitFactor: negativeR > 0 ? round(positiveR / negativeR, 2) : positiveR > 0 ? 99 : null,
    maxDrawdownR: round(maxDrawdownR, 2) as number,
    averageBarsHeld: round(mean(trades.map((trade) => trade.barsHeld)), 1),
    medianBarsToTp1: round(median(trades.filter((trade) => trade.barsToTp1 != null).map((trade) => trade.barsToTp1 as number)), 1),
    tp1HitRate: trades.length ? round(trades.filter((trade) => trade.tp1Hit).length / trades.length * 100, 1) : null,
    tp2HitRate: trades.length ? round(trades.filter((trade) => trade.tp2Hit).length / trades.length * 100, 1) : null,
    tp3HitRate: trades.length ? round(trades.filter((trade) => trade.tp3Hit).length / trades.length * 100, 1) : null,
  };
}

function filterCalibrationTrades(
  trades: BacktestTrade[],
  mode: 'SETUP_REGIME_BAND' | 'SETUP_REGIME' | 'SETUP' | 'ALL',
  currentSignal: TradeSignal,
  currentRegime: TechnicalAnalysis['regime']['key'],
) {
  const band = scoreBand(currentSignal.score);
  if (mode === 'SETUP_REGIME_BAND') return trades.filter((trade) => trade.setup === currentSignal.setup && trade.regime === currentRegime && trade.scoreBand === band);
  if (mode === 'SETUP_REGIME') return trades.filter((trade) => trade.setup === currentSignal.setup && trade.regime === currentRegime);
  if (mode === 'SETUP') return trades.filter((trade) => trade.setup === currentSignal.setup);
  return trades;
}

function selectCalibrationCohort(trades: BacktestTrade[], currentSignal: TradeSignal, currentRegime: TechnicalAnalysis['regime']['key']) {
  const resolvedCount = (items: BacktestTrade[]) => items.filter((trade) => trade.outcome !== 'TIMEOUT').length;
  const candidates = [
    { label: 'Setup + Regime + Score band', mode: 'SETUP_REGIME_BAND' as const, min: 6 },
    { label: 'Setup + Regime', mode: 'SETUP_REGIME' as const, min: 8 },
    { label: 'Setup', mode: 'SETUP' as const, min: 10 },
    { label: 'Tất cả BUY lịch sử', mode: 'ALL' as const, min: 12 },
  ].map((candidate) => ({ ...candidate, trades: filterCalibrationTrades(trades, candidate.mode, currentSignal, currentRegime) }));

  for (const candidate of candidates) {
    if (resolvedCount(candidate.trades) >= candidate.min) return candidate;
  }
  return candidates[candidates.length - 1];
}

function formatBarsAsTime(bars: number | null, interval: Interval) {
  if (bars == null || !Number.isFinite(bars) || bars <= 0) return null;
  const roundedBars = Math.max(1, Math.round(bars));
  const minutesPerBar: Record<Interval, number> = { '15m': 15, '1h': 60, '4h': 240, '1d': 1440, '1w': 10080 };
  const totalMinutes = roundedBars * minutesPerBar[interval];
  if (totalMinutes < 60) return `~${totalMinutes} phút`;
  if (totalMinutes < 1440) return `~${Math.round(totalMinutes / 60)} giờ`;
  if (totalMinutes < 10080) return `~${Math.round(totalMinutes / 1440)} ngày`;
  return `~${Math.round(totalMinutes / 10080)} tuần`;
}

function buildCalibration(
  allTrades: BacktestTrade[],
  validationTrades: BacktestTrade[],
  currentSignal: TradeSignal,
  currentRegime: TechnicalAnalysis['regime']['key'],
  interval: Interval,
): BacktestCalibration {
  const applicable = currentSignal.decision === 'BUY' && currentSignal.entryZone != null;
  const cohort = selectCalibrationCohort(allTrades, currentSignal, currentRegime);
  const metrics = calculateMetrics(cohort.trades);
  const validationCohort = filterCalibrationTrades(validationTrades, cohort.mode, currentSignal, currentRegime);
  const validationMetrics = calculateMetrics(validationCohort);
  const stabilityGapPercent = metrics.winRate != null && validationMetrics.winRate != null
    ? Math.abs(metrics.winRate - validationMetrics.winRate)
    : null;

  let quality: BacktestCalibration['quality'] = 'INSUFFICIENT';
  if (metrics.resolvedTrades >= 20 && validationMetrics.resolvedTrades >= 6 && (stabilityGapPercent ?? 99) <= 15 && (metrics.expectancyR ?? -1) > 0) {
    quality = 'HIGH';
  } else if (metrics.resolvedTrades >= 10 && validationMetrics.resolvedTrades >= 3 && (stabilityGapPercent ?? 99) <= 22) {
    quality = 'MEDIUM';
  } else if (metrics.resolvedTrades >= 6) {
    quality = 'LOW';
  }

  const labels: Record<BacktestCalibration['quality'], string> = {
    INSUFFICIENT: 'Chưa đủ mẫu',
    LOW: 'Độ tin cậy thấp',
    MEDIUM: 'Độ tin cậy vừa',
    HIGH: 'Độ tin cậy cao',
  };

  return {
    applicable,
    quality,
    qualityLabel: labels[quality],
    matchedBy: cohort.label,
    sampleSize: cohort.trades.length,
    resolvedTrades: metrics.resolvedTrades,
    winRate: metrics.winRate,
    calibratedWinRate: metrics.calibratedWinRate,
    expectancyR: metrics.expectancyR,
    profitFactor: metrics.profitFactor,
    medianBarsToTp1: metrics.medianBarsToTp1,
    estimatedTimeToTp1: formatBarsAsTime(metrics.medianBarsToTp1, interval),
    stabilityGapPercent: round(stabilityGapPercent, 1),
    note: !applicable
      ? 'Tín hiệu hiện tại không phải BUY nên MarketScope không gán xác suất thắng cho một lệnh chưa được khuyến nghị.'
      : quality === 'INSUFFICIENT'
        ? 'Có quá ít giao dịch lịch sử tương đồng. Không nên dùng win rate này để quyết định giao dịch.'
        : 'Win rate đã shrink về 50% bằng prior Beta(2,2) để giảm phóng đại khi mẫu nhỏ; đây vẫn chỉ là ước lượng từ lịch sử cùng mã/timeframe.',
  };
}

export function backtestSignalEngine(
  candles: Candle[],
  market: MarketType,
  interval: Interval,
  currentSignal: TradeSignal,
  currentRegime: TechnicalAnalysis['regime']['key'],
): BacktestResult {
  // Exclude the latest live candle from historical testing. It may still be forming.
  const history = candles.length > WARMUP_CANDLES + 1 ? candles.slice(0, -1) : candles;
  const config = intervalConfig[interval];
  const trades: BacktestTrade[] = [];
  let evaluatedSignals = 0;
  let buySignals = 0;
  let noFillSignals = 0;
  const noFillSignalTimes: number[] = [];

  if (history.length >= MIN_HISTORY_CANDLES) {
    const prepared = prepareTechnical(history, market);
    let index = WARMUP_CANDLES - 1;
    while (index < history.length - 2) {
      const prefix = history.slice(0, index + 1);
      const analysis = analyzeTechnicalAt(prepared, index, false);
      const signal = analyzeTradeSignal(prefix, market, analysis);
      evaluatedSignals += 1;

      if (signal.decision !== 'BUY' || !signal.entryZone || !signal.stopLoss) {
        index += 1;
        continue;
      }

      buySignals += 1;
      const trade = simulateTrade(history, index, signal, analysis.regime.key, interval);
      if (!trade) {
        noFillSignals += 1;
        noFillSignalTimes.push(history[index].time);
        index += config.entryWaitBars + 1;
        continue;
      }

      trades.push(trade);
      const exitIndex = history.findIndex((candle) => candle.time === trade.exitTime);
      index = Math.max(index + 1, exitIndex >= 0 ? exitIndex + 1 : index + 1);
    }
  }

  const splitTime = history[Math.max(WARMUP_CANDLES, Math.floor(history.length * 0.75))]?.time ?? 0;
  const validationTrades = trades.filter((trade) => trade.signalTime >= splitTime);
  const validationNoFillSignals = noFillSignalTimes.filter((time) => time >= splitTime).length;
  const metrics = calculateMetrics(trades, noFillSignals);
  const validation = calculateMetrics(validationTrades, validationNoFillSignals);
  const calibration = buildCalibration(trades, validationTrades, currentSignal, currentRegime, interval);

  return {
    generatedAt: new Date().toISOString(),
    status: history.length < MIN_HISTORY_CANDLES ? 'INSUFFICIENT_HISTORY' : trades.length < 4 ? 'LIMITED' : 'READY',
    sampleCandles: history.length,
    warmupCandles: WARMUP_CANDLES,
    evaluatedSignals,
    buySignals,
    metrics,
    validation: {
      splitPercent: 25,
      startTime: splitTime || null,
      metrics: validation,
    },
    calibration,
    recentTrades: trades.slice(-MAX_RECENT_TRADES).reverse(),
    methodology: [
      'Không look-ahead: mỗi tín hiệu chỉ dùng nến đã đóng tới đúng thời điểm tín hiệu.',
      `Warm-up ${WARMUP_CANDLES} nến để EMA200 và indicator ổn định trước khi đánh giá BUY.`,
      `Entry chỉ được ghi nhận khi vùng Entry thực sự được chạm trong tối đa ${config.entryWaitBars} nến tiếp theo.`,
      'Nếu SL và target cùng xuất hiện trong một nến, backtest ưu tiên SL để tránh bias lạc quan.',
      `Benchmark WIN = TP1 chạm trước SL; TIMEOUT nếu chưa chạm TP1/SL sau tối đa ${config.maxHoldBars} nến kể từ khi khớp Entry.`,
      'Các giao dịch được chạy tuần tự, không chồng lệnh benchmark lên nhau.',
      '25% đoạn lịch sử cuối được báo cáo riêng như validation window để kiểm tra độ ổn định gần đây.',
    ],
    disclaimer: 'Backtest chỉ mô phỏng rule hiện tại trên OHLCV lịch sử, chưa bao gồm phí, trượt giá, thanh khoản, thuế, corporate actions đầy đủ hoặc thay đổi chế độ thị trường. Hiệu suất quá khứ không đảm bảo kết quả tương lai.',
  };
}
