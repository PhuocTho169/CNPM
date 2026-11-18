# Đặc tả Use Case — District 4 Culinary Guide

> Nguồn: route/middleware/controller/service trong `server/src`, component trong
> `apps/web/src` và `apps/mobile/src`, schema trong `database/migrations`.
> Phạm vi hệ thống: website công khai, ứng dụng di động và CMS quản trị.
> Quy tắc nghiệp vụ tham chiếu `BR-xx` trong
> [../requirements/functional-requirements.md](../requirements/functional-requirements.md).

## Tổng quan tác nhân

| Tác nhân | Loại | Mục tiêu chính | Bằng chứng |
|---|---|---|---|
| Khách | Người | Tìm quán/món, chọn ngôn ngữ, nghe thuyết minh, xem bản đồ/lộ trình | `routes/guest.js`, `middleware/entitlement.js`, web pages, mobile screens |
| Quản trị viên (Admin) | Người | Quản lý toàn bộ nội dung, người dùng, ngôn ngữ, thống kê | `role='ADMIN'`, `requireRole('ADMIN')` |
| Nhân viên (Staff) | Người | Soạn nội dung, media, lộ trình; xem thống kê | `role='STAFF'`, `requireRole('ADMIN','STAFF')` |
| VNPay Sandbox | Hệ thống ngoài | Xác nhận giao dịch mở khoá ngôn ngữ | `routes/guest.js`, `pages/CheckoutResult.jsx` |
| Nhà cung cấp TTS | Hệ thống ngoài | Sinh file thuyết minh MP3 | `services/mediaService.js` |
| OpenStreetMap | Hệ thống ngoài | Bản đồ và chỉ đường | `components/BaseMap.jsx`, `utils/geo.js` |

Quan hệ use case dùng trong biểu đồ:
`UC-01` **include** `UC-02`; `UC-02` **include** `UC-03`, `UC-05`;
`UC-04` **extend** `UC-03` (khi hết slot miễn phí); `UC-05` **include** kiểm tra quyền
ngôn ngữ; `UC-10` **include** `UC-05`; `UC-13`, `UC-14`, `UC-17` **include** `UC-15`.

---

## UC-01: Quét mã QR mở hướng dẫn địa điểm

- **ID:** UC-01
- **Mục tiêu:** Khách mở đúng trang hướng dẫn của địa điểm đang đứng trước.
- **Tác nhân chính:** Khách.
- **Mô tả:** Khách quét QR tại quán bằng camera điện thoại hoặc tab Scan của ứng dụng.
  QR chứa URL website công khai (hoặc id số), dẫn tới `/place/:id`.
- **Tiền điều kiện:**
  1. QR đã được tạo cho địa điểm (`media_files.kind='qr'`).
  2. Thiết bị có camera và trình duyệt/ứng dụng mở được URL.
- **Kích hoạt:** Khách quét mã QR.
- **Luồng chính:**
  1. Khách quét QR.
  2. Ứng dụng/trình duyệt mở URL hướng dẫn.
  3. Hệ thống tải hướng dẫn địa điểm và ghi nhận sự kiện quét.
- **Luồng thay thế:**
  - **A1: QR mã hoá id số** — ứng dụng ghép thành `WEB_BASE/place/{id}` rồi mở.
  - **A2: QR chứa localhost** — ứng dụng viết lại host theo IP LAN cấu hình trước khi mở.
- **Ngoại lệ:**
  - **E1: QR không hợp lệ/không phải URL** — ứng dụng báo lỗi, không mở trình duyệt.
  - **E2: Địa điểm đã `ARCHIVED`** — API trả 410 `PLACE_ARCHIVED`, trang hiển thị lỗi.
- **Hậu điều kiện:** Trang hướng dẫn được mở; sự kiện `scan` được ghi nếu tải thành công.
- **Quy tắc liên quan:** BR-10.
- **Bằng chứng:** `apps/mobile/src/screens/ScanScreen.js`, `server/src/routes/index.js:40`,
  `apps/web/src/pages/PlaceGuide.jsx:35-58`.

## UC-02: Xem hướng dẫn địa điểm đa ngôn ngữ

- **ID:** UC-02
- **Mục tiêu:** Khách đọc/nghe thông tin địa điểm bằng ngôn ngữ đã chọn.
- **Tác nhân chính:** Khách.
- **Mô tả:** Trang `/place/:id` (web) hoặc `PlaceDetail` (mobile) hiển thị tên, mô tả,
  lịch sử, văn hoá, mẹo, ảnh, món ăn, bản đồ và địa điểm lân cận.
- **Tiền điều kiện:** Địa điểm tồn tại và không bị `ARCHIVED`.
- **Kích hoạt:** Mở trang hướng dẫn.
- **Luồng chính:**
  1. Khách mở trang hướng dẫn.
  2. Hệ thống trả chi tiết địa điểm theo `?lang=` kèm danh sách bản dịch và ảnh.
  3. Hệ thống hiển thị bản dịch của ngôn ngữ hiện tại; nếu thiếu, dùng bản dịch thay thế.
  4. Hệ thống hiển thị món, địa điểm lân cận và nút chỉ đường.
