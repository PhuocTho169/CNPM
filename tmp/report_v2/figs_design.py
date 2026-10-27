"""Chapter 2/3 design figures: layered architecture, components, deployment."""

from figlib import (Canvas, NAVY, NAVY_D, BLUE, INDIGO, TEAL, LIGHT, LIGHT2, BORDER,
                    GREY, DARK, WHITE, ACCENT)
from figs_common import legend_card


def _band(c, x, y, w, h, title, fill=(248, 250, 253)):
    c.rect(x, y, w, h, fill=fill, outline=BORDER, width=1.5, radius=8)
    c.text(x + 18, y + 14, title, 13.5, color=NAVY, bold=True, anchor="la")


def _card(c, x, y, w, h, title, lines, color=NAVY, fill=WHITE, title_size=14, line_size=11.5,
          dash=False):
    if dash:
        c.dashed_rect(x, y, w, h, color=color, width=1.5, dash=7, gap=5)
    else:
        c.rect(x, y, w, h, fill=fill, outline=color, width=1.6, radius=6)
    c.text_box(x + w / 2, y + 19, title, title_size, color=NAVY_D, bold=True,
               max_width=w - 18)
    for i, ln in enumerate(lines):
        c.text_box(x + w / 2, y + 44 + i * 20, ln, line_size, color=GREY,
                   max_width=w - 18, line_gap=1.12)


def _chip(c, cx, y, w, text, color=NAVY, fill=(239, 244, 250), h=24, size=10.5):
    c.rect(cx - w / 2, y, w, h, fill=fill, outline=color, width=1.2, radius=h / 2)
    c.text_box(cx, y + h / 2, text, size, color=color, bold=True, max_width=w - 10)


