# Changelog

## V0.9.0 — Strategy Profiles & Smart Analysis

### Added
- Strategy Profile: `AUTO`, `SHORT_TERM`, `SWING`, `MEDIUM_TERM`, `LONG_TERM`.
- Smart Analysis đề xuất effective profile từ timeframe + regime + ADX + ATR + RSI.
- Timeframe-fit, holding guide, confidence và rationale trên Analyze.
- Profile-aware Signal Engine: weights, BUY threshold, Entry Zone, SL, TP1–TP3, chase guard.
- Profile-aware Position Exit Planner: protection, trailing và Exit S/M/L.
- Profile-aware Backtest/Calibration; cùng một backtest không trộn horizon.
- Watchlist lưu profile riêng cho từng mã/timeframe.
- Positions khóa effective profile tại lúc lưu vị thế.
- Strategy Engine self-test trong System Health.

### Migration
- Position V0.8 trở về trước thiếu profile → `SWING`.
- Watchlist V0.8 trở về trước thiếu profile → `SWING`.
- `quantity` legacy vẫn giữ migration an toàn từ V0.7.

### Guardrails
- Spot-only / LONG-only / no leverage / no auto trade.
- Data Quality Guard tiếp tục có quyền khóa Signal dù Strategy Engine đang bullish.
- Signal Score không được hiển thị như win-rate.

### Changed
- Package version `0.9.0`.
- PWA cache `marketscope-shell-v0.9.0`.
- Metadata/manifest/health version cập nhật V0.9.0.
