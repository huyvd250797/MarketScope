# Changelog

## V0.2.0 — Indicator & Market Regime Engine

Nâng cấp từ V0.1.0 theo đúng roadmap.

### Added

- Server-side Technical Analysis Engine.
- EMA 20 / EMA 50 / EMA 200.
- RSI 14.
- MACD 12-26-9.
- ADX 14, +DI, -DI.
- ATR 14 và ATR %.
- Daily-anchored VWAP cho intraday; rolling VWAP 20 cho daily/weekly.
- Market Structure: HH/HL, LH/LL, Range, Unconfirmed.
- Market Regime: Strong Uptrend, Uptrend, Range, Downtrend, Strong Downtrend, Volatile.
- Regime Confidence 25–95 theo mức đồng thuận kỹ thuật; không phải xác suất thắng.
- Technical Analysis card tối ưu mobile.
- EMA/VWAP overlay toggle trên candlestick chart.

### Preserved

- Binance public crypto market data.
- SSI FastConnect / Stock VN fallback architecture.
- PWA, Dark/Light/Auto, autocomplete, recent symbols.
- Standard Next.js Vercel deploy; không static export / không `out`.

### Not included yet

- Entry Zone / Invalidation / Stop Loss / TP1–TP3 / BUY-WAIT-AVOID: V0.3.0.
- Position Exit Planner: V0.4.0.
- Backtest / Win Probability / Expectancy / Time-to-target: V0.5.0.
