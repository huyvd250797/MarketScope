'use client';

import type { BacktestMetrics, BacktestResult, MarketSnapshot } from '@/lib/market/types';

type Props = {
  backtest: BacktestResult;
  snapshot: MarketSnapshot;
};

export default function BacktestPanel({ backtest, snapshot }: Props) {
  const calibration = backtest.calibration;
  const qualityTone = calibration.quality.toLowerCase();
  const ready = backtest.status !== 'INSUFFICIENT_HISTORY';
  const showCurrentRate = calibration.applicable && calibration.quality !== 'INSUFFICIENT' && calibration.calibratedWinRate != null;
  const headline = showCurrentRate
    ? `${calibration.calibratedWinRate!.toFixed(1)}%`
    : calibration.applicable
      ? 'Chưa đủ mẫu'
      : 'Không áp dụng';

  return (
    <section className="backtest-card compact-backtest">
      <div className="backtest-title-row">
        <div>
          <h2>Độ tin cậy lịch sử</h2>
          <span>Profile {profileLabel(backtest.strategyProfile)} • không look-ahead • không trộn horizon giữa các profile</span>
        </div>
        <span className={`calibration-quality ${qualityTone}`}>{calibration.qualityLabel}</span>
      </div>

      {!ready ? (
        <div className="backtest-empty">
          <strong>Chưa đủ lịch sử để hiệu chỉnh</strong>
          <p>Cần ít nhất {backtest.warmupCandles} nến warm-up và thêm dữ liệu ngoài mẫu. Hiện có {backtest.sampleCandles} nến lịch sử dùng được.</p>
        </div>
      ) : (
        <>
          <div className={`calibration-hero compact ${calibration.applicable ? 'applicable' : 'neutral'}`}>
            <div>
              <span className="backtest-eyebrow">TÍN HIỆU HIỆN TẠI</span>
              <strong>{headline}</strong>
              <p>{showCurrentRate ? 'Calibrated TP1-before-SL hit rate' : calibration.applicable ? 'Có BUY nhưng số mẫu tương đồng chưa đủ để hiển thị % nổi bật.' : 'WAIT/AVOID không được gán xác suất thắng.'}</p>
            </div>
            <div className="calibration-meta">
              <span>Độ tin cậy</span>
              <strong>{calibration.qualityLabel}</strong>
              <small>{calibration.resolvedTrades} mẫu resolved{calibration.estimatedTimeToTp1 ? ` • TP1 ~${calibration.estimatedTimeToTp1}` : ''}</small>
            </div>
          </div>

          <div className="compact-confidence-grid">
            <Metric label="Kỳ vọng" value={formatR(calibration.expectancyR)} detail="R / trade" tone={(calibration.expectancyR ?? 0) > 0 ? 'positive' : (calibration.expectancyR ?? 0) < 0 ? 'negative' : undefined} />
            <Metric label="Profit Factor" value={formatNumber(calibration.profitFactor, 2)} detail="Cohort tương đồng" tone={(calibration.profitFactor ?? 0) >= 1.2 ? 'positive' : undefined} />
            <Metric label="Validation" value={formatPercent(backtest.validation.metrics.calibratedWinRate)} detail={`${backtest.validation.metrics.resolvedTrades} resolved`} />
          </div>

          <details className="backtest-expanded">
            <summary>Xem chi tiết Backtest & Calibration</summary>
            <div className="backtest-expanded-body">
              <div className="backtest-metric-grid">
                <Metric label="Raw win rate" value={formatPercent(calibration.winRate)} detail="Trước shrink" />
                <Metric label="Expectancy" value={formatR(calibration.expectancyR)} detail="R / trade" tone={(calibration.expectancyR ?? 0) > 0 ? 'positive' : (calibration.expectancyR ?? 0) < 0 ? 'negative' : undefined} />
                <Metric label="Profit Factor" value={formatNumber(calibration.profitFactor, 2)} detail="Cohort tương đồng" tone={(calibration.profitFactor ?? 0) >= 1.2 ? 'positive' : undefined} />
                <Metric label="Stability gap" value={calibration.stabilityGapPercent == null ? '-' : `${calibration.stabilityGapPercent.toFixed(1)} pp`} detail="Full vs validation" />
              </div>

              <div className="calibration-note"><span>i</span><p>{calibration.note}</p></div>

              <div className="backtest-section-head">
                <div><strong>Toàn bộ backtest</strong><span>{backtest.sampleCandles} nến • {backtest.evaluatedSignals} thời điểm đánh giá • {backtest.buySignals} BUY</span></div>
                <span className={`backtest-status ${backtest.status.toLowerCase()}`}>{statusLabel(backtest.status)}</span>
              </div>
              <MetricsBlock metrics={backtest.metrics} />

              <div className="validation-box">
                <div className="backtest-section-head compact">
                  <div><strong>Validation window</strong><span>{backtest.validation.splitPercent}% lịch sử gần nhất</span></div>
                  <span>{backtest.validation.startTime ? formatDate(backtest.validation.startTime) : '-'}</span>
                </div>
                <MetricsBlock metrics={backtest.validation.metrics} compact />
              </div>

              <div className="target-hit-grid">
                <Metric label="TP1 hit" value={formatPercent(backtest.metrics.tp1HitRate)} detail="Trong filled trades" />
                <Metric label="TP2 reach" value={formatPercent(backtest.metrics.tp2HitRate)} detail="Trước SL / timeout" />
                <Metric label="TP3 reach" value={formatPercent(backtest.metrics.tp3HitRate)} detail="Trước SL / timeout" />
                <Metric label="Max DD" value={`${backtest.metrics.maxDrawdownR.toFixed(2)}R`} detail="Equity theo benchmark" tone={backtest.metrics.maxDrawdownR >= 4 ? 'negative' : undefined} />
              </div>

              {backtest.recentTrades.length > 0 && (
                <div className="recent-backtest-wrap">
                  <h3>Giao dịch mô phỏng gần nhất</h3>
                  <div className="recent-backtest-list">
                    {backtest.recentTrades.map((trade) => (
                      <article key={`${trade.signalTime}-${trade.fillTime}`} className={`backtest-trade ${trade.outcome.toLowerCase()}`}>
                        <div>
                          <span>{formatDate(trade.signalTime)}</span>
                          <strong>{formatSetup(trade.setup)}</strong>
                          <small>{trade.regime.replaceAll('_', ' ')} • Score {trade.score}</small>
                        </div>
                        <div className="backtest-trade-result">
                          <b>{trade.outcome}</b>
                          <strong>{trade.realizedR > 0 ? '+' : ''}{trade.realizedR.toFixed(2)}R</strong>
                          <small>{trade.returnPercent > 0 ? '+' : ''}{trade.returnPercent.toFixed(2)}% • {trade.barsHeld} bars</small>
                        </div>
                      </article>
                    ))}
                  </div>
                </div>
              )}

              <details className="backtest-details">
                <summary>Methodology & giới hạn</summary>
                <div>
                  {backtest.methodology.map((item) => <p key={item}>• {item}</p>)}
                  <p>• Provider: {snapshot.provider}; timeframe: {snapshot.interval}; market: {snapshot.market}.</p>
                </div>
              </details>
              <div className="backtest-disclaimer"><span>!</span><p>{backtest.disclaimer}</p></div>
            </div>
          </details>
        </>
      )}
    </section>
  );
}

