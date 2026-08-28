# V15.0.69 — RelationalProductionPush

## Mục tiêu

Sau khi tất cả thiết bị đã bật RelationalReadMode và RelationalWriteQueue, bản này thêm màn chốt dữ liệu chính thức để đánh dấu relational tables là nguồn dữ liệu chính.

## Luồng an toàn

1. Mở từng thiết bị, đảm bảo local queue = 0.
2. Trên một thiết bị chính, vào Cloud Sync → Đẩy dữ liệu chính thức.
3. Bấm **Đẩy queue + kiểm tra**.
4. Nếu preflight OK, bấm **Chốt Relational DB**.
5. JSON legacy `meyeube_sync` vẫn được giữ làm backup, chưa xóa.

## Điều kiện chốt

- ReadMode đang bật trên thiết bị hiện tại.
- RelationalWriteQueue đang bật trên thiết bị hiện tại.
- Local queue = 0.
- Server write queue không còn queued/processing/failed.
- Migration Doctor passed.
- Delta = 0.

## Phạm vi chưa làm

- Chưa xóa Migration/Doctor/Delta.
- Chưa xóa `meyeube_sync`.
- Chưa tắt hoàn toàn JSON backup.
