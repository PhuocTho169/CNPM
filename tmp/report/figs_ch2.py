"""Chapter 2 figures: context, decomposition, use cases, activities."""

from figlib import (Canvas, NAVY, NAVY_D, BLUE, INDIGO, TEAL, LIGHT, LIGHT2, BORDER,
                    GREY, DARK, WHITE, ACCENT)


# ----------------------------------------------------------------- 2.1 context
def fig_context():
    c = Canvas(1240, 760)
    sx, sy, sw, sh = 440, 250, 360, 220
    c.rect(sx, sy, sw, sh, fill=LIGHT, outline=NAVY, width=3, radius=10)
    c.text_box(sx + sw / 2, sy + 70,
               "Hệ thống thuyết minh tự động\nđa ngôn ngữ cho du lịch ẩm thực Quận 4",
               21, color=NAVY_D, bold=True, max_width=320)
    c.text_box(sx + sw / 2, sy + 155, "(Website React · API Node.js/Express · PostgreSQL)",
               15, color=GREY, italic=True, max_width=330)

    # actors (left)
    c.actor(150, 150, "Khách du lịch")
    c.actor(150, 560, "Quản trị viên /\nNhân viên nội dung")

    # external systems (right)
    c.rect(1000, 110, 215, 90, fill=LIGHT2, outline=BLUE, width=2, radius=8)
    c.text_box(1107, 155, "Dịch vụ TTS\n(Google Translate TTS,\nEdge TTS, ElevenLabs)",
               15, color=NAVY_D, bold=True, max_width=200)
    c.rect(1000, 550, 215, 90, fill=LIGHT2, outline=GREY, width=2, radius=8)
    c.dashed_rect(1000, 550, 215, 90, color=GREY, width=2, dash=6, gap=5)
    c.text_box(1107, 595, "Cổng thanh toán\n(VNPay / MoMo)\n[dự kiến]",
               15, color=GREY, bold=True, max_width=200)

    # visitor -> system / system -> visitor
    c.arrow([(215, 135), (350, 135), (350, 290), (436, 290)], color=BLUE, width=2,
            label="Yêu cầu trang địa điểm /\nmón ăn, chọn ngôn ngữ", label_pos=(352, 200),
            label_size=14, label_color=DARK)
    c.arrow([(436, 370), (350, 370), (350, 200), (215, 200)], color=TEAL, width=2,
            label="Nội dung đa ngữ,\ntệp audio, QR", label_pos=(360, 305),
            label_size=14, label_color=DARK)

    # admin -> system / system -> admin
    c.arrow([(215, 545), (350, 545), (350, 450), (436, 450)], color=BLUE, width=2,
            label="Địa điểm, món ăn, bản dịch,\nảnh, tệp audio", label_pos=(348, 505),
            label_size=14, label_color=DARK)
    c.arrow([(436, 410), (300, 410), (300, 520), (215, 520)], color=TEAL, width=2,
            label="Danh sách, thống kê\nquét và lượt nghe", label_pos=(300, 455),
            label_size=14, label_color=DARK, label_bg=WHITE)

    # system <-> tts
    c.arrow([(800, 300), (905, 300), (905, 165), (996, 165)], color=INDIGO, width=2,
            label="Văn bản thuyết minh\n+ mã ngôn ngữ", label_pos=(905, 245),
            label_size=14, label_color=DARK)
    c.arrow([(996, 195), (905, 195), (905, 330), (804, 330)], color=INDIGO, width=2,
            label="Tệp MP3", label_pos=(870, 350), label_size=14, label_color=DARK)

    # system <-> payment (design only)
    c.arrow([(800, 420), (905, 420), (905, 545), (996, 545)], color=GREY, width=2, dashed=True,
            label="Yêu cầu thanh toán\n(thiết kế)", label_pos=(905, 480),
            label_size=14, label_color=GREY)
    c.arrow([(996, 615), (905, 615), (905, 450), (804, 450)], color=GREY, width=2, dashed=True,
            label="Kết quả giao dịch\n(thiết kế)", label_pos=(918, 640),
            label_size=14, label_color=GREY)

    c.text(30, 726, "Chú thích: đường liền = luồng đã triển khai; đường nét đứt = thiết kế chưa triển khai.",
           15, color=GREY, italic=True)
    c.save("hinh_2_1_context.png")


