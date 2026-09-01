# Deploy MarketScope V0.11.0 lên Vercel

## 1. Push GitHub

```bash
git add .
git commit -m "MarketScope V0.11.0 Forecast Validation"
git push
```

## 2. Vercel
- Import repository.
- Framework Preset: Next.js.
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

## 4. Sau deploy
Kiểm tra:
1. Crypto BTCUSDT.
2. Stock VN FPT.
3. Forex EURUSD và XAUUSD.
4. Forecast card có Raw + Calibrated confidence.
5. Forecast Validation có sample/accuracy khi đủ history.
6. Tab History lưu forecast sau khi Analyze.
7. `/api/*` không bị Service Worker cache.

## 5. Lưu ý History
Forecast History V0.11.0 lưu trong localStorage của browser/PWA hiện tại. Đổi thiết bị hoặc xóa dữ liệu trình duyệt sẽ mất local History. Cloud sync là phạm vi phiên bản production sau này.