function MetricsBlock({ metrics, compact = false }: { metrics: BacktestMetrics; compact?: boolean }) {
  return (
    <div className={`backtest-summary-grid ${compact ? 'compact' : ''}`}>
      <Metric label="Filled" value={String(metrics.filledTrades)} detail={`${metrics.noFillSignals} no-fill`} />
      <Metric label="Win / Loss" value={`${metrics.wins} / ${metrics.losses}`} detail={`${metrics.timeouts} timeout`} />
      <Metric label="Win rate" value={formatPercent(metrics.winRate)} detail={`${metrics.resolvedTrades} resolved`} />
      <Metric label="Calibrated" value={formatPercent(metrics.calibratedWinRate)} detail="Beta(2,2) shrink" />
      <Metric label="Expectancy" value={formatR(metrics.expectancyR)} detail="R / trade" tone={(metrics.expectancyR ?? 0) > 0 ? 'positive' : (metrics.expectancyR ?? 0) < 0 ? 'negative' : undefined} />
      <Metric label="Profit Factor" value={formatNumber(metrics.profitFactor, 2)} detail={`Resolution ${formatPercent(metrics.resolutionRate)}`} />
    </div>
  );
}

function Metric({ label, value, detail, tone }: { label: string; value: string; detail: string; tone?: 'positive' | 'negative' }) {
  return (
    <article className={`backtest-metric ${tone || ''}`}>
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{detail}</small>
    </article>
  );
}

function formatPercent(value: number | null) {
  return value == null || !Number.isFinite(value) ? '-' : `${value.toFixed(1)}%`;
}

function formatR(value: number | null) {
  return value == null || !Number.isFinite(value) ? '-' : `${value > 0 ? '+' : ''}${value.toFixed(2)}R`;
}

function formatNumber(value: number | null, digits: number) {
  return value == null || !Number.isFinite(value) ? '-' : value >= 99 ? '∞' : value.toFixed(digits);
}

function formatDate(timestamp: number) {
  return new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' }).format(new Date(timestamp * 1000));
}

function formatSetup(setup: string) {
  if (setup === 'TREND_PULLBACK') return 'Trend Pullback';
  if (setup === 'BREAKOUT') return 'Breakout';
  if (setup === 'RANGE_REBOUND') return 'Range Rebound';
  return setup;
}

function statusLabel(status: BacktestResult['status']) {
  if (status === 'READY') return 'READY';
  if (status === 'LIMITED') return 'LIMITED SAMPLE';
  return 'INSUFFICIENT';
}

function profileLabel(value: BacktestResult['strategyProfile']) {
  if (value === 'SHORT_TERM') return 'Ngắn hạn';
  if (value === 'MEDIUM_TERM') return 'Trung hạn';
  if (value === 'LONG_TERM') return 'Dài hạn';
  return 'Swing';
}
