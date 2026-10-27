"""Chapter 3 ERDs: content, multilingual/media, guest/commercial."""

from figlib import (Canvas, NAVY, NAVY_D, BLUE, INDIGO, TEAL, LIGHT, LIGHT2, BORDER,
                    GREY, DARK, WHITE, ACCENT)

ROW_H = 24
HEAD_H = 30


def entity(c, x, y, w, title, rows, color=NAVY):
    h = HEAD_H + ROW_H * len(rows) + 8
    c.rect(x, y, w, h, fill=WHITE, outline=BORDER, width=2, radius=5)
    c.rect(x, y, w, HEAD_H, fill=color, outline=color, width=1, radius=5)
    c.text_box(x + w / 2, y + 15, title, 17, color=WHITE, bold=True, max_width=w - 10)
    for i, (marker, name) in enumerate(rows):
        yy = y + HEAD_H + i * ROW_H + ROW_H / 2
        if marker:
            c.text(x + 8, yy, marker, 13, color=ACCENT, bold=True, anchor="lm")
        c.text(x + 38, yy, name, 16, color=DARK, anchor="lm")
        if c.d.textlength(name, font=__import__("figlib").font(16)) / 2 > w - 46:
            c.warnings.append(f"row too wide in {title}: {name}")
    return h


OV_ROW_H = 28
OV_HEAD_H = 34


def ov_entity(c, x, y, w, title, rows, color=NAVY):
    h = OV_HEAD_H + OV_ROW_H * len(rows) + 8
    c.rect(x, y, w, h, fill=WHITE, outline=BORDER, width=2, radius=5)
    c.rect(x, y, w, OV_HEAD_H, fill=color, outline=color, width=1, radius=5)
    c.text_box(x + w / 2, y + 17, title, 20, color=WHITE, bold=True, max_width=w - 10)
    for i, (marker, name) in enumerate(rows):
        yy = y + OV_HEAD_H + i * OV_ROW_H + OV_ROW_H / 2
        if marker:
            c.text(x + 8, yy, marker, 14, color=ACCENT, bold=True, anchor="lm")
        c.text(x + 38, yy, name, 18, color=DARK, anchor="lm")
        if c.d.textlength(name, font=__import__("figlib").font(18)) / 2 > w - 46:
            c.warnings.append(f"row too wide in {title}: {name}")
    return h


def ov_label(c, x, y, text, color=ACCENT, size=14):
    c.text_box(x, y, text, size, color=color, bold=True, bg=WHITE, max_width=170)


