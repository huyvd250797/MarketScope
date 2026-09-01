# Deploy MarketScope V0.12.0 lên Vercel

## 1. Push GitHub

```bash
git add .
git commit -m "MarketScope V0.12.0 Smart Opportunity Scanner"
git push
```

## 2. Vercel

- Import repository.
- Framework Preset: `Next.js`.
- Build Command: `npm run build`.
- Install Command: mặc định `npm install`.
- **Output Directory: để trống**.

Không nhập `out` và không bật static export.

## 3. Environment Variables cho Stock VN

Crypto Binance public và Forex public adapter không cần secret.

Nếu dùng SSI FastConnect:

```text
STOCK_PROVIDER=AUTO
ALLOW_STOCK_FALLBACK=true
SSI_CLIENT_ID=...
SSI_API_KEY=...
SSI_API_SECRET=...
```

## 4. API Scanner

Endpoint:

```text
/api/market/scanner?market=ALL&profile=AUTO&scope=QUICK&limit=8
```

Các tham số:

- `market`: `ALL | CRYPTO | STOCK | FOREX`
- `profile`: `AUTO | SHORT_TERM | SWING | MEDIUM_TERM | LONG_TERM`
- `scope`: `QUICK | WIDE`
- `limit`: 3–12

Scanner route dùng Node.js runtime và giới hạn concurrency. Final shortlist chạy Forecast Validation causal trước khi trả ranking.

## 5. Checklist sau deploy

1. Analyze `BTCUSDT` hoạt động.
2. Analyze `FPT` hoạt động.
3. Analyze `XAUUSD` hoạt động.
4. Mở Scanner → `Tất cả / AUTO / Nhanh` có ranking.
5. Đổi Scanner sang `Forex` phải có `XAUUSD` trong universe ưu tiên.
6. Bấm `Phân tích` trên Scanner mở đúng mã/timeframe/profile.
7. Bấm `☆ Watchlist` thêm mã vào Watchlist.
8. Bottom nav mobile chỉ có 5 mục; History/Settings nằm trong `Thêm`.
9. `/api/*` không bị Service Worker cache.
10. Settings → System Health có Opportunity Scanner Engine self-test.

## 6. Lưu ý performance

- QUICK quét universe nhỏ hơn WIDE.
- Provider concurrency = 3.
- Forecast Validation shortlist concurrency = 2.
- Scanner API dùng CDN cache ngắn `s-maxage=30, stale-while-revalidate=60`.
- Smart Scanner hiện là **on-demand**, chưa phải cloud scanner 24/7.

## 7. Local persistence

Watchlist, Positions, Forecast History và trạng thái `Mới chuyển BUY` của Scanner hiện lưu localStorage trên thiết bị/browser hiện tại. Cloud sync là phạm vi production sau này.
