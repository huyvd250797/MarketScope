'use client';

import { useMemo, useState } from 'react';
import { effectiveProfileLabel } from './StrategyProfileSelector';
import type { Interval, MarketType, StrategyProfileKey, WatchlistMonitorSnapshot } from '@/lib/market/types';

export type WatchlistItem = {
  market: MarketType;
  symbol: string;
  interval: Interval;
  profile: StrategyProfileKey;
  addedAt: string;
};

export type WatchlistState = {
  status: 'idle' | 'loading' | 'ready' | 'error';
  data?: WatchlistMonitorSnapshot;
  error?: string;
  checkedAt?: string;
};

type Props = {
  items: WatchlistItem[];
  states: Record<string, WatchlistState>;
  refreshing: boolean;
  lastRefresh: string | null;
  onRefresh: () => void;
  onAdd: (market: MarketType, symbol: string, interval: Interval, profile: StrategyProfileKey) => void;
  onOpen: (item: WatchlistItem) => void;
  onRemove: (item: WatchlistItem) => void;
  notificationEnabled: boolean;
  notificationPermission: NotificationPermission | 'unsupported';
  onToggleNotifications: () => void;
  onBack: () => void;
};

const cryptoIntervals: Interval[] = ['15m', '1h', '4h', '1d', '1w'];
const stockIntervals: Interval[] = ['15m', '1h', '1d', '1w'];
const forexIntervals: Interval[] = ['15m','1h','4h','1d','1w'];

export function watchlistKey(item: Pick<WatchlistItem, 'market' | 'symbol' | 'interval'> & { profile?: StrategyProfileKey }) {
  return `${item.market}:${item.symbol.toUpperCase()}:${item.interval}:${item.profile || 'SWING'}`;
}

export default function WatchlistPanel({ items, states, refreshing, lastRefresh, onRefresh, onAdd, onOpen, onRemove, notificationEnabled, notificationPermission, onToggleNotifications, onBack }: Props) {
  const [draftMarket, setDraftMarket] = useState<MarketType>('CRYPTO');
  const [draftSymbol, setDraftSymbol] = useState('');
  const [draftInterval, setDraftInterval] = useState<Interval>('1h');
  const [draftProfile, setDraftProfile] = useState<StrategyProfileKey>('AUTO');
  const intervals = draftMarket === 'CRYPTO' ? cryptoIntervals : draftMarket === 'FOREX' ? forexIntervals : stockIntervals;

  const readyData = useMemo(() => items.map((item) => states[watchlistKey(item)]?.data).filter(Boolean) as WatchlistMonitorSnapshot[], [items, states]);
  const buyCount = readyData.filter((item) => item.signal.decision === 'BUY').length;
  const waitCount = readyData.filter((item) => item.signal.decision === 'WAIT').length;
  const avoidCount = readyData.filter((item) => item.signal.decision === 'AVOID').length;

  const submit = () => {
    const symbol = draftSymbol.trim().toUpperCase();
    if (!symbol) return;
    onAdd(draftMarket, symbol, draftInterval, draftProfile);
    setDraftSymbol('');
  };

  return (
    <section className="panel-page watchlist-page">
      <button className="back-button" onClick={onBack}>← Quay lại</button>
      <div className="panel-heading watchlist-heading">
        <div>
          <h1>Watchlist</h1>
          <p>Theo dõi tín hiệu nhiều mã • refresh tự động mỗi 5 phút khi tab này đang mở.</p>
        </div>
        <div className="watch-heading-actions"><button className={`watch-notify ${notificationEnabled ? 'active' : ''}`} onClick={onToggleNotifications} disabled={notificationPermission === 'unsupported' || notificationPermission === 'denied'}>{notificationPermission === 'unsupported' ? 'Thông báo không hỗ trợ' : notificationPermission === 'denied' ? 'Thông báo bị chặn' : notificationEnabled ? '🔔 Thông báo bật' : '🔕 Bật thông báo'}</button><button className="watch-refresh" onClick={onRefresh} disabled={refreshing}>{refreshing ? 'Đang cập nhật…' : '↻ Cập nhật'}</button></div>
      </div>

      <div className="watch-summary-grid">
        <Summary label="Đang theo dõi" value={String(items.length)} tone="brand" />
        <Summary label="BUY" value={String(buyCount)} tone="buy" />
        <Summary label="WAIT" value={String(waitCount)} tone="wait" />
        <Summary label="AVOID" value={String(avoidCount)} tone="avoid" />
      </div>
      <div className="watch-last-refresh">{lastRefresh ? `Cập nhật gần nhất: ${formatDateTime(lastRefresh)}` : 'Chưa cập nhật dữ liệu watchlist.'}</div>

      <div className="watch-add-card">
        <div className="watch-market-toggle">
          <button className={draftMarket === 'CRYPTO' ? 'active' : ''} onClick={() => setDraftMarket('CRYPTO')}>CRYPTO</button>
          <button className={draftMarket === 'STOCK' ? 'active' : ''} onClick={() => { setDraftMarket('STOCK'); if (draftInterval === '4h') setDraftInterval('1d'); }}>STOCK VN</button><button className={draftMarket === 'FOREX' ? 'active' : ''} onClick={() => setDraftMarket('FOREX')}>FOREX</button>
        </div>
        <div className="watch-add-row">
          <input
            value={draftSymbol}
            onChange={(event) => setDraftSymbol(event.target.value.toUpperCase())}
            onKeyDown={(event) => { if (event.key === 'Enter') submit(); }}
            placeholder={draftMarket === 'CRYPTO' ? 'BTCUSDT, ETHUSDT…' : draftMarket === 'FOREX' ? 'EURUSD, XAUUSD…' : 'FPT, VNM, HPG…'}
            autoCapitalize="characters"
            spellCheck={false}
          />
          <select value={draftInterval} onChange={(event) => setDraftInterval(event.target.value as Interval)}>
            {intervals.map((item) => <option value={item} key={item}>{formatInterval(item)}</option>)}
          </select>
          <select value={draftProfile} onChange={(event) => setDraftProfile(event.target.value as StrategyProfileKey)} aria-label="Strategy profile">
            <option value="AUTO">AUTO</option>
            <option value="SHORT_TERM">Ngắn hạn</option>
            <option value="SWING">Swing</option>
            <option value="MEDIUM_TERM">Trung hạn</option>
            <option value="LONG_TERM">Dài hạn</option>
          </select>
          <button className="primary-button" onClick={submit}>+ Thêm</button>
        </div>
        <p>Tối đa 12 mã/timeframe để giới hạn tải dữ liệu và backtest trên Vercel.</p>
      </div>

      {items.length === 0 ? (
        <div className="watch-empty">
          <span>☆</span>
          <strong>Watchlist đang trống</strong>
          <p>Thêm mã tại đây hoặc bấm “Theo dõi” ngay trên màn Analyze. MarketScope sẽ gom BUY / WAIT / AVOID vào một nơi.</p>
        </div>
      ) : (
        <div className="watch-list">
          {items.map((item) => {
            const state = states[watchlistKey(item)] || { status: 'idle' as const };
            return <WatchCard key={watchlistKey(item)} item={item} state={state} onOpen={() => onOpen(item)} onRemove={() => onRemove(item)} />;
          })}
        </div>
      )}

      <div className="watch-note">
        <span>i</span>
        <p>V0.12.0 lưu Strategy Profile theo từng mã/timeframe. AUTO có thể đổi effective profile khi regime/volatility thay đổi; calibrated rate luôn backtest theo effective profile hiện tại. Monitoring khi app đang mở, chưa phải push notification nền. Calibrated rate chỉ hiện khi backtest đủ điều kiện và không phải cam kết xác suất thắng tương lai.</p>
      </div>
    </section>
  );
}

