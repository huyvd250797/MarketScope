import { analyzeTechnical } from '@/lib/analysis/technical';
import { analyzeTradeSignal } from '@/lib/analysis/signal';
import { backtestSignalEngine } from '@/lib/analysis/backtest';
import { normalizeStrategyProfile, resolveStrategyProfile } from '@/lib/analysis/strategy';
import { forecastPriceBehavior } from '@/lib/analysis/forecast';
import { calibrateForecast, validateForecastHistory } from '@/lib/analysis/forecastValidation';
import { assessMarketSnapshot, applyDataQualityGuard } from '@/lib/market/quality';
import type {
  ForecastHorizon,
  MarketSnapshot,
  OpportunityGrade,
  OpportunityScannerItem,
  StrategyProfileKey,
} from '@/lib/market/types';

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
const round = (value: number | null, digits = 1): number | null => {
  if (value == null || !Number.isFinite(value)) return null;
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
};

function preferredForecastHorizon(profile: OpportunityScannerItem['strategy']['effective']): ForecastHorizon {
  if (profile === 'SHORT_TERM') return 'SHORT';
  if (profile === 'LONG_TERM') return 'LONG';
  return 'MEDIUM';
}

function riskRewardScore(rr: number | null) {
  if (rr == null || !Number.isFinite(rr) || rr <= 0) return 20;
  return clamp(rr / 3 * 100, 20, 100);
}

function longForecastScore(bias: OpportunityScannerItem['forecast']['overallBias'], probability: number) {
  if (bias === 'BULLISH') return clamp(probability, 0, 100);
  if (bias === 'BEARISH') return clamp(100 - probability, 0, 100);
  return clamp(50 + (probability - 50) * 0.2, 42, 58);
}

function signalComponent(decision: OpportunityScannerItem['signal']['decision'], score: number) {
  if (decision === 'BUY') return score;
  if (decision === 'WAIT') return score * 0.62;
  return score * 0.25;
}

function gradeFor(score: number, decision: OpportunityScannerItem['signal']['decision'], signalAllowed: boolean): { grade: OpportunityGrade; label: string } {
  if (!signalAllowed) return { grade: 'BLOCKED', label: 'Data check' };
  if (decision !== 'BUY') return { grade: 'WATCH', label: decision === 'WAIT' ? 'Chờ setup' : 'Tránh' };
  if (score >= 82) return { grade: 'A', label: 'Cơ hội nổi bật' };
  if (score >= 72) return { grade: 'B', label: 'Đáng xem' };
  if (score >= 62) return { grade: 'C', label: 'Có tiềm năng' };
  return { grade: 'WATCH', label: 'Theo dõi' };
}

function distanceFromEntry(currentPrice: number, low: number, high: number) {
  if (!(currentPrice > 0)) return null;
  if (currentPrice >= low && currentPrice <= high) return 0;
  const nearest = currentPrice < low ? low : high;
  return Math.abs(nearest / currentPrice - 1) * 100;
}

