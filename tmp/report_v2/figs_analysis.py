"""Chapter 3 analysis figures: context, functional tree, use-case diagrams."""

from figlib import (Canvas, NAVY, NAVY_D, BLUE, INDIGO, TEAL, LIGHT, LIGHT2, BORDER,
                    GREY, DARK, WHITE, ACCENT)
from figs_common import footer, uml_uc, relation


def fig_context():
    c = Canvas(1480, 880)
    bx, by, bw, bh = 460, 140, 540, 620
    c.rect(bx, by, bw, bh, fill=(252, 253, 255), outline=NAVY, width=3, radius=12)
    c.text_box(bx + bw / 2, by + 28, "HỆ THỐNG HƯỚNG DẪN ẨM THỰC ĐA NGÔN NGỮ QUẬN 4", 17.5,
               color=NAVY_D, bold=True, max_width=bw - 30)

    inner = [
        ("Website khách · Trang quản trị · Ứng dụng Expo", 225, 58, (240, 245, 251)),
        ("REST API Express 4 — 88 endpoint", 297, 52, WHITE),
        ("Dịch vụ địa điểm · bản dịch · audio · quyền · thống kê", 363, 58, (240, 245, 251)),
        ("PostgreSQL 12 bảng + thư mục uploads", 435, 52, WHITE),
    ]
    for text, y, h, fill in inner:
        c.rect(bx + 28, y, bw - 56, h, fill=fill, outline=BORDER, width=1, radius=6)
        c.text_box(bx + bw / 2, y + h / 2, text, 15.3, color=DARK, bold=False, max_width=bw - 80)

    c.text_box(bx + bw / 2, 522, "Phiên khách 90 ngày · 2 ngôn ngữ miễn phí",
               14.3, color=GREY, italic=True, max_width=bw - 40)
    c.text_box(bx + bw / 2, 550, "Checkout sandbox 20.000 đ mở toàn bộ ngôn ngữ",
               14.3, color=GREY, italic=True, max_width=bw - 40)
    c.text(bx + 16, by + bh - 16, "system boundary", 12.5, color=GREY, italic=True)

    c.actor(150, 300, "Khách du lịch")
    c.actor(150, 640, "Quản trị viên /\nNhân viên nội dung", label_size=15)

    gap_l, gap_r = 205, 456
    mid = (gap_l + gap_r) / 2

    # visitor <-> system (labels placed in the left gap with wrapping)
    c.arrow([(gap_l, 292), (gap_r, 292)], color=BLUE, width=2)
    c.text_box(mid, 250, "Tìm quán, chọn ngôn ngữ, quét QR,\nthanh toán 20.000 đ (sandbox)",
               13.4, color=DARK, max_width=245, line_gap=1.2)
    c.arrow([(gap_r, 390), (gap_l, 390)], color=TEAL, width=2)
    c.text_box(mid, 432, "Nội dung đa ngữ, audio, mã QR,\ntrạng thái mở khoá",
               13.4, color=DARK, max_width=245, line_gap=1.2)

    # admin <-> system
    c.arrow([(gap_l, 650), (gap_r, 650)], color=BLUE, width=2)
    c.text_box(mid, 608, "Địa điểm, món ăn, bản dịch,\naudio, tuyến, người dùng",
               13.4, color=DARK, max_width=245, line_gap=1.2)
    c.arrow([(gap_r, 715), (gap_l, 715)], color=TEAL, width=2)
    c.text_box(mid, 744, "Số liệu quét, lượt nghe,",
               13.4, color=DARK, max_width=245)
    c.text_box(mid, 766, "người đang truy cập",
               13.4, color=DARK, max_width=245)

    # external services
    c.rect(1190, 230, 250, 100, fill=WHITE, outline=INDIGO, width=2, radius=8)
    c.text_box(1315, 258, "Dịch vụ TTS", 17.5, color=NAVY_D, bold=True)
    c.text_box(1315, 292, "Google / Edge / ElevenLabs\n(tuỳ chọn, có fallback)", 13.4, color=GREY,
               max_width=225, line_gap=1.2)
    c.arrow([(bx + bw, 288), (1186, 288)], color=INDIGO, width=2)
    c.text_box(1088, 258, "văn bản +\nmã ngôn ngữ", 12.8, color=DARK, max_width=150, line_gap=1.15)
    c.arrow([(1186, 320), (bx + bw, 320)], color=INDIGO, width=2, dashed=True)
    c.text_box(1088, 346, "tệp MP3", 12.8, color=DARK, max_width=150)

    c.rect(1190, 560, 250, 100, fill=WHITE, outline=GREY, width=2, radius=8)
    c.text_box(1315, 586, "Thiết bị của khách", 17.5, color=NAVY_D, bold=True)
    c.text_box(1315, 620, "Camera quét QR · GPS\nTrình duyệt / Expo", 13.4, color=GREY,
               max_width=225, line_gap=1.2)
    c.arrow([(1186, 610), (bx + bw, 610)], color=GREY, width=2, dashed=True)
    c.text_box(1088, 578, "toạ độ GPS,\nảnh QR", 12.8, color=DARK, max_width=150, line_gap=1.15)

    c.text_box(740, 830,
               "Chú thích: nét liền = luồng đã triển khai; nét đứt = phụ thuộc thiết bị/dịch vụ ngoài. "
               "Cổng thanh toán thật chưa tích hợp — checkout hiện là sandbox nội bộ.",
               14.3, color=GREY, italic=True, max_width=1370)
    c.save("hinh_3_1_context.png")


