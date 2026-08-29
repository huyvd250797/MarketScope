# Changelog

## V0.7.0 — Portfolio & Risk Management (Spot-only)

- Loại Futures khỏi roadmap/scope sản phẩm.
- Thêm quantity cho SavedPosition, tương thích dữ liệu V0.6.0 cũ.
- Thêm Portfolio dashboard ngay trong module Positions.
- Tổng hợp cost basis, current value, P/L theo từng currency bucket.
- Thêm allocation và concentration risk.
- Thêm downside-to-defensive-stop theo Position Engine.
- Thêm portfolio status HEALTHY / WATCH / HIGH_RISK.
- Cảnh báo nhiều vị thế bearish, concentration cao và risk actions.
- Thêm POST `/api/market/portfolio`, batch concurrency 3, no-store.
- Analyze tiếp tục không chứa Position/Portfolio để tránh quá tải dashboard.
- Bump package, PWA cache và metadata lên 0.7.0.
