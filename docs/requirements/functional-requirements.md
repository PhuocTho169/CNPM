# Yêu cầu chức năng — District 4 Culinary Guide

> Nguồn: `server/src/routes/index.js`, `server/src/routes/guest.js`,
> `server/src/controllers/*`, `server/src/services/*`,
> `database/migrations/*.sql`, `apps/web/src/**`, `apps/mobile/src/**`,
> `docker-compose*.yml`, `.env.example`.
> Trạng thái: chức năng **đã xác minh trong code**; các điểm chưa chắc chắn được ghi rõ.

## 1. Phạm vi và tác nhân

Hệ thống phục vụ khách du lịch khám phá ẩm thực Quận 4 qua mã QR và GPS, đồng thời cung
cấp trang quản trị nội dung cho ban tổ chức.

| Tác nhân | Loại | Vai trò | Bằng chứng |
|---|---|---|---|
| Khách (Visitor/Guest) | Người | Quét QR, xem hướng dẫn, chọn ngôn ngữ, nghe thuyết minh, lưu yêu thích, xem bản đồ/lộ trình | `middleware/entitlement.js`, `routes/guest.js`, web pages, mobile screens |
| Quản trị viên (Admin) | Người | Toàn quyền nội dung, người dùng, ngôn ngữ, thống kê | `role = 'ADMIN'`, `requireRole('ADMIN')` |
| Nhân viên (Staff) | Người | Soạn nội dung địa điểm/món/lộ trình, media, xem thống kê; không quản lý người dùng/ngôn ngữ/xoá địa điểm | `role = 'STAFF'`, các route `requireRole('ADMIN','STAFF')` |
| VNPay Sandbox | Hệ thống ngoài | Cổng thanh toán giả lập: QR trỏ tới `/pay/:txid`, xác nhận mở khoá | `routes/guest.js`, `services/entitlementService.js`, `pages/CheckoutResult.jsx` |
| Nhà cung cấp TTS | Hệ thống ngoài | Sinh file MP3 thuyết minh: Google Translate (keyless), Google Cloud, ElevenLabs, Edge TTS | `services/mediaService.js`, `.env.example` |
| OpenStreetMap / Leaflet | Hệ thống ngoài | Bản đồ nhúng và chỉ đường trên web | `apps/web/src/components/BaseMap.jsx`, `utils/geo.js` |

Ghi chú: GPS/camera là cảm biến thiết bị, không phải tác nhân. Ứng dụng mobile không có
đăng nhập người dùng cuối; định danh khách là **phiên ẩn danh** lưu trên thiết bị.

## 2. Yêu cầu chức năng theo miền

### 2.1 Xác thực và phân quyền (FR-AUTH)

| ID | Yêu cầu | Bằng chứng |
|---|---|---|
| FR-AUTH-01 | Quản trị viên/nhân viên đăng nhập bằng email + mật khẩu; hệ thống trả JWT hết hạn sau 12 giờ | `controllers/authController.js`, `services/authService.js:23-29` |
| FR-AUTH-02 | Mật khẩu lưu dạng bcrypt; đăng nhập sai trả `INVALID_CREDENTIALS`, tài khoản bị vô hiệu hoá trả `ACCOUNT_DISABLED` | `authService.js:31-55` |
| FR-AUTH-03 | JWT được gửi qua header `Authorization: Bearer <token>`; các route quản trị yêu cầu `authenticate` | `middleware/auth.js` |
| FR-AUTH-04 | Ba vai trò cố định: `ADMIN`, `STAFF`, `VISITOR`; mỗi endpoint khai báo vai trò được phép | `database/migrations/001_core.sql`, `routes/index.js` |
| FR-AUTH-05 | Admin quản lý người dùng: liệt kê, tạo, sửa, đặt lại mật khẩu, xoá (không xoá chính mình) | `authController.js:33-67`, `routes/index.js:22-30` |
| FR-AUTH-06 | Hệ thống trả danh sách vai trò/quyền để giao diện admin hiển thị; quyền là hằng số, không lưu DB | `authService.js:11-15,107-125` |
| FR-AUTH-07 | Đăng xuất phía web xoá token khỏi `localStorage`; không có endpoint thu hồi JWT | `admin/AdminLayout.jsx:39`, `context/AppContext.jsx:89-95` |

