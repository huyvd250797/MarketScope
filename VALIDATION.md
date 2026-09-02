# Validation — MarketScope V0.13.0

## PASS
- Core API + analysis + monitoring strict TypeScript check bằng TypeScript 5.8.3.
- Full TS/TSX semantic check offline bằng validation stubs cho Next/React/Lightweight Charts/SSI.
- Alert Engine smoke test:
  - WAIT → BUY.
  - Entry Zone transition.
  - Forecast BEARISH → BULLISH.
  - dedupe trong cooldown.
  - retrigger sau cooldown.
- Scanner Alert smoke test:
  - WAIT → BUY.
  - Opportunity vượt threshold.
  - Opportunity tăng >= 15.
  - lọt Top 3.
  - Forecast đảo hướng.
- Portfolio Alert smoke test:
  - HOLD → EXIT_RISK = CRITICAL.
  - Data HEALTHY → STALE_DATA = CRITICAL.
- /api/market/monitor đã có Forecast compact trong WatchlistMonitorSnapshot.
- Không dùng output: "export".
- Không tạo thư mục `out`.
- Service Worker cache version V0.13.0 và không cache `/api/*`.

## Full npm build
Đã thử `npm install --no-audit --no-fund` trong sandbox nhưng npm registry timeout trước khi cài dependency. Không giữ lại `node_modules` hay `package-lock.json` cài dở trong source.

## Runtime guardrails
- Background monitor chỉ chạy khi `document.visibilityState === 'visible'`.
- Watchlist concurrency giữ batch 3.
- Scanner endpoint giữ concurrency/two-stage ranking từ V0.12.0.
- Portfolio endpoint giữ concurrency 3 và giới hạn 30 vị thế.
- Alert history giới hạn 160 event.
- Browser notifications chỉ phát sau dedupe/cooldown.
