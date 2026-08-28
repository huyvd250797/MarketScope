# HVUS v1.3 — Release Checklist V13.2.3

## Acceptance Criteria (V13.2.3 · Toast + Hoàn tác song song, fix tràn nút)
- [x] Khôi phục lại 11 lệnh `showToast('...','success')` đã bỏ ở V13.2.2, tại đúng các nhánh Thêm mới/Xóa đã có `udShow(...)`.
- [x] Di chuyển `.toastWrap` từ `bottom:96px` lên `bottom:146px` (3 vị trí CSS trùng lặp trong file) để Toast luôn nằm TRÊN Snackbar Hoàn tác (đáy Snackbar ở 82px, cao ~50px), không còn chồng lấn vùng hiển thị.
- [x] Root cause tràn nút: rule toàn cục `button{width:100%}` trong media query `@media(max-width:640px)` áp cho MỌI phần tử `<button>` không có class loại trừ — thêm `.undoSnackbar .udBtn{...width:auto!important...}` để ghi đè, đúng pattern đã dùng ở `.milkSwipeActions button`, `.careRecordActions button`, `.careTimerActions button` trong cùng file.
- [x] Test Node trên code thật: xác nhận cả Toast (đúng nội dung) và Snackbar cùng xuất hiện sau ADD/DELETE; test hồi quy rollback kho sữa + live-refresh modal (V13.2.0-V13.2.2) chạy lại — PASS; xác nhận chuỗi CSS `width:auto!important` và `bottom:calc(146px...)` có mặt đúng trong file đã build.

## Stable Baseline Lock
- [x] 26 hàm ở BASELINE_LOCK_V13.2.2.json không đổi — BASELINE_LOCK_V13.2.3.json giữ nguyên 26/26 hash.

## Release Gate
- [x] JavaScript syntax PASS (app.js, sw.js) — `node --check`.
- [x] Version consistency PASS (13.2.3 đồng bộ các file).
- [x] Baseline function hashes PASS (đối chiếu BASELINE_LOCK_V13.2.2.json).
- [x] release_check.py PASSED.

# HVUS v1.3 — Release Checklist V13.2.2

## Acceptance Criteria (V13.2.2 · Bỏ chồng chéo Toast/Snackbar Hoàn tác)
- [x] Bỏ 11 lệnh `showToast('...','success')` trùng lặp ngay tại nhánh Thêm mới/Xóa đã có `udShow(...)`: saveCareEvent(add) + nested returnCtx toast, deleteCareEvent, saveAppointment(add), delAppointment, saveMilestone(add), deleteMilestoneFromDetail, gsDeleteItem (diary + milestone), cancelMilkBag; saveDiary/saveHealthBook chuyển toast sang else-branch (chỉ còn cho Sửa).
- [x] Toast cho nhánh **Sửa** giữ nguyên không đổi (saveCareEvent edit, saveAppointment edit, saveMilestone edit, saveDiary edit, saveHealthBook edit).
- [x] `.undoSnackbar` z-index 500 → 10000 (trên `.toastWrap` z-index 9999) để phòng trường hợp hiếm còn chồng lấn.
- [x] Test Node trên code thật: ADD/DELETE không phát Toast (mảng toastLog rỗng), EDIT vẫn phát đúng 1 Toast — PASS. Test hồi quy rollback kho sữa (V13.2.0) và live-refresh modal chi tiết (V13.2.1) chạy lại — vẫn PASS sau các chỉnh sửa này.

## Stable Baseline Lock
- [x] 26 hàm ở BASELINE_LOCK_V13.2.1.json không đổi — BASELINE_LOCK_V13.2.2.json giữ nguyên 26/26 hash.

## Release Gate
- [x] JavaScript syntax PASS (app.js, sw.js) — `node --check`.
- [x] Version consistency PASS (13.2.2 đồng bộ các file).
- [x] Baseline function hashes PASS (đối chiếu BASELINE_LOCK_V13.2.1.json).
- [x] release_check.py PASSED.

# HVUS v1.3 — Release Checklist V13.2.1

