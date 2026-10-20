"""Chapter 3 figures: architecture, ERD, sequence diagrams, wireframes."""

from figlib import (Canvas, NAVY, NAVY_D, BLUE, INDIGO, TEAL, LIGHT, LIGHT2, BORDER,
                    GREY, DARK, WHITE, ACCENT, erd_entity)


# ------------------------------------------------------------------ 3.1 architecture
def fig_architecture():
    c = Canvas(1560, 1080)
    x0, right = 198, 1530

    bands = [
        ("Tầng trình bày\n(Presentation)", 30, 168, (240, 245, 251)),
        ("Tầng giao tiếp\n& tích hợp", 208, 92, (246, 249, 252)),
        ("Tầng API\n(Express)", 318, 152, (240, 245, 251)),
        ("Tầng nghiệp vụ\n(Services)", 488, 272, (246, 249, 252)),
        ("Tầng dữ liệu\n(Data access)", 778, 112, (240, 245, 251)),
        ("Tầng triển khai\n(Docker)", 908, 140, (246, 249, 252)),
    ]
    for label, y, h, fill in bands:
        c.rect(30, y, 150, h, fill=fill, outline=BORDER, width=1, radius=5)
        c.text_box(105, y + h / 2, label, 15, color=NAVY_D, bold=True, max_width=136)
        c.rect(x0 - 8, y, right - x0 + 8, h, fill=(253, 254, 255), outline=BORDER, width=1, radius=5)

    # ---------------- presentation
    c.rect(198, 40, 420, 148, fill=WHITE, outline=BLUE, width=2, radius=7)
    c.text_box(408, 62, "Website công khai — React 18 + Vite", 15, color=NAVY_D, bold=True)
    c.text_box(408, 94, "Trang chủ · Khám phá · Hướng dẫn địa điểm · Món ăn\nBản đồ · Tuyến ẩm thực · Giới thiệu",
               13, color=GREY, max_width=390)
    c.text_box(408, 158, "Quét QR (jsQR) · chọn ngôn ngữ · trình phát audio",
               12.5, color=BLUE, max_width=390)

    c.rect(638, 40, 400, 148, fill=WHITE, outline=BLUE, width=2, radius=7)
    c.text_box(838, 62, "Ứng dụng di động — Expo / RN", 15, color=NAVY_D, bold=True)
    c.text_box(838, 94, "Trang chủ · Khám phá · Quét QR (expo-camera)\nGPS Audio Guide · Yêu thích · Cài đặt",
               13, color=GREY, max_width=370)
    c.text_box(838, 158, "Theo dõi GPS, phát hiện vùng, phát audio (expo-av)",
               12.5, color=BLUE, max_width=370)

    c.rect(1058, 40, 470, 148, fill=WHITE, outline=BLUE, width=2, radius=7)
    c.text_box(1293, 62, "Trang quản trị — React", 15, color=NAVY_D, bold=True)
    c.text_box(1293, 94, "Đăng nhập · Dashboard · Địa điểm · Món ăn\nDanh mục · Tuyến · Ngôn ngữ · Người dùng",
               13, color=GREY, max_width=440)
    c.text_box(1293, 158, "Soạn bản dịch, tải audio/TTS, tạo QR, xem thống kê",
               12.5, color=BLUE, max_width=440)

    # ---------------- transport / integration
    c.rect(198, 218, 560, 72, fill=WHITE, outline=INDIGO, width=2, radius=7)
    c.text_box(478, 238, "Nginx (bản tĩnh, cổng 8080) · Vite dev (5173)", 14, color=NAVY_D, bold=True, max_width=530)
    c.text_box(478, 266, "Proxy /api → backend · phục vụ /uploads · SPA fallback", 12.5, color=GREY, max_width=530)

    c.rect(778, 218, 480, 72, fill=WHITE, outline=INDIGO, width=2, radius=7)
    c.text_box(1018, 238, "HTTP/HTTPS · JSON (axios)", 14, color=NAVY_D, bold=True)
    c.text_box(1018, 266, "Bearer JWT cho API quản trị · ?lang= cho nội dung", 12.5, color=GREY, max_width=450)

    c.dashed_rect(1278, 218, 250, 72, color=ACCENT, width=2, dash=6, gap=5)
    c.text_box(1403, 240, "Dịch vụ ngoài: TTS", 13.5, color=ACCENT, bold=True)
    c.text_box(1403, 268, "Google · Edge · ElevenLabs", 12, color=GREY)

    # ---------------- API layer
    c.rect(198, 328, 430, 132, fill=WHITE, outline=BLUE, width=2, radius=7)
    c.text_box(413, 348, "Ứng dụng Express 4", 15, color=NAVY_D, bold=True)
    c.text_box(413, 386, "helmet · cors (danh sách origin)\nexpress-rate-limit 300 yêu cầu/phút · json 2 MB",
               12.5, color=GREY, max_width=400)
    c.text_box(413, 438, "errorHandler: ApiError → { success, code, message }", 12, color=BLUE, max_width=400)

    c.rect(649, 328, 430, 132, fill=WHITE, outline=BLUE, width=2, radius=7)
    c.text_box(864, 348, "Định tuyến — routes/index.js", 15, color=NAVY_D, bold=True)
    c.text_box(864, 388, "/auth · /users · /places · /dishes · /languages\n/categories · /routes · /translations · /tts · /qr\nguest-sessions · payments · dashboard",
               11.5, color=GREY, max_width=405)
    c.text_box(864, 446, "74 tuyến API đã đăng ký", 12, color=BLUE, max_width=405)

    c.rect(1100, 328, 428, 132, fill=WHITE, outline=BLUE, width=2, radius=7)
    c.text_box(1314, 348, "Middleware", 15, color=NAVY_D, bold=True)
    c.text_box(1314, 394, "authenticate (JWT)\nrequireRole('ADMIN' | 'STAFF')\nattachGuestSession · multer upload",
               12, color=GREY, max_width=395)

    # ---------------- services (2 rows x 3)
    services = [
        (198, 500, "placeService", "địa điểm, bản dịch, ảnh, tìm gần đây"),
        (649, 500, "catalogService", "món ăn, danh mục, ngôn ngữ, tuyến"),
        (1100, 500, "mediaService", "audio, TTS, QR, đo thời lượng"),
        (198, 592, "entitlementService", "phiên khách, quyền, gói, giao dịch"),
        (649, 592, "geoAudioService", "vùng GPS, thuyết minh theo vị trí"),
        (1100, 592, "eventService", "ghi nhận quét, lượt nghe, thống kê"),
    ]
    for sx, sy, name, desc in services:
        c.rect(sx, sy, 430, 76, fill=WHITE, outline=TEAL, width=2, radius=7)
        c.text_box(sx + 215, sy + 22, name, 14, color=NAVY_D, bold=True)
        c.text_box(sx + 215, sy + 52, desc, 12, color=GREY, max_width=400)

    c.rect(198, 686, 700, 60, fill=WHITE, outline=BORDER, width=1, radius=7)
    c.text_box(548, 704, "Tiện ích dùng chung", 13, color=NAVY_D, bold=True)
    c.text_box(548, 730, "narration.js (kịch bản ~30 giây) · audioWarmupService · dishAudioService · authService (bcrypt, JWT)",
               11.5, color=GREY, max_width=670)
    c.rect(918, 686, 610, 60, fill=WHITE, outline=BORDER, width=1, radius=7)
    c.text_box(1223, 704, "Nguyên tắc phân lớp", 13, color=NAVY_D, bold=True)
    c.text_box(1223, 730, "Route → Controller (kiểm tra đầu vào) → Service (SQL + nghiệp vụ) → pg Pool",
               11.5, color=GREY, max_width=580)

    c.arrow([(1534, 556), (1548, 520), (1548, 320), (1534, 292)], color=ACCENT, width=2, dashed=True)
    c.text(1470, 424, "HTTPS", 11, color=ACCENT)

    # ---------------- data layer
    c.rect(198, 788, 600, 92, fill=WHITE, outline=INDIGO, width=2, radius=7)
    c.text_box(498, 808, "server/src/db/index.js", 14, color=NAVY_D, bold=True)
    c.text_box(498, 846, "pg.Pool (max 10, idleTimeout 30 s) · query / getOne / getMany\nhealthCheck() cho GET /api/health",
               12, color=GREY, max_width=570)

    c.rect(828, 788, 700, 92, fill=WHITE, outline=INDIGO, width=2, radius=7)
    c.text_box(1178, 808, "PostgreSQL 16 — 30 bảng", 14, color=NAVY_D, bold=True)
    c.text_box(1178, 848, "Nội dung ẩm thực · bản dịch · audio · QR · tuyến · người dùng & phân quyền\nphiên khách · quyền ngôn ngữ · gói & giao dịch · nhật ký quét/lượt nghe",
               11.5, color=GREY, max_width=670)

    # ---------------- deployment
    c.rect(198, 918, 380, 120, fill=WHITE, outline=BORDER, width=1, radius=7)
    c.text_box(388, 940, "docker-compose.yml", 14, color=NAVY_D, bold=True)
    c.text_box(388, 984, "postgres:16 (5432)\nserver (5001 → 5000)\nadmin-web / nginx (8080)", 12, color=GREY, max_width=350)

    c.rect(598, 918, 470, 120, fill=WHITE, outline=BORDER, width=1, radius=7)
    c.text_box(833, 940, "docker-compose.dev.yml", 14, color=NAVY_D, bold=True)
    c.text_box(833, 986, "mount mã nguồn + nodemon (server)\nVite HMR (5173) · API dev (5002)\nmigrate.js && seed.js khi khởi động",
               11.5, color=GREY, max_width=440)

    c.rect(1088, 918, 440, 120, fill=WHITE, outline=BORDER, width=1, radius=7)
    c.text_box(1308, 940, "Dockerfile", 14, color=NAVY_D, bold=True)
    c.text_box(1308, 986, "server: node:22-alpine + python3 + edge-tts\nweb: build bằng pnpm 11.7, phục vụ bằng nginx",
               11.5, color=GREY, max_width=410)

    c.save("hinh_3_1_kien_truc.png")