### 2.2 Danh mục nội dung (FR-CATALOG)

| ID | Yêu cầu | Bằng chứng |
|---|---|---|
| FR-CAT-01 | Hiển thị danh sách ngôn ngữ đang hoạt động và danh mục món/địa điểm | `GET /languages`, `GET /categories`, `catalogService.js` |
| FR-CAT-02 | CRUD địa điểm ẩm thực: mã, danh mục, địa chỉ, toạ độ, liên hệ, khoảng giá, giờ mở cửa, trạng thái, bán kính vùng GPS | `placeController.js`, `placeService.js:303-362` |
| FR-CAT-03 | Địa điểm có 3 trạng thái `DRAFT`, `PUBLISHED`, `ARCHIVED`; danh sách công khai lọc `PUBLISHED`, trang guide của địa điểm `ARCHIVED` trả 410 | `placeService.js:86-145`, `placeController.js:162-172` |
| FR-CAT-04 | CRUD món ăn gắn với địa điểm; món có cờ `is_signature`, giá, ảnh, trạng thái | `catalogService.js:118-326` |
| FR-CAT-05 | CRUD danh mục; danh mục áp dụng cho `place`, `dish` hoặc `both` | `catalogService.js:6-42`, `001_core.sql` |
| FR-CAT-06 | CRUD ngôn ngữ (Admin); ngôn ngữ mới có hiệu lực ngay cho TTS và giao diện | `catalogService.js:44-116`, `mediaService.invalidateLanguageCache` |
| FR-CAT-07 | Không xoá được ngôn ngữ còn bản dịch; phải chuyển sang `is_active = false` | `catalogService.js:75-116` |

### 2.3 Bản dịch đa ngôn ngữ (FR-TRANS)

| ID | Yêu cầu | Bằng chứng |
|---|---|---|
| FR-TRANS-01 | Bản dịch dùng một bảng chung `translations` cho `place`, `dish`, `route`, duy nhất theo (loại, id, ngôn ngữ) | `002_content.sql`, `UNIQUE (entity_type, entity_id, language_id)` |
| FR-TRANS-02 | Mỗi bản dịch địa điểm gồm tên, mô tả ngắn/dài, lịch sử, ý nghĩa văn hoá, mẹo du khách | `placeService.js:383-400` |
| FR-TRANS-03 | Mỗi bản dịch món gồm tên, mô tả, nguyên liệu, thông tin văn hoá | `catalogService.js:313-326` |
| FR-TRANS-04 | Tên/mô tả lộ trình cũng nằm trong `translations`, mặc định tiếng Việt nếu không chỉ định ngôn ngữ | `catalogService.js:371-429` |
| FR-TRANS-05 | API công khai trả bản dịch theo `?lang=` (mặc định `vi`), có fallback sang bản dịch khác khi thiếu để trang không trống | `placeService.js:153-301` |

### 2.4 Media, QR và TTS (FR-MEDIA)

