import type {
  Interval,
  MarketType,
  OpportunityScannerItem,
  PortfolioRiskSnapshot,
  StrategyProfileKey,
  WatchlistMonitorSnapshot,
} from '@/lib/market/types';

export type AlertPriority = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'INFO';
export type AlertCategory = 'SIGNAL' | 'ENTRY' | 'TARGET' | 'RISK' | 'FORECAST' | 'OPPORTUNITY' | 'POSITION' | 'DATA';
export type AlertAction = 'ANALYZE' | 'POSITION' | 'SCANNER' | 'NONE';

export type AlertEvent = {
  id: string;
  fingerprint: string;
  createdAt: string;
  lastTriggeredAt: string;
  unread: boolean;
  count: number;
  priority: AlertPriority;
  category: AlertCategory;
  title: string;
  message: string;
  market?: MarketType;
  symbol?: string;
  interval?: Interval;
  profile?: StrategyProfileKey;
  action: AlertAction;
  meta?: Record<string, string | number | boolean | null>;
};

export type AlertCandidate = Omit<AlertEvent, 'id' | 'createdAt' | 'lastTriggeredAt' | 'unread' | 'count'>;

export type AlertPreferences = {
  buySignal: boolean;
  entryZone: boolean;
  targets: boolean;
  stopLoss: boolean;
  forecastReversal: boolean;
  opportunity: boolean;
  opportunityThreshold: number;
  positionRisk: boolean;
  dataQuality: boolean;
  browserNotifications: boolean;
  cooldownMinutes: number;
};

export const defaultAlertPreferences: AlertPreferences = {
  buySignal: true,
  entryZone: true,
  targets: true,
  stopLoss: true,
  forecastReversal: true,
  opportunity: true,
  opportunityThreshold: 80,
  positionRisk: true,
  dataQuality: true,
  browserNotifications: false,
  cooldownMinutes: 30,
};

export const ALERTS_STORAGE_KEY = 'marketscope-alert-center-v013';
export const ALERT_PREFS_STORAGE_KEY = 'marketscope-alert-prefs-v013';
export const ALERT_WATCH_STATE_KEY = 'marketscope-alert-watch-state-v013';
export const ALERT_SCANNER_STATE_KEY = 'marketscope-alert-scanner-state-v013';
export const ALERT_PORTFOLIO_STATE_KEY = 'marketscope-alert-portfolio-state-v013';

function inEntry(data: WatchlistMonitorSnapshot) {
  const zone = data.signal.entryZone;
  return Boolean(zone && data.currentPrice >= zone.low && data.currentPrice <= zone.high);
}

function crossedUp(previousPrice: number, currentPrice: number, level: number) {
  return previousPrice < level && currentPrice >= level;
}

function crossedDown(previousPrice: number, currentPrice: number, level: number) {
  return previousPrice > level && currentPrice <= level;
}

function id() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

function enabled(candidate: AlertCandidate, prefs: AlertPreferences) {
  if (candidate.category === 'SIGNAL') return prefs.buySignal;
  if (candidate.category === 'ENTRY') return prefs.entryZone;
  if (candidate.category === 'TARGET') return prefs.targets;
  if (candidate.category === 'RISK') return prefs.stopLoss || prefs.positionRisk;
  if (candidate.category === 'FORECAST') return prefs.forecastReversal;
  if (candidate.category === 'OPPORTUNITY') return prefs.opportunity;
  if (candidate.category === 'POSITION') return prefs.positionRisk;
  if (candidate.category === 'DATA') return prefs.dataQuality;
  return true;
}

