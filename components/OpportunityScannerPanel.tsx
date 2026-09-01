'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type {
  Interval,
  MarketType,
  OpportunityPreset,
  OpportunityScannerItem,
  OpportunityScannerResponse,
  ScannerMarketFilter,
  ScannerScope,
  StrategyProfileKey,
} from '@/lib/market/types';

type ApiError = { error?: string };
type Props = {
  defaultProfile: StrategyProfileKey;
  onOpen: (market: MarketType, symbol: string, interval: Interval, profile: StrategyProfileKey) => void;
  onAddWatchlist: (market: MarketType, symbol: string, interval: Interval, profile: StrategyProfileKey) => void;
  onBack: () => void;
};

const profileOptions: Array<{ key: StrategyProfileKey; label: string }> = [
  { key: 'AUTO', label: 'AUTO' },
  { key: 'SHORT_TERM', label: 'Ngắn hạn' },
  { key: 'SWING', label: 'Swing' },
  { key: 'MEDIUM_TERM', label: 'Trung hạn' },
  { key: 'LONG_TERM', label: 'Dài hạn' },
];

const presetOptions: Array<{ key: OpportunityPreset; label: string }> = [
  { key: 'TOP', label: 'Top cơ hội' },
  { key: 'NEAR_ENTRY', label: 'Gần Entry' },
  { key: 'FORECAST', label: 'Forecast mạnh' },
  { key: 'ACCURACY', label: 'Accuracy tốt' },
  { key: 'RISK_REWARD', label: 'R:R tốt' },
  { key: 'NEW_BUY', label: 'Mới chuyển BUY' },
];

const marketOptions: Array<{ key: ScannerMarketFilter; label: string }> = [
  { key: 'ALL', label: 'Tất cả' },
  { key: 'CRYPTO', label: 'Crypto' },
  { key: 'STOCK', label: 'Stock VN' },
  { key: 'FOREX', label: 'Forex' },
];

function historyKey(item: OpportunityScannerItem) {
  return `${item.market}:${item.symbol}:${item.interval}:${item.strategy.requested}`;
}

function readPreviousDecisions(): Record<string, string> {
  if (typeof window === 'undefined') return {};
  try { return JSON.parse(localStorage.getItem('marketscope-scanner-decisions') || '{}') as Record<string, string>; }
  catch { return {}; }
}

function writeCurrentDecisions(items: OpportunityScannerItem[]) {
  if (typeof window === 'undefined') return;
  const current: Record<string, string> = {};
  for (const item of items) current[historyKey(item)] = item.signal.decision;
  localStorage.setItem('marketscope-scanner-decisions', JSON.stringify(current));
}