# ------------------------------------------------- 2.2 functional decomposition
def fig_decomposition():
    c = Canvas(1320, 800)
    c.rect(400, 12, 520, 46, fill=NAVY, outline=NAVY, radius=8)
    c.text_box(660, 35, "HỆ THỐNG THUYẾT MINH TỰ ĐỘNG ĐA NGÔN NGỮ QUẬN 4",
               18, color=WHITE, bold=True, max_width=500)

    groups = [
        ("1. Tra cứu và\nthuyết minh", [
            "Xem danh sách, tìm kiếm địa điểm",
            "Xem chi tiết địa điểm",
            "Xem chi tiết món ăn",
            "Chọn ngôn ngữ thuyết minh",
            "Phát tệp audio / giọng trình duyệt",
        ]),
        ("2. Quản lý nội dung\nẩm thực", [
            "Quản lý địa điểm (CRUD)",
            "Quản lý món ăn (CRUD)",
            "Quản lý danh mục",
            "Quản lý tuyến ẩm thực",
            "Quản lý ảnh địa điểm / món ăn",
        ]),
        ("3. Quản lý đa ngôn ngữ\nvà audio", [
            "Quản lý ngôn ngữ, BCP-47, giọng đọc",
            "Quản lý bản dịch địa điểm",
            "Quản lý bản dịch món ăn",
            "Tạo giọng đọc TTS",
            "Tải lên / xoá tệp audio",
        ]),
        ("4. QR và thống kê", [
            "Tạo, làm lại QR địa điểm",
            "Tạo, làm lại QR món ăn",
            "Thống kê lượt quét",
            "Thống kê lượt nghe theo ngôn ngữ",
            "Thống kê theo thiết bị",
        ]),
        ("5. Quyền truy cập\nvà thanh toán", [
            "Phiên khách (guest session)",
            "Ngôn ngữ miễn phí (1 lần)",
            "Gói ngôn ngữ và giao dịch",
            "Webhook và chống trùng lặp",
            "Kiểm tra quyền khi tải nội dung",
        ]),
    ]
    partial = {("5. Quyền truy cập\nvà thanh toán", "Gói ngôn ngữ và giao dịch"),
               ("5. Quyền truy cập\nvà thanh toán", "Webhook và chống trùng lặp"),
               ("5. Quyền truy cập\nvà thanh toán", "Kiểm tra quyền khi tải nội dung")}

    col_x = [40, 296, 552, 808, 1064]
    gw = 232
    for gi, (gname, leaves) in enumerate(groups):
        gx = col_x[gi]
        c.arrow([(660, 60), (660, 96), (gx + gw / 2, 96), (gx + gw / 2, 128)], color=NAVY, width=2)
        c.rect(gx, 128, gw, 62, fill=LIGHT, outline=NAVY, width=2, radius=7)
        c.text_box(gx + gw / 2, 159, gname, 16, color=NAVY_D, bold=True, max_width=gw - 14)
        prev_y = 190
        for li, leaf in enumerate(leaves):
            y = 216 + li * 84
            is_partial = (gname, leaf) in partial
            c.line((gx + gw / 2, prev_y), (gx + gw / 2, y), color=NAVY, width=1)
            fill = (250, 246, 240) if is_partial else WHITE
            c.rect(gx, y, gw, 62, fill=fill, outline=BORDER, width=1, radius=5)
            c.text_box(gx + gw / 2, y + 31, leaf, 14, color=DARK, bold=False, max_width=gw - 16)
            if is_partial:
                c.text(gx + gw - 16, y + 10, "◐", 14, color=ACCENT, bold=True, anchor="mm")
            prev_y = y

    c.text(40, 762, "Chú thích:", 15, color=GREY, bold=True)
    c.rect(126, 750, 22, 22, fill=WHITE, outline=BORDER, width=1)
    c.text(156, 761, "chức năng đã triển khai trong mã nguồn", 15, color=GREY, anchor="lm")
    c.rect(470, 750, 22, 22, fill=(250, 246, 240), outline=BORDER, width=1)
    c.text(478, 761, "◐", 14, color=ACCENT, bold=True, anchor="mm")
    c.text(500, 761, "triển khai một phần (chưa nối vào tuyến API / chưa có giao diện)", 15, color=GREY, anchor="lm")
    c.save("hinh_2_2_phan_ra.png")