def fig_architecture():
    c = Canvas(1760, 1200)

    _band(c, 40, 28, 1680, 236, "1 · LỚP TRÌNH DIỄN (CLIENT)")
    cards = [
        (70, 480, "Website khách — React 18 · Vite 5",
         ["Home · Explore · Map (Leaflet) · PlaceGuide", "DishDetail · RouteDetail · đa ngữ 5 thứ tiếng",
          "Cookie guest_session_id · AppContext"]),
        (590, 480, "Trang quản trị — React Router",
         ["Login · Dashboard · Places · Dishes", "Routes · Users · Settings",
          "JWT trong localStorage · phân quyền theo vai trò"]),
        (1110, 480, "Ứng dụng di động — Expo 51 · RN 0.74",
         ["Tabs: Home · Explore · Scan · GPS Guide", "Favorites · Settings · PlaceDetail",
          "expo-camera · expo-location · expo-av · AsyncStorage"]),
    ]
    for x, w, title, lines in cards:
        _card(c, x, 75, w, 158, title, lines, color=BLUE)

    # request envelope strip
    _band(c, 40, 282, 1680, 54, "", fill=(241, 246, 252))
    chips = [
        (180, 220, "HTTPS · JSON · axios"),
        (475, 280, "cookie guest_session_id (90 ngày)"),
        (770, 220, "CORS: localhost + LAN"),
        (1065, 280, "helmet · rate-limit 300 req/phút"),
        (1400, 300, "static /uploads (ảnh · audio · QR)"),
    ]
    for cx, w, text in chips:
        _chip(c, cx, 296, w, text, color=BLUE)

    _band(c, 40, 360, 1680, 322, "2 · LỚP API — EXPRESS 4 · /api · 88 ENDPOINT")
    groups = [
        (70, "Public catalog", ["GET /places · /places/nearby", "GET /places/:id/guide · /dishes",
                                 "GET /routes · /languages · /categories", "POST /places/:id/scan"]),
        (480, "Guest & paywall", ["POST /guest-sessions · /free-language",
                                   "POST /checkouts · /:id/confirm", "GET /translations?language=...",
                                   "2 slot miễn phí · 20.000 đ mở tất cả"]),
        (890, "Admin nội dung", ["POST/PUT/PATCH/DELETE /places", "translations · images · routes · stops",
                                  "dishes · languages · categories", "users & roles (chỉ ADMIN)"]),
        (1300, "Media & thống kê", ["GET /culinary-places/:id/audio", "GET/POST /.../qr · /tts",
                                     "GET /dashboard/statistics · online", "GET /statistics/scans · audio"]),
    ]
    for x, title, lines in groups:
        _card(c, x, 400, 380, 132, title, lines, color=NAVY, title_size=13.5, line_size=10.5)

    c.text(70, 554, "Middleware:", 12.5, color=NAVY_D, bold=True)
    mids = [
        (260, 190, "JWT 12 giờ + requireRole"),
        (505, 210, "guest token → SHA-256"),
        (760, 240, "language unlock (free/purchased)"),
        (1040, 190, "multer ảnh / audio"),
        (1275, 210, "error envelope + 404"),
        (1525, 170, "rate limit + helmet"),
    ]
    for cx, w, text in mids:
        _chip(c, cx, 590, w, text, color=TEAL, fill=(237, 246, 246), size=10.5)

    _band(c, 40, 700, 1680, 188, "3 · LỚP DỊCH VỤ NGHIỆP VỤ")
    services = [
        (58, "placeService", "CRUD địa điểm, guide,\nfallback bản dịch, ảnh"),
        (288, "catalogService", "món ăn, tuyến, điểm dừng,\ndanh mục, ngôn ngữ"),
        (518, "mediaService", "upload ảnh/audio/QR,\nTTS, media_files"),
        (748, "entitlementService", "2 slot miễn phí, checkout\n20k, idempotent confirm"),
        (978, "geoAudioService", "nearby Haversine,\nthuyết minh theo vùng"),
        (1208, "statsService", "dashboard, quét, lượt nghe,\nngười đang online"),
        (1438, "authService", "login JWT 12h,\nroles ADMIN/STAFF/VISITOR"),
    ]
    for x, name, lines in services:
        _card(c, x, 742, 218, 114, name, lines.split("\n"), color=INDIGO,
              title_size=13, line_size=10.5)

    _band(c, 40, 906, 1680, 186, "4 · LỚP DỮ LIỆU & TÍCH HỢP")
    _card(c, 70, 948, 940, 120, "PostgreSQL 16 — 12 bảng nghiệp vụ",
          ["users · languages · categories · culinary_places · dishes · translations",
           "media_files · culinary_routes · route_stops · guest_sessions · activity_logs · checkouts",
           "pg pool · SQL trực tiếp · index & trigger updated_at"], color=TEAL,
          title_size=13.5, line_size=11)
    _card(c, 1040, 948, 330, 120, "Thư mục uploads",
          ["images/ · audio/ · qr/", "phục vụ tĩnh /uploads", "bind mount khi chạy Docker"],
          color=TEAL, title_size=13.5, line_size=11)
    _card(c, 1395, 948, 300, 120, "TTS (tuỳ chọn)",
          ["Google free / Edge / Cloud", "ElevenLabs nếu có API key", "lỗi → fallback nội bộ"],
          color=ACCENT, title_size=13.5, line_size=11, dash=True)

    # vertical flow arrows
    for x in (310, 830, 1350):
        c.arrow([(x, 236), (x, 282)], color=NAVY, width=1.6, head=8)
        c.arrow([(x, 336), (x, 360)], color=NAVY, width=1.6, head=8)
    c.arrow([(880, 682), (880, 700)], color=NAVY, width=1.8, head=8)
    c.arrow([(880, 888), (880, 906)], color=NAVY, width=1.8, head=8)
    c.text_box(920, 692, "gọi service", 10.5, color=GREY, max_width=120)
    c.text_box(920, 898, "đọc/ghi dữ liệu", 10.5, color=GREY, max_width=150)

    c.text_box(880, 1138,
               "Luồng phụ thuộc một chiều: client → API → service → dữ liệu. Quyền ngôn ngữ và giá 20.000 đ do server quyết định; "
               "client không thể tự mở khoá hay đặt giá.",
               12, color=GREY, italic=True, max_width=1600)
    c.save("hinh_2_1_architecture.png")


