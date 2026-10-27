"""Compact activity diagrams for the principal use cases."""

from figlib import (Canvas, NAVY, NAVY_D, BLUE, INDIGO, TEAL, LIGHT, LIGHT2, BORDER,
                    GREY, DARK, WHITE, ACCENT)
from figs_common import start, end, legend_card

ROLE = {
    "user": ((233, 241, 250), BLUE),
    "admin": ((252, 244, 232), ACCENT),
    "api": ((239, 236, 247), INDIGO),
    "db": ((232, 244, 241), TEAL),
    "ui": ((240, 246, 252), BLUE),
}


def node(c, cx, cy, text, role="api", w=620, h=66, size=15.2):
    fill, outline = ROLE[role]
    c.rect(cx - w / 2, cy - h / 2, w, h, fill=fill, outline=outline, width=1.8, radius=8)
    c.text_box(cx, cy, text, size, color=DARK, max_width=w - 24, line_gap=1.15)


def decision(c, cx, cy, text, w=350, h=100, size=15):
    pts = [(cx, cy - h / 2), (cx + w / 2, cy), (cx, cy + h / 2), (cx - w / 2, cy)]
    c.d.polygon([(p[0] * 2, p[1] * 2) for p in pts], fill=(255, 247, 232),
                outline=ACCENT, width=4)
    c.text_box(cx, cy, text, size, color=(92, 62, 30), bold=True, max_width=w - 54,
               line_gap=1.12)


def arrow(c, pts, color=GREY, width=1.8, dashed=False):
    c.arrow(pts, color=color, width=width, head=9, dashed=dashed)


def alabel(c, x, y, text, color=DARK, size=14):
    c.text_box(x, y, text, size, color=color, bg=WHITE, max_width=240, line_gap=1.1)


def act_legend(c, x=1090, y=50):
    legend_card(c, x, y, 350, [
        ("box", *ROLE["user"], "Khách / giao diện"),
        ("box", *ROLE["admin"], "ADMIN / STAFF"),
        ("box", *ROLE["api"], "API / xử lý hệ thống"),
        ("box", *ROLE["db"], "PostgreSQL / media"),
        ("diamond", (255, 247, 232), ACCENT, "Điều kiện rẽ nhánh"),
    ], title="Chú thích", row_h=31, size=13.5)


def note(c, x, y, w, h, text):
    c.rect(x, y, w, h, fill=(255, 249, 229), outline=(198, 164, 84), width=1.5, radius=5)
    c.text_box(x + w / 2, y + h / 2, text, 13.8, color=(92, 70, 22),
               max_width=w - 22, line_gap=1.25)


def caption(c, text, y):
    c.text_box(c.w / 2, y, text, 13.5, color=GREY, italic=True, max_width=c.w - 90)


def fig_activity_search():
    c = Canvas(1500, 980)
    cx = 700
    start(c, cx, 45)
    node(c, cx, 108, "Khách mở trang Khám phá", "user")
    node(c, cx, 182, "Nhập từ khoá / chọn “Gần tôi”\nhoặc lọc theo danh mục", "user")
    node(c, cx, 256, "Web gọi GET /places\nhoặc GET /places/nearby", "api")
    node(c, cx, 330, "Lọc PUBLISHED, dịch theo ngôn ngữ,\ngom media", "api")
    node(c, cx, 404, "PostgreSQL: places · translations\n· categories · media_files", "db")
    decision(c, cx, 496, "Có kết quả?")
    node(c, cx, 600, "Hiển thị bản đồ + danh sách,\nsắp xếp theo khoảng cách", "ui")
    node(c, cx, 674, "Khách chọn một địa điểm", "user")
    node(c, cx, 748, "GET /places/:id/guide?language=…", "api")
    node(c, cx, 822, "Render hướng dẫn, audio\nvà nút yêu thích", "ui")
    end(c, cx, 892)

    for y1, y2 in [(61, 75), (141, 149), (215, 223), (289, 297), (363, 371),
                   (437, 446), (546, 567), (633, 641), (707, 715), (781, 789),
                   (855, 875)]:
        arrow(c, [(cx, y1), (cx, y2)])
    alabel(c, 752, 555, "Có")

    # no-result branch
    node(c, 210, 496, "Empty state: gợi ý đổi\ntừ khoá hoặc bán kính", "ui",
         w=300, h=84, size=14.2)
    arrow(c, [(525, 496), (360, 496)])
    alabel(c, 440, 474, "Không")
    arrow(c, [(210, 454), (210, 182), (390, 182)])
    alabel(c, 285, 158, "thử lại")

    act_legend(c)
    note(c, 1080, 250, 380, 150,
         "Chọn “Gần tôi” → API dùng Haversine. Bản dịch thiếu ngôn ngữ sẽ fallback sang bản giàu nội dung nhất thay vì để trống.")
    caption(c, "UC-01 · Tra cứu địa điểm — kết quả rỗng không phải lỗi; hệ thống giữ bộ lọc để khách thử lại.", 945)
    c.save("hinh_3_9_activity_search.png")