# ------------------------------------------------------------- 2.3 use case overall
def _uc(c, cx, cy, text, planned=False, rx=112, ry=40):
    c.ellipse(cx, cy, rx, ry, fill=(250, 246, 240) if planned else WHITE,
              outline=GREY if planned else NAVY, width=2)
    if planned:
        c.dashed_rect(cx - rx, cy - ry, rx * 2, ry * 2, color=GREY, width=1, dash=5, gap=4)
    c.text_box(cx, cy, text, 13.5, color=GREY if planned else NAVY_D, bold=False, max_width=rx * 2 - 20, line_gap=1.15)


def fig_usecase_overall():
    c = Canvas(1400, 900)
    c.rect(390, 40, 700, 800, fill=(252, 253, 255), outline=NAVY, width=2)
    c.text_box(740, 66, "Hệ thống thuyết minh tự động đa ngôn ngữ cho du lịch ẩm thực Quận 4",
               16, color=NAVY_D, bold=True, max_width=660)

    c.text_box(570, 104, "Nhóm chức năng cho khách du lịch", 14, color=BLUE, bold=True)
    c.text_box(912, 104, "Nhóm chức năng quản trị", 14, color=BLUE, bold=True)

    visitor = [
        ("Tra cứu địa điểm ẩm thực", 150),
        ("Xem chi tiết địa điểm", 240),
        ("Xem chi tiết món ăn", 330),
        ("Quét mã QR", 420),
        ("Chọn ngôn ngữ thuyết minh", 510),
        ("Nghe thuyết minh (audio)", 600),
    ]
    admin = [
        ("Đăng nhập quản trị", 150),
        ("Quản lý địa điểm", 232),
        ("Quản lý món ăn", 314),
        ("Quản lý bản dịch đa ngữ", 396),
        ("Quản lý ngôn ngữ", 478),
        ("Quản lý audio và TTS", 560),
        ("Quản lý mã QR", 642),
        ("Xem thống kê", 724),
    ]
    for name, y in visitor:
        _uc(c, 570, y, name)
    for name, y in admin:
        _uc(c, 915, y, name)
    _uc(c, 860, 806, "Mở khoá ngôn ngữ bằng thanh toán", planned=True, rx=126, ry=34)

    # actors
    c.actor(180, 380, "Khách du lịch", label_size=17)
    c.actor(180, 700, "Quản trị viên /\nNhân viên", label_size=17)
    c.actor(1265, 320, "Dịch vụ TTS", label_size=17)
    c.actor(1265, 640, "Cổng thanh toán\n[dự kiến]", label_size=16)

    for _, y in visitor:
        c.line((205, 380), (458, y), color=BLUE, width=1)
    for name, y in admin:
        c.line((205, 690), (803, y), color=BLUE, width=1)
    c.line((1130, 320), (1023, 600), color=INDIGO, width=2)

    # include / extend
    c.arrow([(570, 458), (570, 448), (570, 280)], color=NAVY, width=2, dashed=True,
            label="«include»", label_pos=(598, 366), label_size=13)
    c.arrow([(620, 612), (700, 520), (682, 528)], color=GREY, width=1, dashed=True,
            label="«include»", label_pos=(700, 585), label_size=13)

    # planned payment relation
    c.arrow([(1200, 646), (990, 800)], color=GREY, width=2, dashed=True,
            label="«dự kiến»", label_pos=(1128, 742), label_size=13, label_color=GREY)

    c.text(390, 862, "Chú thích: nét đứt + nền xám = chức năng đã có thiết kế/mã nguồn một phần nhưng chưa hoạt động đầu-cuối.",
           14, color=GREY, italic=True)
    c.save("hinh_2_3_usecase_tong_quat.png")


