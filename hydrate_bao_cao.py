import docx
from docx import Document
from docx.shared import Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT
import os

SRC = 'Bao-cao-du-an-Quan4-Culinary-Guide.docx'
doc = Document(SRC)

def add_heading(doc, text, level=1):
    p = doc.add_heading(text, level=level)
    for run in p.runs:
        run.font.color.rgb = RGBColor(0x8B, 0x00, 0x00)
    return p

def add_para(doc, text, bold=False, italic=False, size=None):
    p = doc.add_paragraph()
    r = p.add_run(text)
    r.bold = bold
    r.italic = italic
    if size:
        r.font.size = Pt(size)
    return p

def add_bullet(doc, text):
    p = doc.add_paragraph(text, style='List Bullet')
    return p

def table(doc, rows):
    ncols = len(rows[0])
    t = doc.add_table(rows=len(rows), cols=ncols)
    t.style = 'Light Grid Accent 1'
    t.alignment = WD_TABLE_ALIGNMENT.CENTER
    for i, row in enumerate(rows):
        for j, val in enumerate(row):
            cell = t.cell(i, j)
            cell.text = str(val)
            for p in cell.paragraphs:
                for r in p.runs:
                    r.font.size = Pt(10)
                    if i == 0:
                        r.bold = True
    doc.add_paragraph()
    return t

# ============ USER STORY / USE CASE ============
doc.add_page_break()
add_heading(doc, 'Phụ lục A — User Story, Use Case &amp; Lộ trình triển khai chức năng', level=1)
add_para(doc, 'Phần này liệt kê các user story chính, use case mảng quan trọng và các bước triển khai được thực hiện trong phiên làm việc gần nhất (gắn với báo cáo chính).', italic=True, size=10)

add_heading(doc, 'A.1 — Tổng quan user story (chính)', level=2)
table(doc, [
  ['Mã', 'User story', 'Tính năng chính', 'Trạng thái'],
  ['US-01', 'Du khách muốn xem thông tin địa điểm ẩm thực Quận 4 bằng ngôn ngữ của mình',
   'Đa ngôn ngữ (vi/en/zh/ko/ja), bản dịch đầy đủ (name, description, history, cultural_significance, tourist_tips). Sửa seed thiếu dấu, reseed DB.', 'Done'],
  ['US-02', 'Du khách quét mã QR dán ở quán → mở trang hướng dẫn trên điện thoại',
   'Web QR (jsQR) + Mobile expo-camera, QR trỏ /place/:id, xử lý permission/camera lỗi, fix layout nút Qr (≤414px).', 'Done'],
  ['US-03', 'Du khách muốn nghe thuyết minh âm thanh tự động bằng giọng bản xứ',
   'TTS Google Translate (keyless mặc định) + upload MP3/WAV/M4A, warm-up boot, fallback Web Speech API, đo duration parse MPEG.', 'Done'],
  ['US-04', 'Du khách đi bộ quanh Quận 4 → app tự động phát thuyết minh khi vào vùng GPS',
   'GPS Guide (Expo location), Haversine + zone_radius + hysteresis zone_exit_buffer, queue phát nối tiếp, AudioGuidePlayer.', 'Done'],
  ['US-05', 'Quản trị / nhân viên muốn quản lý địa điểm, bản dịch, món ăn, ảnh, lộ trình, ngôn ngữ, người dùng',
   'Admin dashboard /admin, tab Translations & Audio (nút 🤖 TTS từng ngôn ngữ hoặc tất cả), QR regenerate, dashboard 8 chỉ số + biểu đồ.', 'Done'],
  ['US-06', 'Quản trị muốn thuyết minh âm thanh dài ~30 giây cho mỗi địa điểm',
   'Composer narration (~30s) chung: luôn có name+short_description+description, bổ sung history→cultural_significance→tourist_tips theo câu, bảng chars/giây theo ngôn ngữ.', 'Done'],
  ['US-07', 'Quản trị muốn audio cũ nâng lên đúng kịch bản 30s sau khi cập nhật',
   'backfill-all-audio.js (CLI) hoặc nút TTS tất cả trong admin, chỉ làm mới file sau phiên bản narrative.', 'Planned/Done'],
  ['US-08', 'Khách muốn lưu địa điểm yêu thích & xem lịch sử đã xem',
   'Favorites + history theo session_id (ẩn danh), không cần đăng nhập.', 'Done'],
  ['US-09', 'Khách muốn tìm địa điểm gần mình & lọc theo danh mục/giá/giờ mở',
   'Explore search + filter + nearby, map OSM embed, lọc category/price/opening_time.', 'Done'],
  ['US-10', 'Du khách muốn xem lộ trình ẩm thực (route)',
   '3 lộ trình mẫu + route_translations × ngôn ngữ, hiển thị points trên web & mobile.', 'Done'],
])

