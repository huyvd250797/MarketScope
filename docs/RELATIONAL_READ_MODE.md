# V15.0.67 — RelationalReadMode

## Mục tiêu

Bật chế độ đọc thử từ relational tables sau khi dữ liệu migration đã sạch. Bản này chưa chuyển app sang ghi relational tables.

## Điều kiện bật

- `myb_relational_migration_doctor` phải trả `status = passed`.
- `myb_relational_delta_counts` phải trả `total_delta = 0`.
- Nếu app vừa phát sinh thêm/sửa/xóa dữ liệu khi vẫn ghi JSON legacy, cần chạy Delta Sync rồi Doctor lại.

## Cách dùng

1. Chạy `SUPABASE_SETUP.sql` bản V15.0.67 trong Supabase SQL Editor.
2. Deploy source V15.0.67.
3. Vào `Cloud Sync → Relational Read Mode`.
4. Bấm `Kiểm tra Read Mode`.
5. Nếu đạt điều kiện, bấm `Bật Read Mode`.
6. Bấm `Đọc relational ngay` để áp dụng payload từ relational tables.

## Nguyên tắc an toàn

- Không xóa `meyeube_sync`.
- Không ghi vào relational tables từ app chính.
- Nếu preflight không đạt, app fallback về legacy JSON hiện tại.
- Nếu người dùng thêm/sửa/xóa sau khi bật Read Mode, app đánh dấu pending delta để tránh lần mở sau đọc table cũ.
