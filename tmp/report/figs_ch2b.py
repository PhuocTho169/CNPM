"""Detailed functional decomposition tree (Hình 2.2)."""

from figlib import Canvas, NAVY, NAVY_D, BLUE, LIGHT, BORDER, GREY, DARK, WHITE, ACCENT


def fig_decomposition_detail():
    c = Canvas(1320, 780)

    # root
    c.rect(470, 10, 380, 46, fill=NAVY, outline=NAVY, radius=7)
    c.text_box(660, 33, "Hệ thống thuyết minh đa ngôn ngữ Quận 4", 15, color=WHITE, bold=True, max_width=360)

    # two branches
    for cx, label in [(330, "Nhóm chức năng khách du lịch"), (990, "Nhóm chức năng quản trị")]:
        c.arrow([(660, 56), (660, 70), (cx, 70), (cx, 84)], color=NAVY, width=2)
        c.rect(cx - 170, 84, 340, 42, fill=LIGHT, outline=NAVY, width=2, radius=6)
        c.text_box(cx, 105, label, 14, color=NAVY_D, bold=True, max_width=320)

    left = [
        ("1. Tra cứu địa điểm", ["Danh sách, tìm kiếm, bộ lọc", "Chi tiết địa điểm", "Địa điểm gần đây"], []),
        ("2. Tra cứu món ăn", ["Danh sách món tại quán", "Chi tiết món ăn"], []),
        ("3. Quét mã QR", ["Giải mã QR (web / mobile)", "Điều hướng /place/{id}", "Ghi nhận lượt quét"], []),
        ("4. Nghe thuyết minh", ["Chọn ngôn ngữ", "Phát tệp MP3", "Giọng trình duyệt (dự phòng)"], []),
    ]
    right = [
        ("5. Quản lý nội dung", ["Địa điểm (CRUD, trạng thái)", "Món ăn và danh mục", "Tuyến ẩm thực, hình ảnh"], []),
        ("6. Đa ngôn ngữ và audio", ["Bản dịch địa điểm / món ăn", "Ngôn ngữ, BCP-47, giọng đọc", "Tải tệp MP3 / tạo TTS"], []),
        ("7. QR và thống kê", ["QR địa điểm và món ăn", "Thống kê quét, lượt nghe", "Phân bố theo thiết bị"], []),
        ("8. Quyền truy cập", ["Phiên khách, ngôn ngữ miễn phí", "Gói và giao dịch", "Kiểm tra quyền khi tải nội dung"], [1, 2]),
    ]

    def draw(side, groups, gx, lx, branch_cx):
        for i, (gname, leaves, partial) in enumerate(groups):
            y = 152 + i * 150
            c.arrow([(branch_cx, 126), (branch_cx, 139), (gx + 130, 139), (gx + 130, y)], color=NAVY, width=2)
            c.box(gx, y, 260, 46, gname, size=12.5, fill=WHITE, outline=BLUE, width=2)
            for j, leaf in enumerate(leaves):
                ly = y + j * 34
                c.line((gx + 260, y + 23), (lx, y + 23), color=BORDER, width=1)
                if j > 0:
                    c.line((lx, y + 23), (lx, ly + 15), color=BORDER, width=1)
                is_partial = j in partial
                c.rect(lx, ly, 320, 30, fill=(250, 246, 240) if is_partial else WHITE,
                       outline=BORDER, width=1, radius=4)
                c.text_box(lx + 158, ly + 15, leaf, 11, color=DARK, max_width=290)
                if is_partial:
                    c.text(lx + 306, ly + 8, "◐", 11, color=ACCENT, bold=True, anchor="mm")

    draw("L", left, 40, 320, 330)
    draw("R", right, 680, 960, 990)

    c.text(40, 748, "Chú thích:", 12, color=GREY, bold=True)
    c.rect(120, 739, 18, 18, fill=WHITE, outline=BORDER, width=1)
    c.text(146, 748, "chức năng đã triển khai", 12, color=GREY, anchor="lm")
    c.rect(340, 739, 18, 18, fill=(250, 246, 240), outline=BORDER, width=1)
    c.text(348, 748, "◐", 11, color=ACCENT, bold=True, anchor="mm")
    c.text(368, 748, "có mã nguồn nhưng chưa chạy đầu-cuối (thiếu giao diện hoặc thiếu bước kiểm tra)",
           12, color=GREY, anchor="lm")

    c.save("hinh_2_3_phan_ra_chi_tiet.png")


if __name__ == "__main__":
    fig_decomposition_detail()
