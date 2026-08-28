# V15.0.72 — RelationalDataRescueDedupeFix

- Bổ sung Data Rescue & Dedupe để xử lý dữ liệu bị double sau khi bật ReadMode/WriteQueue.
- Fast Duplicate Doctor thay Milk Identity Doctor nặng, tránh lỗi statement timeout 500.
- Backup JSON trước khi sửa vào `relational_recovery_backups`.
- Dedupe JSON theo khóa nghiệp vụ rồi rebuild relational tables.
- Snapshot write queue tự dedupe payload trước khi ghi.

# V15.0.72 — RelationalDataRescueDedupeFix

- Sửa lỗi dữ liệu bị double khi thiết bị vừa bật ReadMode/WriteQueue vừa còn nhận legacy JSON.
- Chuẩn hóa ID legacy cho care events, kho sữa và danh mục bình/túi để không bị đổi UUID qua mỗi lần đọc/ghi relational.
- Vá lỗi bình sữa/túi sữa bị lẫn loại do containerId/containerKind không ổn định.
- Thêm Milk Data Doctor để kiểm tra trùng kho sữa, trùng care event và container kind bất thường.
- Relational Write Queue vẫn giữ JSON legacy làm backup, nhưng payload xuất ra dùng ID ổn định để tránh merge nhân đôi.

# V15.0.72 — RelationalDataRescueDedupeFix

- Thêm màn **Đẩy dữ liệu chính thức** trong Cloud Sync.
- Kiểm tra ReadMode, WriteQueue, local queue, server queue, Doctor và Delta trước khi chốt.
- Thêm RPC chốt relational tables làm nguồn dữ liệu chính thức.
- Vẫn giữ `meyeube_sync` làm backup legacy, chưa xóa công cụ migration.

# V15.0.72 — RelationalWriteQueue

- Thêm nền tảng Relational Write Queue, mặc định tắt để không ảnh hưởng thiết bị đang dùng JSON legacy.
- Thêm bảng `relational_write_queue` và RPC ghi snapshot relational có advisory lock theo `family_id`.
- Thêm giao diện Cloud Sync để kiểm tra, bật/tắt, flush queue và xem trạng thái Write Queue.
- Khi bật, thao tác lưu vẫn giữ `meyeube_sync` làm backup legacy, đồng thời enqueue và đẩy tuần tự sang relational tables.
- Giữ nguyên Migration / Doctor / Delta Sync để dùng trong giai đoạn chuyển đổi.

# V15.0.72 — RelationalReadMode

- Thêm chế độ đọc thử dữ liệu từ relational tables trong Cloud Sync.
- Mặc định tắt; chỉ bật khi Migration Doctor đạt passed và Delta Sync = 0.
- Thêm RPC `myb_relational_read_preflight` và `myb_export_relational_legacy_payload`.
- Khi đọc relational, app dựng lại payload tương thích UI hiện tại, vẫn giữ `meyeube_sync` làm backup legacy.
- Chưa chuyển normal write sang relational: thêm/sửa/xóa vẫn đi qua JSON legacy/Cloud Queue để an toàn.
- Nếu phát sinh dữ liệu mới sau khi bật Read Mode, app tự đánh dấu pending delta và fallback legacy cho đến khi chạy Delta Sync + Doctor lại.

# V15.0.72 — RelationalReadMode

- Thêm công cụ Delta Sync để đồng bộ dữ liệu JSON legacy phát sinh sau migration sang relational tables.
- Thêm RPC preview/chạy delta: `myb_preview_relational_delta_sync`, `myb_sync_json_to_relational_delta`.
- Delta Sync giữ `meyeube_sync` làm backup legacy, không bật RelationalReadMode và không đổi normal app write mode.
- Hỗ trợ kiểm tra `missing_counts`, `changed_counts`, `total_delta` trước khi chạy.

# V15.0.72 — RelationalReadMode

- Sửa lỗi chạy `SUPABASE_SETUP.sql` trên Supabase project đã có bảng legacy thiếu cột `family_id`.
- Thêm compatibility repair block trước index/trigger/RLS để tự bổ sung `family_id`, `created_at`, `updated_at`, `deleted_at` khi cần.
- Vá riêng bảng legacy `push_subscriptions` để không còn lỗi policy `push_subscriptions_family_all`.
- Không thay đổi cơ chế app hiện tại; relational tables vẫn chưa là nguồn đọc/ghi chính.

# V15.0.72 — RelationalSchemaOrderFix

- Sửa lỗi chạy SQL schema trong Supabase bị `relation "public.family_users" does not exist`.
- Tạo bootstrap `families` và `family_users` trước hàm `myb_can_access_family`.
- Giữ nguyên phạm vi V15.0.62: chỉ chuẩn bị schema + migration tool, chưa chuyển app sang đọc/ghi relational tables.

# V15.0.72 — RelationalSchemaOrderFix

- Thêm công cụ migration JSON legacy `meyeube_sync.data` sang relational tables.
- Thêm RPC `myb_preview_json_migration`, `myb_migrate_json_to_relational`, `myb_relational_migration_status`.
- Thêm UI trong Cloud Sync để kiểm tra/chạy migration thủ công.
- Giữ `meyeube_sync` làm backup legacy, chưa đổi app sang đọc/ghi table mới.
- Dọn file setup Supabase trùng tên, chỉ giữ `SUPABASE_SETUP.sql`.

# V15.0.72 — RelationalSchemaOrderFix

- Thêm công cụ migration JSON legacy `meyeube_sync.data` sang relational tables.
- Thêm RPC preview/run/status cho migration.
- Thêm UI trong Cloud Sync để kiểm tra/chạy migration thủ công.
- Giữ `meyeube_sync` làm backup legacy, chưa đổi app sang đọc/ghi table mới.
- Dọn file setup Supabase trùng tên, giữ `SUPABASE_SETUP.sql`.


## V15.0.72 — RelationalSchemaOrderFix
- Nâng Tiêm chủng thành module riêng trong Sổ sức khỏe.
- Thêm giao diện Tổng quan / Lịch tiêm / Sổ tiêm / Báo cáo.
- Tạo lịch tiêm dự kiến theo ngày sinh của bé và mốc tuổi cơ bản.
- Dữ liệu tiêm lưu chung `m.vaccines` để Sổ sức khỏe hiện có đọc lại được.

# V15.0.72 — BabyMetricEntrySaveFix

- Fix khai báo chỉ số bé không hiện dữ liệu sau khi lưu.
- Lưu chỉ số vào đúng hồ sơ Sổ sức khỏe đang chọn.
- Đồng bộ chỉ số Bé sang dữ liệu tăng trưởng/Dashboard để kiểm tra và biểu đồ nhận ngay.
- Scope fix riêng cho chỉ số sức khỏe, giữ nguyên các chức năng khác.

# V15.0.72 — CloudSaveQueueFix

- Fix lỗi không chọn được đối tượng trong Sổ sức khỏe do `hb.activeId` bị Cloud/realtime ghi đè.
- Active member được giữ cục bộ theo thiết bị bằng `hb2State/localStorage` nhỏ, không xem là dữ liệu Cloud authoritative.
- Bấm chip Ba/Mẹ/Bé không gọi `save()` nên không tạo vòng lặp sync.
- Lưu/sửa hồ sơ sẽ cập nhật đúng member đang được chọn.

# V15.0.72 — CloudSaveQueueFix

- Fix lỗi Cloud DB load thất bại do `db.healthBook.map is not a function`.
- Bổ sung HealthBook normalize guard cho startup/realtime/cloud merge.
- Không để payload Cloud cũ sai cấu trúc làm app rỗng dữ liệu.

# V15.0.72 — CloudRealtimeAuthoritativeFix

- Chuẩn hóa quản lý dữ liệu Cloud DB/realtime để không còn tình trạng lưu xong bị dữ liệu cũ ghi đè.
- Thêm section stamp cho Sổ sức khỏe, cấu hình Dashboard và các nhóm dữ liệu quan trọng.
- Boot app ưu tiên cache IndexedDB rồi merge Cloud, tránh Cloud cũ đè dữ liệu mới.
- Realtime chỉ merge an toàn, không thay thế một chiều.

# V15.0.72 — CloudRealtimeAuthoritativeFix

- Khắc phục lỗi sau khi sửa Sổ sức khỏe, app báo lưu thành công nhưng Cloud/realtime tự load lại dữ liệu trước đó.
- Cải thiện merge `db.hb.members` theo ID + timestamp commit cục bộ.
- Chặn bản Cloud/cache cũ ghi đè hồ sơ vừa sửa trên thiết bị hiện tại.

# V15.0.72 — CloudRealtimeAuthoritativeFix

- Fix Sổ sức khỏe bị nhân nhiều hồ sơ “Bé” khi Cloud DB/cache trống merge vào.
- Sửa merge cho `db.hb.members` vì đây là mảng lồng trong object `hb`, không phải top-level array.
- Thêm archive hồ sơ thành viên có dữ liệu để phục hồi Ba/Mẹ khi thiết bị khác đẩy bản thiếu.
- Dedupe các hồ sơ Bé rỗng sinh ra từ nhiều thiết bị, giữ hồ sơ Bé giàu dữ liệu nhất.
- Khi render Sổ sức khỏe, members được repair trước để không hiển thị sai toàn Bé.

# V15.0.72 — StartupLoadingWatchdogFix

- Fix lỗi kẹt loading khi mở app trong Supabase Cloud DB Mode.
- Preload cache IndexedDB nhanh, kéo Supabase có timeout an toàn.
- Nếu Cloud chậm, app mở cache trước và đồng bộ nền, không đứng mãi ở splash/loading.

# V15.0.72 — StoredFeedInventoryLinkFix

- Fix Bé bú từ kho: nhập ml tự động lấy bình/túi theo hạn dùng gần nhất.
- Fix picker thủ công không thấy bình/túi do đọc nhầm localStorage cũ thay vì Cloud DB/cache hiện tại.
- Tăng/giảm ml tự co/giãn lượng lấy từ kho; chỉ bấm ✕ túi mới chuyển sang thủ công.
- Túi vừa bỏ bằng ✕ được hoàn khả dụng để chọn lại thủ công.


## V15.0.72 — QuietCloudToastFix

- Giảm nhiễu toast Cloud/merge khi mở app.
- Các thao tác nội bộ Supabase, realtime, preload, cache, merge không hiện toast riêng lẻ.
- Sau khi kết nối/đồng bộ hoàn tất và không lỗi, chỉ hiện “Đã kết nối”.
- Lỗi Cloud/Supabase vẫn hiển thị để tránh bỏ sót vấn đề.

## V15.0.72 — QuietCloudToastFix

- Fix lỗi nghiêm trọng: xóa dữ liệu trên một máy nhưng máy khác đồng bộ làm dữ liệu bị hồi sinh.
- Thêm operation log/tombstone cho thao tác xóa trong Cloud DB Mode.
- Push/Pull/Smart Sync/Realtime đều dùng merge có tombstone, không overwrite một chiều.
- Commit lên Supabase dùng vòng lặp fetch → merge → CAS theo `updated_at`; nếu có máy khác vừa lưu, app merge lại trước khi đẩy.

## V15.0.72 — QuietCloudToastFix

- Fix lỗi nghiêm trọng Cloud DB Mode: thiết bị cũ/stale không còn được ghi đè toàn bộ dữ liệu trên Supabase.
- Mọi thao tác lưu Cloud DB đều fetch bản Cloud hiện tại trước, sau đó merge theo record rồi mới upsert.
- Tải Cloud về, Đẩy Cloud lên, Đồng bộ 2 chiều và Realtime đều chuyển sang cơ chế gộp an toàn, không replace một chiều.
- Nếu dữ liệu trên thiết bị ít hơn cache/Cloud bất thường, app tự gộp lại để tránh mất ghi nhận mới.
- Bổ sung metadata Cloud Merge Guard để truy vết lần gộp/lưu an toàn.

# V15.0.72 — SupabaseCloudDBMode

- Sửa lỗi chọn ảnh giấy tờ nhưng bấm Lưu báo “File chưa được lưu”.
- Sửa đọc ảnh sau nén: tương thích hàm compressImageFiles trả về chuỗi dataURL.
- Thêm fallback đọc ảnh gốc khi ảnh không nén được trên iOS/Safari.

# V15.0.72 — SupabaseCloudDBMode

- Bổ sung modal chi tiết bé khi bấm tên bé trên Dashboard.
- Ẩn ngày sinh / thông tin lúc sinh khỏi Dashboard, chuyển vào modal chi tiết.
- Thêm tuổi theo năm-tháng-tuần-ngày, theo tháng, theo tuần và theo ngày.
- Bổ sung nhóm giấy tờ, BHYT, chỉ số sức khỏe, tiêm chủng, khám gần nhất, dị ứng và ghi chú.
- Tối ưu sidebar để phiên bản sát đáy hơn và tăng diện tích cuộn menu.
- Khóa scroll nền khi mở modal/sheet.
- Bổ sung safe navigation để hạn chế lỗi bấm chức năng làm reset/mở lại app.

# V15.0.72 — StoredFeedFastAutoFix

- Tối ưu thao tác tăng/giảm ml trong form Sửa Bé bú từ kho, không còn delay do load/normalize toàn bộ DB khi bấm nút.
- Tăng/giảm ml luôn chạy auto-pick ngay và giữ badge TỰ ĐỘNG.
- Chỉ thao tác ✕ bỏ túi mới chuyển sang THỦ CÔNG.
- Khi bỏ túi bằng ✕, túi được hoàn khả dụng ngay trong form; mở Thêm túi sữa sẽ thấy lại túi đó với lượng có thể dùng.

# V15.0.72 — StoredFeedFastAutoFix

- Bé bú từ kho khi sửa sẽ tự điều chỉnh lại nguồn sữa theo số ml.
- Giảm ml sẽ tự trả túi thừa về kho khi lưu.
- Tăng ml sẽ tự thêm túi khả dụng nếu cần.
- Chỉ bấm ✕ mới chuyển sang thủ công.

# V15.0.34 — SmartAlertCronPush

- Thêm Supabase Edge Function `smart-alert-cron` để chạy Smart Alert nền mỗi phút.
- Thêm/chuẩn hóa `send-push` Edge Function trong source.
- Smart Alert “Cữ bú quá giờ” báo theo đúng số phút cấu hình sau cữ bú gần nhất.
- Thêm tài liệu `docs/SMART_ALERT_CRON_SETUP.md`.

## V15.0.32 — TransferScrollLockFix
- Yêu cầu nhập PIN khi Lưu Cloud, Đẩy/Tải Cloud, Sync Cloud 2 chiều.
- Yêu cầu PIN khi Nhập/Restore/Xuất/Xoá Backup và Nhập/Xuất/Xoá DB JSON.
- Collapse mặc định phần Dữ liệu & sao lưu (JSON nhanh).

## V15.0.32 — MilkLedgerFix
- Rebuild Kho sữa theo ledger an toàn.
- Ẩn bình/túi quá hạn khỏi Đang bảo quản và auto-pick Bé bú.
- Không tự khôi phục remaining cho bình/túi đã hủy/đã dùng hết.

## V15.0.27 — InventoryRepairFix
- Khôi phục đúng nguồn bình/túi khi mở sửa Bé bú từ kho, kể cả dữ liệu cũ bị lệch milkSources/snapshot.
- Chặn auto-pick chọn thêm túi khi đang sửa record đã lưu.
- Ẩn an toàn bản kho sữa trùng do lỗi liên kết pumpEventId nếu không còn được feed/transfer tham chiếu.
- Taskbar chỉ còn icon +.

## V15.0.26 — InventoryEditFix
- Fix mở sửa Bé bú từ kho phải khôi phục đúng bình/túi đã dùng trong record, không tự chọn thêm bình/túi khác.
- Chặn auto chọn túi trong lúc hydrate form sửa để tránh trừ kho lặp.
- Nút + taskbar chỉ còn icon, bỏ chữ Ghi nhận.

## V15.0.26 — InventorySafeFix
- Fix taskbar: chữ Ghi nhận đè lên icon + theo yêu cầu, không bị che.
- Fix cập nhật Bé bú từ kho bằng delta an toàn thay vì release/apply toàn bộ.
- Fix cập nhật Hút sữa dùng ledger tiêu thụ thực tế, tránh trạng thái 100/50ml sai.

## V15.0.26 — InventorySafeFix
- Fix icon + giữa taskbar bị cắt mất phần trên.
- Giữ nguyên giao diện taskbar, chỉ bỏ clipping ở khung cha.

## V15.0.21 — SearchNavFix
- Loading dùng logo app tròn lớn.
- Tìm kiếm số/ml khớp đúng hơn, loại nhiễu từ thời lượng ngủ.
- Sửa bottom taskbar bám đáy và ẩn khi sidebar/menu mở.
- Giữ scroll ngang chip tìm kiếm.

## V15.0.20 — SearchNavUXFix
- Giảm font-weight tại giao diện thêm Hút sữa.
- Loading overlay hiển thị icon app và bố cục gọn hơn.
- Tìm kiếm chỉ ưu tiên record có chứa đúng giá trị đang tìm, đặc biệt với truy vấn có số như 90ml.
- Sửa scroll ngang cho chip/range ở giao diện tìm kiếm.
- Cố định bottom taskbar bám sát đáy màn hình.

## V15.0.18 — PumpMilk24UI
- Hút sữa mới: tự bảo quản Ngăn mát và HSD 24 giờ từ giờ hút.
- Khi nhập ml/chọn bình hoặc túi, HSD tự cập nhật 24h.
- Tinh chỉnh typography Kho sữa để bớt chữ đậm, chỉ nhấn tên bình/túi, dung tích và cảnh báo.

## V15.0.18 — PumpLinkFix2
- Fix swipe ngang danh sách bản ghi Hút sữa trong màn chi tiết chăm sóc.
- Rà soát swipe ngang cho các loại chăm sóc trong modal chi tiết.
- Không cho chọn bình đang còn sữa khi hút sữa vào bình; túi trữ sữa vẫn chọn được.

## V15.0.18 — DataSafeFix
- Fix scroll và swipe trong chi tiết kho sữa.
- Bổ sung guard touch cho danh sách bình/túi trong modal.

## V15.0.18 — MilkFeedFix

- Cân lại ô nhập ml khi Bé bú từ kho.
- Số ml thay đổi sẽ tự chọn lại bình/túi phù hợp.
- Túi sữa đã chọn hiển thị thêm HSD ngày giờ.
- Fix swipe bình/túi trong chi tiết Kho sữa khi đang lọc.

## V15.0.18 — MilkBackupFix
- Sửa Kho sữa: swipe thao tác ổn định hơn, popup chi tiết túi sữa không còn kẹt màn blur.
- Thêm cấu hình tự xoá backup sau N ngày và hiển thị ngày tự xoá trong lịch sử backup.

## V15.0.18 — PressFix

- Căn lại timer Bé bú sau khi bắt đầu để các phần đều, không lệch trống bên phải.
- Chi tiết Timeline chỉ hiển thị chip ngang: đánh dấu sao, ghim, chia sẻ, xuất PDF.

## V15.0.18 — PressFix

- Timer Bé bú hiển thị gọn tối đa một dòng.
- Thời gian Bé đang bú trên Dashboard cập nhật realtime.
- Chi tiết record Timeline có chip thao tác ngang để gán/bỏ ghim, yêu thích và thao tác nhanh.

## V15.0.18 — FeedStatus TimelineUX

- Timer bú gọn hơn và không chiếm toàn bộ chiều ngang.
- Trạng thái Dashboard và avatar ring đồng bộ màu thức/bú.
- Popup kết thúc bú từ Dashboard.
- Timeline detail có chip thao tác cuộn ngang.
- Cấu hình số dòng Timeline Dashboard từ 3 đến 10.

## V15.0.18 — UXFix

- SheetCore/scroll lock thống nhất hơn cho popup, modal, bottom sheet.
- Timer chăm sóc chỉ giữ **Bắt đầu bú** trong form Bé bú.
- Dashboard nhận trạng thái **Bé đang bú** theo Timer bú.
- Timeline record gọn còn một nút **Thao tác**.
- Fix reset filter ngày tạo/cập nhật/loại/tìm kiếm/sort.
- Giao diện chi tiết record gọn và ít rối hơn.
- Tắt press animation cho container lớn không có sự kiện click.

# V15.0.4 — Hotfix khóa scroll Timeline bottom sheet

- Fix case trong Timeline: mở Filter/Sắp xếp bottom sheet rồi kéo xuống vẫn làm nền phía sau bị kéo theo.
- Chặn Pull-to-refresh/reload khi đang có bottom sheet/modal/popup mở.
- Khóa scroll được áp dụng ngay tại thời điểm `tl8Show()` mở sheet, không chờ một frame `requestAnimationFrame`, nên iOS Safari không còn kịp nhận thao tác kéo nền.
- Khi mở sheet, reset trạng thái pull-to-refresh đang dở và ẩn indicator để tránh body bị transform.
- Chỉ cho cuộn trong vùng nội dung sheet; kéo tới đầu/cuối sheet sẽ không chain sang nền.

# V15.0.3 — Khóa scroll nền cho Bottom Sheet