export function mergeAlertCandidates(
  existing: AlertEvent[],
  candidates: AlertCandidate[],
  prefs: AlertPreferences,
  nowMs = Date.now(),
): { alerts: AlertEvent[]; emitted: AlertEvent[] } {
  const next = [...existing];
  const emitted: AlertEvent[] = [];
  const cooldownMs = Math.max(5, prefs.cooldownMinutes) * 60_000;

  for (const candidate of candidates) {
    if (!enabled(candidate, prefs)) continue;
    const index = next.findIndex((item) => item.fingerprint === candidate.fingerprint);
    const nowIso = new Date(nowMs).toISOString();
    if (index >= 0) {
      const old = next[index];
      const last = new Date(old.lastTriggeredAt).getTime();
      if (Number.isFinite(last) && nowMs - last < cooldownMs) continue;
      const updated: AlertEvent = {
        ...old,
        ...candidate,
        lastTriggeredAt: nowIso,
        unread: true,
        count: old.count + 1,
      };
      next[index] = updated;
      emitted.push(updated);
      continue;
    }
    const created: AlertEvent = {
      ...candidate,
      id: id(),
      createdAt: nowIso,
      lastTriggeredAt: nowIso,
      unread: true,
      count: 1,
    };
    next.unshift(created);
    emitted.push(created);
  }

  return {
    alerts: next.sort((a, b) => new Date(b.lastTriggeredAt).getTime() - new Date(a.lastTriggeredAt).getTime()).slice(0, 160),
    emitted,
  };
}

export function deriveWatchlistAlerts(
  item: { market: MarketType; symbol: string; interval: Interval; profile: StrategyProfileKey },
  previous: WatchlistMonitorSnapshot | null,
  current: WatchlistMonitorSnapshot,
): AlertCandidate[] {
  if (!previous) return [];
  const base = { market: item.market, symbol: item.symbol, interval: item.interval, profile: item.profile };
  const out: AlertCandidate[] = [];
  const key = `${item.market}:${item.symbol}:${item.interval}:${item.profile}`;

  if (previous.signal.decision !== current.signal.decision) {
    if (current.signal.decision === 'BUY') {
      out.push({
        ...base, category: 'SIGNAL', priority: 'HIGH', action: 'ANALYZE',
        fingerprint: `${key}:signal:${previous.signal.decision}->BUY`,
        title: `${item.symbol} chuyển sang BUY`,
        message: `${previous.signal.decision} → BUY • Signal ${current.signal.score}/100 • ${current.signal.setupLabel}`,
      });
    } else if (previous.signal.decision === 'BUY') {
      out.push({
        ...base, category: 'SIGNAL', priority: 'MEDIUM', action: 'ANALYZE',
        fingerprint: `${key}:signal:BUY->${current.signal.decision}`,
        title: `${item.symbol} không còn BUY`,
        message: `BUY → ${current.signal.decision} • Signal ${current.signal.score}/100`,
      });
    }
  }

  if (!inEntry(previous) && inEntry(current) && current.quality.signalAllowed) {
    out.push({
      ...base, category: 'ENTRY', priority: 'HIGH', action: 'ANALYZE',
      fingerprint: `${key}:entry-zone`,
      title: `${item.symbol} vào Entry Zone`,
      message: current.signal.entryZone ? `Giá ${current.currentPrice} đang trong vùng ${current.signal.entryZone.low} – ${current.signal.entryZone.high}` : 'Giá đã vào vùng Entry.',
    });
  }

  if (current.signal.stopLoss && crossedDown(previous.currentPrice, current.currentPrice, current.signal.stopLoss.price)) {
    out.push({
      ...base, category: 'RISK', priority: 'CRITICAL', action: 'ANALYZE',
      fingerprint: `${key}:stop-loss:${current.signal.stopLoss.price}`,
      title: `${item.symbol} chạm/phá Stop Loss`,
      message: `Giá ${current.currentPrice} đã đi qua mốc SL ${current.signal.stopLoss.price}. Cần đánh giá lại setup.`,
    });
  }

  for (const target of current.signal.targets) {
    if (crossedUp(previous.currentPrice, current.currentPrice, target.price)) {
      out.push({
        ...base, category: 'TARGET', priority: 'HIGH', action: 'ANALYZE',
        fingerprint: `${key}:${target.key}:${target.price}`,
        title: `${item.symbol} đạt ${target.key}`,
        message: `Giá ${current.currentPrice} đã chạm/vượt ${target.key} ${target.price}.`,
      });
    }
  }

  const oldForecast = previous.forecast;
  const newForecast = current.forecast;
  if (oldForecast && newForecast && oldForecast.overallBias !== newForecast.overallBias) {
    const reversal = oldForecast.overallBias !== 'NEUTRAL' && newForecast.overallBias !== 'NEUTRAL';
    out.push({
      ...base, category: 'FORECAST', priority: reversal ? 'HIGH' : 'MEDIUM', action: 'ANALYZE',
      fingerprint: `${key}:forecast:${oldForecast.overallBias}->${newForecast.overallBias}`,
      title: `${item.symbol} Forecast đổi hướng`,
      message: `${oldForecast.overallLabel} → ${newForecast.overallLabel} • confidence ${newForecast.confidence}/100`,
    });
  } else if (oldForecast && newForecast && Math.abs(newForecast.confidence - oldForecast.confidence) >= 15) {
    out.push({
      ...base, category: 'FORECAST', priority: 'MEDIUM', action: 'ANALYZE',
      fingerprint: `${key}:forecast-confidence:${Math.round(newForecast.confidence / 10) * 10}`,
      title: `${item.symbol} Forecast confidence thay đổi`,
      message: `${oldForecast.confidence}/100 → ${newForecast.confidence}/100 • ${newForecast.overallLabel}`,
    });
  }

  if (previous.quality.status === 'HEALTHY' && current.quality.status !== 'HEALTHY') {
    out.push({
      ...base, category: 'DATA', priority: current.quality.signalAllowed ? 'MEDIUM' : 'HIGH', action: 'ANALYZE',
      fingerprint: `${key}:data:${current.quality.status}`,
      title: `${item.symbol} dữ liệu cần kiểm tra`,
      message: `${current.quality.statusLabel} • Data ${current.quality.score}/100${current.quality.blockers[0] ? ` • ${current.quality.blockers[0]}` : ''}`,
    });
  }

  return out;
}

