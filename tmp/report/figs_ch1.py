# -*- coding: utf-8 -*-
"""PRD figures for Chapter 1."""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from figlib import Canvas, NAVY, NAVY_D, BLUE, INDIGO, TEAL, LIGHT, LIGHT2, BORDER, GREY, DARK, WHITE, ACCENT


def chip(c, x, y, w, h, text, fill, line, txt, size=14, bold=False):
    c.rect(x, y, w, h, fill=fill, outline=line, width=1, radius=9)
    c.text_box(x + w / 2, y + h / 2, text, size, color=txt, bold=bold, max_width=w - 10)


def badge(c, cx, cy, n, fill=NAVY):
    c.ellipse(cx, cy, 15, 15, fill=fill, outline=fill, width=1)
    c.text_box(cx, cy, str(n), 15, color=WHITE, bold=True)


def group(c, x, y, w, title, items, status, band):
    rows = len(items)
    hh = 30 + rows * 34 + 56
    c.rect(x, y, w, hh, fill=WHITE, outline=BORDER, width=2, radius=8)
    c.rect(x, y, w, 30, fill=band, outline=band, width=1, radius=8)
    c.text_box(x + w / 2, y + 15, title, 17, color=WHITE, bold=True, max_width=w - 10)
    yy = y + 36
    for it in items:
        chip(c, x + 12, yy, w - 24, 26, it, LIGHT2, BORDER, DARK)
        yy += 34
    chip(c, x + w / 2 - 62, y + hh - 42, 124, 24, status[0], status[1], status[2], status[3], size=13, bold=True)
    return hh


c = Canvas(1440, 900)
c.text(720, 34, "SẢN PHẨM: QUÉT QR TẠI QUÁN — ĐỌC ẤM THỰC QUẬN 4 — NGHE THUYẾT MINH ĐA NGÔN NGỮ",
       23, bold=True, color=NAVY_D, anchor="ma")

# lane: khach du lich
c.rect(60, 90, 1330, 400, fill=LIGHT2, outline=BORDER, width=2, radius=10)
c.text(140, 104, "KHÁCH DU LỊCH — THAO TÁC TRONG 5 BƯỚC", 16, color=NAVY_D, bold=True, anchor="lm")

steps = [
    ("Quét mã QR\ntại quán", 210, "mở bằng camera"),
    ("Mở đúng trang\n/place/{id}", 210, "web hoặc mobile"),
    ("Chọn 1 trong\n5 ngôn ngữ", 210, "ghi nhớ trên thiết bị"),
    ("Đọc nội dung\nquán - món - văn hoá", 225, "kèm ảnh, giờ mở cửa, giá"),
    ("Nghe thuyết minh\nMP3 / TTS dự phòng", 225, "tua 10 giây, đổi tốc độ, dừng"),
]
x = 100
for i, (txt, w, note) in enumerate(steps):
    c.rect(x, 150, w, 108, fill=WHITE, outline=NAVY, width=2, radius=10)
    badge(c, x + 26, 172, i + 1)
    c.text_box(x + w / 2, 210, txt, 17, color=NAVY_D, bold=True, max_width=w - 14)
    c.text_box(x + w / 2, 246, note, 13, color=GREY, max_width=w - 12)
    c.text_box(x + w / 2, 280, f"Bước {i + 1}", 14, color=GREY)
    if i < 4:
        c.arrow([(x + w + 4, 204), (x + w + 48, 204)], color=ACCENT, width=3, head=11)
    x += w + 52

c.text_box(720, 300, "Bố cục tự co giãn cho điện thoại; yêu thích và lịch sử truy cập lưu theo phiên khách.",
           15, color=GREY, italic=True)

c.rect(100, 330, 420, 74, fill=LIGHT, outline=BLUE, width=2, radius=9)
c.text_box(310, 352, "Mỗi thao tác được máy chủ ghi log:", 15, color=NAVY_D, bold=True)
c.text_box(310, 378, "lượt quét (scan_logs) • lượt nghe (audio_play_logs)", 15, color=NAVY_D)
c.rect(570, 330, 420, 74, fill=LIGHT, outline=BLUE, width=2, radius=9)
c.text_box(780, 352, "Bản dịch thiếu → dự phòng 2 lớp:", 15, color=NAVY_D, bold=True)
c.text_box(780, 378, "giọng trình duyệt • TTS máy chủ", 15, color=NAVY_D)
c.rect(1040, 330, 350, 74, fill=LIGHT, outline=BLUE, width=2, radius=9)
c.text_box(1215, 352, "Xem ở web bằng bản đồ Leaflet;", 15, color=NAVY_D, bold=True, max_width=320)
c.text_box(1215, 378, "di động có hướng dẫn GPS theo vùng", 15, color=NAVY_D, max_width=320)

# lane: quan tri
c.rect(60, 540, 1330, 270, fill=WHITE, outline=BORDER, width=2, radius=10)
c.text(140, 554, "QUẢN TRỊ VIÊN (ADMIN / STAFF) — CẬP NHẬT MỘT LẦN, PHÂN PHỐI MỌI NGÔN NGỮ",
       16, color=NAVY_D, bold=True, anchor="lm")