- Fix lỗi khi Bottom Sheet đang mở mà kéo/scroll thì giao diện phía sau cũng bị cuộn theo, đặc biệt trên iOS/Safari.
- Áp dụng cho tất cả bottom sheet/popup/sheet hiện có: Timeline 2.0, bộ lọc, sắp xếp, ghi chú, menu Thêm, Streak, chọn túi sữa, sheet công cụ đo ồn/đo sáng và các overlay phát sinh.
- Bổ sung cơ chế khóa body kiểu `position: fixed` giữ nguyên vị trí trang, đồng thời chỉ cho phép cuộn trong vùng nội dung của sheet/modal.
- Chặn scroll chaining khi cuộn tới đầu/cuối bottom sheet để nền không bị kéo theo.

# V15.0.1 — Thanh bộ lọc Timeline gọn lại
Ngày: 2026-08-02

## Sửa lỗi
- **Thanh bộ lọc của Timeline 2.0 chiếm gần trọn màn hình.** Bản 15.0.0 làm đúng chức năng nhưng sai về diện tích: ô tìm kiếm, năm chip lọc **xếp dọc thành năm hàng**, nút sắp xếp dài cả hàng, cộng thêm Lọc ngày · Lọc loại · nút Ghi nhận mới — tổng cộng **≈ 560px** trước khi thấy dòng ghi nhận đầu tiên. Nguyên nhân xếp dọc: app có rule toàn cục `button{width:100%}` mà chip không chặn lại, nên mỗi chip bị kéo full-width.

## Nâng cấp
- **Thanh công cụ gom về một hàng, còn ≈ 132px.** Ô tìm kiếm co giãn, bên cạnh là ba nút vuông: **⚙ Bộ lọc** · **⇅ Sắp xếp** · **＋ Ghi nhận mới**. Hàng này không bao giờ xuống dòng; màn hình hẹp thì ô tìm kiếm co lại chứ nút không rớt xuống.
- **Lọc ngày và Lọc loại chuyển vào bảng ⚙ Bộ lọc**, cùng với năm chip lọc nhanh. Đây là phần lấy lại nhiều chỗ nhất. Hai ô này chỉ **đổi chỗ**, không viết lại — mọi thứ đọc chúng vẫn chạy như cũ.
- **Nút xác nhận trong bảng lọc hiện số kết quả ngay lúc đó** — *"Xem 12 ghi nhận"*, cập nhật theo từng lần chạm chip. Bấm là biết trước sẽ ra bao nhiêu dòng, không phải đóng bảng ra đếm.
- **Biết đang lọc gì mà không cần mở bảng.** Nút ⚙ mang số đếm ở góc (tính cả lọc ngày, lọc loại) và đổi màu khi đang lọc; nút ⇅ đổi màu khi sắp xếp khác mặc định. Dưới thanh có một dòng tóm tắt liệt kê đúng những gì đang áp dụng kèm số kết quả — *"📅 02/08/2026 · ⭐ Yêu thích · 🔎 "sữa" — 12 ghi nhận"* — và một nút **Xoá** dọn sạch cả bộ lọc lẫn từ khoá trong một chạm.
- **Dòng tóm tắt chỉ hiện khi thực sự đang lọc.** Trạng thái mặc định thì biến mất hoàn toàn, không chiếm một pixel nào.

## Không mất gì
- Đủ năm chip lọc nhanh, đủ sáu chế độ sắp xếp, tìm kiếm không dấu, nhấn giữ, ảnh/video/ghi chú, chia sẻ, xuất PDF — không đụng tới một chức năng nào.
- Nút **＋ Ghi nhận mới** vẫn còn nguyên lối vào, chỉ đổi từ nút chữ chiếm cả hàng thành nút vuông trong thanh.

## Không phá vỡ hành vi cũ
- So với `BASELINE_LOCK_V15.0.0.json`: đúng **ba hàm** bị sửa thân — `tl8SyncBar`, `tl8RenderTimeline`, `tl8CloseAll` — tất cả đều là hàm sinh ra ở V15.0.0 và đã khai báo trong `INTENTIONAL_BASELINE_CHANGES`. **Không một hàm nào có từ trước V15.0.0 bị động tới.**
- Phần lọc, sắp xếp, phân trang và dựng dòng bên trong `tl8RenderTimeline` không đổi một ký tự — chỉ đổi vị trí một lời gọi để đếm kết quả xong mới vẽ thanh.
- `BASELINE_LOCK_V15.0.1.json` chốt **267 hàm** (263 hàm của V15.0.0 + 4 hàm mới).

---

# V15.0.0 — Timeline 2.0 (Unified Timeline)
Ngày: 2026-08-02

## Nâng cấp
- **Timeline không còn chỉ để xem lại.** Từ bản này Timeline là nơi quản lý toàn bộ hoạt động: sửa, nhân bản, ghim, đánh dấu yêu thích, đính kèm ảnh/video/ghi chú, chia sẻ, xuất PDF, tìm kiếm, lọc và sắp xếp — một cuốn nhật ký điện tử hoàn chỉnh thay vì một danh sách chỉ để cuộn.
- **Nhấn giữ một dòng là ra bảng thao tác nhanh.** Giữ 450ms, máy rung một nhịp nhẹ, dòng đó mờ đi rồi bảng hiện lên từ đáy màn hình. Kéo tay hoặc cuộn trang giữa chừng thì huỷ, không có chuyện đang cuộn mà bảng nhảy ra chặn. Nhả tay xong cú chạm đó cũng không rơi tiếp thành một cú bấm mở nhầm màn hình chi tiết.
- **Dashboard nhẹ, Unified Timeline đầy đủ.** Bảng thao tác trên Dashboard **chỉ có 5 mục**: Sửa · Nhân bản · Yêu thích · Ghim · Xem chi tiết. Những thứ nặng — thêm ảnh, thêm video, ghi chú, chia sẻ, xuất PDF — chỉ có trong Unified Timeline. Đây là ranh giới được kiểm tra tự động mỗi lần phát hành, không phải thoả thuận miệng.
- **Dashboard Timeline hiện 8 hoạt động gần nhất, không còn chỉ hôm nay.** Bản cũ chỉ liệt kê ghi nhận trong ngày, nên sáng sớm mở app là một khoảng trống dù tối qua vừa ghi rất nhiều. Nay dòng của hôm nay hiện giờ (`08:15`), dòng của ngày khác hiện thêm ngày tháng (`01/08 21:40`) để không nhầm việc hôm qua là việc hôm nay. Nút bên phải tiêu đề đổi thành **Xem toàn bộ →**.
- **Biểu tượng trạng thái ngay trên dòng.** ⭐ đã yêu thích · 📌 đã ghim · 📷 có ảnh · 🎥 có video · 📝 có ghi chú — hiện ở cả Dashboard, Unified Timeline và đầu bảng thao tác. Nhìn một lượt là biết bản ghi nào có gì, không phải mở từng cái ra dò.
- **Nhân bản để ghi nhanh việc lặp lại.** Copy toàn bộ dữ liệu bản ghi cũ, thời gian tự đặt về lúc này, mở ra dưới dạng form đang chờ Lưu. Vì đi qua đúng luồng nhập liệu cũ nên phần kho sữa / túi sữa / hạn dùng vẫn được tính lại đúng — không đẻ ra bản ghi ma làm lệch tồn kho. Riêng **Chuyển sữa** không nhân bản được, vì nhân đôi một giao dịch chuyển kho sẽ làm sai tồn ở cả hai đầu.
- **Ghim và Yêu thích là hai việc khác nhau.** Ghim để đánh dấu việc quan trọng (tiêm vaccine, khám bệnh, sốt, thuốc đặc biệt); Yêu thích để đánh dấu việc hay dùng lại. Một bản ghi có thể vừa ghim vừa yêu thích, và mỗi loại có một chip lọc riêng.
- **Mỗi bản ghi đính kèm được nhiều ảnh và nhiều video.** Tối đa 20 ảnh và 5 video, **không giới hạn riêng theo loại hoạt động** — bú, ngủ, thay tã, uống thuốc đều đính kèm được. Ảnh được nén trước khi lưu (cạnh dài 1280px) nên máy không phình vì một tấm ảnh 8MB. Video được lấy một khung hình làm ảnh đại diện.
- **Chia sẻ ba dạng: Văn bản · Ảnh đẹp · PDF.** Văn bản dùng bảng chia sẻ của máy, máy không hỗ trợ thì chép vào bộ nhớ tạm — không có đường cụt. Ảnh đẹp là một tấm thẻ 1000×1250 gồm ảnh, biểu tượng, loại hoạt động, thời gian, nội dung, ghi chú và ký tên "Nhật ký chăm sóc của \<tên bé\>". Đủ để gửi ông bà hoặc bác sĩ.
- **Xuất PDF riêng từng bản ghi**, gồm thời gian hoạt động, thông tin chi tiết, thời gian tạo, thời gian cập nhật, ghi chú, ảnh và **thumbnail video**. Vẫn đi qua popup xem trước có sẵn, **không mở cửa sổ mới** — cửa sổ mới bị kẹt khi chạy dạng PWA, đây là ràng buộc từ V14.2.0.
- **Sáu chế độ sắp xếp, ứng dụng nhớ lựa chọn cuối cùng.**

  | Tiêu chí | Chiều |
  |---|---|
  | Thời gian hoạt động | Mới nhất trước *(mặc định)* / Cũ nhất trước |
  | Thời gian tạo record | Mới tạo trước / Cũ tạo trước |
  | Thời gian cập nhật | Mới cập nhật trước / Cũ cập nhật trước |

  Một hoạt động ngày 01/08 nhưng nhập bổ sung ngày 05/08 vẫn xem đúng theo thời gian tạo. Sửa lại bản ghi tuần trước thì nó lên đầu danh sách khi chọn "Mới cập nhật trước". Sắp theo thời gian tạo hoặc cập nhật thì tiêu đề nhóm ngày đổi theo (`Ngày tạo: …`) và mỗi dòng hiện thêm `🆕 … · ✏️ …` — nhìn là biết đang sắp theo mốc nào, không phải đoán.
- **Năm chip lọc nhanh chọn được nhiều cùng lúc** (⭐ 📌 📷 🎥 📝), cộng dồn với bộ lọc ngày và bộ lọc loại hoạt động đang có chứ không thay thế.
- **Tìm kiếm toàn bộ dữ liệu, không phân biệt dấu.** Quét ghi chú, loại hoạt động, tên bình/túi sữa, tên thuốc, tên vaccine, trạng thái bảo quản, mã túi và mọi trường phụ. Gõ `binh sua` vẫn ra `Bình sữa`, gõ `thuoc` vẫn ra `Thuốc`. Nhiều từ khoá thì phải khớp tất cả. Kết quả kết hợp với bộ lọc và chế độ sắp xếp đang chọn. Không tìm thấy gì thì hiện đúng lý do kèm nút **Xoá bộ lọc & tìm kiếm**, thay vì một danh sách trống vô nghĩa.

## Vẫn nhanh
- Unified Timeline **dựng dần từng 120 dòng** như V14.6.0 — có 5.000 bản ghi vẫn mở trang nhanh. Đổi bộ lọc / sắp xếp / từ khoá thì bộ đếm tự đặt lại về 120.
- Ô tìm kiếm **không bao giờ** nuốt chuỗi base64 của ảnh/video vào chuỗi so khớp — một tấm ảnh là vài trăm nghìn ký tự, đưa vào sẽ đứng máy ngay ký tự đầu tiên gõ. Chuỗi so khớp được nhớ tạm theo `id + updatedAt`, gõ tiếp không dựng lại từ đầu, và có hoãn 220ms nên không vẽ lại sau từng ký tự.
- Đóng lớp xem ảnh/video thì nội dung được nhả khỏi bộ nhớ ngay, không giữ video nặng chạy ngầm.

## Không mất gì
- **Toàn bộ trường mới đều là trường phụ thêm vào bản ghi có sẵn**: `fav`, `pin`, `media`. Không đổi tên, không xoá, không ghi đè trường cũ → sao lưu JSON, xuất file và đồng bộ Cloud **tự động mang theo**, dữ liệu cũ không mất một ký tự.
- **Mọi thao tác bám theo mã bản ghi, không phải chỉ số mảng.** Thêm một ghi nhận mới sẽ đẩy toàn bộ chỉ số cũ lệch đi một; bám theo mã nên ghim / yêu thích / ảnh **không bao giờ nhảy sang nhầm dòng**. Bản ghi cũ chưa có mã được cấp mã ngay lần đầu bị chạm tới.
- **Bộ nhớ máy đầy thì app báo, không treo.** Mọi lần ghi đi qua một lớp an toàn: đầy thì hiện *"Bộ nhớ máy đã đầy — hãy xoá bớt ảnh/video đính kèm rồi thử lại"* và vẽ lại màn hình. Lần ghi hỏng thì dữ liệu trong máy vẫn là **bản cũ nguyên vẹn**. Cùng lý do đó, video nặng hơn 2.5MB chỉ giữ ảnh đại diện và tên tệp — nhồi video vào bộ nhớ trình duyệt sẽ làm hỏng cả lần lưu tiếp theo của toàn bộ dữ liệu bé.
- Ghi chú dùng chung trường ghi chú sẵn có của bản ghi — **một nguồn duy nhất**, không đẻ ra ghi chú thứ hai lệch với ghi chú nhập trong form.

## Không phá vỡ hành vi cũ
- So với `BASELINE_LOCK_V14.7.0.json`: **không một hàm nào bị sửa thân**. `INTENTIONAL_BASELINE_CHANGES` trong `release_check.py` là **rỗng** — lần đầu tiên kể từ V14.0.0.
- Chỗ cần đổi hành vi đều **bọc lại**, không sửa: `renderCareTimeline` → `tl8WrapTimeline`. Lớp bọc mới luôn nằm ngoài cùng nên lớp bọc của V14.6.0 không giành lại quyền vẽ, và có `try/catch` — mô-đun mới lỗi thì rơi về lớp cũ, người dùng vẫn thấy Timeline như bản 14.7.0.
- Block Dashboard `careJournal` nằm trong `renderDashboard` (hàm **không** thuộc Baseline Lock) và cũng chỉ thêm một dòng uỷ quyền có `try/catch`, phần mã cũ giữ nguyên bên dưới làm đường lui. Dashboard không bao giờ trống vì Timeline 2.0.
- Các lớp phủ mới đặt tên chứa `Sheet` / `Overlay` nên cơ chế khoá cuộn nền dùng chung của V14.1.0 tự nhận ra, không phải khai báo thêm và không sửa mã cũ. Nhịp rung mới cho nhấn giữ được **thêm khoá mới** vào bảng rung, **không sửa** `axHaptic()`.
- `BASELINE_LOCK_V15.0.0.json` chốt **263 hàm** (185 hàm cũ + 78 hàm mới của V15.0.0).
- Chỉ ghi thêm **một khoá thiết lập** của chính người dùng: `meYeuBeTimeline2_v1` (sắp xếp / bộ lọc / từ khoá).

---

# V14.7.0 — Theme & Sổ sức khỏe
Ngày: 2026-08-02

## Nâng cấp
- **Mở app ở Dark Mode không còn loé trắng.** Trước đây giao diện sáng/tối chỉ được gán trong `render()` của `app.js` — mà `app.js` nằm cuối trang, nên màn hình chờ và màn hình loading đã vẽ xong từ lâu, máy đang tối vẫn thấy loé sáng một nhịp rồi mới đổi. Nay việc này chuyển vào `boot.js`, tệp nằm trong `<head>` và chạy trước cả CSS, nên `<html>` đã đúng màu trước khi trình duyệt vẽ điểm ảnh đầu tiên.
- **Giao diện có ba chế độ: Tự động · Luôn sáng · Luôn tối.** Mặc định là **Tự động** — app tự đọc cài đặt Dark Mode của điện thoại. Đang bật Tự động mà đổi cài đặt của máy giữa chừng thì app đổi theo ngay, không cần khởi động lại. Nút 🌗 trên thanh tiêu đề bấm lần lượt qua ba chế độ, kèm toast nói rõ đang ở chế độ nào. Thanh trạng thái của PWA cũng đổi màu theo, không còn hồng chói trên nền tối.
- **Module "Sau sinh" đã gỡ, Sổ sức khỏe thay chỗ.** Cân nặng / chiều dài / vòng đầu trước đây nằm ở hai nơi, phải gõ hai lần và cho ra hai con số khác nhau. Nay chỉ còn một nguồn duy nhất. Menu trái: mục **🩺 Sổ sức khỏe** thành mục cha với hai mục con **Hồ sơ sức khỏe** và **Biểu đồ tăng trưởng**. Biểu đồ chuẩn WHO không mất theo module mà thành màn hình riêng, và giờ đọc được số đo khai báo trong Sổ sức khỏe chứ không chỉ dữ liệu cũ.
- **Dashboard có block "Sổ sức khỏe" thay cho block "Sự phát triển của bé".** Ba chỉ số hiện số mới nhất, mức tăng/giảm so với **lần khai báo liền trước có chỉ số đó**, kèm phần trăm:

  | | Cân nặng | Chiều dài | Vòng đầu |
  |---|---|---|---|
  | | 5,6 kg | 60 cm | 38 cm |
  | | ↑ 1 kg | ↑ 4 cm | ↑ 3 cm |
  | | +21,7% | +7,1% | +8,6% |

  Lần khai báo mới chỉ nhập một chỉ số thì hai chỉ số còn lại **lấy lại số của lần cũ** và gắn dấu **(!)**; chạm vào dấu (!) hiện chú thích ghi rõ lần khai báo mới chưa nhập chỉ số đó và số đang hiện được đo ngày nào. Dòng đầu block luôn ghi ngày của lần khai báo mới nhất để không nhầm số cũ là số hôm nay.
- **Cấu hình dashboard đổi theo.** Module "Sự phát triển của bé" được thay bằng module **Sổ sức khỏe**, bật/tắt · đổi tên · kéo thứ tự như cũ. Ai đã sắp xếp từ trước thì được chuyển tên **tại chỗ**, giữ nguyên vị trí và tên tự đặt, không bị đẩy xuống cuối.

## Không mất gì
- **Dữ liệu `db.baby` giữ nguyên, không xoá một bản ghi nào** — vẫn nằm trong sao lưu JSON, xuất SQLite, đồng bộ Cloud, dòng thời gian Sổ sức khỏe và biểu đồ WHO. Trùng ngày thì số đo trong Sổ sức khỏe được ưu tiên.
- **Không ai mất nút thanh dưới.** Nút "Phát triển" cũ (`babyStats`) tự chuyển sang màn hình Biểu đồ tăng trưởng; `baby` chuyển sang Sổ sức khỏe.
- Ô trống của biểu đồ WHO không còn nút trỏ vào màn hình đã gỡ (bấm vào sẽ trắng màn hình) — nay là nút **⚖️ Đo chỉ số cho bé**, mở thẳng ô đo.

## Không phá vỡ hành vi cũ
- So với `BASELINE_LOCK_V14.6.0.json`: **chỉ một hàm bị sửa thân** là `renderWhoGrowth`, và chỉ đúng hai dòng của ô trống (câu hướng dẫn + nút bấm) vì nút cũ trỏ tới màn hình đã gỡ. Phần tính toán và vẽ biểu đồ không đổi một ký tự. Đã khai báo trong `INTENTIONAL_BASELINE_CHANGES`.
- Chỗ nào cần đổi hành vi của hàm đã khoá đều **bọc lại**, không sửa: `whoSeries` → `gw7WrapWhoSeries`, `updateThemeButton` / `toggleTheme` → `th7WrapUI`. Toàn bộ phần mới là hàm `th7*` / `gw7*`, CSS mới và khối HTML mới.
- `BASELINE_LOCK_V14.7.0.json` chốt 185 hàm (161 hàm cũ + 24 hàm mới).
- Dữ liệu của bé an toàn tuyệt đối: chỉ ghi thêm hai khoá thiết lập của chính người dùng (`settings.themeMode`, `settings.theme`) và một lần đổi tên module trong `dashboardConfig`.

---

# V14.6.0 — Storage & Stability
Ngày: 2026-08-02

## Nâng cấp
- **Ghi nhận Bé bú có ô ml bấm nhanh như màn Hút sữa.** Ô "Số lượng ml" giờ là một khối gồm nút **−**, con số ở giữa và nút **＋** (bước 10 ml), bên dưới là dãy **Gợi ý nhanh 60 · 80 · 100 · 120 · 150 · 180 · 200 ml** cuộn ngang. Chạm một mức là điền ngay, mức đang chọn sáng lên. Mọi thứ phía sau vẫn chạy y như gõ tay: app tự gắn bình/túi theo hạn dùng gần nhất, tự tính tổng ml lấy từ kho và số ml bé bú thực tế.
- **Trang Dữ liệu có bảng "📦 Dung lượng".** Xem được ngay app đang chiếm bao nhiêu chỗ trên máy và chỗ đó nằm ở đâu: **Dung lượng App** (các tệp giao diện PWA trong bộ nhớ đệm), **Dung lượng DB** (dữ liệu của bé trong trình duyệt), **Backup phiên bản** (các bản lưu trong IndexedDB), cùng tổng dung lượng và hạn mức trình duyệt cấp kèm thanh tiến trình. Có thêm bảng nhỏ "dữ liệu DB đang chiếm chỗ ở đâu" chia theo từng nhóm (ghi nhận chăm sóc, kho sữa, cột mốc/ảnh, sổ sức khỏe…) để biết chính xác thứ gì đang phình to. DB vượt 3 MB hoặc dùng quá 80% hạn mức thì app cảnh báo kèm hướng xử lý. Toàn bộ phép đo chỉ đọc, không đụng một byte dữ liệu nào.

