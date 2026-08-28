# MarketScope V0.1.0 — Market Data & Mobile Shell

Phiên bản đầu tiên bám đúng roadmap trong kế hoạch: nền tảng dữ liệu thị trường + UI mobile + chart + PWA + theme.

## Chức năng đã có

- Toggle `CRYPTO / STOCK VN`.
- Tìm nhanh mã, autocomplete và nhập mã thủ công.
- Crypto Spot: Binance public market data, không cần API key.
- Chứng khoán Việt Nam:
  - Ưu tiên **SSI FastConnect** khi cấu hình credentials server-side.
  - Có **Yahoo Finance chart fallback** để preview ngay khi chưa có SSI. Đây là endpoint không chính thức, chỉ nên dùng tạm.
- OHLCV + quote + candlestick chart + volume.
- Timeframe:
  - Crypto: 15m / 1h / 4h / 1D / 1W.
  - Stock: 15m / 1h / 1D / 1W.
- PWA shell / Add to Home Screen.
- Dark / Light / Auto, lưu trên thiết bị.
- Recent symbols, responsive 360px+.
- Server-side provider adapter; secret không bị đưa xuống browser.
- Correlation ID cho market-data errors.

## Chưa có ở V0.1.0

Đây là chủ ý để bám roadmap:

- V0.2.0: EMA/RSI/MACD/ADX/ATR/VWAP/Regime/Structure.
- V0.3.0: Entry Zone, Invalidation, SL, TP1-TP3, R:R, BUY/WAIT/AVOID.
- V0.4.0: Position & Exit Planner.
- V0.5.0: Backtest + Win Probability + Expectancy + Time-to-target.
- Không auto trade, không leverage recommendation.

## Chạy local

```bash
npm install
cp .env.example .env.local
npm run dev
```

Mở `http://localhost:3000`.

## Deploy Vercel

Không cấu hình Output Directory. Đây là Next.js app chuẩn, Vercel tự nhận `.next`.

1. Push toàn bộ source lên GitHub.
2. Vercel → Add New Project → Import repository.
3. Framework Preset: **Next.js**.
4. Build Command: để mặc định `next build`.
5. Output Directory: **để trống / mặc định**.
6. Deploy.

Crypto dùng được ngay. Stock sẽ dùng fallback nếu chưa cấu hình SSI.

### Cấu hình SSI FastConnect trên Vercel

Project → Settings → Environment Variables:

```text
STOCK_PROVIDER=AUTO
ALLOW_STOCK_FALLBACK=true
SSI_CLIENT_ID=...
SSI_API_KEY=...
SSI_API_SECRET=...
```

Sau đó Redeploy.

> `SSI_API_KEY` và `SSI_API_SECRET` chỉ dùng trong Server Route. Không đặt prefix `NEXT_PUBLIC_`.

## Provider mode

- `STOCK_PROVIDER=AUTO`: SSI nếu có credentials; lỗi SSI thì fallback (nếu bật).
- `STOCK_PROVIDER=SSI`: bắt buộc SSI.
- `STOCK_PROVIDER=YAHOO`: luôn fallback.
- `ALLOW_STOCK_FALLBACK=false`: tắt fallback.

## Lưu ý dữ liệu

- Binance Spot endpoint là public market data.
- SSI là provider chính được đề xuất cho chứng khoán VN.
- Yahoo fallback là nguồn không chính thức; có thể rate-limit hoặc thay đổi. Production nên dùng SSI/provider có license phù hợp.
- Service worker **không cache `/api/*`**, tránh dùng nhầm quote cũ.

## Stack

- Next.js 16.3.3
- React 19.2.8
- TypeScript 5.8.3
- TradingView Lightweight Charts 5.2.1
- SSI Node SDK 3.2.0

## Version

`V0.1.0 — Market Data & Mobile Shell`

## Third-party attribution

MarketScope sử dụng TradingView Lightweight Charts™. Attribution logo mặc định trên chart được giữ nguyên và file `NOTICE` được phân phối cùng source.
