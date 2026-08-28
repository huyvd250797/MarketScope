# Thiết lập Device Push Notification — MeYeuBe V10.8.0

## 1. Chạy SQL
Mở Supabase SQL Editor và chạy toàn bộ file `supabase_setup.sql`.

Các bảng mới:
- `push_subscriptions`
- `push_delivery_log`

## 2. Tạo VAPID keys
Trên máy có Node.js:

```bash
npx web-push generate-vapid-keys
```

Lưu lại:
- Public Key: được nhập vào giao diện MeYeuBe trên từng thiết bị.
- Private Key: chỉ lưu trong Supabase Secrets, tuyệt đối không đưa vào frontend.

## 3. Cấu hình Supabase Secrets

```bash
supabase secrets set \
  VAPID_PUBLIC_KEY="PUBLIC_KEY" \
  VAPID_PRIVATE_KEY="PRIVATE_KEY" \
  VAPID_SUBJECT="mailto:your-email@example.com"
```

`SUPABASE_URL` và `SUPABASE_SERVICE_ROLE_KEY` được Supabase Edge Functions cung cấp trong môi trường runtime.

## 4. Deploy Edge Function

```bash
supabase functions deploy send-push
```

Function source:
`supabase/functions/send-push/index.ts`

## 5. Cấu hình trên app
Trên mỗi thiết bị:

1. Bật Cloud Sync và dùng cùng Sync ID.
2. Mở Cloud Sync → Thông báo thiết bị.
3. Nhập cùng VAPID public key.
4. Chọn loại cảnh báo muốn nhận.
5. Bấm Bật thông báo.
6. Bấm Gửi thử.

## 6. iPhone/iPad
Web Push yêu cầu app được thêm vào Màn hình chính:

1. Mở bằng Safari.
2. Chia sẻ → Thêm vào Màn hình chính.
3. Mở MeYeuBe từ biểu tượng.
4. Bấm Bật thông báo và chọn Cho phép.

## 7. Giới hạn V10.8.0
- Push theo sự kiện mới phát sinh khi một thiết bị đang chạy app và gửi alert tới Edge Function.
- Các cảnh báo hoàn toàn theo thời gian khi mọi thiết bị đều đóng app cần thêm Supabase Cron/Scheduled Function ở roadmap sau.
- RLS hiện tương thích chế độ gia đình dùng anon key; production nhiều gia đình nên chuyển sang Supabase Auth + RLS theo family_id.

## 8. V15.0.35 — Smart Alert Cron Push

Bản V15.0.35 bổ sung Edge Function `smart-alert-cron` để gửi Smart Alert theo giờ đã cấu hình dù không thiết bị nào đang mở app.

Cần deploy thêm:

```bash
supabase functions deploy send-push
supabase functions deploy smart-alert-cron
```

Sau đó tạo lịch chạy mỗi phút trong Supabase Dashboard:

```text
* * * * *
```

Tài liệu chi tiết: `docs/SMART_ALERT_CRON_SETUP.md`.