function WatchCard({ item, state, onOpen, onRemove }: { item: WatchlistItem; state: WatchlistState; onOpen: () => void; onRemove: () => void }) {
  const data = state.data;
  if (!data) {
    return (
      <article className="watch-card pending">
        <button className="watch-card-main" onClick={onOpen}>
          <div className="watch-card-title"><span>{item.market === 'CRYPTO' ? 'CRYPTO' : item.market === 'FOREX' ? 'FOREX' : 'STOCK VN'}</span><strong>{item.symbol}</strong><em>{formatInterval(item.interval)} • {item.profile === 'AUTO' ? 'AUTO' : effectiveProfileLabel(item.profile)}</em></div>
          <p>{state.status === 'error' ? state.error || 'Không tải được dữ liệu' : state.status === 'loading' ? 'Đang phân tích tín hiệu…' : 'Chờ cập nhật dữ liệu'}</p>
        </button>
        <button className="watch-remove" onClick={onRemove} aria-label={`Xóa ${item.symbol}`}>×</button>
      </article>
    );
  }

  const decision = data.signal.decision.toLowerCase();
  const calibrationReady = data.calibration.applicable && data.calibration.quality !== 'INSUFFICIENT' && data.calibration.calibratedWinRate != null;
  const activeAlerts = deriveActiveAlerts(data);
  const priority = opportunityLabel(data);
  const digits = data.currency === 'VND' ? 0 : data.currentPrice >= 1000 ? 2 : 6;

  return (
    <article className={`watch-card ${decision}`}>
      <button className="watch-card-main" onClick={onOpen}>
        <div className="watch-card-top">
          <div className="watch-card-title"><span>{data.market === 'CRYPTO' ? 'CRYPTO' : data.market === 'FOREX' ? 'FOREX' : 'STOCK VN'}</span><strong>{data.symbol}</strong><em>{formatInterval(data.interval)} • {data.strategy.autoApplied ? `AUTO→${data.strategy.effectiveLabel}` : data.strategy.effectiveLabel}</em></div>
          <div className={`watch-decision ${decision}`}><b>{data.signal.decision}</b><small>{priority}</small></div>
        </div>
        <div className="watch-price-row">
          <strong>{formatPrice(data.currentPrice, digits, data.currency)}</strong>
          <span className={(data.changePercent || 0) >= 0 ? 'gain-text' : 'loss-text'}>{data.changePercent == null ? '-' : `${data.changePercent >= 0 ? '+' : ''}${data.changePercent.toFixed(2)}%`}</span>
        </div>
        <div className="watch-metrics">
          <Mini label="Signal" value={`${data.signal.score}/100`} />
          <Mini label="Regime" value={data.regime.label} />
          <Mini label="Calibrated" value={calibrationReady ? `${data.calibration.calibratedWinRate!.toFixed(1)}%` : 'Chưa đủ mẫu'} />
          <Mini label="Mẫu" value={`${data.calibration.resolvedTrades} resolved`} />
        </div>
        {activeAlerts.length > 0 && <div className="watch-alert-row">{activeAlerts.map((alert) => <span className={alert.tone} key={alert.label}>{alert.label}</span>)}</div>}
        {data.signal.entryZone && (
          <div className="watch-entry-line">
            <span>Entry {formatPrice(data.signal.entryZone.low, digits, data.currency)} – {formatPrice(data.signal.entryZone.high, digits, data.currency)}</span>
            {data.signal.targets[0] && <span>TP1 {formatPrice(data.signal.targets[0].price, digits, data.currency)}</span>}
          </div>
        )}
        <div className="watch-card-foot"><span>{data.signal.setupLabel}</span><span className={`watch-quality ${data.quality.status.toLowerCase()}`}>Data {data.quality.score}/100</span><span>{formatDateTime(data.dataAt)}</span></div>
      </button>
      <button className="watch-remove" onClick={onRemove} aria-label={`Xóa ${item.symbol}`}>×</button>
    </article>
  );
}