## Acceptance Criteria (V13.2.1 · Sửa giao diện Snackbar + Live-refresh Undo)
- [x] Fix CSS: `.udMsg` thêm `flex:1 1 auto;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis` — khắc phục lỗi flex-item text co về 1 ký tự/dòng trên Safari/iOS.
- [x] Thiết kế lại: tách icon ✓ thành `.udIcon` (khung tròn riêng), `.udBtn` chuyển sang dạng pill gradient hồng thương hiệu.
- [x] `udUndo()` thêm `udRefreshOpenViews()`: nếu `careDetailOverlay` đang `.show` và có `window.__careStatsSelectedType`, gọi lại `renderCareStatDetail(type,date)`; nếu `globalSearchOverlay` đang `.show`, gọi lại `gsAfterMutation()`. Áp dụng chung cho cả Undo-thêm và Undo-xóa vì cùng 1 hàm.
- [x] Test Node+jsdom trên code thật: mô phỏng renderCareStatDetail('diaper',...) mở modal thật, deleteCareEvent thật, rồi udUndo thật — xác nhận nội dung modal (`#careDetailModalContent`) chứa lại đúng bản ghi vừa khôi phục — PASS.

## Stable Baseline Lock
- [x] 26 hàm ở BASELINE_LOCK_V13.2.0.json không đổi — BASELINE_LOCK_V13.2.1.json giữ nguyên 26/26 hash. `udUndo`, CSS `.undoSnackbar` đều không thuộc 26 hàm khoá.

## Release Gate
- [x] JavaScript syntax PASS (app.js, sw.js) — `node --check`.
- [x] Version consistency PASS (13.2.1 đồng bộ các file).
- [x] Baseline function hashes PASS (đối chiếu BASELINE_LOCK_V13.2.0.json).
- [x] release_check.py PASSED.

# HVUS v1.3 — Release Checklist V13.2.0

## Acceptance Criteria (V13.2.0 · Undo sau khi Thêm mới/Xóa)
- [x] Engine `ud*` mới (snapshot DB trước thao tác + Snackbar 8s + Hoàn tác qua `save()` gốc) — không sửa `save`/`load`/exportDB/importDB.
- [x] Gắn Undo vào 12 điểm: `saveCareEvent`/`deleteCareEvent` (7 loại chăm sóc), `saveAppointment`/`delAppointment`, `saveMilestone`/`deleteMilestoneFromDetail`, nhánh diary+milestone trong `gsDeleteItem` (Tìm kiếm), `saveDiary`, `saveHealthBook`, `savePregnancy`, `saveBaby`, `saveMom`, `cancelMilkBag`. Mỗi điểm chỉ thêm snapshot trước mutation + gọi `udShow` sau `save()`, không đổi logic nghiệp vụ gốc.
- [x] Sửa 1 câu confirm cũ sai lệch: bỏ "Không thể hoàn tác" khỏi hộp thoại xóa Milestone (nay đã hoàn tác được trong 8s).
- [x] Test Node+jsdom trên code thật: engine Undo (hiện/ẩn/thay thế/hết hạn) PASS; tích hợp thật với `deleteCareEvent`+`releaseCareInventory` cho kịch bản xóa Bé bú từ kho sữa rồi Hoàn tác — cả record và túi sữa khôi phục đúng — PASS; tích hợp thật với `saveCareEvent` qua đúng luồng form (selectCareType/diaperSetAmount/selectDiaperType) cho Thay tã rồi Hoàn tác — PASS.
- [x] Version đồng bộ 13.2.0 tại 7 vị trí.

## Stable Baseline Lock
- [x] 26 hàm ở BASELINE_LOCK_V13.1.0.json không đổi — BASELINE_LOCK_V13.2.0.json giữ nguyên 26/26 hash. Toàn bộ hàm sửa (saveCareEvent, deleteCareEvent, saveAppointment, delAppointment, saveMilestone, deleteMilestoneFromDetail, gsDeleteItem, saveDiary, saveHealthBook, savePregnancy, saveBaby, saveMom, cancelMilkBag) đều không thuộc 26 hàm khoá.

## Release Gate
- [x] JavaScript syntax PASS (app.js, sw.js) — `node --check`.
- [x] Version consistency PASS (13.2.0 đồng bộ các file).
- [x] Baseline function hashes PASS (đối chiếu BASELINE_LOCK_V13.1.0.json).
- [x] release_check.py PASSED.

## Known limitation (đã ghi trong AC_V13.2.0.md)
- Chỉ Undo được thao tác gần nhất, không xếp chồng nhiều mức.
- Cửa sổ 8 giây cố định, không cấu hình.
- Sổ sức khỏe, Chỉ số thai kỳ/bé/mẹ hiện chưa có chức năng Xóa qua UI (chỉ Thêm/Sửa) nên phần Undo-xóa cho các mục này chưa áp dụng được — chỉ Undo-thêm.