def fig_erd_overview():
    c = Canvas(1960, 1220)

    A, B, C, D = 40, 520, 1000, 1480
    W = 400
    Y1, Y2, Y3 = 40, 390, 740

    ov_entity(c, A, Y1, W, "categories", [
        ("PK", "id"), ("UQ", "code"), ("", "name"), ("", "applies_to"), ("", "is_active"),
    ])
    ov_entity(c, A, Y2, W, "culinary_places", [
        ("PK", "id"), ("UQ", "code"), ("FK", "category_id"), ("", "address"),
        ("", "latitude · longitude"), ("", "status"), ("", "zone_radius · exit_buffer"),
    ], color=TEAL)
    ov_entity(c, A, Y3, W, "dishes", [
        ("PK", "id"), ("UQ", "code"), ("FK", "culinary_place_id"), ("FK", "category_id"),
        ("", "price · is_signature"), ("", "status"),
    ], color=TEAL)

    ov_entity(c, B, Y1, W, "culinary_routes", [
        ("PK", "id"), ("UQ", "code"), ("", "difficulty"), ("", "status"),
    ], color=BLUE)
    ov_entity(c, B, Y2, W, "route_stops", [
        ("PK", "id"), ("FK", "route_id"), ("FK", "culinary_place_id"),
        ("", "position"), ("UQ", "(route_id, position)"),
    ], color=BLUE)
    ov_entity(c, B, Y3, W, "users", [
        ("PK", "id"), ("UQ", "email"), ("", "role"), ("", "is_active"),
    ], color=BLUE)

    ov_entity(c, C, Y1, W, "translations", [
        ("PK", "id"), ("UQ", "(entity_type, entity_id, lang)"), ("FK", "language_id"),
        ("", "entity_type: place / dish / route"), ("", "name"), ("", "description"),
    ], color=NAVY)
    ov_entity(c, C, Y2, W, "media_files", [
        ("PK", "id"), ("", "entity_type: place / dish / translation"),
        ("", "entity_id"), ("", "kind: image / audio / qr"), ("", "url · is_primary"),
    ], color=TEAL)
    ov_entity(c, C, Y3, W, "activity_logs", [
        ("PK", "id"), ("", "event_type: favorite · view · scan · play"),
        ("FK", "user_id"), ("FK", "guest_session_id"), ("FK", "culinary_place_id"),
        ("FK", "translation_id"), ("FK", "language_id"),
    ], color=TEAL)

    ov_entity(c, D, Y1, W, "languages", [
        ("PK", "id"), ("UQ", "code"), ("", "name"), ("", "is_active"),
    ], color=BLUE)
    ov_entity(c, D, Y2, W, "guest_sessions", [
        ("PK", "id (varchar 64)"), ("UQ", "display_id"), ("FK", "free_language_id"),
        ("FK", "free_language_id_2"), ("", "purchased_languages INT[]"),
        ("", "expires_at (90 ngày)"),
    ], color=INDIGO)
    ov_entity(c, D, Y3, W, "checkouts", [
        ("PK", "id"), ("FK", "guest_session_id"), ("FK", "language_id"),
        ("", "amount · currency"), ("", "provider = SANDBOX"), ("", "status · paid_at"),
    ], color=ACCENT)

    for cx, label in [(240, "NỘI DUNG ẨM THỰC"), (720, "TUYẾN & TÀI KHOẢN"),
                      (1200, "ĐA NGỮ & NHẬT KÝ"), (1680, "KHÁCH & THANH TOÁN")]:
        c.text_box(cx, 20, label, 15, color=GREY, bold=True, max_width=360)

    # categories 1—N places
    solid_rel(c, [(240, 222), (240, 390)])
    ov_label(c, 252, 250, "0..1")
    ov_label(c, 252, 362, "N")
    c.text_box(300, 300, "phân loại", 14, color=GREY, italic=True, bg=WHITE, max_width=150)

    # categories 1—N dishes, routed around the left of the places column
    solid_rel(c, [(70, 222), (70, 280), (20, 280), (20, 690), (100, 690), (100, 740)])
    ov_label(c, 90, 246, "0..1")
    ov_label(c, 86, 712, "N")

    # places 1—N dishes
    solid_rel(c, [(240, 628), (240, 740)])
    ov_label(c, 252, 646, "1")
    ov_label(c, 252, 718, "N")

    # places 1—N route_stops
    solid_rel(c, [(440, 500), (520, 500)])
    ov_label(c, 452, 478, "1")
    ov_label(c, 500, 478, "N")

    # culinary_routes 1—N route_stops
    solid_rel(c, [(720, 194), (720, 390)])
    ov_label(c, 732, 212, "1")
    ov_label(c, 732, 368, "N")

    # languages 1—N translations
    solid_rel(c, [(1480, 130), (1400, 130)])
    ov_label(c, 1456, 108, "1")
    ov_label(c, 1408, 108, "N")

    # translations 1—0..1 media (audio, polymorphic)
    logical_rel(c, [(1200, 250), (1200, 390)], label=None)
    ov_label(c, 1212, 264, "1", color=INDIGO)
    ov_label(c, 1212, 366, "0..1", color=INDIGO)
    c.text_box(1300, 320, "audio (đa hình)", 14, color=INDIGO, italic=True,
               bg=WHITE, max_width=180)

    # languages 1—N guest sessions (two free slots)
    solid_rel(c, [(1680, 194), (1680, 390)])
    ov_label(c, 1692, 216, "1")
    ov_label(c, 1692, 368, "N")
    c.text_box(1780, 300, "free_language_id / _2", 13.5, color=GREY, italic=True,
               bg=WHITE, max_width=200)

    # guest sessions 1—N checkouts
    solid_rel(c, [(1680, 600), (1680, 740)])
    ov_label(c, 1692, 618, "1")
    ov_label(c, 1692, 718, "N")

    # users 0..1—N activity logs
    solid_rel(c, [(920, 800), (1000, 800)])
    ov_label(c, 945, 778, "0..1")
    ov_label(c, 985, 778, "N")

    # guest sessions 1—N activity logs
    solid_rel(c, [(1480, 560), (1440, 560), (1440, 800), (1400, 800)])
    ov_label(c, 1452, 540, "1")
    ov_label(c, 1424, 822, "N")

    # checkouts N—1 languages, routed along the right margin
    solid_rel(c, [(1880, 130), (1900, 130), (1900, 850), (1880, 850)])
    ov_label(c, 1912, 112, "1")
    ov_label(c, 1912, 868, "N")
    c.text_box(1560, 690, "checkouts.language_id (RESTRICT)", 12.5,
               color=GREY, italic=True, bg=WHITE, max_width=220)

    # notes band
    c.rect(40, 1030, 1880, 160, fill=LIGHT2, outline=BORDER, width=1.2, radius=7)
    c.line((700, 1046), (700, 1174), color=BORDER, width=1)
    c.line((1380, 1046), (1380, 1174), color=BORDER, width=1)
    c.text(60, 1054, "Quan hệ đa hình", 17, color=NAVY, bold=True, anchor="lm")
    for i, ln in enumerate([
        "translations: (entity_type, entity_id) → place / dish / route",
        "media_files: (entity_type, entity_id) → place / dish / translation",
        "Không có FK vật lý; tầng dịch vụ kiểm tra loại thực thể.",
    ]):
        c.text(60, 1086 + i * 24, ln, 15.5, color=DARK, anchor="lm")
    c.text(720, 1054, "activity_logs", 17, color=TEAL, bold=True, anchor="lm")
    for i, ln in enumerate([
        "Ngoài users và guest_sessions đã vẽ, bảng còn FK tới",
        "culinary_places (CASCADE), translations (SET NULL),",
        "languages (SET NULL). Sự kiện: favorite / view / scan / play.",
    ]):
        c.text(720, 1086 + i * 24, ln, 15.5, color=DARK, anchor="lm")
    c.text(1400, 1054, "Quy ước", 17, color=ACCENT, bold=True, anchor="lm")
    for i, ln in enumerate([
        "Nét liền: FK vật lý (11 tuyến chính, tổng 15 ràng buộc).",
        "Nét đứt: quan hệ đa hình (2 bảng).",
        "Chi tiết từng vùng: Hình 3.7 – 3.9.",
    ]):
        c.text(1400, 1086 + i * 24, ln, 15.5, color=DARK, anchor="lm")

    c.save("hinh_3_6_erd_overview.png")


