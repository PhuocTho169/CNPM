# Tài liệu API — District 4 Culinary Guide

> Nguồn: `server/src/routes/index.js`, `server/src/routes/guest.js`,
> các controller trong `server/src/controllers/`, `middleware/auth.js`,
> `middleware/entitlement.js`, `middleware/upload.js`, `utils/errors.js`.
> Đây là đặc tả **hành vi hiện tại của code**, không phải hợp đồng phiên bản độc lập.

## 1. Quy ước chung

- **Base URL:** `http://<host>:5000/api` (dev), `http://<host>:8080/api` (qua nginx Docker).
- **Định dạng:** JSON UTF-8; upload dùng `multipart/form-data`.
- **Thành công:**
  ```json
  { "success": true, "data": { }, "meta": { "page": 1, "limit": 20, "total": 42, "total_pages": 3 } }
  ```
  `201` cho tạo mới; `meta` chỉ có ở endpoint phân trang.
- **Lỗi:**
  ```json
  { "success": false, "code": "VALIDATION_ERROR", "message": "...", "details": null }
  ```
  `details` chỉ xuất hiện khi service truyền vào.
- **Xác thực quản trị:** `Authorization: Bearer <JWT>`; token hết hạn sau 12 giờ.
- **Phiên khách:** cookie `guest_session_id` (httpOnly) **hoặc** query `guest_session_id`.
  Không dùng header riêng; token trả về khi tạo phiên hiện chưa được kiểm tra.
- **Ngôn ngữ:** `?lang=` (đa số endpoint) hoặc `?language=` (audio/translation, chấp nhận
  cả `idx`); mặc định `vi`.
- **Phân trang:** `page` (mặc định 1), `limit` (mặc định 20, tối đa 100), áp dụng cho
  `GET /places` và `GET /dishes`.
- **Giới hạn:** 300 request/phút/IP trên toàn `/api`.
- **Upload:** ảnh jpg/jpeg/png/webp/gif ≤ 10 MB; audio mp3/wav/m4a/aac ≤ 25 MB.

Ký hiệu quyền: `Public` = không cần đăng nhập; `Guest` = cần phiên khách nếu ngôn ngữ khác
`vi`; `Staff` = `ADMIN` hoặc `STAFF`; `Admin` = chỉ `ADMIN`.

## 2. Sức khoẻ hệ thống

| Method | Path | Quyền | Mô tả |
|---|---|---|---|
| GET | `/health` | Public | Trả `200`/`503` kèm `database: connected\|disconnected` |

Phản hồi không có `data`:
```json
{ "success": true, "service": "district4-culinary-guide-api", "database": "connected", "time": "..." }
```

## 3. Xác thực và người dùng

| Method | Path | Quyền | Body / query | Kết quả |
|---|---|---|---|---|
| POST | `/auth/login` | Public | `{ email, password }` | `{ token, user }` |
| GET | `/auth/me` | Staff | — | Hồ sơ người dùng hiện tại |
| GET | `/users` | Admin | — | Danh sách người dùng |
| POST | `/users` | Admin | `{ email, password, role, full_name? }` | Người dùng mới |
| PUT | `/users/:id` | Admin | `{ full_name?, email?, role?, is_active? }` | Người dùng đã sửa |
| PUT | `/users/:id/password` | Admin | `{ password }` | `{ id, password_reset: true }` |
| DELETE | `/users/:id` | Admin | — | `{ id, deleted: true }`; không xoá chính mình |
| GET | `/roles` | Admin | — | Danh sách vai trò |
| GET | `/permissions` | Admin | — | Quyền tĩnh của từng vai trò |
| PUT | `/roles/:id/permissions` | Admin | `{ permission_ids: [] }` | `{ updated: false, static_permissions: true }` |

`POST /auth/login` lỗi: `401 INVALID_CREDENTIALS`, `401 ACCOUNT_DISABLED`.
`POST /users` lỗi: `400 VALIDATION_ERROR`, `409 DUPLICATE`, `400 ROLE_NOT_FOUND`.
`DELETE /users/:id` lỗi: `400 CANNOT_DELETE_SELF`.

`GET /auth/me` trả:
```json
{ "success": true, "data": { "id": 1, "email": "...", "full_name": "...", "role": "ADMIN", "is_active": true } }
```

## 4. Danh mục công khai

| Method | Path | Quyền | Query | Ghi chú |
|---|---|---|---|---|
| GET | `/languages` | Public | `active_only=true` | Mặc định trả cả ngôn ngữ không hoạt động |
| GET | `/categories` | Public | `applies_to=place\|dish\|both` | Lọc theo phạm vi |

