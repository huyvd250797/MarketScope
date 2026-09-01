# MarketScope V0.11.0 — Forecast Validation & Historical Accuracy

MarketScope là web app mobile-first phân tích **Crypto Spot**, **Stock VN** và **Forex/Metals**. V0.11.0 nâng trực tiếp từ V0.10.0 và giữ nguyên Technical Analysis, Strategy Profiles, Entry/SL/TP, Position/Exit, Backtest Calibration, Watchlist, Portfolio Risk, Data Quality Guard và Multi-horizon Forecast.

## Điểm mới V0.11.0

### 1. Rolling Forecast Validation
Mỗi lần Analyze, nếu dữ liệu đủ chuẩn, server chạy rolling validation causal trên lịch sử của đúng:

- market
- symbol
- timeframe
- effective Strategy Profile

Mỗi forecast lịch sử chỉ sử dụng dữ liệu có tại origin, không nhìn nến tương lai. Sau đó hệ thống đối chiếu giá thật ở đúng horizon.

Các metric mới:

- Direction Accuracy
- Beta(2,2) calibrated Direction Accuracy
- Range Hit Rate
- Average Absolute Forecast Error
- Median Absolute Forecast Error
- Raw Probability trung bình
- Calibration Gap
- Sample count theo SHORT / MEDIUM / LONG

### 2. Forecast Confidence Calibration
Forecast hiện giữ cả:

- Raw confidence
- Calibrated confidence
- Raw directional probability
- Calibrated directional probability theo từng horizon

Khi mẫu ít, historical accuracy được shrink về 50% để tránh hiển thị xác suất quá đẹp từ vài mẫu nhỏ.

### 3. History trở thành module thật
Tab **History** không còn Coming Soon.

Forecast người dùng thực sự xem được lưu local trên thiết bị và gồm:

- mã / market / timeframe
- Strategy Profile
- origin price/time
- bias + confidence
- forecast ngắn / trung / dài
- expected price
- probability range

Khi app tải lại đúng mã + timeframe và đã có đủ nến tương lai, record tự resolve thành:

- đúng/sai hướng
- giá thực tế
- range hit/miss
- forecast error

History có thống kê tổng và tách riêng SHORT / MEDIUM / LONG.

## Guardrails

- Historical accuracy không phải cam kết forecast tiếp theo sẽ đúng.
- Forecast Validation chỉ so sánh trong cùng mã/timeframe/profile.
- Data Quality Guard vẫn có quyền khóa phân tích/tín hiệu.
- Crypto vẫn Spot-only, không Futures/leverage.
- Forecast History hiện lưu localStorage, chưa cloud sync.

## Market Data

- Crypto Spot: Binance public API.
- Stock VN: SSI FastConnect khi có credentials; fallback provider theo cấu hình hiện có.
- Forex/Metals: Yahoo FX/Metals adapter, gồm EURUSD, GBPUSD, USDJPY, XAUUSD, XAGUSD và các cặp phổ biến.

## Chạy local

```bash
npm install
npm run dev
```

Kiểm tra production:

```bash
npm run typecheck
npm run build
```

## Deploy Vercel

Framework: Next.js. Không cấu hình `output: "export"`. **Output Directory để trống**.

Xem thêm `DEPLOY-VERCEL.md` và `VALIDATION.md`.
