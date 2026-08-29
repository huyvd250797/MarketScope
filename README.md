# MarketScope V0.7.0 — Portfolio & Risk Management (Spot-only)

V0.7.0 nâng trực tiếp từ V0.6.0. Module Futures đã được **loại khỏi roadmap** vì sản phẩm được chốt theo hướng Spot-only. Phiên bản này giữ toàn bộ Analyze, Watchlist, Signal Engine, Backtest/Calibration và Position/Exit Planner; bổ sung quản trị danh mục ngay trong **Positions** để màn Analyze tiếp tục gọn.

## Version history

- V0.1.0 — Market Data & Mobile Shell ✅
- V0.2.0 — Indicator & Market Regime ✅
- V0.3.0 — Entry / SL / TP Signal Engine ✅
- V0.4.0 — Position / Exit Analysis ✅
- V0.5.0 — Backtest & Win-rate Calibration ✅
- V0.6.0 — Watchlist & Signal Monitoring ✅
- **V0.7.0 — Portfolio & Risk Management (Spot-only) ✅**

## Điểm mới V0.7.0

### 1. Giá vốn + số lượng
Mỗi vị thế lưu thêm `quantity`. Dữ liệu V0.6.0 cũ tự migrate với quantity mặc định = 1 để không làm hỏng localStorage hiện tại. Người dùng có thể cập nhật đúng số lượng đang nắm để Portfolio tính giá trị và P/L.

### 2. Portfolio nằm trong Positions
Không đưa thêm card vào Analyze. Positions hiển thị:
- vốn giá gốc;
- giá trị hiện tại;
- P/L tiền và %;
- downside từ giá hiện tại tới mốc bảo vệ kỹ thuật;
- số vị thế đang lãi / âm / rủi ro;
- trạng thái danh mục `HEALTHY / WATCH / HIGH_RISK`;
- allocation/tỷ trọng từng mã;
- concentration risk của vị thế lớn nhất;
- cảnh báo khi nhiều vị thế cùng bearish hoặc đang REDUCE_RISK / EXIT_RISK.

### 3. Không cộng sai VND với USD/USDT
Portfolio tách bucket theo currency. VND và USD/USDT không được cộng thành một con số tổng giả vì V0.7.0 chưa có FX conversion engine.

### 4. Portfolio API

```text
POST /api/market/portfolio
```

Request chứa tối đa 30 vị thế. API xử lý theo batch concurrency = 3 để giảm áp lực provider/Vercel. Giá vốn và quantity chỉ dùng trong request để tính toán; endpoint `no-store` và source không có persistent position database.

### 5. Spot-only guardrail
- không Futures;
- không SHORT;
- không leverage recommendation;
- không auto trade;
- không trộn calibrated win-rate với Portfolio Risk;
- risk-to-stop là tham chiếu kỹ thuật, không phải mức lỗ tối đa được đảm bảo.

## Deploy Vercel

1. Push source lên GitHub.
2. Import project vào Vercel.
3. Framework Preset: Next.js.
4. Build Command: mặc định `next build`.
5. **Output Directory: để trống.**
6. Crypto public data không cần API key. Stock VN có thể cấu hình SSI hoặc dùng fallback theo `.env.example`.

Không cấu hình `out` và không dùng `output: "export"`.

## Phiên bản tiếp theo

Theo roadmap gốc, sau khi bỏ Futures khỏi scope, bước tiếp theo là **V0.8.0 — Quality & Observability**: health check provider/API, diagnostics, error telemetry an toàn, freshness/data-quality guards và hardening trước Beta Production.