# ------------------------------------------------------------------------- ERDs
def fig_erd_content():
    c = Canvas(1600, 1120)
    W = 280
    xs = [30, 345, 660, 975, 1290]
    ys = [30, 240, 450, 660, 870]

    entities = {
        "languages": (0, 0, "languages", [("PK", "id"), ("", "code UNIQUE"), ("", "name"), ("", "native_name"), ("", "bcl / voice_note"), ("", "is_active")]),
        "place": (1, 0, "culinary_places", [("PK", "id"), ("", "code UNIQUE"), ("FK", "category_id"), ("", "address, latitude, longitude"), ("", "zone_radius / zone_exit_buffer"), ("", "status")]),
        "dishes": (2, 0, "dishes", [("PK", "id"), ("", "code UNIQUE"), ("FK", "culinary_place_id"), ("FK", "category_id"), ("", "price, image_url"), ("", "is_signature, status")]),
        "routes": (3, 0, "culinary_routes", [("PK", "id"), ("", "code UNIQUE"), ("", "name, description"), ("", "estimated_duration"), ("", "difficulty, status")]),
        "settings": (4, 0, "system_settings", [("PK", "id"), ("", "key UNIQUE"), ("", "value"), ("", "updated_at")]),
        "ptrans": (0, 1, "culinary_place_translations", [("PK", "id"), ("FK", "culinary_place_id"), ("FK", "language_id"), ("", "name"), ("", "short_description, description"), ("", "history / cultural_significance"), ("", "tourist_tips")]),
        "categories": (1, 1, "categories", [("PK", "id"), ("", "code UNIQUE"), ("", "name"), ("", "applies_to"), ("", "icon, is_active")]),
        "dtrans": (2, 1, "dish_translations", [("PK", "id"), ("FK", "dish_id"), ("FK", "language_id"), ("", "name"), ("", "description, ingredients"), ("", "cultural_information")]),
        "rtrans": (3, 1, "route_translations", [("PK", "id"), ("FK", "route_id"), ("FK", "language_id"), ("", "name, description")]),
        "audio": (0, 2, "audio_guides", [("PK", "id"), ("FK", "translation_id → place tr."), ("", "file_url"), ("", "duration, file_size"), ("", "source (UPLOAD/TTS)")]),
        "images": (1, 2, "culinary_place_images", [("PK", "id"), ("FK", "culinary_place_id"), ("", "image_url, alt_text"), ("", "sort_order, is_primary")]),
        "daudio": (2, 2, "dish_audio_guides", [("PK", "id"), ("FK", "translation_id → dish tr."), ("", "file_url"), ("", "duration, file_size"), ("", "source (UPLOAD/TTS)")]),
        "stops": (3, 2, "route_stops", [("PK", "id"), ("FK", "route_id"), ("FK", "culinary_place_id"), ("", "position (UNIQUE theo tuyến)"), ("", "note")]),
        "qr": (0, 3, "qr_codes", [("PK", "id"), ("FK", "culinary_place_id"), ("", "qr_value (URL)"), ("", "image_url")]),
        "dqr": (1, 3, "dish_qr_codes", [("PK", "id"), ("FK", "dish_id"), ("", "qr_value (URL)"), ("", "image_url")]),
        "scans": (2, 3, "scan_logs", [("PK", "id"), ("FK", "culinary_place_id"), ("FK", "language_id"), ("", "device_type, platform"), ("", "anonymous_session_id")]),
        "plays": (3, 3, "audio_play_logs", [("PK", "id"), ("FK", "culinary_place_id"), ("FK", "translation_id"), ("FK", "language_id"), ("", "anonymous_session_id")]),
        "favs": (0, 4, "visitor_favorites", [("PK", "id"), ("", "session_id"), ("FK", "culinary_place_id"), ("", "UNIQUE(session, place)")]),
        "hist": (1, 4, "visitor_history", [("PK", "id"), ("", "session_id"), ("FK", "culinary_place_id"), ("FK", "language_id"), ("", "viewed_at")]),
    }

    def coords(key):
        col, row = entities[key][0], entities[key][1]
        return xs[col] + W / 2, ys[row] + 70

    def link(a, b):
        ax, ay = coords(a)
        bx, by = coords(b)
        c.line((ax, ay), (bx, by), color=(200, 209, 222), width=2)
        c.text_box(ax + 16, ay + 16, "1", 12, color=ACCENT, bold=True)
        c.text_box(bx - 16, by - 16, "N", 12, color=ACCENT, bold=True)

    pairs = [
        ("languages", "ptrans"), ("languages", "dtrans"), ("languages", "rtrans"),
        ("languages", "scans"), ("languages", "plays"), ("languages", "hist"),
        ("place", "ptrans"), ("place", "dishes"), ("place", "images"), ("place", "qr"),
        ("place", "stops"), ("place", "scans"), ("place", "plays"), ("place", "favs"),
        ("place", "hist"), ("place", "dtrans"), ("categories", "place"), ("categories", "dishes"),
        ("dishes", "dtrans"), ("dishes", "daudio"), ("dishes", "dqr"),
        ("ptrans", "audio"), ("dtrans", "daudio"), ("routes", "rtrans"), ("routes", "stops"),
    ]
    for a, b in pairs:
        link(a, b)

    for key, (col, row, title, rows) in entities.items():
        erd_entity(c, xs[col], ys[row], W, title, rows)

    c.text_box(800, 1100, "Quan hệ 1 — N theo khoá ngoại. Bảng trung gian duy nhất ở mô hình này là route_stops (tuyến ↔ địa điểm).",
               13, color=GREY, italic=True, max_width=1250)
    c.save("hinh_3_2_erd_noidung.png")


