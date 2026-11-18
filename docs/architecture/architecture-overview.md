# Kiến trúc hệ thống — District 4 Culinary Guide

> Nguồn: `package.json` các workspace, `server/src/**`, `apps/web/src/**`,
> `apps/mobile/**`, `docker-compose*.yml`, `Dockerfile`, `nginx.conf`.

## 1. Phong cách kiến trúc

Hệ thống là **ứng dụng web/mobile client–server 3 tầng**:

- **Tầng trình bày:** hai SPA độc lập — React web (công khai + CMS) và React Native/Expo
  (hướng dẫn viên di động).
- **Tầng ứng dụng:** một REST API Express duy nhất, không trạng thái với JWT cho quản trị;
  quyền lợi khách lưu phía server trong `guest_sessions`.
- **Tầng dữ liệu:** PostgreSQL 16 + thư mục file tĩnh cho ảnh/audio/QR.

Monorepo pnpm gồm 3 workspace `web`, `mobile`, `server`; CSDL và seed nằm ngoài workspace
(`database/`). Không có message queue, cache phân tán hay realtime; dashboard dùng polling.

## 2. Thành phần runtime

| Thành phần | Công nghệ | Trách nhiệm | Cổng |
|---|---|---|---|
| `apps/web` | React 18, Vite 5, React Router 6, Axios, Leaflet | Website khách + CMS admin, gọi `/api` | 5173 (dev), 8080→80 (Docker) |
| `apps/mobile` | Expo SDK 51, RN 0.74.5, React Navigation 6 | Quét QR, GPS guide, audio, yêu thích | Metro 8081 (dev) |
| `server` | Node 20+, Express 4, pg, JWT, multer, qrcode, helmet, cors | REST API, xác thực, paywall, TTS, QR | 5000 (5001/5002 khi Docker) |
| `postgres` | PostgreSQL 16 | Lưu trữ quan hệ | 5432 (5433 host) |
| `admin-web` (nginx) | nginx alpine | Phục vụ build tĩnh, proxy `/api` + `/uploads` | 80 (8080 host) |
| VNPay Sandbox | Dịch vụ ngoài (giả lập) | Đích của QR thanh toán | — |
| TTS provider | Google Translate / Google Cloud / ElevenLabs / Edge TTS | Sinh audio thuyết minh | — |
| OpenStreetMap | Dịch vụ ngoài | Tile bản đồ + URL chỉ đường | — |

Sơ đồ thành phần: [component-diagram.puml](component-diagram.puml).

## 3. Phân lớp phía server

```
HTTP → index.js (helmet, cors, rate-limit, cookie, json, static /uploads)
     → routes/index.js, routes/guest.js
     → middleware (auth JWT, requireRole, attachGuestSession, requireLanguageUnlock, upload)
     → controllers (parse/validate, gọi service, trả envelope)
     → services (nghiệp vụ, SQL qua db helper)
     → db/index.js (pg Pool, query/getOne/getMany, transaction helper)
     → PostgreSQL
```

| Lớp | File tiêu biểu | Ghi chú |
|---|---|---|
| Khởi động | `server/src/index.js` | Cấu hình bảo mật, CORS, static, mount route, warm-up audio |
| Định tuyến | `routes/index.js`, `routes/guest.js` | Khai báo endpoint + middleware theo nhóm |
| Xác thực | `middleware/auth.js` | Bearer JWT, `requireRole(...roles)` |
| Quyền lợi khách | `middleware/entitlement.js`, `services/entitlementService.js` | Gắn phiên, kiểm tra ngôn ngữ, checkout |
| Nội dung | `services/placeService.js`, `catalogService.js` | CRUD + truy vấn đa ngữ, lộ trình |
| Media/TTS/QR | `services/mediaService.js`, `dishAudioService.js`, `geoAudioService.js`, `audioWarmupService.js` | Sinh audio, QR, chọn script, warm-up nền |
| Thống kê | `services/statsService.js` | Tổng hợp dashboard từ `activity_logs` |
| Hạ tầng | `config/index.js`, `db/index.js`, `db/migrate.js`, `db/seed.js` | Env, pool, migration, seed |
| Tiện ích | `utils/errors.js`, `narration.js`, `paginate.js`, `audioDuration.js` | Envelope lỗi, narration 30s, phân trang |

