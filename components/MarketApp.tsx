'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import MarketChart, { type ChartOverlays } from './MarketChart';
import TechnicalAnalysisPanel from './TechnicalAnalysisPanel';
import SignalPanel from './SignalPanel';
import PositionsWorkspace from './PositionsWorkspace';
import WatchlistPanel, { watchlistKey, type WatchlistItem, type WatchlistState } from './WatchlistPanel';
import BacktestPanel from './BacktestPanel';
import DataQualityPanel from './DataQualityPanel';
import SystemHealthPanel from './SystemHealthPanel';
import StrategyProfileSelector from './StrategyProfileSelector';
import ForecastPanel from './ForecastPanel';
import ForecastHistoryPanel from './ForecastHistoryPanel';
import OpportunityScannerPanel from './OpportunityScannerPanel';
import AlertCenterPanel from './AlertCenterPanel';
import { analyzePositionExit } from '@/lib/analysis/position';
import { createForecastHistoryRecord, readForecastHistory, resolveForecastRecords, upsertForecastRecord, writeForecastHistory } from '@/lib/analysis/forecastHistory';
import type { ForecastHistoryRecord, Interval, MarketSnapshot, MarketType, OpportunityScannerResponse, PortfolioRiskSnapshot, PositionExitAnalysis, SavedPosition, StrategyProfileKey, SymbolItem, WatchlistMonitorSnapshot } from '@/lib/market/types';
import {
  ALERT_PORTFOLIO_STATE_KEY, ALERT_PREFS_STORAGE_KEY, ALERT_SCANNER_STATE_KEY, ALERT_WATCH_STATE_KEY, ALERTS_STORAGE_KEY,
  defaultAlertPreferences, derivePortfolioAlerts, deriveScannerAlerts, deriveWatchlistAlerts, mergeAlertCandidates, portfolioState, scannerState,
  type AlertCandidate, type AlertEvent, type AlertPreferences, type PortfolioMonitorState, type ScannerMonitorState,
} from '@/lib/monitoring/alerts';

type ThemePreference = 'auto' | 'light' | 'dark';
type NavKey = 'analyze' | 'scanner' | 'watchlist' | 'positions' | 'history' | 'settings' | 'alerts';

type ApiError = { error?: string; correlationId?: string };

const cryptoIntervals: Interval[] = ['15m', '1h', '4h', '1d', '1w'];
const stockIntervals: Interval[] = ['15m', '1h', '1d', '1w'];
const forexIntervals: Interval[] = ['15m', '1h', '4h', '1d', '1w'];
const defaults: Record<MarketType, { symbol: string; interval: Interval }> = {
  CRYPTO: { symbol: 'BTCUSDT', interval: '1h' },
  STOCK: { symbol: 'FPT', interval: '1d' },
  FOREX: { symbol: 'EURUSD', interval: '1h' },
};

