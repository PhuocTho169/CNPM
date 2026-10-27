"""Chapter 1 figures: product map and delivery roadmap."""

from figlib import Canvas, NAVY, NAVY_D, BLUE, INDIGO, TEAL, LIGHT, LIGHT2, BORDER, GREY, DARK, WHITE, ACCENT
from figs_common import footer, label


def fig_feature_map():
    c = Canvas(1680, 1040)

    card = [
        (90, 100, 470, 250, "1 · Khám phá ẩm thực", BLUE,
         ["Tìm kiếm, lọc quán theo danh mục, giá, giờ mở",
          "Trang hướng dẫn địa điểm, món ăn, tuyến ẩm thực",
          "Bản đồ, chỉ đường và gợi ý quán lân cận"]),
        (1120, 100, 470, 250, "2 · Đa ngôn ngữ & quyền nghe", INDIGO,
         ["5 ngôn ngữ: vi, en, zh, ko, ja",
          "2 ngôn ngữ miễn phí cho mỗi phiên khách",
          "Từ ngôn ngữ thứ 3: 20.000 đ mở toàn bộ (sandbox)"]),
        (90, 650, 470, 250, "3 · QR & thuyết minh theo GPS", TEAL,
         ["QR riêng cho địa điểm và món ăn",
          "Phát hiện vùng bán kính 25–1000 m, trễ 5 giây",
          "Tự phát audio, hàng đợi ưu tiên vùng mới nhất"]),
        (1120, 650, 470, 250, "4 · Quản trị nội dung", NAVY,
         ["Địa điểm, món ăn, danh mục, tuyến và điểm dừng",
          "Bản dịch, ảnh, audio tải lên hoặc TTS, mã QR",
          "Vai trò ADMIN / STAFF, JWT 12 giờ"]),
    ]
    for x, y, w, h, title, color, items in card:
        c.rect(x, y, w, h, fill=WHITE, outline=color, width=2, radius=10)
        c.rect(x, y, w, 48, fill=color, outline=color, width=1, radius=10)
        c.text_box(x + w / 2, y + 25, title, 17, color=WHITE, bold=True, max_width=w - 24)
        yy = y + 82
        for it in items:
            lines = c.wrap(it, w - 76, 14.5)
            c.ellipse(x + 30, yy + 8, 5, 5, fill=color, outline=color, width=1)
            for i, ln in enumerate(lines):
                c.text(x + 46, yy + 8 + i * 22, ln, 14.5, color=DARK, anchor="lm")
            yy += len(lines) * 22 + 20

    # centre
    c.rect(545, 390, 590, 230, fill=(247, 250, 254), outline=NAVY, width=3, radius=14)
    c.text_box(840, 428, "SẢN PHẨM", 14, color=BLUE, bold=True, max_width=200)
    c.text_box(840, 478, "Hệ thống hướng dẫn\nẩm thực đa ngôn ngữ Quận 4", 24, color=NAVY_D, bold=True, max_width=540)
    c.text_box(840, 558, "Website tra cứu · Ứng dụng quét QR & GPS · Trang quản trị", 14, color=GREY,
               italic=True, max_width=540)
    c.text_box(840, 593, "Một nền tảng nội dung, nhiều điểm chạm", 13, color=TEAL, bold=True)

    # connectors
    c.line((560, 390), (470, 330), color=BORDER, width=2)
    c.line((1120, 390), (1210, 330), color=BORDER, width=2)
    c.line((560, 620), (470, 680), color=BORDER, width=2)
    c.line((1120, 620), (1210, 680), color=BORDER, width=2)

    # operating strip
    c.rect(280, 925, 1120, 80, fill=(246, 249, 252), outline=BORDER, width=1, radius=8)
    c.text_box(840, 950, "5 · NỀN TẢNG VẬN HÀNH", 14, color=NAVY, bold=True)
    c.text_box(840, 978,
               "Phiên khách 90 ngày · activity_logs hợp nhất · thống kê 14 ngày · health check · 88 tuyến API",
               13.5, color=DARK, max_width=1060)
    c.line((840, 625), (840, 920), color=NAVY, width=2)

    footer(c, "Hình 1.1 được tổng hợp từ mã nguồn web, mobile, server và 8 migration hiện hành (10/2026).")
    c.save("hinh_1_1_feature_map.png")


