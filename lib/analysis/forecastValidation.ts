import { analyzeTechnical } from '@/lib/analysis/technical';
import { forecastPriceBehavior } from '@/lib/analysis/forecast';
import { resolveStrategyProfile } from '@/lib/analysis/strategy';
import type {
  Candle,
  EffectiveStrategyProfile,
  ForecastHorizon,
  ForecastValidationMetrics,
  ForecastValidationResult,
  ForecastValidationSample,
  Interval,
  MarketType,
  PriceForecast,
} from '@/lib/market/types';

const HORIZONS: ForecastHorizon[] = ['SHORT', 'MEDIUM', 'LONG'];
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const round = (value: number | null, digits = 2) => value == null || !Number.isFinite(value) ? null : Math.round(value * 10 ** digits) / 10 ** digits;

function median(values: number[]): number | null {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function betaCalibrated(correct: number, samples: number) {
  if (!samples) return null;
  return ((correct + 2) / (samples + 4)) * 100;
}

function emptyMetrics(): ForecastValidationMetrics {
  return {
    samples: 0,
    directionCorrect: 0,
    directionAccuracy: null,
    calibratedDirectionAccuracy: null,
    rangeHits: 0,
    rangeHitRate: null,
    avgAbsoluteErrorPercent: null,
    medianAbsoluteErrorPercent: null,
    avgRawProbability: null,
    calibrationGap: null,
  };
}

function summarize(samples: ForecastValidationSample[]): ForecastValidationMetrics {
  if (!samples.length) return emptyMetrics();
  const correct = samples.filter((item) => item.directionCorrect).length;
  const rangeHits = samples.filter((item) => item.rangeHit).length;
  const directionAccuracy = correct / samples.length * 100;
  const avgRawProbability = samples.reduce((sum, item) => sum + item.rawProbability, 0) / samples.length;
  const errors = samples.map((item) => item.absoluteErrorPercent);
  return {
    samples: samples.length,
    directionCorrect: correct,
    directionAccuracy: round(directionAccuracy),
    calibratedDirectionAccuracy: round(betaCalibrated(correct, samples.length)),
    rangeHits,
    rangeHitRate: round(rangeHits / samples.length * 100),
    avgAbsoluteErrorPercent: round(errors.reduce((sum, value) => sum + value, 0) / errors.length),
    medianAbsoluteErrorPercent: round(median(errors)),
    avgRawProbability: round(avgRawProbability),
    calibrationGap: round(Math.abs(avgRawProbability - directionAccuracy)),
  };
}

function actualDirection(originPrice: number, actualPrice: number, market: MarketType, bars: number): 'UP' | 'DOWN' | 'SIDEWAYS' {
  const change = actualPrice / originPrice - 1;
  const threshold = (market === 'FOREX' ? 0.0012 : market === 'STOCK' ? 0.003 : 0.004) * Math.sqrt(Math.max(1, bars / 4));
  return change > threshold ? 'UP' : change < -threshold ? 'DOWN' : 'SIDEWAYS';
}

function qualityLabel(samples: number, calibrationGap: number | null): { key: ForecastValidationResult['confidenceQuality']; label: string } {
  if (samples < 12) return { key: 'INSUFFICIENT', label: 'Chưa đủ mẫu' };
  if (samples < 30) return { key: 'LOW', label: 'Độ tin cậy thấp' };
  if (samples >= 60 && (calibrationGap ?? 99) <= 8) return { key: 'HIGH', label: 'Độ tin cậy cao' };
  return { key: 'MEDIUM', label: 'Độ tin cậy trung bình' };
}

/**
 * Causal rolling validation: every historical forecast is generated only from candles
 * available at that origin. The still-forming candle is represented by a duplicate
 * placeholder so forecastPriceBehavior keeps its production convention of excluding
 * the final candle without seeing any future OHLC.
 */
export function validateForecastHistory(
  candles: Candle[],
  market: MarketType,
  interval: Interval,
  profile: EffectiveStrategyProfile,
  options: { maxOrigins?: number } = {},
): ForecastValidationResult {
  const closed = candles.length > 1 ? candles.slice(0, -1) : candles;
  const warmup = 220;
  const maxHorizonBars = interval === '15m' ? 40 : interval === '1h' || interval === '4h' ? 72 : interval === '1d' ? 60 : 36;
  const lastOrigin = closed.length - maxHorizonBars - 1;
  const eligible = Math.max(0, lastOrigin - warmup + 1);
  const maxOrigins = Math.max(6, Math.min(36, options.maxOrigins ?? 36));
  const step = Math.max(1, Math.ceil(eligible / maxOrigins));
  const samples: ForecastValidationSample[] = [];
  let origins = 0;

  for (let originIndex = warmup; originIndex <= lastOrigin; originIndex += step) {
    const prefix = closed.slice(0, originIndex + 1);
    if (prefix.length < warmup) continue;
    try {
      const analysis = analyzeTechnical(prefix, market);
      const strategy = resolveStrategyProfile(profile, market, interval, analysis);
      const origin = prefix[prefix.length - 1];
      const placeholder: Candle = { ...origin, time: origin.time + 1 };
      const forecast = forecastPriceBehavior([...prefix, placeholder], market, interval, analysis, strategy);
      origins += 1;
      for (const scenario of forecast.scenarios) {
        const targetIndex = originIndex + scenario.evaluationBars;
        const target = closed[targetIndex];
        if (!target) continue;
        const realizedDirection = actualDirection(origin.close, target.close, market, scenario.evaluationBars);
        samples.push({
          originTime: origin.time,
          targetTime: target.time,
          horizon: scenario.horizon,
          predictedDirection: scenario.direction,
          actualDirection: realizedDirection,
          directionCorrect: scenario.direction === realizedDirection,
          predictedPrice: scenario.expectedPrice,
          actualPrice: target.close,
          rangeLow: scenario.rangeLow,
          rangeHigh: scenario.rangeHigh,
          rangeHit: target.close >= scenario.rangeLow && target.close <= scenario.rangeHigh,
          absoluteErrorPercent: Math.abs(target.close / scenario.expectedPrice - 1) * 100,
          rawProbability: scenario.probability,
          profile,
          regime: analysis.regime.key,
        });
      }
    } catch {
      // Skip an origin that cannot produce complete technical data.
    }
  }

  const byHorizon = {
    SHORT: summarize(samples.filter((item) => item.horizon === 'SHORT')),
    MEDIUM: summarize(samples.filter((item) => item.horizon === 'MEDIUM')),
    LONG: summarize(samples.filter((item) => item.horizon === 'LONG')),
  };
  const overall = summarize(samples);
  const quality = qualityLabel(overall.samples, overall.calibrationGap);

  return {
    generatedAt: new Date().toISOString(),
    status: overall.samples >= 12 ? 'READY' : overall.samples > 0 ? 'LIMITED' : 'INSUFFICIENT_HISTORY',
    sampleOrigins: origins,
    evaluatedScenarios: samples.length,
    strategyProfile: profile,
    horizons: byHorizon,
    overall: {
      directionAccuracy: overall.directionAccuracy,
      calibratedDirectionAccuracy: overall.calibratedDirectionAccuracy,
      rangeHitRate: overall.rangeHitRate,
      avgAbsoluteErrorPercent: overall.avgAbsoluteErrorPercent,
      avgRawProbability: overall.avgRawProbability,
      calibrationGap: overall.calibrationGap,
    },
    confidenceQuality: quality.key,
    confidenceQualityLabel: quality.label,
    recentSamples: samples.slice(-12).reverse(),
    methodology: [
      'Rolling causal validation: mỗi forecast lịch sử chỉ dùng dữ liệu có sẵn tại thời điểm đó.',
      'Direction Accuracy so sánh hướng dự báo với hướng thực tế sau đúng số nến của từng horizon.',
      'Range Hit Rate đo giá thực tế có nằm trong vùng xác suất đã dự báo hay không.',
      'Directional accuracy được shrink về 50% bằng prior Beta(2,2) khi mẫu còn nhỏ.',
    ],
    disclaimer: 'Historical accuracy chỉ mô tả hiệu quả của mô hình trên lịch sử mã/timeframe/profile hiện tại; không bảo đảm forecast tương lai sẽ đúng.',
  };
}

export function calibrateForecast(forecast: PriceForecast, validation: ForecastValidationResult): PriceForecast {
  const rawConfidence = forecast.rawConfidence ?? forecast.confidence;
  const overallSamples = validation.evaluatedScenarios;
  const overallHistorical = validation.overall.calibratedDirectionAccuracy;
  const overallReliability = overallHistorical == null ? 0 : clamp(overallSamples / 90, 0, 0.72);
  const calibratedConfidence = overallHistorical == null
    ? rawConfidence
    : Math.round(rawConfidence * (1 - overallReliability) + overallHistorical * overallReliability);

  return {
    ...forecast,
    rawConfidence,
    confidence: calibratedConfidence,
    calibratedConfidence,
    calibration: {
      quality: validation.confidenceQuality,
      qualityLabel: validation.confidenceQualityLabel,
      samples: validation.evaluatedScenarios,
      historicalDirectionAccuracy: validation.overall.calibratedDirectionAccuracy,
      rangeHitRate: validation.overall.rangeHitRate,
    },
    scenarios: forecast.scenarios.map((scenario) => {
      const metrics = validation.horizons[scenario.horizon];
      const historical = metrics.calibratedDirectionAccuracy;
      const reliability = historical == null ? 0 : clamp(metrics.samples / 40, 0, 0.78);
      const calibratedProbability = historical == null
        ? scenario.probability
        : Math.round(scenario.probability * (1 - reliability) + historical * reliability);
      return {
        ...scenario,
        rawProbability: scenario.probability,
        calibratedProbability,
        historicalSamples: metrics.samples,
        historicalDirectionAccuracy: metrics.calibratedDirectionAccuracy,
        historicalRangeHitRate: metrics.rangeHitRate,
        historicalAvgErrorPercent: metrics.avgAbsoluteErrorPercent,
      };
    }),
  };
}

export { actualDirection };