## Sửa lỗi
- **Bấm chức năng trong bảng "Thêm" không còn đứng màn hình hay thoát app.** Bốn nguyên nhân, sửa từng cái:
  1. **Ô sao lưu JSON.** `updateBackup()` nối *toàn bộ* database thành một chuỗi JSON rồi đổ vào ô textarea — và nó chạy lại ở **mọi lần vẽ màn hình**, cộng thêm ngay khi mở trang Dữ liệu. Khi DB đã có ảnh cột mốc và ảnh đại diện (vài MB), riêng bước này đủ làm iPhone đứng hình vài giây rồi Safari thoát app. Nay ô để trống, chỉ nạp khi Boss bấm **👁 Hiện dữ liệu JSON**; DB trên 2 MB thì hỏi lại trước.
  2. **Timeline.** Trước đây dựng toàn bộ lịch sử thành một chuỗi HTML duy nhất — càng dùng lâu càng nặng. Nay dựng 120 mục mỗi lần, có nút "Xem thêm".
  3. **Thứ tự điều hướng.** Bảng "Thêm" đóng sheet và chuyển trang trong cùng một khung hình, lại gọi các hàm vẽ của trang Dữ liệu **trước** khi trang kịp hiện (từ V14.3.0 việc chuyển trang bị hoãn 2 khung hình). Nay đóng sheet xong mới chuyển trang, chuyển trang xong mới vẽ.
  4. **Lớp vẽ còn sót.** Hiệu ứng "nở trang từ điểm chạm" của V14.5.0 để lại `transform` + `will-change` vĩnh viễn trên cả trang; với hai trang dài nhất là Timeline và Dữ liệu, iOS phải giữ một lớp vẽ khổng lồ nên dễ hết bộ nhớ. Nay dọn sạch sau khi hiệu ứng chạy xong, và các trang dài không phóng to cả trang nữa (vẫn có hiệu ứng mờ/trượt).
- **Nút "🧊 Kho sữa" trong bảng "Thêm" bấm vào là màn hình trắng.** App chưa bao giờ có trang riêng cho kho sữa (chính nút đó cũng ghi "Nếu có màn hình kho"), nên bấm vào là ẩn sạch mọi trang rồi để lại màn hình trống. Nay nút mở đúng bảng chi tiết kho sữa. Đồng thời app chặn luôn mọi lối vào chết kiểu này về sau: chức năng nào chưa có màn hình riêng thì báo rõ thay vì ẩn hết trang.
- **Bảng "Thêm" nhẹ hơn.** Bỏ lớp làm mờ nền `backdrop-filter` — làm mờ nền đồng thời với hiệu ứng mở/đóng buộc iOS vẽ lại cả màn hình mỗi khung hình. Thay bằng lớp màu, nhìn gần như cũ.
- **Lưới an toàn.** Khung xương chờ nào đứng quá 2,6 giây sẽ tự bị gỡ, có lỗi JavaScript giữa chừng cũng gỡ sạch — không bao giờ còn cảnh kẹt ở màn hình lấp lánh trống rỗng.

## Không phá vỡ hành vi cũ
- So với `BASELINE_LOCK_V14.5.0.json`: **không sửa thân một hàm nào**. Phần mới đều là hàm `fq6*` / `st6*` / `nv6*`, CSS mới và khối HTML mới trong trang Dữ liệu; chỗ nào cần đổi hành vi thì bọc lại đúng cách `axWrap()` sẵn có.
- Ba hàm `ax5Init` / `ax5DragInit` / `ax5ResetDragStyle` báo lệch hash là sai lệch có sẵn của chính file lock V14.5.0 (chốt trước lần chỉnh cuối của bản đã phát hành) — mã nguồn của cả ba giống hệt V14.5.0 từng ký tự. Đã khai báo rõ và chốt lại đúng ở `BASELINE_LOCK_V14.6.0.json` (157 hàm).
- Dữ liệu của bé không bị đụng tới: bảng dung lượng chỉ đọc, phần sửa lỗi không ghi vào `localStorage`.

---

# V14.5.0 — Fluid Motion & Fresh Build Guard
Ngày: 2026-08-01

## Nâng cấp
- **Popup mở ra từ đúng chỗ ngón tay vừa chạm.** Bấm vào ô nào thì khung nội dung nở ra từ chính ô đó rồi lấp đầy màn hình, đóng lại thì thu về đúng điểm ấy — giống hệt cách iPhone mở một app từ màn hình chính. Mở một chức năng toàn màn hình (Thống kê, Timeline, Sổ sức khỏe…) cũng vậy. Nếu màn hình được mở KHÔNG phải do chạm (từ thông báo, từ mã) thì vẫn dùng hiệu ứng trượt nhẹ như cũ.
- **Hết khựng.** Ba nguyên nhân gây giật đã được xử lý: mọi khung chuyển động chuyển sang chạy bằng GPU (`translate3d`), không còn animate lớp làm mờ nền (`backdrop-filter` — thủ phạm nặng nhất trên iPhone), và các hiệu ứng lặp vô hạn (shimmer khung xương, nhịp thở của logo) được **tạm dừng** trong lúc mở/đóng popup hay chuyển trang để dành trọn khung hình cho thứ người dùng đang nhìn. Đường cong giảm tốc đổi sang easeOutExpo cho cảm giác "trôi" đúng chất iOS.
- **Nút "Thêm" ở thanh dưới trượt lên mượt như sheet gốc của iOS.** Bảng trượt lên trọn vẹn từ đáy màn hình (trước đây chỉ nhích 58px rồi dừng nên trông như bị khựng), có thanh nắm kéo ở đầu, và **kéo xuống để đóng**: sheet đi theo ngón tay, nền mờ dần theo quãng kéo; thả ra khi đã kéo đủ xa hoặc hất nhanh thì đóng, chưa đủ thì bật về chỗ cũ.

## Sửa lỗi
- **Không bao giờ mở lại giao diện cũ nữa.** Nguyên nhân: Service Worker cũ lấy mã nguồn qua bộ nhớ đệm HTTP của trình duyệt, nên iPhone thỉnh thoảng trả về đúng bản `index.html` đã cũ và app vẽ lại giao diện của phiên bản trước. Bản này khoá chặt bằng bốn lớp:
  1. Mã nguồn (html/js/css) **luôn lấy mới từ mạng** (`cache:'no-store'`); bộ nhớ đệm chỉ còn là phao cứu sinh khi mất mạng.
  2. Khi bản mới kích hoạt: xoá **sạch** mọi cache cũ và giành quyền điều khiển ngay.
  3. Service Worker hỏi từng tab/PWA đang mở "bạn đang chạy bản nào?" — tab nào không trả lời đúng trong 2,2 giây (tức là đang kẹt ở bản cũ) sẽ được **tự động nạp lại**. Đây là lớp gỡ được cả những cửa sổ đã mở từ trước.
  4. Mỗi lần mở app hoặc quay lại từ nền, app đối chiếu số hiệu bản dựng với `build.json` trên máy chủ; lệch nhau là dọn cache và nạp lại đúng một lần (có khoá chống lặp).
  Toàn bộ quá trình **không đụng tới `localStorage`**, nên dữ liệu của bé không hề bị ảnh hưởng.

## Không phá vỡ hành vi cũ
- So với `BASELINE_LOCK_V14.4.2.json` (122 hàm): **122/122 hàm giữ nguyên hash**, không có thay đổi có chủ ý nào — phần mới đều là hàm `ax5*`, CSS mới và hai file tách riêng `boot.js` / `build.json`.
- Bảng thời lượng dùng chung `--ax-fast/base/slow` giữ nguyên; riêng popup và sheet cần dài hơn 250ms để đủ mượt nên khai báo bằng biến mới `--ax-modal` / `--ax-sheet`, vẫn quản lý tập trung tại một chỗ. Không thêm Rotate. Vẫn tôn trọng "Giảm chuyển động" của hệ điều hành và ô tắt hiệu ứng trong app.

---

# V14.4.2 — Dashboard Replay Fix
Ngày: 2026-08-01

## Sửa lỗi
- **Mở lại Trang chủ không còn làm mọi thông số về 0.** Trước đây, mỗi lần Home hiện lại có hai lượt quét hiệu ứng chạy đua nhau: lượt sau đọc phải con số đang chạy dở (`0 ml`) và thanh vừa bị ghim về `0%`, tưởng đó là số liệu mới nên chốt đích = 0 rồi đứng im — phải mở thêm một lần nữa mới thấy số thật. Nay mỗi ô số và mỗi thanh tiến trình tự nhớ **đích thật** của lượt đang chạy, nên lượt quét sau không đọc nhầm giá trị tạm. Số vẫn chạy `0 → giá trị thật` mỗi lần mở Dashboard như thiết kế ở V14.4.0.
- **Không còn hai vòng hiệu ứng cùng ghi vào một ô.** Thêm mã lượt (token) cho bộ đếm: lượt chạy mới tự huỷ lượt cũ, tránh con số giật qua lại. Nếu số liệu thật đổi giữa lúc đang chạy (vừa ghi nhận cữ bú mới), số chạy tiếp tới giá trị mới thay vì kẹt ở giá trị cũ.

## Không phá vỡ hành vi cũ
- So với `BASELINE_LOCK_V14.4.1.json` (122 hàm): **118 hàm giữ nguyên hash**; chỉ `axCount`, `axCountScan`, `axProgressStage`, `axProgressScan` đổi, đã khai báo trong `INTENTIONAL_BASELINE_CHANGES`. Không sửa thân hàm vẽ nào, không đụng dữ liệu người dùng.
- Vẫn ≤250ms, đúng 3 biến `--ax-fast/base/slow`, không thêm Rotate.

---

# V14.4.1 — iOS-Smooth Tuning
Ngày: 2026-08-01

## Hiệu chỉnh
- **Chuyển động mượt hơn, cảm giác iPhone.** Đổi đường cong giảm tốc sang easeOutQuint (`cubic-bezier(.22,1,.36,1)`) cho mọi hiệu ứng và làm spring dịu hơn: mở/đóng popup, chuyển trang, chạy số đều "trôi" mượt về đích thay vì dừng gấp. Nút phản hồi nhanh hơn (0.14s), popup mở thong thả hơn chút (0.25s). Bộ đếm số cũng dùng easeOutQuint để chạy mượt cùng ngôn ngữ.
- **Nhấn khối chăm sóc thấy rõ và đúng khối.** Trước đây bấm một ô "Chăm sóc hôm nay" mở ngay popup đè lên nên hiệu ứng lún chưa kịp hiện. Nay ô lún **ngay khi chạm** (độ trễ 24ms, transition riêng 0.11s) và lún rõ hơn (scale 0.96), nên thấy được trước khi popup mở. Vẫn chỉ đúng ô được chạm lún, thẻ cha đứng yên, và vẫn không nhấp nháy khi cuộn.

## Không phá vỡ hành vi cũ
- So với `BASELINE_LOCK_V14.4.0.json` (122 hàm): **121 hàm giữ nguyên hash**; chỉ `axEaseOut` đổi (easeOutCubic → easeOutQuint), đã khai báo trong `INTENTIONAL_BASELINE_CHANGES`. Không sửa thân hàm vẽ nào, không đụng dữ liệu người dùng.
- Vẫn ≤250ms, đúng 3 biến `--ax-fast/base/slow` (biến `--ax-press` là token nhấn riêng), không thêm Rotate.

---

# V14.4.0 — Animation Refinements
Ngày: 2026-08-01

## Sửa & tinh chỉnh
- **Dashboard chạy lại hiệu ứng mỗi khi mở.** Con số và thanh tiến trình ở "Chăm sóc hôm nay" chạy từ 0 → giá trị hiện tại mỗi lần mở Dashboard, và chạy lại khi mở lại app. Bản trước chạy hiệu ứng lần đầu ngay lúc splash còn che 1 giây nên bị phí — nay đợi splash tắt mới chạy, và mỗi lần điều hướng về Home cũng chạy lại.
- **Nhấn đúng block, không kéo theo block cha.** Trước đây do dùng `:active` (áp lên cả tổ tiên) nên chạm một ô nhỏ làm cả thẻ cha thu nhỏ theo. Nay bộ điều khiển nhấn chỉ gắn hiệu ứng lên block gần điểm chạm nhất; chạm vào ô con thì chỉ ô đó nhấn, chạm vùng trống của thẻ thì thẻ nhấn, chạm nút trong thẻ thì chỉ nút phản hồi.
- **Bấm để cuộn thì không nhấp nháy hiệu ứng nhấn.** Chờ một nhịp ngắn (62ms) để phân biệt CHẠM với CUỘN; hễ ngón tay bắt đầu di chuyển là huỷ hiệu ứng nhấn. Không cản thao tác cuộn/vuốt sẵn có.
- **Modal/popup thấy rõ hiệu ứng mở/đóng.** Tăng biên độ trượt + phóng + mờ dần trong ngưỡng 150~250ms; nâng thời gian giữ khung lúc đóng để hiệu ứng không bị cắt ngang.
- **Rung phản hồi áp dụng đúng thiết lập và cảm nhận được.** Thêm rung nhẹ ngay khi chạm nút/thẻ (trong đúng cử chỉ chạm nên đáng tin trên Android); tôn trọng ô bật/tắt: tắt là im hoàn toàn. iPhone dùng Safari không hỗ trợ rung sẽ tự bỏ qua.

## Không phá vỡ hành vi cũ
- Đối chiếu `BASELINE_LOCK_V14.3.0.json` (114 hàm): **113 hàm giữ nguyên hash**; chỉ `axInit` đổi (thêm bộ điều khiển nhấn + chạy lại Dashboard), đã khai báo trong `INTENTIONAL_BASELINE_CHANGES`. Tất cả phần thêm là hàm/CSS `ax*` mới, không sửa thân hàm vẽ nào.
- Vẫn dùng chung bảng thời lượng `--ax-fast/base/slow`, mọi hiệu ứng ≤250ms, không thêm Rotate. Module thuần giao diện, không đụng dữ liệu người dùng.

---

# V14.3.0 — Animation System
Ngày: 2026-08-01

## Thêm mới
- **Bộ chuyển động thống nhất cho toàn app** — mượt, nhanh, tự nhiên, cảm giác cao cấp giống Apple Health. Mọi hiệu ứng gói trong 150~250ms và chỉ dùng bốn kiểu: Fade · Slide · Scale · Spring (không Rotate, không nảy mạnh). Tất cả dùng chung một bảng thời lượng (`--ax-fast` 160ms, `--ax-base` 200ms, `--ax-slow` 240ms) nên không còn mỗi chỗ một kiểu.
  - **Chạy số (Counter).** Số ml bú, số cữ, giờ ngủ, cân nặng… ở Dashboard / Thống kê / Báo cáo tăng dần thay vì nhảy thẳng (0 → 50 → 120 → 390 ml). Icon và đơn vị đứng yên, chỉ con số chạy; mốc giờ kiểu `07:30`, `2h05` được nhận diện để không bị chạy nhầm.
  - **Thanh tiến trình (Progress).** Chạy từ trái sang phải, không hiện sẵn ở đích; đạt mục tiêu thì đổi màu hoàn thành kèm một nhịp phóng rất nhẹ.
  - **Popup / modal / bottom sheet (Spring).** Mở bằng scale nhẹ + fade in (bottom sheet trượt từ dưới lên), đóng bằng fade out + trượt xuống. Áp cho cả 21 popup, gồm cả hộp thoại Sổ sức khỏe 2.0 và bảng Thêm ở thanh dưới. Không còn "pop" cứng.
  - **Hero Fade.** Khi trạng thái bé đổi (🟢 Đang thức → 🟣 Đang ngủ) hoặc dữ liệu Hero thay đổi, chỉ phần đổi mới fade nhẹ — không nháy lại toàn bộ thẻ.
  - **Timeline & danh sách.** Record mới xuất hiện bằng fade in + slide up; các dòng trong danh sách hiện lần lượt cách nhau 36ms thay vì bật ra đồng loạt.
  - **Nhấn thẻ (Card press).** Thu còn ~98% khi nhấn, thả tay nảy nhẹ.
  - **Nút (Button).** Scale nhẹ khi nhấn; có sẵn spinner trong nút và dấu tích thành công để dùng khi cần.
  - **Chuyển màn hình.** Fade + trượt lên nhẹ, không cắt cứng.
  - **Loading dạng Skeleton.** Chuyển sang các trang nặng (Thống kê, Timeline, Sổ sức khỏe, Tổng kết năm…) hiện ngay khung xương mờ (shimmer) rồi dựng nội dung ở khung hình kế tiếp — phản hồi tức thì thay cho spinner phủ kín màn hình 500ms như trước. Spinner toàn màn hình chỉ còn dùng cho đồng bộ đám mây và khôi phục sao lưu.
  - **Rung phản hồi (Haptic).** Rung một nhịp nhẹ khi lưu, cảnh báo, xoá, hoàn tác — nếu máy hỗ trợ; có chặn để một thao tác không rung dồn nhiều nhịp. iPhone dùng Safari không hỗ trợ rung sẽ tự bỏ qua, không lỗi.
- **Ô cài đặt "✨ Hiệu ứng chuyển động"** trong trang Thiết lập: bật/tắt toàn bộ hiệu ứng và bật/tắt rung riêng. Nếu điện thoại đang bật *Giảm chuyển động* trong phần Trợ năng, ứng dụng tự tắt hiệu ứng để tôn trọng thiết lập của máy.

## Sửa lỗi
- **Thanh tiến trình mục tiêu trên Dashboard luôn hiển thị 42% bất kể dữ liệu thật.** Gốc lỗi: một quy tắc CSS cũ ở khối V9.x ghim cứng `.bcMetric:before{width:42%!important}` và đặt SAU quy tắc dùng biến `--goal-progress`, nên đè mất giá trị thật mà `renderDashboard()` ghi ra. Nay trả lại đúng biến và cho thanh chạy mượt tới mốc thật.

## Không phá vỡ hành vi cũ
- Toàn bộ Animation System là module mới độc lập (tiền tố `ax`). Không sửa mã nguồn của bất kỳ hàm cũ nào: mọi can thiệp đi qua cơ chế bọc hàm lúc chạy (`axWrap`). Đối chiếu `BASELINE_LOCK_V14.2.0.json` (75 hàm): **cả 75 hàm giữ nguyên hash**, `INTENTIONAL_BASELINE_CHANGES` rỗng.
- Module thuần giao diện, không thêm/xoá dữ liệu người dùng. Tuỳ chọn bật/tắt lưu riêng ở `localStorage`.

## Quy trình
- `BASELINE_LOCK_V14.3.0.json`: 114 hàm (75 hàm cũ + 39 hàm `ax*` mới).
- `release_check.py`: `PREV_LOCK` trỏ `BASELINE_LOCK_V14.2.0.json`; thêm kiểm tra CSS animation, bảng thời lượng dùng chung, ràng buộc mọi hiệu ứng ≤250ms, khoảng cách fade danh sách 30~50ms, chống lạm dụng Rotate, và bắt buộc dùng `axWrap` (không được sửa hàm cũ để gắn animation).

# V14.3.0 — Animation System
Ngày: 2026-07-31

## Thêm mới
- **Bộ chuyển động dùng chung cho toàn app.** Trước đây mỗi module tự viết hiệu ứng riêng (`careModalIn`, `nmSheetUp`, `ccxPopIn`, `splashPop`, `toastIn`…) với thời lượng và đường cong khác nhau, nên cảm giác không đồng nhất. Nay toàn app dùng chung một bảng thời lượng và hai đường cong duy nhất: `--ax-ease` (ease-out tự nhiên) và `--ax-spring` (spring nhẹ, chỉ vượt đích một chút). Chỉ còn 4 kiểu chuyển động: **Fade · Slide · Scale · Spring** — không Rotate (trừ spinner), không nảy mạnh.

  | Thời lượng | Dùng cho |
  |---|---|
  | 160ms | Nhấn nút, nhấn thẻ |
  | 190ms | Đóng popup |
  | 200ms | Fade dữ liệu đổi |
  | 240ms | Mở popup, chuyển trang, chạy số, thanh tiến trình |
  | 36ms | Khoảng cách giữa 2 dòng danh sách |

