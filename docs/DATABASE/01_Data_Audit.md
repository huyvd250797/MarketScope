# 01. Data Audit

Version: V11

Status: Draft

Owner: Huy Vo

Last Update: TBD

---

## Giới thiệu

Data Audit là tài liệu đầu tiên trong bộ tài liệu thiết kế cơ sở dữ liệu của dự án **MeYeuBe**.

Đây là tài liệu quan trọng nhất trước khi bắt đầu thiết kế PostgreSQL và Cloud Sync.

Mọi tài liệu phía sau đều phải dựa trên kết quả của Data Audit.

Thứ tự thực hiện:

01_Data_Audit

↓

02_JSON_to_Supabase_Mapping

↓

03_Data_Dictionary

↓

04_ERD

↓

05_SUPABASE_SCHEMA

↓

06_Migration

↓

07_Sync Architecture

## Mục đích

Data Audit được tạo ra nhằm kiểm kê toàn bộ dữ liệu đang được sử dụng trong ứng dụng MeYeuBe.

Mục tiêu:

- Hiểu chính xác ứng dụng đang lưu dữ liệu gì.
- Không bỏ sót bất kỳ object nào.
- Không bỏ sót bất kỳ field nào.
- Xác định dữ liệu nào là dữ liệu gốc.
- Xác định dữ liệu nào chỉ là dữ liệu tính toán.
- Chuẩn bị cho quá trình migrate sang PostgreSQL.
- Chuẩn bị cho Cloud Sync nhiều thiết bị.

## Phạm vi Audit

Data Audit bao gồm toàn bộ dữ liệu nghiệp vụ của ứng dụng.

Bao gồm:

- Thông tin bé.
- Thông tin mẹ.
- Thai kỳ.
- Nhật ký.
- Lịch khám.
- Sổ sức khỏe.
- Chăm sóc hằng ngày.
- Kho sữa.
- Dashboard.
- Dashboard Configuration.
- Daily Goals.
- Vaccine.
- Cloud Sync Configuration.

Không bao gồm:

- CSS.
- HTML.
- Icon.
- PWA.
- Manifest.
- Service Worker.
- Source UI.

## Kiến trúc dữ liệu hiện tại

Hiện tại MeYeuBe đang lưu dữ liệu theo mô hình:

Application

↓

localStorage

↓

meYeuBePWA_v4

Đây là mô hình Single Device Database.

Ưu điểm:

- Không cần Backend.
- Không cần Internet.
- Hoạt động Offline.
- Triển khai đơn giản.

Nhược điểm:

- Không đồng bộ nhiều thiết bị.
- Không hỗ trợ nhiều người dùng.
- Không hỗ trợ Realtime.
- Khó xử lý Conflict.
- Khó mở rộng.

## Định hướng V11

Sau V11, MeYeuBe sẽ chuyển sang mô hình:

Application

↓

Storage Service

↓

Sync Service

↓

Supabase PostgreSQL

↓

Offline Cache (localStorage)

Trong đó:

Supabase là Database chính.

localStorage chỉ còn đóng vai trò Cache Offline.

## Quy ước Audit

Mỗi object sẽ được audit theo cấu trúc chuẩn.

Object

↓

Business Purpose

↓

JSON Structure

↓

Field Audit

↓

Business Rules

↓

Relationship

↓

Migration Strategy

↓

Database Recommendation

## Roadmap

Data Audit sẽ được thực hiện theo các giai đoạn sau:

Phase 1

Foundation

Phase 2

Master Data

- Baby
- Mom
- Pregnancy
- Settings

Phase 3

Business Data

- Care Events
- Diary
- Appointment
- Health Book

Phase 4

Milk Module

- Milk Inventory
- Milk Transaction

Phase 5

Dashboard

- Dashboard Configuration
- Daily Goals
- Derived Data

Phase 6

Audit Summary

---

<!-- START PHASE 2 -->

---

# Phase 2 — Master Data

Status: Draft  
Scope: `settings`, `pregnancy`, `baby`, `mom`

Phase 2 audit các nhóm dữ liệu nền tảng của app MeYeuBe.

Các object trong Phase 2 gồm:

