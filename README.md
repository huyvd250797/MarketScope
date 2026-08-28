# MarketScope V0.5.0 — Backtest & Win-rate Calibration

V0.5.0 được nâng trực tiếp từ V0.4.0 theo đúng roadmap. Phiên bản này giữ toàn bộ Market Data, Indicator/Market Regime, Entry/SL/TP Signal Engine và Position/Exit Planner, đồng thời bổ sung **Backtest & Calibration Engine** để kiểm chứng tín hiệu bằng dữ liệu lịch sử của chính mã + timeframe đang xem.

## Version history

- **V0.1.0 — Market Data & Mobile Shell:** hoàn thành.
- **V0.2.0 — Indicator & Market Regime Engine:** hoàn thành.
- **V0.3.0 — Entry / SL / TP Signal Engine:** hoàn thành.
- **V0.4.0 — Position / Exit Analysis:** hoàn thành.
- **V0.5.0 — Backtest & Win-rate Calibration:** phiên bản hiện tại.
- **V0.6.0 — Watchlist / Signal Monitoring:** phiên bản tiếp theo theo roadmap hiện tại của UI.

## Chức năng mới V0.5.0

### 1. Backtest không look-ahead

Engine duyệt lịch sử theo thời gian. Tại mỗi điểm đánh giá:

- chỉ sử dụng dữ liệu đã tồn tại tới nến đó;
- technical indicators được precompute theo công thức causal;
- regime/structure tại nến lịch sử chỉ sử dụng dữ liệu quá khứ;
- Signal Engine V0.3.0 được chạy lại với chính rule hiện tại;
- nến mới nhất đang có khả năng chưa đóng bị loại khỏi phần backtest lịch sử.

Không lấy kết quả tương lai để quyết định tín hiệu ở quá khứ.

### 2. Warm-up và dữ liệu tối thiểu

- warm-up: **220 nến** để EMA200 và indicator đủ ổn định;
- backtest bắt đầu khi lịch sử đủ tối thiểu **280 nến**;
- Crypto Binance tải tối đa 1.000 nến cho snapshot hiện tại;
- Yahoo Stock fallback tăng history daily/weekly để phục vụ backtest;
- SSI vẫn dùng history do provider trả về và có thể khác nhau theo timeframe.

Nếu thiếu dữ liệu, UI hiển thị `INSUFFICIENT HISTORY` thay vì tạo win rate giả.

### 3. Mô phỏng Entry thực tế hơn

BUY signal không tự động được tính là một giao dịch.

Sau signal:

- Entry Zone phải được giá chạm trong số nến chờ quy định theo timeframe;
- nếu không chạm Entry → `NO FILL`;
- fill dùng giá bảo thủ trong Entry Zone;
- không backfill lệnh vào chính nến đã phát sinh signal.

### 4. Quy tắc TP1-before-SL benchmark

Benchmark chính của V0.5.0:

- **WIN:** TP1 được chạm trước SL;
- **LOSS:** SL bị chạm trước TP1;
- **TIMEOUT:** hết horizon mà chưa chạm TP1 hoặc SL.

Do dữ liệu OHLC không cho biết thứ tự tick trong một nến, nếu **SL và TP cùng nằm trong range của cùng một nến**, engine ưu tiên **SL** để giảm optimistic bias.

### 5. Không chồng giao dịch benchmark

Sau khi một BUY được fill, engine không tạo thêm benchmark trade chồng lên trade đó cho tới khi benchmark trade đã kết thúc ở:

- TP1;
- SL;
- hoặc TIMEOUT.

Điều này hạn chế việc một xu hướng kéo dài tạo hàng loạt BUY gần giống nhau và làm phóng đại sample size.

### 6. Backtest metrics

UI hiển thị:

- Filled Trades;
- No-fill Signals;
- Wins / Losses / Timeouts;
- Raw Win Rate;
- Calibrated Win Rate;
- Resolution Rate;
- Expectancy theo `R / trade`;
- Profit Factor;
- Max Drawdown theo R;
- Average Bars Held;
- Median Bars to TP1;
- TP1 / TP2 / TP3 reach rate.

**TP1** là benchmark exit. TP2/TP3 reach rate chỉ là thống kê price excursion sau fill trước khi SL/timeout xảy ra, không phải lợi nhuận realized của benchmark TP1.

### 7. Validation window

25% phần lịch sử gần nhất được tách ra và hiển thị riêng như **validation window**.

UI so sánh thống kê lịch sử chung với validation gần đây để phát hiện trường hợp:

- win rate toàn bộ cao nhưng dữ liệu gần đây xuống mạnh;
- regime thị trường thay đổi;
- strategy mất ổn định theo thời gian.