- **Chạy số (Counter).** Số trên Dashboard, Thống kê và các thẻ chỉ số không nhảy thẳng tới đích nữa mà tăng dần: `0 → 50 → 120 → 390 ml`. Hiệu ứng chỉ chạy phần **số**, giữ nguyên icon và đơn vị đi kèm, nên `🍼 390ml` vẫn hiện đúng trong lúc chạy. Ô nào là mốc giờ (`2h05`, `07:30`) hoặc chưa có dữ liệu (`--`) thì để nguyên, không chạy.
- **Thanh tiến trình (Progress).** Thanh mục tiêu chăm sóc và thanh dung tích túi sữa luôn chạy từ mốc cũ sang mốc mới thay vì hiện sẵn ở đích. Khi đạt mục tiêu, thanh đổi sang màu hoàn thành kèm một nhịp phóng rất nhẹ (1.8%).
- **Popup mở bằng Spring, đóng bằng Fade + trượt xuống.** Áp cho **21 popup / bottom sheet** đang có, gồm cả những loại không dùng quy ước `.show`: hộp thoại Sổ sức khỏe 2.0 (dùng `hidden`) và sheet của Đo ồn / Đo sáng (dùng `open`). Hộp thoại giữa màn hình thì scale nhẹ + fade; bảng kéo từ đáy thì trượt lên. Đóng thì trượt xuống chứ không tắt phụt.
- **Hero fade.** Thẻ Hero trên Dashboard không còn nháy toàn bộ mỗi lần có dữ liệu mới. Chỉ đúng phần vừa đổi mới fade + scale nhẹ — ví dụ trạng thái `🟢 Đang thức` → `🟣 Đang ngủ`, dòng cữ bú kế tiếp, hoặc tên bé.
- **Timeline và danh sách hiện lần lượt.** Ghi nhận mới xuất hiện bằng Fade In + Slide Up; các dòng không đổ ra cùng lúc mà cách nhau 36ms (tối đa 14 dòng đầu, các dòng sau hiện ngay để không phải chờ). Danh sách nào nội dung không đổi thì không chạy lại hiệu ứng, tránh nhấp nháy mỗi lần lưu.
- **Nhấn thẻ và nút.** Thẻ thu còn 98% khi nhấn, thả tay nảy nhẹ bằng spring. Nút thu 97%. Bổ sung `axBtnLoading()` (spinner trong nút) và `axBtnSuccess()` (dấu ✓ + rung nhẹ) cho các thao tác cần chờ.
- **Chuyển màn hình.** Trang mới vào bằng Fade + trượt lên 8px, không chuyển cứng.
- **Rung phản hồi (Haptic).** Máy nào hỗ trợ thì rung một nhịp rất nhẹ ở 4 mốc: **Success · Warning · Delete · Undo**. Một thao tác thường bắn ra vài thông báo liền nhau (xoá → toast → thanh hoàn tác) nên có bộ chặn 140ms để máy chỉ rung **một** nhịp, không rung dồn. iPhone chạy Safari không hỗ trợ rung web thì tự bỏ qua, không báo lỗi.
- **Ô cài đặt “✨ Hiệu ứng chuyển động”** trong trang Thiết lập: bật/tắt riêng phần chuyển động và phần rung. Nếu điện thoại đang bật **Giảm chuyển động** trong Trợ năng thì app tự tắt hiệu ứng, không cần chỉnh tay.

## Sửa lỗi
- **Thanh tiến trình mục tiêu trên Dashboard luôn hiển thị 42% bất kể dữ liệu thật.** Gốc lỗi: khối CSS “V9.x” khai báo `.bcMetric:before{width:42%!important}` nằm **sau** quy tắc dùng biến `--goal-progress` do `renderDashboard()` ghi ra. Hai quy tắc cùng độ ưu tiên và cùng `!important` thì quy tắc đứng sau thắng, nên giá trị 42% ghim cứng đè lên dữ liệu thật. Nay nối lại đúng biến (`width:calc((100% - 24px) * var(--goal-progress,0))`), khớp với vệt nền `:after` đang chừa 12px mỗi bên, và bổ sung một mục kiểm tra trong `release_check.py` để lỗi này không tái diễn.
- **Chuyển trang phải chờ 500ms spinner phủ kín màn hình.** Bản cũ cố tình trì hoãn `doShowPage()` nửa giây và phủ một lớp `appLoading` mờ toàn màn hình cho mỗi lần bấm menu — chờ lâu hơn thời gian dựng nội dung thật. Nay các trang nặng (Thống kê, Timeline, Sổ sức khỏe, Tổng kết năm, Hành trình theo tháng, Kho sữa, Lịch khám, Biểu đồ, Sao lưu, Đám mây) hiện **Skeleton** ngay tại chỗ trong lúc dựng nội dung — có phản hồi sau khoảng 2 khung hình thay vì 500ms. Spinner phủ kín màn hình chỉ còn dùng cho việc thật sự lâu và không đoán trước được: đẩy/kéo dữ liệu đám mây.

## Tương thích dữ liệu
- Không thêm, đổi hay xoá bất kỳ trường dữ liệu nào. Tuỳ chọn hiệu ứng nằm riêng ở khoá `meYeuBeAnimPref_v1` của trình duyệt, không nằm trong `db` nên không ảnh hưởng sao lưu, xuất file hay đồng bộ đám mây.
- Tắt hiệu ứng thì app quay đúng về hành vi của V14.2.0, kể cả spinner 500ms khi chuyển trang.

## Quy trình
- Đối chiếu `BASELINE_LOCK_V14.2.0.json` (75 hàm): **75/75 hàm giữ nguyên hash**, `INTENTIONAL_BASELINE_CHANGES` để rỗng. Lý do: Animation System không sửa một dòng nào của mã cũ — mọi chỗ cần can thiệp đều **bọc hàm lúc chạy** bằng `axWrap()`, nên văn bản mã nguồn của các hàm bị khoá không đổi.
- `BASELINE_LOCK_V14.3.0.json` khoá 114 hàm: 75 hàm cũ + 39 hàm mới của Animation System.
- `release_check.py` bổ sung 5 nhóm kiểm tra mới: (1) đủ 25 hàm bắt buộc của Animation System, (2) đủ keyframes và biến CSS dùng chung, (3) thanh tiến trình phải nối với `--goal-progress`, (4) mọi thời lượng ≤ 250ms và khoảng cách fade danh sách trong 30~50ms, (5) không lạm dụng Rotate và bắt buộc dùng `axWrap` thay vì sửa hàm cũ.

# V14.2.0 — Sửa cuộn ngang popup, xuất báo cáo, hạn dùng khi chuyển sữa + gỡ Nhật ký & Sức khỏe mẹ
Ngày: 2026-07-31

## Sửa lỗi
- **Hộp thoại kéo ngang qua lại được** (rõ nhất ở *Thêm mũi tiêm* và *Thêm nhanh*). Gốc lỗi: khung hộp thoại đặt `overflow-y:auto` còn `overflow-x` để mặc định, mà theo CSS khi một trục là `auto` thì trục kia tự nâng thành `auto` — nên khung luôn sẵn sàng cuộn ngang. Phần tử gây tràn là ô `input[type=date]` / `type=time`: trên iOS chúng có bề rộng tối thiểu nội tại, `width:100%` không ép nhỏ lại được. Nay khoá trục ngang ở khung (`overflow-x:hidden`, `touch-action:pan-y`) và ép nội dung con không tràn (`max-width:100%`, `min-width:0`), áp cho **toàn bộ** popup chứ không riêng hai hộp thoại bị báo lỗi. Mở hộp thoại cũng luôn về mép trái, không giữ vị trí cuộn của lần trước.
- **Xuất báo cáo bị kẹt, không đóng và không quay lại được.** Gốc lỗi: báo cáo mở bằng `window.open('','_blank')`; trên trình duyệt máy tính tab mới có nút đóng nên không sao, nhưng khi app chạy dạng PWA (đã Thêm vào màn hình chính) thì cửa sổ mới **không có thanh điều hướng, không có nút đóng, không có nút Back**. Nay báo cáo hiển thị trong một popup tách riêng ngay trong app: nút **✕** ở góc, nút **Đóng** ở chân, chạm ra ngoài cũng đóng được; muốn in hoặc lưu PDF thì bấm **🖨 In / Lưu PDF**, in thẳng khung nội dung mà vẫn ở trong app. Nội dung báo cáo giữ nguyên 100%, chỉ đổi cách hiển thị.
- **Chuyển sữa từ ngăn đông về ngăn mát bị cấp sai hạn dùng.** Công thức cũ cho sữa đã rã đông trọn 96 giờ của ngăn mát, trong khi sữa mẹ rã đông chỉ nên dùng trong 24 giờ và không được cấp đông lại. Nay app nhận diện trường hợp rã đông (đông / đông sâu → mát / túi đá / nhiệt độ phòng) và gợi ý hạn 24 giờ kể từ lúc chuyển, kèm cảnh báo rõ ràng.

## Thêm mới
- **Tự nhập hạn sử dụng khi chuyển sữa.** Popup Chuyển sữa có thêm nút **🕒 Tự nhập hạn dùng** mở ô chọn ngày giờ, đã điền sẵn gợi ý của app nên chỉ cần chỉnh phần muốn đổi. Đổi *Ngày chuyển* / *Giờ chuyển* / *Bảo quản ở* thì gợi ý được nạp lại theo. Khung xem trước ghi rõ hạn đang đến từ đâu: *bạn tự nhập* / *sữa rã đông — tính lại 24 giờ* / *tính lại theo nơi bảo quản mới* / *giữ nguyên như túi gốc*. Túi mới và giao dịch Chuyển sữa lưu thêm cờ `expireManual`, `thawed` để truy vết.

## Gỡ bỏ
- **Module Nhật ký đã gỡ hoàn toàn** — 26 hàm và 3 trang (`#diary` Thêm nhật ký, `#diaryBook` Cuốn nhật ký, `#diaryType` Loại nhật ký), mục Nhật ký ở menu trái, mục **Danh mục → Loại nhật ký**, chip lọc và chỉ mục **Nhật ký** trong Tìm kiếm toàn app, tuỳ chọn `📖 Nhật ký` của thanh dưới, cùng 21 quy tắc CSS chết đi kèm.
  - Lưu ý: mục **Nhật ký chăm sóc** (timeline bú / ngủ / tã) là module khác và **không** bị ảnh hưởng.
- **Sức khỏe mẹ đã gỡ** — trang `#health`, hai hàm `saveMom` / `resetMomForm` và mục ở menu trái. Sổ sức khỏe 2.0 đã có hồ sơ riêng cho Mẹ nên trang cũ chỉ còn trùng lặp.

## Thay đổi
- **Menu bên trái**: dòng *Phiên bản hiện tại* nay nằm sát ngay trên thanh dưới. Trước đó khoảng trống là do hai lớp đệm cộng dồn (`.sidebar` 16px + `.sideFoot` 84px, cộng thêm hai lần vùng an toàn của máy có thanh Home) tạo ra tới ~168px, trong khi thanh dưới chỉ chiếm 66px. Nay chừa đúng 76px — sát thanh dưới, còn một khe hở nhỏ, không đè lên nhau.
- Danh sách tuỳ chọn thanh dưới: nút cũ `diaryBook` / `diary` chuyển sang **Nhật ký chăm sóc**, `diaryType` sang **Loại lịch khám**, `health` sang **Sổ sức khỏe**. Cấu hình cũ của người dùng được chuyển tự động nên không mất nút.
- Bảng **Thêm** ở thanh dưới: mục Danh mục đổi phụ đề thành *Loại lịch khám / bình túi trữ sữa*.

## Tương thích dữ liệu
- `db.diary`, `db.diaryTypes`, `db.mom` **không bị xoá**. Chỉ giao diện bị gỡ; dữ liệu vẫn nằm trong sao lưu, xuất JSON / ZIP / SQLite / CSV và đồng bộ đám mây, khôi phục lại được nguyên vẹn.
- `normalize()` giữ nguyên phần chuẩn hoá cho cả ba nhóm dữ liệu trên.
- Đối chiếu `BASELINE_LOCK_V14.1.0.json` (61 hàm): 60 hàm giữ nguyên; riêng `hb2ExportProfile` thay đổi **có khai báo** để sửa lỗi kẹt màn hình báo cáo.

## Quy trình
- `release_check.py` bổ sung cơ chế `INTENTIONAL_BASELINE_CHANGES`: hàm nằm trong Baseline Lock chỉ được phép đổi khi khai báo kèm lý do, và được in ra mục *THAY ĐỔI CÓ CHỦ Ý* thay vì báo lỗi. Hàm không khai báo mà đổi vẫn báo lỗi hồi quy như cũ; khai báo thừa (trỏ vào hàm không có trong lock trước) cũng bị báo lỗi để buộc dọn sạch khi bump bản.

# V14.1.0 — Khoá cuộn popup + gỡ Sổ sức khỏe V1
Ngày: 2026-07-30

## Sửa lỗi
- **Mở popup/modal thì nền vẫn cuộn được.** Bộ khoá cuộn cũ (V12.0) chỉ nhận diện popup theo quy ước đặt tên `[class*="Overlay"].show`, nên các popup không theo quy ước đó — điển hình là toàn bộ hộp thoại của Sổ sức khỏe 2.0 (`.hb2Modal` dùng lớp `hidden`) và bảng **Thêm** ở thanh dưới (`.moreSheet.show`) — không bao giờ được khoá. Nay đổi sang nhận diện theo biểu hiện thật của phần tử: `position:fixed`, đang hiển thị (không `display:none`, không trong suốt, không `pointer-events:none`) và phủ ≥85% chiều ngang, ≥60% chiều dọc màn hình. Mọi popup hiện có và popup thêm về sau đều tự được khoá, không cần khai báo thêm.
- Khi mở popup, trang nền không còn nhảy về đầu: vị trí cuộn được ghi nhớ trước lúc khoá và trả về đúng chỗ cũ khi đóng.
- Cuộn hết nội dung trong popup không còn "kéo lây" ra trang nền (`overscroll-behavior:contain` cho các panel và lớp phủ).

## Gỡ bỏ
- **Sổ sức khỏe phiên bản đầu tiên (V1) đã gỡ hoàn toàn**, gồm cả chức năng "Thêm sổ sức khỏe" cũ:
  - Xoá 2 trang `#healthBook` (Thêm sổ sức khỏe) và `#healthBookView` (Xem sổ sức khỏe).
  - Xoá các hàm V1: `saveHealthBook`, `editHealthBook`, `resetHealthBookForm`, `healthBookSnapshot`, `healthBookIdentityHtml`, `healthHistoryHtml`, `healthBookBlockHtml`, `renderHealthBookView`, bộ editor vaccine cũ (`addHealthVaccineRow`, `removeHealthVaccineRow`, `setHealthVaccineRows`, `getHealthVaccineRows`, `vaccineSummary`, `vaccineListHtml`) và hai hàm menu `toggleHealthBookMenu`, `openHealthBookMenu`.
  - Menu bên trái: 3 mục con gộp lại thành một mục **Sổ sức khỏe** trỏ thẳng vào module 2.0.

## Thay đổi
- Bảng **Thêm** ở thanh dưới: mục Sổ sức khỏe nay mở module 2.0; bổ sung thêm mục **Ghi nhận sức khỏe** mở thẳng hộp Thêm nhanh (đo, tiêm, khám, thuốc, xét nghiệm, ghi chú).
- Danh sách tuỳ chọn thanh dưới: `healthBookView` đổi thành `healthBook2`. Người dùng đã cấu hình nút cũ được tự động chuyển sang module 2.0 (`migrateBottomNavId`) nên không mất nút.
- Cột mốc tự động **"Mũi tiêm đầu tiên"** đổi nguồn: đọc mũi tiêm từ Sổ sức khỏe 2.0 (`db.hb.members` có `rel = 'Con'`, trạng thái *Đã tiêm*), đồng thời vẫn đọc dữ liệu V1 cũ đã lưu để không mất cột mốc đã sinh trước đây.

## Tương thích dữ liệu
- `db.healthBook` (dữ liệu V1) **không bị xoá**. Chỉ giao diện V1 bị gỡ; dữ liệu vẫn nằm trong sao lưu, xuất file và đồng bộ đám mây, và vẫn là nguồn cho migration một lần sang `db.hb`.
- Người dùng chưa từng mở app kể từ V14.0.0 vẫn được migration đầy đủ khi mở bản này.
- Không sửa bất kỳ hàm nào trong `BASELINE_LOCK_V14.0.0.json`.

# V14.0.0 — Sổ sức khỏe 2.0 (Health Book 2.0)
Ngày: 2026-07-30

## Thêm mới
- **Sổ sức khỏe 2.0**: hồ sơ sức khỏe độc lập cho từng thành viên gia đình (Bé, Mẹ, Ba, Ông, Bà, Khác). Mỗi thành viên một hồ sơ khép kín, không dùng chung dữ liệu.
- Danh sách thành viên dạng chip ngang, bấm để chuyển hồ sơ, bấm lại để xem avatar lớn.
- Thêm thành viên: avatar, họ tên, quan hệ, ngày sinh, giới tính, nhóm máu, chiều cao, cân nặng, email, SĐT.
- Thông tin y tế: mã BHXH, mã BHYT, ngày hết hạn, nơi đăng ký khám, bệnh viện thường khám, bác sĩ theo dõi, liên hệ khẩn cấp.
- Tiền sử: tiền sử bệnh, bệnh nền, dị ứng (thuốc/thực phẩm/hải sản/phấn hoa/khác), phẫu thuật, tiền sử gia đình.
- Ghi chú sức khỏe và tệp đính kèm (ảnh toa thuốc, ảnh BHYT/BHXH, PDF khám bệnh, ảnh sổ tiêm).
- Dashboard thành viên: tình trạng sức khỏe, cân nặng, chiều cao, BMI (người lớn) / vòng đầu (bé), nhóm máu, tiêm chủng, khám gần nhất, thuốc đang dùng, cảnh báo mũi tiêm quá hạn.
- Biểu đồ tăng trưởng WHO cho thành viên là Con: cân nặng, chiều dài/cao, vòng đầu theo tuổi, kèm Z-score, bách phân vị và nhận xét tự động. Không hiển thị với Ba/Mẹ/Ông/Bà.
- Tiêm chủng: trạng thái Đã tiêm / Sắp tới / Quá hạn / Chưa lên lịch, kèm nơi tiêm, bác sĩ, phản ứng sau tiêm, ảnh sổ tiêm.
- Khám bệnh: bệnh viện, bác sĩ, triệu chứng, chẩn đoán, điều trị, thuốc, chi phí, BHYT, ghi chú.
- Thuốc: nhắc uống, đánh dấu đã uống theo ngày, ngừng thuốc.
- Xét nghiệm: nhóm theo Máu / Nước tiểu / Xquang / MRI / CT / Siêu âm / Khác, kèm chỉ số chi tiết.
- Timeline sức khỏe với bộ lọc Tất cả / Tiêm / Khám / Thuốc / Xét nghiệm / Chỉ số.
- Báo cáo theo Tuần / Tháng / Quý / Năm: số lần khám, số lần tiêm, thuốc, xét nghiệm, tăng cân, tăng chiều cao, BMI, chi phí. Xuất bản in / PDF.
- Nút thêm nhanh với 7 mục: đo cân nặng, đo chiều cao, tiêm chủng, khám bệnh, thuốc, xét nghiệm, ghi chú.
- Trang Mở rộng tương lai: huyết áp, đường huyết, SpO2, nhịp tim, ECG, nhiệt độ, Lux, dB, AI đánh giá, Apple Health, Google Fit.
- Xuất toàn bộ hồ sơ sức khỏe của thành viên để in hoặc lưu PDF mang đi khám.

## Cải tiến
- Tái sử dụng bộ chuẩn WHO LMS có sẵn từ V13.10.0 thay vì dựng bảng chuẩn mới, nên số liệu Z-score và bách phân vị thống nhất toàn app.
- Hồ sơ của bé tự lấy thêm số đo từ mục Sau sinh và ngày sinh từ Thiết lập.
- Giao diện dùng biến CSS sẵn có nên đồng bộ cả ba chế độ sáng / tối / hồng.

## Sửa lỗi giao diện (14.0.0)
- Khắc phục nút, chip và tab của Sổ sức khỏe 2.0 bị kéo giãn hết dòng trên điện thoại do rule `button{width:100%}` toàn cục.
- Thẻ chức năng nay cao bằng nhau, phụ đề giới hạn 2 dòng.
- Bỏ nút nổi ＋ bị trùng với nút Ghi nhận ở thanh dưới; thay bằng nút "＋ Thêm nhanh" ở đầu trang.
- Thanh chức năng (Tổng quan/Hồ sơ/Tăng trưởng/Timeline/Báo cáo) xuống dòng để hiện đủ, không phải cuộn ngang.
- Thêm khoảng đệm đáy để dòng chữ cuối không bị thanh điều hướng che.
- Hộp thoại nâng z-index để luôn nổi trên thanh điều hướng dưới.

## Tương thích
- Dữ liệu Sổ sức khỏe cũ được tự động chuyển sang hồ sơ mới, đồng thời **giữ nguyên** dữ liệu và hai trang cũ (Thêm / Xem sổ sức khỏe).
- Dữ liệu mới nằm trong `db.hb` nên tự động có trong sao lưu và đồng bộ đám mây, không thay đổi `exportDB` / `importDB`.
- Baseline Lock đối chiếu với V13.10.0: 0 hàm cũ bị thay đổi.