# HVUS v1.3 — Release Checklist V13.1.0

## Acceptance Criteria (V13.1.0 · Gọn form Ghi nhận + phân biệt Tã ướt/Tã bẩn)
- [x] Fix: banner "mô hình liên kết" + 2 nút Timer Bú/Ngủ trước đây luôn hiện ở mọi loại (kể cả Thay tã/Uống thuốc/Thân nhiệt/Trớ sữa) → nay chỉ hiện khi type ∈ {feed, pump, sleep}, qua hàm mới `syncCareFormChromeForType(type)` gọi từ `selectCareType`.
- [x] Số lượng tã: bỏ `.diaperQtyStepper` (−/giá trị/﹢ cỡ lớn), chỉ giữ `.diaperQtyPresets` (1·2·3·﹢); `diaperSetAmount` cập nhật hiện/ẩn số trong nút ﹢ khi giá trị >3.
- [x] Thẻ "Tã bẩn" trong `careRecordCardHtml` nhận thêm class `careRecDirty` khi `diaperTypeLabel(...)==='Tã bẩn'`; CSS tô nền ấm nhạt riêng cho theme sáng/tối.
- [x] Test bằng jsdom (Node): hiển thị banner/Timer đúng theo 7 loại, toggling số lượng tã qua các mốc 1→2→3→4 đúng active/hiện số, và logic class `careRecDirty` đúng cho cả 2 trường hợp wet/dirty + non-diaper — tất cả PASS trên đúng code đã trích từ app.js thật.
- [x] Version đồng bộ 13.1.0 tại 7 vị trí (title, splash, appVersionInfo, app.js?v=, sw.js CACHE_NAME, manifest, APP_VERSION).

## Stable Baseline Lock
- [x] 26 hàm ở BASELINE_LOCK_V13.0.0.json không đổi — BASELINE_LOCK_V13.1.0.json giữ nguyên 26/26 hash. Các hàm sửa (`selectCareType`, `diaperSetAmount`, `careRecordCardHtml`) và hàm mới (`syncCareFormChromeForType`) đều không thuộc 26 hàm khoá.

## Release Gate
- [x] JavaScript syntax PASS (app.js, sw.js) — `node --check`.
- [x] Version consistency PASS (13.1.0 đồng bộ các file).
- [x] Baseline function hashes PASS (đối chiếu BASELINE_LOCK_V13.0.0.json, PREV_LOCK cập nhật tương ứng).
- [x] release_check.py PASSED.

## Known limitation (đã ghi trong AC_V13.1.0.md / changelog.md)
- Không còn cách giảm số lượng tã chính xác từng đơn vị khi đã vượt quá 3 (vd từ 6 xuống 5) ngoài việc chọn lại 1/2/3 rồi bấm ﹢ lại — đánh đổi để form gọn hơn theo yêu cầu.
- Banner/Timer ẩn theo loại đang chọn tại thời điểm hiện tại; nếu offline chưa tải lại app cũ có thể chưa thấy thay đổi cho tới khi Service Worker cập nhật cache mới.

# HVUS v1.3 — Release Checklist V13.0.0

## Acceptance Criteria (V13.0.0 · Backup & Version Control dữ liệu)
- [x] Backup thủ công (nút + ghi chú) và Backup tự động (Tắt/Ngày/Tuần/Tháng/Theo X thay đổi, chỉ kiểm tra khi mở app) lưu Version vào IndexedDB riêng (`meYeuBeBackupDB`), không dùng chung `meYeuBePWA_v4`.
- [x] Version tối đa tự động giữ lại: 20 bản (bkPruneAutoVersions); thủ công không tự xoá.
- [x] Danh sách phiên bản dạng Timeline (tên/ngày/dung lượng/người tạo/ghi chú), Restore có Preview khác biệt (+/− theo Bé bú/Hút sữa/Ngủ/Thay tã/Uống thuốc/Nhiệt độ/Trớ sữa/Túi sữa/Milestone, số lượng với Lịch khám/Nhật ký/Sổ sức khỏe/Chỉ số), xác nhận gõ KHOIPHUC.
- [x] Export JSON/ZIP/SQLite/CSV cho dữ liệu hiện tại hoặc từng Version; JSZip/sql.js tải lười qua CDN (jsdelivr) chỉ khi bấm xuất, không ảnh hưởng thời gian mở app / cache offline mặc định.
- [x] Import JSON/ZIP/SQLite: validate qua `normalize()` gốc trước khi cho xem Preview; Ghi đè hoặc Gộp (trùng ID: Bỏ qua/Ghi đè/Giữ cả hai qua `bkMergeArraysById`); danh mục không có ID ổn định luôn nối thêm; tự tạo Version an toàn trước khi áp dụng.
- [x] Không sửa `exportDB`/`importDB` (Baseline Lock) hay `save`/`load` gốc — toàn bộ hàm mới tiền tố `bk`.
- [x] Version đồng bộ 13.0.0 tại 7 vị trí (title, splash, appVersionInfo, app.js?v=, sw.js CACHE_NAME, manifest, APP_VERSION).