def fig_erd_access():
    c = Canvas(1400, 940)
    W = 300
    xs = [40, 500, 990]
    ys = [30, 240, 450, 660]

    spec = {
        "users": (0, 0, "users", [("PK", "id"), ("", "email UNIQUE"), ("", "password_hash"), ("FK", "role_id"), ("", "is_active, last_login_at")]),
        "roles": (1, 0, "roles", [("PK", "id"), ("", "code UNIQUE (ADMIN/STAFF)"), ("", "name, description")]),
        "perms": (2, 0, "permissions", [("PK", "id"), ("", "code UNIQUE"), ("", "description")]),
        "rp": (1, 1, "role_permissions", [("PK/FK", "role_id"), ("PK/FK", "permission_id")]),
        "guest": (0, 1, "guest_sessions", [("PK", "id (uuid)"), ("", "token_hash"), ("", "display_id UNIQUE"), ("FK", "free_language_id"), ("", "expires_at")]),
        "pkg": (2, 1, "access_packages", [("PK", "id"), ("", "code UNIQUE"), ("", "price_amount, currency"), ("", "unlocks_all_languages"), ("", "validity_start / end")]),
        "ent": (0, 2, "language_entitlements", [("PK", "id"), ("FK", "guest_session_id"), ("FK", "language_id"), ("", "access_type free/purchased/available"), ("", "UNIQUE(guest, language)")]),
        "pkg_lang": (1, 2, "language_package_languages", [("PK/FK", "package_id"), ("PK/FK", "language_id")]),
        "pay": (2, 2, "payment_transactions", [("PK", "id"), ("", "provider_transaction_id UNIQUE"), ("FK", "guest_session_id / user_id"), ("FK", "package_id, language_id"), ("", "amount, currency, status"), ("", "idempotency_key")]),
        "audit": (0, 3, "language_entitlement_audit", [("PK", "id"), ("FK", "guest_session_id"), ("FK", "package_id, language_id"), ("", "status"), ("", "provider_transaction_id")]),
        "hook": (1, 3, "payment_webhook_events", [("PK", "id"), ("", "provider, provider_event_id"), ("FK", "payment_id"), ("", "status, received_at"), ("", "UNIQUE(provider, event)")]),
    }

    def coords(key):
        col, row = spec[key][0], spec[key][1]
        return xs[col] + W / 2, ys[row] + 70

    def link(a, b):
        ax, ay = coords(a)
        bx, by = coords(b)
        c.line((ax, ay), (bx, by), color=(200, 209, 222), width=2)
        c.text_box(ax + 16, ay + 16, "1", 12, color=ACCENT, bold=True)
        c.text_box(bx - 16, by - 16, "N", 12, color=ACCENT, bold=True)

    for a, b in [("users", "roles"), ("rp", "roles"), ("rp", "perms"), ("guest", "ent"),
                 ("pkg", "pkg_lang"), ("pkg", "pay"), ("guest", "pay"), ("guest", "audit"),
                 ("pkg", "audit"), ("pay", "hook")]:
        link(a, b)

    c.dashed_rect(1170, 552, 200, 96, color=GREY, width=2, dash=6, gap=5)
    c.text_box(1270, 584, "languages", 14, color=GREY, bold=True)
    c.text_box(1270, 614, "xem Hình 3.2", 12, color=GREY, italic=True)
    c.arrow([(1170, 592), (1120, 592), (1120, 500), (990, 470)], color=GREY, width=2, dashed=True)
    c.arrow([(1170, 616), (1140, 616), (1140, 330), (990, 316)], color=GREY, width=2, dashed=True)

    c.dashed_rect(1170, 700, 200, 96, color=GREY, width=2, dash=6, gap=5)
    c.text_box(1270, 732, "users / roles", 14, color=GREY, bold=True)
    c.text_box(1270, 762, "liên kết qua user_id", 12, color=GREY, italic=True)

    for key, (col, row, title, rows) in spec.items():
        erd_entity(c, xs[col], ys[row], W, title, rows)

    c.text_box(700, 916, "Khóa ngoại tới languages và users được dùng lại từ các migration trước, không tạo bảng mới.",
               13, color=GREY, italic=True, max_width=1250)
    c.save("hinh_3_3_erd_quyen.png")


