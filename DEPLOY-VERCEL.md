# Deploy MarketScope V0.13.0 lên Vercel

## Git
```bash
git add .
git commit -m "MarketScope V0.13.0 Alert Center Opportunity Monitoring"
git push origin main
```

## Vercel
1. Import GitHub repository.
2. Framework Preset: **Next.js**.
3. Build Command: để mặc định `npm run build`.
4. **Output Directory: để trống**.
5. Deploy.

Không cấu hình `out` và không bật static export.

## Environment Variables cho Stock VN / SSI
Tham khảo `.env.example`:

```env
STOCK_PROVIDER=AUTO
ALLOW_STOCK_FALLBACK=true
SSI_CLIENT_ID=
SSI_API_KEY=
SSI_API_SECRET=
```

Crypto public market data không cần Binance API key.

## Sau deploy
- Mở Analyze kiểm tra BTCUSDT / FPT / XAUUSD.
- Thêm ít nhất 1 mã vào Watchlist.
- Mở Scanner một lần để thiết lập scanner baseline.
- Bấm chuông Alert Center và chọn loại alert muốn nhận.
- Nếu muốn browser notification, cấp quyền Notification cho domain Vercel/PWA.

## Lưu ý monitoring
V0.13.0 dùng browser session monitoring. Nếu muốn nhận alert khi app đóng hoàn toàn cần cloud scheduler + persistent store + Web Push, không thể đảm bảo chỉ bằng timer của browser.