| Object | Vai trò |
|---|---|
| `settings` | Cấu hình app, thông tin sinh, tên bé, theme |
| `pregnancy` | Chỉ số thai kỳ |
| `baby` | Chỉ số phát triển sau sinh |
| `mom` | Chỉ số sức khỏe mẹ |

---

## 8. Audit Object: `settings`

### 8.1 Mục đích nghiệp vụ

`settings` là object cấu hình chính của app.

Hiện tại `settings` không chỉ lưu cấu hình giao diện, mà còn lưu một phần dữ liệu hồ sơ bé và dữ liệu thai kỳ.

Object này đang phục vụ các nghiệp vụ:

- Lưu ngày kinh cuối để tính tuổi thai.
- Lưu ngày sinh của bé vụ:

- Lưu ngày kinh cuối để tính tuổi thai.
- Lưu ngày sinh của bé để tính tuổi sau sinh.
- Lưu giờ sinh.
- Lưu bệnh viện sinh.
- Lưu tên bé.
- Lưu tên chính thức của bé.
- Lưu lựa chọn hiển thị tên chính thức.
- Lưu theme giao diện.
- Lưu mô tả bé trên Dashboard.
- Lưu cấu hình Dashboard.

### 8.2 Cấu trúc dữ liệu hiện tại

    settings = {
      lmp: "",
      birthDate: "",
      birthTimeFrom: "",
      birthTimeTo: "",
      birthTime: "",
      birthHospital: "",
      babyName: "",
      officialName: "",
      showOfficialName: true,
      theme: "",
      babyDescription: "",
      dashboardConfig: {}
    }

### 8.3 Field Audit

| JSON Path | Type | Nullable | Default | Usage | Migration | Sync | Remark |
|---|---|---:|---|---|---|---|---|
| `settings.lmp` | string/date | Yes | `""` | Ngày kinh cuối, dùng tính tuổi thai | MIGRATE | Yes | Nên đưa sang `pregnancy_profiles.lmp_date` |
| `settings.birthDate` | string/date | Yes | `""` | Ngày sinh của bé | MIGRATE | Yes | Nên đưa sang `babies.birth_date` |
| `settings.birthTimeFrom` | string/time | Yes | `""` | Giờ sinh chính hoặc giờ sinh bắt đầu | MIGRATE | Yes | Nên đưa sang `babies.birth_time_from` |
| `settings.birthTimeTo` | string/time | Yes | `""` | Giờ sinh kết thúc nếu nhập theo khoảng | MIGRATE | Yes | Nên đưa sang `babies.birth_time_to` |
| `settings.birthTime` | string/time | Yes | `birthTimeFrom` | Field tương thích cũ cho giờ sinh | LEGACY | No | Không nên dùng làm field chính |
| `settings.birthHospital` | string | Yes | `""` | Bệnh viện sinh | MIGRATE | Yes | Nên đưa sang `babies.birth_hospital` |
| `settings.babyName` | string | Yes | `""` | Tên gọi / nickname của bé | MIGRATE | Yes | Nên đưa sang `babies.nickname` |
| `settings.officialName` | string | Yes | `""` | Tên chính thức của bé | MIGRATE | Yes | Nên đưa sang `babies.official_name` |
| `settings.showOfficialName` | boolean | No | `true` | Bật/tắt hiển thị tên chính thức | CONFIG | Yes | Có thể đưa sang `dashboard_configs.show_official_name` |
| `settings.theme` | string | Yes | `""` | Theme giao diện | CONFIG | Yes | Nên đưa sang `user_settings.theme` |
| `settings.babyDescription` | string | Yes | `""` | Mô tả bé trên Dashboard | CONFIG | Yes | Có thể đưa sang `dashboard_configs.baby_description` |
| `settings.dashboardConfig` | object | Yes | `{}` | Cấu hình Dashboard | CONFIG | Yes | Audit chi tiết ở phase Dashboard |

### 8.4 Business Rules

- Nếu có `settings.birthDate`, app ưu tiên tính tuổi bé sau sinh.
- Nếu chưa có `settings.birthDate`, app dùng `settings.lmp` để tính tuổi thai.
- `settings.birthTime` là field legacy, hiện được đồng bộ từ `birthTimeFrom`.
- `settings.babyName` là tên gọi nhanh.
- `settings.officialName` là tên chính thức.
- `settings.showOfficialName` quyết định có hiển thị tên chính thức hay không.
- `settings.theme` ảnh hưởng toàn app.
- `settings.dashboardConfig` không audit chi tiết trong Phase 2 vì thuộc nhóm Dashboard.