| ID | Yêu cầu | Bằng chứng |
|---|---|---|
| FR-MEDIA-01 | Ảnh địa điểm/món được upload hoặc gắn URL; một ảnh có thể là ảnh chính | `placeController.js:126-159`, `middleware/upload.js` |
| FR-MEDIA-02 | Audio thuyết minh gắn với từng bản dịch; hỗ trợ upload MP3/WAV/M4A/AAC hoặc liên kết URL | `mediaController.js:87-120`, `media_files` |
| FR-MEDIA-03 | Server sinh TTS theo chuỗi ưu tiên cấu hình → fallback Google Translate miễn phí; `TTS_PROVIDER=none` tắt TTS server | `mediaService.js:389-416` |
| FR-MEDIA-04 | Script thuyết minh dùng chung cho mọi đường (guide, GPS, warm-up), mục tiêu ~30 giây, ưu tiên đọc đủ trường chính | `utils/narration.js:14-106` |
| FR-MEDIA-05 | Tạo/làm lại mã QR cho địa điểm và món ăn; QR trỏ tới URL web công khai, ưu tiên URL không phải localhost | `mediaService.js:183-280`, `mediaController.js:151-213` |
| FR-MEDIA-06 | Mỗi địa điểm/món chỉ có một QR; mỗi bản dịch chỉ có một audio (ràng buộc partial unique) | `002_content.sql` |
| FR-MEDIA-07 | Khi file audio mất khỏi đĩa, server xoá bản ghi cũ và lên lịch tạo lại | `mediaService.js:61-101`, `placeService.js:173-211` |
| FR-MEDIA-08 | Dịch vụ nền lúc khởi động tự bổ sung audio còn thiếu mà không chặn server | `services/audioWarmupService.js`, `server/src/index.js:66-71` |

### 2.5 Lộ trình ẩm thực (FR-ROUTE)

| ID | Yêu cầu | Bằng chứng |
|---|---|---|
| FR-ROUTE-01 | Khách xem danh sách/chi tiết lộ trình kèm các điểm dừng theo thứ tự | `GET /routes`, `GET /routes/:id`, `catalogService.js:328-369` |
| FR-ROUTE-02 | Admin/Staff tạo, sửa, xoá lộ trình; metadata gồm thời lượng, khoảng cách, độ khó, ảnh bìa, trạng thái | `catalogService.js:371-435` |
| FR-ROUTE-03 | Thêm/xoá/đổi thứ tự điểm dừng; vị trí duy nhất trong một lộ trình và tự dồn khi xoá | `catalogService.js:437-463`, `003_routes.sql` |
| FR-ROUTE-04 | Trang admin `/admin/routes` dùng `apps/web/src/admin/AdminRoutes.jsx` (không phải file khai báo router) | `apps/web/src/App.jsx:67`, `AdminRoutes.jsx` |

### 2.6 Phiên khách và paywall ngôn ngữ (FR-GUEST)

| ID | Yêu cầu | Bằng chứng |
|---|---|---|
| FR-GUEST-01 | Web tạo một phiên khách ẩn danh (`guest_sessions`) và lưu cookie `guest_session_id` httpOnly, hạn 90 ngày | `routes/guest.js:63-86`, `entitlementService.js:12-31` |
| FR-GUEST-02 | Khách chọn tối đa **2 ngôn ngữ miễn phí** cho mỗi phiên | `008_second_free_language.sql`, `entitlementService.js:76-112` |
| FR-GUEST-03 | Từ ngôn ngữ thứ 3, khách tạo checkout 20.000₫; xác nhận sandbox mở **toàn bộ ngôn ngữ đang hoạt động** | `entitlementService.js:140-248`, `routes/guest.js:229-362` |
| FR-GUEST-04 | Checkout có trạng thái `pending/success/failed`, idempotent theo cặp (phiên, ngôn ngữ) khi thành công | `007_checkouts.sql`, `entitlementService.js:153-224` |
| FR-GUEST-05 | Trang `/pay/:txid` xác nhận giao dịch khi quét QR VNPay; thiết bị quét không cần phiên khách | `routes/guest.js:325-362`, `pages/CheckoutResult.jsx` |
| FR-GUEST-06 | Các endpoint audio/bản dịch chuyên biệt (`/culinary-places/:id/audio`, `/dishes/:id/audio`, `/…/translation`) chặn ngôn ngữ chưa mở; **tuy nhiên** `/places/:id/guide` và `/dishes/:id` không kiểm tra quyền và vẫn trả mọi bản dịch kèm URL audio | `middleware/entitlement.js:48-88`, `routes/index.js:39,45`, `placeService.getFullDetail` |
| FR-GUEST-07 | Khách xem được danh sách ngôn ngữ kèm trạng thái đã mở khoá của mình | `GET /guest-sessions/languages`, `routes/guest.js:171-194` |
| FR-GUEST-08 | Phiên khách hết hạn được xoá lười khi truy cập và coi như chưa có phiên | `middleware/entitlement.js:24-29` |

