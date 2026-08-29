# Deploy MarketScope V0.8.0 lên Vercel

## 1. Push source lên GitHub

```bash
git init
git add .
git commit -m "MarketScope V0.8.0"
git branch -M main
git remote add origin <GITHUB_REPO_URL>
git push -u origin main
```

## 2. Tạo Project trên Vercel

- Vercel → Add New → Project.
- Import GitHub repository.
- Framework Preset: `Next.js`.
- Root Directory: `./` nếu source nằm ở root repo.
- Build Command: Default.
- Install Command: Default.
- **Output Directory: để trống. Không nhập `out`.**
- Deploy.

## 3. Environment Variables cho Stock VN

Không cấu hình SSI: `AUTO` sẽ dùng Yahoo fallback nếu `ALLOW_STOCK_FALLBACK=true`.

Production nên cấu hình SSI:

```text
STOCK_PROVIDER=AUTO
ALLOW_STOCK_FALLBACK=true
SSI_CLIENT_ID=<SSI client id>
SSI_API_KEY=<SSI api key>
SSI_API_SECRET=<SSI api secret>
```

Optional health probe symbol:

```text
HEALTH_STOCK_SYMBOL=FPT
```

Không commit `.env.local`.

## 4. Checklist sau deploy

1. Analyze → Crypto → BTCUSDT → 1h.
2. Kiểm tra Data Quality strip phải hiện score/freshness/provider trace.
3. Bấm mở Data Quality để xem candle integrity và latency.
4. Entry/SL/TP chỉ được hiện khi `signalAllowed=true`.
5. Watchlist phải không phát signal alert nếu quality đang block.
6. Positions phải hiển thị Data Quality của mã đang phân tích.
7. Portfolio phải tiếp tục tách VND với USD/USDT.
8. Settings → **System Health & Diagnostics** → `Kiểm tra lại`.
9. Xác nhận Binance, Stock provider đang chọn và 3 analysis engines.
10. Nếu Stock dùng Yahoo fallback, overall có thể là `DEGRADED` — đây là chủ đích của V0.8.0.
11. Nếu có lỗi API, ghi lại `correlationId` hiển thị trên UI/log.
12. Không cấu hình `out`; project này là Next.js server app.