- **Luồng thay thế:**
  - **A1: Ngôn ngữ chưa có bản dịch** — hệ thống fallback sang bản dịch giàu nội dung nhất.
  - **A2: Ngôn ngữ chưa mở khoá** — hiển thị banner chọn ngôn ngữ (UC-03).
- **Ngoại lệ:**
  - **E1: Không tìm thấy địa điểm** — API trả 404 `PLACE_NOT_FOUND`.
  - **E2: Lỗi mạng** — trang hiển thị thông báo và nút quay lại Khám phá.
- **Hậu điều kiện:** Lịch sử xem được ghi nhận; nội dung hiển thị theo ngôn ngữ.
- **Quy tắc liên quan:** BR-12.
- **Bằng chứng:** `apps/web/src/pages/PlaceGuide.jsx`, `apps/mobile/src/screens/PlaceDetailScreen.js`,
  `server/src/services/placeService.js:153-301`.

## UC-03: Chọn ngôn ngữ miễn phí

- **ID:** UC-03
- **Mục tiêu:** Khách mở một ngôn ngữ trong 2 slot miễn phí của phiên.
- **Tác nhân chính:** Khách.
- **Mô tả:** Banner ngôn ngữ hiển thị đầu trang hướng dẫn khi khách chưa mở ngôn ngữ nào.
  Khách chọn ngôn ngữ; server cấp slot miễn phí cho phiên ẩn danh.
- **Tiền điều kiện:** Có phiên khách (`guest_sessions`) hoặc tạo được phiên mới.
- **Kích hoạt:** Khách chọn một ngôn ngữ.
- **Luồng chính:**
  1. Hệ thống tạo/khôi phục phiên khách.
  2. Khách chọn ngôn ngữ chưa mở.
  3. Server kiểm tra còn slot miễn phí và cấp ngôn ngữ vào slot 1 hoặc slot 2.
  4. Giao diện chuyển sang ngôn ngữ đó và tải nội dung.
- **Luồng thay thế:**
  - **A1: Ngôn ngữ đã mở** — chuyển ngay, không gọi cấp quyền.
  - **A2: Hết 2 slot miễn phí** — chuyển sang UC-04 (extend).
- **Ngoại lệ:**
  - **E1: Hai slot đã dùng cho ngôn ngữ khác** — API trả 409 `FREE_LANGUAGE_ALREADY_SELECTED`.
  - **E2: Hai request tranh chấp cùng lúc** — API trả 409 `FREE_LANGUAGE_CONFLICT`.
- **Hậu điều kiện:** `guest_sessions.free_language_id` hoặc `free_language_id_2` được cập nhật.
- **Quy tắc liên quan:** BR-01, BR-02, BR-03.
- **Bằng chứng:** `server/src/routes/guest.js:126-169`,
  `server/src/services/entitlementService.js:76-112`,
  `apps/web/src/components/LanguageBanner.jsx`.

## UC-04: Mở khoá toàn bộ ngôn ngữ qua VNPay-QR

- **ID:** UC-04
- **Mục tiêu:** Khách mở mọi ngôn ngữ còn lại sau khi đã dùng hết slot miễn phí.
- **Tác nhân chính:** Khách.
- **Tác nhân phụ:** VNPay Sandbox.
- **Mô tả:** Khách chọn ngôn ngữ bị khoá; web tạo checkout 20.000₫ và hiển thị QR VNPay.
  Quét QR mở trang `/pay/:txid`; việc mở trang gọi API xác nhận và mở toàn bộ ngôn ngữ.
- **Tiền điều kiện:**
  1. Có phiên khách.
  2. Ngôn ngữ chưa mở và cả 2 slot miễn phí đã dùng.
- **Kích hoạt:** Khách chọn ngôn ngữ bị khoá.
- **Luồng chính:**
  1. Web gọi `POST /guest-sessions/checkouts` với `language_id`.
  2. Server tạo checkout `pending`, giá 20.000 VND, sinh QR trỏ tới `/pay/<txid>`.
  3. Khách quét QR (có thể bằng thiết bị khác).
  4. Trang `/pay/:txid` gọi `POST /guest-sessions/vnpay/:txid/confirm`.
  5. Server chuyển checkout sang `success` và gán `purchased_languages` = toàn bộ ngôn ngữ
     đang hoạt động.
  6. Web làm mới quyền lợi, chuyển sang ngôn ngữ vừa mở và hiển thị thành công.
- **Luồng thay thế:**
  - **A1: Checkout `pending` đã tồn tại** — server dùng lại, trả `reused: true`.
  - **A2: Xác nhận lặp** — server trả kết quả cũ với `already_confirmed: true`.
  - **A3: Xác nhận qua endpoint của chủ phiên** — dùng
    `POST /guest-sessions/checkouts/:id/confirm`, cùng logic.