export function analyzeOpportunity(
  snapshot: MarketSnapshot,
  requestedProfileInput: StrategyProfileKey | string | null | undefined,
  options: { validationOrigins?: number } = {},
): OpportunityScannerItem {
  const requestedProfile = normalizeStrategyProfile(String(requestedProfileInput || 'AUTO'));
  const quality = assessMarketSnapshot(snapshot);
  if (!quality.analysisAllowed) {
    throw new Error(quality.blockers[0] || 'Data Quality không đủ để phân tích cơ hội');
  }

  const analysis = analyzeTechnical(snapshot.candles, snapshot.market);
  const strategy = resolveStrategyProfile(requestedProfile, snapshot.market, snapshot.interval, analysis);
  const fullSignal = applyDataQualityGuard(analyzeTradeSignal(snapshot.candles, snapshot.market, analysis, strategy.effective), quality);
  const backtest = quality.backtestAllowed
    ? backtestSignalEngine(snapshot.candles, snapshot.market, snapshot.interval, fullSignal, analysis.regime.key, strategy.effective)
    : null;
  const calibration = backtest?.calibration ?? {
    applicable: false,
    quality: 'INSUFFICIENT' as const,
    qualityLabel: 'Chưa đủ mẫu',
    calibratedWinRate: null,
    resolvedTrades: 0,
    expectancyR: null,
    profitFactor: null,
    estimatedTimeToTp1: null,
    matchedBy: 'Data Quality Guard',
  };

  const rawForecast = forecastPriceBehavior(snapshot.candles, snapshot.market, snapshot.interval, analysis, strategy);
  const validationOrigins = Math.max(0, options.validationOrigins ?? 0);
  const validation = validationOrigins > 0 && quality.backtestAllowed
    ? validateForecastHistory(snapshot.candles, snapshot.market, snapshot.interval, strategy.effective, { maxOrigins: validationOrigins })
    : null;
  const forecast = validation ? calibrateForecast(rawForecast, validation) : rawForecast;
  const horizon = preferredForecastHorizon(strategy.effective);
  const scenario = forecast.scenarios.find((item) => item.horizon === horizon) ?? forecast.scenarios[1] ?? forecast.scenarios[0];
  const horizonMetrics = validation?.horizons[horizon];
  const directionProbability = scenario?.calibratedProbability ?? scenario?.probability ?? 50;
  const rawConfidence = forecast.rawConfidence ?? rawForecast.confidence;
  const calibratedConfidence = forecast.calibratedConfidence ?? forecast.confidence;

  const rr = fullSignal.riskReward.toTP1 ?? fullSignal.targets[0]?.rewardRisk ?? null;
  const entryDistance = fullSignal.entryZone
    ? distanceFromEntry(snapshot.currentPrice, fullSignal.entryZone.low, fullSignal.entryZone.high)
    : null;
  const nearThreshold = snapshot.market === 'FOREX' ? 0.25 : snapshot.market === 'STOCK' ? 0.55 : 0.8;
  const nearEntry = entryDistance != null && entryDistance <= nearThreshold;

  const signalScore = signalComponent(fullSignal.decision, fullSignal.score);
  const forecastScore = longForecastScore(forecast.overallBias, directionProbability);
  const signalHistorical = calibration.calibratedWinRate;
  const forecastHistorical = horizonMetrics?.calibratedDirectionAccuracy ?? null;
  const historicalValues = [signalHistorical, forecastHistorical].filter((value): value is number => value != null && Number.isFinite(value));
  const historicalScore = historicalValues.length
    ? historicalValues.reduce((sum, value) => sum + value, 0) / historicalValues.length
    : 50;
  const rrScore = riskRewardScore(rr);
  const dataScore = quality.score;

  let opportunityScore = signalScore * 0.32 + forecastScore * 0.20 + historicalScore * 0.18 + rrScore * 0.15 + dataScore * 0.15;
  if (!quality.signalAllowed) opportunityScore = Math.min(opportunityScore, 35);
  if (fullSignal.decision === 'AVOID') opportunityScore = Math.min(opportunityScore, 42);
  if (fullSignal.decision === 'WAIT') opportunityScore = Math.min(opportunityScore, 68);
  if (rr != null && rr < 1) opportunityScore = Math.min(opportunityScore, 64);
  opportunityScore = Math.round(clamp(opportunityScore, 0, 100));
  const grade = gradeFor(opportunityScore, fullSignal.decision, quality.signalAllowed);

  const reasons: string[] = [];
  const blockers: string[] = [];
  if (fullSignal.decision === 'BUY') reasons.push(`Signal BUY ${fullSignal.score}/100 (${fullSignal.setupLabel}).`);
  else if (fullSignal.decision === 'WAIT') reasons.push(`Signal đang WAIT ${fullSignal.score}/100; scanner giữ ở nhóm theo dõi.`);
  else blockers.push('Signal Engine đang AVOID; Opportunity Score bị giới hạn.');
  if (forecast.overallBias === 'BULLISH') reasons.push(`${forecast.overallLabel}, directional confidence ${directionProbability}%.`);
  else if (forecast.overallBias === 'BEARISH') blockers.push(`${forecast.overallLabel}; không thuận với chiến lược LONG-only/Spot.`);
  else reasons.push('Forecast trung tính; chưa đóng góp nhiều vào ranking.');
  if (forecastHistorical != null) reasons.push(`Forecast historical accuracy ${forecastHistorical.toFixed(1)}% (${horizonMetrics?.samples ?? 0} mẫu ${horizon.toLowerCase()}).`);
  if (signalHistorical != null) reasons.push(`Signal calibrated win rate ${signalHistorical.toFixed(1)}% (${calibration.resolvedTrades} resolved).`);
  if (rr != null) (rr >= 1.5 ? reasons : blockers).push(`Risk/Reward TP1 ${rr.toFixed(2)}R.`);
  if (nearEntry) reasons.push(entryDistance === 0 ? 'Giá đang nằm trong Entry Zone.' : `Giá cách Entry Zone khoảng ${entryDistance?.toFixed(2)}%.`);
  if (!quality.signalAllowed) blockers.push(...quality.blockers.slice(0, 2));
  if (quality.status !== 'HEALTHY') blockers.push(`Data Quality ${quality.statusLabel} (${quality.score}/100).`);

  return {
    market: snapshot.market,
    symbol: snapshot.symbol,
    displayName: snapshot.displayName,
    exchange: snapshot.exchange,
    provider: snapshot.provider,
    interval: snapshot.interval,
    currency: snapshot.currency,
    currentPrice: snapshot.currentPrice,
    changePercent: snapshot.changePercent,
    dataAt: snapshot.dataAt,
    strategy,
    regime: {
      key: analysis.regime.key,
      label: analysis.regime.label,
      direction: analysis.regime.direction,
      confidence: analysis.regime.confidence,
    },
    signal: {
      decision: fullSignal.decision,
      decisionLabel: fullSignal.decisionLabel,
      setup: fullSignal.setup,
      setupLabel: fullSignal.setupLabel,
      score: fullSignal.score,
      scoreLabel: fullSignal.scoreLabel,
      entryZone: fullSignal.entryZone,
      stopLoss: fullSignal.stopLoss,
      targets: fullSignal.targets,
    },
    calibration: {
      applicable: calibration.applicable,
      quality: calibration.quality,
      qualityLabel: calibration.qualityLabel,
      calibratedWinRate: calibration.calibratedWinRate,
      resolvedTrades: calibration.resolvedTrades,
      expectancyR: calibration.expectancyR,
      profitFactor: calibration.profitFactor,
      estimatedTimeToTp1: calibration.estimatedTimeToTp1,
      matchedBy: calibration.matchedBy,
    },
    quality,
    forecast: {
      overallBias: forecast.overallBias,
      overallLabel: forecast.overallLabel,
      rawConfidence,
      calibratedConfidence,
      directionProbability,
      horizon,
      historicalDirectionAccuracy: forecastHistorical,
      historicalRangeHitRate: horizonMetrics?.rangeHitRate ?? null,
      historicalSamples: horizonMetrics?.samples ?? 0,
    },
    opportunity: {
      score: opportunityScore,
      grade: grade.grade,
      label: grade.label,
      riskReward: round(rr, 2),
      nearEntry,
      distanceFromEntryPercent: round(entryDistance, 2),
      components: {
        signal: Math.round(signalScore),
        forecast: Math.round(forecastScore),
        historical: Math.round(historicalScore),
        riskReward: Math.round(rrScore),
        dataQuality: Math.round(dataScore),
      },
      reasons: reasons.slice(0, 5),
      blockers: blockers.slice(0, 5),
    },
    warning: snapshot.warning,
  };
}
