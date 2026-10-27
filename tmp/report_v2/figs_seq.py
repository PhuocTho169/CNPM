"""Chapter 4 sequence diagrams: unlock, QR, GPS audio."""

from figlib import (Canvas, NAVY, NAVY_D, BLUE, INDIGO, TEAL, LIGHT, LIGHT2, BORDER,
                    GREY, DARK, WHITE, ACCENT)


def participants(c, specs, bottom, y=34, h=66):
    for cx, w, title, sub in specs:
        c.rect(cx - w / 2, y, w, h, fill=(240, 245, 251), outline=NAVY, width=2, radius=6)
        c.text_box(cx, y + (23 if sub else h / 2), title, 16, color=NAVY_D, bold=True,
                   max_width=w - 12)
        if sub:
            c.text_box(cx, y + 48, sub, 12.5, color=GREY, max_width=w - 12)
        c.dashed_line((cx, y + h), (cx, bottom), color=GREY, width=1.2, dash=8, gap=6)


def msg(c, x1, x2, y, text, dashed=False, color=NAVY, label_size=15, max_width=None,
        label_offset=-17):
    c.arrow([(x1, y), (x2, y)], color=color, width=1.7, head=9, dashed=dashed)
    gap = abs(x2 - x1)
    mw = max_width or max(150, gap - 28)
    c.text_box((x1 + x2) / 2, y + label_offset, text, label_size, color=DARK, bg=WHITE,
               max_width=mw, line_gap=1.13)


def self_call(c, x, y1, y2, text, width=280, color=ACCENT):
    c.arrow([(x, y1), (x + 34, y1), (x + 34, y2), (x, y2)], color=color, width=1.5, head=8)
    c.text_box(x + 50, (y1 + y2) / 2, text, 14.2, color=DARK, bg=WHITE,
               align="left", max_width=width, line_gap=1.14)


def footer_notes(c, lines, y):
    for i, line in enumerate(lines):
        c.text_box(c.w / 2, y + i * 23, line, 13.5, color=GREY, italic=True,
                   max_width=c.w - 100, line_gap=1.2)


def fig_seq_unlock():
    c = Canvas(1560, 1100)
    px = [140, 500, 900, 1290]
    participants(c, [
        (px[0], 220, "Khách", "web / mobile"),
        (px[1], 250, "Web", "React SPA"),
        (px[2], 260, "API", "Express 4"),
        (px[3], 270, "PostgreSQL", "dữ liệu"),
    ], bottom=1000)
    g, w, a, d = px
    ys = [140 + i * 52 for i in range(17)]

    msg(c, g, w, ys[0], "chọn ngôn ngữ thứ ba (zh)")
    msg(c, w, a, ys[1], "GET /places/:id/guide?language=zh")
    msg(c, a, d, ys[2], "kiểm tra 2 slot miễn phí + purchased_languages")
    msg(c, d, a, ys[3], "chưa có quyền nghe zh", dashed=True, color=TEAL)
    msg(c, a, w, ys[4], "403 LANGUAGE_LOCKED", dashed=True, color=ACCENT)
    msg(c, w, g, ys[5], "banner khoá + nút “Mở khoá 20.000 đ”", color=BLUE)
    msg(c, g, w, ys[6], "bấm Mở khoá", color=BLUE)
    msg(c, w, a, ys[7], "POST /guest-sessions/checkouts")
    msg(c, a, d, ys[8], "INSERT checkout pending 20.000 đ (idempotency)")
    msg(c, a, w, ys[9], "checkoutId + amount + status=pending", dashed=True, color=TEAL)
    msg(c, w, a, ys[10], "POST /checkouts/:id/confirm (sandbox)")
    self_call(c, a, ys[11] - 22, ys[11] + 24,
              "sandbox confirm: UPDATE success; purchased_languages = toàn bộ ngôn ngữ active",
              width=300)
    msg(c, a, w, ys[12], "success + entitlements", dashed=True, color=TEAL)
    msg(c, w, a, ys[13], "GET /places/:id/guide?language=zh (thử lại)")
    msg(c, a, d, ys[14], "hasLanguageUnlock → pass")
    msg(c, a, w, ys[15], "nội dung + audioUrl", dashed=True, color=TEAL)
    msg(c, w, g, ys[16], "hiển thị nội dung đã mở khoá", color=BLUE)

    footer_notes(c, [
        "Nhánh thay thế: nếu còn slot miễn phí, API ghi free_language_id_2 và trả nội dung ngay — không tạo checkout.",
        "Confirm lặp lại là idempotent; checkout failed trả 409; amount/currency/provider do server quyết định.",
    ], y=1040)
    c.save("hinh_4_1_seq_unlock.png")


