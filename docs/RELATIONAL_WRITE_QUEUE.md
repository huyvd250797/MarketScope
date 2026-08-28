# V15.0.69 — RelationalWriteQueue

## Mục tiêu

Bản này thêm nền tảng ghi dữ liệu vào relational tables bằng hàng đợi, chuẩn bị cho giai đoạn thoát khỏi JSON lớn.

## Trạng thái mặc định

- Relational Write Queue mặc định tắt.
- App vẫn hoạt động bình thường nếu Boss chưa bật Read Mode/Write Queue.
- `meyeube_sync` vẫn được giữ làm backup legacy.
- Không xóa công cụ Migration / Doctor / Delta Sync.

## Khi bật Write Queue

Luồng lưu dữ liệu:

1. User thêm/sửa/xóa dữ liệu trong app.
2. App vẫn ghi local/cache/legacy backup để không mất dữ liệu.
3. App tạo operation id.
4. Snapshot dữ liệu hiện tại được đưa vào IndexedDB local queue.
5. Queue đẩy từng operation lên RPC `myb_apply_relational_payload_snapshot`.
6. Server khóa theo `family_id` bằng advisory lock.
7. Server cập nhật `meyeube_sync` làm backup.
8. Server soft-reset các row relational thuộc payload cũ bằng `deleted_at`.
9. Server hydrate lại relational tables từ payload mới.
10. Server ghi `change_logs` và `relational_write_queue`.

## RPC chính

- `myb_relational_write_preflight`
- `myb_relational_write_queue_status`
- `myb_apply_relational_payload_snapshot`
- `myb_soft_reset_relational_family_for_snapshot`

## Nguyên tắc an toàn

- Chỉ bật sau khi tất cả thiết bị cùng version.
- Trước khi bật cần Doctor passed và Delta = 0.
- Nếu RPC lỗi, operation vẫn còn trong local queue để đẩy lại.
- JSON legacy vẫn còn để rollback/export trong vài phiên bản chuyển đổi.

## Ghi chú kỹ thuật

V15.0.69 vẫn là bước chuyển tiếp. Vì app core hiện tại vẫn sử dụng payload nội bộ dạng JSON, Write Queue áp dụng cơ chế snapshot apply để bảo toàn tương thích UI hiện tại. Sau khi ổn định, bản tiếp theo có thể tách dần từng nghiệp vụ sang row-operation thật sự.