### 2.7 Web công khai (FR-WEB)

| ID | Yêu cầu | Bằng chứng |
|---|---|---|
| FR-WEB-01 | Trang chủ giới thiệu địa điểm nổi bật, món ăn, danh mục, lộ trình | `pages/Home.jsx` |
| FR-WEB-02 | Khám phá: tìm kiếm, lọc theo danh mục, khoảng giá, đang mở, đề xuất; bộ lọc lưu trên URL | `pages/Explore.jsx` |
| FR-WEB-03 | Trang hướng dẫn `/place/:id`: chọn ngôn ngữ, nghe thuyết minh, xem món, ảnh, lịch sử/văn hoá/mẹo, chỉ đường, địa điểm lân cận | `pages/PlaceGuide.jsx`, `components/LanguageBanner.jsx` |
| FR-WEB-04 | Trang món `/dish/:id`: thông tin món, audio riêng, món khác cùng quán, chỉ đường | `pages/DishDetail.jsx` |
| FR-WEB-05 | Bản đồ `/map` hiển thị marker các địa điểm đã publish bằng Leaflet/OpenStreetMap | `pages/MapPage.jsx`, `components/BaseMap.jsx` |
| FR-WEB-06 | Trang lộ trình `/routes` và giới thiệu `/about` | `pages/FoodRoutes.jsx`, `pages/About.jsx` |
| FR-WEB-07 | Giao diện 5 ngôn ngữ (vi/en/zh/ko/ja) qua `UI_STRINGS`, có fallback tiếng Việt | `utils/uiStrings.js`, `context/AppContext.jsx:83-87` |
| FR-WEB-08 | Mọi trang công khai gửi ping hoạt động mỗi 2 phút để dashboard đếm "đang truy cập" | `components/PublicLayout.jsx:15-21`, `utils/onlineTracker.js` |

### 2.8 Ứng dụng di động (FR-MOBILE)

| ID | Yêu cầu | Bằng chứng |
|---|---|---|
| FR-MOB-01 | 6 tab: Home, Explore, Scan QR, GPS Guide, Favorites, Settings; màn chi tiết địa điểm xếp chồng | `apps/mobile/App.js` |
| FR-MOB-02 | Quét QR bằng camera, chuyển URL QR sang website hướng dẫn; QR localhost được viết lại theo IP LAN | `screens/ScanScreen.js:10-22` |
| FR-MOB-03 | Khám phá/tìm kiếm địa điểm, tìm quán gần vị trí hiện tại | `screens/ExploreScreen.js` |
| FR-MOB-04 | Xem chi tiết địa điểm, nghe audio (play/pause/seek/tốc độ), xem món và thông tin văn hoá | `screens/PlaceDetailScreen.js` |
| FR-MOB-05 | Theo dõi GPS, phát hiện vào vùng địa điểm bằng Haversine + hysteresis, tự phát thuyết minh | `hooks/useLocation.js`, `hooks/useZoneDetection.js`, `services/zoneDetectionService.js` |
| FR-MOB-06 | Khi đang phát mà vào vùng mới, xếp hàng thuyết minh mới và phát khi clip hiện tại kết thúc | `hooks/useAudioGuide.js:10-17,139-150` |
| FR-MOB-07 | Yêu thích/lịch sử lưu cục bộ bằng AsyncStorage, đồng bộ endpoint activity khi có mạng | `services/favorites.js`, `api.js` |
| FR-MOB-08 | Cài đặt: đổi ngôn ngữ, hiển thị API base, trạng thái CSDL, mã phiên ẩn danh | `screens/SettingsScreen.js` |