def note_card(c, x, y, w, h, title, lines, size=14.5):
    c.rect(x, y, w, h, fill=(255, 250, 238), outline=ACCENT, width=1.5, radius=6)
    c.text_box(x + w / 2, y + 22, title, 15.5, color=(105, 66, 20), bold=True, max_width=w - 18)
    yy = y + 46
    for line in lines:
        c.text(x + 16, yy + 8, "•", size + 2, color=ACCENT, bold=True, anchor="lm")
        wrapped = c.wrap(line, w - 42, size)
        for j, ln in enumerate(wrapped):
            c.text(x + 32, yy + 8 + j * size * 1.28, ln, size, color=DARK, anchor="lm")
        yy += len(wrapped) * size * 1.28 + 8
    return yy


def cardinality(c, x, y, text):
    c.text_box(x, y, text, 15, color=ACCENT, bold=True, bg=WHITE, max_width=34)


def logical_rel(c, pts, color=INDIGO, label=None, lx=None, ly=None, label_size=14):
    for i in range(len(pts) - 1):
        c.dashed_line(pts[i], pts[i + 1], color=color, width=1.8, dash=9, gap=6)
    if label:
        c.text_box(lx if lx is not None else pts[0][0], ly if ly is not None else pts[0][1],
                   label, label_size, color=color, bg=WHITE, max_width=320, line_gap=1.2)


