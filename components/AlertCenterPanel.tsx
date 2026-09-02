'use client';

import { useMemo, useState } from 'react';
import type { AlertCategory, AlertEvent, AlertPreferences, AlertPriority } from '@/lib/monitoring/alerts';

export type AlertFilter = 'ALL' | 'IMPORTANT' | AlertCategory;

type Props = {
  alerts: AlertEvent[];
  preferences: AlertPreferences;
  notificationPermission: NotificationPermission | 'unsupported';
  onPreferences: (preferences: AlertPreferences) => void;
  onToggleBrowserNotifications: () => void;
  onRead: (id: string) => void;
  onReadAll: () => void;
  onClear: () => void;
  onOpen: (alert: AlertEvent) => void;
  onBack: () => void;
};

const filters: Array<{ key: AlertFilter; label: string }> = [
  { key: 'ALL', label: 'Tất cả' },
  { key: 'IMPORTANT', label: 'Quan trọng' },
  { key: 'SIGNAL', label: 'BUY' },
  { key: 'POSITION', label: 'Position' },
  { key: 'FORECAST', label: 'Forecast' },
  { key: 'OPPORTUNITY', label: 'Scanner' },
  { key: 'DATA', label: 'Data' },
];

export default function AlertCenterPanel(props: Props) {
  const [filter, setFilter] = useState<AlertFilter>('ALL');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const visible = useMemo(() => props.alerts.filter((alert) => {
    if (filter === 'ALL') return true;
    if (filter === 'IMPORTANT') return alert.priority === 'CRITICAL' || alert.priority === 'HIGH';
    if (filter === 'SIGNAL') return alert.category === 'SIGNAL' || alert.category === 'ENTRY' || alert.category === 'TARGET' || alert.category === 'RISK';
    return alert.category === filter;
  }), [filter, props.alerts]);
  const unread = props.alerts.filter((item) => item.unread).length;
  const critical = props.alerts.filter((item) => item.priority === 'CRITICAL' && item.unread).length;
  const high = props.alerts.filter((item) => item.priority === 'HIGH' && item.unread).length;

  return (
    <section className="alert-center-page">
      <div className="alert-center-top">
        <button className="back-button" onClick={props.onBack}>← Quay lại</button>
        <div className="alert-center-top-actions">
          {unread > 0 && <button onClick={props.onReadAll}>Đánh dấu đã đọc</button>}
          <button onClick={() => setSettingsOpen((value) => !value)}>⚙ Cảnh báo</button>
        </div>
      </div>

      <div className="panel-heading alert-heading">
        <div><h1>Alert Center</h1><p>Signal • Entry/TP/SL • Forecast • Scanner • Position • Data Quality</p></div>
        <span className="alert-total-badge">{unread} chưa đọc</span>
      </div>

      <div className="alert-summary-grid">
        <AlertSummary label="Chưa đọc" value={unread} tone="brand" />
        <AlertSummary label="Critical" value={critical} tone="critical" />
        <AlertSummary label="High" value={high} tone="high" />
        <AlertSummary label="Tổng" value={props.alerts.length} tone="neutral" />
      </div>

      {settingsOpen && <AlertSettings {...props} />}

      <div className="alert-filter-row">
        {filters.map((item) => <button key={item.key} className={filter === item.key ? 'active' : ''} onClick={() => setFilter(item.key)}>{item.label}</button>)}
      </div>

      {visible.length === 0 ? (
        <div className="alert-empty"><span>🔔</span><strong>Chưa có cảnh báo phù hợp</strong><p>MarketScope chỉ tạo event khi trạng thái thực sự thay đổi để tránh spam cùng một thông báo.</p></div>
      ) : (
        <div className="alert-list">
          {visible.map((alert) => <AlertCard key={alert.id} alert={alert} onRead={props.onRead} onOpen={props.onOpen} />)}
        </div>
      )}

      {props.alerts.length > 0 && <button className="alert-clear-button" onClick={props.onClear}>Xóa lịch sử Alert Center</button>}
      <p className="alert-disclaimer">V0.13.0 monitoring hoạt động khi app/PWA đang mở hoặc còn session hoạt động. Push 24/7 khi app đóng hoàn toàn cần Cloud Persistence + Scheduler + Web Push ở phiên bản sau.</p>
    </section>
  );
}

