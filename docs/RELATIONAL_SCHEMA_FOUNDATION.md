# V15.0.61 — RelationalSchemaFoundation

## Mục tiêu

Bản này tạo nền tảng database quan hệ cho app Mẹ Yêu Bé, nhằm thay thế dần mô hình lưu toàn bộ dữ liệu trong một JSON lớn ở bảng `meyeube_sync`.

Quan trọng: bản này **chưa cho app ghi vào table mới**. App vẫn hoạt động bằng cơ chế hiện tại. Các table relational được tạo sẵn để chuẩn bị cho các bước migration tiếp theo.

## File chính

- `supabase/RELATIONAL_SCHEMA_V15_0_61.sql`
- `SUPABASE_SETUP.sql`
- `supabase_setup.sql`

Boss có thể chạy `SUPABASE_SETUP.sql` trong Supabase SQL Editor để tạo cả bảng legacy và các table mới.

## Nhóm table đã tạo

### Core

- `families`
- `family_users`
- `devices`
- `app_settings`

### Sổ sức khỏe

- `health_members`
- `health_measurements`
- `health_visits`
- `health_medications`
- `health_allergies`
- `health_labs`

### Tiêm chủng

- `vaccine_catalog`
- `vaccine_schedule_templates`
- `child_vaccine_plans`
- `vaccine_records`
- `vaccine_reminders`

### Chăm sóc hằng ngày

- `care_events`
- `feed_events`
- `pump_events`
- `sleep_events`
- `diaper_events`
- `temperature_events`

### Kho sữa

- `milk_containers`
- `milk_items`
- `milk_transactions`
- `feed_milk_sources`
- view `milk_item_balances`

### Nhắc lịch / push

- `appointments`
- `smart_alert_rules`
- `push_subscriptions`
- `push_delivery_logs`

### Media / file

- `media_files`

Bảng này chỉ lưu metadata file. File thật sẽ nằm ở Supabase Storage hoặc IndexedDB. Không lưu base64 vào DB chính.

### Nhật ký / cột mốc / danh mục

- `diary_entries`
- `milestones`
- `care_categories`

### Realtime / migration

- `change_logs`
- `migration_batches`

## Legacy vẫn giữ

Bảng `meyeube_sync` vẫn được giữ làm backup legacy:

- App hiện tại vẫn có thể hoạt động như cũ.
- Dữ liệu JSON cũ chưa bị xóa.
- Các bản migration sau sẽ đọc từ `meyeube_sync.data` để import sang table mới.

## RLS

Các table mới đã bật RLS.

Rule chính dùng `family_id` thông qua helper:

```sql
public.myb_can_access_family(family_id)
```

Helper này dựa vào bảng `family_users` và Supabase Auth. Trong giai đoạn hiện tại, app chưa ghi table mới nên chưa ảnh hưởng sử dụng thực tế.

## updated_at trigger

Có trigger tự cập nhật `updated_at` cho các table nghiệp vụ chính.

## Lộ trình tiếp theo

### V15.0.65 — RelationalMigrationDoctor

- Tạo màn kiểm tra migration.
- Đọc JSON từ `meyeube_sync.data`.
- Import sang table mới.
- So sánh số lượng trước/sau.
- Không xóa JSON cũ.

### V15.0.65 — RelationalReadMode

- App bắt đầu đọc dữ liệu từ table mới.
- Nếu table mới trống thì fallback JSON legacy.

### V15.0.65 — RelationalWriteQueue

- Thêm/sửa/xóa bắt đầu ghi table mới qua queue/RPC.
- Không ghi nguyên DB JSON nữa.

### V15.0.65 — RelationalMilkLedger

- Chuẩn hóa Hút sữa / Kho sữa / Bé bú từ kho bằng transaction ledger.

## Ghi chú an toàn

Không nên tắt `meyeube_sync` ngay ở giai đoạn này. Chỉ tắt JSON DB chính sau khi migration, read mode và write queue đã ổn định.