# ------------------------------------------------------- 2.4 use case detail: visitor
def fig_usecase_visitor():
    c = Canvas(1280, 760)
    c.rect(320, 40, 620, 660, fill=(252, 253, 255), outline=NAVY, width=2)
    c.text_box(630, 66, "Phân hệ khách du lịch (website và ứng dụng di động)", 15,
               color=NAVY_D, bold=True, max_width=580)

    items = [
        ("Quét mã QR tại địa điểm", 140),
        ("Xem trang hướng dẫn địa điểm", 250),
        ("Xem chi tiết món ăn", 360),
        ("Chọn ngôn ngữ thuyết minh", 470),
        ("Phát audio thuyết minh", 580),
    ]
    for name, y in items:
        _uc(c, 630, y, name, rx=118, ry=38)

    _uc(c, 950, 200, "Ghi nhận lượt quét\n(scan_logs)", rx=92, ry=38)
    _uc(c, 950, 640, "Tải tệp audio\n(/uploads/audio)", rx=92, ry=38)

    c.actor(150, 300, "Khách du lịch")
    c.actor(1130, 200, "Dịch vụ TTS", label_size=16)
    c.actor(150, 600, "Trình duyệt /\nthiết bị di động", label_size=16)

    c.line((205, 300), (512, 140), color=BLUE, width=1)
    c.line((205, 310), (512, 250), color=BLUE, width=1)
    c.line((205, 330), (512, 360), color=BLUE, width=1)
    c.line((205, 350), (512, 470), color=BLUE, width=1)
    c.line((205, 370), (512, 580), color=BLUE, width=1)

    c.arrow([(630, 178), (630, 212)], color=NAVY, width=1.5, dashed=True)
    c.text_box(676, 195, "«include»", 12, color=NAVY)
    c.arrow([(700, 140), (858, 172)], color=GREY, width=1.5, dashed=True,
            label="«include»", label_pos=(790, 145), label_size=12)

    c.arrow([(640, 500), (700, 545), (740, 560)], color=GREY, width=1.5, dashed=True,
            label="«extend»", label_pos=(688, 520), label_size=12)
    c.arrow([(748, 580), (880, 615)], color=INDIGO, width=1.5, dashed=True,
            label="«include»", label_pos=(812, 590), label_size=12)
    c.line((1085, 210), (1042, 205), color=INDIGO, width=2)

    c.text(30, 726, "«include»: hành vi bắt buộc đi kèm. «extend»: hành vi tuỳ chọn (người dùng có thể chỉ đọc nội dung).",
           14, color=GREY, italic=True)
    c.save("hinh_2_4_usecase_khach.png")


# -------------------------------------------------------- 2.5 use case detail: admin
def fig_usecase_admin():
    c = Canvas(1280, 820)
    c.rect(300, 40, 660, 720, fill=(252, 253, 255), outline=NAVY, width=2)
    c.text_box(630, 66, "Phân hệ quản trị nội dung", 15, color=NAVY_D, bold=True)

    top = [("Đăng nhập quản trị", 130), ("Quản lý địa điểm", 240), ("Quản lý món ăn", 350),
           ("Quản lý ngôn ngữ", 460), ("Quản lý audio / TTS", 570), ("Quản lý mã QR", 680),
           ("Xem thống kê", 760)]
    for name, y in top:
        _uc(c, 560, y, name, rx=112, ry=36)
    _uc(c, 900, 190, "Quản lý bản dịch địa điểm\n(đa ngôn ngữ)", rx=104, ry=40)
    _uc(c, 900, 300, "Quản lý ảnh địa điểm", rx=100, ry=36)
    _uc(c, 900, 350, "Quản lý bản dịch món ăn", rx=104, ry=36)
    _uc(c, 900, 620, "Tải tệp / tạo giọng đọc", rx=104, ry=36)

    c.actor(140, 320, "Quản trị viên\n(ADMIN)")
    c.actor(140, 620, "Nhân viên\n(STAFF)", label_size=16)
    c.actor(1150, 620, "Dịch vụ TTS", label_size=16)

    for _, y in top:
        c.line((205, 320), (448, y), color=BLUE, width=1)
    for _, y in [(None, 190), (None, 300), (None, 350)]:
        c.line((205, 320), (796, y), color=BLUE, width=1)
    c.line((205, 620), (448, 680), color=TEAL, width=1)
    c.line((205, 620), (448, 240), color=TEAL, width=1)
    c.line((205, 620), (448, 350), color=TEAL, width=1)

    c.arrow([(672, 240), (760, 220), (792, 200)], color=NAVY, width=1.5, dashed=True,
            label="«include»", label_pos=(742, 210), label_size=12)
    c.arrow([(660, 258), (780, 290), (800, 300)], color=GREY, width=1.5, dashed=True,
            label="«include»", label_pos=(742, 292), label_size=12)
    c.arrow([(672, 355), (792, 352)], color=NAVY, width=1.5, dashed=True,
            label="«include»", label_pos=(734, 340), label_size=12)
    c.arrow([(660, 585), (790, 606)], color=NAVY, width=1.5, dashed=True,
            label="«include»", label_pos=(726, 582), label_size=12)
    c.line((1105, 620), (1004, 620), color=INDIGO, width=2)

    c.text(30, 790, "ADMIN có toàn bộ quyền; STAFF bị chặn ở nhóm người dùng, phân quyền và cấu hình hệ thống (middleware requireRole).",
           14, color=GREY, italic=True)
    c.save("hinh_2_5_usecase_quantri.png")