### 2.9 Thống kê và giám sát (FR-STATS)

| ID | Yêu cầu | Bằng chứng |
|---|---|---|
| FR-STATS-01 | Dashboard hiển thị số địa điểm, món, ngôn ngữ, audio, QR, lượt quét/phát, lộ trình, người dùng | `statsService.js:40-63` |
| FR-STATS-02 | Biểu đồ lượt quét 14 ngày, địa điểm/ngôn ngữ phổ biến, thiết bị, món nổi bật | `statsService.js:91-160` |
| FR-STATS-03 | Danh sách khách đang truy cập trong 5 phút gần nhất theo phiên ẩn danh | `statsService.js:65-89`, `admin/Dashboard.jsx` |
| FR-STATS-04 | Ghi nhận sự kiện `scan`, `play`, `view`, `favorite` vào một bảng `activity_logs` | `006_activity.sql`, `statsService.js:6-38` |
| FR-STATS-05 | Trang Settings hiển thị trạng thái API/CSDL và danh sách ngôn ngữ đã cài | `admin/AdminSettings.jsx`, `GET /health` |

### 2.10 Vận hành (FR-OPS)

| ID | Yêu cầu | Bằng chứng |
|---|---|---|
| FR-OPS-01 | Migration SQL chạy tuần tự và ghi nhận vào `schema_migrations` | `server/src/db/migrate.js` |
| FR-OPS-02 | Seed SQL chạy theo thứ tự tên; phần lớn dùng `ON CONFLICT`/`WHERE NOT EXISTS` để chạy lại an toàn; lỗi một file được ghi log và không chặn các file sau | `server/src/db/seed.js` |
| FR-OPS-03 | Health check trả trạng thái service + kết nối CSDL | `healthController.js`, `GET /health` |
| FR-OPS-04 | Tệp upload được phục vụ tĩnh dưới `/uploads` | `server/src/index.js:50-54` |
| FR-OPS-05 | Giới hạn 300 request/phút/IP cho `/api` | `server/src/index.js:41-48` |
| FR-OPS-06 | CORS cho phép localhost, IP LAN riêng và origin cấu hình, kèm credentials | `server/src/index.js:15-35` |

## 3. Quy tắc nghiệp vụ