def fig_activity_unlock():
    c = Canvas(1500, 1000)
    cx = 700
    start(c, cx, 45)
    node(c, cx, 108, "Khách chọn ngôn ngữ khác “vi”\ntrên trang hướng dẫn", "user")
    node(c, cx, 182, "GET …/translation; kiểm tra guest session,\n2 slot miễn phí và purchased_languages", "api")
    decision(c, cx, 278, "Đã mở khoá?")
    node(c, cx, 380, "403 LANGUAGE_LOCKED", "api")
    node(c, cx, 454, "LanguageBanner: 2 slot miễn phí\n+ mở khoá 20.000 đ", "user")
    decision(c, cx, 548, "Còn slot miễn phí?")
    node(c, cx, 660, "POST checkouts → pending 20.000 đ\n(server-owned, idempotency key)", "api")
    node(c, cx, 734, "Khách xác nhận thanh toán sandbox", "user")
    node(c, cx, 808, "Confirm → success; purchased_languages\n= toàn bộ ngôn ngữ active (idempotent)", "api")
    node(c, cx, 882, "Tải lại nội dung + audio", "ui")
    end(c, cx, 952)

    for y1, y2 in [(61, 75), (141, 149), (215, 228), (330, 347), (413, 421),
                   (487, 498), (598, 627), (693, 701), (767, 775), (841, 849),
                   (915, 936)]:
        arrow(c, [(cx, y1), (cx, y2)])
    alabel(c, 750, 610, "Không")

    node(c, 1260, 278, "200 translation + audio", "api", w=360, h=76)
    arrow(c, [(890, 278), (1080, 278)])
    alabel(c, 980, 254, "Có")
    arrow(c, [(1260, 316), (1260, 882), (1020, 882)])
    alabel(c, 1300, 610, "đã mở khoá", size=13.5)

    node(c, 205, 548, "POST free-language →\ncấp slot trống", "api",
         w=290, h=84, size=14.2)
    arrow(c, [(510, 548), (350, 548)])
    alabel(c, 430, 524, "Có")
    arrow(c, [(205, 590), (205, 882), (380, 882)])
    alabel(c, 250, 905, "nội dung", size=13.5)

    act_legend(c, 1090, 40)
    caption(c, "UC-03 · Mở khoá ngôn ngữ — nhánh miễn phí và nhánh trả phí cùng quay về bước tải nội dung; confirm lặp idempotent.", 975)
    c.save("hinh_3_10_activity_unlock.png")


