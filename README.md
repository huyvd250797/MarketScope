# MarketScope V0.4.0 — Position / Exit Analysis

V0.4.0 được nâng trực tiếp từ V0.3.0 theo đúng roadmap. Phiên bản này giữ toàn bộ Market Data, Indicator/Market Regime và Entry/SL/TP Signal Engine, đồng thời bổ sung **Position / Exit Planner** cho trường hợp người dùng đã vào lệnh và muốn quản trị điểm thoát/chốt lời.

## Version history

- **V0.1.0 — Market Data & Mobile Shell:** hoàn thành.
- **V0.2.0 — Indicator & Market Regime Engine:** hoàn thành.
- **V0.3.0 — Entry / SL / TP Signal Engine:** hoàn thành.
- **V0.4.0 — Position / Exit Analysis:** phiên bản hiện tại.
- **V0.5.0 — Backtest & Win-rate Calibration:** phiên bản tiếp theo theo roadmap.

## Chức năng mới V0.4.0

### 1. Nhập giá đã vào lệnh

Trong màn hình Analyze, sau khi tải dữ liệu của mã:

- nhập **Giá đã vào lệnh**;
- bấm **Phân tích vị thế**;
- giá vốn được lưu bằng `localStorage` theo `market + symbol`;
- khi quay lại mã đã lưu, MarketScope tự khôi phục giá vốn;
- tab **Positions** hiển thị tối đa 30 vị thế đã lưu trên thiết bị.

V0.4.0 chưa có account/cloud sync. Dữ liệu vị thế không được gửi sang dịch vụ bên thứ ba.

### 2. Position status + P/L

Exit Planner tính:

- giá vốn;
- giá hiện tại;
- P/L %;
- P/L trên mỗi đơn vị;
- trạng thái `PROFIT / NEAR_ENTRY / LOSS / RISK`.

### 3. Rule-based action

Engine có thể trả:

- `HOLD / THEO DÕI`;
- `BẢO VỆ LỢI NHUẬN`;
- `CÂN NHẮC CHỐT MỘT PHẦN`;
- `GIẢM RỦI RO / ĐÁNH GIÁ LẠI`;
- `MỐC RỦI RO ĐÃ BỊ PHÁ`.

Các trạng thái được xác định từ P/L, ATR, EMA/VWAP, support/resistance, Market Regime và Market Structure. Đây là rule-based analysis, không phải lệnh giao dịch tự động.

### 4. Mốc bảo vệ vị thế

Position Engine tạo:

- Defensive Stop / Protect level;
- Break-even reference;
- Trailing reference từ EMA20/VWAP/Support/EMA50;
- risk % từ giá vốn khi stop còn dưới entry;
- locked profit % khi vị thế đã đủ lãi để nâng protect level trên giá vốn.

Nếu giá hiện tại đã phá mốc bảo vệ, engine ưu tiên cảnh báo `EXIT_RISK` thay vì mặc định tiếp tục HOLD.

### 5. Exit Planner ngắn / trung / dài hạn

Tạo 3 mốc:

- **Ngắn hạn**;
- **Trung hạn**;
- **Dài hạn**.

Target dùng ATR kết hợp pivot/kháng cự gần nhất. Mỗi target hiển thị:

- target price;
- % từ giá vốn;
- % còn cách giá hiện tại;
- horizon planning tương ứng timeframe.

Horizon chỉ là **khung lập kế hoạch**, không phải ETA chắc chắn để giá chạm mục tiêu.

### 6. Chart Position Overlay

Chart có toggle `POSITION` riêng, hiển thị:

- `ENTRY ACT` — giá đã mua;
- `POS STOP` hoặc `PROTECT`;
- `EXIT S` — ngắn hạn;
- `EXIT M` — trung hạn;
- `EXIT L` — dài hạn.

Overlay Position tách biệt với `ENTRY/SL/TP` của Signal Engine V0.3.0.

## Kế thừa V0.1.0–V0.3.0

- Toggle Crypto / Stock VN.
- Binance public crypto market data.
- SSI FastConnect + stock fallback architecture.
- Candlestick + Volume.
- EMA20/50/200, RSI14, MACD, ADX14, ATR14, VWAP.
- Market Structure + Market Regime.
- `BUY / WAIT / AVOID`.
- Signal Score 0–100.
- Entry Zone, Stop Loss, Invalidation, TP1–TP3, R:R.
- PWA, mobile-first, Dark / Light / Auto.
- Autocomplete, recent symbols.

## Guardrails V0.4.0

- LONG-only; không tạo SHORT.
- Không khuyến nghị leverage.
- Không auto trade.
- Không tự quyết định tỷ trọng bán ở từng target vì V0.4.0 chưa có portfolio sizing.
- Không hiển thị win rate / probability / expectancy giả.
- Signal Score không phải xác suất thắng.
- Time horizon không phải dự đoán time-to-target.
- **V0.5.0** mới bổ sung backtest, calibration, win-rate và expectancy theo setup/timeframe/regime.

## Chạy local

```bash
npm install
cp .env.example .env.local
npm run dev
```

Mở `http://localhost:3000`.

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
6. Crypto dùng được không cần API key.
7. Stock VN: cấu hình SSI trong Vercel Environment Variables nếu muốn provider chính.

Xem thêm `DEPLOY-VERCEL.md`.

## Lưu ý tài chính

MarketScope là công cụ phân tích kỹ thuật tự động. Signal, Entry, SL, TP, Protect level và Exit targets là kết quả rule-based trên dữ liệu OHLCV và giá vốn người dùng nhập. Không có target nào đảm bảo lợi nhuận. Người dùng phải tự đánh giá rủi ro và tính phù hợp trước khi giao dịch.