| ID | Quy tắc | Nơi thực thi |
|---|---|---|
| BR-01 | Ngôn ngữ `vi` luôn mở, không cần phiên hay thanh toán | `middleware/entitlement.js:48-55` |
| BR-02 | Mỗi phiên khách có đúng 2 slot ngôn ngữ miễn phí; chọn trùng ngôn ngữ đã có không chiếm thêm slot | `entitlementService.js:83-112` |
| BR-03 | Khi cả 2 slot đã dùng cho ngôn ngữ khác, chọn ngôn ngữ mới phải qua checkout | `routes/guest.js:126-169`, `LanguageBanner.jsx` |
| BR-04 | Một lần thanh toán thành công mở toàn bộ ngôn ngữ đang hoạt động (không chỉ ngôn ngữ đã chọn) | `entitlementService.js:212-221` |
| BR-05 | Giá checkout do server quy định 20.000 VND; client không thể đặt giá | `entitlementService.js:144,166-176` |
| BR-06 | Mỗi cặp (phiên khách, ngôn ngữ) chỉ có tối đa một checkout `success`; xác nhận lặp là idempotent | `007_checkouts.sql`, `entitlementService.js:189-224` |
| BR-07 | Phiên khách tồn tại 90 ngày; token chỉ lưu hash, cookie lưu display id | `entitlementService.js:12-31`, `routes/guest.js:63-86` |
| BR-08 | JWT có hạn 12 giờ; vai trò nằm trong token và được kiểm tra ở từng route | `authService.js:23-29`, `middleware/auth.js` |
| BR-09 | Chỉ `ADMIN` được quản lý người dùng, ngôn ngữ, xoá địa điểm; `STAFF` được soạn nội dung/lộ trình/media và xem thống kê | `routes/index.js` |
| BR-10 | Địa điểm/món/lộ trình có trạng thái `DRAFT/PUBLISHED/ARCHIVED`; danh sách công khai chỉ trả `PUBLISHED` | `placeService.js`, `catalogService.js` |
| BR-11 | `zone_radius` trong khoảng 25–1000 m (mặc định 100), `zone_exit_buffer` 0–500 m (mặc định 20); API admin clamp giá trị | `002_content.sql`, `placeController.js:16-48` |
| BR-12 | Endpoint audio/bản dịch chuyên biệt yêu cầu phiên khách có ngôn ngữ đó trong 2 slot miễn phí hoặc danh sách đã mua; `/places/:id/guide` và `/dishes/:id` hiện **không** áp dụng kiểm tra này | `middleware/entitlement.js:50-88`, `routes/index.js:39,45` |
| BR-13 | Mỗi bản dịch duy nhất theo (loại thực thể, id, ngôn ngữ); mỗi media audio duy nhất theo bản dịch; mỗi QR duy nhất theo thực thể | `002_content.sql` |
| BR-14 | Upload ảnh tối đa 10 MB (jpg/jpeg/png/webp/gif), audio tối đa 25 MB (mp3/wav/m4a/aac) | `middleware/upload.js` |
| BR-15 | Vị trí điểm dừng là duy nhất trong lộ trình; thêm sẽ đẩy các điểm sau, xoá sẽ dồn vị trí | `003_routes.sql`, `catalogService.js:437-463` |
| BR-16 | Yêu thích là duy nhất theo (session_id, địa điểm); sự kiện yêu thích/xem/quét/phát dùng chung `activity_logs` | `006_activity.sql` |
| BR-17 | Thuyết minh mục tiêu ~30 giây; trường chính luôn đọc đủ, trường phụ chỉ thêm nguyên câu cho tới ngưỡng | `utils/narration.js:14-89` |
| BR-18 | TTS ưu tiên provider cấu hình; nếu lỗi hoặc thiếu giọng thì fallback Google Translate keyless; `none` tắt hoàn toàn | `mediaService.js:389-416` |
| BR-19 | "Đang truy cập" = số phiên khác nhau có hoạt động trong 5 phút gần nhất (admin có thể đổi 1–60 phút) | `statsService.js:65-89`, `mediaController.js:254-259` |
| BR-20 | Đăng nhập sai/không hoạt động không tạo token; tài khoản demo chỉ dành cho phát triển | `authService.js:31-55`, seed `008_users_routes.sql` |

## 4. Yêu cầu phi chức năng (đã xác minh từ cấu hình)

| ID | Yêu cầu | Bằng chứng |
|---|---|---|
| NFR-01 | API chịu tải cơ bản với rate limit 300 req/phút/IP | `server/src/index.js:41-48` |
| NFR-02 | Bảo mật header qua Helmet; cookie guest httpOnly, sameSite lax; mật khẩu bcrypt | `server/src/index.js:14`, `routes/guest.js:68-72` |
| NFR-03 | Payload JSON tối đa 2 MB; upload ảnh/audio giới hạn riêng | `server/src/index.js:36`, `middleware/upload.js` |
| NFR-04 | Hỗ trợ 5 ngôn ngữ giao diện và nội dung: vi, en, zh, ko, ja | `seeds/001_languages.sql`, `uiStrings.js` |
| NFR-05 | API trả JSON thống nhất `{success, data, meta?}` hoặc `{success:false, code, message}` | `utils/errors.js` |
| NFR-06 | Triển khai được bằng Docker Compose với 3 dịch vụ: postgres, server, admin-web | `docker-compose.yml` |
| NFR-07 | Tệp audio/QR/ảnh bền vững qua volume `server/uploads` | `docker-compose.yml:36-41` |
| NFR-08 | Server tự migrate + seed khi khởi động trong container | `server/Dockerfile:20` |

