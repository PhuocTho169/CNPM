# Thiết kế cơ sở dữ liệu — District 4 Culinary Guide

> Nguồn: `database/migrations/001_core.sql` … `999_drop_legacy.sql`,
> `database/seeds/*.sql`, `server/src/db/migrate.js`, `server/src/db/seed.js`.
> Hệ quản trị: PostgreSQL 16. Mọi bảng dùng `created_at`/`updated_at` kiểu
> `TIMESTAMPTZ`, cập nhật tự động qua trigger `set_updated_at()`.

## 1. Tổng quan

Cơ sở dữ liệu gồm **13 bảng nghiệp vụ** + bảng hạ tầng `schema_migrations`:

| Nhóm | Bảng | Vai trò |
|---|---|---|
| Danh mục & tài khoản | `users`, `languages`, `categories` | Tài khoản quản trị, ngôn ngữ, danh mục dùng chung |
| Nội dung | `culinary_places`, `dishes`, `culinary_routes`, `route_stops` | Thực thể địa điểm/món/lộ trình |
| Nội dung đa ngữ | `translations` | Bản dịch dùng chung cho place/dish/route (polymorphic) |
| Media | `media_files` | Ảnh, audio, QR dùng chung (polymorphic) |
| Khách & thương mại | `guest_sessions`, `checkouts` | Phiên ẩn danh, slot miễn phí, biên nhận thanh toán |
| Phân tích | `activity_logs` | Sự kiện yêu thích/xem/quét/phát |
| Hạ tầng | `schema_migrations` | Theo dõi migration đã chạy |

Hai đặc điểm thiết kế quan trọng:

1. **Bảng đa hình không có khoá ngoại vật lý.** `translations.entity_id` và
   `media_files.entity_id` trỏ tới nhiều bảng tuỳ `entity_type`. Vì vậy không thể
   `JOIN` trực tiếp, và **không có `ON DELETE CASCADE`** cho các thực thể cha.
2. **Paywall nằm trong một bảng.** `guest_sessions` chứa cả 2 slot miễn phí và mảng
   ngôn ngữ đã mua, thay cho 6 bảng phân quyền/thanh toán cũ.

Sơ đồ:

- [erd.mmd](erd.mmd) — nội dung, bản dịch, media, lộ trình.
- [erd-guest-analytics.mmd](erd-guest-analytics.mmd) — tài khoản, phiên khách, checkout, sự kiện.

## 2. Từ điển dữ liệu

### 2.1 `users`

| Cột | Kiểu | Ràng buộc | Ghi chú |
|---|---|---|---|
| `id` | SERIAL | PK | |
| `email` | VARCHAR(255) | UNIQUE NOT NULL | Dùng đăng nhập |
| `password_hash` | VARCHAR(255) | NOT NULL | bcrypt |
| `full_name` | VARCHAR(255) | | |
| `role` | VARCHAR(20) | NOT NULL DEFAULT `'VISITOR'`, CHECK IN (`ADMIN`,`STAFF`,`VISITOR`) | Phân quyền duy nhất |
| `is_active` | BOOLEAN | NOT NULL DEFAULT true | Tài khoản bị khoá không đăng nhập được |
| `last_login_at` | TIMESTAMPTZ | | Cập nhật khi đăng nhập thành công |
| `created_at`, `updated_at` | TIMESTAMPTZ | NOT NULL DEFAULT now() | |

Trigger: `trg_users_updated`. Người dùng `VISITOR` không được dùng cho đăng nhập CMS
(`authService.login` chỉ chấp nhận vai trò `ADMIN`/`STAFF`).

### 2.2 `languages`

| Cột | Kiểu | Ràng buộc | Ghi chú |
|---|---|---|---|
| `id` | SERIAL | PK | |
| `code` | VARCHAR(10) | UNIQUE NOT NULL | `vi`, `en`, `zh`, `ko`, `ja` |
| `name` | VARCHAR(100) | NOT NULL | Tên tiếng Anh |
| `native_name` | VARCHAR(100) | NOT NULL | Tên bản địa |
| `is_active` | BOOLEAN | NOT NULL DEFAULT true | Ngôn ngữ không hoạt động không được mở khoá mới |
| `bcl` | VARCHAR(20) | | **Tên cột thực tế**; ý nghĩa là thẻ BCP-47/giọng TTS |
| `voice_note` | VARCHAR(200) | | Ghi chú chọn giọng cho TTS |
| `created_at`, `updated_at` | TIMESTAMPTZ | NOT NULL DEFAULT now() | |

