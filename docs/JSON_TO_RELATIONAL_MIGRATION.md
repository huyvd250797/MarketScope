# V15.0.65 — RelationalMigrationDoctor

## Mục tiêu

Bản này thêm công cụ migration từ legacy JSON trong `public.meyeube_sync.data` sang các table relational đã tạo ở V15.0.61.

Bản này **chưa đổi nguồn đọc/ghi chính của app**. App vẫn đang hoạt động bằng cơ chế JSON/Cloud DB hiện tại cho đến các bản RelationalReadMode/RelationalWriteQueue sau.

## File cần chạy trên Supabase

Chạy file tổng hợp:

```text
SUPABASE_SETUP.sql
```

Hoặc nếu đã có schema V15.0.61, có thể chạy riêng:

```text
supabase/JSON_TO_RELATIONAL_MIGRATION_V15_0_65.sql
```

## RPC được tạo

```sql
select public.myb_preview_json_migration('be-bun-main');
select public.myb_migrate_json_to_relational('be-bun-main', false);
select public.myb_relational_migration_status('be-bun-main');
```

Trong app, vào:

```text
Menu → Cloud Sync → Migration JSON → Relational DB
```

Sau đó bấm:

```text
1. Backup JSON trước
2. Kiểm tra dữ liệu
3. Chạy migration
4. Xem trạng thái
```

## Nguyên tắc an toàn

- Không xóa `meyeube_sync`.
- Không xóa `data` JSON cũ.
- Migration idempotent: chạy lại sẽ update cùng ID ổn định, hạn chế nhân bản dữ liệu.
- Mỗi family được tạo theo `sync_id`.
- Mỗi row dùng UUID ổn định sinh từ legacy id/index.
- Có `migration_batches` để lưu batch migration.
- Có `change_logs` ghi nhận thao tác migration.

## Phạm vi mapping chính

- `settings` → `app_settings`
- `hb.members`, `healthBook` → `health_members`
- `baby`, `mom`, `hb.members[].meas` → `health_measurements`
- `hb.members[].visits` → `health_visits`
- `hb.members[].meds` → `health_medications`
- `hb.members[].vaccines` → `vaccine_catalog`, `child_vaccine_plans`, `vaccine_records`
- `careEvents` → `care_events` + detail tables feed/pump/sleep/diaper/temperature
- `milkInventory` → `milk_items` + `milk_transactions`
- `careEvents[].milkSources` → `feed_milk_sources` + milk ledger transactions
- `appointments` → `appointments`
- `diary` → `diary_entries`
- `milestones` → `milestones`
- `appointmentTypes`, `diaryTypes` → `care_categories`
- `hb.members[].other.files` → `media_files`

## Điều chưa làm ở bản này

- Chưa đọc dữ liệu từ table relational vào UI.
- Chưa ghi thêm/sửa/xóa trực tiếp vào table relational.
- Chưa tắt JSON Cloud DB cũ.
- Chưa xóa hoặc compact legacy JSON.

Bản tiếp theo đề xuất: `V15.0.65 - RelationalReadMode`.


## V15.0.65 Doctor

Sau khi migration thành công, chạy thêm `SUPABASE_SETUP.sql` bản V15.0.65 hoặc file `supabase/RELATIONAL_MIGRATION_DOCTOR_V15_0_65.sql` để tạo RPC kiểm tra dữ liệu `myb_relational_migration_doctor`.