export default function MarketApp() {
  const [market, setMarket] = useState<MarketType>('CRYPTO');
  const [symbol, setSymbol] = useState('BTCUSDT');
  const [query, setQuery] = useState('BTCUSDT');
  const [interval, setInterval] = useState<Interval>('1h');
  const [strategyProfile, setStrategyProfile] = useState<StrategyProfileKey>('AUTO');
  const [snapshot, setSnapshot] = useState<MarketSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [correlationId, setCorrelationId] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<SymbolItem[]>([]);
  const [suggestOpen, setSuggestOpen] = useState(false);
  const [themePref, setThemePref] = useState<ThemePreference>('auto');
  const [dark, setDark] = useState(false);
  const [nav, setNav] = useState<NavKey>('analyze');
  const [moreOpen, setMoreOpen] = useState(false);
  const [overlays, setOverlays] = useState<ChartOverlays>({ ema20: true, ema50: true, ema200: true, vwap: true, signals: true, position: false });
  const [recent, setRecent] = useState<Record<MarketType, string[]>>({ CRYPTO: [], STOCK: [], FOREX: [] });
  const [savedPositions, setSavedPositions] = useState<SavedPosition[]>([]);
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);
  const [forecastHistory, setForecastHistory] = useState<ForecastHistoryRecord[]>([]);
  const [watchlistStates, setWatchlistStates] = useState<Record<string, WatchlistState>>({});
  const [watchlistRefreshing, setWatchlistRefreshing] = useState(false);
  const [watchlistLastRefresh, setWatchlistLastRefresh] = useState<string | null>(null);
  const [notificationEnabled, setNotificationEnabled] = useState(false);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission | 'unsupported'>('unsupported');
  const [alerts, setAlerts] = useState<AlertEvent[]>([]);
  const [alertPreferences, setAlertPreferences] = useState<AlertPreferences>(defaultAlertPreferences);
  const [entryDraft, setEntryDraft] = useState('');
  const [quantityDraft, setQuantityDraft] = useState('1');
  const [activeEntryPrice, setActiveEntryPrice] = useState<number | null>(null);
  const [positionInputError, setPositionInputError] = useState<string | null>(null);
  const requestRef = useRef(0);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const watchRefreshRef = useRef(false);
  const opportunityMonitorRef = useRef(false);
  const portfolioMonitorRef = useRef(false);
  const alertsRef = useRef<AlertEvent[]>([]);
  const alertPrefsRef = useRef<AlertPreferences>(defaultAlertPreferences);
  const alertReturnNavRef = useRef<NavKey>('analyze');

  const availableIntervals = market === 'CRYPTO' ? cryptoIntervals : market === 'FOREX' ? forexIntervals : stockIntervals;

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
    const storedStrategy = localStorage.getItem('marketscope-strategy-profile') as StrategyProfileKey | null;
    if (storedStrategy === 'AUTO' || storedStrategy === 'SHORT_TERM' || storedStrategy === 'SWING' || storedStrategy === 'MEDIUM_TERM' || storedStrategy === 'LONG_TERM') setStrategyProfile(storedStrategy);

    try {
      const savedRecent = JSON.parse(localStorage.getItem('marketscope-recent') || '{}') as Partial<Record<MarketType, string[]>>;
      setRecent({ CRYPTO: savedRecent.CRYPTO || [], STOCK: savedRecent.STOCK || [], FOREX: savedRecent.FOREX || [] });
    } catch {
      // Ignore corrupt local storage.
    }

    try {
      const stored = JSON.parse(localStorage.getItem('marketscope-positions') || '[]') as SavedPosition[];
      setSavedPositions(Array.isArray(stored) ? stored.filter((item) => item && item.entryPrice > 0).map((item) => ({ ...item, quantity: item.quantity && item.quantity > 0 ? item.quantity : 1, strategyProfile: item.strategyProfile || 'SWING' })) : []);
    } catch {
      setSavedPositions([]);
    }

    try {
      const storedWatchlist = JSON.parse(localStorage.getItem('marketscope-watchlist') || '[]') as WatchlistItem[];
      const safe = Array.isArray(storedWatchlist) ? storedWatchlist.filter((item) => item && item.symbol && item.market && item.interval).map((item) => ({ ...item, profile: item.profile || 'SWING' })).slice(0, 12) : [];
      setWatchlist(safe);
    } catch {
      setWatchlist([]);
    }

    setForecastHistory(readForecastHistory());

    try {
      const storedAlerts = JSON.parse(localStorage.getItem(ALERTS_STORAGE_KEY) || '[]') as AlertEvent[];
      const safeAlerts = Array.isArray(storedAlerts) ? storedAlerts.filter((item) => item && item.id && item.fingerprint).slice(0, 160) : [];
      alertsRef.current = safeAlerts;
      setAlerts(safeAlerts);
    } catch { alertsRef.current = []; setAlerts([]); }
    try {
      const storedPrefs = JSON.parse(localStorage.getItem(ALERT_PREFS_STORAGE_KEY) || '{}') as Partial<AlertPreferences>;
      const prefs = { ...defaultAlertPreferences, ...storedPrefs };
      alertPrefsRef.current = prefs;
      setAlertPreferences(prefs);
    } catch { alertPrefsRef.current = defaultAlertPreferences; setAlertPreferences(defaultAlertPreferences); }

    if ('Notification' in window) {
      setNotificationPermission(Notification.permission);
      const legacyEnabled = localStorage.getItem('marketscope-notifications') === 'enabled';
      const prefEnabled = alertPrefsRef.current.browserNotifications || legacyEnabled;
      setNotificationEnabled(Notification.permission === 'granted' && prefEnabled);
      if (legacyEnabled && !alertPrefsRef.current.browserNotifications) {
        const migrated = { ...alertPrefsRef.current, browserNotifications: true };
        alertPrefsRef.current = migrated; setAlertPreferences(migrated); localStorage.setItem(ALERT_PREFS_STORAGE_KEY, JSON.stringify(migrated));
      }
    } else {
      setNotificationPermission('unsupported');
      setNotificationEnabled(false);
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

  const loadMarket = useCallback(async (targetMarket: MarketType, targetSymbol: string, targetInterval: Interval, targetProfile: StrategyProfileKey = strategyProfile) => {
    const requestId = ++requestRef.current;
    setLoading(true);
    setError(null);
    setCorrelationId(null);

    try {
      const params = new URLSearchParams({ market: targetMarket, symbol: targetSymbol, interval: targetInterval, profile: targetProfile });
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
  }, [addRecent, strategyProfile]);

  useEffect(() => {
    void loadMarket(market, symbol, interval);
    // load only when market/symbol/interval actually changes
  }, [market, symbol, interval, loadMarket]);

  useEffect(() => {
    const saved = savedPositions.find((item) => item.market === market && item.symbol === symbol);
    if (saved) {
      setEntryDraft(String(saved.entryPrice));
      setQuantityDraft(String(saved.quantity || 1));
      setActiveEntryPrice(saved.entryPrice);
    } else {
      setEntryDraft('');
      setQuantityDraft('1');
      setActiveEntryPrice(null);
    }
    setPositionInputError(null);
  }, [market, symbol, savedPositions]);

  useEffect(() => {
    if (!snapshot?.forecast || !snapshot.strategy) return;
    setForecastHistory((previous) => {
      const resolved = resolveForecastRecords(previous, snapshot).records;
      const record = createForecastHistoryRecord(snapshot);
      const next = record ? upsertForecastRecord(resolved, record) : resolved;
      if (next !== previous) writeForecastHistory(next);
      return next;
    });
  }, [snapshot]);

  const clearForecastHistory = () => {
    setForecastHistory([]);
    writeForecastHistory([]);
  };

  const showAlertNotification = useCallback(async (event: AlertEvent) => {
    if (!alertPrefsRef.current.browserNotifications || typeof window === 'undefined' || !('Notification' in window) || Notification.permission !== 'granted') return;
    try {
      const registration = await navigator.serviceWorker?.ready;
      if (registration) {
        await registration.showNotification(event.title, { body: event.message, tag: event.fingerprint, data: { url: '/' } });
      } else {
        new Notification(event.title, { body: event.message, tag: event.fingerprint });
      }
    } catch { /* Browser notification is best-effort only. */ }
  }, []);

  const emitAlertCandidates = useCallback((candidates: AlertCandidate[]) => {
    if (!candidates.length) return;
    const result = mergeAlertCandidates(alertsRef.current, candidates, alertPrefsRef.current);
    if (!result.emitted.length) return;
    alertsRef.current = result.alerts;
    setAlerts(result.alerts);
    localStorage.setItem(ALERTS_STORAGE_KEY, JSON.stringify(result.alerts));
    for (const event of result.emitted.slice(0, 3)) void showAlertNotification(event);
  }, [showAlertNotification]);

  const updateAlertPreferences = useCallback((preferences: AlertPreferences) => {
    alertPrefsRef.current = preferences;
    setAlertPreferences(preferences);
    setNotificationEnabled(preferences.browserNotifications && notificationPermission === 'granted');
    localStorage.setItem(ALERT_PREFS_STORAGE_KEY, JSON.stringify(preferences));
  }, [notificationPermission]);

  const markAlertRead = useCallback((id: string) => {
    const next = alertsRef.current.map((item) => item.id === id ? { ...item, unread: false } : item);
    alertsRef.current = next; setAlerts(next); localStorage.setItem(ALERTS_STORAGE_KEY, JSON.stringify(next));
  }, []);
  const markAllAlertsRead = useCallback(() => {
    const next = alertsRef.current.map((item) => ({ ...item, unread: false }));
    alertsRef.current = next; setAlerts(next); localStorage.setItem(ALERTS_STORAGE_KEY, JSON.stringify(next));
  }, []);
  const clearAlerts = useCallback(() => { alertsRef.current = []; setAlerts([]); localStorage.removeItem(ALERTS_STORAGE_KEY); }, []);

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
      return analyzePositionExit(snapshot.candles, market, interval, snapshot.analysis, snapshot.signal, activeEntryPrice, snapshot.strategy?.effective || 'SWING');
    } catch {
      return null;
    }
  }, [snapshot, market, interval, activeEntryPrice]);

  const analyzePosition = () => {
    const parsed = parseEntryPrice(entryDraft, snapshot?.currentPrice || 0);
    const quantity = parseQuantity(quantityDraft);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      setPositionInputError('Vui lòng nhập giá vào lệnh hợp lệ lớn hơn 0.');
      return;
    }
    if (!Number.isFinite(quantity) || quantity <= 0) {
      setPositionInputError('Vui lòng nhập số lượng nắm giữ hợp lệ lớn hơn 0.');
      return;
    }
    const normalizedSymbol = snapshot?.symbol || symbol;
    const saved: SavedPosition = { market, symbol: normalizedSymbol, entryPrice: parsed, quantity, interval, strategyProfile: snapshot?.strategy?.effective || 'SWING', savedAt: new Date().toISOString() };
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
    setQuantityDraft('1');
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
    setQuantityDraft(String(item.quantity || 1));
    setActiveEntryPrice(item.entryPrice);
    setStrategyProfile(item.strategyProfile || 'SWING');
    localStorage.setItem('marketscope-strategy-profile', item.strategyProfile || 'SWING');
    setNav('positions');
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
      setQuantityDraft('1');
    }
  };

  const addWatchlistItem = useCallback((targetMarket: MarketType, targetSymbol: string, targetInterval: Interval, targetProfile: StrategyProfileKey) => {
    const normalized = targetSymbol.trim().toUpperCase();
    if (!normalized) return;
    const nextItem: WatchlistItem = { market: targetMarket, symbol: normalized, interval: targetInterval, profile: targetProfile, addedAt: new Date().toISOString() };
    setWatchlist((prev) => {
      const key = watchlistKey(nextItem);
      if (prev.some((item) => watchlistKey(item) === key)) return prev;
      const next = [nextItem, ...prev].slice(0, 12);
      localStorage.setItem('marketscope-watchlist', JSON.stringify(next));
      return next;
    });
  }, []);

  const removeWatchlistItem = useCallback((item: WatchlistItem) => {
    const key = watchlistKey(item);
    setWatchlist((prev) => {
      const next = prev.filter((entry) => watchlistKey(entry) !== key);
      localStorage.setItem('marketscope-watchlist', JSON.stringify(next));
      return next;
    });
    setWatchlistStates((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }, []);

  const refreshWatchlist = useCallback(async () => {
    if (watchRefreshRef.current || watchlist.length === 0) return;
    watchRefreshRef.current = true;
    setWatchlistRefreshing(true);
    setWatchlistStates((prev) => {
      const next = { ...prev };
      for (const item of watchlist) {
        const key = watchlistKey(item);
        next[key] = { ...next[key], status: 'loading' };
      }
      return next;
    });

    let persisted: Record<string, WatchlistMonitorSnapshot> = {};
    try { persisted = JSON.parse(localStorage.getItem(ALERT_WATCH_STATE_KEY) || '{}') as Record<string, WatchlistMonitorSnapshot>; } catch { persisted = {}; }

    try {
      for (let index = 0; index < watchlist.length; index += 3) {
        const batch = watchlist.slice(index, index + 3);
        await Promise.all(batch.map(async (item) => {
          const key = watchlistKey(item);
          try {
            const params = new URLSearchParams({ market: item.market, symbol: item.symbol, interval: item.interval, profile: item.profile });
            const response = await fetch(`/api/market/monitor?${params.toString()}`, { cache: 'no-store' });
            const data = await response.json() as WatchlistMonitorSnapshot & ApiError;
            if (!response.ok) throw new Error(data.error || 'Không thể cập nhật tín hiệu');
            emitAlertCandidates(deriveWatchlistAlerts(item, persisted[key] || null, data));
            persisted[key] = data;
            setWatchlistStates((prev) => ({ ...prev, [key]: { status: 'ready', data, checkedAt: new Date().toISOString() } }));
          } catch (err) {
            setWatchlistStates((prev) => ({ ...prev, [key]: { ...prev[key], status: 'error', error: err instanceof Error ? err.message : 'Không thể cập nhật tín hiệu', checkedAt: new Date().toISOString() } }));
          }
        }));
        localStorage.setItem(ALERT_WATCH_STATE_KEY, JSON.stringify(persisted));
      }
      setWatchlistLastRefresh(new Date().toISOString());
    } finally {
      watchRefreshRef.current = false;
      setWatchlistRefreshing(false);
    }
  }, [watchlist, emitAlertCandidates]);

  // V0.13.0: Watchlist monitoring chạy trong toàn bộ session khi app đang visible,
  // không còn phụ thuộc người dùng phải đứng tại tab Watchlist.
  useEffect(() => {
    if (watchlist.length === 0) return;
    const initial = window.setTimeout(() => { if (document.visibilityState === 'visible') void refreshWatchlist(); }, 1200);
    const timer = window.setInterval(() => { if (document.visibilityState === 'visible') void refreshWatchlist(); }, 5 * 60 * 1000);
    return () => { window.clearTimeout(initial); window.clearInterval(timer); };
  }, [watchlist.length, refreshWatchlist]);

  const handleScannerResults = useCallback((payload: OpportunityScannerResponse) => {
    let previous: ScannerMonitorState = {};
    try { previous = JSON.parse(localStorage.getItem(ALERT_SCANNER_STATE_KEY) || '{}') as ScannerMonitorState; } catch { previous = {}; }
    emitAlertCandidates(deriveScannerAlerts(previous, payload.items, alertPrefsRef.current));
    localStorage.setItem(ALERT_SCANNER_STATE_KEY, JSON.stringify(scannerState(payload.items, payload.generatedAt)));
  }, [emitAlertCandidates]);

  const refreshOpportunityMonitor = useCallback(async () => {
    if (opportunityMonitorRef.current) return;
    opportunityMonitorRef.current = true;
    try {
      const response = await fetch('/api/market/scanner?market=ALL&profile=AUTO&scope=QUICK&limit=6', { cache: 'no-store' });
      const payload = await response.json() as OpportunityScannerResponse & ApiError;
      if (response.ok && payload.items) handleScannerResults(payload);
    } catch { /* Background scanner monitoring is best-effort. */ }
    finally { opportunityMonitorRef.current = false; }
  }, [handleScannerResults]);

  useEffect(() => {
    const initial = window.setTimeout(() => { if (document.visibilityState === 'visible') void refreshOpportunityMonitor(); }, 12_000);
    const timer = window.setInterval(() => { if (document.visibilityState === 'visible') void refreshOpportunityMonitor(); }, 10 * 60 * 1000);
    return () => { window.clearTimeout(initial); window.clearInterval(timer); };
  }, [refreshOpportunityMonitor]);

  const refreshPortfolioMonitor = useCallback(async () => {
    if (portfolioMonitorRef.current || savedPositions.length === 0) return;
    portfolioMonitorRef.current = true;
    try {
      const response = await fetch('/api/market/portfolio', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, cache: 'no-store',
        body: JSON.stringify({ positions: savedPositions.map((item) => ({ ...item, quantity: item.quantity || 1 })) }),
      });
      const payload = await response.json() as PortfolioRiskSnapshot & ApiError;
      if (!response.ok || !payload.positions) return;
      let previous: PortfolioMonitorState = {};
      try { previous = JSON.parse(localStorage.getItem(ALERT_PORTFOLIO_STATE_KEY) || '{}') as PortfolioMonitorState; } catch { previous = {}; }
      emitAlertCandidates(derivePortfolioAlerts(previous, payload));
      localStorage.setItem(ALERT_PORTFOLIO_STATE_KEY, JSON.stringify(portfolioState(payload)));
    } catch { /* Position background monitoring is best-effort. */ }
    finally { portfolioMonitorRef.current = false; }
  }, [savedPositions, emitAlertCandidates]);

  useEffect(() => {
    if (savedPositions.length === 0) return;
    const initial = window.setTimeout(() => { if (document.visibilityState === 'visible') void refreshPortfolioMonitor(); }, 18_000);
    const timer = window.setInterval(() => { if (document.visibilityState === 'visible') void refreshPortfolioMonitor(); }, 10 * 60 * 1000);
    return () => { window.clearTimeout(initial); window.clearInterval(timer); };
  }, [savedPositions.length, refreshPortfolioMonitor]);

  const toggleNotifications = async () => {
    if (!('Notification' in window)) { setNotificationPermission('unsupported'); return; }
    if (alertPrefsRef.current.browserNotifications) {
      localStorage.setItem('marketscope-notifications', 'disabled');
      updateAlertPreferences({ ...alertPrefsRef.current, browserNotifications: false });
      setNotificationEnabled(false);
      return;
    }
    const permission = Notification.permission === 'default' ? await Notification.requestPermission() : Notification.permission;
    setNotificationPermission(permission);
    if (permission === 'granted') {
      localStorage.setItem('marketscope-notifications', 'enabled');
      updateAlertPreferences({ ...alertPrefsRef.current, browserNotifications: true });
      setNotificationEnabled(true);
    }
  };

  const openWatchlistItem = (item: WatchlistItem) => {
    setMarket(item.market);
    setSymbol(item.symbol);
    setQuery(item.symbol);
    setInterval(item.interval);
    setStrategyProfile(item.profile);
    localStorage.setItem('marketscope-strategy-profile', item.profile);
    setNav('analyze');
  };

  const openScannerItem = (targetMarket: MarketType, targetSymbol: string, targetInterval: Interval, targetProfile: StrategyProfileKey) => {
    setMarket(targetMarket);
    setSymbol(targetSymbol);
    setQuery(targetSymbol);
    setInterval(targetInterval);
    setStrategyProfile(targetProfile);
    localStorage.setItem('marketscope-strategy-profile', targetProfile);
    setMoreOpen(false);
    setNav('analyze');
  };

  const openAlert = (alert: AlertEvent) => {
    if (alert.action === 'SCANNER') { setMoreOpen(false); setNav('scanner'); return; }
    if (alert.action === 'POSITION') {
      const saved = savedPositions.find((item) => item.market === alert.market && item.symbol === alert.symbol);
      if (saved) { openSavedPosition(saved); return; }
      if (alert.market && alert.symbol) {
        setMarket(alert.market); setSymbol(alert.symbol); setQuery(alert.symbol);
        if (alert.interval) setInterval(alert.interval);
        if (alert.profile) { setStrategyProfile(alert.profile); localStorage.setItem('marketscope-strategy-profile', alert.profile); }
      }
      setNav('positions'); return;
    }
    if (alert.market && alert.symbol) {
      setMarket(alert.market); setSymbol(alert.symbol); setQuery(alert.symbol);
      if (alert.interval) setInterval(alert.interval);
      if (alert.profile) { setStrategyProfile(alert.profile); localStorage.setItem('marketscope-strategy-profile', alert.profile); }
    }
    setMoreOpen(false); setNav('analyze');
  };

  const openAlertCenter = () => {
    if (nav !== 'alerts') alertReturnNavRef.current = nav;
    setMoreOpen(false); setNav('alerts');
  };

  const toggleCurrentWatchlist = () => {
    if (!snapshot) return;
    const item: WatchlistItem = { market, symbol: snapshot.symbol, interval, profile: strategyProfile, addedAt: new Date().toISOString() };
    const existing = watchlist.find((entry) => watchlistKey(entry) === watchlistKey(item));
    if (existing) removeWatchlistItem(existing);
    else addWatchlistItem(market, snapshot.symbol, interval, strategyProfile);
  };

  const currentWatched = snapshot ? watchlist.some((item) => watchlistKey(item) === watchlistKey({ market, symbol: snapshot.symbol, interval, profile: strategyProfile })) : false;

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
              <span className="version-badge">V0.13.0</span>
            </div>
            <span className="brand-sub">Crypto Spot • Stock VN • Forex • Alert Monitoring</span>
          </div>
        </div>
        <div className="topbar-actions">
          <button className="alert-bell-button" onClick={openAlertCenter} aria-label={`Alert Center • ${alerts.filter((item) => item.unread).length} chưa đọc`}>
            <span>🔔</span>{alerts.some((item) => item.unread) && <b>{Math.min(99, alerts.filter((item) => item.unread).length)}</b>}
          </button>
          <button className="theme-button" onClick={() => setNav('settings')} aria-label="Cài đặt giao diện">
            {dark ? '☾' : '☀'}
          </button>
        </div>
      </header>

      <section className="content">
        {nav === 'alerts' ? (
          <AlertCenterPanel
            alerts={alerts}
            preferences={alertPreferences}
            notificationPermission={notificationPermission}
            onPreferences={updateAlertPreferences}
            onToggleBrowserNotifications={() => void toggleNotifications()}
            onRead={markAlertRead}
            onReadAll={markAllAlertsRead}
            onClear={clearAlerts}
            onOpen={openAlert}
            onBack={() => setNav(alertReturnNavRef.current === 'alerts' ? 'analyze' : alertReturnNavRef.current)}
          />
        ) : nav === 'settings' ? (
          <SettingsPanel themePref={themePref} onTheme={setTheme} onBack={() => setNav('analyze')} />
        ) : nav === 'scanner' ? (
          <OpportunityScannerPanel
            defaultProfile={strategyProfile}
            onOpen={openScannerItem}
            onAddWatchlist={addWatchlistItem}
            onResults={handleScannerResults}
            onBack={() => setNav('analyze')}
          />
        ) : nav === 'watchlist' ? (
          <WatchlistPanel
            items={watchlist}
            states={watchlistStates}
            refreshing={watchlistRefreshing}
            lastRefresh={watchlistLastRefresh}
            onRefresh={() => void refreshWatchlist()}
            onAdd={addWatchlistItem}
            onOpen={openWatchlistItem}
            onRemove={removeWatchlistItem}
            notificationEnabled={notificationEnabled}
            notificationPermission={notificationPermission}
            onToggleNotifications={() => void toggleNotifications()}
            onBack={() => setNav('analyze')}
          />
        ) : nav === 'positions' ? (
          <PositionsWorkspace
            market={market}
            query={query}
            interval={interval}
            availableIntervals={availableIntervals}
            snapshot={snapshot}
            loading={loading}
            error={error}
            correlationId={correlationId}
            entryDraft={entryDraft}
            quantityDraft={quantityDraft}
            analysis={positionAnalysis}
            inputError={positionInputError}
            positions={savedPositions}
            dark={dark}
            strategyProfile={strategyProfile}
            onStrategy={(next) => { setStrategyProfile(next); localStorage.setItem('marketscope-strategy-profile', next); }}
            onMarket={(nextMarket) => {
              const next = defaults[nextMarket];
              setMarket(nextMarket); setSymbol(next.symbol); setQuery(next.symbol); setInterval(next.interval); setSuggestOpen(false);
            }}
            onQuery={(value) => { setQuery(value); setSuggestOpen(false); }}
            onSubmit={submitSymbol}
            onInterval={setInterval}
            onEntryDraft={(value) => { setEntryDraft(value); setPositionInputError(null); }}
            onQuantityDraft={(value) => { setQuantityDraft(value); setPositionInputError(null); }}
            onAnalyze={analyzePosition}
            onClear={clearCurrentPosition}
            onOpen={openSavedPosition}
            onDelete={deleteSavedPosition}
            onRetry={() => void loadMarket(market, symbol, interval)}
            onBack={() => setNav('analyze')}
          />
        ) : nav === 'history' ? (
          <ForecastHistoryPanel records={forecastHistory} currentValidation={snapshot?.forecastValidation} currentSymbol={snapshot?.symbol} onClear={clearForecastHistory} onBack={() => setNav('analyze')} />
        ) : (
          <>
            <div className="market-toggle" role="tablist" aria-label="Chọn thị trường">
              <button className={market === 'CRYPTO' ? 'active' : ''} onClick={() => switchMarket('CRYPTO')}>CRYPTO</button>
              <button className={market === 'STOCK' ? 'active' : ''} onClick={() => switchMarket('STOCK')}>STOCK VN</button>
              <button className={market === 'FOREX' ? 'active' : ''} onClick={() => switchMarket('FOREX')}>FOREX</button>
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
                    placeholder={market === 'CRYPTO' ? 'BTC, ETH, SOL…' : market === 'FOREX' ? 'EURUSD, GBPUSD, XAUUSD…' : 'FPT, VNM, HPG…'}
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
                {(recent[market].length ? recent[market] : market === 'CRYPTO' ? ['BTCUSDT','ETHUSDT','SOLUSDT'] : market === 'FOREX' ? ['EURUSD','GBPUSD','XAUUSD'] : ['FPT','VNM','HPG']).map((item) => (
                  <button key={item} onClick={() => { setQuery(item); setSymbol(item); }}>{item}</button>
                ))}
              </div>
            </section>

            <StrategyProfileSelector
              value={strategyProfile}
              strategy={snapshot?.strategy}
              market={market}
              onChange={(next) => { setStrategyProfile(next); localStorage.setItem('marketscope-strategy-profile', next); }}
            />

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
                  <div className="analyze-quick-actions">
                    <button className={currentWatched ? 'watch-toggle active' : 'watch-toggle'} onClick={toggleCurrentWatchlist}>{currentWatched ? '★ Đang theo dõi' : '☆ Thêm Watchlist'}</button>
                    <button className="position-module-link" onClick={() => setNav('positions')}>◎ Phân tích vị thế</button>
                  </div>
                  {snapshot.warning && <div className="warning-box">⚠ {snapshot.warning}</div>}
                </>
              ) : null}
            </section>

            {!loading && snapshot?.signal && <SignalPanel signal={snapshot.signal} snapshot={snapshot} />}
            {!loading && snapshot?.forecast && <ForecastPanel forecast={snapshot.forecast} validation={snapshot.forecastValidation} snapshot={snapshot} />}
            <section className="analysis-details-card"><div className="section-title-row"><div><h2>Phân tích chuyên sâu</h2><span>Giữ đầy đủ thông tin nhưng gom theo nhóm để dễ đọc</span></div></div>
              {!loading && snapshot?.analysis && <details open className="analysis-group"><summary>Chỉ báo kỹ thuật & Market Regime</summary><TechnicalAnalysisPanel analysis={snapshot.analysis} snapshot={snapshot} /></details>}
              {!loading && snapshot?.backtest && <details className="analysis-group"><summary>Backtest & Calibration</summary><BacktestPanel backtest={snapshot.backtest} snapshot={snapshot} /></details>}
              {!loading && snapshot?.quality && <details className="analysis-group"><summary>Chất lượng dữ liệu & Provider</summary><DataQualityPanel quality={snapshot.quality} provider={snapshot.providerDiagnostics} compact={false} /></details>}
            </section>

            <section className="chart-card">
              <div className="section-title-row">
                <div><h2>Biểu đồ giá</h2><span>Candlestick + Volume + Indicator + Signal</span></div>
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
              </div>
              {loading ? <div className="chart-loading"><div className="pulse" /></div> : snapshot ? <MarketChart candles={snapshot.candles} analysis={snapshot.analysis} signal={snapshot.signal} position={null} overlays={overlays} dark={dark} currency={snapshot.currency} /> : <div className="chart-empty">Không có dữ liệu chart</div>}
            </section>

            <section className="roadmap-card">
              <div className="roadmap-icon">↗</div>
              <div>
                <strong>V0.13.0 • Alert Center & Opportunity Monitoring</strong>
                <p>Gom thay đổi Signal, Entry/TP/SL, Forecast, Scanner Opportunity, Positions và Data Quality vào một trung tâm cảnh báo có dedupe/cooldown.</p>
              </div>
            </section>

            <p className="disclaimer">MarketScope V0.13.0: Alert Center chỉ ưu tiên sự kiện cần chú ý, không thay thế quyết định giao dịch. Monitoring chạy khi app/PWA còn session hoạt động; Crypto giữ Spot/LONG-only không leverage.</p>
          </>
        )}
      </section>

      {moreOpen && <MoreSheet
        onClose={() => setMoreOpen(false)}
        onHistory={() => { setMoreOpen(false); setNav('history'); }}
        onSettings={() => { setMoreOpen(false); setNav('settings'); }}
      />}

      <nav className="bottom-nav" aria-label="Điều hướng chính">
        <NavButton active={nav === 'analyze'} icon="⌁" label="Analyze" onClick={() => { setMoreOpen(false); setNav('analyze'); }} />
        <NavButton active={nav === 'scanner'} icon="⌕" label="Scanner" onClick={() => { setMoreOpen(false); setNav('scanner'); }} />
        <NavButton active={nav === 'watchlist'} icon="☆" label="Watchlist" onClick={() => { setMoreOpen(false); setNav('watchlist'); }} />
        <NavButton active={nav === 'positions'} icon="◎" label="Positions" onClick={() => { setMoreOpen(false); setNav('positions'); }} />
        <NavButton active={moreOpen || nav === 'history' || nav === 'settings'} icon="•••" label="Thêm" onClick={() => setMoreOpen((value) => !value)} />
      </nav>
    </main>
  );
}

