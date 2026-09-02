# CHANGELOG — MarketScope

## V0.13.0 — Alert Center & Opportunity Monitoring

Nâng trực tiếp từ V0.12.0 Smart Opportunity Scanner.

### Alert Center
- Thêm biểu tượng chuông trên header kèm unread badge.
- Alert Center mobile-first với filter: Tất cả, Quan trọng, BUY, Position, Forecast, Scanner, Data.
- Priority: CRITICAL / HIGH / MEDIUM / INFO.
- Đánh dấu đã đọc, đánh dấu tất cả, xóa lịch sử.
- Alert được lưu localStorage tối đa 160 event.

### Event engine
- WAIT/AVOID → BUY.
- BUY → WAIT/AVOID.
- Giá đi vào Entry Zone.
- Chạm/phá Stop Loss.
- Chạm TP1 / TP2 / TP3.
- Forecast đổi bias hoặc confidence thay đổi mạnh.
- Opportunity Score vượt threshold hoặc tăng >= 15 điểm.
- Mã lọt Top 3 Scanner.
- Position action đổi sang PROTECT_PROFIT / TAKE_PARTIAL / REDUCE_RISK / EXIT_RISK.
- Data Quality của watchlist/position chuyển khỏi HEALTHY.

### Dedupe & cooldown
- Fingerprint riêng theo market/symbol/timeframe/profile/event.
- Không spam cùng event liên tục.
- Cooldown cấu hình 5–120 phút, mặc định 30 phút.
- Event tái diễn sau cooldown tăng counter thay vì tạo hàng loạt bản ghi giống nhau.

### Opportunity Monitoring
- Watchlist monitor xuyên session khi app visible, khoảng 5 phút/lần.
- Scanner monitor Top candidates khoảng 10 phút/lần.
- Positions/Portfolio monitor khoảng 10 phút/lần.
- Scanner vẫn giữ quét hai tầng từ V0.12.0.

### Browser/PWA notifications
- Alert Center dùng chung quyền browser notification.
- Browser notification chỉ phát cho event mới sau dedupe/cooldown.
- Service Worker không cache /api/*.
- Chưa phải push cloud 24/7 khi app đóng hoàn toàn.

### API
- /api/market/monitor bổ sung forecast compact để phát hiện Forecast change mà không cần full Forecast Validation.

### Mobile UX
- Bottom nav vẫn 5 mục: Analyze / Scanner / Watchlist / Positions / Thêm.
- Alert Center mở bằng chuông header, không thêm tab thứ 6.
- Alert list dùng card, chip filter cuộn ngang, settings gọn.
