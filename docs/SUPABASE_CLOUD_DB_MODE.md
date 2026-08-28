# V15.0.44 — SupabaseCloudDBMode

## Mục tiêu

Chuyển DB chính của app sang Supabase để tránh đầy localStorage khi dữ liệu lớn.

## Cách hoạt động

- Supabase bảng `public.meyeube_sync` là nguồn lưu chính.
- `localStorage` chỉ giữ cấu hình nhỏ như URL, anon key, Sync ID, Device ID, push settings.
- DB chính được cache tạm trong IndexedDB `meYeuBeCloudDBMode_v1` để mở lại khi mạng yếu.
- Khi Cloud DB Mode bật, app không ghi toàn bộ DB vào key `meYeuBePWA_v4` nữa.
- Nếu còn DB cũ trong localStorage, app sẽ đẩy lên Supabase lần đầu rồi xoá key DB chính khỏi localStorage.

## Thiết lập

1. Chạy `SUPABASE_SETUP.sql` trong Supabase SQL Editor.
2. Vào app → Cloud Sync.
3. Nhập Project URL, Publishable/anon key, Sync ID.
4. Bật đồng bộ.
5. Chọn `Supabase Cloud DB chính`.
6. Bấm `Lưu cấu hình`.
7. Bấm `Test kết nối`.
8. Bấm `Đẩy lên Cloud` nếu thiết bị hiện tại đang có dữ liệu đầy đủ nhất.

## Lưu ý

- Khi mất mạng, app giữ dữ liệu tạm trong IndexedDB và sẽ đẩy lại khi online.
- Không nên mở nhiều thiết bị và sửa cùng một record đúng cùng thời điểm.
- File ảnh/PDF lớn nên lưu bằng cơ chế Storage/IndexedDB, không nhúng base64 vào DB chính.
