# V15.0.65 — RelationalMigrationDoctor

## Mục tiêu

Bản này bổ sung công cụ kiểm tra dữ liệu sau khi import từ `meyeube_sync.data` sang relational tables. Công cụ này chỉ đọc dữ liệu và trả báo cáo, không sửa/xóa dữ liệu và không chuyển app sang đọc/ghi table mới.

## Cách dùng

1. Chạy `SUPABASE_SETUP.sql` bản V15.0.65 trong Supabase SQL Editor để tạo RPC `myb_relational_migration_doctor`.
2. Deploy source app V15.0.65.
3. Vào app → Cloud Sync → Relational Migration Doctor.
4. Bấm **Chạy Doctor**.
5. Đọc kết quả `summary`, `checks`, `detail_counts`.

## Ý nghĩa trạng thái

- `passed`: không có lỗi/cảnh báo quan trọng, có thể chuẩn bị RelationalReadMode.
- `warning`: dữ liệu có điểm cần review nhưng chưa chắc chắn là lỗi.
- `error`: chưa nên bật RelationalReadMode. Cần xử lý lỗi trước.

## Nhóm kiểm tra

- So sánh số lượng JSON legacy và relational tables.
- Kiểm tra `families`, `app_settings`, `health_members`.
- Kiểm tra `care_events` và các bảng chi tiết `feed_events`, `pump_events`, `sleep_events`, `diaper_events`, `temperature_events`.
- Kiểm tra `milk_items`, `milk_transactions`, `feed_milk_sources`, ledger bị trừ quá lượng.
- Kiểm tra `vaccine_records`, `child_vaccine_plans`, `vaccine_catalog`.
- Kiểm tra `health_measurements`, trùng chỉ số cùng ngày.
- Kiểm tra media trỏ đúng hồ sơ.

## Lưu ý

Bản V15.0.65 vẫn giữ `normal_app_write_mode = unchanged_legacy_json`. Đây là bước kiểm tra an toàn trước khi xây dựng `RelationalReadMode`.
