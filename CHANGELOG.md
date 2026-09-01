# Changelog

## V0.12.0 — Smart Opportunity Scanner

### Added
- Module Smart Opportunity Scanner cho Crypto Spot, Stock VN và Forex/Metals.
- Opportunity Score 0–100: Signal 32% + Forecast 20% + Historical 18% + R:R 15% + Data Quality 15%.
- Scanner 2 tầng: preliminary scan → causal Forecast Validation shortlist → final ranking.
- Preset Top cơ hội / Gần Entry / Forecast mạnh / Accuracy tốt / R:R tốt / Mới chuyển BUY.
- Filter HEALTHY-only, BUY-only, minimum Opportunity, Accuracy và R:R.
- QUICK/WIDE scan scope.
- XAUUSD được ưu tiên trong Forex Scanner universe.
- Opportunity Scanner Engine self-test trong System Health.

### Mobile UX
- Bottom navigation tối ưu thành Analyze / Scanner / Watchlist / Positions / Thêm.
- History + Settings chuyển vào More bottom sheet, không xóa chức năng.
- Scanner dùng card ranking mobile-first, sticky chip controls và progressive details.
- Touch target action >= 44px; KPI chuyển 2×2 ở màn nhỏ.

### Guardrails
- Data Quality không đạt → Scanner không được đẩy mã lên đầu bảng.
- WAIT/AVOID bị giới hạn Opportunity Score.
- Opportunity Score không phải win rate/xác suất thắng.
- Scanner không auto trade; Crypto vẫn Spot/LONG-only.

### Version
- Package `0.12.0`.
- Service Worker cache `marketscope-shell-v0.12.0`.

## V0.11.0 — Forecast Validation & Historical Accuracy

### Added
- Rolling causal Forecast Validation theo đúng market/symbol/timeframe/effective profile.
- Direction Accuracy và Beta(2,2) calibrated direction accuracy.
- Range Hit Rate.
- Average/Median absolute forecast error.
- Calibration Gap giữa raw directional probability và kết quả lịch sử.
- Forecast confidence calibration theo historical sample size.
- Historical metrics riêng cho SHORT / MEDIUM / LONG.
- Tab History hoạt động thật.
- Local Forecast History tối đa 180 snapshots.
- Tự resolve forecast đã lưu khi đủ nến tương lai.
- History dashboard: resolved/pending, direction accuracy, range hit, error theo horizon.

### Changed
- Forecast card hiển thị calibrated confidence làm chỉ số chính và vẫn giữ raw confidence.
- Mỗi horizon hiển thị historical accuracy/range hit/sample count.
- Service Worker cache bump `marketscope-shell-v0.11.0`.
- Package/version metadata cập nhật 0.11.0.

### Guardrails
- Validation không dùng future candle tại origin.
- Mẫu nhỏ shrink về 50% bằng Beta(2,2).
- Historical accuracy không được mô tả như cam kết xác suất thắng tương lai.
- Data Quality Guard vẫn ưu tiên cao hơn Forecast/Signal.

## V0.10.0 — Forex & Multi-horizon Forecast UX
- Bổ sung Forex/Metals, Forecast ngắn/trung/dài và progressive disclosure cho Analyze.

## V0.9.0 — Strategy Profiles & Smart Analysis
- AUTO / Ngắn hạn / Swing / Trung hạn / Dài hạn xuyên Signal, Backtest, Watchlist và Positions.