# --------------------------------------------------------------- sequence helpers
def seq(c, lifelines, messages, top=110, bottom=None):
    xs = {i: x for i, (x, _, _) in enumerate(lifelines)}
    for i, (x, name, sub) in enumerate(lifelines):
        w = 190
        c.rect(x - w / 2, top - 62, w, 58, fill=LIGHT, outline=NAVY, width=2, radius=6)
        c.text_box(x, top - 44, name, 13.5, color=NAVY_D, bold=True, max_width=w - 12)
        c.text_box(x, top - 24, sub, 11.5, color=GREY, max_width=w - 12)
        c.dashed_line((x, top), (x, bottom), color=BORDER, width=2, dash=6, gap=7)
    for m in messages:
        if m[0] == "note":
            _, x1, x2, label, y = m[:5]
            c.rect(min(x1, x2), y - 24, abs(x2 - x1), 48, fill=(252, 248, 236), outline=ACCENT, width=1, radius=4)
            c.text_box((x1 + x2) / 2, y, label, 11.5, color=(120, 90, 40), max_width=abs(x2 - x1) - 14)
            continue
        _, f, t, label, y = m[:5]
        dashed = m[5] if len(m) > 5 else False
        x1, x2 = xs[f], xs[t]
        if f == t:
            c.arrow([(x1, y - 10), (x1 + 60, y - 10), (x1 + 60, y + 12), (x1 + 6, y + 12)],
                    color=NAVY, width=1.6, dashed=dashed)
            c.text_box(x1 + 150, y, label, 11.5, color=DARK, max_width=250)
        else:
            c.arrow([(x1, y), (x2, y)], color=NAVY if not dashed else GREY, width=1.7, dashed=dashed)
            c.text_box((x1 + x2) / 2, y - 16, label, 11.5, color=DARK, max_width=abs(x2 - x1) - 20)