- **Ngoại lệ:**
  - **E1: Ngôn ngữ đã mở** — API trả 409 `ALREADY_UNLOCKED`.
  - **E2: Checkout `failed`** — API trả 409 `CHECKOUT_FAILED`, yêu cầu tạo mới.
  - **E3: Không tìm thấy giao dịch** — API trả 404 `CHECKOUT_NOT_FOUND`.
- **Hậu điều kiện:** Checkout `success` có `paid_at`; phiên khách mở toàn bộ ngôn ngữ;
  biên nhận được lưu trong `checkouts`.
- **Quy tắc liên quan:** BR-03, BR-04, BR-05, BR-06.
- **Bằng chứng:** `server/src/routes/guest.js:229-362`,
  `server/src/services/entitlementService.js:140-248`,
  `apps/web/src/pages/CheckoutResult.jsx`, `apps/web/src/components/LanguageBanner.jsx`.

## UC-05: Nghe thuyết minh địa điểm

- **ID:** UC-05
- **Mục tiêu:** Khách nghe clip thuyết minh địa điểm bằng ngôn ngữ đã mở.
- **Tác nhân chính:** Khách.
- **Tác nhân phụ:** Nhà cung cấp TTS.
- **Mô tả:** Trang hướng dẫn phát file MP3 nếu có; nếu chưa có, server sinh TTS và trả file.
  Trình duyệt có thể fallback giọng đọc của thiết bị khi file chưa sẵn sàng.
- **Tiền điều kiện:** Ngôn ngữ đã mở (UC-03/UC-04) hoặc là `vi`.
- **Kích hoạt:** Khách bấm nút phát, hoặc trang tự phát.
- **Luồng chính:**
  1. Giao diện yêu cầu audio kèm `?language=`.
  2. Middleware kiểm tra quyền ngôn ngữ của phiên.
  3. Server trả bản ghi audio của bản dịch (hoặc sinh TTS nếu thiếu).
  4. Giao diện phát file, hiển thị tiến trình và thời lượng.
- **Luồng thay thế:**
  - **A1: Chưa có file TTS** — server sinh file, gắn vào bản dịch rồi trả URL.
  - **A2: File trên đĩa bị mất** — server xoá bản ghi cũ, lên lịch tạo lại.
  - **A3: Thiết bị không phát được** — web dùng `speechSynthesis` với script narration.
- **Ngoại lệ:**
  - **E1: Ngôn ngữ chưa mở** — API trả 403 `LANGUAGE_LOCKED`.
  - **E2: Không có bản dịch** — API trả 404 `NARRATION_UNAVAILABLE`.
  - **E3: TTS lỗi hoàn toàn** — API trả 502 `TTS_PROVIDER_ERROR`.
- **Hậu điều kiện:** Sự kiện `play` có thể được ghi nhận; file audio được cache trên đĩa.
- **Quy tắc liên quan:** BR-01, BR-12, BR-17, BR-18.
- **Bằng chứng:** `server/src/routes/index.js:53-61`,
  `server/src/controllers/mediaController.js:9-35`,
  `server/src/services/mediaService.js:282-416`,
  `apps/web/src/components/AudioPlayer.jsx`.
