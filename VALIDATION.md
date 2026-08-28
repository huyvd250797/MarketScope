# Validation — MarketScope V0.3.0

Các kiểm tra đã thực hiện trước khi đóng gói:

- TS/TSX syntax parse bằng TypeScript 5.8.3: **PASS**.
- Semantic type check cho Technical + Signal Engine: **PASS**.
- Full source semantic type check bằng stub offline cho Next/React/Lightweight Charts/SSI: **PASS**.
- Signal Engine smoke test: **PASS**.
  - Uptrend + pullback hợp lệ → `BUY`.
  - Strong downtrend → `AVOID`.
  - Strong uptrend nhưng RSI quá mua cực đoan → `AVOID`.
  - Range gần support nhưng chưa đủ rule → `WAIT`.
  - Stock VN synthetic uptrend + pullback → `BUY`.
- Với setup có Entry: `SL < Entry Low`, `Entry Low < Entry High`, đủ TP1–TP3 và tất cả TP nằm trên Entry midpoint: **PASS**.
- Signal Score luôn trong `0–100`: **PASS**.
- JSON / manifest parse: **PASS**.
- Local import resolution: **PASS**.
- Không có `output: "export"` và không cấu hình thư mục `out`: **PASS**.
- `.env.example` không chứa SSI credentials thật: **PASS**.
- Service worker cache được bump lên `v0.3.0`: **PASS**.
- V0.3.0 không đưa win rate giả vào UI/API; Signal Score được ghi rõ không phải xác suất thắng: **PASS**.

## Giới hạn môi trường kiểm thử

`npm install` bị timeout khi kết nối npm registry trong sandbox đóng gói, vì vậy không thể chạy full `next build` với dependency thật tại đây. Source đã được type-check offline với TypeScript 5.8.3 và stub tương thích API đang dùng. Khi deploy, Vercel sẽ chạy `npm install` và `next build` trên hạ tầng của Vercel.

**Vercel Output Directory phải để trống.** Project không sử dụng static export / thư mục `out`.
