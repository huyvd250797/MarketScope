'use client';

import MarketChart, { type ChartOverlays } from './MarketChart';
import PositionPanel from './PositionPanel';
import PortfolioPanel from './PortfolioPanel';
import DataQualityPanel from './DataQualityPanel';
import StrategyProfileSelector, { effectiveProfileLabel } from './StrategyProfileSelector';
import type { Interval, MarketSnapshot, MarketType, PositionExitAnalysis, SavedPosition, StrategyProfileKey } from '@/lib/market/types';

type Props = {
  market: MarketType;
  query: string;
  interval: Interval;
  availableIntervals: Interval[];
  snapshot: MarketSnapshot | null;
  loading: boolean;
  error: string | null;
  correlationId: string | null;
  entryDraft: string;
  quantityDraft: string;
  analysis: PositionExitAnalysis | null;
  inputError: string | null;
  positions: SavedPosition[];
  dark: boolean;
  strategyProfile: StrategyProfileKey;
  onStrategy: (profile: StrategyProfileKey) => void;
  onMarket: (market: MarketType) => void;
  onQuery: (value: string) => void;
  onSubmit: () => void;
  onInterval: (interval: Interval) => void;
  onEntryDraft: (value: string) => void;
  onQuantityDraft: (value: string) => void;
  onAnalyze: () => void;
  onClear: () => void;
  onOpen: (item: SavedPosition) => void;
  onDelete: (item: SavedPosition) => void;
  onRetry: () => void;
  onBack: () => void;
};

const positionOverlays: ChartOverlays = { ema20: true, ema50: true, ema200: false, vwap: true, signals: false, position: true };