add_heading(doc, 'A.2 — User story chi tiết (3 story đầu)', level=2)

def story(title, actor, goal, input_, output_, acceptance):
    add_para(doc, title, bold=True, size=11)
    add_para(doc, 'Actor: ' + actor)
    add_para(doc, 'Mục tiêu: ' + goal)
    add_para(doc, 'Đi vào: ' + input_)
    add_para(doc, 'Đi ra: ' + output_)
    add_para(doc, 'Tiêu chí chấp nhận: ' + acceptance)
    doc.add_paragraph()

story('US-01 — Xem thông tin đa ngôn ngữ',
  'Du khách nước ngoài / người dùng app.',
  'Xem thông tin 1 địa điểm ẩm thực Quận 4 (tên, mô tả ngắn, mô tả chi tiết, lịch sử, ý nghĩa văn hoá, mẹo du lịch) bằng ngôn ngữ mình chọn.',
  'Chọn ngôn ngữ trên web/mobile (vi/en/zh/ko/ja), chọn địa điểm từ trang chủ/explore/QR.',
  'Trang /place/:id với các phần About/History/Food culture/Visitor tips dịch đầy đủ; fallback nếu ngôn ngữ chưa có bản dịch → về ngôn ngữ mặc định (vi) hoặc bản en.',
  '(1) Mỗi trường text hiển thị đúng ngôn ngữ đã chọn; (2) Không hiển thị bản zh (thiếu dấu tiếng Việt) khi người dùng chọn vi; (3) Cả web và mobile có cùng nguồn dữ liệu dịch; (4) Không có lỗi console. Đã check: 003/004/005/006/007 — sửa lại dữ liệu seed thiếu dấu, reseed DB.')

story('US-02 — Quét mã QR',
  'Du khách có điện thoại (mobile/Expo) hoặc trình duyệt web.',
  'Quét mã QR dán tại địa điểm → mở thẳng trang hướng dẫn địa điểm đó trên thiết bị.',
  'Màn hình Scan (mobile) hoặc nút Quét QR (web header, fixed 60px, không vỡ layout ≤414px).',
  'Mở /place/:id (web) hoặc PlaceDetailScreen (mobile) với locale hiện tại.',
  '(1) Nút Quét QR trên web không vỡ layout (trước: h=73px, y=−6; sau: h=32px, y=14); (2) Icon tab mobile Scan QR đồng bộ 5 tab; (3) QR trong DB trỏ đúng PUBLIC_BASE_URL hoặc origin web; (4) Xử lý permission/camera lỗi trên mobile.')

story('US-03 — Thuyết minh âm thanh ~30 giây',
  'Du khách / quản trị.',
  'Nghe thuyết minh tự động (TTS) khoảng 30 giây cho mỗi địa điểm, bằng giọng bản xứ khi có thể, fallback nếu không.',
  'Mở trang guide, tích hợp warm-up boot, GPS guide, dish audio, nút TTS admin, fallback trình duyệt.',
  'File MP3 trong uploads/audio, cột duration trong audio_guides, phát bằng AudioPlayer/AudioGuidePlayer.',
  '(1) Mỗi clip ~30s, không vượt 30×1.1 = 33s; (2) Đo trực tiếp từ file MP3 sau sinh; (3) Lỗi chia chunk TTS không còn (trước HTTP 400, đã sửa); (4) Mẹo du lịch được đọc (tourist_tips đúng cột) — trước đây bị gán nhầm, đã sửa seed 4 file. Đo: vi 33s, 32s; zh 34s, 32s (corner-case khi provider khác dao động ± vài s).')