Controller mỏng, service chứa SQL. Không dùng ORM; toàn bộ truy vấn tham số hoá.

## 4. Luồng nghiệp vụ chính

### 4.1 Quét QR → hướng dẫn → audio

1. Camera điện thoại hoặc app đọc QR, mở `PUBLIC_BASE_URL/place/:id`.
2. Web tải `GET /places/:id?lang=`, hiển thị bản dịch + món + bản đồ.
3. Nếu ngôn ngữ chưa mở, `LanguageBanner` gọi API phiên khách.
4. Audio: `GET /translations/:id/audio?language=` → middleware kiểm tra quyền → trả file
   (sinh TTS nếu thiếu) → trình phát web/mobile.

### 4.2 Paywall ngôn ngữ

1. `POST /guest-sessions` cấp phiên + cookie.
2. Tối đa 2 ngôn ngữ miễn phí (`grantFreeLanguage`).
3. Hết slot → `POST /guest-sessions/checkouts` tạo `checkouts` pending + QR.
4. Quét QR mở `/pay/:txid` → `POST /guest-sessions/vnpay/:txid/confirm` (sandbox).
5. Server mở toàn bộ ngôn ngữ trong `purchased_languages`; web refresh quyền lợi.

### 4.3 GPS guide trên mobile

1. `useLocation` theo dõi vị trí; `zoneDetectionService` tải vùng lân cận và cache.
2. Tính Haversine trên thiết bị, dùng `zone_radius` + `zone_exit_buffer` để vào/ra vùng.
3. `useAudioGuide` phát clip, xếp hàng clip mới nếu đang bận.

### 4.4 CMS admin

1. `AdminLogin` → `POST /auth/login` → JWT lưu `localStorage`.
2. `AdminLayout` gọi `/auth/me`, hiển thị menu theo vai trò.
3. Trình soạn nội dung gọi CRUD, upload, TTS, QR; dashboard polling 30 giây.

## 5. Hợp đồng giao tiếp

- Base path: `/api`; JSON; envelope `{ success, data, meta? }` hoặc
  `{ success: false, code, message }`.
- Xác thực quản trị: `Authorization: Bearer <JWT>`; JWT chứa `sub`, `role`, hết hạn 12h.
- Phiên khách: cookie `guest_session_id` (httpOnly) hoặc query `guest_session_id`; mobile
  giữ id trong AsyncStorage.
- Ngôn ngữ: query `?lang=` hoặc `?language=`; mặc định `vi`.
- Phân trang: `page`, `page_size` (tối đa theo `utils/paginate.js`).
- Upload: `multipart/form-data` với field `image`/`audio`; giới hạn 10 MB/25 MB.

Chi tiết endpoint: [../api/api-documentation.md](../api/api-documentation.md).

## 6. Yếu tố cắt ngang

| Mối quan tâm | Cách xử lý | Bằng chứng |
|---|---|---|
| Bảo mật header | Helmet | `server/src/index.js:14` |
| CORS | Danh sách localhost, IP LAN riêng, `FRONTEND_URL`; credentials | `index.js:15-35` |
| Chống lạm dụng | 300 req/phút/IP cho `/api` | `index.js:41-48` |
| Xác thực | JWT + bcrypt; role trong token | `middleware/auth.js`, `authService.js` |
| Paywall | Middleware kiểm tra `guest_sessions` trước khi trả bản dịch/audio | `middleware/entitlement.js` |
| Lỗi | `ApiError(code)` + handler chung | `utils/errors.js` |
| Upload | Multer disk storage, allowlist mime + extension, giới hạn dung lượng | `middleware/upload.js` |
| Nội dung tĩnh | `/uploads` phục vụ bởi Express; nginx proxy khi Docker | `index.js:50-54`, `nginx.conf` |
| TTS | Chuỗi provider + fallback keyless + warm-up nền | `services/mediaService.js`, `audioWarmupService.js` |
| Thời gian | Tất cả timestamp `TIMESTAMPTZ`; hạn phiên 90 ngày | migrations |

Không có logging tập trung, tracing hay metrics; chỉ `console` và dashboard nội bộ.