### 8.5 Đánh giá migrate

Không nên migrate nguyên object `settings` thành một bảng duy nhất.

Nên tách như sau:

| Nhóm dữ liệu | Destination đề xuất |
|---|---|
| Hồ sơ bé | `babies` |
| Thai kỳ | `pregnancy_profiles` |
| Cấu hình người dùng | `user_settings` |
| Dashboard | `dashboard_configs` |

---

## 9. Audit Object: `pregnancy`

### 9.1 Mục đích nghiệp vụ

`pregnancy` là mảng lưu các mốc chỉ số thai kỳ.

Object này phục vụ:

- Theo dõi chỉ số thai theo từng lần khám.
- Lưu kết quả siêu âm.
- Hiển thị danh sách chỉ số thai kỳ.
- Hiển thị thống kê thai kỳ.
- Vẽ biểu đồ thai kỳ.

### 9.2 Cấu trúc dữ liệu hiện tại

    pregnancy = [
      {
        date: "",
        week: "",
        weight: "",
        bpd: "",
        hc: "",
        ac: "",
        fl: "",
        afi: "",
        position: "",
        note: "",
        createdAt: "",
        updatedAt: ""
      }
    ]

### 9.3 Field Audit

| JSON Path | Type | Nullable | Default | Usage | Migration | Sync | Remark |
|---|---|---:|---|---|---|---|---|
| `pregnancy[].date` | string/date | No | `today()` | Ngày khám / ngày nhập chỉ số | MIGRATE | Yes | Nên là `exam_date` |
| `pregnancy[].week` | string | No | `""` | Tuần thai tại thời điểm khám | MIGRATE | Yes | Có thể tách thành tuần/ngày ở schema sau |
| `pregnancy[].weight` | string/number | No | `""` | Cân nặng ước lượng thai | MIGRATE | Yes | Nên chuẩn hóa numeric, đơn vị gram |
| `pregnancy[].bpd` | string/number | No | `""` | Đường kính lưỡng đỉnh | MIGRATE | Yes | Numeric, thường là mm |
| `pregnancy[].hc` | string/number | No | `""` | Chu vi đầu | MIGRATE | Yes | Numeric, thường là mm |
| `pregnancy[].ac` | string/number | No | `""` | Chu vi bụng | MIGRATE | Yes | Numeric, thường là mm |
| `pregnancy[].fl` | string/number | No | `""` | Chiều dài xương đùi | MIGRATE | Yes | Numeric, thường là mm |
| `pregnancy[].afi` | string/number | No | `""` | Chỉ số nước ối / AFI | MIGRATE | Yes | Numeric hoặc text tùy dữ liệu nhập |
| `pregnancy[].position` | string | No | `""` | Ngôi thai | MIGRATE | Yes | Ví dụ: ngôi đầu, ngôi mông |
| `pregnancy[].note` | string | Yes | `""` | Ghi chú lần khám | MIGRATE | Yes | Text |
| `pregnancy[].createdAt` | string/datetime | Yes | `updatedAt` | Thời điểm tạo record | MIGRATE | Yes | Nên là `created_at` |
| `pregnancy[].updatedAt` | string/datetime | Yes | `now()` | Thời điểm cập nhật record | MIGRATE | Yes | Nên là `updated_at` |

### 9.4 Business Rules

- Một phần tử trong `pregnancy` tương ứng với một lần nhập chỉ số thai kỳ.
- Khi thêm mới, record được đưa lên đầu danh sách.
- Khi sửa, app giữ lại `createdAt` cũ nếu có.
- Các field bắt buộc trên form gồm: `date`, `week`, `weight`, `bpd`, `hc`, `ac`, `fl`, `afi`, `position`.
- Dữ liệu biểu đồ và thống kê thai kỳ là dữ liệu tính toán từ `pregnancy`, không nên lưu riêng.

### 9.5 Đánh giá migrate

