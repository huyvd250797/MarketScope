# MarketScope V0.8.0 — Quality & Observability (Spot-only)

V0.8.0 nâng trực tiếp từ V0.7.0 và giữ nguyên định hướng **Spot-only**. Mục tiêu của phiên bản này là hardening trước production: kiểm soát độ mới/chất lượng dữ liệu, theo dõi provider, thêm diagnostics và ngăn Signal Engine phát Entry/SL/TP khi input data không đủ an toàn.

## Version history

- V0.1.0 — Market Data & Mobile Shell ✅
- V0.2.0 — Indicator & Market Regime ✅
- V0.3.0 — Entry / SL / TP Signal Engine ✅
- V0.4.0 — Position / Exit Analysis ✅
- V0.5.0 — Backtest & Win-rate Calibration ✅
- V0.6.0 — Watchlist & Signal Monitoring ✅
- V0.7.0 — Portfolio & Risk Management (Spot-only) ✅
- **V0.8.0 — Quality & Observability ✅**

## Điểm mới V0.8.0

### 1. Data Quality Guard
Mỗi snapshot được kiểm tra trước khi Signal Engine được phép phát lệnh:

- freshness của `dataAt` theo market/timeframe;
- số lượng nến tối thiểu;
- duplicate timestamp;
- timestamp không tăng dần;
- OHLC bất hợp lệ;
- khoảng trống dữ liệu lớn;
- tỷ lệ volume = 0;
- chênh lệch bất thường giữa current price và close nến cuối.

Trạng thái:

- `HEALTHY`
- `DEGRADED`
- `STALE_DATA`
- `INVALID_DATA`

Nếu guard không đạt, current signal tự chuyển về `DATA STALE` / `DATA CHECK`, không tạo Entry/SL/TP mới và Watchlist không phát notification BUY từ dữ liệu đó.

### 2. Data Quality UI
Analyze và Positions có thanh Data Quality gọn. Bấm mở để xem:

- Quality score 0–100;
- tuổi dữ liệu và freshness threshold;
- số nến;
- OHLC/duplicate/gaps/zero-volume;
- provider route Primary/Fallback;
- provider latency;
- lý do fallback;
- blockers/warnings.

Diagnostics chi tiết không được nhét vào Dashboard Analyze để giữ mobile UI gọn.

### 3. Provider Diagnostics
Market Data Gateway ghi trace an toàn cho từng snapshot:

- requested mode;
- selected provider;
- `PRIMARY / FALLBACK / DIRECT`;
- SSI configured hay chưa;
- fallback reason;
- provider latency.

Không có API key/secret trong response.

### 4. System Health trong Settings
Endpoint:

```text
GET /api/system/health
```

Settings hiển thị:

- Binance REST health;
- SSI FastConnect status/configuration;
- Yahoo fallback health;
- provider đang được chọn;
- Technical Engine self-test;
- Signal Engine self-test;
- Backtest Engine self-test;
- cache/runtime policies;
- trạng thái tổng `HEALTHY / DEGRADED / PROVIDER_ERROR`.

Yahoo là nguồn fallback/unofficial nên khi hệ thống đang phải dùng Yahoo, System Health cố ý hiển thị `DEGRADED` thay vì đánh đồng với primary production provider.

### 5. Retry / error hardening

- Binance tiếp tục thử nhiều REST base URL.
- SSI SDK có timeout/retry.
- Yahoo thử `query1` rồi `query2` trước khi trả lỗi.
- API trả `correlationId` để đối chiếu log.
- Service Worker không cache `/api/*`.
- Portfolio endpoint tiếp tục `no-store`.

### 6. Portfolio data quality
Portfolio API đánh dấu quality theo từng vị thế. Danh mục cảnh báo khi một hoặc nhiều mã đang dùng data degraded/stale để người dùng không nhầm số liệu risk là realtime tuyệt đối.

## Guardrails sản phẩm

- Spot / LONG-only.
- Không Futures.
- Không SHORT.
- Không leverage recommendation.
- Không auto trade.
- Signal Score không phải xác suất thắng.
- Calibrated win-rate là thống kê lịch sử có điều kiện, không đảm bảo tương lai.
- Data Quality Guard giảm rủi ro đầu vào nhưng không đảm bảo provider luôn chính xác.

## Deploy Vercel

1. Push source lên GitHub.
2. Import repository vào Vercel.
3. Framework Preset: **Next.js**.
4. Build Command: mặc định `next build`.
5. **Output Directory: để trống.**
6. Không dùng `output: "export"` và không cấu hình `out`.

Crypto public data không cần key. Stock VN xem `.env.example` để cấu hình SSI FastConnect.

Sau deploy vào **Settings → System Health & Diagnostics** và bấm `Kiểm tra lại` để xác nhận provider/engine tại chính môi trường Vercel.

## Phiên bản tiếp theo

Theo roadmap sau V0.8.0: **V0.9.0 — Strategy Profiles & Smart Analysis**. Bản này sẽ cho phép chọn phong cách Ngắn hạn / Swing / Trung hạn / Dài hạn để Entry, target, holding horizon và trọng số Signal Engine thích ứng theo chiến lược, vẫn giữ Spot-only.