## V13.10.0 — Biểu đồ tăng trưởng WHO
- **Thẻ mới "🌍 Biểu đồ tăng trưởng WHO"** trong trang Biểu đồ phát triển sau sinh: đối chiếu số đo của bé với Chuẩn tăng trưởng trẻ em WHO 2006 cho 3 chỉ số — cân nặng theo tuổi, chiều dài/cao theo tuổi, vòng đầu theo tuổi (0–5 tuổi).
- **Đọc được ngay bé đang ở đâu**: biểu đồ vẽ dải xanh "bình thường" (−2 → +2 SD) và hai dải vàng cảnh báo (±2 → ±3 SD), đường trung bình WHO, và đường của bé chồng lên. Chạm vào từng điểm xem chi tiết ngày đo, tuổi, z-score, bách phân vị.
- **Ô tóm tắt lần đo mới nhất** ghi rõ z-score, bách phân vị, mức trung bình WHO cùng tháng tuổi và khoảng bình thường, kèm nhãn đánh giá (bình thường / suy dinh dưỡng thể nhẹ cân / thấp còi / vòng đầu nhỏ–lớn hơn chuẩn) và một câu gợi ý nên làm gì tiếp.
- **Bảng chi tiết** mọi lần đo kèm z-score và đánh giá từng mốc, mở ra khi cần.
- **Chọn khoảng tuổi** để xem: tự động theo tuổi bé, hoặc 6 tháng / 1 tuổi / 2 tuổi / 5 tuổi.
- **Thêm trường "Giới tính của bé"** trong Thiết lập hồ sơ — WHO có bảng chuẩn riêng cho bé trai và bé gái. Có thể chọn nhanh ngay trong thẻ biểu đồ, app nhớ luôn.
- **Tự hiểu đơn vị**: ô Cân nặng nhập `3500` hiểu là gam, `3,5kg` hiểu là kilogam; chiều dài / vòng đầu lỡ nhập bằng mét cũng tự quy về cm.
- Số liệu dùng bảng LMS chính thức của WHO (61 mốc tháng × 3 chỉ số × 2 giới tính). Đã đối chiếu 1.830 giá trị đường SD dựng lại từ công thức với cột SD in sẵn của WHO — khớp tuyệt đối.
- Kết quả chỉ mang tính tham khảo, không thay thế chẩn đoán của bác sĩ — có ghi chú rõ ngay dưới biểu đồ.

## V13.9.4 — Tìm kiếm mở ở trạng thái sạch
- Mở ô tìm kiếm mà **chưa nhập gì và chưa chọn lọc gì** thì không đổ toàn bộ dữ liệu ra nữa. Thay vào đó là màn hình mời nhập từ khóa kèm vài ví dụ; ô đếm hiện tổng số mục có thể tìm.
- **Bấm chip loại hoặc chọn khoảng thời gian vẫn được coi là đã lọc** — vẫn hiện kết quả ngay như trước, không cần gõ chữ.
- Xóa hết từ khóa (nút ✕) thì quay lại màn hình mời nhập.

## V13.9.3 — Biểu đồ xoay ngang & sửa lỗi danh sách tìm kiếm
- **Sửa lỗi nặng: danh sách tìm kiếm bị co dẹp.** `.gsResults` là flex column có chiều cao cố định nên các dòng kết quả bị thuật toán flex **co lại cho vừa khung** thay vì tràn ra để cuộn. Ít kết quả không thấy gì lạ; 12 kết quả thì dòng bị cắt cụt chữ; 86 kết quả thì co về 0 → màn hình trắng trơn dù vẫn đếm đủ số. Đã khoá `flex:0 0 auto` cho các dòng.
- **Toàn màn hình tự nằm ngang** như app xem chart tài chính: xin fullscreen + khoá hướng landscape (Android Chrome xoay máy thật); iOS Safari không cho khoá hướng nên xoay chính lớp nội dung 90° bằng CSS, đảo chiều rộng/cao — cầm máy dọc vẫn xem được biểu đồ trải hết chiều dài màn hình. Nút **⟳** để tự lật lại; xoay máy thật thì trả quyền về chế độ tự động.
- **Tìm kiếm bỏ qua dấu cách**: `80ml` ra bản ghi ghi là `80 ml`, `d3k2` ra `Vitamin D3 + K2`, `vitamind` ra `Vitamin D`.
- **Hiện cả hai nhóm cùng lúc**: kết quả khớp chính xác nằm trên, kết quả gần đúng nối ngay sau kèm vạch ngăn — thay vì giấu nhóm gần đúng như bản trước. Ô đếm ghi rõ bao nhiêu kết quả khớp đúng.

## V13.9.2 — Tinh chỉnh biểu đồ, cột mốc & tìm kiếm
- **Thẻ thông tin bé** — thời gian bé đã ngủ đọc bằng chữ (`1 giờ 30 phút`) thay vì `01:30` dễ bị hiểu nhầm thành mốc giờ trong ngày. Dưới 1 phút ghi "chưa tới 1 phút".
- **Biểu đồ · bấm chip không còn nhảy về đầu trang**: hàng chip nay chỉ dựng một lần, mỗi lần đổi loại chỉ thay ruột thẻ biểu đồ; chiều cao được khóa trong lúc thay và vị trí cuộn được khôi phục, nên mắt đứng yên tại chỗ. Hàng chip chỉ cuộn ngang khi chip đang chọn nằm ngoài tầm nhìn. Đổi Ngày/Tuần/Tháng cũng giữ nguyên vị trí.
- **Biểu đồ toàn màn hình cao hết cỡ**: bỏ trần cứng 460px, đo đúng khoảng trống thật còn lại của màn hình (trừ hao chú thích và dòng gợi ý) nên vẽ kín mà không tràn viền; xoay ngang máy thì tự vẽ lại vừa khít.
- **Hành trình lớn khôn · cột mốc tự động biết rút lại**: xóa dữ liệu gốc thì cột mốc do hệ thống tự ghi nhận từ dữ liệu đó cũng bị gỡ, kèm thông báo tương ứng trong Trung tâm cảnh báo. Cột mốc tự tạo thủ công không bị đụng tới. Áp dụng cho mọi đường xóa (chăm sóc, tăng trưởng, sổ tiêm).
- **Tìm kiếm gần đúng**: gõ thiếu dấu, sai một hai chữ cái, hoặc không đúng thứ tự từ vẫn ra kết quả. Ưu tiên hiện nhóm khớp nguyên văn; hết mới rơi xuống nhóm gần đúng kèm nhãn báo rõ. Chip loại và khoảng thời gian luôn kết hợp cùng ô tìm kiếm.

## V13.9.1 — Biểu đồ chọn theo chip
- Thay bố cục xếp dọc 10 biểu đồ bằng hàng chip chọn loại dữ liệu + hiển thị 1 biểu đồ.
- Giữ nguyên toàn bộ tính năng: tooltip, đổi loại chart, Max/TB/Min, Goal, so sánh kỳ trước, toàn màn hình, nhận định tự động.
- Giảm khối lượng tính toán mỗi lần render (1 thay vì 10 biểu đồ).

## V13.9.0 — Nâng cấp giao diện Biểu đồ (Chart UX)
- Thay tầng render biểu đồ khu Chăm sóc bằng engine mới (giữ nguyên logic dữ liệu).
- Chart lớn, header, tooltip, đổi loại chart, Max/TB/Min, Goal, so sánh kỳ trước, animation, empty state, toàn màn hình, nhận định tự động.
- Biểu đồ Thai kỳ/Sau sinh giữ nguyên (đồng bộ ở bản sau).

# MeYeuBe V13.8.0

## V13.8.0 – 💡 Thêm công cụ Đo ánh sáng (Lux Meter)
- Menu **Công cụ → 💡 Đo ánh sáng**: đo cường độ ánh sáng quanh bé để biết phòng đã đủ tối cho bé ngủ hay đang quá sáng.
- **Ưu tiên cảm biến ánh sáng thật** của thiết bị (`AmbientLightSensor`); máy không có (iPhone, phần lớn trình duyệt) thì **tự chuyển sang ước lượng qua camera sau**. Bản ghi có ghi rõ đo bằng cách nào.
- Màn hình đo: số Lux lớn, thanh mức, trạng thái đổi màu; các ô **Hiện tại / Thấp nhất / Cao nhất / Trung bình** và **Thời gian đo**.
- **Thang đo log** thay vì thang thẳng — vì Lux trải từ 0 đến hơn 1000, thang thẳng sẽ dìm mất vùng 10–40 Lux (đúng vùng bé ngủ).
- **Biểu đồ đường realtime**, lưới ngang đặt đúng 4 mốc đánh giá (10 · 40 · 150 · 500) nên nhìn đường nằm giữa vạch nào là biết mức đó.
- Chỉ 2 thao tác **▶ Bắt đầu đo / ⏹ Dừng đo**; không lưu gì cho tới khi bấm Dừng. Bấm Dừng tạo bản ghi vào `db.luxLogs`.
- **Lịch sử đo** cùng khuôn với Đo tiếng ồn: gom nhóm theo ngày, 3 ô chỉ số (ô Trung bình tô theo màu mức), sparkline, vạch màu bên trái, nút xóa từng bản ghi.
- Nút **ⓘ** mở bảng giải thích 5 mức: 🌑 Rất tối (&lt;10) · 🌙 Ánh sáng dịu (10–40) · 🟢 Ánh sáng nhẹ (41–150) · ☀️ Đủ sáng (151–500) · ⚠️ Quá sáng (&gt;500).
- Rời trang giữa chừng tự tắt cảm biến/camera, không tạo bản ghi rác.

# MeYeuBe V13.7.1

## V13.7.1 – 🎨 Làm lại giao diện Lịch sử đo tiếng ồn
- **Sửa lỗi vỡ giao diện trên điện thoại**: nút “Xóa” dính quy tắc chung `button{width:100%}` ở màn hình ≤640px nên chiếm trọn hàng, đẩy dòng giờ thành cột hẹp vỡ từng chữ và làm thẻ tràn ra ngoài. Nay nút Xóa là nút icon 🗑 vuông 34px, khóa chiều rộng riêng.
- **Gom nhóm theo ngày**: mỗi ngày có một tiêu đề (kèm nhãn “Hôm nay / Hôm qua” và số lần đo) thay vì lặp lại ngày ở từng thẻ.
- **Dòng giờ là điểm nhấn** (`22:48 → 22:50`), thời lượng tách xuống dòng dưới; các đoạn không còn bị ngắt giữa chữ ở màn hình hẹp.
- **Ba ô chỉ số đều nhau** (Thấp nhất / Trung bình / Cao nhất) thay cho 3 chip lệch nhau; ô **Trung bình tô theo màu mức ồn** vì đánh giá dựa trên chỉ số này.
- **Sparkline** vẽ diễn biến từng buổi đo (dùng dữ liệu `spark` đã lưu sẵn từ V13.7.0); bản ghi cũ không có dữ liệu này thì tự bỏ qua.
- **Vạch màu bên trái thẻ** theo mức ồn để quét mắt nhanh; **trạng thái trống** viết lại thành lời mời hành động.

# MeYeuBe V13.7.0

## V13.7.0 – 🔊 Thêm công cụ Đo tiếng ồn (Noise Meter)
- Menu mới **Công cụ → 🔊 Đo tiếng ồn**: dùng micro thiết bị đo độ ồn môi trường quanh bé theo thời gian thực.
- Màn hình đo: số dB lớn ở giữa, thanh mức, trạng thái màu theo mức ồn; các ô **Hiện tại / Thấp nhất / Cao nhất / Trung bình** và **Thời gian đo** (hh:mm:ss).
- **Biểu đồ đường realtime** vẽ mức dB thay đổi theo thời gian trong lúc đo.
- Chỉ 2 thao tác: **▶ Bắt đầu đo** / **⏹ Dừng đo**. Khi bắt đầu sẽ xin quyền micro; không lưu gì cho đến khi bấm Dừng.
- Bấm Dừng tạo **một bản ghi** (ngày, giờ bắt đầu–kết thúc, thời lượng, Min/Avg/Max, đánh giá) và hiện trong **Lịch sử đo** dạng timeline, có nút xóa từng bản ghi.
- Thang đánh giá theo Average: 🟢 Rất yên tĩnh (<40), 🟢 Yên tĩnh (40–55), 🟡 Hơi ồn (56–65), 🟠 Ồn (66–75), 🔴 Quá ồn (>75).
- Nút **ⓘ** góc trên mở bottom-sheet giải thích các mức. Ghi chú rõ giá trị dB chỉ mang tính tham khảo, khác nhau giữa các thiết bị, không thay máy đo chuyên dụng.
- Rời trang giữa chừng sẽ tự dừng micro (không tạo bản ghi). Dữ liệu lưu tại `db.noiseLogs`.

# MeYeuBe V13.6.0

## V13.6.0 – 🎨 Trạng thái ngủ, định dạng ngày, chi tiết theo ngày
- Trạng thái "Bé đang ngủ": **đổi nền pill sang tím** (nền tím nhạt, viền tím, chữ tím đậm — thay cho tông xanh cũ) cho đồng bộ với vòng avatar; dòng "Đã ngủ" ăn theo màu chữ của pill. Đồng thời **bỏ giây**, chỉ còn hh:mm (cả lần vẽ đầu lẫn bộ đếm cập nhật mỗi giây).
- Định dạng ngày toàn app chuẩn hoá về **DD/MM/YYYY** có số 0 ở đầu (fmtDate không còn phụ thuộc locale).
- Modal xem chi tiết chăm sóc: mũi tên ‹ › giờ đi **theo NGÀY** (trước đó nhảy theo tuần) — trái = ngày trước, phải = ngày tiếp theo; nhãn đổi thành "Ngày trước / Ngày sau".
- Giao diện picker trong modal: **nới rộng ô ngày**, thu hẹp ô tổng số lần bên phải (tỷ lệ cột 1.75 : 1) để ngày hiển thị rõ hơn.
- Chi tiết **Hút sữa** hiển thị luôn **bình/túi chứa**: chip loại + tên ngay trên thẻ ghi nhận (vd 🍼 Bình · Fatz 1️⃣) và thêm dòng "Bình / Túi chứa" trong popup chi tiết. Dữ liệu cũ không có container thì không hiện để tránh gắn nhãn sai.

# MeYeuBe V13.5.0

## V13.5.0 – 🎨 Gọn lại kho sữa, bé bú và form thay tã
- Thẻ kho sữa: bỏ ô "Dung tích" trùng lặp; thời gian còn lại lên hàng tiêu đề, dung tích xuống dòng riêng kèm nhãn 🍼 Bình / 🥛 Túi; nơi bảo quản gộp vào dòng meta.
- Đổi cách gọi: "Danh sách bình / túi", ô tổng quan "3 bình · 1 túi", popup chi tiết hiện đúng loại.
- Chi tiết Bé bú: bỏ chữ "Túi" ghi cứng, hiện nhãn loại đúng; in đậm số ml của cữ bú.
- Form Thay tã: thay dãy nút 1/2/3/+ bằng một ô số lượng có − và +, mặc định 1, giới hạn 1–3, nút tự mờ khi chạm biên.
- Regression Lock: 26/26 hàm lõi ở BASELINE_LOCK_V13.4.3 không đổi — xem BASELINE_LOCK_V13.5.0.json.

# MeYeuBe V13.4.3

## V13.4.3 – 🎛 Chỉ hiện bình/túi đang dùng
- Bình/túi khác trạng thái "Đang dùng" không xuất hiện ở bất kỳ chỗ chọn dữ liệu nào (Hút sữa, Chuyển sữa), không ngoại lệ kể cả khi Sửa bản ghi cũ.
- Gom về một hàm dùng chung mcSelectableList(); chặn cả khi gọi thẳng vào mục đã ẩn.
- Bản ghi cũ gắn mục đã ẩn: giữ nguyên dữ liệu, báo rõ bằng dòng gợi ý bên dưới.
- Danh sách rỗng phân biệt "đều đang Tạm ẩn" với "chưa khai báo".
- Trang Danh mục: thanh đếm, nút lọc "Chỉ hiện đang dùng", nút Tạm ẩn/Bật lại một chạm có Hoàn tác.
- Regression Lock: 26/26 hàm lõi ở BASELINE_LOCK_V13.4.1 không đổi — xem BASELINE_LOCK_V13.4.3.json.

# MeYeuBe V13.4.1

## V13.4.1 – 🐞 Fix popup Chuyển sữa bị che
- Nâng z-index popup Chuyển sữa từ 120 lên 166 để không bị popup chi tiết Kho sữa (135) che mất — đây là lý do bấm nút Chuyển mà không thấy gì.
- Bỏ kiểm tra __milkSwipeLock trong tfOpen: khoá vuốt chỉ dùng để chặn cú chạm vào thẻ, không được chặn nút hành động.
- Chuyển sữa xong thì vẽ lại popup chi tiết Kho sữa đang mở phía sau.
- tfClose chỉ mở khoá cuộn nền khi không còn popup nào khác đang mở.
- Regression Lock: 26/26 hàm lõi ở BASELINE_LOCK_V13.4.0 không đổi — xem BASELINE_LOCK_V13.4.1.json.

# MeYeuBe V13.4.0

## V13.4.0 – 🔄 Chuyển sữa giữa bình và túi
- Thêm nghiệp vụ Chuyển sữa: tạo giao dịch mới thay vì sửa bản ghi hút sữa cũ, lịch sử luôn đúng thực tế.
- Vuốt trái trên thẻ kho sữa → ✏️ Sửa · 🔄 Chuyển · 🗑 Huỷ túi. Popup cho chọn Bình/Túi đích, dung tích, ngày giờ và nơi bảo quản mới.
- Chuyển toàn bộ → nguồn về 0ml, trạng thái "Đã chuyển hết". Chuyển một phần → nguồn giữ phần còn lại. Cho phép chuyển nhiều lần.
- Hạn dùng: giữ nguyên nơi bảo quản thì giữ nguyên hạn; đổi nơi thì tính lại và cảnh báo nếu hạn bị kéo dài.
- Túi mới giữ mốc ngày giờ hút gốc để truy vết; thẻ kho sữa hiện "🔄 Chuyển từ …".
- Xoá/Hoàn tác trả sữa về nguồn; chặn xoá nếu sữa đã dùng một phần hoặc đã chuyển tiếp.
- Regression Lock: 26/26 hàm lõi ở BASELINE_LOCK_V13.3.0 không đổi — xem BASELINE_LOCK_V13.4.0.json.

# MeYeuBe V13.3.0

## V13.3.0 – 🍼 Danh mục Bình/Túi & tự gắn túi theo số ml
- Thêm danh mục dùng chung "Bình / Túi trữ sữa" (Bình dùng lại khai báo từng cái, Túi dùng một lần khai báo một dòng chung).
- Hút sữa chọn bình/túi bằng chip thay ô ghi chú; túi dùng một lần được đặt mã tự động YYMMDD-HHMM theo ngày giờ hút.
- Bé bú từ kho sữa: nhập số ml là tự gắn bình/túi và TÍNH LẠI LIVE mỗi lần đổi số ml. Ưu tiên hạn dùng gần nhất, cùng hạn thì túi ít ml trước.
- Kho không đủ vẫn gắn hết mức có thể kèm cảnh báo; bấm ✕ thì chuyển sang thủ công, có nút cho app tự chọn lại; đang Sửa ghi nhận cũ thì không bị đè.
- Tự chuyển đổi ghi chú kho sữa cũ thành danh mục bình.
- Gỡ bỏ hoàn toàn tính năng tự động điền của bản thử nghiệm trước.
- Regression Lock: 26/26 hàm lõi ở BASELINE_LOCK_V13.2.3 không đổi — xem BASELINE_LOCK_V13.3.0.json.

# MeYeuBe V13.2.3

## V13.2.3 – 🛠 Toast + Hoàn tác song song, fix tràn nút
- Khôi phục Toast "...thành công" hiện cùng lúc với Snackbar Hoàn tác (Toast trên, Snackbar dưới, không đè nhau) theo phản hồi người dùng.
- Fix nút "Hoàn tác" bị tràn full chiều ngang do rule CSS toàn cục `button{width:100%}` — thêm width:auto!important riêng cho nút này.
- Regression Lock: 26/26 hàm lõi ở BASELINE_LOCK_V13.2.2 không đổi — xem BASELINE_LOCK_V13.2.3.json.

# MeYeuBe V13.2.2

## V13.2.2 – 🛠 Bỏ chồng chéo Toast/Snackbar Hoàn tác
- Fix Toast "...thành công" và Snackbar "Hoàn tác" hiện chồng lên nhau khi Thêm mới/Xóa (khiến nút Hoàn tác trông vỡ/tràn) — nay chỉ còn Snackbar làm xác nhận cho 12 điểm có Undo; Toast vẫn giữ cho các trường hợp Sửa/cảnh báo/lỗi.
- Tăng z-index Snackbar lên trên Toast để phòng ngừa trường hợp hiếm còn chồng lấn.
- Regression Lock: 26/26 hàm lõi ở BASELINE_LOCK_V13.2.1 không đổi — xem BASELINE_LOCK_V13.2.2.json.

# MeYeuBe V13.2.1

