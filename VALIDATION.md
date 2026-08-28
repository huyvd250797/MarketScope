# Validation — MarketScope V0.6.0

## Source / Type validation

- TypeScript 5.8.3 offline semantic check toàn bộ `app/components/lib`: **PASS**.
- Offline stubs chỉ được dùng để thay external type packages do sandbox không cài npm được; stubs không được đóng vào ZIP release.
- New `/api/market/monitor` route: **PASS typecheck**.
- New Watchlist / Positions workspace: **PASS typecheck**.
- Notification Service Worker handler: kiểm tra source/integrity trước khi đóng ZIP.

## Functional source checks

- Analyze không render `PositionPanel`: **PASS**.
- Analyze chart không render Position overlay: **PASS**.
- Positions module render `PositionPanel` + Position chart: **PASS**.
- Watchlist persist `marketscope-watchlist`: **PASS source path**.
- Max Watchlist items = 12: **PASS**.
- Monitoring batch concurrency = 3: **PASS**.
- Auto refresh interval = 5 phút khi Watchlist active: **PASS**.
- Alert detection: Entry Zone / BUY score / SL / TP targets: **PASS source path**.
- Notification dedupe local state: **PASS source path**.
- API routes không được Service Worker cache: **PASS**.

## Deployment checks

- Package version: `0.6.0`.
- Service Worker cache: `marketscope-shell-v0.6.0`.
- Không có `output: "export"`.
- Không cấu hình Output Directory `out`.
- `.env.example` không chứa SSI credentials thật.

## Sandbox limitation

`npm install` bị timeout khi sandbox kết nối npm registry nên không thể chạy full `next build` với dependency thật trong môi trường đóng gói. Source được kiểm tra bằng TypeScript 5.8.3 + offline module stubs, sau đó các stub được xóa trước khi tạo ZIP.

Trên Vercel hãy để **Output Directory trống**.

## Alert limitation

V0.6.0 có Browser/PWA notification khi monitoring đang chạy. Background cloud push/email 24/7 khi app hoàn toàn đóng chưa được bật mặc định vì cần persistent server storage + scheduler + push/email provider. Không coi browser polling hiện tại là realtime guarantee.