def fig_decomposition():
    c = Canvas(1420, 880)
    c.rect(430, 14, 560, 56, fill=NAVY, outline=NAVY, width=1, radius=8)
    c.text_box(710, 42, "HỆ THỐNG HƯỚNG DẪN ẨM THỰC ĐA NGÔN NGỮ QUẬN 4", 16.5,
               color=WHITE, bold=True, max_width=530)

    groups = [
        ("1 · Khám phá", BLUE, [
            ("UC-01", "Tra cứu địa điểm"),
            ("UC-02", "Xem hướng dẫn địa điểm"),
            ("UC-07", "Xem tuyến ẩm thực"),
        ]),
        ("2 · Ngôn ngữ & audio", INDIGO, [
            ("UC-03", "Mở khoá ngôn ngữ"),
            ("UC-04", "Quét mã QR"),
            ("UC-05", "Nghe thuyết minh GPS"),
        ]),
        ("3 · Cá nhân", TEAL, [
            ("UC-06", "Yêu thích & lịch sử"),
        ]),
        ("4 · Quản trị nội dung", NAVY, [
            ("UC-09", "Quản lý địa điểm"),
            ("UC-10", "Quản lý món ăn"),
            ("UC-11", "Quản lý bản dịch"),
            ("UC-12", "Quản lý tuyến"),
            ("UC-13", "Danh mục & ngôn ngữ"),
            ("UC-14", "Audio & mã QR"),
        ]),
        ("5 · Hệ thống", ACCENT, [
            ("UC-08", "Đăng nhập quản trị"),
            ("UC-15", "Người dùng & vai trò"),
            ("UC-16", "Dashboard & thống kê"),
        ]),
    ]
    col_x = [20, 295, 570, 845, 1120]
    gw = 260
    c.line((710, 70), (710, 102), color=NAVY, width=2)
    c.line((150, 102), (1250, 102), color=NAVY, width=2)
    for i, (gname, color, leaves) in enumerate(groups):
        gx = col_x[i]
        cx = gx + gw / 2
        c.line((cx, 102), (cx, 132), color=NAVY, width=2)
        c.rect(gx, 132, gw, 58, fill=color, outline=color, width=1, radius=7)
        c.text_box(cx, 161, gname, 15.5, color=WHITE, bold=True, max_width=gw - 20)
        c.text_box(gx + gw - 20, 146, str(len(leaves)), 12.5, color=WHITE, bold=True)
        prev = 190
        for j, (code, name) in enumerate(leaves):
            y = 212 + j * 96
            c.line((cx, prev), (cx, y), color=NAVY, width=1)
            c.rect(gx, y, gw, 76, fill=WHITE, outline=BORDER, width=1, radius=6)
            c.rect(gx, y, 58, 76, fill=(242, 246, 251), outline=BORDER, width=1, radius=6)
            c.text_box(gx + 29, y + 38, code, 12.5, color=color, bold=True, max_width=52)
            c.text_box(gx + 68 + (gw - 78) / 2, y + 38, name, 15.2, color=DARK,
                       max_width=gw - 82, line_gap=1.13)
            prev = y + 76
    c.text_box(710, 826, "16 use case được nhóm theo mục tiêu người dùng và vai trò vận hành; "
                         "mỗi UC có bảng mô tả 11 trường và user story riêng.",
               13.2, color=GREY, italic=True, max_width=1360)
    c.text_box(710, 853, "Nhóm 3 chỉ có một UC vì dữ liệu yêu thích/lịch sử hiện lưu cục bộ trên thiết bị, "
                         "đồng bộ tuỳ chọn qua activity_logs.",
               12.5, color=GREY, italic=True, max_width=1360)
    c.save("hinh_3_2_decomposition.png")