export type ScannerMonitorState = Record<string, { score: number; decision: string; rank: number; bias: string; checkedAt: string }>;

export function scannerState(items: OpportunityScannerItem[], checkedAt = new Date().toISOString()): ScannerMonitorState {
  const state: ScannerMonitorState = {};
  items.forEach((item, index) => {
    state[`${item.market}:${item.symbol}:${item.interval}:${item.strategy.requested}`] = {
      score: item.opportunity.score,
      decision: item.signal.decision,
      rank: index + 1,
      bias: item.forecast.overallBias,
      checkedAt,
    };
  });
  return state;
}

export function deriveScannerAlerts(previous: ScannerMonitorState, items: OpportunityScannerItem[], prefs: AlertPreferences): AlertCandidate[] {
  const out: AlertCandidate[] = [];
  items.forEach((item, index) => {
    const key = `${item.market}:${item.symbol}:${item.interval}:${item.strategy.requested}`;
    const old = previous[key];
    if (!old) return;
    const rank = index + 1;
    const base = { market: item.market, symbol: item.symbol, interval: item.interval, profile: item.strategy.requested };

    if (old.decision !== 'BUY' && item.signal.decision === 'BUY') {
      out.push({
        ...base, category: 'SIGNAL', priority: 'HIGH', action: 'ANALYZE',
        fingerprint: `${key}:scanner-new-buy`,
        title: `${item.symbol} vừa chuyển BUY trong Scanner`,
        message: `Opportunity ${item.opportunity.score}/100 • Signal ${item.signal.score}/100 • #${rank}`,
      });
    }
    if (old.score < prefs.opportunityThreshold && item.opportunity.score >= prefs.opportunityThreshold) {
      out.push({
        ...base, category: 'OPPORTUNITY', priority: 'HIGH', action: 'SCANNER',
        fingerprint: `${key}:opportunity-threshold:${prefs.opportunityThreshold}`,
        title: `${item.symbol} vượt Opportunity ${prefs.opportunityThreshold}`, 
        message: `${old.score} → ${item.opportunity.score}/100 • rank #${rank}`,
      });
    } else if (item.opportunity.score - old.score >= 15) {
      out.push({
        ...base, category: 'OPPORTUNITY', priority: 'MEDIUM', action: 'SCANNER',
        fingerprint: `${key}:opportunity-jump:${Math.round(item.opportunity.score / 10) * 10}`,
        title: `${item.symbol} Opportunity tăng mạnh`,
        message: `${old.score} → ${item.opportunity.score}/100 (+${item.opportunity.score - old.score})`,
      });
    }
    if (old.rank > 3 && rank <= 3) {
      out.push({
        ...base, category: 'OPPORTUNITY', priority: 'MEDIUM', action: 'SCANNER',
        fingerprint: `${key}:entered-top3`,
        title: `${item.symbol} lọt Top 3 Scanner`,
        message: `#${old.rank} → #${rank} • Opportunity ${item.opportunity.score}/100`,
      });
    }
    if (old.bias !== item.forecast.overallBias && old.bias !== 'NEUTRAL' && item.forecast.overallBias !== 'NEUTRAL') {
      out.push({
        ...base, category: 'FORECAST', priority: 'HIGH', action: 'ANALYZE',
        fingerprint: `${key}:scanner-forecast:${old.bias}->${item.forecast.overallBias}`,
        title: `${item.symbol} Forecast đảo hướng`,
        message: `${old.bias} → ${item.forecast.overallBias} • Opportunity ${item.opportunity.score}/100`,
      });
    }
  });
  return out;
}