export default function OpportunityScannerPanel({ defaultProfile, onOpen, onAddWatchlist, onBack }: Props) {
  const [marketFilter, setMarketFilter] = useState<ScannerMarketFilter>('ALL');
  const [profile, setProfile] = useState<StrategyProfileKey>(defaultProfile || 'AUTO');
  const [scope, setScope] = useState<ScannerScope>('QUICK');
  const [preset, setPreset] = useState<OpportunityPreset>('TOP');
  const [data, setData] = useState<OpportunityScannerResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newBuyKeys, setNewBuyKeys] = useState<Set<string>>(new Set());
  const [onlyBuy, setOnlyBuy] = useState(false);
  const [healthyOnly, setHealthyOnly] = useState(true);
  const [minScore, setMinScore] = useState(0);
  const [minAccuracy, setMinAccuracy] = useState(0);
  const [minRR, setMinRR] = useState(0);
  const requestRef = useRef(0);

  useEffect(() => { setProfile(defaultProfile || 'AUTO'); }, [defaultProfile]);

  const refresh = useCallback(async () => {
    const requestId = ++requestRef.current;
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ market: marketFilter, profile, scope, limit: scope === 'WIDE' ? '10' : '8' });
      const response = await fetch(`/api/market/scanner?${params.toString()}`, { cache: 'no-store' });
      const payload = await response.json() as OpportunityScannerResponse & ApiError;
      if (!response.ok) throw new Error(payload.error || 'Không thể chạy Smart Scanner');
      if (requestId !== requestRef.current) return;
      const previous = readPreviousDecisions();
      const changed = new Set<string>();
      for (const item of payload.items) {
        const key = historyKey(item);
        if (item.signal.decision === 'BUY' && previous[key] && previous[key] !== 'BUY') changed.add(key);
      }
      setNewBuyKeys(changed);
      writeCurrentDecisions(payload.items);
      setData(payload);
    } catch (err) {
      if (requestId === requestRef.current) setError(err instanceof Error ? err.message : 'Không thể chạy Scanner');
    } finally {
      if (requestId === requestRef.current) setLoading(false);
    }
  }, [marketFilter, profile, scope]);

  useEffect(() => { void refresh(); }, [refresh]);

  const visible = useMemo(() => {
    const items = [...(data?.items || [])].filter((item) => {
      if (onlyBuy && item.signal.decision !== 'BUY') return false;
      if (healthyOnly && item.quality.status !== 'HEALTHY') return false;
      if (item.opportunity.score < minScore) return false;
      if ((item.forecast.historicalDirectionAccuracy ?? 0) < minAccuracy) return false;
      if ((item.opportunity.riskReward ?? 0) < minRR) return false;
      if (preset === 'NEW_BUY' && !newBuyKeys.has(historyKey(item))) return false;
      return true;
    });

    const sorters: Record<OpportunityPreset, (a: OpportunityScannerItem, b: OpportunityScannerItem) => number> = {
      TOP: (a, b) => b.opportunity.score - a.opportunity.score,
      NEAR_ENTRY: (a, b) => Number(b.opportunity.nearEntry) - Number(a.opportunity.nearEntry) || b.opportunity.score - a.opportunity.score,
      FORECAST: (a, b) => b.forecast.calibratedConfidence - a.forecast.calibratedConfidence || b.opportunity.score - a.opportunity.score,
      ACCURACY: (a, b) => (b.forecast.historicalDirectionAccuracy ?? -1) - (a.forecast.historicalDirectionAccuracy ?? -1) || b.opportunity.score - a.opportunity.score,
      RISK_REWARD: (a, b) => (b.opportunity.riskReward ?? -1) - (a.opportunity.riskReward ?? -1) || b.opportunity.score - a.opportunity.score,
      NEW_BUY: (a, b) => b.opportunity.score - a.opportunity.score,
    };
    return items.sort(sorters[preset]);
  }, [data, healthyOnly, minAccuracy, minRR, minScore, newBuyKeys, onlyBuy, preset]);

  const buyCount = data?.items.filter((item) => item.signal.decision === 'BUY' && item.quality.signalAllowed).length ?? 0;
  const nearEntryCount = data?.items.filter((item) => item.opportunity.nearEntry && item.signal.decision === 'BUY').length ?? 0;
  const topScore = data?.items[0]?.opportunity.score ?? 0;

  return (
    <section className="scanner-workspace">
      <div className="scanner-mobile-head">
        <button className="back-button" onClick={onBack}>← Analyze</button>
        <button className="scanner-refresh compact" onClick={() => void refresh()} disabled={loading}>{loading ? 'Đang quét…' : '↻ Quét lại'}</button>
      </div>

      <div className="panel-heading scanner-heading">
        <div><h1>Smart Opportunity Scanner</h1><p>Tự quét Crypto Spot, Stock VN và Forex rồi xếp hạng cơ hội bằng Signal + Forecast + lịch sử + R:R + Data Quality.</p></div>
        <button className="scanner-refresh desktop-only" onClick={() => void refresh()} disabled={loading}>{loading ? 'Đang quét…' : '↻ Quét lại'}</button>
      </div>

      <div className="scanner-sticky-controls">
        <div className="scanner-market-row" aria-label="Thị trường Scanner">
          {marketOptions.map((item) => <button key={item.key} className={marketFilter === item.key ? 'active' : ''} onClick={() => setMarketFilter(item.key)}>{item.label}</button>)}
        </div>
        <div className="scanner-profile-row" aria-label="Strategy Scanner">
          {profileOptions.map((item) => <button key={item.key} className={profile === item.key ? 'active' : ''} onClick={() => setProfile(item.key)}>{item.label}</button>)}
        </div>
        <div className="scanner-preset-row" aria-label="Xếp hạng Scanner">
          {presetOptions.map((item) => <button key={item.key} className={preset === item.key ? 'active' : ''} onClick={() => setPreset(item.key)}>{item.label}</button>)}
        </div>
      </div>

      <section className="scanner-summary-grid">
        <Summary label="Đã quét" value={data ? `${data.scannedCount}/${data.universeSize}` : '—'} />
        <Summary label="BUY" value={String(buyCount)} tone="buy" />
        <Summary label="Gần Entry" value={String(nearEntryCount)} tone="brand" />
        <Summary label="Top score" value={topScore ? `${topScore}/100` : '—'} tone={topScore >= 75 ? 'buy' : 'wait'} />
      </section>

      <details className="scanner-filter-card">
        <summary><span>⚙ Bộ lọc & phạm vi quét</span><small>{scope === 'QUICK' ? 'Nhanh' : 'Mở rộng'} • {healthyOnly ? 'Healthy only' : 'Mọi data'}</small></summary>
        <div className="scanner-filter-body">
          <div className="scanner-scope-toggle"><button className={scope === 'QUICK' ? 'active' : ''} onClick={() => setScope('QUICK')}>Nhanh</button><button className={scope === 'WIDE' ? 'active' : ''} onClick={() => setScope('WIDE')}>Mở rộng</button></div>
          <label className="scanner-check"><input type="checkbox" checked={healthyOnly} onChange={(e) => setHealthyOnly(e.target.checked)} /> Chỉ Data Quality HEALTHY</label>
          <label className="scanner-check"><input type="checkbox" checked={onlyBuy} onChange={(e) => setOnlyBuy(e.target.checked)} /> Chỉ tín hiệu BUY</label>
          <div className="scanner-thresholds">
            <Threshold label="Opportunity ≥" value={minScore} max={90} step={5} suffix="" onChange={setMinScore} />
            <Threshold label="Accuracy ≥" value={minAccuracy} max={80} step={5} suffix="%" onChange={setMinAccuracy} />
            <Threshold label="R:R ≥" value={minRR} max={3} step={0.5} suffix="R" onChange={setMinRR} />
          </div>
        </div>
      </details>

      {error && <div className="scanner-error"><strong>Không chạy được Scanner</strong><span>{error}</span><button onClick={() => void refresh()}>Thử lại</button></div>}

      {loading && !data ? <ScannerSkeleton /> : (
        <div className="scanner-result-list">
          {visible.map((item, index) => (
            <OpportunityCard
              key={`${item.market}-${item.symbol}-${item.interval}-${item.strategy.requested}`}
              item={item}
              rank={index + 1}
              newBuy={newBuyKeys.has(historyKey(item))}
              onOpen={() => onOpen(item.market, item.symbol, item.interval, profile)}
              onAdd={() => onAddWatchlist(item.market, item.symbol, item.interval, profile)}
            />
          ))}
          {!loading && visible.length === 0 && <div className="scanner-empty"><span>⌁</span><strong>Không có mã phù hợp bộ lọc</strong><p>Giảm ngưỡng filter, đổi Strategy hoặc chuyển phạm vi quét sang Mở rộng.</p></div>}
        </div>
      )}

      {data && <div className="scanner-meta-row"><span>Cập nhật {formatDateTime(data.generatedAt)}</span><span>{data.durationMs} ms</span><span>{data.failedCount ? `${data.failedCount} mã lỗi provider` : 'Provider OK'}</span></div>}
      {data && <details className="scanner-method"><summary>Opportunity Score được tính thế nào?</summary>{data.methodology.map((item) => <p key={item}>• {item}</p>)}</details>}
      <p className="scanner-disclaimer">Scanner chỉ dùng để ưu tiên mã cần xem trước, không phải lệnh mua tự động. Hãy mở Analyze để kiểm tra Entry/SL/TP, Forecast, lịch sử và Data Quality trước khi quyết định.</p>
    </section>
  );
}