Nên migrate sang bảng:

| Bảng đề xuất | Mục đích |
|---|---|
| `pregnancy_records` | Lưu từng mốc chỉ số thai kỳ |

Gợi ý field chính:

| Column | Mapping |
|---|---|
| `id` | ID mới khi migrate |
| `baby_id` | Liên kết hồ sơ bé |
| `exam_date` | `pregnancy[].date` |
| `gestational_week_text` | `pregnancy[].week` |
| `estimated_weight` | `pregnancy[].weight` |
| `bpd` | `pregnancy[].bpd` |
| `hc` | `pregnancy[].hc` |
| `ac` | `pregnancy[].ac` |
| `fl` | `pregnancy[].fl` |
| `afi` | `pregnancy[].afi` |
| `position` | `pregnancy[].position` |
| `note` | `pregnancy[].note` |
| `created_at` | `pregnancy[].createdAt` |
| `updated_at` | `pregnancy[].updatedAt` |

---

## 10. Audit Object: `baby`

### 10.1 Mục đích nghiệp vụ

`baby` hiện là mảng lưu các mốc chỉ số sau sinh của bé.

Lưu ý quan trọng:

`baby` trong JSON hiện tại không phải hồ sơ bé.  
Hồ sơ bé hiện đang nằm chủ yếu trong `settings`.

`baby` đang phục vụ:

- Theo dõi cân nặng.
- Theo dõi chiều dài.
- Theo dõi vòng đầu.
- Theo dõi ghi chú bú/ngủ theo mốc phát triển.
- Hiển thị thống kê sau sinh.
- Vẽ biểu đồ phát triển.

### 10.2 Cấu trúc dữ liệu hiện tại

    baby = [
      {
        date: "",
        weight: "",
        length: "",
        head: "",
        feed: "",
        sleep: "",
        note: "",
        createdAt: "",
        updatedAt: ""
      }
    ]

### 10.3 Field Audit

| JSON Path | Type | Nullable | Default | Usage | Migration | Sync | Remark |
|---|---|---:|---|---|---|---|---|
| `baby[].date` | string/date | No | `today()` | Ngày ghi nhận chỉ số | MIGRATE | Yes | Nên là `record_date` |
| `baby[].weight` | string/number | Yes | `""` | Cân nặng của bé | MIGRATE | Yes | Numeric, đơn vị kg |
| `baby[].length` | string/number | Yes | `""` | Chiều dài của bé | MIGRATE | Yes | Numeric, đơn vị cm |
| `baby[].head` | string/number | Yes | `""` | Vòng đầu | MIGRATE | Yes | Numeric, đơn vị cm |
| `baby[].feed` | string | Yes | `""` | Ghi chú bú tại mốc phát triển | REVIEW | Yes | Không nên dùng làm dữ liệu chăm sóc chính |
| `baby[].sleep` | string | Yes | `""` | Ghi chú ngủ tại mốc phát triển | REVIEW | Yes | Không nên dùng làm dữ liệu chăm sóc chính |
| `baby[].note` | string | Yes | `""` | Ghi chú | MIGRATE | Yes | Text |
| `baby[].createdAt` | string/datetime | Yes | `updatedAt` | Thời điểm tạo record | MIGRATE | Yes | Nên là `created_at` |
| `baby[].updatedAt` | string/datetime | Yes | `now()` | Thời điểm cập nhật record | MIGRATE | Yes | Nên là `updated_at` |

### 10.4 Business Rules

- Một phần tử trong `baby` tương ứng với một mốc phát triển sau sinh.
- Dashboard lấy record mới nhất để hiển thị cân nặng, chiều dài, vòng đầu.
- Dashboard có thể so sánh record mới nhất với record trước đó.
- Các giá trị tăng/giảm là dữ liệu tính toán, không lưu cố định.
- `feed` và `sleep` trong `baby` chỉ nên xem là ghi chú tại mốc phát triển, không thay thế dữ liệu chăm sóc hằng ngày.

### 10.5 Đánh giá migrate

Nên migrate sang bảng:

| Bảng đề xuất | Mục đích |
|---|---|
| `growth_records` | Lưu mốc phát triển sau sinh |

Gợi ý field chính:

