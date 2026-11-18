# Biểu đồ tuần tự — District 4 Culinary Guide

> Nguồn: `routes/guest.js`, `middleware/entitlement.js`, `services/entitlementService.js`,
> `services/placeService.js`, `services/mediaService.js`, `services/geoAudioService.js`,
> `apps/web/src/**`, `apps/mobile/src/**`.
> Biểu đồ phản ánh luồng thực tế trong code; các điểm sai lệch được ghi chú ngay dưới.

## 1. Quét QR mở hướng dẫn địa điểm (UC-01 → UC-02)

```mermaid
sequenceDiagram
    actor Khach as Khách
    participant Cam as Camera / Expo Scan
    participant Web as Web SPA
    participant Nginx as nginx
    participant API as Express API
    participant DB as PostgreSQL

    Khach->>Cam: Quét mã QR tại quán
    Cam->>Web: Mở /place/:id (QR chứa URL)
    Web->>Nginx: GET /api/places/:id/guide?lang=vi
    Nginx->>API: proxy_pass /api
    API->>DB: Địa điểm + bản dịch + món + ảnh + lân cận
    DB-->>API: rows
    alt status = ARCHIVED
        API-->>Web: 410 PLACE_ARCHIVED
        Web-->>Khach: Thông báo địa điểm ngừng hoạt động
    else Còn hoạt động
        API-->>Web: 200 { data: detail }
        Web->>Nginx: POST /api/places/:id/scan
        Nginx->>API: proxy_pass
        API->>DB: INSERT activity_logs (scan)
        API-->>Web: { logged: true }
        Web-->>Khach: Hiển thị hướng dẫn, ảnh, món, bản đồ
    end
```

Ghi chú: ứng dụng mobile viết lại host `localhost` trong QR thành IP LAN trước khi mở
(`ScanScreen.js`) để điện thoại mở được website trên máy tính.

## 2. Paywall ngôn ngữ và thanh toán VNPay-QR (UC-03 → UC-04)

```mermaid
sequenceDiagram
    actor Khach as Khách
    participant Web as LanguageBanner (web)
    participant API as Express API
    participant DB as PostgreSQL
    participant Pay as Trang /pay/:txid
    participant Scan as Thiết bị quét QR

    Khach->>Web: Chọn ngôn ngữ bị khoá
    Web->>API: POST /guest-sessions/checkouts {language_id}
    API->>DB: INSERT checkouts (pending, 20000 VND)
    API-->>Web: 201 { checkout, vnpay.url, vnpay.qr_svg }
    Web-->>Khach: Hiển thị QR thanh toán

    Khach->>Scan: Quét QR VNPay
    Scan->>Pay: Mở /pay/:provider_transaction_id
    Pay->>API: POST /guest-sessions/vnpay/:txid/confirm
    API->>DB: UPDATE checkout → success, paid_at
    API->>DB: UPDATE guest_sessions.purchased_languages = mọi ngôn ngữ active
    API-->>Pay: { checkout, guest, already_confirmed }
    Pay-->>Khach: "Đã mở khoá toàn bộ ngôn ngữ"

    loop Web làm mới quyền lợi
        Web->>API: GET /guest-sessions/me
        API->>DB: Đọc phiên + quyền lợi
        API-->>Web: free_languages + purchased_languages
    end
    Web->>API: GET /guest-sessions/languages
    API-->>Web: Danh sách ngôn ngữ + unlocked
    Web-->>Khach: Chuyển sang ngôn ngữ vừa mở
```

Ghi chú:

- Đây là **sandbox**: không có lời gọi ra VNPay; mở trang `/pay/:txid` chính là xác nhận.
- Thiết bị quét không cần phiên khách; endpoint `vnpay/.../confirm` là công khai.
- Xác nhận lặp idempotent nhờ `already_confirmed` và partial unique
  `uq_checkouts_success_pair`.
- Luồng thay thế khi xác nhận trên chính thiết bị:
  `POST /guest-sessions/checkouts/:id/confirm` dùng cùng logic.

## 3. Thuyết minh tự động theo vùng GPS (UC-10)

```mermaid
sequenceDiagram
    actor Khach as Khách
    participant UI as GPSAudioGuideScreen
    participant Loc as useLocation
    participant Zone as useZoneDetection / zoneDetectionService
    participant API as Express API
    participant DB as PostgreSQL
    participant Audio as useAudioGuide / expo-av

    Khach->>Loc: Cấp quyền vị trí
    loop Mỗi lần vị trí cập nhật
        Loc-->>Zone: { latitude, longitude, accuracy }
        alt Cache vùng đã cũ
            Zone->>API: GET /culinary-places/nearby?latitude&longitude&radius&lang
            API->>DB: Địa điểm PUBLISHED có toạ độ
            API-->>Zone: { places: [zone_radius, zone_exit_buffer, ...] }
        end
        Zone->>Zone: Haversine trên thiết bị + kiểm tra vào/ra vùng
        alt Vào vùng mới
            Zone-->>Audio: place + ngôn ngữ
            Audio->>API: GET /culinary-places/:id/audio?language=xx
            alt Ngôn ngữ chưa mở
                API-->>Audio: 403 LANGUAGE_LOCKED
                Audio-->>UI: Yêu cầu mở khoá ngôn ngữ
            else Đã mở
                API->>DB: Đọc/tạo audio cho bản dịch
                API-->>Audio: { url, duration, language_code }
                Audio->>Khach: Phát thuyết minh
            end
        end
    end
```

Ghi chú:

- Ngưỡng vào là `distance <= zone_radius`; chỉ rời khi
  `distance > zone_radius + zone_exit_buffer` (hysteresis chống rung GPS).
- Nếu đang phát clip khác, clip mới được xếp hàng và phát khi clip hiện tại kết thúc
  (`useAudioGuide.js:139-150`).
- Audio có thể được sinh TTS ở lần gọi đầu; các lần sau trả file đã lưu.

## 4. Đăng nhập quản trị (UC-12)

```mermaid
sequenceDiagram
    actor Admin as Admin / Staff
    participant UI as AdminLogin
    participant Ctx as AdminLayout
    participant API as Express API
    participant DB as PostgreSQL

    Admin->>UI: Nhập email + mật khẩu
    UI->>API: POST /auth/login
    API->>DB: SELECT user theo email
    DB-->>API: user + password_hash
    alt Sai mật khẩu
        API-->>UI: 401 INVALID_CREDENTIALS
        UI-->>Admin: Thông báo lỗi
    else Tài khoản bị khoá
        API-->>UI: 401 ACCOUNT_DISABLED
    else Hợp lệ
        API->>DB: UPDATE last_login_at
        API-->>UI: { token (12h), user }
        UI->>UI: localStorage['d4_token'] = token
        UI->>Ctx: Điều hướng /admin
        Ctx->>API: GET /auth/me (Bearer)
        API-->>Ctx: { id, email, full_name, role }
        Ctx-->>Admin: Dashboard + menu theo vai trò
    end
```

Ghi chú:

- Token hết hạn sau 12 giờ; không có refresh token hay thu hồi phía server.
- `AdminLayout` gọi `/auth/me` mỗi lần vào CMS để xác thực token còn hiệu lực.
- Menu Người dùng & Vai trò chỉ hiển thị với `role = 'ADMIN'`.