def fig_components():
    c = Canvas(1800, 1080)
    c.text_box(900, 30, "Thành phần phần mềm và quan hệ phụ thuộc", 16, color=NAVY_D,
               bold=True, max_width=1000)

    # Web
    c.rect(40, 58, 800, 372, fill=(250, 251, 253), outline=BLUE, width=2, radius=8)
    c.text_box(440, 84, "Web SPA — React 18 · Vite 5", 15, color=BLUE, bold=True, max_width=740)
    c.text_box(440, 107, "apps/web", 11, color=GREY, max_width=160)
    _card(c, 66, 124, 360, 200, "Trang công khai",
          ["Home · Explore · MapPage", "PlaceGuide · DishDetail", "RouteDetail · LanguageBanner",
           "Leaflet + OpenStreetMap", "audio player"], color=BLUE, title_size=13, line_size=10.8)
    _card(c, 448, 124, 366, 200, "Trang quản trị",
          ["Login · Dashboard · Places", "PlaceEditor · Dishes", "Routes · Users · Settings",
           "upload ảnh/audio · QR editor", "role lấy từ JWT"], color=BLUE, title_size=13,
          line_size=10.8)
    _card(c, 66, 348, 748, 62, "Hạ tầng dùng chung",
          ["AppContext · api client axios (/api) · i18n 5 ngôn ngữ · guest session bootstrap · route guard"],
          color=BLUE, title_size=12, line_size=10.5)

    # Mobile
    c.rect(900, 58, 800, 372, fill=(250, 251, 253), outline=TEAL, width=2, radius=8)
    c.text_box(1300, 84, "Mobile app — Expo 51 · RN 0.74", 15, color=TEAL, bold=True, max_width=740)
    c.text_box(1300, 107, "apps/mobile", 11, color=GREY, max_width=160)
    _card(c, 926, 124, 360, 200, "Màn hình",
          ["Home · Explore · Scan", "GPS Guide · Favorites", "Settings · PlaceDetail",
           "expo-camera · expo-av", "expo-location"], color=TEAL, title_size=13, line_size=10.8)
    _card(c, 1308, 124, 366, 200, "Hook & service",
          ["useZoneDetection", "zoneDetectionService", "audioGuideService · locationService",
           "favorites/history cục bộ", "api axios"], color=TEAL, title_size=13, line_size=10.8)
    _card(c, 926, 348, 748, 62, "Lưu cục bộ",
          ["AsyncStorage: language · session · favorites · history · queue audio (mới nhất thắng)"],
          color=TEAL, title_size=12, line_size=10.5)

    # API
    c.rect(40, 480, 1720, 320, fill=(250, 251, 253), outline=NAVY, width=2, radius=8)
    c.text_box(900, 506, "REST API — Express 4 · server/src", 15, color=NAVY, bold=True,
               max_width=1640)
    cols = [
        (60, "Routes", ["/api public", "/guest-sessions", "admin · media · stats",
                         "76 + 12 = 88 endpoint"]),
        (400, "Middleware", ["auth JWT 12h", "requireRole", "attachGuestSession",
                              "requireLanguageUnlock", "multer · error handler"]),
        (740, "Controllers", ["place · catalog", "media · geo", "auth · health",
                               "validate input", "trả envelope"]),
        (1080, "Services", ["place · catalog", "media + TTS · QR", "entitlement · geoAudio",
                             "stats · auth", "quy tắc quyền & giá"]),
        (1420, "Truy cập dữ liệu", ["db pool (pg)", "SQL trực tiếp", "không ORM",
                                     "config env", "publicBaseUrl · TTS"]),
    ]
    for x, title, lines in cols:
        _card(c, x, 536, 300, 210, title, lines, color=NAVY, title_size=13, line_size=10.8)

    # dependencies top -> API
    c.arrow([(440, 430), (440, 480)], color=BLUE, width=2, head=9)
    c.text_box(570, 455, "HTTPS /api · cookie guest_session_id", 11.5, color=DARK,
               bg=WHITE, max_width=300)
    c.arrow([(1300, 430), (1300, 480)], color=TEAL, width=2, head=9)
    c.text_box(1430, 455, "axios /api · LAN base", 11.5, color=DARK, bg=WHITE, max_width=250)

    # data nodes
    _card(c, 60, 840, 600, 150, "PostgreSQL 16 — 12 bảng",
          ["users · guest_sessions · checkouts · activity_logs", "nội dung: places · dishes · routes · translations · media",
           "migration 001 → 008 · pg pool + SQL tham số hoá"], color=TEAL,
          title_size=13.5, line_size=10.8)
    _card(c, 690, 840, 350, 150, "uploads/",
          ["images · audio · qr", "static /uploads", "bind mount trong Docker"],
          color=TEAL, title_size=13.5, line_size=10.8)
    _card(c, 1070, 840, 300, 150, "TTS provider",
          ["tuỳ chọn", "Google free / Edge / Cloud", "lỗi → fallback nội bộ"],
          color=ACCENT, title_size=13.5, line_size=10.8, dash=True)
    c.arrow([(360, 800), (360, 840)], color=GREY, width=1.6, head=8, dashed=True)
    c.arrow([(865, 800), (865, 840)], color=GREY, width=1.6, head=8, dashed=True)
    c.arrow([(1220, 800), (1220, 840)], color=ACCENT, width=1.6, head=8, dashed=True)
    c.text_box(360, 818, "SQL", 10.5, color=GREY, max_width=80)
    c.text_box(865, 818, "file I/O", 10.5, color=GREY, max_width=80)
    c.text_box(1220, 818, "HTTP (tuỳ chọn)", 10.5, color=GREY, max_width=130)
    c.text_box(900, 1030,
               "Các service dùng chung cho website, trang quản trị và ứng dụng di động. TTS và QR là thành phần phụ trợ; "
               "luồng đọc nội dung vẫn hoạt động khi dịch vụ TTS ngoài không sẵn sàng.",
               12, color=GREY, italic=True, max_width=1680)
    c.save("hinh_2_2_components.png")