## Stable Baseline Lock
- [x] 26 hàm ở BASELINE_LOCK_V12.2.1.json không đổi — BASELINE_LOCK_V13.0.0.json giữ nguyên 26/26 hash.
- [x] Toàn bộ tính năng bản V12.2.1 (Global Search, Cloud Sync/Realtime, Push, Smart Alert, Milestone Engine, Hành trình theo tháng/Thống kê/Tổng kết năm) không bị ảnh hưởng.

## Release Gate
- [x] JavaScript syntax PASS (app.js, sw.js) — `node --check`.
- [x] Version consistency PASS (13.0.0 đồng bộ các file).
- [x] Baseline function hashes PASS (đối chiếu tự động với BASELINE_LOCK_V12.2.1.json trong release_check.py, PREV_LOCK cập nhật tương ứng).
- [x] release_check.py PASSED.

## Known limitation (đã ghi trong AC_V13.0.0.md / changelog.md)
- Merge (Gộp dữ liệu) áp 1 chính sách xử lý trùng ID (Bỏ qua/Ghi đè/Giữ cả hai) cho toàn bộ file nhập, chưa có màn xử lý từng bản ghi trùng riêng lẻ.
- Danh mục không có ID ổn định trong dữ liệu gốc (Lịch khám, Nhật ký, Sổ sức khỏe, Chỉ số thai kỳ/bé/mẹ) khi Gộp luôn được nối thêm — có thể tạo dòng trùng nội dung nếu Nhập cùng 1 file nhiều lần.
- Backup tự động chỉ kiểm tra được khi mở app, không có cơ chế chạy nền thật khi app đã đóng (giới hạn PWA/iOS).
- Xuất SQLite/ZIP/CSV cần có mạng ở lần đầu tiên để tải thư viện qua CDN; sau đó trình duyệt cache lại và dùng offline được.
- Cloud Backup (đồng bộ Version lên Google Drive/OneDrive/Firebase Storage) chưa làm ở bản này — để dành khi có tài khoản đăng nhập.

# HVUS v1.3 — Release Checklist V12.1.1

## Acceptance Criteria (V12.1.1 · Sửa lỗi khoá cuộn chồng ở modal chăm sóc)
- [x] mybScrollLock chỉ áp khi chưa có careModalOpen/menuOpen — hết double-lock gây lỗi backdrop-filter iOS; mở loại A → đóng → mở loại B hiển thị bình thường.
- [x] Popup không tự khoá (xem ảnh Milestone/avatar, streak sheet) vẫn khoá nền qua mybScrollLock.
- [x] Version đồng bộ 12.1.1; JS syntax PASS; Baseline 26/26 khớp BASELINE_LOCK_V12.1.0.json.

# HVUS v1.3 — Release Checklist V12.1.0

## Acceptance Criteria (V12.1.0 · Avatar trạng thái, Xem ảnh, Daily Streak — đợt 2)
- [x] Mục 1 — Vòng trạng thái avatar (🟢 thức / 💜 ngủ); bấm avatar mở ảnh full + zoom (2 chạm/pinch 1–4×), vuốt xuống/✕ đóng; viewer riêng không đụng openMilestonePhotoViewer.
- [x] Mục 4 — Daily Streak: widget 🔥 chữ trên header; bottom sheet (streak, trạng thái hôm nay ✅/⚠/💔, kỷ lục, ngày bắt đầu, tổng ngày, tỷ lệ, huy hiệu 7/30/100/365); ngày địa phương, ≥1 bản ghi/ngày, bỏ lỡ → về 0.
- [x] Fix — "Cữ bú tiếp theo" realtime theo phút (gắn nhịp đồng hồ 1s, dựng lại khi đổi phút), màu mức khẩn tự đổi.
- [x] Popup mới tự khoá cuộn nền (mybScrollLock).
- [x] Version đồng bộ 12.1.0 tại 7 vị trí; JS syntax PASS; Baseline Lock 26/26 khớp BASELINE_LOCK_V12.0.0.json.

