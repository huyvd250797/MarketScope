# V15.0.67 — RelationalReadMode

Mục tiêu: đồng bộ phần dữ liệu JSON legacy phát sinh sau lần migration đầu tiên sang relational tables mà không chạy lại theo kiểu tạo trùng.

## Khi nào dùng

Sau khi đã chạy `myb_migrate_json_to_relational`, app vẫn đang ở chế độ `unchanged_legacy_json`. Vì vậy nếu người dùng tiếp tục thêm/sửa/xóa dữ liệu, `public.meyeube_sync.data` có thể mới hơn relational tables. Doctor sẽ báo lệch, ví dụ `careEvents expected 1570 / actual 1569`.

## Cách dùng

1. Chạy `SUPABASE_SETUP.sql` bản V15.0.67 trong Supabase SQL Editor.
2. Deploy source V15.0.67.
3. Vào app → Cloud Sync → Relational Delta Sync.
4. Bấm **Preview Delta**.
5. Nếu `total_delta > 0`, bấm **Chạy Delta Sync**.
6. Chạy lại **Relational Migration Doctor**.

## RPC mới

- `myb_relational_delta_counts(p_sync_id text)`
- `myb_preview_relational_delta_sync(p_sync_id text)`
- `myb_sync_json_to_relational_delta(p_sync_id text, p_preview_only boolean)`

## Nguyên tắc an toàn

- Không xóa `public.meyeube_sync.data`.
- Không bật RelationalReadMode.
- Không đổi normal app read/write mode.
- Dùng stable ID để map dữ liệu legacy sang row relational.
- Dùng upsert/idempotent migration writer để tránh duplicate.
- Sau khi chạy xong nên dùng Doctor kiểm tra lại trước khi chuyển sang RelationalReadMode.

## Phạm vi kiểm tra delta

- Health members
- Health measurements
- Care events
- Milk items
- Milk containers
- Diary entries
- Milestones
- Appointments
- Vaccine records

## Kỳ vọng

Nếu Doctor chỉ lệch do JSON legacy phát sinh thêm dữ liệu sau migration, Delta Sync sẽ đưa relational tables về khớp lại. Mục tiêu sau cùng là Doctor không còn lỗi đỏ trước khi bật bản đọc relational.