## V13.2.1 – 🛠 Sửa giao diện Snackbar Hoàn tác + Live-refresh sau Undo
- Fix lỗi vỡ dòng chữ trong Snackbar (thiếu min-width:0 trên flex item — lỗi Safari/iOS kinh điển); thiết kế lại: icon tròn + chữ 1 dòng + nút pill hồng.
- Fix Undo không cập nhật modal "Xem chi tiết theo loại" đang mở (phải đóng/mở lại mới thấy) — nay Hoàn tác tự vẽ lại đúng modal đang mở và cả kết quả Tìm kiếm nếu đang mở.
- Regression Lock: 26/26 hàm lõi ở BASELINE_LOCK_V13.2.0 không đổi — xem BASELINE_LOCK_V13.2.1.json.

# MeYeuBe V13.2.0

## V13.2.0 – ↩️ Undo sau khi Thêm mới/Xóa
- Snackbar "Hoàn tác" sau khi Thêm mới/Xóa (Bé bú, Hút sữa, Ngủ, Thay tã, Uống thuốc, Nhiệt độ, Trớ sữa, Lịch khám, Milestone, Nhật ký, Sổ sức khỏe, Chỉ số thai kỳ/bé/mẹ, Hủy túi sữa) — trượt lên từ dưới, tự ẩn sau 8s bằng fade out, chỉ 1 Snackbar/lúc.
- Hoàn tác = khôi phục snapshot DB trước thao tác qua save() gốc, rollback đúng cả dữ liệu liên quan (vd kho sữa).
- Không áp dụng cho Sửa/Import/Restore Backup/thao tác hàng loạt.
- Test bằng Node+jsdom trên code thật, gồm kịch bản khó nhất (xóa lần bú từ kho sữa rồi Hoàn tác).
- Regression Lock: 26/26 hàm lõi ở BASELINE_LOCK_V13.1.0 không đổi — xem BASELINE_LOCK_V13.2.0.json.

# MeYeuBe V13.1.0

## V13.1.0 – 🧷 Gọn form Ghi nhận + phân biệt Tã ướt/Tã bẩn
- Fix: banner mô hình liên kết sữa + 2 nút Timer Bú/Ngủ trước đây luôn hiện ở mọi loại chăm sóc (kể cả Thay tã/Uống thuốc/Thân nhiệt/Trớ sữa); nay chỉ hiện khi đang ghi Bé bú/Hút sữa/Ngủ.
- Số lượng tã: bỏ bộ đếm lớn trùng chức năng, chỉ còn hàng nút nhanh 1·2·3·﹢ (﹢ tự hiện số khi vượt quá 3).
- Thẻ "Tã bẩn" trong danh sách ghi nhận được tô nền ấm nhạt để phân biệt nhanh với "Tã ướt".
- Regression Lock: 26/26 hàm lõi ở BASELINE_LOCK_V13.0.0 không đổi — xem BASELINE_LOCK_V13.1.0.json.

# MeYeuBe V13.0.0

## V13.0.0 – 🗂 Backup & Version Control dữ liệu
- Lưu nhiều phiên bản (v1, v2, v3…) của toàn bộ dữ liệu trong IndexedDB riêng, tách biệt localStorage chính. Backup thủ công (nút + ghi chú) và tự động (Tắt/Ngày/Tuần/Tháng/Theo số thay đổi, chỉ kiểm tra khi mở app).
- Lịch sử phiên bản dạng Timeline (tên, ngày, dung lượng, người tạo, ghi chú). Restore có Preview khác biệt (+/− số bản ghi từng loại) và xác nhận gõ KHOIPHUC.
- Export JSON/ZIP/SQLite/CSV cho dữ liệu hiện tại hoặc từng Version. Import JSON/ZIP/SQLite: Ghi đè hoặc Gộp (trùng ID: Bỏ qua/Ghi đè/Giữ cả hai); tự tạo Backup an toàn trước khi áp dụng.
- Không sửa exportDB/importDB/save/load gốc. Regression Lock: 26/26 hàm lõi ở BASELINE_LOCK_V12.2.1 không đổi — xem BASELINE_LOCK_V13.0.0.json.
- Chưa làm: Cloud Backup (để dành bản sau).

# MeYeuBe V12.2.1

## 🐞 Search: hiển thị mặc định tất cả kết quả, không cần chọn điều kiện (V12.2.1)
- Sửa lỗi: mở màn Tìm kiếm mà chưa gõ từ khóa hoặc chưa chọn bộ lọc/khoảng thời gian nào thì không thấy kết quả nào, phải bấm chọn ít nhất 1 điều kiện mới ra dữ liệu.
- Nay khi vừa mở Tìm kiếm (chưa gõ gì, chưa chọn lọc), app hiển thị ngay **toàn bộ dữ liệu, sắp xếp mới nhất lên đầu** — không giới hạn 60 dòng như trước.
- Việc gõ từ khóa hoặc chọn bộ lọc vẫn hoạt động bình thường để thu hẹp kết quả.
- Thêm cơ chế tự dựng lại chỉ mục tìm kiếm nếu vì lý do nào đó chỉ mục rỗng khi lọc, tránh tình trạng màn hình trống dù đã có dữ liệu.
- Regression Lock: 26/26 hàm lõi ở BASELINE_LOCK_V12.2.0 không đổi — xem `BASELINE_LOCK_V12.2.1.json`.

# MeYeuBe V12.2.0

## 🔍 Tìm kiếm toàn app (V12.2.0)
- Thêm một ô tìm kiếm duy nhất quét toàn bộ dữ liệu (Bé bú, Hút sữa, Kho sữa, Thay tã, Ngủ, Thuốc, Nhiệt độ, Trớ sữa, Milestone, Nhật ký, Lịch khám). Vào từ nút 🔍 trên Header hoặc mục Tìm kiếm trong Menu.
- Tìm theo ngày (24/07, 24 Jul, 24-07-2026), giờ (15:30), số ml (70ml, 120), loại hoạt động, ghi chú, mã túi sữa (260724-03 / 260724), tên thuốc, tên cột mốc — không phân biệt dấu.
- Khoảng thời gian nhanh (Hôm nay/Hôm qua/Tuần này/Tháng này), bộ lọc nhiều loại, sắp xếp Mới nhất/Cũ nhất/Liên quan nhất, tô sáng từ khóa.
- Quick Action: bấm để mở chi tiết, vuốt trái để Sửa/Xóa. Không đụng 26 hàm lõi — xem BASELINE_LOCK_V12.2.0.json.

# MeYeuBe V12.1.1

## 🐞 Sửa lỗi khoá cuộn chồng ở modal chăm sóc (V12.1.1)
- Sửa lỗi: từ Dashboard bấm xem một loại chăm sóc rồi đóng và bấm sang loại khác thì màn hình chỉ còn nền tối mờ, modal không hiện. Nguyên nhân là khoá cuộn nền chung (mybScrollLock, V12.0) khoá chồng lên khoá sẵn có của modal (careModalOpen) trên body có backdrop-filter, gây iOS không vẽ được modal.
- Nay mybScrollLock chỉ khoá nền cho các popup không tự khoá (xem ảnh Milestone/avatar, bottom sheet Daily Streak); các modal app vẫn dùng khoá gốc careModalOpen như trước — không còn khoá chồng.
- Regression Lock: 26/26 hàm lõi ở BASELINE_LOCK_V12.1.0 không đổi — xem `BASELINE_LOCK_V12.1.1.json`.

# MeYeuBe V12.1.0

## ✨ Avatar trạng thái · Xem ảnh · Daily Streak — đợt 2 (V12.1.0)
- Vòng màu quanh avatar theo trạng thái bé: 🟢 đang thức · 💜 đang ngủ (các trạng thái đang bú/ốm/tiêm/quấy mở rộng sau).
- Bấm avatar để xem ảnh toàn màn hình đúng tỷ lệ, chạm 2 lần hoặc chụm 2 ngón để zoom (1×–4×), vuốt xuống / bấm ✕ để đóng.
- **Daily Streak**: widget 🔥 + số ngày ghi chép liên tục ngay trên header (dạng chữ, cạnh nút dark mode); bấm mở bảng chi tiết gồm trạng thái hôm nay, kỷ lục, ngày bắt đầu chuỗi, tổng ngày dùng app, tỷ lệ ngày có ghi chép và huy hiệu 🥉7/🥈30/🥇100/👑365. Tính theo ngày địa phương, mỗi ngày chỉ cần ≥1 bản ghi; bỏ lỡ 1 ngày thì chuỗi về 0.
- **Realtime "Cữ bú tiếp theo"**: thời gian còn lại và màu mức khẩn tự cập nhật theo phút, không cần load lại trang.
- Popup mới tự hưởng khoá cuộn nền chung. Regression Lock: 26/26 hàm lõi ở BASELINE_LOCK_V12.0.0 không đổi — xem `BASELINE_LOCK_V12.1.0.json`.
- (Bản kế: V12.2 kéo thả sắp xếp block ở màn Cấu hình Dashboard.)

# MeYeuBe V12.0.0

## 🎨 Nâng cấp UI/UX Dashboard — đợt 1 (V12.0.0)
- Tăng khoảng trắng cho Dashboard thoáng và cao cấp hơn (không đổi bố cục): khoảng cách giữa các block lên **24px**, padding Hero/thẻ lên **20px**, khoảng cách icon–tiêu đề thẻ lên **13px**.
- Chuẩn hoá hệ màu dùng chung một bộ token: 🩷 hồng (bú/bình/kho sữa/CTA) · 💜 tím (ngủ) · 💙 xanh (tã/tè/chăm sóc) · 🟠 cam (milestone) · ❤️ đỏ (cảnh báo/quá hạn/lỗi) · 🩶 xám (label/metadata) — không thêm màu chủ đạo mới; áp trước cho các chỉ số "Chăm sóc hôm nay".
- "Cữ bú tiếp theo" gộp thành **1 dòng gọn ngay trong block Thông tin bé**: `🍼 Cữ bú tiếp theo <giờ> · còn 01 giờ 20 phút`, có vạch + chấm màu theo mức khẩn (🟢 còn nhiều thời gian · 🟠 sắp đến giờ <30 phút · 🔴 đã quá giờ); chưa đủ dữ liệu thì báo xám "chưa đủ dữ liệu để dự đoán".
- **Khoá cuộn nền cho mọi popup/modal**: khi mở bất kỳ overlay nào, giao diện nền phía sau không cuộn được, chỉ cuộn nội dung trong popup — áp cho cả các popup trước đây chưa khoá (xem ảnh Milestone, trung tâm thông báo, cảnh báo thông minh, form ghi nhận, chi tiết chăm sóc, túi sữa). Dùng MutationObserver + class riêng, không đụng hàm Baseline Lock.
- Regression Lock: 26/26 hàm lõi ở BASELINE_LOCK_V11.7.0 không đổi — xem `BASELINE_LOCK_V12.0.0.json`.
- (Các bản kế: V12.1 avatar vòng trạng thái + xem ảnh/zoom + Daily Streak; V12.2 kéo thả sắp xếp ở màn Cấu hình Dashboard.)

# MeYeuBe V11.7.0

## 🎨 Kho sữa bỏ icon, màu theo hạn dùng — phương án B (V11.7.0)
- Bỏ toàn bộ **6 emoji app tự thêm** trong mỗi thẻ túi (🗓 Tạo · 🍼 Hút · 🕐 HSD · 💧 Dung tích · ❄️ Vị trí · 🕐 HSD còn lại) — nhãn chữ đã nói đủ ý. Đo màn Kho sữa 7 túi: **45 emoji → 3**, và 3 emoji còn lại đều là emoji người dùng tự gõ trong tên bình ("Bình bú 🍼", "Tím mập 🟣"), app không thêm cái nào.
- Chấm màu đầu thẻ đổi nghĩa: trước đây mã hoá **tên bình**, nay mã hoá **mức hạn dùng còn lại** theo đúng thang quy ước — 🟢 từ 24 giờ trở lên · 🟡 12–23 giờ 59 · 🟠 6–11 giờ 59 · 🔴 1–5 giờ 59 · ‼️ dưới 1 giờ · ⚫ quá hạn hoặc đã đóng. Cùng ngưỡng với `milkUrgencyIcon` nên hai chỗ không lệch nhau.
- Bỏ vạch màu bên trái thẻ vì nó lặp lại đúng thông tin của chấm màu.
- Huy hiệu góc phải đổi từ "Đang bảo quản" thành **thời gian còn lại tô màu theo mức hạn dùng** ("Còn 20 giờ", "Còn 35 phút"). "Đang bảo quản" là trạng thái mặc định nên không in ra nữa; túi đã dùng hết / đã bỏ thì huy hiệu hiện trạng thái đó, màu xám.
- Thêm `milkTimeLeftShort` cho huy hiệu: dưới 1 giờ đọc theo phút, dưới 1 ngày theo giờ, dưới 30 ngày theo ngày, còn lại theo tháng — sữa trữ đông không còn hiện "Còn 179 ngày 10 giờ" tràn cả hàng.
- Hàng ô rút từ 4 xuống **3 ô** (`Ghi chú bình · Dung tích · Vị trí`): ô "HSD còn lại" bỏ đi vì số giờ đã nằm ở huy hiệu góc phải. Ô canh trái, nhãn nhỏ trên, giá trị đậm dưới.
- Bỏ tô màu tên bình: việc phân biệt bình dựa vào chính tên bình người dùng gõ, để trong thẻ chỉ còn **một tín hiệu màu duy nhất** là hạn dùng.
- Dòng meta chỉ hiện "Hút" khi giờ hút khác giờ tạo túi — với dữ liệu thật hai giờ này gần như luôn trùng nhau nên hàng meta rút còn `Tạo … · HSD …`.
- Popup chi tiết túi dùng chung màu và huy hiệu hạn dùng với thẻ; phần nội dung 11 dòng giữ nguyên (vẫn có dòng "HSD còn lại" đầy đủ, không rút gọn).
- Đo iPhone 390px: chiều cao 1 thẻ 113px → **102px**, và không còn trường hợp thẻ nở lên 127px do chữ "Còn 1 ngày 3 giờ" xuống 2 dòng; tổng chiều cao danh sách 7 túi 897px → **794px (−11%)**. Cỡ chữ nhỏ nhất 9px, lớn nhất trong thẻ 13px.
- Không đổi dữ liệu lưu, luồng lưu, luồng huỷ túi, vuốt Sửa/Huỷ, bộ lọc và các tính năng khác so với V11.6.0.
- Regression Lock: xác nhận các hàm lõi ở BASELINE_LOCK_V11.6.0 không đổi (26/26) — xem `BASELINE_LOCK_V11.7.0.json`.

# MeYeuBe V11.6.0

## 🧊 Kho sữa gọn, modal kín màn hình (V11.6.0)
- Modal chi tiết chăm sóc kéo xuống sát mép dưới màn hình: bỏ lề dưới của lớp phủ (safe-area chuyển vào chân modal), chiều cao dùng `100dvh` nên không còn hụt khi thanh công cụ trình duyệt ẩn/hiện. Đo iPhone 390×844: khoảng trống thừa dưới modal 38px (10px + safe-area) → **0px**, vùng cuộn danh sách 497px → **598px (+20%)**.
- Bỏ nút "Sửa túi" nằm trong mỗi thẻ túi sữa. Vuốt sang trái trên túi giờ mở 2 nút: **✏️ Sửa** (xanh) và **🗑 Huỷ túi** (đỏ). Túi đã dùng hết / đã bỏ chỉ hiện nút Sửa và vẫn vuốt được — trước đây các túi này bị khoá vuốt nên không sửa lại được sau khi đã đóng.
- Thiết kế lại thẻ túi sữa theo bản mẫu: vạch màu nhận diện bình bên trái + chấm màu · mã túi · dung tích · huy hiệu trạng thái; một dòng meta `🗓 Tạo · 🍼 Hút · 🕐 HSD`; và hàng 4 ô `Ghi chú bình | Dung tích | Vị trí | HSD còn lại`.
- Màu nhận diện bình băm từ tên bình trong ghi chú ra 1 màu cố định trong bảng 8 màu, nên hoạt động với mọi cách đặt tên ("Bình bú 🍼", "Fatz 1️⃣") — thay cho cách dò chữ tên màu ở V11.4.1 vốn không kích hoạt với dữ liệu thật.
- Bấm vào một túi mở popup chi tiết túi sữa: dung tích ban đầu, còn lại, đã cho bé bú, đã bỏ, vị trí bảo quản, trạng thái, thời điểm hút, HSD, HSD còn lại, ghi chú bình, lý do huỷ; chân popup có nút Sửa túi / Huỷ túi.
- Khối "Tổng quan kho sữa" đổi 4 ô thành: **Tổng dung tích (ml) · Tổng số túi · Dự kiến dùng hết · Sắp hết hạn**. "Dự kiến dùng hết" tính từ lượng còn lại chia cho lượng bú từ kho trung bình 7 ngày gần nhất; "Sắp hết hạn" đếm túi đang bảo quản còn dưới 24 giờ.
- Bộ lọc kho sữa rút từ khối 2 dòng có nút Ẩn/Hiện xuống **1 hàng chip**: `🔎 Bộ lọc · Trạng thái ⌄ · Vị trí ⌄`; chip đang lọc đổi viền hồng và hiện thẳng giá trị đang chọn. Thanh cố định phía trên modal 251px → **162px (−35%)**.
- Số bản ghi trên tiêu đề đọc đúng đơn vị: "3 record" → "3 túi" ở Kho sữa, "5 lần" ở các loại chăm sóc khác.
- Đo iPhone 390px màn Kho sữa: chiều cao 1 thẻ túi 149px → **127px (−15%)**, tổng chiều cao danh sách 5 túi 890px → **661px (−26%)**, số túi nhìn trọn vẹn cùng lúc 1 → **3**. Cỡ chữ nhỏ nhất 9px, lớn nhất trong thẻ 13px.
- Không đổi dữ liệu lưu, luồng lưu, luồng huỷ túi, bộ lọc và toàn bộ tính năng khác so với V11.5.0.
- Regression Lock: xác nhận các hàm lõi ở BASELINE_LOCK_V11.5.0 không đổi (26/26) — xem `BASELINE_LOCK_V11.6.0.json`.

# MeYeuBe V11.5.0

## 🧹 Dọn nhiễu danh sách ghi nhận — phương án A (V11.5.0)
- Bỏ toàn bộ emoji ở nhãn số liệu và hàng túi sữa (📦 Lấy từ kho, 👶 Bé bú thực tế, 🍼 Còn lại sau bú, 🧊 Túi sữa, ⭕ Trạng thái…). Mỗi bản ghi giờ chỉ còn đúng 1 icon loại chăm sóc; một màn Bé bú giảm từ ~42 emoji xuống 5.
- Bỏ nhãn phân loại trùng tiêu đề ở Bé bú: "Từ sữa đã hút" / "Trực tiếp" / "Sữa công thức" nói lại đúng ý của tiêu đề nên không hiện nữa. Các loại khác vẫn giữ nhãn vì nó mang thông tin thật (Bên hút, Đã dậy, Số tã…), nhưng chuyển vào dòng phụ thay cho viên thuốc màu xếp dưới giờ.
- Gộp thành 1 dòng phụ duy nhất: `nhãn · giá trị · tên bình`. Số ml của cữ bú (vd "80 ml") in đậm màu chữ chính, tên bình in màu tím.
- Bỏ hộp "Ghi chú bình" có viền: tên bình chuyển vào dòng phụ. Ghi chú do người dùng nhập xuống một dòng riêng không viền, tối đa 2 dòng.
- Bỏ chấm màu tự nhận theo tên màu trong ghi chú (chỉ chạy khi ghi chú có chữ "tím", "hồng"… nên không dùng được với cách đặt tên bình theo số). Thay bằng tên bình in màu tím, hoạt động với mọi cách đặt tên.
- Khối số liệu bỏ viền và bỏ vạch chia ô, chỉ còn nền nhạt.
- Bảng số liệu Bé bú chỉ hiện khi bé bú không hết — lúc đó mới có 3 số "Lấy từ kho · Bé bú thực tế · Bỏ đi" và số "Bỏ đi" tô vàng. Cữ bú bình thường không cần bảng vì số ml đã nằm ở dòng phụ và số còn lại đã gộp vào hàng túi sữa.
- Hàng túi sữa rút gọn thành `Túi <mã> · <trạng thái> · còn <N> ml`, chấm trạng thái 6px thay cho huy hiệu tròn có ký tự ✓/○.
- Bỏ bảng số liệu của Hút sữa / Ngủ / Thay tã / Uống thuốc / Thân nhiệt / Trớ sữa: các bảng này nhắc lại y nguyên tiêu đề và dòng phụ (vd tiêu đề "Hút 120 ml" rồi bảng lại ghi "Số lượng hút 120 ml"). Dòng phụ gộp đã mang đủ thông tin.
- Kết quả đo trên iPhone 390px: tổng chiều cao nội dung 1245px → **885px (−29%)**, số bản ghi thấy cùng lúc 4 → **5**; số khối có viền trong 1 thẻ bú bình 6 → 1.
- Không đổi dữ liệu lưu, luồng lưu, vuốt sang trái để Sửa/Xóa, bộ lọc kho sữa và toàn bộ tính năng khác so với V11.4.1.
- Regression Lock: xác nhận các hàm lõi ở BASELINE_LOCK_V11.4.1 không đổi — xem `BASELINE_LOCK_V11.5.0.json`.

# MeYeuBe V11.4.1

