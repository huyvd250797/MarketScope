# Changelog

## V0.6.0 — Watchlist & Signal Monitoring

Nâng trực tiếp từ V0.5.0 theo roadmap.

### Added

- Watchlist localStorage tối đa 12 symbol/timeframe.
- Add/remove Watchlist từ Analyze hoặc Watchlist module.
- Compact monitoring endpoint `/api/market/monitor`.
- BUY / WAIT / AVOID multi-symbol monitoring.
- Market Regime, Signal Score, calibrated rate, sample, Entry Zone và TP1 trong watch cards.
- Summary BUY / WAIT / AVOID.
- Manual refresh + auto refresh 5 phút khi Watchlist active.
- Batch concurrency 3 để giảm provider/server burst.
- Alert state cho Entry Zone, BUY score >= 70, SL và TP1–TP3.
- Browser/PWA notifications opt-in với Service Worker.
- Notification dedupe per symbol/timeframe.

### UX / Refactor

- Di chuyển toàn bộ Position / Exit Planner khỏi Analyze sang module Positions.
- Positions có asset selector, saved positions, P/L/Exit Planner và chart riêng.
- Analyze chỉ giữ pre-entry analysis.
- Backtest card chuyển thành compact summary; thống kê sâu nằm trong expandable details.

### Kept

- V0.1–V0.5 market data, indicators, regime, signal, position engine và backtest calibration.

### Next

- V0.7.0 — Futures 1x Analytics theo roadmap gốc.
