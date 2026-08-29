import { strategyConfig } from '@/lib/analysis/strategy';
import type { Candle, EffectiveStrategyProfile, Interval, MarketType, PositionExitAnalysis, TechnicalAnalysis, TradeSignal } from '@/lib/market/types';

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

const round = (value: number | null, digits = 8): number | null => {
  if (value == null || !Number.isFinite(value)) return null;
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
};

function nearestBelow(values: Array<number | null | undefined>, price: number): number | null {
  const valid = values.filter((value): value is number => value != null && Number.isFinite(value) && value < price);
  return valid.length ? Math.max(...valid) : null;
}

function nearestAbove(values: Array<number | null | undefined>, price: number): number | null {
  const valid = values.filter((value): value is number => value != null && Number.isFinite(value) && value > price);
  return valid.length ? Math.min(...valid) : null;
}

function pivotLevels(candles: Candle[], radius = 2) {
  const window = candles.slice(-180, -1);
  const highs: number[] = [];
  const lows: number[] = [];

  for (let i = radius; i < window.length - radius; i += 1) {
    const sample = window.slice(i - radius, i + radius + 1);
    if (window[i].high >= Math.max(...sample.map((c) => c.high))) highs.push(window[i].high);
    if (window[i].low <= Math.min(...sample.map((c) => c.low))) lows.push(window[i].low);
  }
  return { highs, lows };
}

function uniqueAscending(values: number[], tolerance: number) {
  const sorted = [...values].filter(Number.isFinite).sort((a, b) => a - b);
  const unique: number[] = [];
  for (const value of sorted) {
    if (!unique.length || Math.abs(value - unique[unique.length - 1]) > tolerance) unique.push(value);
  }
  return unique;
}

function horizonGuide(interval: Interval, profile: EffectiveStrategyProfile) {
  const profileMap: Record<EffectiveStrategyProfile, { short: string; medium: string; long: string }> = {
    SHORT_TERM: { short: '4–12 giờ', medium: '1–3 ngày', long: '3–7 ngày' },
    SWING: { short: '3–7 ngày', medium: '1–3 tuần', long: '2–6 tuần' },
    MEDIUM_TERM: { short: '2–4 tuần', medium: '1–3 tháng', long: '3–6 tháng' },
    LONG_TERM: { short: '1–3 tháng', medium: '3–9 tháng', long: '6–18 tháng' },
  };
  return {
    ...profileMap[profile],
    note: `Khung mục tiêu đang theo profile ${strategyConfig(profile).label} trên timeframe ${interval.toUpperCase()}; đây không phải dự đoán chắc chắn thời gian chạm target.`,
  };
}

function structureAwareTarget(
  baseTarget: number,
  candidateResistance: number | undefined,
  currentPrice: number,
  atr: number,
) {
  if (candidateResistance == null || !Number.isFinite(candidateResistance)) return baseTarget;
  if (candidateResistance <= currentPrice + atr * 0.3) return baseTarget;
  const nearResistance = candidateResistance - atr * 0.08;
  if (nearResistance <= baseTarget + atr * 1.25) return Math.max(currentPrice + atr * 0.35, nearResistance);
  return baseTarget;
}

