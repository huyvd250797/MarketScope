# Changelog

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