# ------------------------------------------------------------------ activities
def _act(c, cx, cy, text, kind="normal", w=300, h=52, size=14):
    if kind == "start":
        c.ellipse(cx, cy, 16, 16, fill=NAVY, outline=NAVY, width=1)
        return
    if kind == "end":
        c.ellipse(cx, cy, 19, 19, fill=WHITE, outline=NAVY, width=3)
        c.ellipse(cx, cy, 11, 11, fill=NAVY, outline=NAVY, width=1)
        return
    if kind == "decision":
        pts = [(cx, cy - h / 2), (cx + w / 2, cy), (cx, cy + h / 2), (cx - w / 2, cy), (cx, cy - h / 2)]
        c.d.polygon([c._p(p) for p in pts], fill=LIGHT, outline=NAVY, width=2)
        c.text_box(cx, cy, text, size, color=NAVY_D, bold=True, max_width=w - 40, line_gap=1.1)
        return
    c.rect(cx - w / 2, cy - h / 2, w, h, fill=LIGHT, outline=NAVY, width=2, radius=9)
    c.text_box(cx, cy, text, size, color=NAVY_D, bold=False, max_width=w - 22, line_gap=1.12)


def fig_activity_qr():
    c = Canvas(760, 980)
    cx = 380
    steps = [
        ("start", None, 60),
        ("normal", "Khách mở trang web hoặc\nứng dụng và chọn quét QR", 120),
        ("normal", "Cấp quyền camera và đọc mã", 215),
        ("decision", "Giải mã được\nmã QR hợp lệ?", 320),
        ("normal", "Trích xuất place_id từ URL\n(…/place/{id}) và điều hướng", 425),
        ("normal", "GET /api/places/{id}/guide?lang=…", 520),
        ("decision", "HTTP 200 và\nđịa điểm tồn tại?", 625),
        ("normal", "Hiển thị thông tin, bản dịch,\naudio và bản đồ", 730),
        ("normal", "POST /api/places/{id}/scan\n+ POST /api/history", 825),
        ("end", None, 915),
    ]
    for kind, text, y in steps:
        _act(c, cx, y, text, kind, w=330, h=58)
    for i in range(len(steps) - 1):
        y1 = steps[i][2] + (16 if steps[i][0] == "start" else (19 if steps[i][0] == "end" else (29 if steps[i][0] == "decision" else 29)))
        y2 = steps[i + 1][2] - (19 if steps[i + 1][0] == "end" else (16 if steps[i + 1][0] == "start" else (29 if steps[i + 1][0] == "decision" else 29)))
        c.arrow([(cx, y1), (cx, y2)], color=NAVY, width=2)

    c.text(400, 322, "Không", 14, color=ACCENT, bold=True)
    c.arrow([(545, 320), (650, 320), (650, 400)], color=ACCENT, width=2)
    c.rect(505, 385, 290, 62, fill=(253, 242, 236), outline=ACCENT, width=2, radius=8)
    c.text_box(650, 416, "Thông báo “mã QR không hợp lệ”\nhoặc mở liên kết ngoài", 14, color=ACCENT, max_width=270)
    c.arrow([(650, 447), (650, 500), (545, 700)], color=ACCENT, width=2, dashed=True)
    c.text(560, 700, "kết thúc", 13, color=ACCENT, italic=True)

    c.text(400, 627, "Không", 14, color=ACCENT, bold=True)
    c.arrow([(545, 625), (640, 625), (640, 662)], color=ACCENT, width=2)
    c.rect(500, 662, 230, 58, fill=(253, 242, 236), outline=ACCENT, width=2, radius=8)
    c.text_box(615, 691, "Hiển thị lỗi 404\nvà liên kết quay lại", 14, color=ACCENT, max_width=210)
    c.arrow([(615, 720), (615, 760), (545, 780)], color=ACCENT, width=2, dashed=True)

    c.text(30, 948, "Ghi chú: nhánh nét đứt là luồng ngoại lệ; trang vẫn ghi log quét khi yêu cầu thành công.",
           13, color=GREY, italic=True)
    c.save("hinh_2_6_activity_qr.png")