function OpportunityCard({ item, rank, newBuy, onOpen, onAdd }: { item: OpportunityScannerItem; rank: number; newBuy: boolean; onOpen: () => void; onAdd: () => void }) {
  const digits = item.currency === 'VND' ? 0 : item.currentPrice >= 1000 ? 2 : 5;
  const accuracy = item.forecast.historicalDirectionAccuracy;
  const scoreTone = item.opportunity.grade === 'A' ? 'a' : item.opportunity.grade === 'B' ? 'b' : item.opportunity.grade === 'BLOCKED' ? 'blocked' : item.opportunity.grade === 'WATCH' ? 'watch' : 'c';
  return (
    <article className={`scanner-card grade-${scoreTone}`}>
      <div className="scanner-card-main">
        <div className="scanner-card-head">
          <div className="scanner-rank">#{rank}</div>
          <div className="scanner-symbol">
            <span>{marketLabel(item.market)}</span>
            <strong>{item.symbol}</strong>
            <small>{formatInterval(item.interval)} • {item.strategy.autoApplied ? `AUTO→${item.strategy.effectiveLabel}` : item.strategy.effectiveLabel}</small>
          </div>
          <div className={`scanner-opportunity score-${scoreTone}`}><b>{item.opportunity.score}</b><small>{item.opportunity.label}</small></div>
        </div>

        <div className="scanner-price-row">
          <strong>{formatPrice(item.currentPrice, digits, item.currency)}</strong>
          <span className={(item.changePercent ?? 0) >= 0 ? 'gain-text' : 'loss-text'}>{item.changePercent == null ? '—' : `${item.changePercent >= 0 ? '+' : ''}${item.changePercent.toFixed(2)}%`}</span>
          <em className={`scanner-decision ${item.signal.decision.toLowerCase()}`}>{item.signal.decision}</em>
          {newBuy && <i className="new-buy-badge">MỚI BUY</i>}
        </div>

        <div className="scanner-metric-grid">
          <Mini label="Signal" value={`${item.signal.score}/100`} />
          <Mini label="Forecast" value={`${item.forecast.calibratedConfidence}/100`} />
          <Mini label="Accuracy" value={accuracy == null ? 'Chưa đủ mẫu' : `${accuracy.toFixed(1)}%`} />
          <Mini label="R:R TP1" value={item.opportunity.riskReward == null ? '—' : `${item.opportunity.riskReward.toFixed(2)}R`} />
          <Mini label="Data" value={`${item.quality.score}/100`} />
          <Mini label="Regime" value={item.regime.label} />
        </div>

        <div className="scanner-signal-line">
          <span className={item.forecast.overallBias.toLowerCase()}>{item.forecast.overallLabel} • {item.forecast.directionProbability}%</span>
          {item.opportunity.nearEntry ? <b>◎ Gần/Trong Entry</b> : item.opportunity.distanceFromEntryPercent != null ? <small>Cách Entry {item.opportunity.distanceFromEntryPercent.toFixed(2)}%</small> : <small>Chưa có Entry</small>}
        </div>

        {item.signal.entryZone && <div className="scanner-entry-row"><span>Entry <b>{formatPrice(item.signal.entryZone.low, digits, item.currency)} – {formatPrice(item.signal.entryZone.high, digits, item.currency)}</b></span>{item.signal.targets[0] && <span>TP1 <b>{formatPrice(item.signal.targets[0].price, digits, item.currency)}</b></span>}</div>}

        <details className="scanner-card-detail"><summary>Vì sao xếp hạng #{rank}?</summary><div className="scanner-component-grid"><Mini label="Signal component" value={String(item.opportunity.components.signal)} /><Mini label="Forecast" value={String(item.opportunity.components.forecast)} /><Mini label="Historical" value={String(item.opportunity.components.historical)} /><Mini label="R:R" value={String(item.opportunity.components.riskReward)} /><Mini label="Data" value={String(item.opportunity.components.dataQuality)} /></div>{item.opportunity.reasons.map((reason) => <p className="scanner-reason positive" key={reason}>✓ {reason}</p>)}{item.opportunity.blockers.map((reason) => <p className="scanner-reason blocker" key={reason}>⚠ {reason}</p>)}</details>
      </div>
      <div className="scanner-card-actions"><button className="scanner-analyze-btn" onClick={onOpen}>Phân tích</button><button className="scanner-watch-btn" onClick={onAdd}>☆ Watchlist</button></div>
    </article>
  );
}