## 🔍 Tinh gọn giao diện chi tiết Bé bú + ghi chú túi sữa (V11.4.1)
- Kéo dài modal chi tiết: lề trên trên máy hẹp 54px → 8px (tính cả safe-area), lề dưới 20px → 10px, lề ngang 8px → 6px; vùng cuộn danh sách trên iPhone 390px tăng 530px → 635px (+20%), số bản ghi thấy cùng lúc 2 → 4.
- Hạ cỡ chữ toàn khối modal chi tiết về đúng hệ chung: tiêu đề loại 24px → 19px (máy ≤430px 17.5px), avatar 52px → 40px → 36px; thẻ Ngày/Tổng số lần 15px → 13px, icon 34px → 28px; khối Tổng quan tiêu đề 17px → 14.5px, số liệu 16px → 14px, icon ô 38px → 30px.
- Thẻ bản ghi gọn lại: giờ 19px → 16px, tiêu đề 15px → 13.5px, nhãn phân loại 10.5px → 9.5px, bảng 3 số liệu 14px → 12.5px, hàng túi sữa 11.5px → 10.5px; padding thẻ 12px → 9px.
- Khoảng cách giữa các bản ghi 12px → 16px (padding thẻ 12px → 9px): khoảng cách giữa 2 bản ghi nay gấp đúng 2× khoảng cách bên trong 1 bản ghi (8px) nên các thẻ không còn cảm giác "dính" vào nhau; đường timeline nét đứt vẫn nối liền các chấm.
- Chân modal thu gọn: nút "＋ Thêm ghi nhận" cao 54px → 44px (máy ≤430px 42px), chữ 16px → 14.5px, padding 12px → 8px; dòng gợi ý vuốt sang trái 11.5px → 10px và ép gọn 1 dòng. Tổng chiều cao footer 98px → 74px.
- Bổ sung ghi chú túi sữa trên bản ghi bú: thẻ "🍼 Ghi chú bình:" nay lấy ghi chú của túi sữa trong Kho sữa (vd "Bình tím mập", "Bình tím cao") thay vì chỉ lấy ghi chú của bản ghi như trước — dùng để phân biệt bé bú bình nào. Chấm màu tự nhận theo màu ghi trong ghi chú.
- Bản ghi có ghi chú riêng khác ghi chú túi sẽ hiện thêm thẻ "📝 Ghi chú:"; không hiện trùng khi hai ghi chú giống nhau.
- Cữ bú lấy từ nhiều túi: mỗi hàng túi sữa có chip ghi chú riêng để không lẫn túi nào là bình nào.
- Ghi chú túi được lưu thêm vào snapshot lúc bú (`extra.milkBagSnapshots[].note`), nên lịch sử vẫn hiển thị đúng tên bình sau khi túi bị xoá khỏi kho.
- Máy ≤430px: thẻ ghi chú xuống dòng riêng nhưng gói gọn 1 hàng ngang (trước là 2 dòng) để đỡ tốn chiều cao.
- Không đổi chức năng, luồng lưu và cấu trúc dữ liệu cũ so với V11.4.0; các loại chăm sóc khác (Hút sữa, Kho sữa, Ngủ, Thay tã...) dùng chung hệ cỡ chữ mới.
- Regression Lock: xác nhận các hàm lõi ở BASELINE_LOCK_V11.4.0 không đổi — xem `BASELINE_LOCK_V11.4.1.json`.

# MeYeuBe V11.4.0

## 🍼 Nâng cấp giao diện chi tiết Bé bú (V11.4.0)
- Thanh tiêu đề modal chi tiết: avatar tròn chứa icon loại chăm sóc, tên loại cỡ lớn kèm số bản ghi, nút ✕ bên phải; bấm vào tên loại (dấu ⌄) để đổi loại chăm sóc thay cho ô "Loại" cũ.
- Thêm 2 thẻ tóm tắt ngay dưới tiêu đề: "📅 Ngày" (bấm mở bộ chọn ngày) và "🕐 Tổng số lần" (bấm mở biểu đồ thống kê); trên máy màn hình hẹp 2 thẻ vẫn nằm cùng một hàng.
- Khối "Tổng quan" dạng 4 ô có icon: với Bé bú là Tổng lượng · Bú trực tiếp · Bú từ sữa đã hút · Sữa công thức, kèm nút "Xem thống kê ›". Các loại khác (Hút sữa, Kho sữa, Ngủ, Thay tã, Đi tè/Đi phân, Uống thuốc, Thân nhiệt, Trớ sữa) đều có bộ 4 ô tương ứng.
- Danh sách ghi nhận hiển thị theo timeline: chấm tròn hồng và đường kẻ đứt nối các bản ghi, thêm nút "Sắp xếp: Mới nhất / Cũ nhất" và ghi nhớ lựa chọn cho lần mở sau.
- Thẻ bản ghi mới: giờ cỡ lớn màu hồng, nhãn phân loại ("Trực tiếp", "Từ sữa đã hút", "Sữa công thức"), icon, tiêu đề, dòng phụ số ml và thẻ ghi chú riêng ("Ghi chú bình:" khi bú bình) có chấm màu tự nhận theo màu ghi trong ghi chú.
- Bản ghi "Bú từ kho sữa đã hút" có bảng 3 số liệu "Lấy từ kho · Bé bú thực tế · Còn lại sau bú" và hàng "Túi sữa · Trạng thái" (Đã sử dụng hết / Đang dùng / Đã bỏ) kèm chấm màu; bấm vào hàng túi sữa để mở Kho sữa. Số ml bỏ do bé không bú hết hoặc ml hủy trong túi hiển thị thành nhãn cảnh báo.
- Nút "＋ Thêm ghi nhận" chuyển xuống chân modal, rộng hết chiều ngang và luôn cố định khi cuộn; dòng gợi ý vuốt sang trái nằm ngay dưới nút.
- Trạng thái rỗng có khối riêng ("Chưa có dữ liệu") thay cho dòng chữ nhỏ như trước.
- Giữ nguyên: vuốt sang trái để Sửa/Xóa (thêm nút "›" ở góc phải thẻ để mở form sửa), bộ lọc kho sữa, thẻ túi sữa và toàn bộ dữ liệu lưu.
- Regression Lock: xác nhận các hàm lõi ở BASELINE_LOCK_V11.3.1 không đổi — xem `BASELINE_LOCK_V11.4.0.json`.

# MeYeuBe V11.3.1

## 🔠 Cân đối cỡ chữ form Hút sữa (V11.3.1)
- Đối chiếu form Hút sữa với các form đang có và hạ cỡ chữ về đúng hệ chung: số ml 40px → tối đa 32px (bằng bộ đếm form Thay tã), nút −/＋ 52px/24px → 46px/22px, nút Bên hút 13.5px → 13px (cao 44px), chip gợi ý nhanh cao 36px → 34px.
- Thẻ Vị trí bảo quản / Trạng thái / Hạn sử dụng: hạ chiều cao 48px → 46px (ô bên trong 44px) cho ngang với ô nhập chuẩn của các form khác; icon 16px → 15px, nhãn thời gian còn lại 11.5px → 11px.
- Khối Gợi ý bảo quản: chữ mô tả 11.5px → 12px cho dễ đọc, icon 15px → 14px; khối Tóm tắt lần hút: giá trị 13px → 12.5px, icon 14px → 13px.
- Thanh tiêu đề popup Ghi nhận (áp dụng cho mọi loại chăm sóc): tiêu đề 17px → 16px (máy hẹp 16px → 15px), nút ✕ 44px → 40px, nút Lưu 14px/44px → 13.5px/42px để 3 thành phần cân nhau.
- Màn hình ≤430px: nút Bên hút 12px, nút −/＋ 44×44px (21px), giá trị tóm tắt 12px.
- Không đổi chức năng, dữ liệu lưu và hành vi so với V11.3.0; các form khác giữ nguyên cỡ chữ.
- Regression Lock: xác nhận các hàm lõi ở BASELINE_LOCK_V11.3.0 không đổi — xem `BASELINE_LOCK_V11.3.1.json`.

# MeYeuBe V11.3.0

## 🥛 Nâng cấp giao diện Hút sữa (V11.3.0)
- Bên hút: thay dropdown bằng 3 nút chọn nhanh "Cả hai · Bên trái · Bên phải", nút đang chọn tô nền hồng chữ trắng. Giá trị lưu vào dữ liệu vẫn là "Cả hai"/"Trái"/"Phải" như cũ.
- Số lượng: bộ đếm lớn (− / số ml / ＋, bước 10ml) kèm hàng chip gợi ý nhanh 60 · 120 · 150 · 200 ml; vẫn cho nhập tay trực tiếp vào ô số.
- Vị trí bảo quản & Trạng thái: gộp thành 1 hàng 2 cột có icon, tự xếp dọc trên máy màn hình hẹp; nhãn nơi bảo quản hiển thị kèm thời hạn (Ngăn mát (4°C) · 4 ngày, Ngăn đông · 6 tháng...).
- Hạn sử dụng dự kiến: thẻ riêng có icon lịch và nhãn thời gian còn lại ("6 ngày tới", "4 giờ tới", "Đã quá hạn").
- Thêm khối "Gợi ý bảo quản" và "Tóm tắt lần hút" (Số lượng · Bên hút · Bảo quản · HSD dự kiến) cập nhật ngay khi nhập.
- Cân đối tỉ lệ: chuẩn hóa nhãn 11px in hoa, nút cao 44–52px, số ml tối đa 40px, bo góc 14–18px cho toàn bộ form Hút sữa — không còn chỗ chữ quá to, chỗ quá nhỏ; kiểm tra không tràn ngang ở màn hình 360px.
- Form Ghi nhận (mọi loại): thanh tiêu đề popup nay có ✕ bên trái, tên loại ở giữa và nút "Lưu" bên phải để lưu nhanh không cần cuộn xuống cuối.
- Ghi chú: giới hạn 200 ký tự kèm bộ đếm N/200 dưới ô nhập.
- Regression Lock: xác nhận các hàm lõi ở BASELINE_LOCK_V11.2.0 không đổi (Cloud Sync/Realtime, Push, Smart Alert, Export/Import, Milestone Engine, Hành trình theo tháng/Thống kê/Tổng kết năm) — xem `BASELINE_LOCK_V11.3.0.json`.

# Changelog

## V11.2.0 – 🧷 Nâng cấp giao diện Thay tã
- Loại tã: đổi 2 thẻ chọn (Tã ướt/Tã bẩn) sang kiểu lớn hơn, thẻ đang chọn tô nền hồng đậm (gradient thương hiệu) chữ trắng, kèm dấu ✓ tròn ở góc trên bên phải — thay cho kiểu viền mỏng nền nhạt trước đây.
- Số lượng: thay ô nhập số bằng bộ đếm lớn giữa 2 nút − / ﹢, cùng hàng 4 nút chọn nhanh "1 · 2 · 3 · ﹢" ngay bên dưới — bấm 1/2/3 để chọn thẳng số lượng phổ biến, bấm ﹢ để tăng dần khi cần nhiều tã hơn. Nút đang khớp với số lượng hiện tại luôn được tô sáng.
- Thời gian: riêng bản ghi Thay tã chỉ hiển thị 1 dòng Ngày + Giờ trên cùng một hàng (ẩn Ngày kết thúc/Đến giờ/Thời lượng vì không áp dụng cho một lần thay tã điểm-thời-gian); nhãn đổi thành "Ngày *"/"Giờ *". Các loại chăm sóc khác (Bé bú, Hút sữa, Ngủ, Uống thuốc, Thân nhiệt, Trớ sữa) giữ nguyên bố cục 2 hàng như cũ.
- Ghi chú: với Thay tã, ô Ghi chú thu gọn mặc định phía sau nút "✎ Thêm ghi chú (tùy chọn)" để form gọn hơn; bấm vào mới hiện ô nhập và tự focus. Nếu sửa một bản ghi Thay tã đã có sẵn ghi chú, ô ghi chú tự mở sẵn. Các loại chăm sóc khác không đổi (ghi chú luôn hiển thị như cũ).
- Fix: sửa một bản ghi "Tã bẩn" trước đó, ngay sau khi mở form sửa giao diện tự động chuyển nhầm về hiển thị "Tã ướt" (do một `setTimeout` dựng lại giao diện chạy trễ hơn và ghi đè lựa chọn vừa nạp từ dữ liệu đã lưu) — người dùng bấm Lưu lúc này sẽ vô tình đổi loại tã đã ghi. Nay mở sửa hiển thị đúng loại tã và số lượng đã lưu ngay từ đầu, không còn bị ghi đè.
- Regression Lock: xác nhận các hàm lõi ở BASELINE_LOCK_V11.1.3 không đổi (Cloud Sync/Realtime, Push, Smart Alert, Export/Import, Milestone Engine, Hành trình theo tháng/Thống kê/Tổng kết năm) — xem `BASELINE_LOCK_V11.2.0.json`.

## V11.1.3 – Hoàn thiện Hành trình theo tháng (Hotfix)
- Fix: popup chi tiết tháng (Hành trình theo tháng) bị lỗi cuộn — cuộn trang lại kéo cả giao diện bên ngoài thay vì chỉ cuộn nội dung popup. Nay đã khoá cuộn nền khi popup chi tiết tháng (hoặc chi tiết Milestone) đang mở, chỉ nội dung bên trong popup cuộn được.
- Fix: các dòng Milestone trong popup chi tiết tháng hiển thị tiêu đề và ngày dính sát nhau, khó đọc. Đổi sang bố cục 2 dòng (tiêu đề trên, ngày dưới) rõ ràng, dễ nhìn hơn.
- Fix: bấm vào một dòng Milestone trong popup chi tiết tháng để mở popup chi tiết Milestone, rồi đóng popup chi tiết Milestone lại đóng luôn cả popup chi tiết tháng phía sau. Nay mỗi popup đóng độc lập — đóng popup chi tiết Milestone sẽ quay lại đúng popup chi tiết tháng đang xem, không tắt toàn bộ.
- Regression Lock: xác nhận các hàm lõi ở BASELINE_LOCK_V11.1.0 không đổi (Cloud Sync/Realtime, Push, Smart Alert, Export/Import, Milestone Engine, Hành trình theo tháng/Thống kê/Tổng kết năm) — xem `BASELINE_LOCK_V11.1.3.json`.

## V11.1.0 – ❤️ Kỷ niệm & Thống kê
- Menu: gộp "🏆 Hành trình lớn khôn" vào nhóm mới "❤️ Kỷ niệm & Thống kê" trong menu điều hướng chính, kèm 3 mục mới: "📅 Hành trình theo tháng", "📈 Thống kê & So sánh", "🎉 Tổng kết năm". Nút "＋ Thêm cột mốc" vẫn nằm trong màn hình "Hành trình lớn khôn" như cũ.
- Hành trình theo tháng: danh sách thẻ theo từng tháng tuổi của bé (từ Ngày sinh), mỗi thẻ hiển thị số Milestone / số bản ghi chăm sóc / số ảnh trong tháng đó, mới nhất lên đầu. Bấm vào thẻ mở chi tiết: Thống kê tháng (tổng ml bú, tổng giờ ngủ, tổng ml hút), Nhật ký chăm sóc (số lượng theo loại), danh sách Milestone trong tháng, Album ảnh (lấy từ ảnh Milestone), và Ghi chú riêng có thể lưu cho từng tháng.
- Thống kê & So sánh: so sánh cữ bú, tổng giờ ngủ và lượng sữa hút của hôm nay với Hôm qua / Trung bình 7 ngày gần nhất / Trung bình 30 ngày gần nhất / Trung bình tháng trước, hiển thị mũi tiêu tăng (↑, xanh) / giảm (↓, đỏ) / không đổi.
- Tổng kết năm: chọn theo từng năm tuổi của bé (Năm đầu tiên, Năm thứ 2...), hiển thị tổng số cữ bú, số giấc ngủ, số lít sữa mẹ đã hút, số ảnh và số Milestone trong năm đó, kèm lời chúc kết thúc. Có nút "📤 Chia sẻ hình ảnh" (xuất ảnh PNG tóm tắt, dùng Web Share API hoặc tải xuống) và "🖨️ Xuất PDF" (dùng hộp thoại in của trình duyệt, chọn Lưu dưới dạng PDF). Nút "🎬 Xuất video tổng kết" hiển thị ở trạng thái sắp ra mắt, chưa hoạt động.
- Dữ liệu: thêm `db.monthlyNotes` để lưu ghi chú riêng theo từng tháng tuổi.
- Regression Lock: xác nhận các hàm lõi ở BASELINE_LOCK_V11.0.1 không đổi (Cloud Sync/Realtime, Push, Smart Alert, Export/Import, Milestone Engine) — xem `BASELINE_LOCK_V11.1.0.json`.
- Known limitation: "Album ảnh" trong Hành trình theo tháng và số "ảnh" trong Tổng kết năm hiện chỉ lấy từ ảnh đã gắn vào Milestone, vì bản này chưa có tính năng đính ảnh trực tiếp vào Nhật ký chăm sóc hay Nhật ký.

## V11.0.1 – Milestone Photo Viewer, Lịch khám theo ngày, Giờ đạt mốc
- Hành trình lớn khôn: bấm vào ảnh trong Album (màn hình chi tiết hoặc form thêm/sửa) mở ảnh toàn màn hình, giữ đúng tỉ lệ gốc thay vì bị crop vuông như thumbnail; bấm ✕ hoặc chạm ra ngoài để đóng.
- Cấu hình Dashboard: thêm "Lịch khám sắp tới trong vòng (ngày)" (mặc định 7, 0–365 ngày) — Block "Lịch khám sắp tới" tự ẩn hoàn toàn nếu không có lịch khám nào trong khoảng ngày đã cấu hình.
- Hành trình lớn khôn: Milestone tự động tạo từ Bé bú/Ngủ/Hút sữa nay lưu kèm giờ đạt được; màn hình chi tiết hiển thị thêm giờ bên cạnh ngày (vd "Thứ Năm, 23/07/2026 · 14:30 · Bé bú"). Milestone không có giờ (theo tuổi, phát triển, vaccine, hoặc tạo trước bản này) vẫn hiển thị bình thường.
- Regression Lock: xác nhận 12 hàm lõi ở BASELINE_LOCK_V11.0.0 không đổi (Cloud Sync/Realtime, Push, Smart Alert, Export/Import, Milestone Engine) — xem `BASELINE_LOCK_V11.0.1.json`.

## V11.0.0 – Hành trình lớn khôn (Milestone Timeline)
- Thêm menu mới "🏆 Hành trình lớn khôn" với Timeline hiển thị cột mốc theo ngày, mới nhất lên đầu.
- Milestone Engine tự động tạo cột mốc từ dữ liệu chăm sóc sẵn có, chạy trên mọi lần lưu dữ liệu (không chỉ lúc mở app): theo tuổi (tuần/tháng/năm), bé bú (mốc ml đầu tiên, kỷ lục, tổng số cữ), ngủ (giờ đầu tiên, ngủ xuyên đêm, tổng số giấc), hút sữa (ml đầu tiên, kỷ lục, tổng lít), phát triển (cân nặng/chiều dài), mũi tiêm đầu tiên và Vitamin D đủ 100 ngày.
- Chống tạo trùng Milestone bằng key duy nhất cho mỗi mốc; Milestone tự động là sự kiện lịch sử — không tự xóa dù dữ liệu gốc sau đó bị sửa hoặc xóa.
- Cho phép tự tạo Milestone thủ công (icon, tiêu đề, ngày, mô tả, ghi chú, tối đa 20 ảnh) — thêm/sửa/xóa tự do. Milestone tự động khoá tiêu đề/loại/ngày, chỉ cho thêm ảnh và ghi chú.
- Bộ lọc Timeline theo 8 loại: Tất cả / Theo tuổi / Bé bú / Ngủ / Hút sữa / Phát triển / Vaccine / Thủ công.
- Chia sẻ Milestone thành ảnh PNG (icon, tiêu đề, ngày, ảnh đầu tiên, tên bé) qua Web Share API hoặc tải xuống.
- Milestone mới tự động đẩy vào Trung tâm thông báo (🎉 Chúc mừng!).
- Bổ sung Block "Hành trình lớn khôn" vào Cấu hình Dashboard: bật/tắt, đổi tên hiển thị, đổi vị trí bằng nút ↑/↓ — cập nhật ngay không cần khởi động lại app, dùng chung cơ chế với các Block khác.
- Dashboard hiển thị banner "🎉 Bé vừa đạt một cột mốc mới" khi Milestone mới nhất trong vòng 3 ngày gần đây.
- Regression Lock: Cloud Sync/Realtime, Push Notification, Smart Alert, Export/Import và toàn bộ tính năng Milk Bag Picker của bản trước không đổi (hash khớp — xem `BASELINE_LOCK_V11.0.0.json`).

