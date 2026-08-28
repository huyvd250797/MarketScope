# SupabaseDeleteTombstoneFix V15.0.46

Bản này chuẩn hóa Cloud DB Mode theo nguyên tắc:

1. Mọi thao tác xóa được lưu thành tombstone trong `_sync.tombstones`.
2. Khi merge hai thiết bị, record có timestamp cũ hơn tombstone sẽ bị loại bỏ.
3. Trước khi commit Cloud, app luôn fetch bản Cloud mới nhất.
4. Commit dùng CAS qua `updated_at`; nếu Cloud vừa thay đổi trong lúc lưu, app fetch lại, merge lại và thử commit lại.
5. `push`, `pull`, `smart sync`, `realtime` đều dùng chung logic merge có tombstone.

Điều này tránh lỗi máy cũ hồi sinh dữ liệu đã xóa sau khi đồng bộ.