## 5. Địa điểm ẩm thực

### 5.1 Đọc công khai

| Method | Path | Quyền | Query | Ghi chú |
|---|---|---|---|---|
| GET | `/places` | Public | `lang, category, q, status, price, open_now, recommended, sort, page, limit` | **Không tự lọc published**: nếu bỏ `status`, trả cả `DRAFT`/`ARCHIVED` |
| GET | `/places/nearby` | Public | `lat, lng` (bắt buộc), `radius` (mặc định 2000), `limit` (10), `lang` | Sắp theo khoảng cách |
| GET | `/places/:id` | Public | `lang` | Chi tiết rút gọn, không chặn `DRAFT`/`ARCHIVED` |
| GET | `/places/:id/guide` | Public | `lang` | Chi tiết đầy đủ; `410 PLACE_ARCHIVED` nếu đã lưu trữ |
| POST | `/places/:id/scan` | Public | `{ language_id?, device_type?, platform?, anonymous_session_id? }` | Ghi sự kiện quét |

`GET /places` trả `data` là mảng, `meta` phân trang. Bộ lọc `price`:
`budget` (`price_max <= 70000`), `mid` (70.000–150.000), `premium` (> 150.000).
`open_now=true` dùng giờ `Asia/Ho_Chi_Minh`, hỗ trợ quán qua đêm.

Một phần tử địa điểm (rút gọn) gồm: `id, code, status, address, latitude, longitude,
zone_radius, zone_exit_buffer, phone, website, price_range, opening_time, closing_time,
is_recommended, category, primary_image, image_count, dish_count, language_codes, has_audio,
has_qr, qr_value, qr_image_url, translation`.

### 5.2 Quản trị

| Method | Path | Quyền | Body | Ghi chú |
|---|---|---|---|---|
| POST | `/places` | Staff | `{ code (bắt buộc), category_id, address, latitude, longitude, phone, website, price_range, price_min, price_max, opening_time, closing_time, is_recommended, status, zone_radius, zone_exit_buffer }` | `zone_radius` clamp 25–1000; buffer 0–500 |
| PUT | `/places/:id` | Staff | Như trên (trường thiếu giữ nguyên) | |
| PATCH | `/places/:id/status` | Staff | `{ status: DRAFT\|PUBLISHED\|ARCHIVED }` | |
| DELETE | `/places/:id` | Admin | — | Xoá quán; món/điểm dừng/sự kiện cascade, bản dịch ở lại (xem DB doc) |

Lỗi: `400 VALIDATION_ERROR`, `404 PLACE_NOT_FOUND`, `409 DUPLICATE`,
`403 FORBIDDEN` (Staff xoá).

### 5.3 Bản dịch địa điểm

| Method | Path | Quyền | Body | Ghi chú |
|---|---|---|---|---|
| GET | `/places/:id/translations` | Staff | — | Tất cả bản dịch |
| POST | `/places/:id/translations` | Staff | `{ language_id, name, short_description?, description?, history?, cultural_significance?, tourist_tips? }` | Upsert theo (place, ngôn ngữ) |
| PUT | `/translations/:translationId` | Staff | Như trên | Cập nhật bản dịch |
| DELETE | `/translations/:translationId` | Staff | — | Không xoá audio đi kèm |

### 5.4 Ảnh địa điểm

| Method | Path | Quyền | Body | Ghi chú |
|---|---|---|---|---|
| POST | `/places/:id/images` | Staff | multipart `image`, `alt_text?`, `is_primary?` | Trả bản ghi media |
| PUT | `/places/:id/images/:imageId` | Staff | `{ alt_text?, sort_order?, is_primary? }` | |
| DELETE | `/places/:id/images/:imageId` | Staff | — | Xoá bản ghi, không xoá file vật lý |

## 6. Món ăn