function MoreSheet({ onClose, onHistory, onSettings }: { onClose: () => void; onHistory: () => void; onSettings: () => void }) {
  return (
    <div className="more-sheet-backdrop" onClick={onClose}>
      <section className="more-sheet" onClick={(event) => event.stopPropagation()} aria-label="Thêm chức năng">
        <div className="more-sheet-handle" />
        <div className="more-sheet-head"><strong>Thêm</strong><button onClick={onClose} aria-label="Đóng">×</button></div>
        <button className="more-sheet-item" onClick={onHistory}><span>◷</span><div><strong>History</strong><small>Forecast History & Historical Accuracy</small></div><b>›</b></button>
        <button className="more-sheet-item" onClick={onSettings}><span>⚙</span><div><strong>Settings</strong><small>Theme, Provider Health & Diagnostics</small></div><b>›</b></button>
      </section>
    </div>
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
      <div className="panel-heading"><h1>Settings</h1><p>Cấu hình MarketScope V0.13.0 • Alert Center • Opportunity Monitoring • Forex.</p></div>
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
      <SystemHealthPanel />
      <div className="settings-card">
        <strong>Market data providers</strong>
        <p><b>Crypto:</b> Binance public market data — không cần API key.</p>
        <p><b>Stock VN:</b> ưu tiên SSI FastConnect khi cấu hình server env; fallback giúp preview khi chưa có SSI.</p><p><b>Forex:</b> Yahoo FX/Metals cho EURUSD, GBPUSD, USDJPY, XAUUSD và các cặp phổ biến.</p>
      </div>
      <div className="settings-card">
        <strong>Watchlist notifications</strong>
        <p>Browser notification dùng chung với Alert Center. Watchlist quét khoảng 5 phút/lần; Opportunity + Positions khoảng 10 phút/lần khi app đang visible. Chưa phải cloud push 24/7 khi app đóng hoàn toàn.</p>
      </div>
      <div className="settings-card muted-card">
        <strong>Phiên bản</strong>
        <p>MarketScope V0.13.0 — Alert Center & Opportunity Monitoring • Mobile-first UX.</p>
      </div>
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

function parseQuantity(value: string) {
  const normalized = value.trim().replace(/\s/g, '').replace(',', '.');
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : Number.NaN;
}