def solid_rel(c, pts, color=NAVY, width=1.8):
    for i in range(len(pts) - 1):
        c.line(pts[i], pts[i + 1], color=color, width=width)


def fig_erd_content():
    c = Canvas(1560, 1060)

    entity(c, 560, 45, 380, "categories", [
        ("PK", "id"), ("UQ", "code"), ("", "name"), ("", "applies_to"),
        ("", "icon"), ("", "is_active"), ("", "created_at · updated_at"),
    ])
    entity(c, 70, 300, 450, "culinary_places", [
        ("PK", "id"), ("UQ", "code"), ("FK", "category_id"), ("", "address"),
        ("", "latitude · longitude"), ("", "phone · website"), ("", "price_range"),
        ("", "price_min · price_max"), ("", "opening_time · closing_time"),
        ("", "is_recommended"), ("", "status"), ("", "zone_radius · zone_exit_buffer"),
        ("", "created_at · updated_at"),
    ], color=TEAL)
    entity(c, 1080, 270, 410, "dishes", [
        ("PK", "id"), ("UQ", "code"), ("FK", "culinary_place_id"), ("FK", "category_id"),
        ("", "price"), ("", "image_url"), ("", "is_signature"), ("", "status"),
        ("", "created_at · updated_at"),
    ], color=TEAL)
    entity(c, 70, 730, 400, "culinary_routes", [
        ("PK", "id"), ("UQ", "code"), ("", "estimated_duration · distance"),
        ("", "difficulty"), ("", "cover_image_url"), ("", "status"),
        ("", "created_at · updated_at"),
    ], color=BLUE)
    entity(c, 800, 730, 400, "route_stops", [
        ("PK", "id"), ("FK", "route_id"), ("FK", "culinary_place_id"),
        ("", "position"), ("", "note"), ("", "created_at"),
    ], color=BLUE)

    # categories 1—N places
    solid_rel(c, [(560, 190), (300, 190), (300, 300)])
    cardinality(c, 538, 170, "1")
    cardinality(c, 300, 278, "N")
    c.text_box(445, 172, "phân loại", 14, color=GREY, bg=WHITE, italic=True)

    # categories 1—N dishes
    solid_rel(c, [(940, 130), (1210, 130), (1210, 270)])
    cardinality(c, 948, 108, "1")
    cardinality(c, 1210, 248, "N")

    # places 1—N dishes
    solid_rel(c, [(520, 430), (1080, 430)])
    cardinality(c, 532, 408, "1")
    cardinality(c, 1060, 408, "N")
    c.text_box(800, 412, "thuộc địa điểm", 14, color=GREY, bg=WHITE, italic=True)

    # places 1—N stops
    solid_rel(c, [(430, 650), (430, 690), (860, 690), (860, 730)])
    cardinality(c, 442, 660, "1")
    cardinality(c, 860, 708, "N")

    # routes 1—N stops
    solid_rel(c, [(470, 800), (800, 800)])
    cardinality(c, 482, 778, "1")
    cardinality(c, 778, 778, "N")

    c.rect(520, 950, 960, 74, fill=LIGHT2, outline=BORDER, width=1.2, radius=6)
    c.text_box(1000, 974,
               "PK khoá chính · FK khoá ngoại · UQ ràng buộc duy nhất · 1—N một-nhiều",
               14.5, color=DARK, max_width=900)
    c.text_box(1000, 999,
               "Các trường created_at / updated_at được gộp một dòng. translations & media_files trình bày ở Hình 3.8.",
               13.5, color=GREY, italic=True, max_width=900)

    c.save("hinh_3_6_erd_content.png")