## 5. Khác biệt giữa chú thích và hành vi thực tế

Các điểm dưới đây **quan trọng khi bảo trì**; tài liệu ghi theo hành vi code, không theo
chú thích:

1. **Paywall không bypass cho admin trên route công khai.** Chú thích trong
   `middleware/entitlement.js:41-43` nói admin/staff được bỏ qua, nhưng middleware
   `requireLanguageUnlock` không kiểm tra `req.user`, và các route audio/bản dịch công
   khai không gắn `authenticate`. Admin dùng endpoint riêng
   `GET /translations/:translationId/audio`.
2. **Hai cơ chế mở khoá cùng tồn tại.** `POST /guest-sessions/languages/:languageId/purchase`
   chỉ thêm một ngôn ngữ vào `purchased_languages`; còn
   `POST /guest-sessions/checkouts/:id/confirm` và xác nhận VNPay thay
   `purchased_languages` bằng toàn bộ ngôn ngữ đang hoạt động (BR-04). Giao diện web dùng
   luồng checkout/VNPay.
3. **Quyền vai trò là hằng số.** `PUT /roles/:id/permissions` trả
   `{updated:false, static_permissions:true}`; không có bảng quyền trong CSDL
   (đã bị migration `999_drop_legacy.sql` xoá).
4. **`placeService.create` có lỗi tiềm ẩn.** Nếu `zone_radius <= 50`, hàm gọi `alert(...)`
   — không tồn tại trong Node — và trả `undefined`; API admin mặc định/clamp là 25–1000
   nhưng giá trị 25–50 vẫn lọt vào nhánh này. Cần sửa trước khi dùng thực tế.
5. **Trang Settings chỉ đọc.** Không có bảng `system_settings`; trang hiển thị health,
   danh sách ngôn ngữ và ghi chú triển khai, không lưu cấu hình.
6. **Tên file gây nhầm lẫn.** `AdminRoutes.jsx` là trang quản lý lộ trình, không phải
   khai báo route. Router nằm ở `apps/web/src/App.jsx`.
7. **Paywall bị vòng qua ở luồng chính.** `GET /places/:id/guide` trả **tất cả** bản dịch
   (kèm `audio.file_url`) mà không gắn `requireLanguageUnlock`; `GET /dishes/:id` cũng trả
   bản dịch theo `lang` mà không kiểm tra quyền. Web `PlaceGuide`/`DishDetail` và mobile
   `PlaceDetailScreen` dùng chính các endpoint này, nên khách có thể đọc/nghe ngôn ngữ
   chưa mở khoá (ví dụ đổi `lang` trong localStorage). Paywall hiện chỉ chặn các endpoint
   chuyên biệt. Đây là lỗ hổng nghiệp vụ/bảo mật cần sửa trước khi tính phí thật.

## 6. Giả định và câu hỏi mở

| # | Nội dung | Cách xác nhận |
|---|---|---|
| A1 | VNPay chỉ là sandbox: mọi xác nhận đều miễn phí và mở toàn bộ ngôn ngữ | Cần xác nhận yêu cầu thanh toán thật nếu triển khai production |
| A2 | Nội dung 5 ngôn ngữ do seed cung cấp; chất lượng bản dịch không được kiểm chứng trong code | Kiểm tra `database/seeds/003-013` và CMS |
| A3 | Google Translate TTS keyless phụ thuộc dịch vụ ngoài, có thể bị chặn/giới hạn | Kiểm tra log server khi gọi TTS |
| A4 | Ứng dụng mobile không có build production (EAS) trong repo | Cần cấu hình EAS nếu phát hành store |
| A5 | Không có TLS/reverse proxy trong compose; nginx chỉ phục vụ HTTP | Bổ sung reverse proxy + TLS trước khi public |
| A6 | Đa ngôn ngữ giao diện mobile chỉ có nhãn i18n cơ bản, không đầy đủ như web | Đối chiếu `apps/mobile/src/utils/i18n.js` |