| Method | Path | Quyền | Query / body | Ghi chú |
|---|---|---|---|---|
| GET | `/dishes` | Public | `place_id, q, status, lang, page, limit` | **Không tự lọc published** khi bỏ `status` |
| GET | `/dishes/:id` | Public | `lang` | 404 `DISH_NOT_FOUND` |
| GET | `/dishes/:id/translation` | Guest | `language` | 403 `LANGUAGE_LOCKED` / `TRANSLATION_UNAVAILABLE` |
| GET | `/dishes/:id/audio` | Guest | `language` | Trả metadata audio (sinh TTS nếu thiếu) |
| POST | `/dishes` | Staff | `{ code, culinary_place_id, category_id?, price?, image_url?, is_signature?, status? }` | |
| PUT | `/dishes/:id` | Staff | Các trường như trên | |
| POST | `/dishes/:id/image` | Staff | multipart `image` | Cập nhật `image_url` |
| DELETE | `/dishes/:id` | Staff | — | |
| POST | `/dishes/:id/translations` | Staff | `{ language_id, name, description?, ingredients?, cultural_information? }` | |
| GET | `/dishes/:id/qr` | Public | — | QR hiện có |
| POST | `/dishes/:id/qr` | Staff | `{ base_url?, origin_hint? }` | Tạo nếu chưa có |
| POST | `/dishes/:id/qr/regenerate` | Staff | Như trên | Làm lại QR |

## 7. Lộ trình ẩm thực

| Method | Path | Quyền | Query / body | Ghi chú |
|---|---|---|---|---|
| GET | `/routes` | Public | `status, lang` | **Lọc `PUBLISHED` do client truyền** |
| GET | `/routes/:id` | Public | `lang` | Kèm điểm dừng |
| POST | `/routes` | Staff | `{ code, name, description?, estimated_duration?, distance?, difficulty?, cover_image_url?, status? }` | Tên/mô tả lưu vào `translations` (mặc định `vi` nếu không có `language_id`) |
| PUT | `/routes/:id` | Staff | Như trên | |
| DELETE | `/routes/:id` | Admin | — | |
| POST | `/routes/:id/stops` | Staff | `{ culinary_place_id, position?, note? }` | Không có `position` thì thêm cuối |
| PUT | `/routes/stops/:stopId` | Staff | `{ position?, note? }` | |
| DELETE | `/routes/stops/:stopId` | Staff | — | Dồn vị trí các điểm sau |

## 8. Ngôn ngữ và danh mục (quản trị)

| Method | Path | Quyền | Body | Ghi chú |
|---|---|---|---|---|
| POST | `/languages` | Admin | `{ code, name, native_name, bcl?, voice_note?, is_active? }` | Xoá cache TTS |
| PUT | `/languages/:id` | Admin | Như trên | |
| DELETE | `/languages/:id` | Admin | — | `409 LANGUAGE_IN_USE` nếu còn dữ liệu |
| POST | `/categories` | Staff | `{ code, name, applies_to?, icon?, is_active? }` | |
| PUT | `/categories/:id` | Staff | Như trên | |
| DELETE | `/categories/:id` | Admin | — | Có thể lỗi 500 nếu còn địa điểm/món tham chiếu (FK) |

## 9. Audio, TTS và QR địa điểm

| Method | Path | Quyền | Query / body | Ghi chú |
|---|---|---|---|---|
| GET | `/culinary-places/:placeId/audio` | Guest | `language` | Paywall theo ngôn ngữ |
| GET | `/culinary-places/:placeId/translation` | Guest | `language` | Paywall theo ngôn ngữ |
| GET | `/culinary-places/nearby` | Public | `latitude, longitude` (bắt buộc), `radius?, limit?, lang` | Vùng GPS cho mobile, trả `{ places: [] }` |
| GET | `/translations/:translationId/audio` | Staff | — | Bỏ qua paywall cho CMS |
| POST | `/translations/:translationId/audio` | Staff | multipart `audio`, `duration?` | Gắn/ghi đè audio |
| POST | `/translations/:translationId/audio/url` | Staff | `{ file_url, duration?, mime_type? }` | Liên kết audio ngoài |
| DELETE | `/audio/:id` | Staff | — | Xoá bản ghi audio |
| POST | `/tts` | Staff | `{ text, language_code, translation_id? }` | Sinh TTS; có `translation_id` thì gắn luôn |
| GET | `/places/:id/qr` | Public | — | QR địa điểm |
| POST | `/places/:id/qr` | Staff | `{ base_url?, origin_hint? }` | Tạo QR |
| POST | `/places/:id/qr/regenerate` | Staff | Như trên | Làm lại QR |

Lỗi TTS: `501 TTS_NOT_CONFIGURED`, `502 TTS_PROVIDER_ERROR`.
Lỗi audio: `404 NARRATION_UNAVAILABLE`, `403 LANGUAGE_LOCKED`.

## 10. Phiên khách và paywall (`/guest-sessions`)

