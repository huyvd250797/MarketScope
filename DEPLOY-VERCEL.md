# Deploy trực tiếp lên Vercel

## Cách nhanh nhất

### 1. Đưa source lên GitHub

Trong thư mục source:

```bash
git init
git add .
git commit -m "MarketScope V0.5.0"
git branch -M main
git remote add origin <GITHUB_REPO_URL>
git push -u origin main
```

### 2. Tạo Project trên Vercel

- Vercel → Add New → Project.
- Import GitHub repository.
- Framework Preset: `Next.js`.
- Root Directory: `./` nếu source nằm ở root repo.
- Build Command: Default.
- Install Command: Default.
- **Output Directory: để trống. Không nhập `out`.**
- Deploy.

### 3. Stock VN

Không cấu hình gì: app dùng fallback để xem trước.

Muốn dùng provider chính SSI FastConnect:

```text
STOCK_PROVIDER=AUTO
ALLOW_STOCK_FALLBACK=true
SSI_CLIENT_ID=<SSI client id>
SSI_API_KEY=<SSI api key>
SSI_API_SECRET=<SSI api secret>
```

Vào Vercel → Project → Settings → Environment Variables, thêm các biến trên cho Production/Preview rồi Redeploy.

### 4. Kiểm tra sau deploy

- Mở mobile Safari/Chrome.
- CRYPTO → BTCUSDT → 1h: phải có giá, chart, Market Regime, Trade Setup, Position / Exit Planner và Backtest / Calibration.
- Kiểm tra EMA20/50/200, RSI14, MACD, ADX14, ATR14, VWAP có giá trị.
- Kiểm tra BUY / WAIT / AVOID, Signal Score và Entry/SL/TP khi có setup.
- Kiểm tra Backtest: Filled/Win/Loss/Timeout, Win rate, Calibrated rate, Expectancy, Profit Factor và Validation window.
- Nếu current signal là WAIT/AVOID, calibration phải hiển thị không áp dụng probability cho lệnh hiện tại.
- Nhập giá vốn BTCUSDT → Phân tích vị thế → kiểm tra P/L, Protect/Stop, target ngắn/trung/dài.
- Mở tab Positions → phải thấy BTCUSDT đã lưu; quay lại Analyze phải khôi phục giá vốn.
- Bật/tắt EMA20 / EMA50 / EMA200 / VWAP / ENTRY-SL-TP / POSITION trên chart.
- Đổi ETHUSDT/SOLUSDT.
- STOCK VN → FPT → 1D: phải có chart hoặc thông báo rõ lỗi provider.
- Chuyển Dark/Light/Auto.
- Không có lỗi `routes-manifest.json` / `out not found` vì project không cấu hình static export.

## Security

Không commit `.env.local`; file này đã nằm trong `.gitignore`.
