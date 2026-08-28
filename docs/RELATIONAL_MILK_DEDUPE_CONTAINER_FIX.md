# V15.0.71 — MilkIdentityDoctorUIFix

## Nguyên nhân

Khi bật ReadMode và WriteQueue, app đọc dữ liệu từ relational tables rồi dựng lại payload tương thích UI. Ở V15.0.69 một số record được export bằng UUID nội bộ của relational DB thay vì ID legacy ban đầu. Nếu legacy JSON hoặc thiết bị khác vẫn merge payload cũ, cùng một dữ liệu có thể bị xem là hai record khác nhau.

Nhóm rủi ro cao nhất là:

- `careEvents`
- `milkInventory`
- `milkContainers`
- `feed_milk_sources`

## Cách sửa

- Bổ sung `legacy_id` cho `care_events`, `milk_items`, `milk_containers`.
- Backfill `legacy_id` từ `meyeube_sync.data`.
- Relational export ưu tiên trả về legacy id thay vì UUID nội bộ.
- Chuẩn hóa `kind` của bình/túi về `binh` hoặc `tui`.
- App local normalize gộp trùng theo pumpEventId, shortCode, ngày giờ hút và container.
- Thêm Milk Data Doctor để kiểm tra nhanh lỗi double/lẫn loại.

## Lưu ý

Bản này vẫn không xóa JSON legacy. JSON legacy tiếp tục là backup trong giai đoạn ổn định production.