export default function PositionsWorkspace(props: Props) {
  const { market, query, interval, availableIntervals, snapshot, loading, error, correlationId, entryDraft, quantityDraft, analysis, inputError, positions, dark, strategyProfile } = props;
  const digits = snapshot?.currency === 'VND' ? 0 : (snapshot?.currentPrice || 0) >= 1000 ? 2 : 6;

  return (
    <section className="panel-page positions-workspace">
      <button className="back-button" onClick={props.onBack}>← Quay lại</button>
      <div className="panel-heading">
        <h1>Positions</h1>
        <p>Toàn bộ phân tích vị thế đã mua, P/L, bảo vệ vốn và kế hoạch thoát được tập trung tại đây.</p>
      </div>

      {positions.length > 0 && <PortfolioPanel positions={positions} onOpen={props.onOpen} />}

      {positions.length > 0 && (
        <div className="position-saved-section">
          <div className="workspace-section-title"><strong>Vị thế đã lưu</strong><span>{positions.length}/30</span></div>
          <div className="positions-list compact">
            {positions.map((item) => (
              <article className={`saved-position ${snapshot?.symbol === item.symbol && market === item.market ? 'active' : ''}`} key={`${item.market}-${item.symbol}`}>
                <button className="saved-position-main" onClick={() => props.onOpen(item)}>
                  <span className="saved-position-market">{item.market === 'CRYPTO' ? 'CRYPTO' : item.market === 'FOREX' ? 'FOREX' : 'STOCK VN'}</span>
                  <strong>{item.symbol}</strong>
                  <small>Giá vốn: {formatPositionPrice(item)} • Số lượng: {formatQuantity(item.quantity || 1)} • {formatInterval(item.interval)} • {effectiveProfileLabel(item.strategyProfile || 'SWING')}</small>
                </button>
                <button className="saved-position-delete" aria-label={`Xóa vị thế ${item.symbol}`} onClick={() => props.onDelete(item)}>×</button>
              </article>
            ))}
          </div>
        </div>
      )}

      <div className="position-asset-card">
        <div className="market-toggle" role="tablist" aria-label="Chọn thị trường cho vị thế">
          <button className={market === 'CRYPTO' ? 'active' : ''} onClick={() => props.onMarket('CRYPTO')}>CRYPTO</button>
          <button className={market === 'STOCK' ? 'active' : ''} onClick={() => props.onMarket('STOCK')}>STOCK VN</button><button className={market === 'FOREX' ? 'active' : ''} onClick={() => props.onMarket('FOREX')}>FOREX</button>
        </div>
        <div className="position-asset-row">
          <input
            value={query}
            onChange={(event) => props.onQuery(event.target.value.toUpperCase())}
            onKeyDown={(event) => { if (event.key === 'Enter') props.onSubmit(); }}
            placeholder={market === 'CRYPTO' ? 'BTCUSDT' : market === 'FOREX' ? 'EURUSD' : 'FPT'}
            autoCapitalize="characters"
            spellCheck={false}
          />
          <button className="primary-button" onClick={props.onSubmit}>Tải mã</button>
        </div>
        <div className="timeframe-row position-timeframe">
          {availableIntervals.map((item) => <button className={interval === item ? 'active' : ''} key={item} onClick={() => props.onInterval(item)}>{formatInterval(item)}</button>)}
        </div>
      </div>

      <StrategyProfileSelector value={strategyProfile} strategy={snapshot?.strategy} market={market} onChange={props.onStrategy} />

      {loading ? (
        <div className="position-module-loading"><div className="pulse" /><span>Đang tải dữ liệu vị thế…</span></div>
      ) : error ? (
        <div className="error-state"><span>!</span><div><strong>Không tải được dữ liệu</strong><p>{error}</p>{correlationId && <small>ID: {correlationId}</small>}</div><button onClick={props.onRetry}>Thử lại</button></div>
      ) : snapshot?.analysis ? (
        <>
          <div className="position-market-strip">
            <div><strong>{snapshot.symbol}</strong><span>{snapshot.displayName}</span></div>
            <div><strong>{formatPrice(snapshot.currentPrice, digits, snapshot.currency)}</strong><span className={(snapshot.changePercent || 0) >= 0 ? 'gain-text' : 'loss-text'}>{snapshot.changePercent == null ? '-' : `${snapshot.changePercent >= 0 ? '+' : ''}${snapshot.changePercent.toFixed(2)}%`}</span></div>
          </div>
          {snapshot.quality && <DataQualityPanel quality={snapshot.quality} provider={snapshot.providerDiagnostics} compact />}

          <PositionPanel
            snapshot={snapshot}
            entryDraft={entryDraft}
            quantityDraft={quantityDraft}
            analysis={analysis}
            onEntryDraft={props.onEntryDraft}
            onQuantityDraft={props.onQuantityDraft}
            onAnalyze={props.onAnalyze}
            onClear={props.onClear}
          />
          {inputError && <div className="position-input-error">! {inputError}</div>}

          {analysis && (
            <section className="chart-card position-chart-card">
              <div className="section-title-row"><div><h2>Chart vị thế</h2><span>Giá vốn • Protect/Stop • Exit ngắn / trung / dài hạn</span></div><span className="data-count">{snapshot.candles.length} nến</span></div>
              <MarketChart candles={snapshot.candles} analysis={snapshot.analysis} signal={snapshot.signal} position={analysis} overlays={positionOverlays} dark={dark} currency={snapshot.currency} />
            </section>
          )}
        </>
      ) : null}

      {!loading && !error && snapshot?.quality && !snapshot.analysis && <DataQualityPanel quality={snapshot.quality} provider={snapshot.providerDiagnostics} />}

      {positions.length === 0 && !analysis && !loading && (
        <div className="positions-empty compact-empty"><span>◎</span><strong>Chưa có vị thế đã lưu</strong><p>Chọn mã, nhập giá đã mua và bấm “Phân tích vị thế”. Vị thế sẽ được lưu cục bộ trên thiết bị.</p></div>
      )}

      <div className="settings-card muted-card"><strong>Phạm vi Positions V0.13.0</strong><p>Mỗi vị thế lưu effective Strategy Profile tại thời điểm phân tích. Exit Planner dùng đúng profile đó cho mốc bảo vệ và horizon; Data Quality Guard vẫn được giữ nguyên. Giá vốn + số lượng + profile chỉ lưu localStorage.</p></div>
    </section>
  );
}

function formatPositionPrice(item: SavedPosition) {
  return new Intl.NumberFormat(item.market === 'STOCK' ? 'vi-VN' : 'en-US', { maximumFractionDigits: item.market === 'STOCK' ? 0 : 8 }).format(item.entryPrice);
}

function formatPrice(value: number, digits: number, currency: string) {
  return `${new Intl.NumberFormat(currency === 'VND' ? 'vi-VN' : 'en-US', { maximumFractionDigits: digits }).format(value)}${currency === 'VND' ? ' ₫' : ` ${currency}`}`;
}

function formatInterval(value: Interval) {
  return value === '1d' ? '1D' : value === '1w' ? '1W' : value;
}

function formatQuantity(value: number) { return new Intl.NumberFormat('en-US', { maximumFractionDigits: 8 }).format(value); }