# HVUS v1.3 — Release Checklist V12.0.0

## Acceptance Criteria (V12.0.0 · Nâng cấp UI/UX Dashboard — đợt 1)
- [x] Mục 2 — Khoảng trắng: block gap 24px, padding Hero/thẻ 20px, gap icon–tiêu đề 13px; không đổi bố cục, không tràn ngang 360/390/430px.
- [x] Mục 3 — Hệ màu chuẩn: bộ token --c-pink/purple/blue/orange/red/gray (+--c-green trạng thái), --c-pink=--brand, --c-gray=--muted, không thêm màu chủ đạo mới; áp cho chỉ số "Chăm sóc hôm nay".
- [x] Mục 5 — "Cữ bú tiếp theo" gộp 1 dòng trong Hero: `🍼 Cữ bú tiếp theo <giờ> · còn 01 giờ 20 phút`, vạch+chấm màu theo mức khẩn (🟢/🟠<30p/🔴 quá giờ), chưa đủ dữ liệu → xám.
- [x] Mới — Khoá cuộn nền mọi popup/modal (mybScrollLock qua MutationObserver, không sửa refreshDetailOverlayScrollLock; áp cả popup trước chưa khoá).
- [x] Version đồng bộ 12.0.0 tại 7 vị trí (title, splash, appVersionInfo, app.js?v=, sw.js CACHE_NAME, manifest, APP_VERSION).
- [x] JS syntax PASS; Baseline Lock 26/26 khớp BASELINE_LOCK_V11.7.0.json.

# HVUS v1.3 — Release Checklist V11.7.0

## Acceptance Criteria (V11.7.0 · Kho sữa bỏ icon, màu theo hạn dùng — phương án B)
- [x] Bỏ 6 emoji app tự thêm trong thẻ túi (🗓 🍼 🕐 💧 ❄️ 🕐). Màn 7 túi: 45 emoji → 3, và 3 cái còn lại là emoji người dùng gõ trong tên bình.
- [x] Chấm màu đổi nghĩa từ "tên bình" sang "mức hạn dùng", 6 mức đúng thang quy ước (🟢≥24h · 🟡12–23h59 · 🟠6–11h59 · 🔴1–5h59 · ‼️<1h · ⚫ quá hạn/đã đóng), cùng ngưỡng với `milkUrgencyIcon`.
- [x] Bỏ vạch màu trái và bỏ tô màu tên bình — trong thẻ chỉ còn một tín hiệu màu duy nhất.
- [x] Huy hiệu góc phải đổi thành thời gian còn lại tô màu; "Đang bảo quản" không in ra; túi đã dùng hết / đã bỏ hiện trạng thái màu xám.
- [x] `milkTimeLeftShort` rút gọn cho huy hiệu (phút / giờ / ngày / tháng) — sữa trữ đông không còn hiện "Còn 179 ngày 10 giờ".
- [x] Hàng ô rút 4 → 3 (Ghi chú bình · Dung tích · Vị trí); bỏ ô "HSD còn lại" vì đã có ở huy hiệu.
- [x] Hàng meta chỉ hiện "Hút" khi khác giờ tạo túi.
- [x] Đo iPhone 390px: thẻ 113px → 102px (hết trường hợp nở lên 127px do wrap), danh sách 7 túi 897px → 794px (−11%).
- [x] Cỡ chữ lớn nhất trong thẻ 13px, huy hiệu 10.5px, nhỏ nhất 9px; không tràn ngang ở 360/390/430px.
- [x] Version đồng bộ 11.7.0 tại 7 vị trí.