def fig_usecase_overall():
    c = Canvas(1500, 1020)
    c.rect(280, 40, 950, 900, fill=(252, 253, 255), outline=NAVY, width=2)
    c.text_box(755, 68, "Hệ thống hướng dẫn ẩm thực đa ngôn ngữ Quận 4", 18,
               color=NAVY_D, bold=True, max_width=880)
    c.text_box(540, 108, "Phân hệ khách du lịch", 16, color=BLUE, bold=True)
    c.text_box(1000, 108, "Phân hệ quản trị", 16, color=TEAL, bold=True)

    visitor = [
        ("UC-01", "Tra cứu địa điểm"), ("UC-02", "Xem hướng dẫn địa điểm"),
        ("UC-03", "Mở khoá ngôn ngữ"), ("UC-04", "Quét mã QR"),
        ("UC-05", "Nghe thuyết minh GPS"), ("UC-06", "Yêu thích & lịch sử"),
        ("UC-07", "Xem tuyến ẩm thực"),
    ]
    admin = [
        ("UC-08", "Đăng nhập quản trị"), ("UC-09", "Quản lý địa điểm"),
        ("UC-10", "Quản lý món ăn"), ("UC-11", "Quản lý bản dịch"),
        ("UC-12", "Quản lý tuyến"), ("UC-13", "Danh mục & ngôn ngữ"),
        ("UC-14", "Audio & mã QR"), ("UC-15", "Người dùng & vai trò"),
        ("UC-16", "Dashboard & thống kê"),
    ]
    for i, (code, name) in enumerate(visitor):
        uml_uc(c, 540, 176 + i * 112, f"{code}\n{name}", rx=165, ry=44, size=16)
    for i, (code, name) in enumerate(admin):
        uml_uc(c, 1000, 176 + i * 88, f"{code}  {name}", rx=175, ry=37, size=15.5)

    c.actor(125, 480, "Khách du lịch", label_size=16)
    c.actor(1375, 510, "Quản trị viên /\nNhân viên nội dung", label_size=15)
    for i in range(len(visitor)):
        c.line((190, 480), (375, 176 + i * 112), color=BLUE, width=1.3)
    for i in range(len(admin)):
        c.line((1310, 510), (1175, 176 + i * 88), color=TEAL, width=1.3)

    c.text_box(755, 975,
               "Quan hệ «include»/«extend» được tách sang Hình 3.4 (khách) và Hình 3.5 (quản trị) để sơ đồ tổng quát còn đọc được.",
               13, color=GREY, italic=True, max_width=1350)
    c.save("hinh_3_3_usecase_overview.png")


