# V15.0.72 — RelationalDataRescueDedupeFix

Bản này dùng để xử lý tình trạng dữ liệu bị nhân đôi khi vừa bật ReadMode + WriteQueue trong giai đoạn chuyển đổi.

## Nguyên tắc

- Không xóa ngay JSON legacy.
- Trước khi sửa server, lưu backup vào `relational_recovery_backups`.
- Dedupe JSON theo khóa nghiệp vụ, không chỉ theo UUID.
- Reset relational family rồi migrate lại từ JSON đã làm sạch.
- Snapshot write cũng được dedupe trước khi ghi để không nhân đôi lại.

## RPC

- `myb_relational_fast_duplicate_doctor`
- `myb_rebuild_relational_from_deduped_legacy`
- `myb_dedupe_legacy_payload_v1572`

## Cách dùng

1. Đóng hoặc tạm dừng thao tác trên thiết bị khác.
2. Chạy `SUPABASE_SETUP.sql`.
3. Deploy app V15.0.72.
4. Vào Cloud Sync → Data Rescue & Dedupe.
5. Bấm kiểm tra double nhanh.
6. Bấm cứu dữ liệu server nếu còn double.
7. Chạy lại Doctor/Delta sau khi cứu.
