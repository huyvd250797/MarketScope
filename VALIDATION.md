# Validation — MarketScope V0.9.0

## Đã kiểm tra offline

- Package version `0.9.0`.
- Service Worker cache `marketscope-shell-v0.9.0`.
- Core analysis strict TypeScript: PASS.
- Full TS/TSX semantic check bằng dependency stubs: PASS.
- Strategy wiring smoke test: PASS cho AUTO / SHORT_TERM / SWING / MEDIUM_TERM / LONG_TERM.
- `signal.strategy.profile === effective profile`: PASS.
- `backtest.strategyProfile === effective profile`: PASS.
- `position.strategy.profile === effective profile`: PASS.
- TP1 < TP2 < TP3 invariant khi có target: PASS.
- Data Quality Guard được giữ nguyên trước Signal/Backtest.
- Watchlist profile migration: legacy → SWING.
- Position profile migration: legacy → SWING.
- No Futures/SHORT/leverage/auto trade.
- Không `output: "export"`.
- Không yêu cầu thư mục `out`.
- Secret scan trước đóng gói.

## Full dependency build

Đã thử `npm install --ignore-scripts --no-audit --no-fund` trong sandbox, nhưng npm registry timeout trước khi dependency được tải; không tạo `node_modules` hoặc `package-lock.json` dở dang. Vì vậy không thể chạy `next build` với dependency thật trong môi trường đóng gói này.

Khi deploy Vercel, để **Output Directory trống** và xem build log thực tế của Vercel.