## Acceptance Criteria (kế thừa V11.6.0 · Kho sữa gọn, modal kín màn hình)
- [x] Modal chi tiết chạm sát mép dưới: bỏ padding-bottom lớp phủ ≤640px, safe-area chuyển vào chân modal, chiều cao `100dvh`. Khoảng trống dưới modal 38px → 0px; vùng cuộn 497px → 598px (+20%).
- [x] Bỏ nút "Sửa túi" trong thẻ; vuốt sang trái mở 2 nút ✏️ Sửa + 🗑 Huỷ túi (148px). Túi đã dùng hết/đã bỏ chỉ có nút Sửa (84px) và vẫn vuốt được.
- [x] Thẻ túi sữa thiết kế lại theo bản mẫu: vạch màu bình + chấm màu · mã · dung tích · huy hiệu trạng thái; dòng meta 🗓/🍼/🕐; hàng 4 ô Ghi chú bình | Dung tích | Vị trí | HSD còn lại.
- [x] Màu nhận diện bình băm từ tên bình (8 màu cố định) — hợp mọi cách đặt tên, thay cách dò tên màu ở V11.4.1.
- [x] Bấm vào túi mở popup chi tiết túi sữa (11 dòng thông tin + nút Sửa túi / Huỷ túi).
- [x] Tổng quan kho sữa đổi 4 ô: Tổng dung tích · Tổng số túi · Dự kiến dùng hết · Sắp hết hạn.
- [x] Bộ lọc rút xuống 1 hàng chip (Trạng thái · Vị trí); thanh cố định 251px → 162px (−35%).
- [x] Tiêu đề modal đọc đúng đơn vị: "3 túi" ở Kho sữa, "5 lần" ở loại khác (thay "N record").
- [x] Đo iPhone 390px: thẻ túi 149px → 127px (−15%), danh sách 5 túi 890px → 661px (−26%), thấy 1 → 3 túi.
- [x] Cỡ chữ trong thẻ: lớn nhất 13px, nhỏ nhất 9px; không tràn ngang ở 360/390/430px.
- [x] Version đồng bộ 11.6.0 tại 7 vị trí.

## Acceptance Criteria (kế thừa V11.5.0 · dọn nhiễu — phương án A)
- [x] Bỏ toàn bộ emoji ở nhãn số liệu và hàng túi sữa; mỗi bản ghi chỉ còn 1 icon loại (một màn Bé bú: ~42 emoji → 5).
- [x] Bỏ nhãn phân loại trùng tiêu đề ở Bé bú; các loại khác chuyển nhãn vào dòng phụ gộp.
- [x] Gộp 1 dòng phụ duy nhất `nhãn · giá trị · tên bình`; bỏ hộp "Ghi chú bình" có viền.
- [x] Khối số liệu bỏ viền và vạch chia ô; bảng số liệu Bé bú chỉ hiện khi bé bú không hết.
- [x] Bỏ bảng số liệu của Hút sữa / Ngủ / Thay tã / Uống thuốc / Thân nhiệt / Trớ sữa vì lặp 100% tiêu đề + dòng phụ.
- [x] Hàng túi sữa rút gọn `Túi <mã> · <trạng thái> · còn <N> ml`, chấm trạng thái 6px.
- [x] Bỏ chấm màu tự nhận theo tên màu; thay bằng tên bình in màu tím (hợp mọi cách đặt tên).
- [x] Đo iPhone 390px: nội dung 1245px → 885px (−29%), thấy 4 → 5 bản ghi; khối có viền trong 1 thẻ 6 → 1.
- [x] Cỡ chữ nhỏ nhất 9.5px; không đổi dữ liệu lưu và các tính năng khác.
- [x] Version đồng bộ 11.5.0 tại 7 vị trí.

## Acceptance Criteria (kế thừa V11.4.1)
- [x] Modal chi tiết chăm sóc kéo dài hết chiều cao khả dụng; vùng cuộn danh sách trên iPhone 390px tăng 530px → 635px (+20%), thấy 4 bản ghi thay vì 2.
- [x] Cỡ chữ toàn khối modal chi tiết hạ về hệ chung: tiêu đề loại 24px → 19px, giờ bản ghi 19px → 16px, tiêu đề bản ghi 15px → 13.5px, bảng số liệu 14px → 12.5px, hàng túi sữa 11.5px → 10.5px; không còn chữ nhỏ hơn 9px.
- [x] Chân modal thu gọn: nút "＋ Thêm ghi nhận" 54px → 44px, chữ 16px → 14.5px, dòng gợi ý ép gọn 1 dòng; footer 98px → 74px (−25%) mà vùng chạm vẫn ≥ 40px.
- [x] Thẻ "🍼 Ghi chú bình:" lấy ghi chú của túi sữa trong Kho sữa (vd "Bình tím mập", "Bình tím cao") thay vì chỉ lấy ghi chú của bản ghi; chấm màu tự nhận theo màu trong ghi chú.
- [x] Ghi chú riêng của bản ghi hiện thành thẻ "📝 Ghi chú:" và không trùng lặp khi giống ghi chú túi.
- [x] Cữ bú lấy từ nhiều túi: mỗi hàng túi sữa có chip ghi chú riêng; thẻ trên cùng gộp các ghi chú.
- [x] Ghi chú túi lưu thêm vào `extra.milkBagSnapshots[].note` → xoá túi khỏi kho vẫn xem lại đúng tên bình.
- [x] Các loại chăm sóc khác (Hút sữa, Kho sữa, Ngủ, Thay tã, Đi tè/Đi phân, Uống thuốc, Thân nhiệt, Trớ sữa) dùng chung hệ cỡ chữ mới, không vỡ bố cục.
- [x] Không đổi chức năng, luồng lưu và cấu trúc dữ liệu cũ so với V11.4.0.
- [x] Version đồng bộ 11.4.1 tại title, splash screen, appVersionInfo, script cache-bust, sw.js CACHE_NAME, manifest.webmanifest, APP_VERSION.

