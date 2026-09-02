# MarketScope V0.13.0 — Alert Center & Opportunity Monitoring

MarketScope là web app mobile-first phân tích **Crypto Spot**, **Stock VN** và **Forex/Metals**. V0.13.0 nâng trực tiếp từ V0.12.0 và giữ nguyên Technical Analysis, Entry/SL/TP, Strategy Profiles, Backtest Calibration, Forecast + Forecast Validation, Watchlist, Portfolio Risk, Data Quality Guard và Smart Opportunity Scanner.

## Điểm mới V0.13.0

### Alert Center
Chuông trên header hiển thị số alert chưa đọc. Alert Center gom các thay đổi quan trọng từ Watchlist, Scanner, Forecast, Positions và Data Quality.

Priority:
- CRITICAL: phá SL, EXIT_RISK, dữ liệu stale/invalid của vị thế.
- HIGH: WAIT→BUY, Entry Zone, TP, Forecast đảo hướng, Opportunity vượt threshold.
- MEDIUM: BUY không còn hiệu lực, Opportunity tăng mạnh, confidence thay đổi đáng kể.
- INFO: dành cho event nhẹ hơn trong các phiên bản sau.

### Monitoring cadence khi app đang mở
- Watchlist: khoảng 5 phút/lần.
- Smart Opportunity Scanner: khoảng 10 phút/lần.
- Saved Positions/Portfolio: khoảng 10 phút/lần.
- Chỉ chạy khi tab/app đang visible để giảm request và tải provider.

### Dedupe / cooldown
Alert dùng fingerprint để không lặp cùng một sự kiện liên tục. Cooldown mặc định 30 phút và chỉnh được trong Alert Center. Khi event giống nhau tái diễn sau cooldown, counter tăng thay vì spam nhiều card.

### Alert Settings
Có thể bật/tắt:
- WAIT → BUY
- Entry Zone
- TP1 / TP2 / TP3
- Stop Loss
- Forecast đảo hướng
- Opportunity change
- Position Risk
- Data stale/degraded
- Browser/PWA notification

Opportunity threshold có thể chỉnh từ 60–95/100.

## Mobile-first
Bottom navigation vẫn chỉ có:

`Analyze | Scanner | Watchlist | Positions | Thêm`

Alert Center mở qua chuông ở header để tránh thêm tab thứ 6. History và Settings tiếp tục nằm trong `Thêm`.

## Giới hạn quan trọng
V0.13.0 chưa phải cloud monitoring 24/7. Khi app/PWA đóng hoàn toàn, JavaScript timer không còn đảm bảo chạy. Background push thật cần persistent database + scheduler + Web Push ở roadmap sau.

## Market support
- Crypto: Binance Spot public data, LONG/Spot-only, không Futures/leverage.
- Stock VN: SSI FastConnect khi cấu hình; fallback theo cấu hình hiện có.
- Forex/Metals: EURUSD, GBPUSD, USDJPY, XAUUSD, XAGUSD... qua provider Forex hiện tại.

## Deploy
Push source lên GitHub rồi import vào Vercel. Framework: Next.js. **Output Directory để trống**.

Nếu dùng SSI, cấu hình biến môi trường theo `.env.example`.
