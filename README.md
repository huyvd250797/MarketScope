# MarketScope V0.6.0 — Watchlist & Signal Monitoring

V0.6.0 được nâng trực tiếp từ V0.5.0 theo roadmap. Phiên bản này giữ toàn bộ Market Data, Technical Analysis, Entry/SL/TP, Position/Exit và Backtest/Calibration; bổ sung **Watchlist & Signal Monitoring** và đồng thời tách **Position / Exit Planner** ra khỏi màn Analyze để dashboard gọn, dễ đọc hơn trên mobile.

## Version history

- **V0.1.0 — Market Data & Mobile Shell:** hoàn thành.
- **V0.2.0 — Technical Analysis Core:** hoàn thành.
- **V0.3.0 — Entry Analyzer:** hoàn thành.
- **V0.4.0 — Position & Exit Planner:** hoàn thành.
- **V0.5.0 — Backtest & Probability Calibration:** hoàn thành.
- **V0.6.0 — Watchlist & Signal Monitoring:** phiên bản hiện tại.
- **V0.7.0 — Futures 1x Analytics:** phiên bản tiếp theo theo roadmap gốc.

## 1. Watchlist nhiều mã / timeframe

Watchlist lưu cục bộ trên thiết bị bằng `localStorage`.

Mỗi item gồm:

- Market: `CRYPTO` / `STOCK`;
- Symbol;
- Timeframe;
- thời điểm thêm.

Giới hạn mặc định: **12 mã/timeframe** để tránh tạo quá nhiều request/backtest cùng lúc trên Vercel.

Có thể thêm mã theo hai cách:

1. từ Analyze → `☆ Thêm Watchlist`;
2. trực tiếp trong module Watchlist.

## 2. Compact Monitor API

Endpoint mới:

```text
GET /api/market/monitor?market=CRYPTO&symbol=BTCUSDT&interval=1h
```

Endpoint vẫn dùng cùng Technical / Signal / Backtest Engine nhưng chỉ trả payload cần cho monitoring:

- giá hiện tại + % thay đổi;
- Market Regime;
- BUY / WAIT / AVOID;
- Signal Score;
- Setup;
- Entry Zone / SL / targets;
- calibrated rate + quality + sample;
- Expectancy / Profit Factor;
- estimated time-to-TP1.

Không trả toàn bộ candle/indicator series nên payload nhẹ hơn `/api/market/candles`.

## 3. Signal Monitoring

Watchlist hiển thị tổng quan:

- số mã đang theo dõi;
- số `BUY`;
- số `WAIT`;
- số `AVOID`.

Mỗi card hiển thị:

- giá + % thay đổi;
- Signal Score;
- Market Regime;
- calibrated hit-rate nếu đủ mẫu;
- số mẫu resolved;
- Entry Zone;
- TP1;
- setup hiện tại.

Watchlist được refresh:

- ngay khi mở module;
- bằng nút `Cập nhật`;
- tự động mỗi **5 phút** khi tab Watchlist đang mở và trang đang visible.

Request được chạy theo batch tối đa 3 item cùng lúc để giảm tải burst lên provider/Vercel.

## 4. Alert triggers

V0.6.0 nhận diện các trigger trực tiếp từ snapshot monitoring:

- giá đang nằm trong `Entry Zone`;
- BUY signal với `Signal Score >= 70`;
- chạm/phá `SL`;
- đạt `TP1 / TP2 / TP3`.

Các trigger đang active được hiển thị ngay trên watch card.

### Browser/PWA notification

Người dùng có thể bấm `Bật thông báo` trong Watchlist.

Khi permission được cấp, MarketScope dùng Service Worker để show notification cho trigger mới và dedupe theo mã/timeframe, tránh lặp cùng một cảnh báo ở mỗi lần refresh.

**Giới hạn V0.6.0:** trình duyệt chỉ có thể phát hiện trigger khi app đang thực hiện monitoring. Bản này chưa mặc định cấu hình cloud scheduler/Web Push server/email để kiểm tra 24/7 khi app hoàn toàn đóng. Phần hạ tầng background alert cần persistent storage + scheduled worker/provider notification và nên được harden riêng trước production.