def fig_activity_qr():
    c = Canvas(1500, 1030)
    cx = 700
    start(c, cx, 45)
    node(c, cx, 108, "Khách quét mã QR in tại quán", "user")
    node(c, cx, 182, "Expo CameraView đọc payload", "api")
    decision(c, cx, 278, "URL/payload hợp lệ?")
    node(c, cx, 380, "qrToUrl: chấp nhận URL hoặc số ID;\nlocalhost → WEB_BASE trong LAN", "api")
    node(c, cx, 454, "Mở website /place/:id hoặc /dish/:id", "api")
    node(c, cx, 528, "Website tạo guest session nếu chưa có", "api")
    node(c, cx, 602, "GET /places/:id/guide?language=vi", "api")
    node(c, cx, 676, "PostgreSQL: place + translations + media", "db")
    node(c, cx, 750, "Hiển thị hướng dẫn + chọn ngôn ngữ", "ui")
    node(c, cx, 824, "POST /places/:id/scan →\nactivity_logs event_type='scan'", "api")
    node(c, cx, 898, "Nếu ngôn ngữ bị khoá → mở UC-03", "ui")
    end(c, cx, 962)

    for y1, y2 in [(61, 75), (141, 149), (215, 228), (328, 347), (413, 421),
                   (487, 495), (561, 569), (635, 643), (709, 717), (783, 791),
                   (857, 865), (931, 942)]:
        arrow(c, [(cx, y1), (cx, y2)])
    alabel(c, 752, 337, "Có")

    node(c, 210, 278, "Báo lỗi QR không hợp lệ\n+ cooldown 4 giây", "ui",
         w=300, h=84, size=14.2)
    arrow(c, [(525, 278), (360, 278)])
    alabel(c, 440, 256, "Không")
    arrow(c, [(210, 236), (210, 108), (390, 108)])
    alabel(c, 280, 84, "quét lại")

    act_legend(c)
    note(c, 1080, 250, 380, 160,
         "QR món ăn mở /dish/:id; trang món tìm culinary_place_id để tải hướng dẫn của quán. Mã QR cũ chứa localhost được app đổi sang WEB_BASE trước khi mở.")
    caption(c, "UC-04 · Quét mã QR — mỗi địa điểm/món có một QR; lượt quét được ghi vào activity_logs để thống kê.", 1000)
    c.save("hinh_3_11_activity_qr.png")


def fig_activity_gps():
    c = Canvas(1500, 1060)
    cx = 700
    start(c, cx, 45)
    node(c, cx, 108, "Khách mở tab GPS Guide", "user")
    decision(c, cx, 200, "Đã cấp quyền vị trí?")
    node(c, cx, 300, "Fix đầu ≤ 100 m; GET nearby 500 m\nHaversine + chỉ địa điểm PUBLISHED", "api")
    node(c, cx, 374, "Cache + watchPosition 10 m / 3 s;\nrefresh sau 60 m hoặc 120 s", "api")
    node(c, cx, 448, "detectZoneEntry: vào ≤ zone_radius,\nra > zone_radius + buffer; bỏ fix > 150 m", "api")
    decision(c, cx, 540, "Vừa vào vùng?")
    node(c, cx, 640, "GET /culinary-places/:id/audio?language", "api")
    decision(c, cx, 730, "Đã mở khoá ngôn ngữ?")
    node(c, cx, 830, "Translation + audio; thiếu file →\nTTS lazy, lưu media_files", "db")
    node(c, cx, 904, "Trả audioUrl; phát audio,\nqueue: vùng mới nhất thắng", "ui")
    node(c, cx, 978, "Tiếp tục watchPosition;\nđóng tab → dừng phát", "api")

    for y1, y2 in [(61, 75), (141, 150), (250, 267), (333, 341), (407, 415),
                   (481, 490), (590, 607), (673, 681), (780, 797), (863, 871),
                   (937, 945)]:
        arrow(c, [(cx, y1), (cx, y2)])

    node(c, 210, 200, "Hướng dẫn cấp quyền /\nquét QR / tìm quán thủ công", "ui",
         w=300, h=84, size=14.2)
    arrow(c, [(525, 200), (360, 200)])
    alabel(c, 440, 178, "Chưa")
    arrow(c, [(210, 242), (210, 300)])
    end(c, 210, 318, "Kết thúc")

    # branch: chưa vào vùng, loops into the cache step
    arrow(c, [(875, 540), (1280, 540), (1280, 374), (1015, 374)])
    alabel(c, 1110, 516, "chưa vào vùng", size=13.5)

    node(c, 205, 730, "403 → mở UC-03\n2 slot miễn phí / 20.000 đ", "ui",
         w=300, h=76, size=14.2)
    arrow(c, [(525, 730), (355, 730)])
    alabel(c, 440, 708, "Chưa")
    arrow(c, [(205, 688), (205, 640), (385, 640)])
    alabel(c, 255, 616, "thử lại", size=13.5)

    # continue watching: merge into the existing loop without a second arrowhead
    c.line((1015, 978), (1280, 978), color=GREY, width=1.8)
    c.line((1280, 978), (1280, 540), color=GREY, width=1.8)
    alabel(c, 1220, 956, "vòng theo dõi", size=13.5)

    act_legend(c)
    caption(c, "UC-05 · Nghe thuyết minh theo GPS — quyền ngôn ngữ do server kiểm tra trước khi trả audioUrl; TTS chỉ là dự phòng.", 1032)
    c.save("hinh_3_12_activity_gps.png")