def fig_seq_qr():
    c = Canvas(1400, 880)
    ll = [(120, "Khách du lịch", "actor"), (420, "Website / Ứng dụng", "React · RN"),
          (760, "API Express", "routes + controller"), (1060, "placeService", "nghiệp vụ"),
          (1300, "PostgreSQL", "pg Pool")]
    msgs = [
        ("m", 0, 1, "1. Quét QR tại quán", 150),
        ("note", 300, 560, "jsQR / expo-camera giải mã URL …/place/{id}", 196),
        ("m", 1, 1, "2. Điều hướng /place/{id}", 250),
        ("m", 1, 2, "3. GET /api/places/{id}/guide?lang=vi", 300),
        ("m", 2, 3, "4. getFullDetail(id, lang)", 344),
        ("m", 3, 4, "5. SELECT place + translations + audio", 388),
        ("m", 4, 3, "6. các dòng dữ liệu", 434, True),
        ("m", 3, 4, "7. SELECT images, dishes, dish audio", 478),
        ("m", 4, 3, "8. kết quả", 520, True),
        ("note", 900, 1330, "Nếu bản dịch chưa có audio: xếp hàng TTS nền,\ntrả audio_pending = true", 566),
        ("m", 3, 2, "9. đối tượng địa điểm đã trang trí", 620, True),
        ("m", 2, 1, "10. 200 OK { success, data }", 664, True),
        ("m", 1, 2, "11. POST /api/places/{id}/scan", 712),
        ("m", 2, 4, "12. INSERT scan_logs", 754),
        ("note", 200, 620, "Lỗi 404 (không tồn tại) hoặc 410 (đã lưu trữ)\nđược hiển thị bằng banner và liên kết quay lại", 800),
    ]
    seq(c, ll, msgs, top=150, bottom=822)
    c.save("hinh_3_4_sequence_qr.png")


def fig_seq_audio():
    c = Canvas(1420, 900)
    ll = [(110, "Khách du lịch", "actor"), (390, "Trình phát audio", "AudioPlayer / expo-av"),
          (700, "API Express", "mediaController"), (1000, "mediaService", "+ narration"),
          (1250, "TTS provider / tệp", "Google · Edge · file MP3")]
    msgs = [
        ("m", 0, 1, "1. Chọn ngôn ngữ (pill)", 150),
        ("m", 1, 2, "2. GET /places/{id}/guide?lang=ja", 196),
        ("m", 2, 1, "3. translations[].audio (nếu có)", 240, True),
        ("note", 240, 700, "Mỗi bản dịch mang theo bản ghi audio của riêng nó", 292),
        ("m", 1, 1, "4. Phát <audio src=/uploads/audio/…>", 350),
        ("m", 1, 4, "5. Tải tệp MP3", 400),
        ("m", 4, 1, "6. luồng byte audio", 440, True),
        ("m", 0, 1, "7. Tạm dừng / tua 10 s / đổi tốc độ", 494),
        ("note", 240, 720, "Chưa có tệp: speechSynthesis với locale = languages.bcl,\nđồng thời backend tạo TTS nền cho lần truy cập sau", 556),
        ("m", 1, 3, "8. (nền) generateSpeech(text, code)", 620, True),
        ("m", 3, 4, "9. HTTPS request tổng hợp giọng", 664),
        ("m", 4, 3, "10. MP3", 704, True),
        ("m", 3, 3, "11. attachAudio → audio_guides (UPSERT)", 750),
        ("m", 1, 1, "12. Ghi nhận lượt nghe", 800),
    ]
    seq(c, ll, msgs, top=150, bottom=852)
    c.save("hinh_3_5_sequence_audio.png")