def fig_deployment():
    c = Canvas(1760, 1120)

    # client zone
    c.dashed_rect(30, 40, 440, 820, color=BLUE, width=1.8, dash=8, gap=6)
    c.text_box(250, 66, "THIẾT BỊ NGƯỜI DÙNG", 13.5, color=BLUE, bold=True, max_width=380)
    _card(c, 60, 100, 380, 145, "Điện thoại khách",
          ["Trình duyệt (website) hoặc Expo Go", "Camera quét QR · GPS · loa",
           "Wi-Fi/LAN → http://<host>:8080"], color=BLUE, title_size=13.5, line_size=11)
    _card(c, 60, 285, 380, 145, "Laptop ADMIN / STAFF",
          ["Chrome/Edge → http://<host>:8080", "Đăng nhập JWT, quản trị nội dung",
           "Upload ảnh/audio, tạo QR"], color=BLUE, title_size=13.5, line_size=11)
    _card(c, 60, 470, 380, 145, "Mã QR in tại quán",
          ["/place/:id hoặc /dish/:id", "Có thể chứa localhost → app rewrite LAN",
           "Mỗi địa điểm/món một QR"], color=BLUE, title_size=13.5, line_size=11)
    _card(c, 60, 655, 380, 145, "Expo Go / Metro (host)",
          ["pnpm dev:mobile · cổng 8081", "Nạp app vào điện thoại",
           "Gọi API qua EXPO_PUBLIC_API_URL"], color=BLUE, title_size=13.5, line_size=11)

    # docker host
    c.dashed_rect(505, 40, 950, 900, color=NAVY, width=2, dash=8, gap=6)
    c.text_box(980, 66, "DOCKER HOST — DOCKER COMPOSE", 14, color=NAVY, bold=True, max_width=860)

    _card(c, 540, 105, 370, 165, "nginx · d4-web :8080",
          ["serve dist/ của Vite", "proxy /api → server:5000", "proxy /uploads → server:5000",
           "image nginx:alpine3.20"], color=TEAL, title_size=13.5, line_size=10.5)
    _card(c, 1000, 105, 390, 165, "API · d4-server :5001→5000",
          ["Node 22-alpine · Express 4", "migrate + seed khi khởi động",
           "Edge TTS (Python) trong image", "bind mount ./server/uploads"], color=NAVY,
          title_size=13.5, line_size=10.5)
    _card(c, 540, 335, 370, 175, "Bind mount ./server/uploads",
          ["images/ · audio/ · qr/", "mount đè để không mất file",
           "/uploads phục vụ static 7 ngày"], color=TEAL, title_size=13.5, line_size=10.5)
    _card(c, 1000, 335, 390, 175, "PostgreSQL 16 · d4-postgres",
          ["database district4_food", "user district4_user",
           "healthcheck pg_isready", "port 5432 nội bộ"], color=TEAL, title_size=13.5, line_size=10.5)

    # volume cylinder
    c.ellipse(1195, 610, 155, 20, fill=(232, 242, 245), outline=TEAL, width=2)
    c.rect(1040, 610, 310, 100, fill=(232, 242, 245), outline=TEAL, width=2)
    c.ellipse(1195, 710, 155, 20, fill=(232, 242, 245), outline=TEAL, width=2)
    c.text_box(1195, 650, "volume postgres_data", 13, color=NAVY_D, bold=True, max_width=290)
    c.text_box(1195, 678, "dữ liệu bền vững qua container", 10.5, color=GREY, max_width=280)
    c.arrow([(1195, 510), (1195, 610)], color=TEAL, width=1.6, head=8)
    c.text_box(1255, 560, "PGDATA", 10.5, color=GREY, max_width=100)

    # external TTS
    c.dashed_rect(1495, 105, 235, 170, color=ACCENT, width=1.8, dash=7, gap=5)
    c.text_box(1612, 130, "TTS CLOUD", 13, color=ACCENT, bold=True, max_width=210)
    c.text_box(1612, 175, "Google Cloud / ElevenLabs\n(tuỳ chọn — cần API key)", 11, color=GREY,
               max_width=205, line_gap=1.25)
    c.text_box(1612, 232, "nếu lỗi: Google free /\nEdge TTS nội bộ", 10.5, color=GREY,
               max_width=205, line_gap=1.2)

    # arrows client -> nginx
    c.arrow([(440, 172), (540, 172)], color=BLUE, width=1.8, head=9)
    c.arrow([(440, 357), (475, 357), (475, 215), (540, 215)], color=BLUE, width=1.8, head=9)
    c.arrow([(440, 542), (495, 542), (495, 245), (540, 245)], color=BLUE, width=1.8, head=9)
    c.text_box(488, 130, "LAN :8080", 10.5, color=GREY, max_width=90)
    c.arrow([(250, 655), (250, 590)], color=BLUE, width=1.5, head=8, dashed=True)
    c.text_box(310, 622, "nạp app", 10.5, color=GREY, max_width=80)

    # internal arrows
    c.arrow([(910, 185), (1000, 185)], color=NAVY, width=1.8, head=9)
    c.text_box(955, 155, "proxy\n/api", 10, color=DARK, bg=WHITE, max_width=90)
    c.arrow([(1195, 270), (1195, 335)], color=NAVY, width=1.8, head=9)
    c.text_box(1260, 300, "DATABASE_URL", 10.5, color=DARK, bg=WHITE, max_width=170)
    c.arrow([(1000, 480), (910, 480)], color=NAVY, width=1.8, head=9)
    c.text_box(955, 450, "đọc/ghi\nfile", 10, color=DARK, bg=WHITE, max_width=90)
    c.arrow([(1390, 170), (1495, 170)], color=ACCENT, width=1.6, head=8, dashed=True)
    c.text_box(1442, 140, "HTTPS\n(tuỳ chọn)", 9.5, color=DARK, bg=WHITE, max_width=95)

    # legend/notes
    legend_card(c, 540, 760, 910, [
        ("line", None, BLUE, "Luồng HTTP giữa thiết bị và nginx"),
        ("line", None, NAVY, "Kết nối nội bộ trong Docker network"),
        ("dash", None, ACCENT, "Tích hợp tuỳ chọn (TTS cloud)"),
    ], title="Chú thích", row_h=27, size=11.5)

    c.text_box(900, 1050,
               "Dev: web Vite :5173 + API :5002; prod compose: nginx :8080 + API :5001. "
               "Server chạy migrate/seed khi container khởi động; dữ liệu PostgreSQL nằm trong named volume.",
               12, color=GREY, italic=True, max_width=1680)
    c.save("hinh_2_3_deployment.png")


if __name__ == "__main__":
    fig_architecture()
    fig_components()
    fig_deployment()