add_heading(doc, 'A.3 — Use case: đăng nhập &amp; phân quyền admin', level=2)
table(doc, [
  ['Bước', 'Người thực hiện', 'Hành động', 'Hệ thống'],
  ['1', 'Admin/Staff', 'Nhập email + password trên /admin/login', 'Xác thực JWT (bcryptjs)'],
  ['2', 'Hệ thống', 'Trả về access token, trường roles, permissions (theo role_permissions)', 'Lưu trạng thái đăng nhập client-side (không lưu password)'],
  ['3', 'Admin/Staff', 'Mở /admin dashboard, truy cập các tab cần phân quyền', 'Kiểm tra permission bằng authorize() middleware'],
  ['4', 'Hệ thống', 'Chặn request nếu thiếu permission, trả lại { success: false, code: UNAUTHORIZED }', 'Ghi log (nếu có)'],
])

add_heading(doc, 'A.4 — Use case: sinh / làm mới audio', level=2)
table(doc, [
  ['Bước', 'Người dùng', 'Hành động', 'Hệ thống'],
  ['1', 'Admin/Staff', 'Mở tab Translations & Audio của địa điểm, nhấn 🤖 TTS (1 ngôn ngữ hoặc tất cả)', 'mediaService.scheduleTranslationAudio()'],
  ['2', 'Hệ thống', 'Gọi provider TTS: Google Translate mặc định (keyless) / Google Cloud / ElevenLabs / Edge / file upload + đo duration parse MPEG', 'Nếu Google Translate: chunkText (≤190–200 ký tự, đã sửa lỗi trước)'],
  ['3', 'Hệ thống', 'Lưu MP3 vào uploads/audio/, metadata vào audio_guides (translation_id, provider, duration_sec, status)', 'Trả về URL /uploads/audio/... cho client'],
  ['4', 'Warm-up boot', 'Nếu server khởi động, audioWarmupService tự điền bản dịch chưa có audio, pool 2 worker, lỗi log thôi', 'Không block server start'],
  ['5', 'Khách', 'Mở trang guide → phát audio (hoặc fallback Web Speech API nếu TTS_PROVIDER=none)', 'AudioPlayer/AudioGuidePlayer'],
  ['6', 'Quản trị (nâng cấp)', 'Chạy node server/scripts/backfill-all-audio.js --force để nâng toàn bộ audio cũ lên kịch bản ~30s', 'Dùng chung composer narration + mediaService'],
])

# ============ DIAGRAMS ============
doc.add_page_break()
add_heading(doc, 'Phụ lục B — Các sơ đồ (ERD, Deployment, Component)', level=1)
add_para(doc, '3 sơ đồ được xuất dưới dạng file draw.io (XML) mở được trực tiếp trong https://app.diagrams.net. Mỗi file là 1 sơ đồ hoàn chỉnh, có thể xuất PNG/SVG từ đó.', italic=True, size=10)