## Stable Baseline Lock
- [x] 26 hàm đã khoá ở BASELINE_LOCK_V11.6.0.json (Cloud Sync/Realtime/Push/Smart Alert/Export-Import + Milestone Engine + Hành trình theo tháng/Thống kê/Tổng kết năm/Photo Viewer) — hash khớp 26/26, không bị ảnh hưởng bởi thay đổi giao diện.
- [x] Toàn bộ tính năng bản V11.6.0 không bị ảnh hưởng.
- [x] Không bổ sung hàm mới vào Baseline Lock ở bản này — các hàm chỉnh sửa (`milkBagHtml`, `milkBagCellsHtml`, `openMilkBagDetail`) và các hàm mới (`milkUrgencyLevel`, `milkBagBadge`, `milkTimeLeftShort`, `milkBagMetaHtml`); các hàm bỏ đi (`milkNoteAccent`, `milkStatusMeta`) thuộc lớp hiển thị chi tiết, không thuộc nhóm hạ tầng lõi cần khoá (BASELINE_LOCK_V11.7.0.json giữ nguyên 26 hàm).

## Release Gate
- [x] JavaScript syntax PASS (app.js, sw.js) — `node --check`.
- [x] Version consistency PASS (11.7.0 đồng bộ các file).
- [x] Baseline function hashes PASS (đối chiếu tự động với BASELINE_LOCK_V11.6.0.json trong release_check.py).
- [x] release_check.py PASSED.
- [x] Kiểm thử bằng trình duyệt tự động (Playwright): 390/360/430px × dark/light — không tràn ngang, không lỗi JavaScript; xác minh đủ 6 mức màu hạn dùng trả đúng class và mã màu ở cả hai theme, đếm emoji trong thẻ = 0 (do app thêm), popup chi tiết đúng nút theo trạng thái túi, vuốt Sửa/Huỷ và modal chạm đáy (gap = 0px) của V11.6.0 vẫn nguyên vẹn.

## Known limitation (đã ghi trong AC_V11.7.0.md / changelog.md)
- Ghi chú túi sữa lấy từ ô "Ghi chú" của lần hút sữa, chưa có trường riêng kiểu "Tên bình" hay danh sách bình cố định để chọn nhanh.
- Việc phân biệt bình giờ hoàn toàn dựa vào chữ trong tên bình (kể cả emoji người dùng tự gõ) — app không tô màu riêng cho từng bình nữa, vì màu đã dành cho hạn dùng.
- Mức hạn dùng tính lúc dựng danh sách, không tự chạy lại theo thời gian thực; đóng mở lại modal sẽ cập nhật.
- "Dự kiến dùng hết" tính theo trung bình 7 ngày gần nhất, nên vài ngày đầu dùng app hoặc khi bé chỉ bú trực tiếp sẽ hiện "--".
- Huỷ túi vẫn dùng hộp thoại `prompt()` của trình duyệt để nhập lý do, chưa có form riêng trong app.
- "Album ảnh" trong Hành trình theo tháng và số "ảnh" trong Tổng kết năm hiện chỉ lấy từ ảnh đã gắn vào Milestone.
- "Xuất video tổng kết" mới ở dạng nút placeholder (disabled), chưa có chức năng thật.
- "Thống kê & So sánh" hiện chưa có biểu đồ/xu hướng theo thời gian.