def fig_roadmap():
    c = Canvas(1680, 800)
    c.text_box(840, 38, "LỘ TRÌNH 12 TUẦN XÂY DỰNG SẢN PHẨM", 20, color=NAVY_D, bold=True)

    phases = [
        ("GIAI ĐOẠN 1", "Tuần 1–3", "Phân tích & nền dữ liệu",
         ["Khảo sát ẩm thực Quận 4", "Chốt 16 use case, actor", "Thiết kế 12 bảng, migration",
          "Seed 10 địa điểm, 24 món, 5 ngôn ngữ"], "Hoàn thành", TEAL),
        ("GIAI ĐOẠN 2", "Tuần 4–6", "Web khám phá & QR",
         ["Trang chủ, khám phá, địa điểm", "Trang món ăn, tuyến, bản đồ",
          "Quản trị địa điểm/món/bản dịch", "Sinh QR SVG, quét QR trên web"], "Hoàn thành", BLUE),
        ("GIAI ĐOẠN 3", "Tuần 7–9", "Quyền ngôn ngữ & audio",
         ["Guest session 90 ngày", "2 ngôn ngữ miễn phí", "Checkout sandbox 20.000 đ",
          "Audio, TTS dự phòng, đo thời lượng"], "Hoàn thành", INDIGO),
        ("GIAI ĐOẠN 4", "Tuần 10–12", "Mobile GPS & thống kê",
         ["Expo: Scan, GPS Guide", "Vùng GPS + hàng đợi audio", "Dashboard, online 5 phút",
          "Kiểm thử, tài liệu, demo"], "Đang hoàn thiện", ACCENT),
    ]

    # timeline
    c.line((120, 170), (1560, 170), color=BORDER, width=4)
    for i, (tag, weeks, title, items, status, color) in enumerate(phases):
        x = 80 + i * 400
        cw = 360
        cx = x + cw / 2
        c.ellipse(cx, 170, 19, 19, fill=color, outline=WHITE, width=4)
        c.text_box(cx, 132, weeks, 13.5, color=color, bold=True)
        c.line((cx, 190), (cx, 228), color=color, width=2)
        c.rect(x, 228, cw, 356, fill=WHITE, outline=color, width=2, radius=10)
        c.rect(x, 228, cw, 92, fill=color, outline=color, width=1, radius=10)
        c.text_box(cx, 252, tag, 12.5, color=(235, 240, 247), bold=True)
        c.text_box(cx, 282, title, 17, color=WHITE, bold=True, max_width=cw - 24)
        yy = 346
        for it in items:
            lines = c.wrap(it, cw - 64, 14)
            c.text(x + 28, yy, "•", 17, color=color, bold=True, anchor="lm")
            for j, ln in enumerate(lines):
                c.text(x + 44, yy + j * 21, ln, 14, color=DARK, anchor="lm")
            yy += len(lines) * 21 + 20
        fill = (240, 248, 242) if "Hoàn" in status else (251, 244, 234)
        out = (80, 140, 102) if "Hoàn" in status else ACCENT
        c.rect(x + 26, 512, cw - 52, 38, fill=fill, outline=out, width=1, radius=19)
        c.text_box(cx, 531, status, 13, color=out, bold=True)

    c.rect(80, 626, 1520, 92, fill=(246, 249, 252), outline=BORDER, width=1, radius=8)
    c.text_box(320, 650, "KẾT QUẢ MVP", 14, color=NAVY, bold=True)
    kpis = [
        ("16", "use case"), ("88", "tuyến API"), ("12", "bảng dữ liệu"),
        ("5", "ngôn ngữ"), ("10", "địa điểm demo"), ("24", "món ăn"),
    ]
    kx = 460
    for value, name in kpis:
        c.text_box(kx, 676, value, 22, color=NAVY_D, bold=True, max_width=90)
        c.text_box(kx, 703, name, 11.5, color=GREY, max_width=110)
        kx += 184

    footer(c, "Ghi chú: “Đang hoàn thiện” phản ánh đúng trạng thái mã nguồn tại thời điểm lập báo cáo — mục 2.6 và Chương 4 liệt kê các điểm còn lệch.", y=762)
    c.save("hinh_1_2_roadmap.png")


if __name__ == "__main__":
    fig_feature_map()
    fig_roadmap()