def fig_erd_multilingual():
    c = Canvas(1560, 1050)

    entity(c, 70, 50, 390, "languages", [
        ("PK", "id"), ("UQ", "code"), ("", "name"), ("", "native_name"),
        ("", "is_active"), ("", "bcl"), ("", "voice_note"), ("", "created_at · updated_at"),
    ], color=BLUE)
    entity(c, 70, 390, 560, "translations", [
        ("PK", "id"), ("", "entity_type: {place, dish, route}"), ("", "entity_id"),
        ("FK", "language_id"), ("", "name"), ("", "short_description"), ("", "description"),
        ("", "history"), ("", "cultural_significance"), ("", "tourist_tips"),
        ("", "ingredients"), ("", "cultural_information"), ("", "created_at · updated_at"),
    ], color=NAVY)
    entity(c, 950, 360, 545, "media_files", [
        ("PK", "id"), ("", "entity_type: {place, dish, translation}"), ("", "entity_id"),
        ("", "kind: {image, audio, qr}"), ("", "url"), ("", "alt_text"),
        ("", "duration · file_size"), ("", "mime_type"), ("", "source: {UPLOAD, TTS}"),
        ("", "sort_order · is_primary"), ("", "metadata (JSONB)"), ("", "created_at · updated_at"),
    ], color=TEAL)

    # languages 1—N translations
    solid_rel(c, [(265, 280), (265, 390)])
    cardinality(c, 277, 296, "1")
    cardinality(c, 277, 370, "N")

    # translation audio -> media (polymorphic)
    logical_rel(c, [(630, 500), (950, 500)], label="audio: entity_type='translation'")
    cardinality(c, 642, 478, "1")
    cardinality(c, 928, 478, "0..1")

    # targets of translations
    c.rect(70, 840, 760, 150, fill=LIGHT2, outline=INDIGO, width=1.5, radius=8)
    c.text_box(450, 866, "Thực thể nội dung được tham chiếu", 16, color=INDIGO, bold=True,
               max_width=700)
    for i, name in enumerate(["culinary_places", "dishes", "culinary_routes"]):
        px = 90 + i * 245
        c.rect(px, 900, 225, 60, fill=WHITE, outline=INDIGO, width=1.5, radius=5)
        c.text_box(px + 112, 930, name, 15, color=NAVY_D, bold=True, max_width=210)
    logical_rel(c, [(350, 740), (350, 840)], label=None)
    c.text_box(520, 790, "entity_type + entity_id", 14.5, color=INDIGO, bold=True,
               bg=WHITE, max_width=260)

    note_card(c, 950, 760, 545, 225, "Ràng buộc đa hình", [
        "Không có FK vật lý cho entity_id; service kiểm tra loại thực thể trước khi ghi/đọc.",
        "Một QR cho mỗi place hoặc dish; một audio cho mỗi translation (unique index).",
        "translations duy nhất theo (entity_type, entity_id, language_id).",
        "media_files.entity_type='translation' dùng cho audio; place/dish dùng cho ảnh và QR.",
    ], size=13.8)

    c.save("hinh_3_7_erd_content_i18n.png")