| Method | Path | Quyền | Body / query | Ghi chú |
|---|---|---|---|---|
| POST | `/guest-sessions` | Public | — | Tạo phiên + cookie; trả `guest_session_id`, `token`, `display_id` |
| GET | `/guest-sessions/me` | Guest | — | Tóm tắt quyền lợi |
| DELETE | `/guest-sessions/:id` | Guest | — | Xoá phiên phía server |
| POST | `/guest-sessions/free-language` | Guest | `{ language_id }` | Cấp 1 trong 2 slot miễn phí |
| GET | `/guest-sessions/languages` | Guest | — | Ngôn ngữ hoạt động + ngôn ngữ đã mở |
| POST | `/guest-sessions/languages/:languageId/purchase` | Guest | — | Sandbox: thêm **một** ngôn ngữ vào `purchased_languages` |
| POST | `/guest-sessions/checkouts` | Guest | `{ language_id }` | Tạo checkout 20.000 VND + QR SVG |
| GET | `/guest-sessions/checkouts` | Guest | — | Lịch sử checkout |
| GET | `/guest-sessions/checkouts/:id` | Guest | — | Một checkout thuộc phiên |
| POST | `/guest-sessions/checkouts/:id/confirm` | Guest | — | Xác nhận sandbox, mở toàn bộ ngôn ngữ |
| POST | `/guest-sessions/vnpay/:providerTransactionId/confirm` | Public | — | Trang `/pay/:txid` gọi; không cần phiên |
| GET | `/guest-sessions/culinary-places/:placeId/translation` | Guest | `language` | Bản dịch địa điểm có paywall |
| GET | `/guest-sessions/dishes/:dishId/translation` | Guest | `language` | Bản dịch món có paywall |

### 10.1 Tạo phiên

```json
POST /api/guest-sessions
{ "success": true, "data": { "guest_session_id": "uuid", "token": "base64url", "display_id": "g_ab12...", "expires_at": "..." } }
```
Cookie: `guest_session_id=<display_id>; HttpOnly; SameSite=Lax; Max-Age=90 ngày`.

### 10.2 Chọn ngôn ngữ miễn phí

```json
POST /api/guest-sessions/free-language
{ "language_id": 2 }
```
`201` kèm `free_language_id`, `purchased_languages`, `language_code`.
Lỗi: `404 GUEST_SESSION_NOT_FOUND`, `409 FREE_LANGUAGE_ALREADY_SELECTED`,
`409 FREE_LANGUAGE_CONFLICT`, `404 LANGUAGE_NOT_FOUND`.

### 10.3 Tạo checkout và xác nhận

```json
POST /api/guest-sessions/checkouts
{ "language_id": 3 }
```
`201`:
```json
{
  "success": true,
  "data": {
    "id": 12, "status": "pending", "amount": 20000, "currency": "VND",
    "provider_transaction_id": "D4...", "reused": false,
    "vnpay": { "url": "http://.../pay/D4...", "qr_svg": "data:image/svg+xml;base64,..." }
  }
}
```
Lỗi: `409 ALREADY_UNLOCKED`, `404 LANGUAGE_NOT_FOUND`.

Xác nhận bằng chủ phiên:
```json
POST /api/guest-sessions/checkouts/12/confirm
```
Xác nhận bằng QR (thiết bị khác):
```json
POST /api/guest-sessions/vnpay/D4.../confirm
```
Cả hai trả `checkout`, `guest`, `already_confirmed`. Xác nhận lặp không tạo biên nhận mới.
Lỗi: `404 CHECKOUT_NOT_FOUND`, `409 CHECKOUT_FAILED`.

## 11. Thống kê và giám sát

| Method | Path | Quyền | Query | Kết quả |
|---|---|---|---|---|
| GET | `/dashboard/statistics` | Staff | — | Tổng hợp overview + biểu đồ + online |
| GET | `/dashboard/online-users` | Staff | `minutes` (1–60, mặc định 5) | Danh sách phiên đang hoạt động |
| GET | `/statistics/scans` | Staff | `days` (mặc định 30) | Lượt quét theo thời gian/địa điểm/ngôn ngữ |
| GET | `/statistics/audio` | Staff | — | Lượt phát theo ngôn ngữ/địa điểm |
| POST | `/activity/ping` | Public | `{ session_id, device_type?, platform?, path? }` | Ghi hoạt động để tính online |

`/dashboard/statistics` trả các khoá: `overview, scans_over_time, top_places, languages,
audio_plays_by_language, devices, popular_dishes, online_users`.

