'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { effectiveProfileLabel } from './StrategyProfileSelector';
import type { PortfolioRiskSnapshot, SavedPosition } from '@/lib/market/types';

type Props = {
  positions: SavedPosition[];
  onOpen: (item: SavedPosition) => void;
};

type ApiError = { error?: string; correlationId?: string };

export default function PortfolioPanel({ positions, onOpen }: Props) {
  const [data, setData] = useState<PortfolioRiskSnapshot | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  const key = useMemo(() => positions.map((item) => `${item.market}:${item.symbol}:${item.interval}:${item.strategyProfile || 'SWING'}:${item.entryPrice}:${item.quantity || 1}`).join('|'), [positions]);

  const refresh = useCallback(async () => {
    if (!positions.length) { setData(null); return; }
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/market/portfolio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store',
        body: JSON.stringify({ positions: positions.map((item) => ({ ...item, quantity: item.quantity || 1 })) }),
      });
      const payload = await response.json() as PortfolioRiskSnapshot & ApiError;
      if (!response.ok) throw new Error(payload.error || 'Không thể cập nhật danh mục');
      setData(payload);
      setLastUpdated(new Date().toISOString());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể cập nhật danh mục');
    } finally {
      setLoading(false);
    }
  }, [positions]);

  useEffect(() => { void refresh(); }, [key, refresh]);

  if (!positions.length) return null;

  return (
    <section className="portfolio-card">
      <div className="portfolio-head">
        <div>
          <span className="portfolio-eyebrow">PORTFOLIO • SPOT ONLY</span>
          <h2>Danh mục & quản trị rủi ro</h2>
          <p>Tổng hợp theo giá vốn + số lượng. VND và USD/USDT được tách riêng, không cộng sai tỷ giá.</p>
        </div>
        <button className="portfolio-refresh" disabled={loading} onClick={() => void refresh()}>{loading ? 'Đang cập nhật…' : '↻ Cập nhật'}</button>
      </div>

      {error && <div className="portfolio-error">! {error}</div>}
      {!data && loading && <div className="portfolio-loading"><div className="pulse" /><span>Đang đánh giá toàn bộ vị thế…</span></div>}

      {data && (
        <>
          <div className={`portfolio-status ${data.status.toLowerCase()}`}>
            <div><span>TRẠNG THÁI DANH MỤC</span><strong>{data.statusLabel}</strong></div>
            <div className="portfolio-status-counts">
              <span><b>{data.profitablePositions}</b> đang lãi</span>
              <span><b>{data.losingPositions}</b> đang âm</span>
              <span><b>{data.riskPositions}</b> rủi ro</span>
            </div>
          </div>

          <div className="portfolio-buckets">
            {data.buckets.map((bucket) => (
              <article className="portfolio-bucket" key={bucket.currency}>
                <div className="portfolio-bucket-title"><strong>{bucket.currency}</strong><span>{bucket.positionCount} vị thế</span></div>
                <div className="portfolio-metric-grid">
                  <PortfolioMetric label="VỐN GIÁ GỐC" value={formatMoney(bucket.invested, bucket.currency)} />
                  <PortfolioMetric label="GIÁ TRỊ HIỆN TẠI" value={formatMoney(bucket.currentValue, bucket.currency)} />
                  <PortfolioMetric label="P/L" value={`${bucket.pnlValue >= 0 ? '+' : ''}${formatMoney(bucket.pnlValue, bucket.currency)}`} detail={`${bucket.pnlPercent >= 0 ? '+' : ''}${bucket.pnlPercent.toFixed(2)}%`} tone={bucket.pnlValue >= 0 ? 'profit' : 'loss'} />
                  <PortfolioMetric label="DOWNSIDE → STOP" value={formatMoney(bucket.downsideToStopValue, bucket.currency)} detail="Theo mốc bảo vệ kỹ thuật" tone="risk" />
                </div>
                <div className="portfolio-concentration">
                  <div><span>Vị thế lớn nhất</span><strong>{bucket.largestPositionSymbol || '-'}</strong></div>
                  <div className="allocation-track"><i style={{ width: `${Math.min(100, bucket.largestPositionWeight)}%` }} /></div>
                  <b>{bucket.largestPositionWeight.toFixed(1)}%</b>
                </div>
              </article>
            ))}
          </div>

          <div className="portfolio-table-wrap">
            <div className="workspace-section-title"><strong>Phân bổ từng vị thế</strong><span>{data.positions.length} mã</span></div>
            <div className="portfolio-position-list">
              {data.positions.map((item) => {
                const saved = positions.find((p) => p.market === item.market && p.symbol === item.symbol);
                const bucket = data.buckets.find((b) => b.currency === item.currency);
                const weight = bucket && bucket.currentValue > 0 ? item.currentValue / bucket.currentValue * 100 : 0;
                return (
                  <button className="portfolio-position-row" key={`${item.market}-${item.symbol}`} onClick={() => saved && onOpen(saved)}>
                    <div className="portfolio-symbol"><strong>{item.symbol}</strong><span>{item.market === 'STOCK' ? 'STOCK VN' : item.market === 'FOREX' ? 'FOREX' : 'CRYPTO'} • {effectiveProfileLabel(item.strategyProfile)} • {formatQuantity(item.quantity)}{item.dataQualityScore != null ? ` • Data ${item.dataQualityScore}/100` : ''}</span></div>
                    <div><span>Giá trị</span><strong>{formatMoney(item.currentValue, item.currency)}</strong></div>
                    <div className={item.pnlValue >= 0 ? 'gain-text' : 'loss-text'}><span>P/L</span><strong>{item.pnlPercent >= 0 ? '+' : ''}{item.pnlPercent.toFixed(2)}%</strong></div>
                    <div><span>Tỷ trọng</span><strong>{weight.toFixed(1)}%</strong></div>
                    <div className={`portfolio-action ${actionTone(item.action)}`}><span>{item.actionLabel}</span></div>
                  </button>
                );
              })}
            </div>
          </div>

          {data.warnings.length > 0 && (
            <div className="portfolio-warning-box">
              <strong>Cảnh báo danh mục</strong>
              {data.warnings.map((warning) => <p key={warning}>! {warning}</p>)}
            </div>
          )}

          <details className="portfolio-notes">
            <summary>Cách MarketScope tính Portfolio Risk</summary>
            {data.notes.map((note) => <p key={note}>• {note}</p>)}
          </details>
          <div className="portfolio-updated">Cập nhật: {formatTime(lastUpdated || data.generatedAt)}</div>
        </>
      )}
    </section>
  );
}

function PortfolioMetric({ label, value, detail, tone = '' }: { label: string; value: string; detail?: string; tone?: string }) {
  return <div className={`portfolio-metric ${tone}`}><span>{label}</span><strong>{value}</strong>{detail && <small>{detail}</small>}</div>;
}

function formatMoney(value: number, currency: string) {
  const digits = currency === 'VND' ? 0 : Math.abs(value) >= 1000 ? 2 : 4;
  const number = new Intl.NumberFormat(currency === 'VND' ? 'vi-VN' : 'en-US', { maximumFractionDigits: digits }).format(value);
  return currency === 'VND' ? `${number} ₫` : `${number} ${currency}`;
}

function formatQuantity(value: number) {
  return `${new Intl.NumberFormat('en-US', { maximumFractionDigits: 8 }).format(value)} đơn vị`;
}

function actionTone(action: string) {
  if (action === 'EXIT_RISK' || action === 'REDUCE_RISK') return 'risk';
  if (action === 'TAKE_PARTIAL' || action === 'PROTECT_PROFIT') return 'profit';
  return 'hold';
}

function formatTime(value: string) {
  try { return new Intl.DateTimeFormat('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' }).format(new Date(value)); } catch { return '-'; }
}