def fig_seq_qr():
    c = Canvas(1600, 1000)
    px = [130, 440, 780, 1120, 1450]
    participants(c, [
        (px[0], 200, "Khách", "quét QR"),
        (px[1], 240, "Mobile", "Expo 51"),
        (px[2], 250, "Website", "React SPA"),
        (px[3], 250, "API", "Express 4"),
        (px[4], 245, "PostgreSQL", "dữ liệu"),
    ], bottom=900)
    g, m, w, a, d = px
    ys = [136 + i * 51 for i in range(15)]

    msg(c, g, m, ys[0], "quét QR địa điểm / món ăn", color=BLUE)
    self_call(c, m, ys[1] - 24, ys[1] + 25,
              "payload: URL http(s) hoặc ID số; localhost → WEB_BASE LAN; cooldown 4 s",
              width=255)
    msg(c, m, w, ys[2], "mở /place/{id} hoặc /dish/{id}", color=BLUE)
    msg(c, w, a, ys[3], "POST /guest-sessions (nếu chưa có cookie)")
    msg(c, a, d, ys[4], "INSERT guest_session: token_hash, TTL 90 ngày")
    msg(c, a, w, ys[5], "httpOnly cookie guest_session_id", dashed=True, color=TEAL)
    msg(c, w, a, ys[6], "GET /places/:id/guide?language=vi")
    msg(c, a, d, ys[7], "place + translations + media")
    msg(c, a, w, ys[8], "guide đã bản địa hoá", dashed=True, color=TEAL)
    msg(c, w, a, ys[9], "POST /places/:id/scan {device, platform}")
    msg(c, a, d, ys[10], "INSERT activity_logs (event_type='scan')")
    msg(c, w, g, ys[11], "render guide + language selector", color=BLUE)
    msg(c, g, w, ys[12], "chọn ngôn ngữ bị khoá (zh)", color=BLUE)
    msg(c, w, a, ys[13], "GET /places/:id/guide?language=zh")
    msg(c, a, w, ys[14], "403 → mở UC-03", dashed=True, color=ACCENT)

    footer_notes(c, [
        "Một QR cho mỗi địa điểm hoặc món ăn, do server sinh SVG trong uploads/qr. Mobile chỉ mở URL; website giữ phiên khách và paywall.",
        "Mobile chuẩn hoá localhost/127.0.0.1 thành WEB_BASE trong mạng LAN và bỏ qua mã trùng trong 4 giây.",
    ], y=940)
    c.save("hinh_4_2_seq_qr.png")


def fig_seq_gps():
    c = Canvas(1520, 1000)
    px = [130, 460, 880, 1280]
    participants(c, [
        (px[0], 200, "Khách", "web / mobile"),
        (px[1], 280, "Mobile GPS", "location + audio"),
        (px[2], 260, "API", "Express 4"),
        (px[3], 260, "PostgreSQL", "dữ liệu"),
    ], bottom=870)
    g, m, a, d = px
    ys = [138 + i * 54 for i in range(15)]

    msg(c, g, m, ys[0], "mở tab GPS Guide", color=BLUE)
    self_call(c, m, ys[1] - 24, ys[1] + 26,
              "xin quyền; watchPosition 10 m / 3 s; fix đầu ≤ 100 m",
              width=280)
    msg(c, m, a, ys[2], "GET /culinary-places/nearby (500 m, 20)")
    msg(c, a, d, ys[3], "Haversine + chỉ địa điểm PUBLISHED")
    msg(c, d, a, ys[4], "danh sách + zone_radius / exit_buffer", dashed=True, color=TEAL)
    msg(c, a, m, ys[5], "nearby list", dashed=True, color=TEAL)
    self_call(c, m, ys[6] - 26, ys[6] + 27,
              "cache; refresh sau 60 m / 120 s; detectZoneEntry, bỏ fix > 150 m",
              width=290)
    msg(c, m, a, ys[7], "GET /culinary-places/:id/audio?language")
    msg(c, a, d, ys[8], "entitlement + translation + media")
    msg(c, d, a, ys[9], "audio hoặc thiếu file", dashed=True, color=TEAL)
    self_call(c, a, ys[10] - 23, ys[10] + 25,
              "thiếu audio → TTS lazy (tuỳ chọn), lưu media_files", width=285)
    msg(c, a, m, ys[11], "audioUrl + duration (hoặc 403)", dashed=True, color=TEAL)
    self_call(c, m, ys[12] - 24, ys[12] + 26,
              "phát audio; hàng đợi: vùng mới nhất thắng", width=280)
    self_call(c, m, ys[13] - 22, ys[13] + 24,
              "tiếp tục watchPosition; lặp vòng khi khách di chuyển", width=300)

    footer_notes(c, [
        "Vào vùng khi khoảng cách ≤ zone_radius; ra khi > zone_radius + exit_buffer. Fix kém chính xác > 150 m bị bỏ.",
        "Ngôn ngữ bị khoá → 403 và mở UC-03; audio có sẵn được ưu tiên, TTS chỉ là phương án dự phòng.",
    ], y=920)
    c.save("hinh_4_3_seq_gps_audio.png")


if __name__ == "__main__":
    fig_seq_unlock()
    fig_seq_qr()
    fig_seq_gps()