### 8. Calibration cho tín hiệu hiện tại

Calibration cohort được chọn theo thứ tự ưu tiên:

1. Setup + Market Regime + Signal Score band;
2. Setup + Market Regime;
3. Setup;
4. tất cả BUY lịch sử của mã/timeframe.

Engine chỉ dùng cohort hẹp hơn khi đủ số mẫu resolved tối thiểu. Nếu không đủ, tự fallback sang cohort rộng hơn.

### 9. Calibrated Win Rate

Raw Win Rate không được hiển thị như xác suất chắc thắng.

V0.5.0 dùng **Beta(2,2) shrinkage**:

```text
Calibrated Win Rate = (Wins + 2) / (Resolved Trades + 4)
```

Mục đích:

- kéo kết quả của sample nhỏ về gần 50%;
- hạn chế trường hợp 3/3 trade lịch sử bị hiển thị thành “100% win rate”;
- sample càng lớn thì calibrated rate càng gần raw rate.

### 10. Calibration confidence

Các mức:

- `INSUFFICIENT` — chưa đủ mẫu;
- `LOW` — có mẫu nhưng yếu;
- `MEDIUM` — sample và validation tương đối dùng được;
- `HIGH` — sample đủ lớn, validation đủ, expectancy dương và stability gap thấp.

Confidence này đánh giá **độ tin cậy của thống kê backtest**, không phải mức chắc chắn lệnh sẽ thắng.

### 11. Chỉ gán calibration cho BUY

Nếu current signal là:

- `BUY` → có thể hiển thị calibrated hit-rate nếu có sample;
- `WAIT` → không gán “xác suất thắng” cho một lệnh chưa đủ điều kiện;
- `AVOID` → không gán xác suất thắng.

Backtest baseline vẫn được hiển thị để người dùng đánh giá Signal Engine.

### 12. Time-to-TP1 tham khảo

Khi có đủ winner samples, MarketScope tính median số nến để TP1 và quy đổi ra khung thời gian tham khảo theo timeframe hiện tại.

Ví dụ:

```text
1h × median 13 bars → khoảng 13 giờ
1d × median 7 bars  → khoảng 7 ngày
```

Đây là thống kê lịch sử, **không phải ETA chắc chắn**.

## Performance optimization V0.5.0

Indicator series được precompute một lần cho lịch sử:

- EMA20/50/200;
- RSI14;
- MACD;
- ADX/+DI/-DI;
- ATR14;
- VWAP.

Sau đó backtest chỉ đọc giá trị causal tại từng index thay vì tính lại toàn bộ indicator từ đầu ở mỗi nến.

Smoke test synthetic ~1.000 nến trong sandbox giảm từ khoảng 26 giây của cách recompute-naive xuống khoảng 0,25–0,35 giây cho Backtest Engine sau tối ưu.

## Kế thừa V0.1.0–V0.4.0

- Toggle Crypto / Stock VN.
- Binance public crypto market data.
- SSI FastConnect + Yahoo stock fallback architecture.
- Candlestick + Volume.
- EMA20/50/200, RSI14, MACD, ADX14, ATR14, VWAP.
- Market Structure + Market Regime.
- `BUY / WAIT / AVOID`.
- Signal Score 0–100.
- Entry Zone, Stop Loss, Invalidation, TP1–TP3, R:R.
- Nhập giá đã mua.
- P/L và Position Status.
- Protect / Defensive Stop.
- Exit targets ngắn / trung / dài hạn.
- Positions localStorage.
- Chart overlays Signal + Position.
- PWA, mobile-first, Dark / Light / Auto.

## Guardrails V0.5.0

- LONG-only; không tạo SHORT.
- Không khuyến nghị leverage.
- Không auto trade.
- Không kết nối API đặt lệnh.
- Không dùng Signal Score làm win probability.
- Không hiển thị calibrated probability cho WAIT/AVOID.
- Không che giấu sample size, timeout hoặc no-fill.
- Backtest chưa mô phỏng đầy đủ fee/slippage/liquidity/tax/corporate actions.
- Win rate lịch sử không đảm bảo hiệu suất tương lai.

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
6. Crypto dùng public data không cần API key.
7. Stock VN: cấu hình SSI Environment Variables nếu muốn dùng provider chính.

Xem `DEPLOY-VERCEL.md`.

## Lưu ý tài chính

MarketScope là công cụ phân tích kỹ thuật và backtest tự động. Kết quả backtest phụ thuộc dữ liệu lịch sử, giả định fill, rule TP/SL, timeframe và market regime. Một calibrated win rate cao không đồng nghĩa lệnh hiện tại sẽ thắng. Luôn tự đánh giá rủi ro và tính phù hợp trước khi giao dịch.
