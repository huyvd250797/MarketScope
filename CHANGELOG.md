# Changelog

## V0.5.0 — Backtest & Win-rate Calibration

Nâng trực tiếp từ V0.4.0 theo roadmap.

### Added

- Backtest Engine không look-ahead.
- Warm-up 220 candles; history guard tối thiểu 280 candles.
- Entry fill simulation sau signal; no-fill tracking.
- Conservative same-candle rule: SL ưu tiên trước TP.
- Sequential/non-overlapping benchmark trades.
- TP1-before-SL benchmark: WIN / LOSS / TIMEOUT.
- Raw Win Rate + Beta(2,2) Calibrated Win Rate.
- Expectancy R, Profit Factor, Max Drawdown R.
- Resolution Rate, Average Bars Held, Median Bars to TP1.
- TP1 / TP2 / TP3 reach statistics.
- 25% recent validation window.
- Calibration cohort theo Setup + Regime + Score Band với fallback khi thiếu sample.
- Calibration quality: INSUFFICIENT / LOW / MEDIUM / HIGH.
- Time-to-TP1 historical estimate.
- Backtest UI + recent simulated trades + methodology details.
- Không gán probability cho WAIT / AVOID.

### Performance

- Refactor Technical Engine: precompute causal indicator series một lần.
- Backtest sử dụng `analyzeTechnicalAt()` thay vì recompute toàn bộ indicator ở mỗi candle.
- Synthetic 1.000-candle backtest smoke test đạt khoảng 0,25–0,35 giây trong sandbox sau tối ưu.

### Data history

- Binance snapshot tăng Kline limit từ 500 lên 1.000.
- Yahoo Stock daily range tăng lên 3y.
- Yahoo Stock weekly range tăng lên 10y.
- SSI requested date window mở rộng cho daily/weekly nhưng dữ liệu thực tế vẫn phụ thuộc giới hạn provider/API.

### Kept

- Market Data & Mobile Shell.
- Indicator & Market Regime.
- Entry / SL / TP Signal Engine.
- Position / Exit Analysis.
- PWA / Dark / Light / Auto.

### Next

- V0.6.0 — Watchlist / Signal Monitoring theo roadmap hiện tại của UI.