def fig_activity_publish():
    c = Canvas(1500, 1025)
    cx = 700
    start(c, cx, 45)
    node(c, cx, 108, "ADMIN/STAFF mở trang đăng nhập", "admin")
    node(c, cx, 182, "POST /auth/login → JWT 12 giờ", "api")
    decision(c, cx, 276, "Hợp lệ & đúng vai trò?")
    node(c, cx, 380, "Tạo địa điểm DRAFT", "admin")
    node(c, cx, 454, "Thêm bản dịch vi + en/zh/ko/ja", "admin")
    node(c, cx, 528, "Upload ảnh + audio hoặc TTS", "admin")
    node(c, cx, 602, "Tạo QR cho địa điểm", "admin")
    node(c, cx, 676, "Rà checklist: bản dịch, toạ độ, zone,\nảnh, audio, QR", "admin")
    decision(c, cx, 770, "Sẵn sàng công bố?")
    node(c, cx, 870, "PATCH status PUBLISHED →\nxuất hiện /places, /nearby, mở từ QR", "api")
    node(c, cx, 944, "Dashboard ghi nhận; khách xem/nghe", "ui")
    end(c, cx, 996)

    for y1, y2 in [(61, 75), (141, 149), (215, 226), (326, 347), (413, 421),
                   (487, 495), (561, 569), (635, 643), (709, 720), (820, 837),
                   (903, 911)]:
        arrow(c, [(cx, y1), (cx, y2)])
    alabel(c, 750, 332, "Có")
    alabel(c, 750, 826, "Có")

    node(c, 210, 276, "401/403 → quay lại đăng nhập", "ui",
         w=300, h=76, size=14.2)
    arrow(c, [(525, 276), (360, 276)])
    alabel(c, 440, 254, "Không")
    arrow(c, [(210, 238), (210, 108), (390, 108)])
    alabel(c, 280, 84, "thử lại")

    node(c, 210, 770, "Lưu DRAFT,\ntiếp tục biên tập", "ui", w=300, h=76, size=14.2)
    arrow(c, [(525, 770), (360, 770)])
    alabel(c, 440, 748, "Chưa")
    arrow(c, [(210, 732), (210, 380), (390, 380)])
    alabel(c, 270, 690, "chưa đạt", size=13.5)

    act_legend(c)
    note(c, 1080, 250, 380, 170,
         "Backend không chặn cứng việc chuyển PUBLISHED: checklist là quy trình biên tập. Nếu thiếu bản dịch của ngôn ngữ đang chọn, placeService fallback sang bản giàu nội dung nhất.")
    caption(c, "UC-09/UC-14 · Công bố địa điểm — JWT và vai trò được kiểm tra ở mọi bước ghi dữ liệu.", 1018)
    c.save("hinh_3_13_activity_publish.png")


if __name__ == "__main__":
    fig_activity_search()
    fig_activity_unlock()
    fig_activity_qr()
    fig_activity_gps()
    fig_activity_publish()