export function analyzePositionExit(
  candles: Candle[],
  market: MarketType,
  interval: Interval,
  analysis: TechnicalAnalysis,
  signal: TradeSignal | undefined,
  entryPrice: number,
  profile: EffectiveStrategyProfile = 'SWING',
): PositionExitAnalysis {
  const profileConfig = strategyConfig(profile);
  if (!Number.isFinite(entryPrice) || entryPrice <= 0) throw new Error('Giá vào lệnh phải lớn hơn 0.');
  const current = candles[candles.length - 1];
  if (!current || !Number.isFinite(current.close) || current.close <= 0) throw new Error('Không đủ dữ liệu giá để phân tích vị thế.');

  const currentPrice = current.close;
  const atr = analysis.indicators.atr14.value ?? currentPrice * (market === 'CRYPTO' ? 0.02 : 0.015);
  const atrPercent = analysis.indicators.atr14.percent;
  const ema20 = analysis.indicators.ema.ema20;
  const ema50 = analysis.indicators.ema.ema50;
  const vwap = analysis.indicators.vwap.value;
  const pivots = pivotLevels(candles);
  const fallbackSupport = candles.length > 12 ? Math.min(...candles.slice(-30, -1).map((c) => c.low)) : null;
  const fallbackResistance = candles.length > 12 ? Math.max(...candles.slice(-30, -1).map((c) => c.high)) : null;

  const pivotSupport = nearestBelow(pivots.lows, currentPrice) ?? signal?.context.support ?? fallbackSupport;
  const pivotResistance = nearestAbove(pivots.highs, currentPrice) ?? signal?.context.resistance ?? fallbackResistance;
  const technicalFloor = nearestBelow([ema20, ema50, vwap, pivotSupport, signal?.context.support], currentPrice);

  const pnlPerUnit = currentPrice - entryPrice;
  const pnlPercent = (pnlPerUnit / entryPrice) * 100;
  const profitProtectThreshold = profileConfig.position.profitProtectPercent[market];

  const baseStopByEntry = entryPrice - atr * profileConfig.position.stopAtr;
  const baseStopByStructure = technicalFloor != null ? technicalFloor - atr * 0.28 : baseStopByEntry;
  let defensiveStop = Math.min(baseStopByEntry, baseStopByStructure);
  if (!(defensiveStop > 0)) defensiveStop = entryPrice * (market === 'CRYPTO' ? 0.94 : 0.96);

  const trailingReference = nearestBelow([ema20, vwap, pivotSupport, ema50], currentPrice);
  if (pnlPercent >= profitProtectThreshold) {
    const technicalTrail = trailingReference != null ? trailingReference - atr * profileConfig.position.trailingAtr : currentPrice - atr * Math.max(0.8, profileConfig.position.stopAtr * 0.9);
    const breakEvenBuffer = entryPrice * (market === 'CRYPTO' ? 1.003 : 1.002);
    defensiveStop = Math.max(defensiveStop, technicalTrail, breakEvenBuffer);
    defensiveStop = Math.min(defensiveStop, currentPrice - atr * 0.18);
  }

  const breached = currentPrice <= defensiveStop;
  const riskFromEntryPercent = Math.max(0, ((entryPrice - defensiveStop) / entryPrice) * 100);
  const lockedProfitPercent = defensiveStop > entryPrice ? ((defensiveStop - entryPrice) / entryPrice) * 100 : null;

  const targetFloor = Math.max(currentPrice, entryPrice);
  const futureHighs = uniqueAscending(
    pivots.highs.filter((value) => value > targetFloor + atr * 0.2),
    Math.max(atr * 0.18, currentPrice * 0.001),
  );
  const [shortAtr, mediumAtr, longAtr] = profileConfig.position.targetsAtr;
  const shortBase = targetFloor + atr * shortAtr;
  const mediumBase = targetFloor + atr * mediumAtr;
  const longBase = targetFloor + atr * longAtr;

  let shortTarget = structureAwareTarget(shortBase, futureHighs[0], currentPrice, atr);
  let mediumTarget = structureAwareTarget(mediumBase, futureHighs[1] ?? futureHighs[0], currentPrice, atr);
  let longTarget = structureAwareTarget(longBase, futureHighs[2] ?? futureHighs[1], currentPrice, atr);
  shortTarget = Math.max(shortTarget, targetFloor + atr * 0.45);
  mediumTarget = Math.max(mediumTarget, shortTarget + atr * 0.65);
  longTarget = Math.max(longTarget, mediumTarget + atr * 0.95);

  const nearestResistance = nearestAbove([pivotResistance, ...futureHighs], currentPrice);
  const nearResistance = nearestResistance != null && nearestResistance - currentPrice <= atr * 0.35;
  const strongBearish = analysis.regime.direction === 'BEARISH' && analysis.regime.structure === 'LH_LL';
  const deepLossAtr = entryPrice > currentPrice && (entryPrice - currentPrice) / atr >= 2.2;

  let action: PositionExitAnalysis['action'] = 'HOLD';
  if (breached) action = 'EXIT_RISK';
  else if ((strongBearish && pnlPercent < 0) || deepLossAtr) action = 'REDUCE_RISK';
  else if (pnlPercent > 0 && nearResistance) action = 'TAKE_PARTIAL';
  else if (pnlPercent >= profitProtectThreshold) action = 'PROTECT_PROFIT';

  const actionLabel: Record<PositionExitAnalysis['action'], string> = {
    HOLD: 'HOLD / THEO DÕI',
    PROTECT_PROFIT: 'BẢO VỆ LỢI NHUẬN',
    TAKE_PARTIAL: 'CÂN NHẮC CHỐT MỘT PHẦN',
    REDUCE_RISK: 'GIẢM RỦI RO / ĐÁNH GIÁ LẠI',
    EXIT_RISK: 'MỐC RỦI RO ĐÃ BỊ PHÁ',
  };

  let status: PositionExitAnalysis['status'] = 'NEAR_ENTRY';
  if (breached) status = 'RISK';
  else if (pnlPercent > 0.5) status = 'PROFIT';
  else if (pnlPercent < -0.5) status = 'LOSS';

  const statusLabel: Record<PositionExitAnalysis['status'], string> = {
    PROFIT: 'Đang có lãi',
    NEAR_ENTRY: 'Quanh giá vốn',
    LOSS: 'Đang âm',
    RISK: 'Vùng rủi ro',
  };

  const guide = horizonGuide(interval, profile);
  const exits: PositionExitAnalysis['exits'] = [
    {
      key: 'SHORT', label: 'Ngắn hạn', target: round(shortTarget) as number,
      profitPercent: round(((shortTarget - entryPrice) / entryPrice) * 100, 2) as number,
      distanceFromCurrentPercent: round(((shortTarget - currentPrice) / currentPrice) * 100, 2) as number,
      horizon: guide.short,
      note: 'Mốc chốt lời gần nhất theo ATR và kháng cự/pivot. Ưu tiên quan sát phản ứng giá khi tiếp cận vùng này.',
    },
    {
      key: 'MEDIUM', label: 'Trung hạn', target: round(mediumTarget) as number,
      profitPercent: round(((mediumTarget - entryPrice) / entryPrice) * 100, 2) as number,
      distanceFromCurrentPercent: round(((mediumTarget - currentPrice) / currentPrice) * 100, 2) as number,
      horizon: guide.medium,
      note: 'Mục tiêu mở rộng nếu cấu trúc tăng và động lượng còn được duy trì sau mốc ngắn hạn.',
    },
    {
      key: 'LONG', label: 'Dài hạn', target: round(longTarget) as number,
      profitPercent: round(((longTarget - entryPrice) / entryPrice) * 100, 2) as number,
      distanceFromCurrentPercent: round(((longTarget - currentPrice) / currentPrice) * 100, 2) as number,
      horizon: guide.long,
      note: 'Mốc mở rộng; cần đánh giá lại regime/structure theo dữ liệu mới, không nên giữ máy móc chỉ vì target còn xa.',
    },
  ];

  const reasons: string[] = [];
  const warnings: string[] = [];
  if (pnlPercent > 0) reasons.push(`Vị thế đang lãi ${pnlPercent.toFixed(2)}% so với giá vào.`);
  else if (pnlPercent < 0) warnings.push(`Vị thế đang âm ${Math.abs(pnlPercent).toFixed(2)}% so với giá vào.`);
  if (analysis.regime.direction === 'BULLISH') reasons.push(`Market Regime hiện ${analysis.regime.label.toLowerCase()}, thuận lợi hơn cho việc giữ vị thế LONG.`);
  if (analysis.regime.structure === 'HH_HL') reasons.push('Cấu trúc HH/HL vẫn đang hỗ trợ kịch bản giữ theo xu hướng.');
  if (nearResistance) warnings.push('Giá đang sát kháng cự gần; rủi ro rung lắc/chốt lời ngắn hạn tăng.');
  if (strongBearish) warnings.push('Regime giảm + cấu trúc LH/LL: vị thế LONG cần ưu tiên quản trị rủi ro.');
  if (deepLossAtr) warnings.push('Giá hiện tại thấp hơn giá vốn trên 2.2 ATR; cần đánh giá lại thesis thay vì chỉ chờ hòa vốn.');
  if (atrPercent != null && atrPercent > (market === 'CRYPTO' ? 6 : 4.5)) warnings.push(`ATR ${atrPercent.toFixed(2)}% cho thấy biến động cao, các mốc kỹ thuật có thể bị xuyên nhanh.`);
  if (breached) warnings.unshift('Giá hiện tại đã ở dưới mốc bảo vệ kỹ thuật tính theo structure/ATR.');
  if (pnlPercent >= profitProtectThreshold && defensiveStop > entryPrice) reasons.push(`Mốc bảo vệ đã được nâng trên giá vốn, khóa tối thiểu khoảng ${(lockedProfitPercent ?? 0).toFixed(2)}% nếu được thực thi đúng kế hoạch.`);

  return {
    calculatedAt: new Date().toISOString(),
    entryPrice: round(entryPrice) as number,
    currentPrice: round(currentPrice) as number,
    pnlPercent: round(pnlPercent, 2) as number,
    pnlPerUnit: round(pnlPerUnit) as number,
    status,
    statusLabel: statusLabel[status],
    action,
    actionLabel: actionLabel[action],
    horizonGuide: guide,
    protection: {
      defensiveStop: round(defensiveStop) as number,
      trailingReference: round(trailingReference),
      breakEven: round(entryPrice) as number,
      riskFromEntryPercent: round(riskFromEntryPercent, 2) as number,
      lockedProfitPercent: round(lockedProfitPercent, 2),
      breached,
      note: pnlPercent >= profitProtectThreshold
        ? 'Khi vị thế đã có lãi đáng kể, mốc bảo vệ được nâng theo EMA/VWAP/support và cố gắng không thấp hơn vùng hòa vốn.'
        : 'Mốc bảo vệ kỹ thuật tham chiếu ATR + support/EMA/VWAP; đây không phải mức rủi ro phù hợp cho mọi tài khoản.',
    },
    exits,
    strategy: { profile, label: profileConfig.label, holdingGuide: profileConfig.holdingGuide },
    context: {
      atr: round(atr) as number,
      atrPercent: round(atrPercent, 2),
      support: round(pivotSupport),
      resistance: round(nearestResistance ?? pivotResistance),
      ema20: round(ema20),
      ema50: round(ema50),
      vwap: round(vwap),
      regime: analysis.regime.key,
    },
    reasons,
    warnings,
    guardrails: [
      `Position Engine khóa theo profile ${profileConfig.label} (${profileConfig.holdingGuide}) để không tự đổi horizon giữa chừng.`,
      'Position Engine phân tích vị thế LONG đã vào; không tự đặt lệnh, không dùng leverage recommendation và không tạo lệnh SHORT.',
      'Ngắn/trung/dài hạn là khung lập kế hoạch theo timeframe, không phải ETA chắc chắn để chạm target.',
      'Không suy diễn win rate hoặc xác suất thắng từ Signal Score/Position status; Các thống kê này chỉ được hiển thị từ Backtest & Calibration riêng.',
      'Portfolio V0.9.0 tính phân bổ và concentration risk theo số lượng đã lưu; chưa tự động đặt lệnh hay quyết định tỷ lệ bán.',
    ],
    disclaimer: 'Exit Planner là phân tích rule-based từ giá vốn, OHLCV, ATR, EMA/VWAP, support/resistance và market regime. Các mốc thoát/chốt lời chỉ để tham khảo và phải được đánh giá lại khi dữ liệu thị trường thay đổi.',
  };
}