def fig_activity_language():
    c = Canvas(780, 900)
    cx = 300
    steps = [
        ("start", None, 55),
        ("normal", "Khách chọn ngôn ngữ trên\ntrang hướng dẫn", 110),
        ("normal", "Tải lại trang với\ntham số ?lang=<mã>", 205),
        ("decision", "Có bản dịch cho\nngôn ngữ này?", 305),
        ("decision", "Bản dịch đã có\ntệp audio?", 410),
        ("normal", "Phát tệp MP3 từ\n/uploads/audio", 515),
        ("end", None, 615),
    ]
    for kind, text, y in steps:
        _act(c, cx, y, text, kind, w=320, h=58)
    for i in range(len(steps) - 1):
        y1 = steps[i][2] + (16 if steps[i][0] == "start" else (19 if steps[i][0] == "end" else (29 if steps[i][0] == "decision" else 29)))
        y2 = steps[i + 1][2] - (19 if steps[i + 1][0] == "end" else (16 if steps[i + 1][0] == "start" else (29 if steps[i + 1][0] == "decision" else 29)))
        c.arrow([(cx, y1), (cx, y2)], color=NAVY, width=2)

    # no translation -> fallback
    c.arrow([(460, 305), (585, 305), (585, 350)], color=ACCENT, width=2)
    c.text(486, 288, "Không", 13, color=ACCENT, bold=True)
    c.rect(470, 350, 280, 62, fill=(253, 242, 236), outline=ACCENT, width=2, radius=8)
    c.text_box(610, 381, "Dùng bản dịch dự phòng\n(ngôn ngữ đầu tiên có audio)", 13.5, color=ACCENT, max_width=260)
    c.arrow([(610, 412), (610, 440), (460, 440)], color=ACCENT, width=2, dashed=True)

    # no audio -> browser tts
    c.arrow([(460, 410), (700, 410), (700, 470)], color=BLUE, width=2)
    c.text(470, 393, "Chưa có", 13, color=BLUE, bold=True)
    c.rect(540, 470, 220, 86, fill=(238, 245, 250), outline=BLUE, width=2, radius=8)
    c.text_box(650, 513, "Phát bằng giọng trình duyệt\n(speechSynthesis, locale=bcl)\n+ tạo TTS nền cho lần sau", 13, color=NAVY_D, max_width=200)
    c.arrow([(650, 556), (650, 590), (460, 600)], color=BLUE, width=2, dashed=True)

    c.text(30, 868, "Nhánh phải: ngôn ngữ chưa có bản dịch hoặc chưa có tệp audio — người dùng vẫn nghe được nội dung.",
           13, color=GREY, italic=True)
    c.save("hinh_2_7_activity_ngon_ngu.png")