## V10.9.3 – Milk Bag Picker UX Hotfix & Refinements
- Fix: sửa bản ghi "Bú từ kho sữa đã hút" cũ không còn hiển thị lại danh sách túi sữa đã chọn (do cờ giữ trạng thái bị xoá sớm khi form dựng lại 2 lần). Nay mở sửa sẽ nạp lại đúng túi + số ml đã lấy từ mỗi túi.
- Form ghi nhận chăm sóc: "Ngày bắt đầu/Từ giờ" và "Ngày kết thúc/Đến giờ" hiển thị 2 cột cùng hàng (class careDateTimeRow trước đó thiếu CSS nên vẫn xuống dòng); "Từ giờ" mặc định lấy giờ hiện tại khi tạo mới.
- Icon màu túi sữa theo HSD còn lại: 🟢 ≥24h · 🟡 12–23h59 · 🟠 6–11h59 · 🔴 1–5h59 · ‼️ dưới 1h · ⚫️ đã hết hạn.
- Cấu hình Dashboard "Cữ bú tiếp theo cách (giờ)": đổi input sang dạng text + inputmode decimal để nhập được số thập phân (vd 2.5) trên mọi bàn phím; logic tính giờ (đã hỗ trợ thập phân từ V10.3.4) không đổi.

## V10.9.2 – Milk Bag Picker UX
- Ghi nhận bú từ kho sữa: đổi luồng nhập sang "nhập mục tiêu ml trước → chọn túi sữa để đủ lượng", đúng theo thiết kế UX mới.
- Thêm thanh tiến độ "Đã lấy từ kho / mục tiêu" với trạng thái Còn thiếu / Đủ lượng theo thời gian thực.
- "+ Thêm túi sữa" mở màn hình chọn túi riêng: tìm kiếm, sắp xếp, thẻ túi có nhãn hạn dùng (HSD hôm nay/ngày mai/N ngày nữa/quá hạn), nhập ml bằng nút tăng giảm và xem trước "Còn lại sau khi dùng".
- Danh sách túi đã chọn hiển thị dạng thẻ, xoá nhanh từng túi, vẫn giữ tuỳ chọn "Hủy phần còn lại trong túi" cho từng túi khi cần.
- Giữ nguyên toàn bộ tính năng "Số ml bỏ" / "Số ml bé bú thực tế" đã thêm ở bản trước.

## V10.9.1 – Pull Refresh, Notification & Feed Waste
- Kéo giao diện xuống hết mức để hiện icon xoay tròn; thả ra sẽ xoá cache Service Worker + đồng bộ lại dữ liệu + vẽ lại toàn bộ giao diện, không reload lại trang.
- Popup Thông báo: tách nhóm Mới/Đã xem rõ ràng, có chấm đỏ + nhãn "Mới" cho thông báo chưa xem.
- Popup Thông báo: bỏ nút hành động trên từng dòng; bấm cả dòng để mở đúng popup chi tiết loại chăm sóc + ngày liên quan, đồng thời đánh dấu đã xem.
- Thêm nút "Đánh dấu đã đọc" cho toàn bộ thông báo.
- Ghi nhận bú từ kho sữa: thêm "Số ml bỏ (bé không bú hết)", tự tính "Số ml bé bú thực tế" để thống kê lượng bú chính xác hơn; lượng trừ trong kho sữa vẫn giữ nguyên theo số ml lấy ra thực tế.

## V10.9.0 – Care Form Layout & Record Swipe Actions
- Ngày bắt đầu đi cùng hàng với Từ giờ; Ngày kết thúc đi cùng hàng với Đến giờ trong popup Ghi nhận chăm sóc.
- Bỏ trường Loại khỏi thân form, hiển thị loại đang chọn ngay trên tiêu đề form/popup.
- Nút Bắt đầu Bú / Bắt đầu Ngủ (và Dừng/Hủy Timer) luôn nằm cùng một hàng trên mobile.
- Màn hình chi tiết từng loại chăm sóc hỗ trợ vuốt sang trái để Sửa hoặc Xóa bản ghi, tương tự thao tác vuốt hủy túi sữa.
- Sau khi lưu sửa từ thao tác vuốt, tự quay lại đúng danh sách chi tiết đang xem.

## V10.8.4 – Care Detail & Mobile Form UX
- Rút gọn header popup chi tiết bằng bố cục 2 cột Loại/Ngày.
- Bổ sung nút Thêm ghi nhận đúng loại trong popup chi tiết.
- Sau khi lưu, tự quay lại danh sách chi tiết và hiển thị bản ghi mới.
- Mở rộng popup thêm mới, khóa scroll ngang và tối ưu không gian mobile.

## V10.8.3
- Alert/Notification kho sữa mở đúng danh sách và highlight túi liên quan.
- Trang Ghi nhận chỉ còn các block; form mở trong popup theo loại.
- Bộ lọc kho sữa hỗ trợ ẩn/hiện và ghi nhớ trạng thái.

## V10.8.2 — UX Enhancement & Notification Center
- Rút gọn toast kết nối và cập nhật dữ liệu.
- Sửa safe-area Trung tâm cảnh báo.
- Popup thêm/sửa chăm sóc.
- Trung tâm thông báo và badge chưa đọc.
- Lọc kho sữa theo bảo quản/trạng thái.
- Hút sữa không mặc định vị trí bảo quản.

## V10.8.1 — Push Delivery Hotfix
- Gửi thử thiết bị hiện tại bằng `target_endpoint`.
- Bổ sung nút Gửi thử tất cả thiết bị cùng Sync ID.
- Không báo thành công khi không có thiết bị nhận.
- Trả và hiển thị matched, sent, failed, expired.
- Bổ sung log chẩn đoán trong Edge Function.

## V10.8.1 – Device Push Notification
- Bổ sung đăng ký Web Push trên từng thiết bị.
- Bổ sung nút bật/tắt, lưu cấu hình, gửi thử và trạng thái quyền thông báo.
- Lưu `push_subscriptions` theo Sync ID, Device ID và endpoint.
- Cho phép chọn từng loại Smart Alert được phép push.
- Bổ sung Supabase Edge Function `send-push`.
- Bổ sung chống gửi lặp bằng `push_delivery_log`.
- Tự xóa subscription hết hạn khi push service trả về HTTP 404/410.
- Notification click mở app và Trung tâm cảnh báo.
- Giữ nguyên Smart Alert, Realtime JSON Sync và Cloud Sync thủ công.

## V10.8.1 — Smart Alert Navigation & Dashboard Block Hotfix
- Sửa action Ghi nhận trong Trung tâm cảnh báo để mở đúng màn hình và đúng loại chăm sóc.
- Loại bỏ lỗi dấu ngoặc kép lồng nhau trong `onclick`.
- Đổi tên block cấu hình từ “Bố mẹ cần chú ý” thành “Trung tâm cảnh báo”.
- Giữ module id `alerts` để tương thích cấu hình cũ.
- Mặc định mở phần Thông tin lúc sinh trên Dashboard.

## V10.8.1 – Smart Alert Hotfix
- Nút hành động trong Trung tâm cảnh báo mở đúng màn hình ghi nhận tương ứng.
- Rule thân nhiệt đọc đúng trường `amount`, đồng thời tương thích dữ liệu legacy `temperature`, `value`, `extra.temperature`.
- Đổi icon trạng thái thành 💚 Hôm nay mọi thứ đều ổn, ⚠️ Có việc cần chú ý, 🆘 Có việc cần xử lý ngay.
- Regression toàn bộ rule: thân nhiệt, bú quá giờ, ngủ quá lâu, túi sữa quá hạn/sắp hết hạn và lịch khám.
- Giữ nguyên Realtime JSON Sync, Cloud Sync thủ công và localStorage key.

## V10.7.0 — Smart Alert
- Bổ sung Rule Engine dựa trên cấu hình người dùng.
- Bổ sung mức Critical / Warning / Info.
- Thêm thẻ Smart Alert gọn trên Dashboard và popup Trung tâm cảnh báo.
- Bổ sung cấu hình bật/tắt, mức độ và ngưỡng cho từng rule.
- Cảnh báo tự cập nhật sau Realtime.
- Không thêm cảnh báo y khoa mang tính chẩn đoán.

## V10.6.0 – Realtime JSON Sync
- Bổ sung Supabase Realtime Postgres Changes cho bảng `public.meyeube_sync`.
- Thiết bị đang mở app tự nhận thay đổi từ thiết bị khác dùng cùng Sync ID.
- Auto push sau khi lưu và auto pull khi nhận sự kiện Realtime.
- Chống phản hồi vòng lặp bằng `deviceId`, `_cloudRevision` và cờ áp dụng remote.
- Tự reconnect khi online hoặc khi app trở lại foreground.
- Bổ sung trạng thái REALTIME / CONNECTING / OFFLINE trên màn hình Cloud Sync.
- Bổ sung merge mảng dữ liệu khi Cloud mới hơn trước auto push.
- Cập nhật SQL để thêm bảng vào publication `supabase_realtime`.
- Giữ tương thích dữ liệu cũ và đồng bộ thủ công.

## V10.5.1 – Dashboard & Avatar UX Hotfix
- Ẩn hoàn toàn block lịch khám khi không có lịch sắp tới.
- Thay tuổi trong block Thông tin bé bằng tên chính thức từ Thiết lập.
- Chặn zoom mobile bằng viewport, touch-action và gesture guard.
- Bổ sung upload, nén, xem trước và xóa avatar bé.

## V10.5.0 – Dashboard Configuration & UX
- Refactor source JavaScript về một file chính.
- Thêm cấu hình chỉ số Dashboard và sắp xếp thứ tự.
- Mở đúng bản ghi từ nhật ký Dashboard.
- Loại bỏ cảnh báo lượng bú hardcode.
- Sửa fallback cân nặng sau sinh.
- Tinh chỉnh header, lịch khám, thông tin sinh và block phát triển.

## V10.4.8 – Menu Version Footer Fix
- Bỏ đoạn mô tả Thiết lập để giải phóng không gian cuối menu.
- Tăng khoảng cách an toàn phía dưới menu để phiên bản không bị taskbar che.
- Làm nổi bật dòng phiên bản hiện tại.

## V10.4.7 — UI Polish & Version Info
- Thiết kế lại màn hình khởi động với nền gradient, glass card, logo nổi và thanh tiến trình.
- Làm mới giao diện chờ xử lý để gọn, hiện đại và dễ nhận biết hơn.
- Đổi toàn bộ nội dung `Đang mở màn hình...` thành `Đang xử lý...`.
- Bổ sung thông tin phiên bản ở cuối menu bên trái.
- Cập nhật manifest, title và Service Worker cache lên V10.4.7.
- Giữ nguyên toàn bộ dữ liệu và chức năng V10.4.6.

## V10.4.6 — Cloud Sync Schema & Safety Hotfix
- Sửa lỗi `PGRST204: Could not find the payload column` bằng cách đồng bộ app với schema `id` / `data` của bảng `meyeube_sync`.
- Tự động fallback sang schema cũ `sync_id` / `payload` khi cần.
- Bổ sung cảnh báo xác nhận trước thao tác Đẩy lên Cloud.
- Bổ sung cảnh báo xác nhận trước thao tác Tải Cloud về.
- Ghi nhận thao tác hủy vào Nhật ký đồng bộ.
- Giữ nguyên dữ liệu, localStorage key và các chức năng Smart Care hiện có.

## V10.4.5 — Dashboard Care Goals & Medicine Detail
- Bổ sung mục tiêu chăm sóc **Uống thuốc** theo số lần trong ngày.
- Bổ sung mục tiêu chăm sóc **Thân nhiệt** theo số lần đo trong ngày.
- Hai chỉ tiêu mới xuất hiện trong Cấu hình Dashboard → Chỉ tiêu chăm sóc trong ngày và dùng chung cơ chế bật/tắt, mục tiêu, tiến độ.
- Popup chi tiết Uống thuốc hiển thị Tên thuốc / vitamin, Liều lượng và Đơn vị đã nhập.
- Không thay đổi localStorage key, Cloud Sync hoặc dữ liệu hiện có.

## V10.4.4 — Next Feed Configuration Fix
- Bổ sung đọc giá trị `cfgNextFeedHours` khi mở Cấu hình Dashboard.
- Bổ sung lưu `dashboardConfig.nextFeedHours` khi bấm Lưu cấu hình.
- Dashboard cập nhật ngay sau khi lưu và dùng đúng giá trị người dùng nhập.
- Hỗ trợ dấu chấm hoặc dấu phẩy cho số giờ thập phân.
- Giữ 2,5 giờ chỉ làm mặc định khi chưa có cấu hình hợp lệ.
- Không thay đổi localStorage key, Cloud Sync hoặc các chức năng khác.

## V10.4.3 — Next Feed & Sleep Status Hotfix
- Sửa Dashboard đọc đúng `dashboardConfig.nextFeedHours` khi tính Cữ bú tiếp theo.
- Thay giá trị cộng cố định 150 phút bằng số giờ người dùng cấu hình.
- Đổi màu trạng thái: Bé đang ngủ dùng tông xanh dương; Bé đang thức dùng tông vàng.
- Giữ nguyên khả năng bấm trạng thái Bé đang ngủ và loại bỏ underline.
- Không thay đổi dữ liệu, Cloud Sync hoặc các chức năng hiện có.

## V10.4.2 — Dashboard Care Popup Hotfix
- Bấm từng loại chăm sóc trên Dashboard mở trực tiếp popup chi tiết của loại tương ứng trong ngày hôm nay.
- Chỉ nút “Thống kê” ở tiêu đề block mới chuyển đến trang tổng quan Thống kê.
- Trạng thái “Bé đang ngủ” vẫn có thể bấm để sửa dữ liệu Ngủ mới nhất nhưng không còn underline.
- Không thay đổi dữ liệu, Cloud Sync hoặc các chức năng hiện có.

## V10.4.1 — Sleep Status Quick Edit Hotfix
- Trạng thái “Bé đang ngủ” trên Dashboard có thể bấm để mở form chỉnh sửa giấc ngủ đang diễn ra mới nhất.
- Thay dòng trạng thái tổng quát bằng trạng thái “Bé đang ngủ/Bé đang thức”, giữ cùng hàng với ngày giờ.
- Bỏ dòng trạng thái ngủ trùng phía dưới; giữ nguyên dòng Cữ bú tiếp theo.
- Tăng Nhật ký chăm sóc trên Dashboard từ 4 lên 5 dòng.
- Không thay đổi cấu trúc dữ liệu, Cloud Sync hoặc các chức năng Smart Care.

## V10.4.0 — Smart Care
- Thêm Timer Bú và Ngủ; dừng Timer tự điền thời gian vào form.
- Thêm Uống thuốc: tên, liều lượng, đơn vị.
- Thêm Thân nhiệt: nhiệt độ, vị trí đo.
- Thêm Trớ sữa: mức độ, thời gian sau bú, loại Trớ/Nôn.
- Tích hợp các loại mới vào Dashboard, Timeline, popup chi tiết và Thống kê.
- Không đổi cấu trúc dữ liệu gốc; dữ liệu mới lưu trong careEvents để Cloud Sync/Export DB tiếp tục hoạt động.

# Changelog

## V10.3.5 – Sleep Status Quick Edit & Five Care Journal Rows
- Khi trạng thái tại block Thông tin bé là **Bé đang ngủ**, cho phép bấm trực tiếp để mở giao diện sửa bản ghi Ngủ đang diễn ra mới nhất.
- Hỗ trợ cập nhật **Đến giờ** để xác định thời điểm bé thức dậy.
- Thay dòng trạng thái tổng quát “Đã có ghi nhận hôm nay” bằng trạng thái **Bé đang ngủ/Bé đang thức** ngay trên cùng hàng với đồng hồ và ngày hiện tại.
- Loại bỏ dòng trạng thái ngủ bị lặp ở phần thông tin bổ sung; giữ riêng dòng **Cữ bú tiếp theo** khi có dữ liệu.
- Nhật ký chăm sóc trên Dashboard tăng từ 4 lên 5 dòng gần nhất.

## V10.3.4 – Dashboard Care Detail Popup & Configurable Next Feed
- Khi bấm trực tiếp từng loại chăm sóc trên Dashboard, mở ngay popup chi tiết của đúng loại và ngày hiện tại; không chuyển qua trang Thống kê trước.
- Nút **Thống kê ›** ở tiêu đề block Chăm sóc hôm nay vẫn mở trang tổng quan Thống kê.
- Bổ sung cấu hình **Cữ bú tiếp theo cách (giờ)** trong Cấu hình Dashboard → Hiển thị chung.
- Cữ bú tiếp theo được tính từ thời gian bắt đầu của lần Bé bú mới nhất cộng số giờ đã cấu hình.
- Mặc định 2,5 giờ để tương thích dữ liệu cũ; hỗ trợ bước nhập 0,5 giờ.

## V10.3.3 – Milk Swipe UI Hotfix
- Sửa giao diện nút **Huỷ túi** bị hiển thị sẵn trong danh sách Kho sữa.
- Nút huỷ mặc định ẩn hoàn toàn, chỉ xuất hiện sau khi vuốt trái đủ ngưỡng.
- Chỉ cho phép mở một dòng túi sữa tại một thời điểm.
- Tăng phân biệt thao tác vuốt ngang và cuộn dọc để tránh kích hoạt nhầm trên iPhone.
- Giữ nguyên nghiệp vụ chuyển túi sang trạng thái **Đã bỏ**.

## V10.3.2-milk-inventory-cancel-swipe-hotfix
- Bổ sung swipe sang trái trực tiếp tại Thống kê → Kho sữa → Danh sách kho sữa.
- Chỉ túi ở trạng thái `Đang bảo quản` mới hiển thị hành động `Huỷ túi`.
- Khi huỷ, túi chuyển sang trạng thái `Đã bỏ`, số ml còn lại về 0 và lưu lý do/thời điểm huỷ.
- Danh sách kho sữa trong modal được làm mới ngay sau khi huỷ.

## V10.3.1-care-dashboard-swipe-status-hotfix
- Fix Dashboard: click vào Chăm sóc hôm nay / từng loại chăm sóc mở màn hình Thống kê chăm sóc.
- Fix Kho sữa: bổ sung style swipe-left để hiện nút Huỷ túi, giữ thao tác nhập lý do và chuyển trạng thái Đã bỏ.
- Dashboard Thông tin bé: thêm icon 😴 cho Bé đang ngủ và ☺️ cho Bé đang thức.
- Dãn dòng khu vực Trạng thái và Cữ bú tiếp theo để dễ đọc hơn trên mobile.


## V10.3-care-milk-sleep-dashboard-hotfix
- Rút gọn mã túi sữa theo định dạng YYMMDD và thêm hậu tố khi trùng ngày.
- Danh sách chọn túi sữa khi bé bú hiển thị giờ tạo và ghi chú.
- Chi tiết thống kê chăm sóc sắp xếp mới nhất đến cũ nhất.
- Kho sữa hỗ trợ vuốt trái để huỷ túi, nhập lý do và chuyển trạng thái Đã bỏ.
- Loại Ngủ cho phép bỏ trống Đến giờ để biểu thị Bé đang ngủ.
- Dashboard Thông tin bé hiển thị trạng thái ngủ và cữ bú tiếp theo.

# Changelog

## V10.1 - Cloud Sync Official
- Thêm module Cloud Sync trong menu Thêm.
- Cấu hình Supabase URL, Publishable key, Sync ID.
- Test kết nối, đẩy dữ liệu lên Cloud, tải Cloud về, đồng bộ 2 chiều.
- Đồng bộ auto push khi lưu và auto pull khi mở app nếu Cloud mới hơn.
- Cập nhật bảng Supabase `meyeube_sync` trong SUPABASE_SETUP.sql.
- Giữ nguyên `meYeuBePWA_v4`.

# Changelog

## V10.0 – Supabase Cloud Sync Foundation

### Added
- Module **Cloud Sync** trong menu Thêm.
- Cấu hình Supabase Project URL, Publishable key và Sync ID.
- Test kết nối Supabase.
- Đẩy toàn bộ dữ liệu local lên Supabase.
- Kéo dữ liệu Cloud về localStorage.
- Đồng bộ thông minh dựa trên thời gian cập nhật.
- Auto push khi lưu dữ liệu nếu đã bật Cloud Sync.
- Auto pull khi mở app nếu Cloud mới hơn.
- File `SUPABASE_SETUP.sql` để tạo bảng cloud sync.

### Compatibility
- Giữ nguyên DB local: `meYeuBePWA_v4`.
- Bản V10.0 lưu nguyên JSON hiện tại vào Supabase để an toàn trước khi tách bảng nghiệp vụ ở V10.1.


## V15.0.72 — SmartAlertCronPush
- Cô lập liên kết Hút sữa ↔ Kho sữa: mỗi lần hút chỉ được sở hữu một bình/túi riêng.
- Không cho form sửa Hút sữa dùng linkedBagId của lần hút khác.
- Tự phát hiện record Hút sữa trỏ nhầm sang túi/bình thuộc pumpEventId khác và tách liên kết an toàn.
- Chặn chọn bình đang còn sữa của lần hút khác khi lưu sửa Hút sữa.

## V15.0.72 — SupabaseCloudDBMode

- Fix menu/sidebar trên mobile: danh sách menu cuộn được ổn định, phiên bản sát đáy hơn, giảm khoảng trống thừa.
- Bổ sung ảnh giấy khai sinh, BHYT/bảo hiểm và tệp đính kèm khác trong Sổ sức khỏe → Hồ sơ.
- Tệp ảnh có thumbnail, nút Xem lại và nút Xóa.
- Khóa scroll nền khi mở modal Sổ sức khỏe, chỉ cuộn nội dung modal.