## 7. Dữ liệu và lưu trữ

- 13 bảng nghiệp vụ; chi tiết ở [../database/database-design.md](../database/database-design.md).
- Nội dung đa ngữ và media dùng **bảng đa hình** (`entity_type` + `entity_id`), không FK.
- File upload nằm trên đĩa `server/uploads`, bind-mount vào container; metadata trong
  `media_files`. QR là PNG sinh bởi thư viện `qrcode`.
- Migration/seed chạy khi server khởi động trong Docker
  (`node src/db/migrate.js && node src/db/seed.js && node src/index.js`).

## 8. Triển khai

- **Dev trên host:** `pnpm dev` (server + web), `pnpm dev:mobile` (Expo); PostgreSQL chạy
  Docker hoặc local; web gọi `VITE_API_URL=http://localhost:5000/api`.
- **Dev Docker:** `pnpm dev:docker` dùng `docker-compose.dev.yml` (nodemon + Vite, cổng
  5002/5173).
- **Production Docker:** `docker compose up --build` dựng `postgres`, `server` (5001→5000),
  `admin-web` nginx (8080→80). nginx phục vụ SPA và proxy `/api`, `/uploads` tới `server`.
- Không có TLS, reverse proxy công khai hay pipeline CI/CD thực tế. `.github/workflows` chỉ
  chứa các workflow mẫu (trong đó `docker-image.yml` build `Dockerfile` gốc không tồn tại);
  kiểm tra chất lượng hiện dựa vào `pnpm check:*` chạy thủ công.

Sơ đồ triển khai: [deployment-diagram.puml](deployment-diagram.puml).

## 9. Quyết định kiến trúc và đánh đổi

| ID | Quyết định | Lý do | Đánh đổi |
|---|---|---|---|
| AD-01 | Một API Express cho cả web và mobile | Ít trùng lặp, một mô hình quyền | Mọi client phụ thuộc cùng version API |
| AD-02 | Bảng `translations`/`media_files` đa hình | Tránh 6 bảng bản dịch/media riêng | Mất toàn vẹn FK, phải dọn thủ công |
| AD-03 | Quyền lợi khách lưu server, không JWT | Chặn sửa quyền phía client | Cần tra CSDL mỗi request audio |
| AD-04 | TTS sinh lười + warm-up nền | Trải nghiệm im lặng không bị chặn | Phụ thuộc dịch vụ ngoài, file chiếm đĩa |
| AD-05 | JWT stateless, không refresh token | Đơn giản cho CMS nội bộ | Không thu hồi token trước hạn |
| AD-06 | QR trỏ URL web công khai | Dùng được camera mặc định, không cần app | Phụ thuộc mạng và tên miền/IP |
| AD-07 | Docker Compose một máy | Phù hợp đồ án, dễ demo | Không có HA, không scale ngang |

## 10. Hạn chế và nợ kỹ thuật

| # | Vấn đề | Ảnh hưởng |
|---|---|---|
| T1 | `requireLanguageUnlock` không bỏ qua admin dù chú thích nói có | Admin phải dùng endpoint riêng; dễ hiểu nhầm |
| T2 | `placeService.create` gọi `alert()` khi `zone_radius <= 50` | Lỗi runtime tiềm ẩn |
| T3 | Quyền vai trò là hằng số; endpoint cập nhật quyền không lưu | UI quản lý quyền gây hiểu nhầm |
| T4 | `token_hash` phiên khách không được kiểm tra | Nguy cơ chiếm phiên nếu lộ `display_id` |
| T5 | Bản dịch/media mồ côi sau khi xoá thực thể | Dữ liệu rác, dung lượng tăng |
| T6 | Không có test tự động cho API (chỉ script kiểm tra tĩnh) | Rủi ro hồi quy |
| T7 | Không có TLS/reverse proxy trong compose | Không dùng được ngoài mạng nội bộ |
| T8 | Dashboard polling, không cache | Tải CSDL tăng khi nhiều admin |
| T9 | Paywall chỉ gắn ở endpoint audio/translation chuyên biệt; `/places/:id/guide` và `/dishes/:id` trả mọi bản dịch + URL audio | Khách đọc/nghe được ngôn ngữ chưa mở khoá qua luồng chính |