## 5. Analyze được dọn gọn

Theo yêu cầu UX, **Position / Exit Planner không còn nằm trong Analyze**.

Analyze tập trung vào câu hỏi:

> Mã này hiện tại có đáng vào lệnh không?

Thứ tự chính:

1. Market + Symbol;
2. Current Snapshot;
3. Entry / SL / TP Signal;
4. Backtest confidence dạng compact;
5. Technical / Market Regime;
6. Chart.

Từ snapshot có hai quick action:

- `☆ Thêm Watchlist`;
- `◎ Phân tích vị thế` → chuyển sang Positions.

## 6. Backtest card dạng compact

Card Backtest trên Analyze được rút gọn thành:

- calibrated hit-rate hiện tại;
- độ tin cậy;
- số mẫu;
- Expectancy;
- Profit Factor;
- validation calibrated rate.

Các thống kê chi tiết như Raw Win Rate, Full Backtest, Validation Window, TP reach, Max DD, recent simulated trades và Methodology được chuyển vào:

```text
Xem chi tiết Backtest & Calibration
```

Điều này giảm đáng kể chiều dài dashboard mobile.

## 7. Positions trở thành module độc lập

Module `Positions` hiện chứa toàn bộ chức năng sau khi đã mua:

- danh sách vị thế đã lưu;
- chọn Crypto / Stock;
- nhập mã;
- chọn timeframe;
- nhập / cập nhật giá vốn;
- P/L hiện tại;
- HOLD / PROTECT PROFIT / TAKE PARTIAL / REDUCE RISK / EXIT RISK;
- Defensive Stop / Protect level;
- trailing reference;
- target ngắn / trung / dài hạn;
- lý do giữ / cảnh báo;
- chart riêng với:
  - `ENTRY ACT`;
  - `PROTECT / POS STOP`;
  - `EXIT S / EXIT M / EXIT L`.

Giá vốn vẫn lưu bằng `localStorage`, tối đa 30 mã.

## 8. Kế thừa V0.1.0–V0.5.0

- Binance public Crypto Spot data.
- SSI FastConnect + Stock fallback.
- Candlestick + Volume.
- EMA20/50/200, RSI14, MACD, ADX14, ATR14, VWAP.
- Market Structure + Market Regime.
- BUY / WAIT / AVOID.
- Signal Score 0–100.
- Entry Zone / SL / TP1–TP3 / R:R.
- Position / Exit Engine.
- Backtest không look-ahead.
- Beta(2,2) calibration.
- Expectancy / Profit Factor / Max DD.
- Validation window.
- PWA + Dark / Light / Auto.

## 9. Guardrails

- LONG-only trong flow hiện tại.
- Không auto trade.
- Không khuyến nghị leverage.
- Signal Score không phải win probability.
- Calibrated rate không hiện nổi bật khi thiếu sample.
- WAIT / AVOID không được gán probability thắng.
- Browser notification là hỗ trợ monitoring, không phải cam kết trigger realtime tuyệt đối.
- Market data stale/provider error không được coi như signal mới.

## Chạy local

```bash
npm install
cp .env.example .env.local
npm run dev
```

## Kiểm tra

```bash
npm run typecheck
npm run build
```

## Deploy Vercel

1. Push source lên GitHub.
2. Import repo vào Vercel.
3. Framework Preset: `Next.js`.
4. Build/Install command: Default.
5. **Output Directory: để trống. Không nhập `out`.**
6. Crypto chạy bằng public Binance data.
7. Stock VN: thêm SSI env nếu muốn dùng SSI provider chính.

Xem thêm `DEPLOY-VERCEL.md`.

## Roadmap tiếp theo

Theo tài liệu kế hoạch gốc:

**V0.7.0 — Futures 1x Analytics**

- Crypto perpetual market adapter;
- funding rate / Open Interest;
- lựa chọn Spot / Futures;
- phân tích LONG / SHORT cho futures;
- risk guardrails;
- không auto trade và không khuyến nghị leverage.