export type PortfolioMonitorState = Record<string, { action: string; status: string; quality: string; pnlPercent: number; checkedAt: string }>;

export function portfolioState(snapshot: PortfolioRiskSnapshot): PortfolioMonitorState {
  const state: PortfolioMonitorState = {};
  for (const item of snapshot.positions) {
    state[`${item.market}:${item.symbol}`] = {
      action: item.action,
      status: item.status,
      quality: item.dataQualityStatus || 'HEALTHY',
      pnlPercent: item.pnlPercent,
      checkedAt: snapshot.generatedAt,
    };
  }
  return state;
}

export function derivePortfolioAlerts(previous: PortfolioMonitorState, current: PortfolioRiskSnapshot): AlertCandidate[] {
  const out: AlertCandidate[] = [];
  for (const item of current.positions) {
    const key = `${item.market}:${item.symbol}`;
    const old = previous[key];
    if (!old) continue;
    const base = { market: item.market, symbol: item.symbol, interval: item.interval, profile: item.strategyProfile as StrategyProfileKey };
    if (old.action !== item.action) {
      const critical = item.action === 'EXIT_RISK';
      const high = item.action === 'REDUCE_RISK' || item.action === 'TAKE_PARTIAL' || item.action === 'PROTECT_PROFIT';
      out.push({
        ...base, category: 'POSITION', priority: critical ? 'CRITICAL' : high ? 'HIGH' : 'MEDIUM', action: 'POSITION',
        fingerprint: `${key}:position:${old.action}->${item.action}`,
        title: `${item.symbol}: ${item.actionLabel}`,
        message: `${old.action} → ${item.action} • P/L ${item.pnlPercent >= 0 ? '+' : ''}${item.pnlPercent.toFixed(2)}%`,
      });
    }
    if (old.quality === 'HEALTHY' && item.dataQualityStatus && item.dataQualityStatus !== 'HEALTHY') {
      out.push({
        ...base, category: 'DATA', priority: item.dataQualityStatus === 'STALE_DATA' || item.dataQualityStatus === 'INVALID_DATA' ? 'CRITICAL' : 'HIGH', action: 'POSITION',
        fingerprint: `${key}:position-data:${item.dataQualityStatus}`,
        title: `${item.symbol}: dữ liệu vị thế không còn HEALTHY`,
        message: `${item.dataQualityStatus} • Data ${item.dataQualityScore ?? '—'}/100. Không nên dùng mốc Exit/Protect mà không kiểm tra lại dữ liệu.`,
      });
    }
  }
  return out;
}