diagrams = [
  ('B.1 — ERD toàn hệ thống (Cơ sở dữ liệu)',
   'Bao-cao-du-an-Quan4-Culinary-Guide_ERD.drawio',
   'Sơ đồ thực thể - quan hệ bao gồm các bảng: languages, roles, permissions, role_permissions, users, categories, culinary_places, culinary_place_translations, culinary_place_images, dishes, dish_translations, audio_guides, dish_audio_guides, culinary_routes, route_stops, route_translations, visitor_favorites, visitor_history, scan_logs, audio_play_logs. Mối quan hệ một-nhiều và khóa ngoại được mô tả bằng mũi tên. Lưu ý: seed dùng ON CONFLICT DO NOTHING (ID mới) hoặc DO UPDATE SET tùy file — reseed có thể không ghi đè bản cũ nếu DB đã có dữ liệu.'),
  ('B.2 — Deployment diagram (Triển khai hệ thống)',
   'Bao-cao-du-an-Quan4-Culinary-Guide_Deployment.drawio',
   'Ba thành phần container trong Docker Compose: postgres (PostgreSQL 16), server (Node.js/Express), admin-web (build tĩnh). Client: mobile Expo/React Native (gọi API qua LAN IP), web client (React+Vite gọi /api qua proxy hoặc trực tiếp), admin web static. Hạ tầng bên ngoài: Google Translate TTS (mặc định keyless), Google Cloud/ElevenLabs/Edge tùy chọn, OpenStreetMap embed (không cần key), quét QR client-side (jsQR/expo-camera). Volume: postgres_data và server_uploads (ảnh/audio/QR). Phân biệt dev overlay (hot-reload + Vite dev server) và production.'),
  ('B.3 — Component diagram (Lớp chức năng)',
   'Bao-cao-du-an-Quan4-Culinary-Guide_Component.drawio',
   'Client layer: Web client (React+Vite public+admin), Mobile client (Expo SDK51), iOS web export (dev-only). API boundary: Express server /api (68 route, middleware helmet/cors/rate-limit/JWT, chuẩn lỗi, validators). Service layer: authService, placeService, catalogService, mediaService (TTS providers, chunking đã sửa, upload, measureAudioDuration parse MPEG), dishAudioService, geoAudioService, audioWarmupService, statsService. Đường loang = dependency tới Composer narration (~30s) mới — tập trung vào 1 composer duy nhất thay vì mỗi cửa tự nối chuỗi text. Persistence: PostgreSQL 16 (xem ERD).'),
]

for title, path, desc in diagrams:
    add_heading(doc, title, level=2)
    add_para(doc, desc, size=10)
    p = doc.add_paragraph()
    r = p.add_run('Tệp sơ đồ: ')
    r.bold = True
    p.add_run(path)
    doc.add_paragraph()
    add_para(doc, 'Cách mở: tải file .drawio về, mở bằng https://app.diagrams.net → menu File → Open → chọn file, hoặc drag & drop vào canvas. Sau đó File → Export as PNG/SVG nếu cần chèn vào báo cáo điện tử khác.', italic=True, size=9)
    doc.add_paragraph()

# ============ APPENDIX C — TOC UPDATE ============
doc.add_page_break()
add_heading(doc, 'Phụ lục C — Cập nhật nhanh danh mục báo cáo', level=1)
add_para(doc, 'Sau khi thêm Phụ lục A (User Story/Use Case) và Phụ lục B (3 sơ đồ draw.io), cấu trúc báo cáo hiện tại gồm:', size=10)
add_bullet(doc, 'Mục 1–11: nội dung báo cáo chính (đã tồn tại)')
add_bullet(doc, 'Phụ lục A — User Story, Use Case &amp; Lộ trình triển khai chức năng (phần này)')
add_bullet(doc, 'Phụ lục B — Các sơ đồ (ERD, Deployment, Component) — 3 file .drawio đi kèm (phần này)')
add_bullet(doc, 'Phụ lục C — Cập nhật nhanh danh mục (phần này)')
add_para(doc, 'Các file đi kèm trong folder cùng vị trí với file .docx:', size=10)
for path in [
  'Bao-cao-du-an-Quan4-Culinary-Guide_ERD.drawio',
  'Bao-cao-du-an-Quan4-Culinary-Guide_Deployment.drawio',
  'Bao-cao-du-an-Quan4-Culinary-Guide_Component.drawio',
]:
    add_bullet(doc, path)
doc.add_paragraph()
add_para(doc, 'Lưu ý kỹ thuật: file .docx chỉ lưu trữ văn bản và hình ảnh, không thể nhúng file draw.io XML thành hình ảnh clickable trong file .docx có sẵn bằng công cụ đơn giản, nên giải pháp là đặt 3 file .drawio cùng thư mục với báo cáo. Nếu bạn muốn chèn PNG/SVG vào chính file .docx, hãy xuất ảnh từ draw.io và báo cho mình — mình sẽ chèn thêm vào file này.', italic=True, size=9)

doc.save(SRC)
print('Saved:', SRC, 'size:', os.path.getsize(SRC))