## 12. Yêu thích và lịch sử (ẩn danh)

| Method | Path | Quyền | Query / body | Ghi chú |
|---|---|---|---|---|
| GET | `/favorites` | Public | `session_id` (bắt buộc), `lang` | Chỉ địa điểm `PUBLISHED` |
| POST | `/favorites` | Public | `{ session_id, culinary_place_id, language_id? }` | Idempotent nhờ partial unique |
| DELETE | `/favorites` | Public | `{ session_id, culinary_place_id }` | Xoá khỏi yêu thích |
| GET | `/history` | Public | `session_id`, `lang` | Mỗi địa điểm một dòng mới nhất |
| POST | `/history` | Public | `{ session_id, culinary_place_id, language_id? }` | Thêm sự kiện xem |

Thiếu `session_id` → `400 VALIDATION_ERROR`.

## 13. Mã lỗi thường gặp

| HTTP | Code | Ngữ cảnh |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Thiếu/sai trường, toạ độ ngoài phạm vi |
| 400 | `INVALID_PLACE_ID`, `INVALID_DISH_ID` | ID không phải số |
| 400 | `CANNOT_DELETE_SELF` | Admin xoá chính mình |
| 400 | `UPLOAD_ERROR` | Sai loại/quá dung lượng file |
| 401 | `TOKEN_INVALID`, `INVALID_CREDENTIALS`, `ACCOUNT_DISABLED` | Xác thực |
| 403 | `FORBIDDEN` | Sai vai trò |
| 403 | `LANGUAGE_LOCKED` | Ngôn ngữ chưa mở |
| 403 | `TRANSLATION_UNAVAILABLE` | Không có bản dịch cho ngôn ngữ |
| 404 | `PLACE_NOT_FOUND`, `DISH_NOT_FOUND`, `ROUTE_NOT_FOUND`, `CATEGORY_NOT_FOUND`, `LANGUAGE_NOT_FOUND` | Không tìm thấy |
| 404 | `GUEST_SESSION_NOT_FOUND`, `CHECKOUT_NOT_FOUND` | Phiên/giao dịch |
| 404 | `NARRATION_UNAVAILABLE` | Không có audio/bản dịch để đọc |
| 409 | `DUPLICATE` | Vi phạm unique (PostgreSQL `23505`) |
| 409 | `FREE_LANGUAGE_ALREADY_SELECTED`, `FREE_LANGUAGE_CONFLICT` | Tranh chấp slot miễn phí |
| 409 | `ALREADY_UNLOCKED` | Ngôn ngữ đã mở |
| 409 | `CHECKOUT_FAILED` | Checkout thất bại, phải tạo mới |
| 409 | `LANGUAGE_IN_USE` | Xoá ngôn ngữ còn dữ liệu |
| 410 | `PLACE_ARCHIVED` | Địa điểm đã lưu trữ |
| 500 | `INTERNAL_ERROR` | Lỗi không mong đợi (kể cả FK chưa bắt) |
| 501 | `TTS_NOT_CONFIGURED` | Chưa cấu hình TTS |
| 502 | `TTS_PROVIDER_ERROR` | Nhà cung cấp TTS lỗi |
| 503 | — | `/health` khi CSDL mất kết nối |

## 14. Ghi chú tương thích

- Không có version API (`/v1`); thay đổi là breaking ngay.
- `GET /places` và `GET /dishes` **không** mặc định chỉ trả `PUBLISHED`; client phải tự
  truyền `status=PUBLISHED`. Trang Home hiện gọi `/dishes` không kèm `status`, nên có thể
  hiển thị món nháp.
- `/culinary-places/nearby` dùng `latitude`/`longitude`, còn `/places/nearby` dùng
  `lat`/`lng` — hai endpoint khác nhau cho hai mục đích.
- Thông báo lỗi upload luôn ghi "max 10 MB" kể cả với audio 25 MB (`utils/errors.js:37-42`).
- `POST /guest-sessions/languages/:id/purchase` và luồng checkout/VNPay là hai cách mở khoá
  khác nhau; giao diện web dùng checkout.
- **Paywall không phủ toàn bộ nội dung:** `/places/:id/guide` trả mọi bản dịch kèm
  `audio.file_url`, `/dishes/:id` trả bản dịch theo `lang`; cả hai không gắn
  `requireLanguageUnlock`. Chỉ các endpoint `/culinary-places/:id/audio`,
  `/dishes/:id/audio`, `/…/translation` mới bị chặn theo ngôn ngữ.
