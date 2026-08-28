# MarketScope V0.3.0 — Entry / SL / TP Signal Engine

V0.3.0 được nâng trực tiếp từ V0.2.0 theo đúng roadmap. Phiên bản này giữ toàn bộ Market Data + Indicator/Market Regime Engine và bổ sung lớp tạo **setup LONG rule-based**: `BUY / WAIT / AVOID`, Entry Zone, Stop Loss/Invalidation, TP1–TP3, R:R và Signal Score.

## Version history

- **V0.1.0 — Market Data & Mobile Shell:** hoàn thành.
- **V0.2.0 — Indicator & Market Regime Engine:** hoàn thành.
- **V0.3.0 — Entry / SL / TP Signal Engine:** phiên bản hiện tại.
- **V0.4.0 — Position / Exit Analysis:** phiên bản tiếp theo theo roadmap.
- **V0.5.0 — Backtest & Win-rate Calibration:** sau V0.4.0.

## Chức năng mới V0.3.0

### Signal Engine — LONG-only

Tín hiệu được tính server-side trên đúng symbol + timeframe đang xem, từ:

- Market Regime.
- EMA20 / EMA50 / EMA200.
- RSI14.
- MACD.
- ADX + DI.
- ATR.
- VWAP.
- Market Structure.
- Pivot support/resistance.
- Volume ratio 20 nến.
- Khoảng cách giá hiện tại tới Entry Zone.

Engine trả về:

- `BUY`: rule kỹ thuật đủ đồng thuận, dữ liệu đủ và giá còn ở vùng có thể thực thi.
- `WAIT`: setup đang hình thành nhưng chưa đạt guardrail hoặc giá đã chạy khỏi vùng Entry.
- `AVOID`: regime/risk rule không phù hợp cho chiến lược LONG-only.

### Entry / Risk / Target

Khi có setup hợp lệ:

- Entry Low / Entry High / Entry midpoint.
- Stop Loss kỹ thuật dựa trên structure + ATR.
- Invalidation conditions.
- TP1 / TP2 / TP3.
- Profit % từ Entry midpoint.
- Reward/Risk tới từng TP.
- Support / Resistance / ATR / Volume ratio context.

### Signal Score 0–100

Score là tổng điểm rule-based, gồm:

- Trend: tối đa 25.
- Momentum: tối đa 20.
- Structure: tối đa 20.
- Entry Location: tối đa 20.
- Risk Quality: tối đa 15.

**Signal Score không phải xác suất thắng.** V0.3.0 tuyệt đối không suy diễn win rate từ score.

### Chart

Lightweight Charts hiển thị thêm:

- marker `BUY / WAIT / AVOID` ở nến mới nhất;
- Entry Low / Entry High;
- SL;
- TP1 / TP2 / TP3;
- toggle `ENTRY/SL/TP` độc lập với EMA/VWAP.

## Kế thừa V0.1.0–V0.2.0

- Toggle Crypto / Stock VN.
- Binance public crypto market data.
- SSI FastConnect + stock fallback architecture.
- Candlestick + Volume.
- EMA20/50/200, RSI14, MACD, ADX14, ATR14, VWAP.
- Market Structure + Market Regime.
- PWA, mobile-first, Dark / Light / Auto.
- Autocomplete, recent symbols.

## Guardrails

- V0.3.0 là **LONG-only**; không tạo tín hiệu SHORT.
- Không khuyến nghị leverage.
- Không auto trade.
- `WAIT` có thể hiển thị vùng Entry đang chờ; `AVOID` không tạo vùng mua mới.
- Không mua đuổi khi giá đã vượt xa Entry Zone.
- Win rate / expectancy / time-to-target chưa xuất hiện ở V0.3.0.

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
6. Crypto có thể dùng ngay không cần API key.
7. Stock VN: cấu hình SSI trong Vercel Environment Variables nếu muốn provider chính.

Xem thêm `DEPLOY-VERCEL.md`.

## Lưu ý tài chính

MarketScope là công cụ phân tích kỹ thuật tự động. `BUY / WAIT / AVOID`, Entry, SL và TP là kết quả của rule engine trên dữ liệu OHLCV, không phải bảo đảm lợi nhuận hay dịch vụ tư vấn đầu tư cá nhân. Người dùng phải tự đánh giá rủi ro trước khi giao dịch.
