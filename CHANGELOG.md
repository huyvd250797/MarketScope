# Changelog

## V0.10.0 — Strategy Profiles & Smart Analysis

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
- Package version `0.10.0`.
- PWA cache `marketscope-shell-v0.10.0`.
- Metadata/manifest/health version cập nhật V0.10.0.

## V0.10.0 – Forex & Multi-horizon Forecast UX
- Thêm asset class FOREX với EURUSD, GBPUSD, USDJPY, USDCHF, AUDUSD, NZDUSD, USDCAD, EURJPY, EURGBP, GBPJPY, AUDJPY.
- Thêm XAUUSD/XAGUSD trong nhóm Metals để phân tích vàng/bạc mà không dùng Binance Futures.
- Forex provider độc lập, hỗ trợ 15m/1h/4h/1D/1W; 4h được aggregate từ dữ liệu 1h.
- Thêm Forecast Engine theo 3 horizon: ngắn/trung/dài hạn, trả direction, expected price, uncertainty range, probability và drivers.
- Forecast là scenario-based, causal, không cam kết tương lai và không thay thế Entry/SL/TP guardrails.
- Tái cấu trúc Analyze: Signal + Forecast ưu tiên; Technical/Backtest/Data Quality gom trong Phân tích chuyên sâu dạng accordion, không loại bỏ thông tin.
- Watchlist và Positions hỗ trợ FOREX.
- Data Quality hiểu đặc thù Forex không có centralized volume; VWAP dùng equal-weight typical-price proxy.
