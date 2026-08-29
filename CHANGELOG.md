# Changelog

## V0.8.0 — Quality & Observability

- Thêm Data Quality Guard cho market snapshot.
- Kiểm tra freshness, minimum candles, OHLC integrity, duplicate/non-monotonic timestamp, large gaps, zero-volume ratio và current-price consistency.
- Khóa Entry/SL/TP khi dữ liệu stale/invalid/không đủ mẫu.
- Watchlist không phát BUY/Entry notification khi Data Quality Guard đang khóa signal.
- Thêm Data Quality compact panel trong Analyze và Positions.
- Thêm Provider Diagnostics: primary/fallback/direct, reason, configured state, latency.
- Thêm `GET /api/system/health`.
- Thêm System Health & Diagnostics trong Settings.
- Thêm self-test cho Technical / Signal / Backtest Engine.
- Yahoo fallback thử query1/query2 để tăng khả năng phục hồi.
- Portfolio đánh dấu Data Quality theo từng vị thế và thêm warning ở cấp danh mục.
- Bump package, metadata và PWA cache lên 0.8.0.
- Giữ nguyên Spot-only; không Futures/SHORT/leverage/auto trade.