def fig_erd_guest():
    c = Canvas(1560, 1030)

    entity(c, 70, 60, 430, "users", [
        ("PK", "id"), ("UQ", "email"), ("", "password_hash"), ("", "full_name"),
        ("", "role: {ADMIN, STAFF, VISITOR}"), ("", "is_active"),
        ("", "last_login_at"), ("", "created_at · updated_at"),
    ], color=BLUE)
    entity(c, 850, 60, 500, "guest_sessions", [
        ("PK", "id (varchar 64)"), ("", "token_hash (SHA-256)"), ("UQ", "display_id"),
        ("FK", "free_language_id"), ("FK", "free_language_id_2"),
        ("", "purchased_languages INT[]"), ("", "expires_at (90 ngày)"),
        ("", "created_at · updated_at"),
    ], color=INDIGO)

    entity(c, 70, 430, 540, "activity_logs", [
        ("PK", "id"), ("", "event_type: {favorite, view, scan, play}"),
        ("", "session_id"), ("FK", "user_id"), ("FK", "guest_session_id"),
        ("FK", "culinary_place_id"), ("FK", "translation_id"), ("FK", "language_id"),
        ("", "device_type · platform"), ("", "metadata (JSONB)"), ("", "created_at"),
    ], color=TEAL)
    entity(c, 850, 430, 500, "checkouts", [
        ("PK", "id"), ("FK", "guest_session_id"), ("FK", "language_id"),
        ("", "amount (server-owned)"), ("", "currency"), ("", "provider = SANDBOX"),
        ("UQ", "provider_transaction_id"), ("", "status: {pending, success, failed}"),
        ("", "paid_at"), ("UQ", "idempotency_key"), ("", "created_at · updated_at"),
    ], color=ACCENT)

    # users 0..1 — N activity
    solid_rel(c, [(285, 290), (285, 430)])
    cardinality(c, 297, 306, "0..1")
    cardinality(c, 297, 410, "N")

    # guest 1 — N checkouts
    solid_rel(c, [(1100, 287), (1100, 430)])
    cardinality(c, 1112, 302, "1")
    cardinality(c, 1112, 410, "N")

    # guest 0..1 — N activity
    solid_rel(c, [(850, 200), (660, 200), (660, 490), (610, 490)])
    cardinality(c, 838, 180, "1")
    cardinality(c, 682, 510, "N")
    c.text_box(755, 182, "phiên khách", 13.5, color=GREY, bg=WHITE, italic=True)

    # activity_logs references
    c.rect(70, 780, 700, 50, fill=LIGHT2, outline=BORDER, width=1.2, radius=6)
    c.text_box(420, 805,
               "FK tham chiếu: languages · culinary_places · translations (SET NULL / CASCADE)",
               13.8, color=DARK, max_width=680)
    for i in range(3):
        x = 170 + i * 230
        c.dashed_line((x, 732), (x, 780), color=TEAL, width=1.6, dash=7, gap=5)
    cardinality(c, 182, 746, "0..1")

    # checkouts language stub
    c.rect(850, 800, 250, 56, fill=WHITE, outline=ACCENT, width=1.6, radius=5)
    c.text_box(975, 828, "languages", 15, color=NAVY_D, bold=True, max_width=230)
    solid_rel(c, [(975, 732), (975, 800)])
    cardinality(c, 987, 746, "1")
    cardinality(c, 987, 786, "N")

    note_card(c, 1140, 760, 380, 230, "Quy tắc nghiệp vụ", [
        "Chỉ lưu SHA-256(token); token gốc không nằm trong DB.",
        "2 slot miễn phí + mảng purchased_languages quyết định quyền nghe.",
        "amount, currency, provider do server đặt; confirm idempotent.",
        "Một checkout success cho mỗi (guest, language).",
    ], size=13.2)

    c.text_box(780, 1000,
               "activity_logs là event stream dùng chung cho favorite / view / scan / play; "
               "guest_session_id có thể NULL khi sự kiện đến từ người dùng đã đăng nhập.",
               13.2, color=GREY, italic=True, max_width=1440)

    c.save("hinh_3_8_erd_guest_checkout.png")


if __name__ == "__main__":
    fig_erd_overview()
    fig_erd_content()
    fig_erd_multilingual()
    fig_erd_guest()
