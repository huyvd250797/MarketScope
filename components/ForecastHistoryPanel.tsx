'use client';

import { useMemo, useState } from 'react';
import { forecastHistoryMetrics } from '@/lib/analysis/forecastHistory';
import type { ForecastHistoryRecord, ForecastValidationResult, MarketType } from '@/lib/market/types';

type Filter = 'ALL' | MarketType;

function pct(value: number | null | undefined, digits = 1) {
  return value == null || !Number.isFinite(value) ? '—' : `${value.toFixed(digits)}%`;
}

function formatTime(timestamp: number) {
  return new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(timestamp * 1000));
}

export default function ForecastHistoryPanel({
  records,
  currentValidation,
  currentSymbol,
  onClear,
  onBack,
}: {
  records: ForecastHistoryRecord[];
  currentValidation?: ForecastValidationResult;
  currentSymbol?: string;
  onClear: () => void;
  onBack: () => void;
}) {
  const [filter, setFilter] = useState<Filter>('ALL');
  const filtered = useMemo(() => filter === 'ALL' ? records : records.filter((item) => item.market === filter), [records, filter]);
  const metrics = useMemo(() => forecastHistoryMetrics(filtered), [filtered]);
  const pending = filtered.reduce((sum, record) => sum + record.scenarios.filter((item) => item.status === 'PENDING').length, 0);
  const resolved = metrics.overall.samples;

  return (
    <section className="panel-page history-workspace">
      <button className="back-button" onClick={onBack}>← Quay lại</button>
      <div className="panel-heading">
        <h1>Forecast History</h1>
        <p>Lưu forecast trên thiết bị, tự đối chiếu sau khi đủ nến và đo độ chính xác thực tế.</p>
      </div>

      {currentValidation && (
        <section className="history-validation-card">
          <div className="section-title-row"><div><h2>Rolling validation hiện tại</h2><span>{currentSymbol || 'Mã đang xem'} • cùng timeframe/profile hiện tại</span></div><span className={`history-quality ${currentValidation.confidenceQuality.toLowerCase()}`}>{currentValidation.confidenceQualityLabel}</span></div>
          <div className="history-kpi-grid">
            <div><span>Direction accuracy</span><strong>{pct(currentValidation.overall.calibratedDirectionAccuracy)}</strong></div>
            <div><span>Range hit</span><strong>{pct(currentValidation.overall.rangeHitRate)}</strong></div>
            <div><span>Sai số TB</span><strong>{pct(currentValidation.overall.avgAbsoluteErrorPercent)}</strong></div>
            <div><span>Mẫu</span><strong>{currentValidation.evaluatedScenarios}</strong></div>
          </div>
        </section>
      )}

      <section className="history-local-card">
        <div className="section-title-row">
          <div><h2>Lịch sử forecast của bạn</h2><span>Local-only • không cần tài khoản • tối đa 180 snapshots</span></div>
          {records.length > 0 && <button className="danger-ghost" onClick={onClear}>Xóa lịch sử</button>}
        </div>
        <div className="history-filter-row">
          {(['ALL','CRYPTO','STOCK','FOREX'] as Filter[]).map((item) => <button key={item} className={filter === item ? 'active' : ''} onClick={() => setFilter(item)}>{item === 'ALL' ? 'Tất cả' : item === 'STOCK' ? 'Stock VN' : item}</button>)}
        </div>

        <div className="history-kpi-grid history-local-kpis">
          <div><span>Resolved</span><strong>{resolved}</strong></div>
          <div><span>Pending</span><strong>{pending}</strong></div>
          <div><span>Đúng hướng</span><strong>{pct(metrics.overall.directionAccuracy)}</strong></div>
          <div><span>Range hit</span><strong>{pct(metrics.overall.rangeHitRate)}</strong></div>
        </div>

        <div className="history-horizon-grid">
          {(['SHORT','MEDIUM','LONG'] as const).map((key) => {
            const item = metrics[key];
            const label = key === 'SHORT' ? 'Ngắn hạn' : key === 'MEDIUM' ? 'Trung hạn' : 'Dài hạn';
            return <article key={key}><small>{label}</small><strong>{pct(item.directionAccuracy)}</strong><span>Direction • {item.samples} mẫu</span><div><b>{pct(item.rangeHitRate)}</b> range hit</div><div><b>{pct(item.avgErrorPercent)}</b> sai số TB</div></article>;
          })}
        </div>
      </section>

      {filtered.length === 0 ? (
        <div className="history-empty"><span>◷</span><strong>Chưa có Forecast History</strong><p>Mỗi forecast bạn xem từ V0.11.0 sẽ được lưu tại đây. Khi đủ nến tương lai, hệ thống tự đánh dấu đúng/sai.</p></div>
      ) : (
        <div className="history-record-list">
          {filtered.slice(0, 60).map((record) => {
            const recordResolved = record.scenarios.filter((item) => item.status === 'RESOLVED');
            const correct = recordResolved.filter((item) => item.directionCorrect).length;
            return <article key={record.id} className="history-record">
              <div className="history-record-head">
                <div><strong>{record.symbol}</strong><span>{record.market} • {record.interval.toUpperCase()} • {record.strategyLabel}</span></div>
                <div><b className={record.overallBias.toLowerCase()}>{record.overallLabel}</b><small>{formatTime(record.originTime)}</small></div>
              </div>
              <div className="history-record-summary"><span>Confidence <b>{record.calibratedConfidence}/100</b></span><span>Resolved <b>{recordResolved.length}/3</b></span>{recordResolved.length > 0 && <span>Đúng <b>{correct}/{recordResolved.length}</b></span>}</div>
              <div className="history-scenario-list">
                {record.scenarios.map((scenario) => <div key={scenario.horizon} className={`history-scenario ${scenario.status.toLowerCase()}`}>
                  <div><strong>{scenario.label}</strong><span>{scenario.timeGuide}</span></div>
                  <div><b>{scenario.directionLabel}</b><span>{scenario.calibratedProbability}%</span></div>
                  <div>{scenario.status === 'PENDING' ? <em>Đang chờ đủ nến</em> : <><em className={scenario.directionCorrect ? 'correct' : 'wrong'}>{scenario.directionCorrect ? '✓ Đúng hướng' : '✕ Sai hướng'}</em><small>Range {scenario.rangeHit ? '✓' : '✕'} • Error {pct(scenario.absoluteErrorPercent)}</small></>}</div>
                </div>)}
              </div>
            </article>;
          })}
        </div>
      )}

      <p className="history-note">Forecast History trên thiết bị chỉ được resolve khi app tải lại đúng mã + timeframe và trong snapshot có đủ nến tương lai. Rolling validation phía server vẫn cung cấp historical accuracy ngay cả khi local history còn trống.</p>
    </section>
  );
}
