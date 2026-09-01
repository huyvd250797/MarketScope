# MarketScope V0.12.0 — Smart Opportunity Scanner

MarketScope là web app mobile-first phân tích **Crypto Spot**, **Stock VN** và **Forex/Metals**. V0.12.0 nâng trực tiếp từ V0.11.0 và giữ nguyên Technical Analysis, Strategy Profiles, Entry/SL/TP, Position/Exit, Backtest Calibration, Forecast Validation, Watchlist, Portfolio Risk và Data Quality Guard.

## Điểm mới V0.12.0

### 1. Smart Opportunity Scanner
Module **Scanner** tự quét nhiều mã thay vì yêu cầu nhập từng mã thủ công.

Universe mặc định được ưu tiên theo nhóm phổ biến:

- Crypto Spot: BTCUSDT, ETHUSDT, SOLUSDT, BNBUSDT, XRPUSDT, LINKUSDT, AVAXUSDT, SUIUSDT…
- Stock VN: FPT, HPG, VNM, VCB, MBB, TCB, MWG, SSI, DGC…
- Forex/Metals: XAUUSD, EURUSD, GBPUSD, USDJPY, USDCHF, AUDUSD, USDCAD, GBPJPY…

Scanner hỗ trợ:

- `ALL / CRYPTO / STOCK VN / FOREX`
- `AUTO / Ngắn hạn / Swing / Trung hạn / Dài hạn`
- phạm vi `Nhanh / Mở rộng`
- Top cơ hội
- Gần Entry
- Forecast mạnh
- Historical Accuracy tốt
- Risk/Reward tốt
- Mới chuyển BUY trên thiết bị hiện tại

### 2. Opportunity Score 0–100
Opportunity Score dùng để **xếp hạng ưu tiên xem**, không phải xác suất thắng.

Trọng số mặc định:

- Signal Engine: 32%
- Forecast: 20%
- Historical Accuracy: 18%
- Risk/Reward: 15%
- Data Quality: 15%

Guardrails:

- Data Quality không cho signal → score bị khóa thấp.
- `AVOID` không thể đứng đầu chỉ nhờ Forecast đẹp.
- `WAIT` bị giới hạn score.
- R:R TP1 thấp bị hạ thứ hạng.
- Final Top cards đều đi qua Forecast Validation causal ở tầng thứ hai của Scanner.

### 3. Scanner 2 tầng để tối ưu Vercel
Để tránh chạy historical validation nặng cho toàn bộ universe:

1. Quét nhanh toàn universe bằng Technical + Signal + Backtest + Forecast.
2. Shortlist các ứng viên tốt nhất.
3. Chạy Forecast Validation causal cho shortlist.
4. Tính lại Opportunity Score và xếp hạng cuối.

Concurrency provider được giới hạn để giảm burst request tới Binance/SSI/Yahoo.

### 4. Mobile-first UX
Bottom navigation được tối ưu còn 5 mục:

- Analyze
- Scanner
- Watchlist
- Positions
- Thêm

`History` và `Settings` được đưa vào **More bottom sheet**, không bị xóa chức năng.

Scanner trên mobile dùng:

- filter chips cuộn ngang
- sticky control bar
- card ranking thay vì table rộng
- KPI 2×2 ở màn nhỏ
- metric grid gọn
- nút `Phân tích` / `Watchlist` tối thiểu 44px
- detail chỉ bung khi người dùng muốn xem lý do xếp hạng

### 5. Liên kết Scanner → Analyze
Bấm **Phân tích** trên một opportunity sẽ mở Analyze và giữ đúng:

- Market
- Symbol
- Timeframe
- Strategy Profile

Bấm **☆ Watchlist** để đưa cùng mã/timeframe/profile vào Watchlist.

## Những chức năng giữ nguyên

- Crypto Spot only, không Futures/leverage.
- Stock VN với SSI FastConnect + fallback theo cấu hình.
- Forex/Metals gồm XAUUSD/XAGUSD.
- EMA/RSI/MACD/ADX/ATR/VWAP.
- Market Regime.
- BUY / WAIT / AVOID.
- Entry Zone / SL / TP1–TP3 / R:R.
- Position / Exit Planner.
- Portfolio & Risk Management.
- Backtest & calibrated win rate.
- Multi-horizon Forecast.
- Forecast Validation & Forecast History.
- Data Quality / Provider Diagnostics / System Health.
- PWA + Dark/Light/Auto.

## Chạy local

```bash
npm install
npm run dev
```

Kiểm tra production:

```bash
npm run typecheck
npm run build
```

## Deploy Vercel

Framework: **Next.js**. Không dùng `output: "export"`. **Output Directory để trống**.

Xem `DEPLOY-VERCEL.md` và `VALIDATION.md`.