- **Lưu ý thực tế:** web `PlaceGuide` và mobile `PlaceDetailScreen` lấy audio trực tiếp từ
  `GET /places/:id/guide` (dữ liệu đã kèm `audio.file_url`) chứ không gọi endpoint audio
  chuyên biệt, nên **không đi qua paywall**. Middleware chỉ chặn khi client gọi
  `/culinary-places/:id/audio` (như GPS guide) hoặc endpoint translation. Xem mục 5
  (điểm 7) của
  [yêu cầu chức năng](../requirements/functional-requirements.md#5-khác-biệt-giữa-chú-thích-và-hành-vi-thực-tế).

## UC-06: Xem và nghe thuyết minh món ăn

- **ID:** UC-06
- **Mục tiêu:** Khách tìm hiểu một món ăn cụ thể và nghe mô tả.
- **Tác nhân chính:** Khách.
- **Tác nhân phụ:** Nhà cung cấp TTS.
- **Mô tả:** Trang `/dish/:id` hiển thị món, nguyên liệu, thông tin văn hoá, audio riêng,
  địa chỉ quán, món khác cùng quán và nút chỉ đường.
- **Tiền điều kiện:** Món tồn tại.
- **Kích hoạt:** Khách mở món từ danh sách/trang địa điểm.
- **Luồng chính:**
  1. Hệ thống tải chi tiết món theo ngôn ngữ.
  2. Hệ thống tải các món khác của cùng địa điểm.
  3. Khách phát audio thuyết minh món.
  4. Hệ thống trả audio (sinh TTS nếu chưa có) sau khi kiểm tra quyền ngôn ngữ.
- **Luồng thay thế:**
  - **A1: Món chưa có bản dịch ngôn ngữ hiện tại** — dùng tên/mô tả tiếng Việt làm fallback.
- **Ngoại lệ:**
  - **E1: Không tìm thấy món** — API trả 404 `DISH_NOT_FOUND`.
  - **E2: Ngôn ngữ chưa mở** — API trả 403 `LANGUAGE_LOCKED`.
- **Hậu điều kiện:** Khách xem/nghe được nội dung món; audio có thể được tạo mới.
- **Quy tắc liên quan:** BR-12, BR-17, BR-18.
- **Bằng chứng:** `apps/web/src/pages/DishDetail.jsx`,
  `server/src/services/catalogService.js:191-276`,
  `apps/web/src/components/DishAudioButton.jsx`.

## UC-07: Khám phá và tìm kiếm địa điểm, món ăn

- **ID:** UC-07
- **Mục tiêu:** Khách tìm được quán/món phù hợp với nhu cầu.
- **Tác nhân chính:** Khách.
- **Mô tả:** Trang Khám phá (web) và tab Explore (mobile) hỗ trợ từ khoá, danh mục,
  khoảng giá, trạng thái đang mở, đề xuất và tìm quán gần vị trí.
- **Tiền điều kiện:** Có dữ liệu địa điểm/món đã publish.
- **Kích hoạt:** Khách nhập từ khoá/bộ lọc hoặc bấm "Nearby".
- **Luồng chính:**
  1. Khách nhập điều kiện tìm kiếm.
  2. Web đưa điều kiện vào query string; mobile gọi API trực tiếp.
  3. Server lọc theo trạng thái, danh mục, giá, giờ mở, đề xuất và từ khoá (tên/mô tả/
     nguyên liệu, mọi ngôn ngữ).
  4. Hệ thống trả danh sách địa điểm và món kèm phân trang.
- **Luồng thay thế:**
  - **A1: Tìm theo vị trí** — mobile xin quyền GPS, gọi `/places/nearby`, sắp theo khoảng cách.
- **Ngoại lệ:**
  - **E1: Không có kết quả** — hiển thị trạng thái rỗng.
  - **E2: API lỗi** — hiển thị thông báo, giữ dữ liệu cũ nếu có.
- **Hậu điều kiện:** Danh sách kết quả hiển thị; không thay đổi dữ liệu.
- **Quy tắc liên quan:** BR-10.
- **Bằng chứng:** `apps/web/src/pages/Explore.jsx`,
  `apps/mobile/src/screens/ExploreScreen.js`, `server/src/services/placeService.js:86-145`,
  `server/src/services/catalogService.js:118-189`.

## UC-08: Xem bản đồ và chỉ đường

- **ID:** UC-08
- **Mục tiêu:** Khách xác định vị trí quán và mở chỉ đường.
- **Tác nhân chính:** Khách.
- **Tác nhân phụ:** OpenStreetMap.
- **Mô tả:** Web nhúng bản đồ Leaflet/OSM với marker các địa điểm; nút chỉ đường ưu tiên
  vị trí hiện tại, nếu bị từ chối thì mở bản đồ điểm đến.
- **Tiền điều kiện:** Địa điểm có toạ độ.
- **Kích hoạt:** Mở `/map` hoặc bấm "Chỉ đường".
- **Luồng chính:**
  1. Hệ thống tải địa điểm đã publish có toạ độ.
  2. Hiển thị marker và thẻ địa điểm.
  3. Khách bấm chỉ đường.
  4. Trình duyệt xin quyền vị trí và mở URL chỉ đường OSM.
- **Luồng thay thế:**
  - **A1: Từ chối quyền vị trí** — mở bản đồ OSM của điểm đến.
  - **A2: Địa điểm thiếu toạ độ** — không hiển thị marker/chỉ đường.
- **Ngoại lệ:**
  - **E1: Dịch vụ bản đồ ngoài không tải được** — trang vẫn hiển thị danh sách địa điểm.
- **Hậu điều kiện:** Chỉ đường mở ở tab mới; không thay đổi dữ liệu.
- **Quy tắc liên quan:** BR-10.
- **Bằng chứng:** `apps/web/src/pages/MapPage.jsx`, `components/BaseMap.jsx`, `utils/geo.js`.

## UC-09: Xem lộ trình ẩm thực

- **ID:** UC-09
- **Mục tiêu:** Khách chọn một tour ẩm thực và xem các điểm dừng theo thứ tự.
- **Tác nhân chính:** Khách.
- **Mô tả:** Trang `/routes` liệt kê các lộ trình đã publish kèm tên, mô tả, thời lượng,
  khoảng cách, độ khó và danh sách điểm dừng.
- **Tiền điều kiện:** Có lộ trình `PUBLISHED`.
- **Kích hoạt:** Khách mở trang Lộ trình.
- **Luồng chính:**
  1. Hệ thống tải lộ trình theo ngôn ngữ.
  2. Với mỗi lộ trình, hệ thống tải điểm dừng kèm tên địa điểm và ảnh chính.
  3. Khách mở lộ trình, xem thứ tự điểm dừng và mở từng địa điểm.
- **Luồng thay thế:**
  - **A1: Bản dịch lộ trình thiếu** — hiển thị tên rỗng/code thay thế.
- **Ngoại lệ:**
  - **E1: Lộ trình không tồn tại** — API trả 404 `ROUTE_NOT_FOUND`.
- **Hậu điều kiện:** Không thay đổi dữ liệu.
- **Quy tắc liên quan:** BR-10, BR-15.
- **Bằng chứng:** `apps/web/src/pages/FoodRoutes.jsx`,
  `server/src/services/catalogService.js:328-369`.

## UC-10: Nhận thuyết minh tự động theo vùng GPS

- **ID:** UC-10
- **Mục tiêu:** Khách nghe thuyết minh tự động khi bước vào vùng của quán.
- **Tác nhân chính:** Khách.
- **Tác nhân phụ:** Nhà cung cấp TTS.
- **Mô tả:** Tab GPS Guide theo dõi vị trí, tải danh sách vùng lân cận (cache), tính khoảng
  cách Haversine trên thiết bị và phát thuyết minh khi vượt từ ngoài vào trong vùng.
- **Tiền điều kiện:**
  1. Khách cấp quyền vị trí.
  2. Có ít nhất một địa điểm published có toạ độ trong bán kính tải.
- **Kích hoạt:** Vị trí cập nhật cho thấy khách vào vùng.
- **Luồng chính:**
  1. Ứng dụng lấy vị trí và tải vùng lân cận khi cần.
  2. Thiết bị tính khoảng cách tới từng địa điểm.
  3. Khi `distance <= zone_radius`, đánh dấu đã vào vùng và phát thuyết minh.
  4. Ứng dụng chỉ rời vùng khi `distance > zone_radius + zone_exit_buffer`.
  5. Clip phát xong; nếu có vùng mới chờ, phát tiếp clip mới nhất.
- **Luồng thay thế:**
  - **A1: Đang phát clip khác** — xếp hàng vùng mới, phát khi clip hiện tại kết thúc.
  - **A2: Fix GPS kém chính xác** — bỏ qua fix nếu sai số vượt ngưỡng cấu hình.
  - **A3: Khách tắt auto-play** — hiển thị thông báo vùng, không tự phát.
- **Ngoại lệ:**
  - **E1: Từ chối quyền vị trí** — hiển thị hướng dẫn cấp quyền, QR vẫn là cách chính.
  - **E2: Không có bản dịch/audio** — hiển thị lỗi, không phát.
- **Hậu điều kiện:** Trạng thái trong/ngoài vùng được cập nhật; audio phát theo hàng đợi.
- **Quy tắc liên quan:** BR-11, BR-12, BR-17, BR-18.
- **Bằng chứng:** `apps/mobile/src/screens/GPSAudioGuideScreen.js`,
  `hooks/useZoneDetection.js`, `services/zoneDetectionService.js`, `services/audioGuideService.js`,
  `server/src/services/geoAudioService.js`.

## UC-11: Lưu yêu thích và lịch sử

- **ID:** UC-11
- **Mục tiêu:** Khách lưu lại quán yêu thích và xem lại quán đã ghé.
- **Tác nhân chính:** Khách.
- **Mô tả:** Mobile lưu yêu thích/lịch sử cục bộ và đồng bộ qua API theo `session_id`
  ẩn danh; web ghi lịch sử xem khi mở hướng dẫn.
- **Tiền điều kiện:** Có `session_id` ẩn danh trên thiết bị.
- **Kích hoạt:** Khách bấm yêu thích hoặc mở địa điểm.
- **Luồng chính:**
  1. Thiết bị lưu/bỏ yêu thích hoặc ghi lịch sử.
  2. API ghi sự kiện `favorite`/`view` vào `activity_logs`.
  3. Tab Favorites hiển thị danh sách đã lưu.
- **Luồng thay thế:**
  - **A1: Yêu thích trùng** — API bỏ qua nhờ partial unique index.
  - **A2: Không có mạng** — mobile giữ dữ liệu cục bộ.
- **Ngoại lệ:**
  - **E1: Thiếu `session_id`** — API trả 400 `VALIDATION_ERROR`.
- **Hậu điều kiện:** Sự kiện được lưu; danh sách yêu thích/lịch sử cập nhật.
- **Quy tắc liên quan:** BR-16.
- **Bằng chứng:** `server/src/controllers/mediaController.js:280-368`,
  `apps/mobile/src/services/favorites.js`, `apps/mobile/src/screens/FavoritesScreen.js`,
  `apps/web/src/pages/PlaceGuide.jsx:44-51`.

## UC-12: Đăng nhập quản trị

- **ID:** UC-12
- **Mục tiêu:** Admin/Staff vào được CMS với đúng vai trò.
- **Tác nhân chính:** Quản trị viên, Nhân viên.
- **Mô tả:** Trang `/admin/login` gửi email/mật khẩu, lưu JWT và chuyển vào `/admin`.
- **Tiền điều kiện:** Tài khoản tồn tại, đang hoạt động.
- **Kích hoạt:** Mở `/admin` khi chưa đăng nhập, hoặc vào thẳng `/admin/login`.
- **Luồng chính:**
  1. Người dùng nhập email/mật khẩu.
  2. Server kiểm tra bcrypt, trạng thái tài khoản, cập nhật `last_login_at`.
  3. Server trả JWT 12 giờ kèm thông tin người dùng.
  4. Web lưu token, tải `/auth/me` và mở dashboard.
- **Luồng thay thế:**
  - **A1: Token còn hạn** — `AdminLayout` gọi `/auth/me` và vào thẳng.
- **Ngoại lệ:**
  - **E1: Sai thông tin** — 401 `INVALID_CREDENTIALS`.
  - **E2: Tài khoản bị vô hiệu hoá** — 401 `ACCOUNT_DISABLED`.
  - **E3: Token hết hạn** — 401 `TOKEN_INVALID`, chuyển về trang đăng nhập.
- **Hậu điều kiện:** Token lưu `localStorage('d4_token')`; phiên admin hoạt động.
- **Quy tắc liên quan:** BR-08, BR-20.
- **Bằng chứng:** `apps/web/src/admin/AdminLogin.jsx`, `admin/AdminLayout.jsx`,
  `server/src/controllers/authController.js`, `services/authService.js`.

## UC-13: Quản lý địa điểm ẩm thực

- **ID:** UC-13
- **Mục tiêu:** Admin/Staff duy trì danh sách địa điểm chính xác và đã publish.
- **Tác nhân chính:** Quản trị viên, Nhân viên.
- **Mô tả:** Màn `/admin/places` và `/admin/places/:id` cho phép tạo/sửa/xoá, đổi trạng thái,
  quản lý bản dịch, ảnh, QR và audio của địa điểm.
- **Tiền điều kiện:** Đã đăng nhập với vai trò phù hợp.
- **Kích hoạt:** Người dùng mở mục Địa điểm.
- **Luồng chính:**
  1. Hệ thống liệt kê địa điểm kèm trạng thái, ảnh chính, số món, ngôn ngữ.
  2. Người dùng tạo/sửa thông tin và lưu.
  3. Server kiểm tra/chuẩn hoá dữ liệu (kể cả bán kính vùng GPS).
  4. Nếu địa điểm `PUBLISHED`, server tự tạo QR.
- **Luồng thay thế:**
  - **A1: Đổi trạng thái nhanh** — dùng `PATCH /places/:id/status`.
  - **A2: Xoá địa điểm** — chỉ Admin; xoá kéo theo món, điểm dừng, sự kiện.
- **Ngoại lệ:**
  - **E1: Thiếu `code`** — 400 `VALIDATION_ERROR`.
  - **E2: Trùng mã địa điểm** — 409 `DUPLICATE`.
  - **E3: Không có quyền xoá** — 403 `FORBIDDEN`.
- **Hậu điều kiện:** Dữ liệu địa điểm và media liên quan được cập nhật.
- **Quy tắc liên quan:** BR-09, BR-10, BR-11, BR-14.
- **Bằng chứng:** `apps/web/src/admin/AdminPlaces.jsx`, `admin/PlaceEditor.jsx`,
  `server/src/controllers/placeController.js`, `services/placeService.js`.

## UC-14: Quản lý món ăn

- **ID:** UC-14
- **Mục tiêu:** Admin/Staff cập nhật món ăn và ảnh/audio/QR của món.
- **Tác nhân chính:** Quản trị viên, Nhân viên.
- **Mô tả:** Màn `/admin/dishes` quản lý món theo địa điểm, cờ món đặc trưng, giá, ảnh,
  bản dịch, audio và QR.
- **Tiền điều kiện:** Có địa điểm để gắn món.
- **Kích hoạt:** Người dùng mở mục Món ăn.
- **Luồng chính:**
  1. Hệ thống liệt kê món kèm địa điểm, danh mục, giá, ngôn ngữ, trạng thái QR.
  2. Người dùng tạo/sửa món và bản dịch.
  3. Server lưu món; nếu món `PUBLISHED`, tự tạo QR.
- **Luồng thay thế:**
  - **A1: Upload ảnh món** — dùng `POST /dishes/:id/image` với field `image`.
  - **A2: Xoá món** — xoá kéo theo bản dịch/media theo FK.
- **Ngoại lệ:**
  - **E1: Món không tồn tại** — 404 `DISH_NOT_FOUND`.
  - **E2: Thiếu `language_id`/`name` khi lưu bản dịch** — 400 `VALIDATION_ERROR`.
- **Hậu điều kiện:** Món và nội dung liên quan được cập nhật.
- **Quy tắc liên quan:** BR-09, BR-13, BR-14.
- **Bằng chứng:** `apps/web/src/admin/AdminDishes.jsx`, `admin/DishQrEditor.jsx`,
  `server/src/controllers/catalogController.js`, `services/catalogService.js:118-326`.

## UC-15: Quản lý bản dịch, media, QR và TTS

- **ID:** UC-15
- **Mục tiêu:** Admin/Staff bổ sung bản dịch, ảnh, audio và mã QR cho nội dung.
- **Tác nhân chính:** Quản trị viên, Nhân viên.
- **Tác nhân phụ:** Nhà cung cấp TTS.
- **Mô tả:** Trình soạn địa điểm/món cho phép thêm bản dịch, upload ảnh/audio, tạo TTS,
  và tạo/làm lại QR.
- **Tiền điều kiện:** Thực thể đích tồn tại; đã đăng nhập.
- **Kích hoạt:** Người dùng thêm/sửa bản dịch hoặc media.
- **Luồng chính:**
  1. Người dùng lưu bản dịch cho một ngôn ngữ.
  2. Hệ thống upsert `translations` theo (loại, id, ngôn ngữ).
  3. Người dùng upload audio/ảnh hoặc yêu cầu TTS từ nội dung bản dịch.
  4. Server lưu file vào `uploads` và bản ghi `media_files`.
  5. Người dùng tạo QR; server sinh PNG và lưu metadata `qr_value`.
- **Luồng thay thế:**
  - **A1: Audio do TTS sinh** — `POST /tts` với `text`, `language_code`, tuỳ chọn `translation_id`.
  - **A2: Liên kết audio ngoài** — `POST /translations/:id/audio/url` với `file_url`.
  - **A3: Làm lại QR** — dùng endpoint `.../qr/regenerate`.
- **Ngoại lệ:**
  - **E1: Sai loại/kích thước file** — 400 `INVALID_FILE_TYPE` hoặc `UPLOAD_ERROR`.
  - **E2: TTS chưa cấu hình/không có giọng** — 501 `TTS_NOT_CONFIGURED`.
  - **E3: Provider TTS lỗi** — 502 `TTS_PROVIDER_ERROR`.
- **Hậu điều kiện:** Bản dịch/media/QR được lưu; file tồn tại trong `server/uploads`.
- **Quy tắc liên quan:** BR-13, BR-14, BR-18.
- **Bằng chứng:** `server/src/controllers/mediaController.js:79-213`,
  `server/src/services/mediaService.js`, `apps/web/src/admin/PlaceEditor.jsx`.

## UC-16: Quản lý danh mục và ngôn ngữ

- **ID:** UC-16
- **Mục tiêu:** Admin/Staff duy trì danh mục; Admin duy trì ngôn ngữ của hệ thống.
- **Tác nhân chính:** Quản trị viên, Nhân viên.
- **Mô tả:** Màn `/admin/categories` và `/admin/languages` quản lý danh mục và ngôn ngữ.
  Ngôn ngữ mới có hiệu lực ngay cho giao diện và TTS.
- **Tiền điều kiện:** Đã đăng nhập; xoá ngôn ngữ yêu cầu vai trò Admin.
- **Kích hoạt:** Người dùng mở mục Danh mục/Ngôn ngữ.
- **Luồng chính:**
  1. Hệ thống liệt kê danh mục/ngôn ngữ hiện có.
  2. Người dùng tạo/sửa (danh mục: mã, tên, phạm vi, icon; ngôn ngữ: mã, tên, tên bản địa,
     BCP-47, ghi chú giọng, trạng thái).
  3. Server lưu; với ngôn ngữ, xoá cache language của TTS.
- **Luồng thay thế:**
  - **A1: Vô hiệu hoá ngôn ngữ** — đặt `is_active=false` thay vì xoá.
- **Ngoại lệ:**
  - **E1: Ngôn ngữ còn bản dịch** — 409 `LANGUAGE_IN_USE`.
  - **E2: Danh mục không tồn tại** — 404 `CATEGORY_NOT_FOUND`.
  - **E3: Staff cố xoá ngôn ngữ** — 403 `FORBIDDEN`.
- **Hậu điều kiện:** Danh mục/ngôn ngữ được cập nhật; danh sách công khai thay đổi theo.
- **Quy tắc liên quan:** BR-09, BR-13.
- **Bằng chứng:** `apps/web/src/admin/AdminCategories.jsx`, `admin/AdminLanguages.jsx`,
  `server/src/services/catalogService.js:6-116`.

## UC-17: Quản lý lộ trình ẩm thực

- **ID:** UC-17
- **Mục tiêu:** Admin/Staff tạo tour ẩm thực và sắp xếp điểm dừng.
- **Tác nhân chính:** Quản trị viên, Nhân viên.
- **Mô tả:** Màn `/admin/routes` (`AdminRoutes.jsx`) quản lý lộ trình và các điểm dừng.
- **Tiền điều kiện:** Có địa điểm để đưa vào lộ trình.
- **Kích hoạt:** Người dùng mở mục Culinary Routes.
- **Luồng chính:**
  1. Hệ thống liệt kê lộ trình kèm điểm dừng hiện có.
  2. Người dùng tạo/sửa lộ trình (mã, tên, mô tả, thời lượng, khoảng cách, độ khó, trạng thái).
  3. Người dùng thêm địa điểm làm điểm dừng.
  4. Server chèn điểm dừng ở vị trí cuối và đẩy các vị trí sau nếu cần.
- **Luồng thay thế:**
  - **A1: Đổi thứ tự điểm dừng** — cập nhật `position` của hai điểm liền kề.
  - **A2: Xoá điểm dừng** — server dồn các vị trí phía sau.
- **Ngoại lệ:**
  - **E1: Trùng vị trí trong cùng lộ trình** — ràng buộc `UNIQUE(route_id, position)`.
  - **E2: Lộ trình không tồn tại** — 404 `ROUTE_NOT_FOUND`.
- **Hậu điều kiện:** Lộ trình và thứ tự điểm dừng được lưu.
- **Quy tắc liên quan:** BR-09, BR-15.
- **Bằng chứng:** `apps/web/src/admin/AdminRoutes.jsx`,
  `server/src/services/catalogService.js:371-463`, `003_routes.sql`.

## UC-18: Quản lý người dùng và phân quyền

- **ID:** UC-18
- **Mục tiêu:** Admin quản lý tài khoản và vai trò của nhân sự.
- **Tác nhân chính:** Quản trị viên.
- **Mô tả:** Màn `/admin/users` liệt kê, tạo, sửa vai trò/trạng thái, đặt lại mật khẩu, xoá
  tài khoản; xem danh sách vai trò/quyền.
- **Tiền điều kiện:** Đăng nhập với vai trò `ADMIN`.
- **Kích hoạt:** Admin mở mục Người dùng & Vai trò.
- **Luồng chính:**
  1. Hệ thống liệt kê người dùng và vai trò.
  2. Admin tạo/sửa tài khoản hoặc đặt lại mật khẩu.
  3. Server băm mật khẩu bằng bcrypt và lưu vai trò hợp lệ.
- **Luồng thay thế:**
  - **A1: Xem quyền** — `GET /permissions` trả hằng số quyền của từng vai trò.
  - **A2: Cập nhật quyền vai trò** — endpoint tồn tại nhưng không lưu gì (xem ghi chú).
- **Ngoại lệ:**
  - **E1: Xoá chính mình** — 400 `CANNOT_DELETE_SELF`.
  - **E2: Vai trò không hợp lệ** — 400 `ROLE_NOT_FOUND`.
  - **E3: Email trùng** — 409 `DUPLICATE`.
- **Hậu điều kiện:** Tài khoản/vai trò được cập nhật; quyền là hằng số trong code.
- **Quy tắc liên quan:** BR-08, BR-09, BR-20.
- **Bằng chứng:** `apps/web/src/admin/AdminUsers.jsx`, `routes/index.js:22-30`,
  `services/authService.js`.

## UC-19: Xem thống kê và trạng thái hệ thống

- **ID:** UC-19
- **Mục tiêu:** Admin/Staff nắm tình hình sử dụng và sức khoẻ hệ thống.
- **Tác nhân chính:** Quản trị viên, Nhân viên.
- **Mô tả:** Dashboard hiển thị số liệu tổng hợp, biểu đồ và khách đang online; trang Settings
  hiển thị health API, CSDL và ngôn ngữ đã cài.
- **Tiền điều kiện:** Đã đăng nhập.
- **Kích hoạt:** Mở `/admin` hoặc `/admin/settings`.
- **Luồng chính:**
  1. Dashboard gọi `GET /dashboard/statistics`, tự làm mới mỗi 30 giây.
  2. Server tổng hợp từ `activity_logs` và các bảng nội dung.
  3. Settings gọi `/health` và `/languages`.
- **Luồng thay thế:**
  - **A1: Xem khách online theo cửa sổ khác** — `GET /dashboard/online-users?minutes=`.
  - **A2: Thống kê quét/audio riêng** — `/statistics/scans`, `/statistics/audio`.
- **Ngoại lệ:**
  - **E1: API lỗi** — dashboard hiển thị banner lỗi, giữ số liệu cũ nếu có.
  - **E2: CSDL mất kết nối** — `/health` trả 503 và `database: "disconnected"`.
- **Hậu điều kiện:** Không thay đổi dữ liệu; chỉ đọc.
- **Quy tắc liên quan:** BR-19.
- **Bằng chứng:** `apps/web/src/admin/Dashboard.jsx`, `admin/AdminSettings.jsx`,
  `server/src/controllers/mediaController.js:215-278`, `services/statsService.js`.

## Ghi chú nhất quán

- Tên tác nhân trong tài liệu này khớp với biểu đồ
  [use-case-diagram.puml](use-case-diagram.puml) (khách, UC-01..UC-11) và
  [use-case-diagram-admin.puml](use-case-diagram-admin.puml) (quản trị, UC-12..UC-19),
  cùng bảng tác nhân trong
  [functional-requirements.md](../requirements/functional-requirements.md).
- `UC-04` là quan hệ **extend** của `UC-03` vì chỉ xảy ra khi hết slot miễn phí.
- Các use case quản trị dùng chung hành vi "đăng nhập" (`UC-12`) như điều kiện tiên quyết,
  không vẽ `include` để tránh biểu đồ rối.