boxes = [
    (120, "Trang /admin", "đăng nhập JWT, phân quyền ADMIN/STAFF", NAVY),
    (520, "Soạn nội dung", "địa điểm • món • bản dịch 5 ngôn ngữ • audio/TTS • QR", NAVY),
    (940, "Phát hành", "xuất bản — khách thấy ngay cả bằng ngôn ngữ mới", TEAL),
]
for bx, title, body, col in boxes:
    c.rect(bx, 600, 370, 120, fill=LIGHT, outline=col, width=2, radius=10)
    c.text_box(bx + 185, 628, title, 18, color=col, bold=True)
    c.text_box(bx + 185, 665, body, 15, color=DARK, max_width=340, italic=True)

c.arrow([(120 + 370 + 4, 660), (520 - 4, 660)], color=ACCENT, width=3, head=11)
c.arrow([(520 + 370 + 4, 660), (940 - 4, 660)], color=ACCENT, width=3, head=11)
c.arrow([(1160, 596), (1160, 494)], color=INDIGO, width=3, head=11, dashed=True)
c.text_box(1010, 505, "nội dung mới phục vụ\ntrực tiếp mọi thiết bị", 14, color=INDIGO, italic=True,
           bg=WHITE, max_width=240)

c.text_box(720, 858, "Phần còn dang dở: mua gói mở khoá ngôn ngữ theo phiên khách (FR-16/FR-17) — đã có API và bảng dữ liệu, chưa nối cổng thanh toán thật.",
           14, color=GREY, italic=True)
c.save("hinh_1_1_prd_flow.png")

# ---------- Hình 1.2 — bản đồ tính năng ----------
c = Canvas(1440, 660)
c.text(720, 34, "BẢN ĐỒ TÍNH NĂNG CỦA SẢN PHẨM — GHI THEO TRẠNG THÁI THỰC TẾ TRONG MÃ NGUỒN",
       23, bold=True, color=NAVY_D, anchor="ma")

GREEN_F, GREEN_L, GREEN_T = (232, 245, 233), (46, 125, 50), (27, 94, 32)
AMBER_F, AMBER_L, AMBER_T = (255, 243, 224), (191, 87, 0), (140, 60, 0)
GREY_F, GREY_L, GREY_T = (240, 242, 245), (120, 132, 148), (85, 95, 110)
OK = ("Đã có", GREEN_F, GREEN_L, GREEN_T)
PART = ("Một phần", AMBER_F, AMBER_L, AMBER_T)
DES = ("Thiết kế", GREY_F, GREY_L, GREY_T)

W, GAP = 660, 30
ROW2 = 322
HH = group(c, 30, 70, W, "TRA CỨU CÔNG KHAI", [
    "Danh sách và tìm kiếm địa điểm",
    "Chi tiết địa điểm • chi tiết món ăn",
    "Bản đồ (Leaflet) • tuyến ẩm thực",
    "Yêu thích và lịch sử theo phiên khách",
], OK, BLUE)

group(c, 30 + W + GAP, 70, W, "ĐA NGÔN NGỮ VÀ THUYẾT MINH", [
    "5 ngôn ngữ • bản dịch theo bản ghi",
    "Phát MP3 • giọng trình duyệt dự phòng",
    "TTS máy chủ (3 nhà cung cấp)",
    "Mã QR cho địa điểm và món ăn",
], OK, TEAL)

group(c, 30, ROW2, W, "QUẢN TRỊ NỘI DUNG", [
    "CRUD địa điểm • món • danh mục",
    "Bản dịch • audio • QR (soạn 5 thẻ)",
    "Dashboard thống kê + người truy cập",
    "Quản lý ngôn ngữ • người dùng",
], OK, INDIGO)

group(c, 30 + W + GAP, ROW2, W, "QUYỀN NGÔN NGỮ VÀ THANH TOÁN", [
    "Phiên khách ẩn danh + 1 ngôn ngữ miễn phí",
    "Gói dịch vụ • bảng giao dịch và audit",
    "Webhook xác nhận thanh toán",
    "Adapter cổng thanh toán thật",
], PART, ACCENT)

# legend
c.rect(30, 570, 1330, 52, fill=LIGHT2, outline=BORDER, width=1, radius=8)
chip(c, 58, 583, 120, 26, "Đã có", GREEN_F, GREEN_L, GREEN_T, size=14, bold=True)
c.text(190, 596, "tồn tại trong mã nguồn, có tuyến/giao diện tương ứng", 14, color=DARK, anchor="lm")
chip(c, 640, 583, 130, 26, "Một phần", AMBER_F, AMBER_L, AMBER_T, size=14, bold=True)
c.text(782, 596, "có mã nhưng thiếu một mắt xích", 14, color=DARK, anchor="lm")
chip(c, 1070, 583, 120, 26, "Thiết kế", GREY_F, GREY_L, GREY_T, size=14, bold=True)
c.text(1202, 596, "chỉ có bảng/mô tả", 14, color=DARK, anchor="lm")

c.save("hinh_1_2_prd_features.png")
print("done")
