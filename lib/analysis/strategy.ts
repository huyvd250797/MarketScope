import type { Interval, MarketType, StrategyProfileKey, EffectiveStrategyProfile, StrategyProfileAnalysis, TechnicalAnalysis } from '@/lib/market/types';

export type StrategyProfileConfig = {
  key: EffectiveStrategyProfile;
  label: string;
  shortLabel: string;
  description: string;
  holdingGuide: string;
  preferredIntervals: Record<MarketType, Interval[]>;
  buyThreshold: number;
  zoneAtr: number;
  breakoutZoneAtr: number;
  stopAtr: number;
  breakoutStopAtr: number;
  targetR: [number, number, number];
  maxChaseAtr: number;
  weights: { trend: number; momentum: number; structure: number; location: number; risk: number };
  position: {
    stopAtr: number;
    profitProtectPercent: Record<MarketType, number>;
    targetsAtr: [number, number, number];
    trailingAtr: number;
  };
};

export const STRATEGY_PROFILES: Record<EffectiveStrategyProfile, StrategyProfileConfig> = {
  SHORT_TERM: {
    key: 'SHORT_TERM', label: 'Ngắn hạn', shortLabel: 'SHORT',
    description: 'Ưu tiên động lượng, vị trí vào lệnh sát và phản ứng nhanh với thay đổi cấu trúc.',
    holdingGuide: 'Vài giờ – 3 ngày',
    preferredIntervals: { CRYPTO: ['15m', '1h'], STOCK: ['15m', '1h'] },
    buyThreshold: 74, zoneAtr: 0.22, breakoutZoneAtr: 0.18, stopAtr: 0.75, breakoutStopAtr: 0.85,
    targetR: [0.85, 1.55, 2.3], maxChaseAtr: 0.25,
    weights: { trend: 0.85, momentum: 1.22, structure: 0.85, location: 1.18, risk: 1.05 },
    position: { stopAtr: 0.9, profitProtectPercent: { CRYPTO: 2.5, STOCK: 1.5 }, targetsAtr: [0.65, 1.35, 2.2], trailingAtr: 0.16 },
  },
  SWING: {
    key: 'SWING', label: 'Swing', shortLabel: 'SWING',
    description: 'Cân bằng xu hướng, momentum, structure và R:R cho các nhịp giữ vài ngày đến vài tuần.',
    holdingGuide: '3 ngày – 4 tuần',
    preferredIntervals: { CRYPTO: ['1h', '4h', '1d'], STOCK: ['1h', '1d'] },
    buyThreshold: 72, zoneAtr: 0.30, breakoutZoneAtr: 0.23, stopAtr: 0.90, breakoutStopAtr: 1.05,
    targetR: [1, 2, 3], maxChaseAtr: 0.35,
    weights: { trend: 1, momentum: 1, structure: 1, location: 1, risk: 1 },
    position: { stopAtr: 1.1, profitProtectPercent: { CRYPTO: 4, STOCK: 2.5 }, targetsAtr: [0.9, 2.1, 3.8], trailingAtr: 0.22 },
  },
  MEDIUM_TERM: {
    key: 'MEDIUM_TERM', label: 'Trung hạn', shortLabel: 'MEDIUM',
    description: 'Ưu tiên xu hướng và cấu trúc lớn hơn; vùng Entry/SL rộng hơn để giảm nhiễu ngắn hạn.',
    holdingGuide: '3 tuần – 3 tháng',
    preferredIntervals: { CRYPTO: ['4h', '1d'], STOCK: ['1d', '1w'] },
    buyThreshold: 70, zoneAtr: 0.40, breakoutZoneAtr: 0.32, stopAtr: 1.15, breakoutStopAtr: 1.28,
    targetR: [1.35, 2.65, 4.1], maxChaseAtr: 0.45,
    weights: { trend: 1.16, momentum: 0.86, structure: 1.15, location: 0.86, risk: 1.02 },
    position: { stopAtr: 1.35, profitProtectPercent: { CRYPTO: 6, STOCK: 4 }, targetsAtr: [1.35, 3.0, 5.2], trailingAtr: 0.30 },
  },
  LONG_TERM: {
    key: 'LONG_TERM', label: 'Dài hạn', shortLabel: 'LONG',
    description: 'Ưu tiên EMA200, xu hướng lớn và cấu trúc; ít nhạy với dao động ngắn hạn.',
    holdingGuide: '3 tháng trở lên',
    preferredIntervals: { CRYPTO: ['1d', '1w'], STOCK: ['1d', '1w'] },
    buyThreshold: 68, zoneAtr: 0.55, breakoutZoneAtr: 0.45, stopAtr: 1.45, breakoutStopAtr: 1.60,
    targetR: [1.75, 3.5, 5.5], maxChaseAtr: 0.60,
    weights: { trend: 1.28, momentum: 0.68, structure: 1.25, location: 0.75, risk: 1.02 },
    position: { stopAtr: 1.65, profitProtectPercent: { CRYPTO: 9, STOCK: 6 }, targetsAtr: [2.0, 4.5, 7.5], trailingAtr: 0.38 },
  },
};

export function normalizeStrategyProfile(value: string | null | undefined): StrategyProfileKey {
  const key = String(value || 'AUTO').toUpperCase();
  return key === 'SHORT_TERM' || key === 'SWING' || key === 'MEDIUM_TERM' || key === 'LONG_TERM' ? key : 'AUTO';
}

