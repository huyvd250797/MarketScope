'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import MarketChart, { type ChartOverlays } from './MarketChart';
import TechnicalAnalysisPanel from './TechnicalAnalysisPanel';
import SignalPanel from './SignalPanel';
import PositionPanel from './PositionPanel';
import { analyzePositionExit } from '@/lib/analysis/position';
import type { Interval, MarketSnapshot, MarketType, PositionExitAnalysis, SymbolItem } from '@/lib/market/types';

type ThemePreference = 'auto' | 'light' | 'dark';
type NavKey = 'analyze' | 'watchlist' | 'positions' | 'history' | 'settings';

type ApiError = { error?: string; correlationId?: string };
type SavedPosition = { market: MarketType; symbol: string; entryPrice: number; interval: Interval; savedAt: string };

const cryptoIntervals: Interval[] = ['15m', '1h', '4h', '1d', '1w'];
const stockIntervals: Interval[] = ['15m', '1h', '1d', '1w'];
const defaults: Record<MarketType, { symbol: string; interval: Interval }> = {
  CRYPTO: { symbol: 'BTCUSDT', interval: '1h' },
  STOCK: { symbol: 'FPT', interval: '1d' },
};

export default function MarketApp() {
  const [market, setMarket] = useState<MarketType>('CRYPTO');
  const [symbol, setSymbol] = useState('BTCUSDT');
  const [query, setQuery] = useState('BTCUSDT');
  const [interval, setInterval] = useState<Interval>('1h');
  const [snapshot, setSnapshot] = useState<MarketSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [correlationId, setCorrelationId] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<SymbolItem[]>([]);
  const [suggestOpen, setSuggestOpen] = useState(false);
  const [themePref, setThemePref] = useState<ThemePreference>('auto');
  const [dark, setDark] = useState(false);
  const [nav, setNav] = useState<NavKey>('analyze');
  const [overlays, setOverlays] = useState<ChartOverlays>({ ema20: true, ema50: true, ema200: true, vwap: true, signals: true, position: true });
  const [recent, setRecent] = useState<Record<MarketType, string[]>>({ CRYPTO: [], STOCK: [] });
  const [savedPositions, setSavedPositions] = useState<SavedPosition[]>([]);
  const [entryDraft, setEntryDraft] = useState('');
  const [activeEntryPrice, setActiveEntryPrice] = useState<number | null>(null);
  const [positionInputError, setPositionInputError] = useState<string | null>(null);
  const requestRef = useRef(0);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const availableIntervals = market === 'CRYPTO' ? cryptoIntervals : stockIntervals;

  const resolveTheme = useCallback((pref: ThemePreference) => {
    const isDark = pref === 'dark' || (pref === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    document.documentElement.dataset.theme = isDark ? 'dark' : 'light';
    document.documentElement.dataset.themePreference = pref;
    setDark(isDark);
  }, []);

  useEffect(() => {
    const saved = (localStorage.getItem('marketscope-theme') as ThemePreference | null) || 'auto';
    setThemePref(saved);
    resolveTheme(saved);

    try {
      const savedRecent = JSON.parse(localStorage.getItem('marketscope-recent') || '{}') as Partial<Record<MarketType, string[]>>;
      setRecent({ CRYPTO: savedRecent.CRYPTO || [], STOCK: savedRecent.STOCK || [] });
    } catch {
      // Ignore corrupt local storage.
    }

    try {
      const stored = JSON.parse(localStorage.getItem('marketscope-positions') || '[]') as SavedPosition[];
      setSavedPositions(Array.isArray(stored) ? stored.filter((item) => item && item.entryPrice > 0) : []);
    } catch {
      setSavedPositions([]);
    }

    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const listener = () => {
      const pref = (localStorage.getItem('marketscope-theme') as ThemePreference | null) || 'auto';
      if (pref === 'auto') resolveTheme('auto');
    };
    mq.addEventListener('change', listener);

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => undefined);
    }

    return () => mq.removeEventListener('change', listener);
  }, [resolveTheme]);

  const setTheme = (pref: ThemePreference) => {
    localStorage.setItem('marketscope-theme', pref);
    setThemePref(pref);
    resolveTheme(pref);
  };

  const addRecent = useCallback((targetMarket: MarketType, value: string) => {
    setRecent((prev) => {
      const next = {
        ...prev,
        [targetMarket]: [value, ...prev[targetMarket].filter((x) => x !== value)].slice(0, 5),
      };
      localStorage.setItem('marketscope-recent', JSON.stringify(next));
      return next;
    });
  }, []);

  const loadMarket = useCallback(async (targetMarket: MarketType, targetSymbol: string, targetInterval: Interval) => {
    const requestId = ++requestRef.current;
    setLoading(true);
    setError(null);
    setCorrelationId(null);

    try {
      const params = new URLSearchParams({ market: targetMarket, symbol: targetSymbol, interval: targetInterval });
      const response = await fetch(`/api/market/candles?${params.toString()}`, { cache: 'no-store' });
      const data = (await response.json()) as MarketSnapshot & ApiError;
      if (!response.ok) throw Object.assign(new Error(data.error || 'Không thể lấy dữ liệu'), { correlationId: data.correlationId });
      if (requestId !== requestRef.current) return;
      setSnapshot(data);
      setSymbol(data.symbol);
      setQuery(data.symbol);
      setCorrelationId(data.correlationId || null);
      addRecent(targetMarket, data.symbol);
    } catch (err) {
      if (requestId !== requestRef.current) return;
      setSnapshot(null);
      setError(err instanceof Error ? err.message : 'Không thể lấy dữ liệu thị trường');
      const cid = typeof err === 'object' && err && 'correlationId' in err ? String((err as { correlationId?: unknown }).correlationId || '') : '';
      setCorrelationId(cid || null);
    } finally {
      if (requestId === requestRef.current) setLoading(false);
    }
  }, [addRecent]);

  useEffect(() => {
    void loadMarket(market, symbol, interval);
    // load only when market/symbol/interval actually changes
  }, [market, symbol, interval, loadMarket]);

  useEffect(() => {
    const saved = savedPositions.find((item) => item.market === market && item.symbol === symbol);
    if (saved) {
      setEntryDraft(String(saved.entryPrice));
      setActiveEntryPrice(saved.entryPrice);
    } else {
      setEntryDraft('');
      setActiveEntryPrice(null);
    }
    setPositionInputError(null);
  }, [market, symbol, savedPositions]);

  const switchMarket = (nextMarket: MarketType) => {
    if (nextMarket === market) return;
    const next = defaults[nextMarket];
    setMarket(nextMarket);
    setSymbol(next.symbol);
    setQuery(next.symbol);
    setInterval(next.interval);
    setSuggestOpen(false);
    setNav('analyze');
  };

  const searchSymbols = (value: string) => {
    setQuery(value.toUpperCase());
    setSuggestOpen(true);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(async () => {
      try {
        const params = new URLSearchParams({ market, q: value });
        const response = await fetch(`/api/symbols/search?${params.toString()}`);
        const data = await response.json() as { results?: SymbolItem[] };
        setSuggestions(data.results || []);
      } catch {
        setSuggestions([]);
      }
    }, 180);
  };

  const chooseSymbol = (item: SymbolItem) => {
    setQuery(item.symbol);
    setSymbol(item.symbol);
    setSuggestOpen(false);
  };

  const submitSymbol = () => {
    const normalized = query.trim().toUpperCase();
    if (!normalized) return;
    setSuggestOpen(false);
    setSymbol(normalized);
  };

  const positionAnalysis = useMemo<PositionExitAnalysis | null>(() => {
    if (!snapshot?.analysis || activeEntryPrice == null) return null;
    try {
      return analyzePositionExit(snapshot.candles, market, interval, snapshot.analysis, snapshot.signal, activeEntryPrice);
    } catch {
      return null;
    }
  }, [snapshot, market, interval, activeEntryPrice]);

  const analyzePosition = () => {
    const parsed = parseEntryPrice(entryDraft, snapshot?.currentPrice || 0);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      setPositionInputError('Vui lòng nhập giá vào lệnh hợp lệ lớn hơn 0.');
      return;
    }
    const normalizedSymbol = snapshot?.symbol || symbol;
    const saved: SavedPosition = { market, symbol: normalizedSymbol, entryPrice: parsed, interval, savedAt: new Date().toISOString() };
    setActiveEntryPrice(parsed);
    setPositionInputError(null);
    setSavedPositions((prev) => {
      const next = [saved, ...prev.filter((item) => !(item.market === market && item.symbol === normalizedSymbol))].slice(0, 30);
      localStorage.setItem('marketscope-positions', JSON.stringify(next));
      return next;
    });
  };

  const clearCurrentPosition = () => {
    const normalizedSymbol = snapshot?.symbol || symbol;
    setActiveEntryPrice(null);
    setEntryDraft('');
    setPositionInputError(null);
    setSavedPositions((prev) => {
      const next = prev.filter((item) => !(item.market === market && item.symbol === normalizedSymbol));
      localStorage.setItem('marketscope-positions', JSON.stringify(next));
      return next;
    });
  };

  const openSavedPosition = (item: SavedPosition) => {
    setMarket(item.market);
    setSymbol(item.symbol);
    setQuery(item.symbol);
    setInterval(item.interval);
    setEntryDraft(String(item.entryPrice));
    setActiveEntryPrice(item.entryPrice);
    setNav('analyze');
  };

  const deleteSavedPosition = (item: SavedPosition) => {
    setSavedPositions((prev) => {
      const next = prev.filter((entry) => !(entry.market === item.market && entry.symbol === item.symbol));
      localStorage.setItem('marketscope-positions', JSON.stringify(next));
      return next;
    });
    if (item.market === market && item.symbol === symbol) {
      setActiveEntryPrice(null);
      setEntryDraft('');
    }
  };

  const priceDigits = useMemo(() => snapshot?.currency === 'VND' ? 0 : ((snapshot?.currentPrice || 0) >= 1000 ? 2 : 6), [snapshot]);
  const changePositive = (snapshot?.changePercent || 0) >= 0;

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand-block">
          <div className="brand-mark" aria-hidden="true">M</div>
          <div>
            <div className="brand-row">
              <strong>MarketScope</strong>
              <span className="version-badge">V0.4.0</span>
            </div>
            <span className="brand-sub">Position • Exit • Profit Planner</span>
          </div>
        </div>
        <button className="theme-button" onClick={() => setNav('settings')} aria-label="Cài đặt giao diện">
          {dark ? '☾' : '☀'}
        </button>
      </header>

      <section className="content">
        {nav === 'settings' ? (
          <SettingsPanel themePref={themePref} onTheme={setTheme} onBack={() => setNav('analyze')} />
        ) : nav === 'positions' ? (
          <PositionsPanel positions={savedPositions} onOpen={openSavedPosition} onDelete={deleteSavedPosition} onBack={() => setNav('analyze')} />
        ) : nav !== 'analyze' ? (
          <ComingSoon nav={nav} onBack={() => setNav('analyze')} />
        ) : (
          <>
            <div className="market-toggle" role="tablist" aria-label="Chọn thị trường">
              <button className={market === 'CRYPTO' ? 'active' : ''} onClick={() => switchMarket('CRYPTO')}>CRYPTO</button>
              <button className={market === 'STOCK' ? 'active' : ''} onClick={() => switchMarket('STOCK')}>STOCK VN</button>
            </div>

            <section className="search-card">
              <label htmlFor="symbol-search">Mã tài sản</label>
              <div className="search-row">
                <div className="search-wrap">
                  <span className="search-icon" aria-hidden="true">⌕</span>
                  <input
                    id="symbol-search"
                    value={query}
                    onChange={(e) => searchSymbols(e.target.value)}
                    onFocus={() => {
                      setSuggestOpen(true);
                      searchSymbols(query);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') submitSymbol();
                      if (e.key === 'Escape') setSuggestOpen(false);
                    }}
                    autoComplete="off"
                    autoCapitalize="characters"
                    spellCheck={false}
                    placeholder={market === 'CRYPTO' ? 'BTC, ETH, SOL…' : 'FPT, VNM, HPG…'}
                  />
                  {suggestOpen && suggestions.length > 0 && (
                    <div className="suggestions">
                      {suggestions.map((item) => (
                        <button key={`${item.market}-${item.symbol}`} onMouseDown={(e) => e.preventDefault()} onClick={() => chooseSymbol(item)}>
                          <span><strong>{item.symbol}</strong><small>{item.name}</small></span>
                          <em>{item.exchange}</em>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <button className="primary-button" onClick={submitSymbol}>Xem</button>
              </div>

              <div className="recent-row">
                <span>Gần đây</span>
                {(recent[market].length ? recent[market] : market === 'CRYPTO' ? ['BTCUSDT', 'ETHUSDT', 'SOLUSDT'] : ['FPT', 'VNM', 'HPG']).map((item) => (
                  <button key={item} onClick={() => { setQuery(item); setSymbol(item); }}>{item}</button>
                ))}
              </div>
            </section>

            <section className="snapshot-card">
              {loading ? (
                <SnapshotSkeleton />
              ) : error ? (
                <ErrorState message={error} correlationId={correlationId} onRetry={() => loadMarket(market, symbol, interval)} />
              ) : snapshot ? (
                <>
                  <div className="snapshot-head">
                    <div>
                      <div className="symbol-line"><h1>{snapshot.symbol}</h1><span>{snapshot.exchange}</span></div>
                      <p>{snapshot.displayName}</p>
                    </div>
                    <span className={`provider-pill ${snapshot.fallbackUsed ? 'warning' : ''}`}>{snapshot.provider}</span>
                  </div>
                  <div className="price-row">
                    <strong>{formatPrice(snapshot.currentPrice, snapshot.currency, priceDigits)}</strong>
                    {snapshot.changePercent != null && (
                      <span className={changePositive ? 'gain' : 'loss'}>
                        {changePositive ? '+' : ''}{snapshot.changePercent.toFixed(2)}%
                      </span>
                    )}
                  </div>
                  <div className="market-meta-grid">
                    <Metric label="Cao" value={formatNullable(snapshot.dayHigh, snapshot.currency, priceDigits)} />
                    <Metric label="Thấp" value={formatNullable(snapshot.dayLow, snapshot.currency, priceDigits)} />
                    <Metric label="Khối lượng" value={formatVolume(snapshot.volume)} />
                    <Metric label="Trạng thái" value={snapshot.marketState} />
                  </div>
                  <div className="freshness-row">
                    <span className="status-dot" />
                    Dữ liệu: {formatDataTime(snapshot.dataAt)}
                  </div>
                  {snapshot.warning && <div className="warning-box">⚠ {snapshot.warning}</div>}
                </>
              ) : null}
            </section>

            {!loading && snapshot?.analysis && (
              <>
                <PositionPanel
                  snapshot={snapshot}
                  entryDraft={entryDraft}
                  analysis={positionAnalysis}
                  onEntryDraft={(value) => { setEntryDraft(value); setPositionInputError(null); }}
                  onAnalyze={analyzePosition}
                  onClear={clearCurrentPosition}
                />
                {positionInputError && <div className="position-input-error">! {positionInputError}</div>}
              </>
            )}

            {!loading && snapshot?.signal && <SignalPanel signal={snapshot.signal} snapshot={snapshot} />}
            {!loading && snapshot?.analysis && <TechnicalAnalysisPanel analysis={snapshot.analysis} snapshot={snapshot} />}

            <section className="chart-card">
              <div className="section-title-row">
                <div><h2>Biểu đồ giá</h2><span>Candlestick + Volume + Indicator + Signal + Position levels</span></div>
                <span className="data-count">{snapshot?.candles.length || 0} nến</span>
              </div>
              <div className="timeframe-row">
                {availableIntervals.map((item) => (
                  <button key={item} className={interval === item ? 'active' : ''} onClick={() => setInterval(item)}>{formatInterval(item)}</button>
                ))}
              </div>
              <div className="overlay-row" aria-label="Chỉ báo trên biểu đồ">
                <OverlayButton label="EMA20" active={overlays.ema20} onClick={() => setOverlays((prev) => ({ ...prev, ema20: !prev.ema20 }))} tone="ema20" />
                <OverlayButton label="EMA50" active={overlays.ema50} onClick={() => setOverlays((prev) => ({ ...prev, ema50: !prev.ema50 }))} tone="ema50" />
                <OverlayButton label="EMA200" active={overlays.ema200} onClick={() => setOverlays((prev) => ({ ...prev, ema200: !prev.ema200 }))} tone="ema200" />
                <OverlayButton label="VWAP" active={overlays.vwap} onClick={() => setOverlays((prev) => ({ ...prev, vwap: !prev.vwap }))} tone="vwap" />
                <OverlayButton label="ENTRY/SL/TP" active={overlays.signals} onClick={() => setOverlays((prev) => ({ ...prev, signals: !prev.signals }))} tone="signal" />
                <OverlayButton label="POSITION" active={overlays.position} onClick={() => setOverlays((prev) => ({ ...prev, position: !prev.position }))} tone="position" />
              </div>
              {loading ? <div className="chart-loading"><div className="pulse" /></div> : snapshot ? <MarketChart candles={snapshot.candles} analysis={snapshot.analysis} signal={snapshot.signal} position={positionAnalysis} overlays={overlays} dark={dark} currency={snapshot.currency} /> : <div className="chart-empty">Không có dữ liệu chart</div>}
            </section>

            <section className="roadmap-card">
              <div className="roadmap-icon">↗</div>
              <div>
                <strong>Đúng roadmap V0.4.0</strong>
                <p>Đã có Position / Exit Planner: nhập giá vốn, P/L hiện tại, mốc bảo vệ, target ngắn/trung/dài hạn, lưu vị thế local và vẽ trực tiếp lên chart. Backtest, win rate và expectancy vẫn thuộc V0.5.0.</p>
              </div>
            </section>

            <p className="disclaimer">MarketScope V0.4.0 phân tích setup và vị thế LONG rule-based để tham khảo, không tự đặt lệnh và không đảm bảo lợi nhuận. Khung ngắn/trung/dài hạn không phải ETA; win rate/expectancy chỉ xuất hiện sau backtest ở V0.5.0.</p>
          </>
        )}
      </section>

      <nav className="bottom-nav" aria-label="Điều hướng chính">
        <NavButton active={nav === 'analyze'} icon="⌁" label="Analyze" onClick={() => setNav('analyze')} />
        <NavButton active={nav === 'watchlist'} icon="☆" label="Watchlist" onClick={() => setNav('watchlist')} />
        <NavButton active={nav === 'positions'} icon="◎" label="Positions" onClick={() => setNav('positions')} />
        <NavButton active={nav === 'history'} icon="◷" label="History" onClick={() => setNav('history')} />
        <NavButton active={nav === 'settings'} icon="⚙" label="Settings" onClick={() => setNav('settings')} />
      </nav>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div className="metric"><span>{label}</span><strong>{value}</strong></div>;
}

function NavButton({ active, icon, label, onClick }: { active: boolean; icon: string; label: string; onClick: () => void }) {
  return <button className={active ? 'active' : ''} onClick={onClick}><span>{icon}</span><small>{label}</small></button>;
}

function OverlayButton({ label, active, onClick, tone }: { label: string; active: boolean; onClick: () => void; tone: 'ema20' | 'ema50' | 'ema200' | 'vwap' | 'signal' | 'position' }) {
  return <button className={`overlay-chip ${tone} ${active ? 'active' : ''}`} onClick={onClick}><i />{label}</button>;
}

function SettingsPanel({ themePref, onTheme, onBack }: { themePref: ThemePreference; onTheme: (t: ThemePreference) => void; onBack: () => void }) {
  return (
    <section className="panel-page">
      <button className="back-button" onClick={onBack}>← Quay lại</button>
      <div className="panel-heading"><h1>Settings</h1><p>Cấu hình MarketScope V0.4.0.</p></div>
      <div className="settings-card">
        <strong>Giao diện</strong>
        <p>Dark / Light / Auto được lưu trên thiết bị.</p>
        <div className="theme-options">
          {(['auto', 'light', 'dark'] as ThemePreference[]).map((item) => (
            <button key={item} className={themePref === item ? 'active' : ''} onClick={() => onTheme(item)}>
              {item === 'auto' ? '◐ Auto' : item === 'light' ? '☀ Light' : '☾ Dark'}
            </button>
          ))}
        </div>
      </div>
      <div className="settings-card">
        <strong>Market data providers</strong>
        <p><b>Crypto:</b> Binance public market data — không cần API key.</p>
        <p><b>Stock VN:</b> ưu tiên SSI FastConnect khi cấu hình server env; fallback giúp preview khi chưa có SSI.</p>
      </div>
      <div className="settings-card muted-card">
        <strong>Phiên bản</strong>
        <p>MarketScope V0.4.0 — Position / Exit Analysis.</p>
      </div>
    </section>
  );
}

function PositionsPanel({ positions, onOpen, onDelete, onBack }: { positions: SavedPosition[]; onOpen: (item: SavedPosition) => void; onDelete: (item: SavedPosition) => void; onBack: () => void }) {
  return (
    <section className="panel-page">
      <button className="back-button" onClick={onBack}>← Quay lại</button>
      <div className="panel-heading"><h1>Positions</h1><p>Các giá vốn đã lưu trên thiết bị • tối đa 30 mã.</p></div>
      {positions.length === 0 ? (
        <div className="positions-empty"><span>◎</span><strong>Chưa có vị thế đã lưu</strong><p>Vào Analyze, nhập “Giá đã vào lệnh” và bấm Phân tích vị thế.</p><button className="primary-button" onClick={onBack}>Về Analyze</button></div>
      ) : (
        <div className="positions-list">
          {positions.map((item) => (
            <article className="saved-position" key={`${item.market}-${item.symbol}`}>
              <button className="saved-position-main" onClick={() => onOpen(item)}>
                <span className="saved-position-market">{item.market === 'CRYPTO' ? 'CRYPTO' : 'STOCK VN'}</span>
                <strong>{item.symbol}</strong>
                <small>Giá vốn: {new Intl.NumberFormat(item.market === 'STOCK' ? 'vi-VN' : 'en-US', { maximumFractionDigits: item.market === 'STOCK' ? 0 : 8 }).format(item.entryPrice)} • {formatInterval(item.interval)}</small>
              </button>
              <button className="saved-position-delete" aria-label={`Xóa vị thế ${item.symbol}`} onClick={() => onDelete(item)}>×</button>
            </article>
          ))}
        </div>
      )}
      <div className="settings-card muted-card"><strong>Lưu trữ V0.4.0</strong><p>Positions đang dùng localStorage trên thiết bị. Chưa có đồng bộ tài khoản/cloud ở phiên bản này.</p></div>
    </section>
  );
}

function ComingSoon({ nav, onBack }: { nav: Exclude<NavKey, 'analyze' | 'positions' | 'settings'>; onBack: () => void }) {
  const map = {
    watchlist: ['Watchlist', 'Theo roadmap: V0.6.0'],
    history: ['History', 'Sẽ hoàn thiện cùng storage ở các phiên bản tiếp theo'],
  } as const;
  return (
    <section className="coming-soon">
      <div className="coming-icon">◌</div>
      <h1>{map[nav][0]}</h1>
      <p>{map[nav][1]}</p>
      <button className="primary-button" onClick={onBack}>Về Analyze</button>
    </section>
  );
}

function SnapshotSkeleton() {
  return <div className="skeleton-stack"><div className="skeleton w45" /><div className="skeleton w70 big" /><div className="skeleton-grid"><div className="skeleton" /><div className="skeleton" /><div className="skeleton" /><div className="skeleton" /></div></div>;
}

function ErrorState({ message, correlationId, onRetry }: { message: string; correlationId: string | null; onRetry: () => void }) {
  return (
    <div className="error-state">
      <span>!</span><div><strong>Không tải được dữ liệu</strong><p>{message}</p>{correlationId && <small>ID: {correlationId}</small>}</div><button onClick={onRetry}>Thử lại</button>
    </div>
  );
}

function parseEntryPrice(value: string, referencePrice: number) {
  const raw = value.trim().replace(/\s/g, '');
  if (!raw) return Number.NaN;
  const candidates = new Set<number>();
  const push = (candidate: string) => {
    const parsed = Number(candidate);
    if (Number.isFinite(parsed) && parsed > 0) candidates.add(parsed);
  };
  push(raw);
  push(raw.replace(/,/g, ''));
  push(raw.replace(/\./g, ''));
  if (raw.includes(',') && !raw.includes('.')) push(raw.replace(',', '.'));
  if (raw.includes('.') && !raw.includes(',')) push(raw.replace('.', ','));
  if (raw.includes(',') && raw.includes('.')) {
    push(raw.replace(/,/g, ''));
    push(raw.replace(/\./g, '').replace(',', '.'));
  }
  const values = [...candidates];
  if (!values.length) return Number.NaN;
  if (!(referencePrice > 0)) return values[0];
  return values.sort((a, b) => Math.abs(Math.log(a / referencePrice)) - Math.abs(Math.log(b / referencePrice)))[0];
}

function formatPrice(value: number, currency: string, digits: number) {
  const locale = currency === 'VND' ? 'vi-VN' : 'en-US';
  return `${new Intl.NumberFormat(locale, { maximumFractionDigits: digits }).format(value)}${currency === 'VND' ? ' ₫' : ` ${currency}`}`;
}

function formatNullable(value: number | null, currency: string, digits: number) {
  if (value == null || !Number.isFinite(value)) return '-';
  return new Intl.NumberFormat(currency === 'VND' ? 'vi-VN' : 'en-US', { maximumFractionDigits: digits }).format(value);
}

function formatVolume(value: number | null) {
  if (value == null || !Number.isFinite(value)) return '-';
  return new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 2 }).format(value);
}

function formatDataTime(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' }).format(date);
}

function formatInterval(value: Interval) {
  return value === '1d' ? '1D' : value === '1w' ? '1W' : value;
}
