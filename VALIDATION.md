# Validation — MarketScope V0.4.0

Các kiểm tra đã thực hiện trước khi đóng gói:

- TS/TSX semantic type check toàn source bằng TypeScript 5.8.3 + stub offline Next/React/Lightweight Charts/SSI: **PASS**.
- Position Engine compile độc lập: **PASS**.
- Position Engine smoke test: **PASS**.
  - Crypto uptrend + vị thế đang lãi → Protect/Take Partial.
  - Crypto downtrend + entry cao hơn hiện tại → Reduce Risk/Exit Risk.
  - Stock VN synthetic daily + vị thế có lãi → Exit Planner hợp lệ.
- P/L tính từ `entryPrice` và `currentPrice`: **PASS**.
- Ba target luôn tăng dần `SHORT < MEDIUM < LONG`: **PASS**.
- Target luôn nằm trên `max(entryPrice, currentPrice)` trong smoke test: **PASS**.
- Position protection trả mốc hợp lệ và đánh dấu breached khi giá xuyên mốc: **PASS**.
- Chart có overlay riêng `POSITION`: **PASS**.
- Positions lưu localStorage theo `market + symbol`, tối đa 30 bản ghi: **PASS**.
- JSON / manifest parse: **PASS**.
- Local import resolution: **PASS**.
- Không có `output: "export"` và không cấu hình thư mục `out`: **PASS**.
- `.env.example` không chứa SSI credentials thật: **PASS**.
- Service worker cache được bump lên `v0.4.0`: **PASS**.
- V0.4.0 không đưa win rate/expectancy/time-to-target giả vào UI: **PASS**.

## Giới hạn môi trường kiểm thử

`npm install` bị timeout khi kết nối npm registry trong sandbox đóng gói, vì vậy không thể chạy full `next build` với dependency thật tại đây. Source đã được type-check offline bằng TypeScript 5.8.3 và stub tương thích với API đang dùng. Khi deploy, Vercel sẽ chạy `npm install` và `next build` trên hạ tầng của Vercel.

**Vercel Output Directory phải để trống.** Project không sử dụng static export / thư mục `out`.
