# MarketScope V0.10.0 — Strategy Profiles & Smart Analysis

MarketScope là web app mobile-first phân tích **Crypto Spot** và **chứng khoán Việt Nam**, không Futures, không SHORT, không leverage và không tự đặt lệnh.

V0.10.0 nâng trực tiếp từ V0.8.0 và giữ toàn bộ Market Data, Technical Analysis, Entry/SL/TP, Position/Exit, Backtest Calibration, Watchlist, Portfolio Risk và Data Quality Guard. Điểm mới là toàn bộ hệ thống hiểu cùng một **Strategy Profile** để tránh dùng một cách phân tích cho mọi thời gian nắm giữ.

## Strategy Profiles

- **AUTO** — Smart Analysis đề xuất profile hiệu lực từ timeframe, Market Regime, ADX, ATR và RSI.
- **Ngắn hạn** — vài giờ đến khoảng 3 ngày; ưu tiên momentum/vị trí vào, Entry và SL sát hơn.
- **Swing** — khoảng 3 ngày đến 4 tuần; cân bằng trend, momentum, structure và R:R.
- **Trung hạn** — khoảng 3 tuần đến 3 tháng; ưu tiên trend/structure, vùng Entry và SL rộng hơn.
- **Dài hạn** — từ khoảng 3 tháng; ưu tiên EMA200/xu hướng lớn và giảm trọng số nhiễu ngắn hạn.

Strategy Profile điều khiển cùng lúc:

- trọng số Signal Score và ngưỡng BUY;
- độ rộng Entry Zone;
- ATR multiplier của Stop Loss;
- TP1 / TP2 / TP3 theo R;
- giới hạn mua đuổi;
- Position protection / trailing / Exit S-M-L;
- holding guide;
- Backtest và calibration cohort.

## Smart Analysis / AUTO

AUTO không phải AI dự đoán giá. Đây là rule engine minh bạch:

1. Chọn baseline theo timeframe.
2. Điều chỉnh theo Market Regime và ADX.
3. Kiểm tra volatility bằng ATR%.
4. Bổ sung cảnh báo RSI/mua đuổi.
5. Trả về `effective profile`, confidence, timeframe-fit và lý do.

Khi AUTO chọn một effective profile, **Backtest dùng cố định chính profile đó trên toàn bộ lịch sử của lần phân tích**. Kết quả calibrated rate không trộn tín hiệu Ngắn hạn với Swing/Trung hạn/Dài hạn.

## Positions

Khi lưu vị thế, MarketScope lưu **effective profile** tại thời điểm phân tích. Exit Planner tiếp tục dùng profile đã khóa cho vị thế đó thay vì tự đổi horizon về sau.

Dữ liệu position cũ từ V0.8.0 không có profile sẽ migrate an toàn về **SWING**, tương đương logic mặc định trước V0.10.0.

## Watchlist

Mỗi item lưu riêng `market + symbol + interval + profile`. Có thể theo dõi cùng mã ở các strategy khác nhau. Với AUTO, card hiển thị `AUTO → effective profile` của dữ liệu mới nhất.

Watchlist cũ không có profile được migrate về SWING để bảo toàn hành vi cũ.

## Data Quality vẫn là lớp chặn cuối

Strategy Profile không được phép vượt Data Quality Guard. Nếu dữ liệu stale, thiếu nến hoặc OHLC invalid, hệ thống khóa Signal/Entry/SL/TP dù profile đang cho setup BUY.

## Stack

- Next.js 16
- React 19
- TypeScript 5.8
- Lightweight Charts 5
- Binance Spot public market data
- SSI FastConnect cho Stock VN khi cấu hình credentials
- Yahoo Finance fallback cho preview/backup
- PWA Service Worker

## Chạy local

```bash
npm install
cp .env.example .env.local
npm run dev
```

Mở `http://localhost:3000`.

## Deploy Vercel

Xem `DEPLOY-VERCEL.md`. Không cấu hình `Output Directory = out`; để Vercel nhận diện Next.js mặc định.

## Lưu ý về xác suất

Signal Score không phải xác suất thắng. Calibrated win rate chỉ là thống kê lịch sử theo profile/setup/regime/score band khi đủ mẫu và không đảm bảo kết quả tương lai.

## Roadmap

- V0.1.0 Market Data ✅
- V0.2.0 Technical & Regime ✅
- V0.3.0 Entry / SL / TP ✅
- V0.4.0 Position / Exit ✅
- V0.5.0 Backtest & Calibration ✅
- V0.6.0 Watchlist & Monitoring ✅
- V0.7.0 Portfolio & Risk ✅
- V0.8.0 Quality & Observability ✅
- **V0.10.0 Strategy Profiles & Smart Analysis ✅**
- V1.0.0 Production Ready → tiếp theo

### V0.10.0 – Forex & Forecast
MarketScope hỗ trợ 3 nhóm tài sản: Crypto Spot, Stock VN và Forex/Metals. Forex có danh sách mã chuẩn để tránh gửi mã không tồn tại sang Binance; ví dụ vàng dùng XAUUSD thay vì XAUUSDT. Analyze được chia theo tầng thông tin và có Forecast 3 horizon (ngắn/trung/dài hạn). Forecast là kịch bản xác suất dựa trên trend regression, Market Regime, RSI/MACD và ATR uncertainty band, không phải cam kết giá tương lai.
