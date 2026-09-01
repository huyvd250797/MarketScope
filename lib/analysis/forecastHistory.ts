import { actualDirection } from '@/lib/analysis/forecastValidation';
import type { Candle, ForecastHistoryRecord, ForecastHistoryScenario, MarketSnapshot } from '@/lib/market/types';

export const FORECAST_HISTORY_STORAGE_KEY = 'marketscope-forecast-history-v0.11';
const MAX_RECORDS = 180;

export function createForecastHistoryRecord(snapshot: MarketSnapshot): ForecastHistoryRecord | null {
  const forecast = snapshot.forecast;
  if (!forecast || !snapshot.strategy) return null;
  return {
    id: `${snapshot.market}:${snapshot.symbol}:${snapshot.interval}:${snapshot.strategy.effective}:${forecast.originTime}`,
    market: snapshot.market,
    symbol: snapshot.symbol,
    displayName: snapshot.displayName,
    interval: snapshot.interval,
    strategyProfile: snapshot.strategy.effective,
    strategyLabel: snapshot.strategy.effectiveLabel,
    provider: snapshot.provider,
    generatedAt: forecast.generatedAt,
    originTime: forecast.originTime,
    originPrice: forecast.originPrice,
    rawConfidence: forecast.rawConfidence ?? forecast.confidence,
    calibratedConfidence: forecast.calibratedConfidence ?? forecast.confidence,
    overallBias: forecast.overallBias,
    overallLabel: forecast.overallLabel,
    scenarios: forecast.scenarios.map((item): ForecastHistoryScenario => ({
      horizon: item.horizon,
      label: item.label,
      timeGuide: item.timeGuide,
      evaluationBars: item.evaluationBars,
      predictedDirection: item.direction,
      directionLabel: item.directionLabel,
      rawProbability: item.rawProbability ?? item.probability,
      calibratedProbability: item.calibratedProbability ?? item.probability,
      expectedPrice: item.expectedPrice,
      rangeLow: item.rangeLow,
      rangeHigh: item.rangeHigh,
      status: 'PENDING',
    })),
  };
}

export function upsertForecastRecord(records: ForecastHistoryRecord[], record: ForecastHistoryRecord): ForecastHistoryRecord[] {
  const exists = records.find((item) => item.id === record.id);
  if (exists) return records;
  return [record, ...records].slice(0, MAX_RECORDS);
}

export function resolveForecastRecords(records: ForecastHistoryRecord[], snapshot: MarketSnapshot): { records: ForecastHistoryRecord[]; changed: boolean } {
  const candles = [...snapshot.candles].sort((a, b) => a.time - b.time);
  let changed = false;
  const next = records.map((record) => {
    if (record.market !== snapshot.market || record.symbol !== snapshot.symbol || record.interval !== snapshot.interval) return record;
    let recordChanged = false;
    const futureCandles = candles.filter((candle) => candle.time > record.originTime);
    const scenarios = record.scenarios.map((scenario) => {
      if (scenario.status === 'RESOLVED' || futureCandles.length < scenario.evaluationBars) return scenario;
      const target = futureCandles[scenario.evaluationBars - 1];
      if (!target) return scenario;
      const realizedDirection = actualDirection(record.originPrice, target.close, record.market, scenario.evaluationBars);
      recordChanged = true;
      return {
        ...scenario,
        status: 'RESOLVED' as const,
        targetTime: target.time,
        actualPrice: target.close,
        actualDirection: realizedDirection,
        directionCorrect: realizedDirection === scenario.predictedDirection,
        rangeHit: target.close >= scenario.rangeLow && target.close <= scenario.rangeHigh,
        absoluteErrorPercent: Math.abs(target.close / scenario.expectedPrice - 1) * 100,
      };
    });
    if (!recordChanged) return record;
    changed = true;
    return { ...record, scenarios };
  });
  return { records: next, changed };
}

export function forecastHistoryMetrics(records: ForecastHistoryRecord[]) {
  const resolved = records.flatMap((record) => record.scenarios.map((scenario) => ({ record, scenario }))).filter((item) => item.scenario.status === 'RESOLVED');
  const summarize = (items: typeof resolved) => {
    if (!items.length) return { samples: 0, directionAccuracy: null as number | null, rangeHitRate: null as number | null, avgErrorPercent: null as number | null };
    const correct = items.filter((item) => item.scenario.directionCorrect).length;
    const ranges = items.filter((item) => item.scenario.rangeHit).length;
    const errors = items.map((item) => item.scenario.absoluteErrorPercent || 0);
    return {
      samples: items.length,
      directionAccuracy: correct / items.length * 100,
      rangeHitRate: ranges / items.length * 100,
      avgErrorPercent: errors.reduce((sum, value) => sum + value, 0) / errors.length,
    };
  };
  return {
    overall: summarize(resolved),
    SHORT: summarize(resolved.filter((item) => item.scenario.horizon === 'SHORT')),
    MEDIUM: summarize(resolved.filter((item) => item.scenario.horizon === 'MEDIUM')),
    LONG: summarize(resolved.filter((item) => item.scenario.horizon === 'LONG')),
  };
}

export function readForecastHistory(): ForecastHistoryRecord[] {
  if (typeof window === 'undefined') return [];
  try {
    const parsed = JSON.parse(localStorage.getItem(FORECAST_HISTORY_STORAGE_KEY) || '[]') as ForecastHistoryRecord[];
    return Array.isArray(parsed) ? parsed.filter((item) => item && item.id && Array.isArray(item.scenarios)).slice(0, MAX_RECORDS) : [];
  } catch {
    return [];
  }
}

export function writeForecastHistory(records: ForecastHistoryRecord[]) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(FORECAST_HISTORY_STORAGE_KEY, JSON.stringify(records.slice(0, MAX_RECORDS)));
}