def fig_seq_payment():
    c = Canvas(1480, 900)
    ll = [(110, "Khách du lịch", "actor"), (370, "Client", "web / mobile"),
          (650, "API Express", "guest-sessions / payments"), (930, "entitlementService", "+ PostgreSQL"),
          (1210, "Cổng thanh toán", "VNPay / MoMo")]
    msgs = [
        ("m", 1, 2, "1. POST /api/guest-sessions", 150),
        ("m", 2, 1, "2. token + cookie guest_session_id (90 ngày)", 190, True),
        ("m", 1, 2, "3. POST …/free-language { language_id }", 236),
        ("m", 2, 3, "4. INSERT language_entitlements (free)", 276),
        ("note", 520, 1160, "Chỉ một ngôn ngữ miễn phí cho mỗi phiên; lần chọn thứ hai trả 409.", 320),
        ("m", 1, 2, "5. GET …/language-packages", 372),
        ("m", 1, 2, "6. POST …/checkout { package_id, language_id }", 418),
        ("m", 2, 3, "7. tạo payment_transactions (pending)", 458),
        ("m", 2, 1, "8. mã giao dịch + URL thanh toán", 500, True),
        ("m", 1, 4, "9. Chuyển hướng người dùng sang cổng thanh toán", 548),
        ("m", 4, 2, "10. Webhook máy chủ → máy chủ (đã ký)", 596),
        ("note", 560, 1250, "Thiết kế: xác thực chữ ký, chống trùng theo\n(provider, provider_event_id), khoá dòng FOR UPDATE", 642),
        ("m", 2, 3, "11. cập nhật success + INSERT quyền 'purchased'", 706),
        ("m", 2, 1, "12. GET …/me → danh sách ngôn ngữ đã mở", 750, True),
        ("note", 120, 720, "Trạng thái mã nguồn: luồng mới dừng ở mức thiết kế —\nchưa có adapter cổng thanh toán và chưa nối vào giao diện.", 800),
    ]
    seq(c, ll, msgs, top=150, bottom=852)
    c.save("hinh_3_6_sequence_thanhtoan.png")


# ------------------------------------------------------------------- wireframes
def _chrome(c, x, y, w, h, title):
    c.rect(x, y, w, h, fill=WHITE, outline=BORDER, width=2, radius=8)
    c.rect(x, y, w, 34, fill=(236, 240, 245), outline=BORDER, width=1, radius=8)
    for i, col in enumerate([(226, 96, 92), (240, 188, 92), (150, 200, 140)]):
        c.ellipse(x + 18 + i * 18, y + 17, 5, 5, fill=col, outline=col, width=1)
    c.text_box(x + w / 2, y + 17, title, 12, color=GREY, bold=False)