function Threshold({ label, value, max, step, suffix, onChange }: { label: string; value: number; max: number; step: number; suffix: string; onChange: (v: number) => void }) {
  return <label><span>{label}</span><div><input type="range" min="0" max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} /><b>{value}{suffix}</b></div></label>;
}

function Summary({ label, value, tone = '' }: { label: string; value: string; tone?: string }) {
  return <article className={`scanner-summary ${tone}`}><span>{label}</span><strong>{value}</strong></article>;
}

function Mini({ label, value }: { label: string; value: string }) {
  return <div className="scanner-mini"><span>{label}</span><strong>{value}</strong></div>;
}

function ScannerSkeleton() {
  return <div className="scanner-result-list">{[1, 2, 3].map((item) => <div className="scanner-card scanner-skeleton" key={item}><div className="skeleton w45" /><div className="skeleton w70 big" /><div className="skeleton-grid"><div className="skeleton" /><div className="skeleton" /><div className="skeleton" /><div className="skeleton" /></div></div>)}</div>;
}

function marketLabel(market: MarketType) { return market === 'STOCK' ? 'STOCK VN' : market; }
function formatInterval(value: Interval) { return value === '1d' ? '1D' : value === '1w' ? '1W' : value; }
function formatPrice(value: number, digits: number, currency: string) { return new Intl.NumberFormat(currency === 'VND' ? 'vi-VN' : 'en-US', { maximumFractionDigits: digits }).format(value); }
function formatDateTime(value: string) { const d = new Date(value); return Number.isNaN(d.getTime()) ? value : new Intl.DateTimeFormat('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' }).format(d); }
