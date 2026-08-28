# Validation — MarketScope V0.5.0

## Type / source validation

- Core strict TypeScript check cho `types + technical + signal + backtest`: **PASS**.
- Full TS/TSX semantic check bằng TypeScript 5.8.3 + offline stubs Next/React/Lightweight Charts/SSI: **PASS**.
- JSON / manifest parse: kiểm tra trước khi đóng ZIP.
- Local import resolution: kiểm tra trước khi đóng ZIP.

## Backtest smoke tests

- 1.000 synthetic candles: **PASS**.
- Latest potentially-live candle excluded from historical sample: **PASS**.
- Trade accounting invariant `WIN + LOSS + TIMEOUT = Filled`: **PASS**.
- Raw / calibrated win rate luôn nằm trong 0–100: **PASS**.
- WAIT/AVOID current signal → `calibration.applicable = false`: **PASS**.
- Synthetic BUY current signal → `calibration.applicable = true`: **PASS**.
- BUY với sample quá nhỏ → quality `INSUFFICIENT` thay vì coi 100% raw win rate là đáng tin: **PASS**.
- Beta(2,2) shrinkage hoạt động: synthetic 3/3 wins → raw 100%, calibrated 71.4%: **PASS**.
- Validation stability gap được tính theo calibration cohort tương ứng: **PASS**.
- Same-candle ambiguity được xử lý theo hướng SL-first trong code path: **PASS**.
- Backtest trades chạy sequential/non-overlap benchmark: **PASS**.

## Performance

- Naive recompute test trước tối ưu với ~900 candles: khoảng 26 giây.
- Optimized precomputed technical series với ~1.000 candles: khoảng 0,25–0,35 giây Backtest Engine trong synthetic smoke test.
- Mục tiêu: phù hợp hơn cho server-side request trên Vercel.

## Version / deployment checks

- Package version `0.5.0`: kiểm tra trước khi đóng ZIP.
- Service worker cache `v0.5.0`: kiểm tra trước khi đóng ZIP.
- Không có `output: "export"`: kiểm tra trước khi đóng ZIP.
- Không cấu hình thư mục `out`: kiểm tra trước khi đóng ZIP.
- `.env.example` không chứa SSI credentials thật: kiểm tra trước khi đóng ZIP.

## Giới hạn môi trường kiểm thử

`npm install` vẫn timeout khi kết nối npm registry trong sandbox đóng gói, nên không thể chạy full `next build` với dependency thật tại đây. Source đã được kiểm tra bằng TypeScript 5.8.3 và offline stubs cho các module ngoài.

Khi deploy, Vercel sẽ chạy install/build trên hạ tầng Vercel.

**Vercel Output Directory phải để trống.** Project không sử dụng static export / thư mục `out`.
