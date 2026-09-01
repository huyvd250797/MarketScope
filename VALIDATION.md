# Validation — MarketScope V0.11.0

## Version/config
- Package version: `0.11.0`.
- Service Worker cache: `marketscope-shell-v0.11.0`.
- Không dùng `output: "export"`.
- Vercel Output Directory phải để trống.

## Source checks
- Core Forecast/Validation/History strict TypeScript check: PASS với TypeScript 5.8.3.
- Forecast history types + causal validation types: PASS.
- JSON package/manifest parse: PASS.

## Forecast Validation smoke test
Synthetic Crypto 1h history được dùng để kiểm tra:

- causal origin generation: PASS
- không dùng nến tương lai để tạo forecast tại origin: PASS
- SHORT/MEDIUM/LONG target resolution: PASS
- direction accuracy nằm 0–100: PASS
- range hit rate nằm 0–100: PASS
- calibrated accuracy dùng Beta(2,2): PASS
- forecast calibration giữ raw confidence: PASS
- sample-limited confidence guardrail: PASS

Rolling validation được giới hạn tối đa 36 origins để giữ chi phí serverless hợp lý.

## Local History
- Deduplicate theo market:symbol:interval:profile:originTime.
- Tối đa 180 forecast snapshots.
- Pending scenario chỉ resolve khi có đủ số nến tương lai.
- History tách Crypto / Stock VN / Forex.
- History lưu localStorage; không chứa API secret.

## Full production build
Sandbox hiện tại không đảm bảo truy cập npm registry. Nếu `npm install` không thể tải dependency thì full `next build` cần chạy trên Vercel/CI hoặc máy local có mạng.