Seed 5 ngôn ngữ: `vi`, `en`, `zh`, `ko`, `ja`. Xoá ngôn ngữ bị chặn khi còn bản dịch,
audio, checkout, hoạt động hoặc slot miễn phí tham chiếu (xem `catalogService.deleteLanguage`).

### 2.3 `categories`

| Cột | Kiểu | Ràng buộc | Ghi chú |
|---|---|---|---|
| `id` | SERIAL | PK | |
| `code` | VARCHAR(50) | UNIQUE NOT NULL | |
| `name` | VARCHAR(150) | NOT NULL | |
| `applies_to` | VARCHAR(10) | NOT NULL DEFAULT `'both'`, CHECK IN (`place`,`dish`,`both`) | Phạm vi áp dụng |
| `icon` | VARCHAR(20) | | Emoji/tên icon |
| `is_active` | BOOLEAN | NOT NULL DEFAULT true | |
| `created_at`, `updated_at` | TIMESTAMPTZ | NOT NULL DEFAULT now() | |

`culinary_places.category_id` và `dishes.category_id` tham chiếu bảng này với
`NO ACTION`; xoá danh mục đang được dùng sẽ bị PostgreSQL chặn (lỗi FK), không tự cascade.

### 2.4 `culinary_places`

| Cột | Kiểu | Ràng buộc | Ghi chú |
|---|---|---|---|
| `id` | SERIAL | PK | |
| `code` | VARCHAR(80) | UNIQUE NOT NULL | Mã nghiệp vụ |
| `category_id` | INT | FK → `categories(id)` | |
| `address` | VARCHAR(300) | | |
| `latitude` | DOUBLE PRECISION | | Toạ độ GPS |
| `longitude` | DOUBLE PRECISION | | |
| `phone` | VARCHAR(50) | | |
| `website` | VARCHAR(300) | | |
| `price_range` | VARCHAR(80) | | Nhãn hiển thị |
| `price_min`, `price_max` | INT | | Dùng cho bộ lọc khoảng giá |
| `opening_time`, `closing_time` | TIME | | Dùng cho "đang mở" |
| `is_recommended` | BOOLEAN | NOT NULL DEFAULT false | Gợi ý nổi bật |
| `status` | VARCHAR(20) | NOT NULL DEFAULT `'DRAFT'`, CHECK IN (`DRAFT`,`PUBLISHED`,`ARCHIVED`) | |
| `zone_radius` | INTEGER | NOT NULL DEFAULT 100, CHECK 25–1000 | Bán kính vùng GPS (m) |
| `zone_exit_buffer` | INTEGER | NOT NULL DEFAULT 20, CHECK 0–500 | Hysteresis khi rời vùng (m) |
| `created_at`, `updated_at` | TIMESTAMPTZ | NOT NULL DEFAULT now() | |

Index: `idx_places_status(status)`, `idx_places_category(category_id)`.