function Summary({ label, value, tone }: { label: string; value: string; tone: string }) {
  return <article className={`watch-summary ${tone}`}><span>{label}</span><strong>{value}</strong></article>;
}

function Mini({ label, value }: { label: string; value: string }) {
  return <div className="watch-mini"><span>{label}</span><strong>{value}</strong></div>;
}


function deriveActiveAlerts(data: WatchlistMonitorSnapshot) {
  const alerts: Array<{ label: string; tone: 'buy' | 'wait' | 'avoid' | 'brand' }> = [];
  if (data.quality.status !== 'HEALTHY') alerts.push({ label: data.quality.status === 'STALE_DATA' ? '⚠ DATA STALE' : `Data ${data.quality.score}/100`, tone: data.quality.signalAllowed ? 'wait' : 'avoid' });
  if (!data.quality.signalAllowed) return alerts.slice(0, 3);
  const price = data.currentPrice;
  if (data.signal.decision === 'BUY' && data.signal.stopLoss && price <= data.signal.stopLoss.price) alerts.push({ label: '⚠ Đã chạm SL', tone: 'avoid' });
  const reached = data.signal.decision === 'BUY' ? [...data.signal.targets].reverse().find((target) => price >= target.price) : undefined;
  if (reached) alerts.push({ label: `✓ Đã đạt ${reached.key}`, tone: 'buy' });
  if (data.signal.entryZone && price >= data.signal.entryZone.low && price <= data.signal.entryZone.high) alerts.push({ label: '◎ Trong Entry Zone', tone: 'brand' });
  if (data.signal.decision === 'BUY' && data.signal.score >= 70) alerts.push({ label: `BUY score ${data.signal.score}`, tone: 'buy' });
  return alerts.slice(0, 3);
}

function opportunityLabel(data: WatchlistMonitorSnapshot) {
  if (!data.quality.signalAllowed) return 'Data check';
  if (data.signal.decision === 'AVOID') return 'Tránh';
  if (data.signal.decision === 'WAIT') return 'Chờ setup';
  const rate = data.calibration.calibratedWinRate || 0;
  if ((data.calibration.quality === 'HIGH' || data.calibration.quality === 'MEDIUM') && rate >= 60 && data.signal.score >= 70) return 'Ưu tiên';
  return 'Có tín hiệu';
}

function formatPrice(value: number, digits: number, currency: string) {
  return new Intl.NumberFormat(currency === 'VND' ? 'vi-VN' : 'en-US', { maximumFractionDigits: digits }).format(value);
}

function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' }).format(date);
}

function formatInterval(value: Interval) {
  return value === '1d' ? '1D' : value === '1w' ? '1W' : value;
}
