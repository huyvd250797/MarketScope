# Deploy MarketScope V0.10.0 lên Vercel

## 1. Push source lên GitHub

```bash
git init
git add .
git commit -m "MarketScope V0.10.0"
git branch -M main
git remote add origin <YOUR_GITHUB_REPO>
git push -u origin main
```

## 2. Import vào Vercel

- Add New → Project → Import Git Repository.
- Framework Preset: **Next.js**.
- Build Command: để mặc định `next build` / `npm run build`.
- **Output Directory: để trống**.
- Không nhập `out` và không bật static export.

## 3. Crypto

Binance Spot public market data không cần API key.

## 4. Stock VN

Cấu hình trong Vercel → Settings → Environment Variables nếu dùng SSI:

```text
STOCK_PROVIDER=AUTO
ALLOW_STOCK_FALLBACK=true
SSI_CLIENT_ID=...
SSI_API_KEY=...
SSI_API_SECRET=...
```

Không commit credential thật vào GitHub.

Nếu chưa có SSI, app có thể dùng Yahoo Finance fallback khi `ALLOW_STOCK_FALLBACK=true`. System Health sẽ đánh dấu môi trường fallback là `DEGRADED` theo chủ đích.

## 5. Checklist sau deploy

1. Analyze BTCUSDT 1h với AUTO và kiểm tra effective profile.
2. Đổi lần lượt Ngắn hạn/Swing/Trung hạn/Dài hạn; xác nhận Entry/SL/TP thay đổi.
3. Mở Backtest; profile hiển thị phải trùng effective profile.
4. Lưu một Position; vào Positions kiểm tra profile được khóa.
5. Thêm Watchlist với AUTO và một profile cố định.
6. Settings → System Health: Strategy Profile Engine phải PASS.
7. Kiểm tra Data Quality; stale/invalid data vẫn phải khóa BUY.

## 6. PWA/cache

Service Worker dùng cache `marketscope-shell-v0.10.0`. `/api/*` không bị cache bởi Service Worker để tránh hiển thị dữ liệu thị trường cũ.