| Column | Mapping |
|---|---|
| `id` | ID mới khi migrate |
| `baby_id` | Liên kết hồ sơ bé |
| `record_date` | `baby[].date` |
| `weight_kg` | `baby[].weight` |
| `length_cm` | `baby[].length` |
| `head_circumference_cm` | `baby[].head` |
| `feeding_note` | `baby[].feed` |
| `sleep_note` | `baby[].sleep` |
| `note` | `baby[].note` |
| `created_at` | `baby[].createdAt` |
| `updated_at` | `baby[].updatedAt` |

---

## 11. Audit Object: `mom`

### 11.1 Mục đích nghiệp vụ

`mom` là mảng lưu các mốc sức khỏe của mẹ.

Object này phục vụ:

- Theo dõi cân nặng mẹ.
- Theo dõi huyết áp.
- Ghi chú sức khỏe.
- Lưu lịch sử theo từng ngày.

### 11.2 Cấu trúc dữ liệu hiện tại

    mom = [
      {
        date: "",
        weight: "",
        bp: "",
        note: "",
        createdAt: "",
        updatedAt: ""
      }
    ]

### 11.3 Field Audit

| JSON Path | Type | Nullable | Default | Usage | Migration | Sync | Remark |
|---|---|---:|---|---|---|---|---|
| `mom[].date` | string/date | No | `today()` | Ngày ghi nhận | MIGRATE | Yes | Nên là `record_date` |
| `mom[].weight` | string/number | Yes | `""` | Cân nặng mẹ | MIGRATE | Yes | Numeric, đơn vị kg |
| `mom[].bp` | string | Yes | `""` | Huyết áp mẹ | MIGRATE | Yes | Có thể tách systolic/diastolic sau |
| `mom[].note` | string | Yes | `""` | Ghi chú | MIGRATE | Yes | Text |
| `mom[].createdAt` | string/datetime | Yes | `updatedAt` | Thời điểm tạo record | MIGRATE | Yes | Nên là `created_at` |
| `mom[].updatedAt` | string/datetime | Yes | `now()` | Thời điểm cập nhật record | MIGRATE | Yes | Nên là `updated_at` |

### 11.4 Business Rules

- Một phần tử trong `mom` tương ứng với một lần ghi nhận sức khỏe mẹ.
- `bp` hiện là text tự do.
- Nếu sau này cần thống kê huyết áp chính xác, nên tách `bp` thành:
  - `systolic`
  - `diastolic`
  - `heart_rate` nếu có
- Hiện tại `mom` chưa liên kết sâu với Dashboard.

### 11.5 Đánh giá migrate

Nên migrate sang bảng:

| Bảng đề xuất | Mục đích |
|---|---|
| `mother_health_records` | Lưu chỉ số sức khỏe mẹ |

Gợi ý field chính:

| Column | Mapping |
|---|---|
| `id` | ID mới khi migrate |
| `user_id` | Người dùng/mẹ |
| `record_date` | `mom[].date` |
| `weight_kg` | `mom[].weight` |
| `blood_pressure_text` | `mom[].bp` |
| `note` | `mom[].note` |
| `created_at` | `mom[].createdAt` |
| `updated_at` | `mom[].updatedAt` |

---

## 12. Phase 2 Summary

Phase 2 đã audit các nhóm dữ liệu nền tảng:

| Object | Vai trò | Migration |
|---|---|---|
| `settings` | Cấu hình + hồ sơ bé + thai kỳ | SPLIT |
| `pregnancy` | Chỉ số thai kỳ | MIGRATE |
| `baby` | Mốc phát triển sau sinh | MIGRATE |
| `mom` | Sức khỏe mẹ | MIGRATE |

Kết luận:

- Không migrate nguyên object `settings`.
- Hồ sơ bé hiện nằm chủ yếu trong `settings`.
- `baby` hiện là dữ liệu tăng trưởng sau sinh, không phải hồ sơ bé.
- `pregnancy` là dữ liệu theo dõi thai kỳ.
- `mom` là dữ liệu sức khỏe mẹ.
- Các dữ liệu thống kê, biểu đồ, tuổi thai, tuổi bé là `DERIVED`, không lưu trực tiếp vào database.

<!-- END PHASE 2 -->