def fig_usecase_visitor():
    c = Canvas(1400, 980)
    c.rect(300, 40, 820, 880, fill=(252, 253, 255), outline=NAVY, width=2)
    c.text_box(710, 68, "Phân hệ khách du lịch — website và ứng dụng di động", 17,
               color=NAVY_D, bold=True, max_width=760)

    main = [
        ("UC-01", "Tra cứu địa điểm", 130),
        ("UC-02", "Xem hướng dẫn địa điểm", 245),
        ("UC-04", "Quét mã QR", 375),
        ("UC-05", "Nghe thuyết minh theo GPS", 490),
        ("UC-06", "Yêu thích & lịch sử", 600),
        ("UC-07", "Xem tuyến ẩm thực", 710),
    ]
    for code, name, y in main:
        uml_uc(c, 610, y, f"{code}\n{name}", rx=155, ry=42, size=16)
    uml_uc(c, 930, 245, "UC-03\nMở khoá ngôn ngữ", rx=135, ry=44, size=15.5,
           fill=(250, 246, 240), outline=ACCENT, color=(105, 70, 35))

    c.actor(140, 430, "Khách du lịch", label_size=16)
    c.actor(1240, 470, "Thiết bị\n(camera, GPS)", label_size=15)

    for _, _, y in main:
        c.line((205, 430), (455, y), color=BLUE, width=1.3)
    c.line((1205, 470), (765, 375), color=GREY, width=1.4)
    c.line((1205, 470), (765, 490), color=GREY, width=1.4)

    relation(c, (610, 333), (610, 287), "include", dashed=True, lx=680, ly=310)
    relation(c, (795, 245), (765, 245), "extend", dashed=True, lx=780, ly=218)

    c.rect(1140, 650, 240, 132, fill=WHITE, outline=INDIGO, width=2, radius=8)
    c.text_box(1260, 676, "Dịch vụ TTS (tuỳ chọn)", 15, color=NAVY_D, bold=True,
               max_width=216)
    c.text_box(1260, 744,
               "Sinh MP3 khi bản dịch chưa có audio;\nlỗi dịch vụ ngoài → fallback nội bộ.",
               13, color=GREY, max_width=212, line_gap=1.25)
    c.arrow([(1136, 716), (765, 508)], color=INDIGO, width=1.5, dashed=True)
    c.text_box(950, 625, "tệp MP3", 12.5, color=DARK, max_width=90)

    c.text_box(700, 950,
               "«include»: UC-04 luôn mở trang hướng dẫn. «extend»: UC-03 chỉ phát sinh khi ngôn ngữ bị khoá. "
               "UC-06 độc lập, dữ liệu yêu thích/lịch sử lưu cục bộ.",
               13, color=GREY, italic=True, max_width=1340)
    c.save("hinh_3_4_usecase_visitor.png")


def fig_usecase_admin():
    c = Canvas(1450, 1020)
    c.rect(300, 40, 850, 880, fill=(252, 253, 255), outline=NAVY, width=2)
    c.text_box(725, 68, "Phân hệ quản trị nội dung và vận hành", 17,
               color=NAVY_D, bold=True, max_width=800)

    main = [
        ("UC-08", "Đăng nhập quản trị", 120),
        ("UC-09", "Quản lý địa điểm", 240),
        ("UC-10", "Quản lý món ăn", 360),
        ("UC-12", "Quản lý tuyến ẩm thực", 480),
        ("UC-13", "Danh mục & ngôn ngữ", 600),
        ("UC-15", "Người dùng & vai trò", 720),
        ("UC-16", "Dashboard & thống kê", 840),
    ]
    for code, name, y in main:
        uml_uc(c, 620, y, f"{code}\n{name}", rx=165, ry=42, size=16)
    uml_uc(c, 990, 270, "UC-11\nQuản lý bản dịch", rx=135, ry=44, size=15.5)
    uml_uc(c, 990, 400, "UC-14\nAudio & mã QR", rx=135, ry=44, size=15.5)

    c.actor(140, 480, "Quản trị viên /\nNhân viên nội dung", label_size=15)
    for _, _, y in main:
        c.line((205, 480), (455, y), color=BLUE, width=1.3)

    relation(c, (785, 250), (855, 262), "include", dashed=True, lx=820, ly=222)
    relation(c, (785, 372), (855, 390), "include", dashed=True, lx=820, ly=342)

    c.text_box(990, 560,
               "UC-11 và UC-14 là use case dùng chung: quản lý địa điểm (UC-09) và quản lý món ăn (UC-10) "
               "đều có thể mở trình quản lý bản dịch, audio, ảnh và mã QR. Sơ đồ chỉ vẽ hai quan hệ đại diện.",
               13.2, color=GREY, italic=True, max_width=250, line_gap=1.3)
    c.text_box(725, 960,
               "Cả ADMIN và STAFF đều đăng nhập được. Chỉ ADMIN được quản lý người dùng (UC-15), xoá địa điểm và thay đổi ngôn ngữ; "
               "STAFF phụ trách nội dung.",
               13, color=GREY, italic=True, max_width=1350)
    c.save("hinh_3_5_usecase_admin.png")


if __name__ == "__main__":
    fig_context()
    fig_decomposition()
    fig_usecase_overall()
    fig_usecase_visitor()
    fig_usecase_admin()