def fig_wire_web():
    c = Canvas(1000, 960)
    _chrome(c, 30, 20, 940, 900, "localhost:5173/place/3 — Trang hướng dẫn địa điểm")
    c.rect(30, 54, 940, 46, fill=NAVY, outline=NAVY, width=1)
    c.text_box(120, 77, "🍜 Quận 4 Culinary", 13, color=WHITE, bold=True, max_width=200)
    for i, item in enumerate(["Trang chủ", "Khám phá", "Tuyến", "Bản đồ", "Giới thiệu"]):
        c.text(360 + i * 105, 77, item, 11.5, color=WHITE, anchor="lm")
    c.rect(860, 64, 92, 26, fill=WHITE, outline=WHITE, width=1, radius=12)
    c.text_box(906, 77, "📷 Quét QR", 11, color=NAVY, bold=True)

    c.rect(30, 100, 940, 170, fill=(238, 226, 214), outline=BORDER, width=1)
    c.text_box(500, 185, "Ảnh bìa địa điểm (culinary_place_images.is_primary)", 12, color=(130, 110, 95))

    c.text(70, 296, "Bánh canh cua Nguyễn Khoái", 20, color=NAVY_D, bold=True)
    for i, (label, w) in enumerate([("🍜 Vietnamese cuisine", 170), ("⭐ Đề xuất", 110), ("💰 30.000–50.000đ", 160)]):
        x = 70 + [0, 180, 300][i]
        c.rect(x, 330, w, 26, fill=LIGHT, outline=BORDER, width=1, radius=13)
        c.text_box(x + w / 2, 343, label, 11, color=NAVY_D)
    c.text(70, 374, "📍 152 Nguyễn Khoái, Phường 3, Quận 4 · 🕐 06:00 – 11:00", 11.5, color=GREY)

    c.text(70, 410, "CHỌN NGÔN NGỮ", 10.5, color=GREY, bold=True)
    for i, lang in enumerate(["Tiếng Việt", "English", "中文", "한국어", "日本語"]):
        x = 70 + i * 118
        active = i == 2
        c.rect(x, 424, 108, 30, fill=(255, 243, 230) if active else WHITE,
               outline=(230, 81, 0) if active else BORDER, width=2 if active else 1, radius=15)
        c.text_box(x + 54, 439, lang, 11, color=(172, 25, 0) if active else GREY, bold=active)

    c.rect(70, 470, 860, 96, fill=LIGHT2, outline=BORDER, width=1, radius=8)
    c.ellipse(120, 518, 24, 24, fill=(230, 81, 0), outline=(230, 81, 0), width=1)
    c.text_box(120, 518, "▶", 16, color=WHITE, bold=True)
    c.text(160, 500, "Nghe thuyết minh", 12.5, color=NAVY_D, bold=True)
    c.rect(160, 524, 600, 6, fill=(225, 230, 236), outline=(225, 230, 236), width=1, radius=3)
    c.rect(160, 524, 210, 6, fill=(230, 81, 0), outline=(230, 81, 0), width=1, radius=3)
    c.text(160, 538, "01:42", 10, color=GREY)
    c.text(760, 538, "03:28", 10, color=GREY)
    for i, t in enumerate(["⏪ 10s", "10s ⏩", "🔊", "1.0×"]):
        c.rect(790 + (i % 2) * 66, 486 + (i // 2) * 30, 60, 24, fill=WHITE, outline=BORDER, width=1, radius=12)
        c.text_box(820 + (i % 2) * 66, 498 + (i // 2) * 30, t, 9.5, color=GREY)

    sections = [("Về địa điểm này", 2), ("Món nên thử", 3), ("Lịch sử", 2), ("Văn hoá ẩm thực", 1)]
    y = 578
    for title, lines in sections:
        c.text(70, y, title, 13.5, color=(172, 25, 0), bold=True)
        for i in range(lines):
            c.rect(70, y + 14 + i * 12, 820 - i * 90, 7, fill=(228, 232, 238), outline=(228, 232, 238), width=1)
        y += 30 + lines * 12

    c.rect(70, y + 4, 520, 100, fill=(226, 235, 226), outline=BORDER, width=1)
    c.text_box(330, y + 54, "Bản đồ OpenStreetMap (nhúng iframe)", 11, color=(110, 125, 110))
    c.rect(610, y + 4, 320, 100, fill=WHITE, outline=BORDER, width=1, radius=6)
    c.text_box(770, y + 34, "Địa điểm gần đây (nearby)", 11, color=NAVY_D, bold=True)
    c.text_box(770, y + 66, "4 thẻ · khoảng cách tính bằng mét", 10.5, color=GREY)
    c.text(30, 940, "Wireframe minh hoạ bố cục theo mã nguồn PlaceGuide.jsx — không phải ảnh chụp màn hình.",
           11.5, color=GREY, italic=True)
    c.save("hinh_3_7_wireframe_web.png")


def fig_wire_mobile():
    c = Canvas(700, 900)
    c.rect(150, 20, 320, 640, fill=WHITE, outline=NAVY, width=3, radius=26)
    c.rect(150, 20, 320, 56, fill=(230, 81, 0), outline=(230, 81, 0), width=1, radius=24)
    c.text_box(310, 52, "Quét QR", 15, color=WHITE, bold=True)
    c.rect(150, 74, 320, 380, fill=(30, 30, 30), outline=(30, 30, 30), width=1)
    c.rect(205, 170, 210, 210, fill=None, outline=(255, 131, 58), width=3, radius=12)
    c.text_box(310, 275, "Camera sau (expo-camera)", 11, color=(210, 210, 210))
    c.rect(175, 400, 270, 34, fill=(45, 45, 45), outline=(45, 45, 45), width=1, radius=17)
    c.text_box(310, 417, "Hướng camera vào mã QR tại quán", 10.5, color=WHITE)

    md_y = 480
    c.text(175, md_y, "Hướng dẫn", 12.5, color=NAVY_D, bold=True)
    for i, t in enumerate(["1. Mở tab Quét QR", "2. Cho phép truy cập camera", "3. Quét mã → mở trang hướng dẫn"]):
        c.text(175, md_y + 28 + i * 26, "• " + t, 10.5, color=GREY)

    c.rect(150, 600, 320, 60, fill=WHITE, outline=BORDER, width=1)
    for i, (icon, label) in enumerate([("🏠", "Home"), ("🧭", "Explore"), ("📷", "Scan"),
                                       ("🎧", "GPS"), ("❤️", "Saved")]):
        x = 170 + i * 60
        active = i == 2
        c.text_box(x, 620, icon, 13, color=(230, 81, 0) if active else GREY)
        c.text_box(x, 642, label, 8.5, color=(230, 81, 0) if active else GREY, bold=active)

    c.text_box(310, 700, "Luồng sau khi quét", 13, color=NAVY_D, bold=True)
    c.rect(40, 726, 258, 110, fill=LIGHT2, outline=BORDER, width=1, radius=8)
    c.text_box(169, 752, "PlaceDetailScreen", 11.5, color=NAVY_D, bold=True)
    c.text_box(169, 792, "ảnh bìa · chọn ngôn ngữ\ntrình phát audio · món nên thử", 10, color=GREY)
    c.arrow([(300, 724), (300, 706)], color=GREY, width=1.5)
    c.rect(330, 726, 310, 110, fill=(252, 244, 244), outline=(196, 120, 120), width=1, radius=8)
    c.text_box(485, 748, "Lưu ý kỹ thuật", 11, color=(150, 60, 60), bold=True)
    c.text_box(485, 794, "Tệp PlaceDetailScreen.js hiện có đoạn mã\ntrùng lặp, chưa biên dịch được", 9.5, color=(150, 60, 60))

    c.text(30, 862, "Wireframe minh hoạ ScanScreen.js (tab Scan và thanh tab 5 mục).", 11, color=GREY, italic=True)
    c.save("hinh_3_8_wireframe_mobile.png")


def fig_wire_admin():
    c = Canvas(1080, 860)
    _chrome(c, 20, 20, 1040, 800, "localhost:8080/admin/places/3 — Trình soạn nội dung địa điểm")
    c.rect(20, 54, 200, 766, fill=(248, 250, 252), outline=BORDER, width=1)
    c.text_box(120, 82, "🍜 District 4 Admin", 12, color=NAVY_D, bold=True)
    items = ["Dashboard", "Địa điểm", "Món ăn", "Danh mục", "Tuyến ẩm thực", "Ngôn ngữ", "Người dùng", "Cài đặt"]
    for i, it in enumerate(items):
        y = 120 + i * 38
        active = it == "Địa điểm"
        if active:
            c.rect(30, y - 14, 180, 30, fill=(255, 236, 220), outline=(255, 236, 220), width=1, radius=6)
        c.text(44, y, it, 11.5, color=(172, 25, 0) if active else GREY, bold=active)

    c.text(246, 82, "Sửa địa điểm #3 · banh-canh-cua-nguyen-khoai", 14, color=NAVY_D, bold=True)
    c.rect(940, 66, 104, 28, fill=(230, 81, 0), outline=(230, 81, 0), width=1, radius=6)
    c.text_box(992, 80, "Lưu thay đổi", 10.5, color=WHITE, bold=True)

    tabs = ["Thông tin", "Bản dịch", "Món ăn", "Hình ảnh", "Mã QR"]
    for i, t in enumerate(tabs):
        x = 246 + i * 138
        active = i == 1
        c.rect(x, 108, 130, 32, fill=WHITE, outline=BORDER, width=1, radius=6)
        if active:
            c.rect(x, 108, 130, 32, fill=(255, 243, 230), outline=(230, 81, 0), width=2, radius=6)
        c.text_box(x + 65, 124, t, 11, color=(172, 25, 0) if active else GREY, bold=active)

    c.text(246, 168, "Ngôn ngữ có bản dịch", 11, color=GREY, bold=True)
    for i, (lang, ok) in enumerate([("Tiếng Việt ✔ 🔊", True), ("English ✔", True), ("中文 ○", False),
                                    ("한국어 ○", False), ("日本語 ✔", True)]):
        x = 246 + i * 150
        c.rect(x, 182, 140, 30, fill=(240, 247, 240) if ok else WHITE,
               outline=(120, 170, 120) if ok else BORDER, width=1, radius=15)
        c.text_box(x + 70, 197, lang, 10, color=NAVY_D if ok else GREY)

    fields = ["Tên (Tiếng Việt) *", "Mô tả ngắn", "Mô tả", "Lịch sử", "Ý nghĩa văn hoá",
              "Mẹo cho du khách (ngăn cách bằng “ • ”)"]
    y = 236
    for label in fields:
        c.text(246, y, label, 10.5, color=GREY)
        c.rect(246, y + 14, 700, 34, fill=WHITE, outline=BORDER, width=1, radius=5)
        c.rect(256, y + 26, 520, 8, fill=(232, 236, 241), outline=(232, 236, 241), width=1)
        y += 66

    c.rect(246, y, 700, 96, fill=LIGHT2, outline=BORDER, width=1, radius=6)
    c.text(262, y + 22, "Âm thanh cho bản dịch này", 11.5, color=NAVY_D, bold=True)
    c.rect(262, y + 40, 400, 8, fill=(225, 230, 236), outline=(225, 230, 236), width=1, radius=4)
    for i, t in enumerate(["⬆ Tải tệp MP3", "🤖 Tạo giọng đọc", "🗑 Xoá"]):
        c.rect(262 + i * 150, y + 60, 138, 26, fill=WHITE, outline=BORDER, width=1, radius=13)
        c.text_box(331 + i * 150, y + 73, t, 9.5, color=GREY)

    c.text(20, 838, "Wireframe minh hoạ PlaceEditor.jsx: 5 thẻ, chọn ngôn ngữ, soạn bản dịch, tải audio hoặc tạo TTS.",
           11, color=GREY, italic=True)
    c.save("hinh_3_9_wireframe_admin.png")


if __name__ == "__main__":
    print("Chapter 3 figures:")
    fig_architecture()
    fig_erd_content()
    fig_erd_access()
    fig_seq_qr()
    fig_seq_audio()
    fig_seq_payment()
    fig_wire_web()
    fig_wire_mobile()
    fig_wire_admin()
