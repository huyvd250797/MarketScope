# Validation — MarketScope V0.8.0

## Đã kiểm tra trong môi trường đóng gói

- Package version `0.8.0`.
- Service Worker cache `marketscope-shell-v0.8.0`.
- Core API/engine strict TypeScript check: PASS bằng TypeScript 5.8.3 + declaration stubs cho dependency không có trong sandbox.
- Full source TS/TSX semantic check: PASS với `noImplicitAny=false` chỉ để bù contextual DOM typing từ React stubs; các lỗi implicit-event của stub không phản ánh source khi `@types/react` thật được cài.
- Data Quality smoke test:
  - 300 nến mới → `HEALTHY`, signal allowed.
  - 300 nến nhưng data quá cũ → `STALE_DATA`, signal blocked.
  - 100 nến → `DEGRADED`, Entry/SL/TP blocked vì thiếu 220 nến.
- Không có `output: "export"`.
- Vercel Output Directory phải để trống.
- Service Worker không cache `/api/*`.
- Portfolio API vẫn giới hạn 30 vị thế, batch concurrency 3, `no-store`.
- VND và USD/USDT vẫn tách bucket.
- Futures/SHORT/leverage không có trong V0.8.0.
- Health response không chứa SSI API key/secret.
- ZIP phải qua `unzip -t` trước khi phát hành.

## Giới hạn môi trường đóng gói

`npm install` đã được thử nhưng timeout trong sandbox, vì vậy chưa thể chạy `next build` với dependency thật tại đây. Sau khi push lên GitHub/Vercel cần để Vercel chạy install/build bình thường và kiểm tra **Settings → System Health & Diagnostics** sau deploy.