def fig_activity_access():
    c = Canvas(900, 820)
    cx = 300
    steps = [
        ("start", None, 50),
        ("normal", "Yêu cầu nội dung theo ngôn ngữ\n(GET …/audio?language=…)", 105),
        ("decision", "Có guest session\nhợp lệ?", 205),
        ("decision", "Ngôn ngữ nằm trong\nquyền miễn phí?", 305),
        ("decision", "Có quyền đã mua\nhoặc gói mở mọi ngôn ngữ?", 405),
        ("normal", "Trả nội dung và tệp audio", 505),
        ("end", None, 600),
    ]
    for kind, text, y in steps:
        _act(c, cx, y, text, kind, w=330, h=58)
    for i in range(len(steps) - 1):
        y1 = steps[i][2] + (16 if steps[i][0] == "start" else (19 if steps[i][0] == "end" else (29 if steps[i][0] == "decision" else 29)))
        y2 = steps[i + 1][2] - (19 if steps[i + 1][0] == "end" else (16 if steps[i + 1][0] == "start" else (29 if steps[i + 1][0] == "decision" else 29)))
        c.arrow([(cx, y1), (cx, y2)], color=NAVY, width=2)

    reject_y = [205, 305, 405]
    for i, y in enumerate(reject_y):
        c.arrow([(465, y), (700, y)], color=ACCENT, width=2)
        c.text(487, y - 16, "Không", 12.5, color=ACCENT, bold=True)
    c.rect(690, 160, 180, 290, fill=(253, 242, 236), outline=ACCENT, width=2, radius=8)
    c.text_box(780, 240, "HTTP 403\nLANGUAGE_LOCKED", 14, color=ACCENT, bold=True, max_width=160)
    c.text_box(780, 320, "Gợi ý: chọn ngôn ngữ\nmiễn phí hoặc mua gói\nmở khoá", 12.5, color=ACCENT, max_width=155)
    c.text(200, 650, "Trạng thái: thiết kế đã có middleware và bảng dữ liệu,\nchưa gắn vào tuyến nội dung đang phục vụ.",
           13, color=GREY, italic=True)
    c.save("hinh_2_8_activity_quyen.png")


def fig_activity_admin():
    c = Canvas(820, 950)
    cx = 300
    steps = [
        ("start", None, 50),
        ("normal", "Đăng nhập /admin/login\n→ nhận JWT", 105),
        ("normal", "Mở danh sách địa điểm,\nchọn bản ghi cần sửa", 200),
        ("normal", "Cập nhật thông tin địa điểm\n(địa chỉ, giờ mở cửa, vùng GPS)", 295),
        ("normal", "Nhập bản dịch cho từng ngôn ngữ\n(tên, mô tả, lịch sử, mẹo)", 390),
        ("decision", "Cần audio cho\nbản dịch?", 490),
        ("normal", "Tải tệp MP3 lên hoặc\ngọi POST /api/tts", 595),
        ("normal", "Lưu thay đổi\n(POST/PUT …/translations)", 690),
        ("normal", "Xuất bản và tạo QR\nPATCH …/status, POST …/qr", 785),
        ("end", None, 880),
    ]
    for kind, text, y in steps:
        _act(c, cx, y, text, kind, w=340, h=58)
    for i in range(len(steps) - 1):
        y1 = steps[i][2] + (16 if steps[i][0] == "start" else (19 if steps[i][0] == "end" else (29 if steps[i][0] == "decision" else 29)))
        y2 = steps[i + 1][2] - (19 if steps[i + 1][0] == "end" else (16 if steps[i + 1][0] == "start" else (29 if steps[i + 1][0] == "decision" else 29)))
        c.arrow([(cx, y1), (cx, y2)], color=NAVY, width=2)
    c.text(325, 545, "Có", 13, color=BLUE, bold=True)
    c.arrow([(465, 490), (760, 490), (760, 690), (475, 690)], color=GREY, width=2)
    c.text(492, 473, "Không", 13, color=GREY, bold=True)
    c.text(200, 920, "Màn hình quản trị hiện có 5 thẻ: Thông tin · Bản dịch · Món ăn · Hình ảnh · QR.",
           13, color=GREY, italic=True)
    c.save("hinh_2_9_activity_quantri.png")


if __name__ == "__main__":
    print("Chapter 2 figures:")
    fig_context()
    fig_decomposition()
    fig_usecase_overall()
    fig_usecase_visitor()
    fig_usecase_admin()
    fig_activity_qr()
    fig_activity_language()
    fig_activity_access()
    fig_activity_admin()