function baselineForInterval(interval: Interval): EffectiveStrategyProfile {
  if (interval === '15m') return 'SHORT_TERM';
  if (interval === '1h') return 'SWING';
  if (interval === '4h') return 'SWING';
  if (interval === '1d') return 'MEDIUM_TERM';
  return 'LONG_TERM';
}

function fitForInterval(profile: EffectiveStrategyProfile, market: MarketType, interval: Interval): StrategyProfileAnalysis['timeframeFit'] {
  if (STRATEGY_PROFILES[profile].preferredIntervals[market].includes(interval)) return 'GOOD';
  const adjacent: Record<EffectiveStrategyProfile, Interval[]> = {
    SHORT_TERM: ['4h'],
    SWING: ['15m', '1w'],
    MEDIUM_TERM: ['1h', '1w'],
    LONG_TERM: ['4h'],
  };
  return adjacent[profile].includes(interval) ? 'ACCEPTABLE' : 'MISMATCH';
}

export function recommendStrategyProfile(market: MarketType, interval: Interval, analysis: TechnicalAnalysis): { profile: EffectiveStrategyProfile; confidence: number; rationale: string[] } {
  let profile = baselineForInterval(interval);
  const rationale: string[] = [`Timeframe ${interval.toUpperCase()} đặt baseline ở ${STRATEGY_PROFILES[profile].label}.`];
  const adx = analysis.indicators.adx14.value ?? 0;
  const atrPercent = analysis.indicators.atr14.percent ?? 0;
  const rsi = analysis.indicators.rsi14.value ?? 50;

  if (analysis.regime.key === 'RANGE') {
    if (interval === '1d') profile = 'SWING';
    else if (interval === '4h') profile = 'SWING';
    else if (interval === '1w') profile = 'MEDIUM_TERM';
    rationale.push('Market Regime đang đi ngang; ưu tiên horizon ngắn hơn để tránh kéo target quá xa khi chưa có trend lớn.');
  } else if (analysis.regime.direction === 'BULLISH' && adx >= 25) {
    if (interval === '1h') profile = 'SWING';
    else if (interval === '4h') profile = 'MEDIUM_TERM';
    else if (interval === '1d') profile = 'MEDIUM_TERM';
    else if (interval === '1w') profile = 'LONG_TERM';
    rationale.push(`ADX ${adx.toFixed(1)} + regime bullish cho phép ưu tiên giữ theo xu hướng thay vì chỉ trade rất ngắn.`);
  }

  if (analysis.regime.key === 'VOLATILE' || atrPercent >= (market === 'CRYPTO' ? 6.5 : 4.8)) {
    if (profile === 'SHORT_TERM') profile = 'SWING';
    rationale.push(`ATR ${atrPercent.toFixed(2)}% cho thấy nhiễu/biến động cao; AUTO tránh profile quá sát để giảm whipsaw.`);
  }

  if (analysis.regime.direction === 'BEARISH') {
    if (interval === '1w') profile = 'LONG_TERM';
    rationale.push('Regime bearish: profile chỉ định horizon phân tích; Signal Engine LONG-only vẫn có thể trả WAIT/AVOID thay vì cố tạo BUY.');
  }

  if (rsi >= 72) rationale.push(`RSI ${rsi.toFixed(1)} cao; dù chọn profile nào, Smart Analysis sẽ tăng cảnh báo mua đuổi.`);

  const fit = fitForInterval(profile, market, interval);
  let confidence = analysis.regime.confidence;
  confidence += fit === 'GOOD' ? 8 : fit === 'ACCEPTABLE' ? 0 : -12;
  if (adx >= 25) confidence += 4;
  confidence = Math.max(45, Math.min(92, Math.round(confidence)));
  return { profile, confidence, rationale: rationale.slice(0, 4) };
}

export function resolveStrategyProfile(
  requested: StrategyProfileKey,
  market: MarketType,
  interval: Interval,
  analysis: TechnicalAnalysis,
): StrategyProfileAnalysis {
  const recommendation = recommendStrategyProfile(market, interval, analysis);
  const effective = requested === 'AUTO' ? recommendation.profile : requested;
  const config = STRATEGY_PROFILES[effective];
  const timeframeFit = fitForInterval(effective, market, interval);
  const fitLabel = timeframeFit === 'GOOD' ? 'Timeframe phù hợp' : timeframeFit === 'ACCEPTABLE' ? 'Có thể sử dụng' : 'Timeframe chưa tối ưu';
  const preferred = config.preferredIntervals[market];
  const rationale = requested === 'AUTO'
    ? recommendation.rationale
    : [
        `Bạn đang cố định profile ${config.label}; MarketScope không tự đổi profile giữa lần phân tích này.`,
        ...(effective !== recommendation.profile ? [`AUTO hiện đề xuất ${STRATEGY_PROFILES[recommendation.profile].label} dựa trên regime/volatility hiện tại.`] : ['Profile đã chọn trùng với đề xuất AUTO hiện tại.']),
      ];

  return {
    requested,
    effective,
    effectiveLabel: config.label,
    recommended: recommendation.profile,
    recommendedLabel: STRATEGY_PROFILES[recommendation.profile].label,
    autoApplied: requested === 'AUTO',
    confidence: recommendation.confidence,
    timeframeFit,
    timeframeFitLabel: fitLabel,
    preferredIntervals: preferred,
    holdingGuide: config.holdingGuide,
    description: config.description,
    rationale,
  };
}

export function strategyConfig(profile: EffectiveStrategyProfile) {
  return STRATEGY_PROFILES[profile];
}