Lưu ý: API admin còn clamp `zone_radius` về 25–1000 và `zone_exit_buffer` 0–500 trước khi
ghi (`placeController.js:16-48`), nên ràng buộc DB và API khớp nhau. Tuy vậy
`placeService.create` gọi `alert(...)` khi giá trị `zone_radius <= 50` — lỗi tiềm ẩn đã ghi
trong [yêu cầu chức năng](../requirements/functional-requirements.md#5-khác-biệt-giữa-chú-thích-và-hành-vi-thực-tế).

### 2.5 `dishes`

| Cột | Kiểu | Ràng buộc | Ghi chú |
|---|---|---|---|
| `id` | SERIAL | PK | |
| `code` | VARCHAR(80) | UNIQUE NOT NULL | |
| `culinary_place_id` | INT | NOT NULL, FK → `culinary_places(id)` ON DELETE CASCADE | Xoá quán xoá món |
| `category_id` | INT | FK → `categories(id)` | |
| `price` | VARCHAR(80) | | Giá hiển thị dạng chuỗi |
| `image_url` | VARCHAR(500) | | Ảnh đại diện món (khác gallery `media_files`) |
| `is_signature` | BOOLEAN | NOT NULL DEFAULT false | Món đặc trưng |
| `status` | VARCHAR(20) | NOT NULL DEFAULT `'PUBLISHED'`, CHECK IN (`DRAFT`,`PUBLISHED`,`ARCHIVED`) | |
| `created_at`, `updated_at` | TIMESTAMPTZ | NOT NULL DEFAULT now() | |

Index: `idx_dishes_place`, `idx_dishes_category`.

### 2.6 `translations`

| Cột | Kiểu | Ràng buộc | Ghi chú |
|---|---|---|---|
| `id` | SERIAL | PK | |
| `entity_type` | VARCHAR(8) | NOT NULL, CHECK IN (`place`,`dish`,`route`) | Đa hình |
| `entity_id` | INT | NOT NULL | Không FK; trỏ tới bảng theo `entity_type` |
| `language_id` | INT | NOT NULL, FK → `languages(id)` ON DELETE CASCADE | |
| `name` | VARCHAR(255) | NOT NULL | |
| `short_description` | TEXT | | Dùng cho thẻ danh sách |
| `description` | TEXT | | Mô tả đầy đủ |
| `history` | TEXT | | Chỉ địa điểm |
| `cultural_significance` | TEXT | | Chỉ địa điểm |
| `tourist_tips` | TEXT | | Chỉ địa điểm |
| `ingredients` | TEXT | | Chỉ món |
| `cultural_information` | TEXT | | Chỉ món |
| `created_at`, `updated_at` | TIMESTAMPTZ | NOT NULL DEFAULT now() | |

Ràng buộc: `UNIQUE (entity_type, entity_id, language_id)`; index
`idx_translations_entity(entity_type, entity_id)`, `idx_translations_language(language_id)`.

Quy ước ứng dụng: tên/mô tả lộ trình cũng lưu ở đây với `entity_type = 'route'`
(`catalogService.js:383-429`). Không có FK tới thực thể cha — xoá place/dish/route
**không** tự xoá bản dịch; code hiện tại cũng không dọn thủ công, nên bản dịch mồ côi
có thể tồn tại (xem mục 6).

### 2.7 `media_files`

| Cột | Kiểu | Ràng buộc | Ghi chú |
|---|---|---|---|
| `id` | SERIAL | PK | |
| `entity_type` | VARCHAR(12) | NOT NULL, CHECK IN (`place`,`dish`,`translation`) | Đa hình |
| `entity_id` | INT | NOT NULL | Không FK |
| `kind` | VARCHAR(10) | NOT NULL, CHECK IN (`image`,`audio`,`qr`) | |
| `url` | VARCHAR(500) | NOT NULL | URL tĩnh `/uploads/...` hoặc ngoài |
| `alt_text` | VARCHAR(300) | | Ảnh |
| `duration` | INT | | Giây, cho audio |
| `file_size` | INT | | Byte |
| `mime_type` | VARCHAR(100) | | |
| `source` | VARCHAR(10) | NOT NULL DEFAULT `'UPLOAD'`, CHECK IN (`UPLOAD`,`TTS`) | |
| `sort_order` | INT | NOT NULL DEFAULT 0 | Thứ tự gallery |
| `is_primary` | BOOLEAN | NOT NULL DEFAULT false | Ảnh chính |
| `metadata` | JSONB | | Với QR chứa `qr_value` |
| `created_at`, `updated_at` | TIMESTAMPTZ | NOT NULL DEFAULT now() | |

Index: `idx_media_entity`, `idx_media_gallery_order`.
Partial unique:
- `uq_media_qr_entity (entity_type, entity_id) WHERE kind = 'qr'` — một QR/thực thể.
- `uq_media_audio_translation (entity_id) WHERE entity_type = 'translation' AND kind = 'audio'`
  — một audio/bản dịch.

Không có FK tới thực thể/bản dịch; xoá bản dịch **không** xoá audio tương ứng
(`placeService.deleteTranslation` chỉ xoá dòng `translations`). File vật lý nằm trong
`server/uploads` (volume Docker).

### 2.8 `culinary_routes`

| Cột | Kiểu | Ràng buộc | Ghi chú |
|---|---|---|---|
| `id` | SERIAL | PK | |
| `code` | VARCHAR(80) | UNIQUE NOT NULL | |
| `estimated_duration` | VARCHAR(80) | | Chuỗi hiển thị ("2 giờ") |
| `distance` | VARCHAR(80) | | Chuỗi hiển thị ("1.5 km") |
| `difficulty` | VARCHAR(20) | NOT NULL DEFAULT `'EASY'`, CHECK IN (`EASY`,`MODERATE`,`HARD`) | |
| `cover_image_url` | VARCHAR(500) | | |
| `status` | VARCHAR(20) | NOT NULL DEFAULT `'DRAFT'`, CHECK IN (`DRAFT`,`PUBLISHED`,`ARCHIVED`) | |
| `created_at`, `updated_at` | TIMESTAMPTZ | NOT NULL DEFAULT now() | |

Tên/mô tả không nằm ở bảng này mà ở `translations` với `entity_type = 'route'`.

### 2.9 `route_stops`

| Cột | Kiểu | Ràng buộc | Ghi chú |
|---|---|---|---|
| `id` | SERIAL | PK | |
| `route_id` | INT | NOT NULL, FK → `culinary_routes(id)` ON DELETE CASCADE | |
| `culinary_place_id` | INT | NOT NULL, FK → `culinary_places(id)` ON DELETE CASCADE | |
| `position` | INT | NOT NULL DEFAULT 1 | Thứ tự |
| `note` | TEXT | | Ghi chú điểm dừng |
| `created_at` | TIMESTAMPTZ | | Không có `updated_at` |

Ràng buộc `UNIQUE (route_id, position)`; index `idx_stops_route`, `idx_stops_place`.
Thêm điểm dừng đẩy vị trí; xoá dồn `position - 1` cho các điểm phía sau
(`catalogService.js:437-463`).

### 2.10 `guest_sessions`

| Cột | Kiểu | Ràng buộc | Ghi chú |
|---|---|---|---|
| `id` | VARCHAR(64) | PK | UUID dạng chuỗi, sinh bởi `db.randomUuid()` |
| `token_hash` | VARCHAR(96) | NOT NULL | SHA-256 của token tạo một lần lúc khởi tạo |
| `display_id` | VARCHAR(64) | NOT NULL UNIQUE | Dạng `g_<12 hex>`, dùng trong cookie |
| `free_language_id` | INT | FK → `languages(id)` ON DELETE SET NULL | Slot miễn phí 1 |
| `free_language_id_2` | INT | FK → `languages(id)` ON DELETE SET NULL | Slot miễn phí 2 (migration 008) |
| `purchased_languages` | INT[] | NOT NULL DEFAULT `'{}'` | Ngôn ngữ mở qua thanh toán |
| `expires_at` | TIMESTAMPTZ | NOT NULL DEFAULT now() + 90 ngày | Hết hạn xoá lười |
| `created_at`, `updated_at` | TIMESTAMPTZ | NOT NULL DEFAULT now() | |

Index: `idx_guest_free_lang`, `idx_guest_free_lang_2`.
**Lưu ý bảo mật:** `token_hash` được lưu nhưng middleware `attachGuestSession` hiện xác
định phiên bằng `id`/`display_id` lấy từ cookie hoặc query (`entitlement.js:9-21`), không
kiểm tra token. `getGuestSessionByToken` tồn tại nhưng chưa được gọi ở đâu. Cookie
`guest_session_id` chứa `display_id` (không phải bí mật) và được đặt `httpOnly`,
`sameSite=lax`.

### 2.11 `checkouts`

| Cột | Kiểu | Ràng buộc | Ghi chú |
|---|---|---|---|
| `id` | SERIAL | PK | Dùng trong URL `/pay/:txid` |
| `guest_session_id` | VARCHAR(64) | NOT NULL, FK → `guest_sessions(id)` ON DELETE CASCADE | |
| `language_id` | INT | NOT NULL, FK → `languages(id)` ON DELETE RESTRICT | Ngôn ngữ khởi phát |
| `amount` | INT | NOT NULL DEFAULT 0, CHECK >= 0 | 20.000 VND |
| `currency` | VARCHAR(10) | NOT NULL DEFAULT `'VND'` | |
| `provider` | VARCHAR(30) | NOT NULL DEFAULT `'SANDBOX'` | |
| `provider_transaction_id` | VARCHAR(100) | UNIQUE | |
| `status` | VARCHAR(20) | NOT NULL DEFAULT `'pending'`, CHECK IN (`pending`,`success`,`failed`) | |
| `paid_at` | TIMESTAMPTZ | | Đặt khi `success` |
| `idempotency_key` | VARCHAR(120) | UNIQUE | Chống tạo trùng |
| `created_at`, `updated_at` | TIMESTAMPTZ | NOT NULL DEFAULT now() | |

Index: `idx_checkouts_guest(guest_session_id, status)`, `idx_checkouts_language`.
Partial unique `uq_checkouts_success_pair (guest_session_id, language_id) WHERE status='success'`
— mỗi cặp (phiên, ngôn ngữ) tối đa một biên nhận thành công.
Lưu ý: `language_id` dùng `ON DELETE RESTRICT` nên xoá ngôn ngữ đã có checkout sẽ bị chặn.

### 2.12 `activity_logs`

| Cột | Kiểu | Ràng buộc | Ghi chú |
|---|---|---|---|
| `id` | SERIAL | PK | |
| `event_type` | VARCHAR(12) | NOT NULL, CHECK IN (`favorite`,`view`,`scan`,`play`) | |
| `session_id` | VARCHAR(64) | | Định danh phiên phía client |
| `user_id` | INT | FK → `users(id)` ON DELETE SET NULL | Nếu có đăng nhập |
| `guest_session_id` | VARCHAR(64) | FK → `guest_sessions(id)` ON DELETE SET NULL | |
| `culinary_place_id` | INT | FK → `culinary_places(id)` ON DELETE CASCADE | Xoá quán xoá sự kiện |
| `translation_id` | INT | FK → `translations(id)` ON DELETE SET NULL | Cho `play` |
| `language_id` | INT | FK → `languages(id)` ON DELETE SET NULL | |
| `device_type` | VARCHAR(20) | | `mobile`/`tablet`/`desktop` |
| `platform` | VARCHAR(60) | | `ios`/`android`/`web` |
| `metadata` | JSONB | | Dữ liệu bổ sung |
| `created_at` | TIMESTAMPTZ | NOT NULL DEFAULT now() | Không có `updated_at` |

Index: thời gian, địa điểm, `(session_id, created_at DESC)`, `(event_type, created_at DESC)`.
Partial unique `uq_activity_favorite (session_id, culinary_place_id) WHERE event_type='favorite'`.

### 2.13 `schema_migrations` (hạ tầng)

| Cột | Kiểu | Ghi chú |
|---|---|---|
| `id` | SERIAL PK | |
| `filename` | VARCHAR(255) UNIQUE NOT NULL | Tên file migration |
| `executed_at` | TIMESTAMPTZ DEFAULT now() | |

Do `server/src/db/migrate.js` tạo và quản lý; không nằm trong file migration.

## 3. Quan hệ

### 3.1 Quan hệ có khoá ngoại

| Từ | Tới | Card. | Hành vi xoá |
|---|---|---|---|
| `culinary_places.category_id` | `categories.id` | N–1 | NO ACTION (chặn xoá) |
| `dishes.culinary_place_id` | `culinary_places.id` | N–1 | CASCADE |
| `dishes.category_id` | `categories.id` | N–1 | NO ACTION |
| `translations.language_id` | `languages.id` | N–1 | CASCADE (xoá bản dịch) |
| `route_stops.route_id` | `culinary_routes.id` | N–1 | CASCADE |
| `route_stops.culinary_place_id` | `culinary_places.id` | N–1 | CASCADE |
| `guest_sessions.free_language_id(_2)` | `languages.id` | N–1 | SET NULL |
| `checkouts.guest_session_id` | `guest_sessions.id` | N–1 | CASCADE |
| `checkouts.language_id` | `languages.id` | N–1 | RESTRICT |
| `activity_logs.user_id` | `users.id` | N–1 | SET NULL |
| `activity_logs.guest_session_id` | `guest_sessions.id` | N–1 | SET NULL |
| `activity_logs.culinary_place_id` | `culinary_places.id` | N–1 | CASCADE |
| `activity_logs.translation_id` | `translations.id` | N–1 | SET NULL |
| `activity_logs.language_id` | `languages.id` | N–1 | SET NULL |

### 3.2 Quan hệ logic (đa hình, không FK)

| Quan hệ | Quy ước |
|---|---|
| `translations` → `culinary_places` | `entity_type='place' AND entity_id=culinary_places.id` |
| `translations` → `dishes` | `entity_type='dish' AND entity_id=dishes.id` |
| `translations` → `culinary_routes` | `entity_type='route' AND entity_id=culinary_routes.id` |
| `media_files` → địa điểm/món | `entity_type IN ('place','dish') AND kind IN ('image','qr')` |
| `media_files` → bản dịch | `entity_type='translation' AND kind='audio'` |

Kiểm tra tính toàn vẹn của các quan hệ này do tầng service đảm nhận, không do CSDL.

## 4. Vòng đời dữ liệu

1. **Khởi tạo:** `migrate.js` chạy các file `NNN_*.sql` theo thứ tự tên, ghi
   `schema_migrations`, rồi `seed.js` chạy seed theo thứ tự tên. Phần lớn seed dùng
   `ON CONFLICT DO NOTHING/DO UPDATE` hoặc `WHERE NOT EXISTS`, nhưng không phải toàn bộ,
   nên chạy lại có thể sinh bản ghi trùng ở một số file (ví dụ sự kiện mẫu).
2. **Tạo nội dung:** Admin/Staff tạo địa điểm → thêm bản dịch → thêm ảnh/audio/QR.
3. **Publish:** đổi `status='PUBLISHED'`; dịch vụ tự tạo QR nếu thiếu.
4. **Khách:** tạo `guest_sessions` → chọn tối đa 2 ngôn ngữ miễn phí → nếu cần, tạo
   `checkouts` và xác nhận → `purchased_languages`.
5. **Sự kiện:** `scan`/`view`/`play`/`favorite` ghi vào `activity_logs`; dashboard đọc
   cửa sổ 5 phút cho "đang truy cập".
6. **Hết hạn:** phiên khách quá `expires_at` bị xoá lười khi middleware gặp; checkout và
   sự kiện liên quan bị cascade/set null theo FK.
7. **Lưu trữ:** dùng `status='ARCHIVED'` thay vì xoá để giữ lịch sử.

## 5. Migration và seed

| File | Nội dung |
|---|---|
| `001_core.sql` | `users`, `languages`, `categories`, trigger, `pgcrypto` |
| `002_content.sql` | `culinary_places` (+ vùng GPS), `dishes`, `translations`, `media_files` |
| `003_routes.sql` | `culinary_routes`, `route_stops` |
| `004_guest.sql` | `guest_sessions` (+ `purchased_languages`) |
| `006_activity.sql` | `activity_logs` |
| `007_checkouts.sql` | `checkouts` |
| `008_second_free_language.sql` | `free_language_id_2` |
| `900_legacy_data.sql` | Chuyển dữ liệu từ schema cũ (guard bằng `to_regclass`, no-op trên DB mới) |
| `999_drop_legacy.sql` | Xoá bảng/func cũ (payments, media riêng lẻ, `system_settings`…) |

Seed: 5 ngôn ngữ, danh mục, địa điểm/món tiếng Việt + bản dịch zh/ko/ja/en, tài khoản demo
và lộ trình mẫu, sự kiện mẫu cho dashboard.
Tài khoản demo (chỉ phát triển): `admin@district4.local` / `Admin@123456`,
`staff@district4.local` / `Staff@123456` (xem `seeds/008_users_routes.sql` và
`apps/web/src/admin/AdminLogin.jsx`).

## 6. Rủi ro và điểm cần lưu ý

| # | Vấn đề | Ảnh hưởng | Đề xuất |
|---|---|---|---|
| D1 | Bản dịch/media không có FK tới thực thể cha | Xoá địa điểm/món/lộ trình để lại dữ liệu mồ côi | Dọn trong transaction khi xoá, hoặc thêm trigger/kiểm tra định kỳ |
| D2 | Xoá danh mục đang dùng bị FK chặn nhưng service không bắt lỗi | API trả 500 thay vì 409 | Bắt mã lỗi `23503` và trả `CATEGORY_IN_USE` |
| D3 | `media_files` không có FK tới `translations` | Xoá bản dịch để lại audio mồ côi và file trên đĩa | Xoá kèm media trong `deleteTranslation` |
| D4 | Cột `bcl` đặt tên sai chính tả (ý là BCP-47) | Khó hiểu khi bảo trì | Đổi tên khi có migration mới |
| D5 | `route_stops` không có `updated_at` | Không theo dõi được lần sửa | Thêm nếu cần audit |
| D6 | Phiên khách hết hạn chỉ bị xoá lười | Bảng phình dần | Thêm job dọn định kỳ |
| D7 | `translations` dùng `entity_id INT` không kiểm tra tồn tại | Có thể trỏ tới id không tồn tại | Kiểm tra ở service (đã làm khi tạo) + job kiểm tra định kỳ |
| D8 | `token_hash` của phiên khách không được xác thực | Ai biết `display_id` có thể dùng lại phiên và quyền lợi | Bắt buộc kiểm tra token ở middleware, hoặc bỏ hẳn cột nếu không dùng |
