# MeYeuBe V15.0.35 — Smart Alert Cron Push

Mục tiêu: Smart Alert vẫn gửi thông báo đúng giờ cho tất cả thiết bị đã bật Web Push, kể cả khi không thiết bị nào đang mở app.

## Luồng hoạt động

1. App vẫn lưu dữ liệu lên `public.meyeube_sync` qua Cloud Sync.
2. Mỗi thiết bị bật thông báo được lưu trong `public.push_subscriptions`.
3. Supabase Scheduled Function gọi `smart-alert-cron` mỗi 1 phút.
4. Function đọc dữ liệu cloud, đánh giá Smart Alert và gửi Web Push tới tất cả subscription cùng Sync ID.
5. `push_delivery_log` chặn gửi trùng cùng một cảnh báo tới cùng một thiết bị.

Ví dụ: bé bú lúc `08:00`, cấu hình Smart Alert `Nhắc sau 15 phút`, đến khoảng `08:15` cron sẽ gửi push dù app đang đóng.

## Deploy Edge Functions

```bash
supabase functions deploy send-push
supabase functions deploy smart-alert-cron
```

## Secrets cần có

```bash
supabase secrets set \
  VAPID_PUBLIC_KEY="PUBLIC_KEY" \
  VAPID_PRIVATE_KEY="PRIVATE_KEY" \
  VAPID_SUBJECT="mailto:your-email@example.com" \
  SMART_ALERT_TZ_OFFSET_MIN="420"
```

`SMART_ALERT_TZ_OFFSET_MIN=420` là giờ Việt Nam UTC+7.

## Tạo lịch chạy mỗi phút

Cách khuyến nghị: vào Supabase Dashboard → Edge Functions → `smart-alert-cron` → Schedule → chọn `* * * * *`.

Hoặc dùng CLI nếu dự án đã bật Scheduled Functions:

```bash
supabase functions deploy smart-alert-cron
# Sau đó tạo schedule trong Dashboard hoặc theo tài liệu Supabase Cron hiện tại.
```

## Lưu ý

- Thiết bị vẫn phải từng bấm “Bật thông báo”.
- iPhone/iPad cần mở app từ biểu tượng PWA trên Màn hình chính để cấp quyền Web Push.
- Cron phụ thuộc Cloud Sync: dữ liệu mới nhất phải được đẩy lên Cloud.
- Function chỉ gửi các cảnh báo mức `warning` hoặc `critical`.