function AlertSettings(props: Props) {
  const p = props.preferences;
  const patch = (value: Partial<AlertPreferences>) => props.onPreferences({ ...p, ...value });
  const permissionLabel = props.notificationPermission === 'unsupported' ? 'Không hỗ trợ' : props.notificationPermission === 'denied' ? 'Bị chặn trong trình duyệt' : p.browserNotifications ? 'Đang bật' : 'Đang tắt';
  return (
    <section className="alert-settings-card">
      <div className="alert-settings-head"><div><strong>Cấu hình cảnh báo</strong><span>Chỉ tạo event khi điều kiện thay đổi, có dedupe + cooldown.</span></div><button onClick={props.onToggleBrowserNotifications}>{p.browserNotifications ? '🔔 Tắt browser' : '🔕 Bật browser'}</button></div>
      <small className="alert-permission">Browser notification: {permissionLabel}</small>
      <div className="alert-setting-grid">
        <Toggle label="WAIT → BUY" checked={p.buySignal} onChange={(v) => patch({ buySignal: v })} />
        <Toggle label="Entry Zone" checked={p.entryZone} onChange={(v) => patch({ entryZone: v })} />
        <Toggle label="TP1 / TP2 / TP3" checked={p.targets} onChange={(v) => patch({ targets: v })} />
        <Toggle label="Stop Loss" checked={p.stopLoss} onChange={(v) => patch({ stopLoss: v })} />
        <Toggle label="Forecast đảo hướng" checked={p.forecastReversal} onChange={(v) => patch({ forecastReversal: v })} />
        <Toggle label="Position Risk" checked={p.positionRisk} onChange={(v) => patch({ positionRisk: v })} />
        <Toggle label="Data stale/degraded" checked={p.dataQuality} onChange={(v) => patch({ dataQuality: v })} />
        <Toggle label="Opportunity change" checked={p.opportunity} onChange={(v) => patch({ opportunity: v })} />
      </div>
      <label className="alert-range-setting"><span>Opportunity cảnh báo từ <b>{p.opportunityThreshold}/100</b></span><input type="range" min="60" max="95" step="5" value={p.opportunityThreshold} onChange={(e) => patch({ opportunityThreshold: Number(e.target.value) })} /></label>
      <label className="alert-range-setting"><span>Cooldown cùng event <b>{p.cooldownMinutes} phút</b></span><input type="range" min="5" max="120" step="5" value={p.cooldownMinutes} onChange={(e) => patch({ cooldownMinutes: Number(e.target.value) })} /></label>
    </section>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (value: boolean) => void }) {
  return <label className="alert-toggle"><input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} /><span>{label}</span></label>;
}

function AlertCard({ alert, onRead, onOpen }: { alert: AlertEvent; onRead: (id: string) => void; onOpen: (alert: AlertEvent) => void }) {
  const icon = priorityIcon(alert.priority, alert.category);
  return (
    <article className={`alert-card priority-${alert.priority.toLowerCase()} ${alert.unread ? 'unread' : ''}`}>
      <button className="alert-card-main" onClick={() => { onRead(alert.id); onOpen(alert); }}>
        <div className="alert-icon">{icon}</div>
        <div className="alert-card-content">
          <div className="alert-card-title"><strong>{alert.title}</strong>{alert.unread && <i />}</div>
          <p>{alert.message}</p>
          <div className="alert-card-meta"><span>{priorityLabel(alert.priority)}</span>{alert.symbol && <span>{alert.symbol}</span>}<span>{relativeTime(alert.lastTriggeredAt)}</span>{alert.count > 1 && <span>×{alert.count}</span>}</div>
        </div>
        <b className="alert-chevron">›</b>
      </button>
    </article>
  );
}

function AlertSummary({ label, value, tone }: { label: string; value: number; tone: string }) {
  return <article className={`alert-summary ${tone}`}><span>{label}</span><strong>{value}</strong></article>;
}

function priorityIcon(priority: AlertPriority, category: AlertCategory) {
  if (priority === 'CRITICAL') return '!';
  if (category === 'SIGNAL' || category === 'ENTRY') return '↗';
  if (category === 'TARGET') return '✓';
  if (category === 'FORECAST') return '⌁';
  if (category === 'OPPORTUNITY') return '◎';
  if (category === 'POSITION') return '◉';
  if (category === 'DATA') return '⚠';
  return '•';
}
function priorityLabel(priority: AlertPriority) { return priority === 'CRITICAL' ? 'CRITICAL' : priority === 'HIGH' ? 'HIGH' : priority === 'MEDIUM' ? 'MEDIUM' : 'INFO'; }
function relativeTime(value: string) {
  const diff = Date.now() - new Date(value).getTime();
  if (!Number.isFinite(diff) || diff < 0) return 'vừa xong';
  const mins = Math.floor(diff / 60_000); if (mins < 1) return 'vừa xong'; if (mins < 60) return `${mins} phút trước`;
  const hours = Math.floor(mins / 60); if (hours < 24) return `${hours} giờ trước`;
  return `${Math.floor(hours / 24)} ngày trước`;
}
