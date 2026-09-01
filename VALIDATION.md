# Validation — MarketScope V0.12.0

## Version/config

- Package version: `0.12.0`.
- Service Worker cache: `marketscope-shell-v0.12.0`.
- Không dùng `output: "export"`.
- Vercel Output Directory phải để trống.

## TypeScript checks

- Core `lib/**/*.ts + app/api/**/*.ts`: **PASS** với TypeScript 5.8.3 và temporary dependency stubs.
- Full TS/TSX semantic check: **PASS** với TypeScript 5.8.3 và temporary Next/React/Lightweight Charts stubs; `noImplicitAny` được tắt riêng cho stub pass vì stub JSX không cung cấp event contextual typing như `@types/react` thật.
- Temporary stubs/config không được đóng gói trong ZIP cuối.

## Scanner guardrails

- Opportunity Score luôn 0–100.
- Data Quality `signalAllowed=false` → Opportunity Score cap thấp.
- `AVOID` bị cap và không thể thành grade A/B.
- `WAIT` bị cap dưới nhóm BUY ưu tiên.
- R:R thấp hạ Opportunity Score.
- Opportunity Score không được mô tả là win rate/xác suất thắng.
- Final Scanner result chỉ lấy từ shortlist đã chạy Forecast Validation causal.

## Scanner performance design

- `QUICK`: universe nhỏ hơn, validation origins thấp hơn.
- `WIDE`: universe mở rộng, validation origins cao hơn.
- Provider scan concurrency: `3`.
- Forecast Validation shortlist concurrency: `2`.
- Final result limit: 3–12.
- `XAUUSD` được ưu tiên trong Forex scanner universe.

## Mobile UX checks

- Bottom nav: 5 touch targets.
- Scanner card single-column trên mobile, 2 columns ở desktop >= 760px.
- KPI scanner chuyển 2×2 ở <= 520px.
- Filter/profile/preset dùng horizontal scroll, không ép co chữ.
- Action button tối thiểu 44px.
- History và Settings vẫn tồn tại qua More bottom sheet.
- Analyze không bị nhét thêm bảng Scanner.

## Existing regression areas

- Forecast Validation causal vẫn hỗ trợ SHORT/MEDIUM/LONG.
- Watchlist/Positions/History localStorage schema không bị thay đổi breaking.
- Crypto vẫn Spot/LONG-only.
- Forex không dùng Binance Spot.
- Data Quality Guard vẫn ưu tiên hơn Signal/Scanner.

## Full production build

Sandbox có thể không truy cập được npm registry. Nếu `npm install` không tải được dependency thì full `next build` cần chạy trên Vercel/CI hoặc máy local có mạng. Source không được giữ `node_modules`/package-lock cài dở sau validation thất bại.
