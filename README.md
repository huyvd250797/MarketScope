# MarketScope V0.2.0 — Indicator & Market Regime Engine

Phiên bản tiếp theo bám đúng roadmap sau V0.1.0. V0.2.0 giữ nguyên Market Data & Mobile Shell và bổ sung engine phân tích kỹ thuật + phân loại trạng thái thị trường.

## Version history

- **V0.1.0 — Market Data & Mobile Shell:** hoàn thành.
- **V0.2.0 — Indicator & Market Regime Engine:** phiên bản hiện tại.
- **V0.3.0 — Entry/SL/TP Signal Engine:** phiên bản tiếp theo theo roadmap.

## Chức năng kế thừa từ V0.1.0

- Toggle `CRYPTO / STOCK VN`.
- Crypto Spot market data từ Binance public API.
- Stock VN ưu tiên SSI FastConnect; Yahoo Finance chỉ là fallback preview.
- OHLCV + quote + candlestick + volume.
- Mobile-first, PWA, Dark / Light / Auto.
- Recent symbols, autocomplete, server-side provider adapter.

## Mới trong V0.2.0

### Indicator Engine

Tính server-side trực tiếp từ OHLCV, không thêm thư viện TA ngoài:

- EMA 20 / 50 / 200.
- RSI 14.
- MACD 12 / 26 / 9.
- ADX 14 + `+DI / -DI`.
- ATR 14 + ATR % trên giá.
- VWAP:
  - intraday: reset theo ngày;
  - daily/weekly: rolling VWAP 20 nến.
- Market Structure dựa trên pivot gần nhất:
  - `HH / HL`;
  - `LH / LL`;
  - `Range`;
  - `Unconfirmed`.

### Market Regime Engine

Phân loại:

- Strong Uptrend.
- Uptrend.
- Range / Accumulation.
- Downtrend.
- Strong Downtrend.
- High Volatility.

Regime Confidence `25–95/100` là mức độ đồng thuận của EMA, ADX, structure và MACD; **không phải xác suất thắng của giao dịch**.

### UI / Chart

- Card Market Regime trên mobile.
- 6 card chỉ báo kỹ thuật.
- Confidence ring + market structure.
- Toggle overlay trực tiếp trên chart:
  - EMA20;
  - EMA50;
  - EMA200;
  - VWAP.
- Giữ attribution của TradingView Lightweight Charts.

## Chưa có trong V0.2.0

Theo đúng roadmap, phiên bản này **không** tự tạo khuyến nghị BUY/SELL:

- V0.3.0: Entry Zone, Invalidation, Stop Loss, TP1–TP3, R:R, BUY/WAIT/AVOID.
- V0.4.0: Position & Exit Planner cho điểm đã vào lệnh.
- V0.5.0: Backtest, Win Probability, Expectancy, Time-to-target.
- Không auto trade và không khuyến nghị leverage.

## Chạy local

```bash
npm install
cp .env.example .env.local
npm run dev
```

Mở `http://localhost:3000`.

## Kiểm tra source

```bash
npm run typecheck
npm run build
```

## Deploy Vercel

1. Push toàn bộ source lên GitHub.
2. Vercel → Add New Project → Import repo.
3. Framework Preset: `Next.js`.
4. Build Command: để mặc định (`next build`).
5. **Output Directory: để trống**.
6. Nếu chỉ dùng Crypto có thể deploy ngay không cần API key.
7. Nếu dùng SSI, thêm Environment Variables theo `.env.example`.

Chi tiết xem `DEPLOY-VERCEL.md`.

## Lưu ý tài chính

MarketScope V0.2.0 là công cụ phân tích OHLCV và phân loại market regime. Kết quả kỹ thuật không đảm bảo lợi nhuận và chưa phải khuyến nghị đầu tư hay lệnh giao dịch.
