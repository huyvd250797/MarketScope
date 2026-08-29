'use client';

import { useCallback, useEffect, useState } from 'react';
import type { SystemHealthSnapshot } from '@/lib/market/types';

type ApiError = { error?: string; correlationId?: string };

export default function SystemHealthPanel() {
  const [health, setHealth] = useState<SystemHealthSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/system/health', { cache: 'no-store' });
      const data = await response.json() as SystemHealthSnapshot & ApiError;
      if (!response.ok) throw new Error(data.error || 'Không thể chạy diagnostics');
      setHealth(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể chạy diagnostics');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  return (
    <div className="settings-card health-card">
      <div className="health-heading">
        <div><strong>System Health & Diagnostics</strong><p>Kiểm tra provider, engine và policy cache bằng request mới.</p></div>
        <button onClick={() => void refresh()} disabled={loading}>{loading ? 'Đang kiểm tra…' : '↻ Kiểm tra lại'}</button>
      </div>

      {error ? <div className="health-error">! {error}</div> : loading && !health ? <div className="health-loading"><i />Đang chạy diagnostics…</div> : health ? (
        <>
          <div className={`health-overall ${health.overall.toLowerCase().replace('_', '-')}`}>
            <span className="health-pulse" />
            <div><strong>{health.overallLabel}</strong><small>V{health.version} • {formatDateTime(health.generatedAt)}</small></div>
            <b>{health.overall}</b>
          </div>

          <div className="health-section-title"><strong>Market providers</strong><span>Stock mode: {health.stockProviderMode}</span></div>
          <div className="health-list">
            {health.providers.map((item) => <HealthRow key={item.key} item={item} />)}
          </div>

          <div className="health-section-title"><strong>Analysis engines</strong><span>Server self-test</span></div>
          <div className="health-list">
            {health.engines.map((item) => <HealthRow key={item.key} item={item} />)}
          </div>

          <details className="health-details">
            <summary>Cache & runtime policies</summary>
            <div>
              {health.cachePolicies.map((item) => <p key={item.endpoint}><b>{item.endpoint}</b><span>{item.policy}</span><small>{item.note}</small></p>)}
            </div>
          </details>
          <div className="health-notes">{health.notes.map((note) => <p key={note}>• {note}</p>)}</div>
        </>
      ) : null}
    </div>
  );
}

function HealthRow({ item }: { item: SystemHealthSnapshot['providers'][number] }) {
  const tone = item.status.toLowerCase().replace('_', '-');
  return (
    <div className="health-row">
      <span className={`health-status-dot ${tone}`} />
      <div><strong>{item.label}{item.selected ? ' • SELECTED' : ''}</strong><small>{item.message}</small></div>
      <div className="health-row-meta"><b>{item.status}</b><span>{item.latencyMs == null ? '-' : `${item.latencyMs} ms`}</span></div>
    </div>
  );
}

function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', hour: '2-digit', minute: '2-digit', second: '2-digit', day: '2-digit', month: '2-digit' }).format(date);
}
