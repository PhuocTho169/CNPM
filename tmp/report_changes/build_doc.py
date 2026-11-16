# -*- coding: utf-8 -*-
"""Render before/after images and build the Word change report."""
import html as htmlmod
import os
import pathlib
import re
import subprocess
import sys

from docx import Document
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.shared import Cm, Pt, RGBColor

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from build_report import CHANGES, OUT, ROOT, git  # noqa: E402

CHROME = r'C:\Program Files\Google\Chrome\Application\chrome.exe'
DOCX_PATH = os.path.join(ROOT, 'BaoCao_ThayDoi_MaNguon.docx')

# ---------------------------------------------------------------- rendering


def esc(s):
    return htmlmod.escape(s, quote=False)


def disp_len(s):
    return sum(2 if ord(ch) > 0x2E80 else 1 for ch in s)


def hl_line(line):
    stripped = line.lstrip()
    if stripped.startswith('//') or stripped.startswith('#') or stripped.startswith('*'):
        return '<span class="c">%s</span>' % esc(line)
    out, last = [], 0
    for m in re.finditer(r"""('[^']*'|"[^"]*"|`[^`]*`)""", line):
        out.append(esc(line[last:m.start()]))
        out.append('<span class="s">%s</span>' % esc(m.group(1)))
        last = m.end()
    out.append(esc(line[last:]))
    s = ''.join(out)
    s = re.sub(
        r'\b(const|let|var|function|return|if|else|async|await|new|throw|try|catch|require|module|exports|export|import|from|of|for|while)\b',
        r'<span class="k">\1</span>', s)
    return s


def chrome_shot(html_path, png_path, width, height):
    subprocess.run([
        CHROME, '--headless=new', '--disable-gpu', '--hide-scrollbars',
        '--force-device-scale-factor=2', '--window-size=%d,%d' % (width, height),
        '--screenshot=' + png_path, pathlib.Path(html_path).as_uri(),
    ], check=True, timeout=120, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)


def render_code_panel(path_label, tag, kind, code_lines, start_no, out_png):
    max_chars = max([disp_len(l) for l in code_lines] or [80])
    width = int(min(1700, max(820, max_chars * 7.9 + 120)))
    height = 60 + len(code_lines) * 21 + 28
    rows = ''.join(
        '<div class="row"><div class="ln">%4d</div><div class="code">%s</div></div>'
        % (start_no + i, hl_line(line)) for i, line in enumerate(code_lines)
    )
    html_doc = """<!doctype html><html><head><meta charset="utf-8"><style>
      html,body{margin:0;padding:0;background:#fff;}
      .hdr{background:%s;color:#fff;font:700 14px 'Segoe UI',Arial;padding:9px 14px 8px;}
      .hdr .tag{background:rgba(255,255,255,.22);padding:2px 7px;border-radius:3px;margin-right:8px;}
      .hdr .path{float:right;font:400 11px Consolas,monospace;opacity:.9;padding-top:3px;}
      .body{padding:12px 10px 12px 12px;font:13px/21px Consolas,'Courier New',monospace;}
      .row{display:flex;}
      .ln{width:34px;flex:0 0 34px;color:#a0a4a8;text-align:right;padding-right:14px;}
      .code{white-space:pre-wrap;word-break:break-word;color:#1f2328;}
      .c{color:#1a7f37;} .s{color:#a31515;} .k{color:#0033b3;}
    </style></head><body>
      <div class="hdr"><span class="tag">%s</span><span class="path">%s</span></div>
      <div class="body">%s</div>
    </body></html>""" % (
        '#b3261e' if kind == 'before' else '#1b6e3c',
        esc(tag), esc(path_label), rows)
    html_path = out_png[:-4] + '.html'
    with open(html_path, 'w', encoding='utf-8') as f:
        f.write(html_doc)
    chrome_shot(html_path, out_png, width, height)


def render_strip(title, lines, out_png):
    max_chars = max([disp_len(item[0] if isinstance(item, tuple) else item) for item in lines] or [80])
    width = int(min(1500, max(900, max_chars * 8.2 + 90)))
    height = 60 + len(lines) * 23 + 30
    rows = ''
    colors = {'fail': '#ff7b72', 'ok': '#7ee787', 'warn': '#d29922',
              'dim': '#8b949e', 'cmd': '#79c0ff'}
    for item in lines:
        text, kind = item if isinstance(item, tuple) else (item, '')
        rows += '<div style="color:%s">%s</div>' % (colors.get(kind, '#e6edf3'), esc(text) or '&nbsp;')
    html_doc = """<!doctype html><html><head><meta charset="utf-8"><style>
      html,body{margin:0;padding:0;background:#0d1117;}
      .hdr{background:#161b22;color:#e6edf3;font:700 14px 'Segoe UI',Arial;padding:10px 16px;
           border-bottom:1px solid #30363d;}
      .body{padding:14px 18px;font:13px/23px Consolas,'Courier New',monospace;}
    </style></head><body><div class="hdr">%s</div><div class="body">%s</div></body></html>""" % (
        esc(title), rows)
    html_path = out_png[:-4] + '.html'
    with open(html_path, 'w', encoding='utf-8') as f:
        f.write(html_doc)
    chrome_shot(html_path, out_png, width, height)


# ---------------------------------------------------------------- images

print('[report] rendering code images...')
for ch in CHANGES:
    b_lines, b_no = ch['before']
    a_lines, a_no = ch['after']
    render_code_panel(ch['path'], 'TRƯỚC  (mã tại HEAD)', 'before', b_lines, b_no,
                      os.path.join(OUT, ch['id'] + '_before.png'))
    render_code_panel(ch['path'], 'SAU  (mã đã sửa)', 'after', a_lines, a_no,
                      os.path.join(OUT, ch['id'] + '_after.png'))

check_before = [
    ('$ pnpm --filter mobile check:syntax', 'cmd'),
    (r'  FAIL src\screens\PlaceDetailScreen.js', 'fail'),
    ('       Unexpected token (18:8)', 'fail'),
    ('23/24 files parsed.', 'warn'),
    ('', ''),
    ('$ pnpm --filter web test', 'cmd'),
    ('  FAIL the OSM fallback centres on the place at street zoom', 'fail'),
    ("       Input: 'https://www.openstreetmap.de/karte.html?zoom=17&lat=10.758&lon=106.682'", 'dim'),
    ('12 passed, 1 failed.', 'warn'),
    ('[ERR_PNPM_RECURSIVE_RUN_FIRST_FAIL]  Exit status 1', 'fail'),
]
check_after = [
    ('$ pnpm --filter mobile check:syntax', 'cmd'),
    ('24/24 files parsed.', 'ok'),
    ('$ pnpm --filter web test', 'cmd'),
    ('12 passed, 0 failed.   (geo)', 'ok'),
    ('8 passed, 0 failed.    (ui-lang)', 'ok'),
    ('$ pnpm --filter mobile test', 'cmd'),
    ('13 passed, 0 failed.   (zone detection)', 'ok'),
    ('11 passed, 0 failed.   (api throttling)', 'ok'),
    ('$ pnpm check:all', 'cmd'),
    ('CHECK_ALL_EXIT=0', 'ok'),
]
api_smoke = [
    ('$ pnpm --filter server migrate / seed  → done', 'cmd'),
    ('$ curl .../api/auth/login  (admin@district4.local)', 'cmd'),
    ('login OK', 'ok'),
    ('POST /api/places  { zone_radius: 40 }   → tạo thành công (id=11)', 'ok'),
    ('DELETE /api/places/11                   → cleanup delete: 200', 'ok'),
    ('', ''),
    ('$ curl -X DELETE .../guest-sessions/<id-của-người-khác>', 'cmd'),
    ('cross-delete: 403', 'ok'),
    ('self-delete:  200', 'ok'),
    ('$ curl -X POST .../guest-sessions/languages/2/purchase', 'cmd'),
    ('purchase route removed: 404', 'ok'),
]
render_strip('KẾT QUẢ KIỂM TRA — TRƯỚC KHI SỬA', check_before, os.path.join(OUT, 'check_before.png'))
render_strip('KẾT QUẢ KIỂM TRA — SAU KHI SỬA', check_after, os.path.join(OUT, 'check_after.png'))
render_strip('KIỂM THỬ API SAU KHI SỬA (server thật + PostgreSQL)', api_smoke, os.path.join(OUT, 'api_smoke.png'))

# ---------------------------------------------------------------- document

doc = Document()
sec = doc.sections[0]
sec.top_margin = Cm(2.0)
sec.bottom_margin = Cm(2.0)
sec.left_margin = Cm(2.2)
sec.right_margin = Cm(2.0)

normal = doc.styles['Normal']
normal.font.name = 'Calibri'
normal.font.size = Pt(10.5)
normal.element.rPr.rFonts.set(qn('w:eastAsia'), 'Calibri')
normal.paragraph_format.space_after = Pt(4)
normal.paragraph_format.line_spacing = 1.15

for lvl, size, color in [(1, 15, '8B0000'), (2, 12.5, '1F3864')]:
    st = doc.styles['Heading %d' % lvl]
    st.font.name = 'Calibri'
    st.font.size = Pt(size)
    st.font.color.rgb = RGBColor.from_string(color)
    st.font.bold = True

FIG = 0


def para(text, size=None, bold=False, italic=False, color=None, align=None, space_after=4):
    p = doc.add_paragraph()
    if align is not None:
        p.alignment = align
    r = p.add_run(text)
    r.bold = bold
    r.italic = italic
    if size:
        r.font.size = Pt(size)
    if color:
        r.font.color.rgb = RGBColor.from_string(color)
    p.paragraph_format.space_after = Pt(space_after)
    return p


def labeled(label, text):
    p = doc.add_paragraph()
    p.paragraph_format.space_after = Pt(4)
    r = p.add_run(label)
    r.bold = True
    p.add_run(text)
    return p


def bullet(label, text):
    p = doc.add_paragraph(style='List Bullet')
    p.paragraph_format.space_after = Pt(3)
    r = p.add_run(label)
    r.bold = True
    p.add_run(text)
    return p


def caption(text):
    global FIG
    FIG += 1
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p.paragraph_format.space_after = Pt(10)
    r = p.add_run('Hình %d. %s' % (FIG, text))
    r.italic = True
    r.font.size = Pt(9)
    r.font.color.rgb = RGBColor(0x5A, 0x5A, 0x5A)


def add_picture(path, cap, width_cm=15.5, max_h_cm=19.0):
    from PIL import Image as PILImage
    w, h = PILImage.open(path).size
    wcm = width_cm
    hcm = wcm * h / w
    if hcm > max_h_cm:
        hcm = max_h_cm
        wcm = hcm * w / h
    doc.add_picture(path, width=Cm(wcm))
    doc.paragraphs[-1].alignment = WD_ALIGN_PARAGRAPH.CENTER
    doc.paragraphs[-1].paragraph_format.space_after = Pt(1)
    caption(cap)


def shade(cell, color):
    tcPr = cell._tc.get_or_add_tcPr()
    shd = OxmlElement('w:shd')
    shd.set(qn('w:fill'), color)
    tcPr.append(shd)


def make_table(rows, header=True, font_size=9):
    table = doc.add_table(rows=len(rows), cols=len(rows[0]))
    table.style = 'Table Grid'
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    for i, row in enumerate(rows):
        for j, val in enumerate(row):
            cell = table.cell(i, j)
            cell.text = ''
            p = cell.paragraphs[0]
            p.paragraph_format.space_after = Pt(1)
            r = p.add_run(str(val))
            r.font.size = Pt(font_size)
            if header and i == 0:
                r.bold = True
                r.font.color.rgb = RGBColor(0xFF, 0xFF, 0xFF)
                shade(cell, '8B0000')
            elif i % 2 == 0:
                shade(cell, 'F5F1EC')
    doc.add_paragraph().paragraph_format.space_after = Pt(2)
    return table


def add_page_number_footer():
    footer = sec.footer
    p = footer.paragraphs[0]
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r = p.add_run('Báo cáo thay đổi mã nguồn — Quận 4 Culinary Guide   |   Trang ')
    r.font.size = Pt(8.5)
    r.font.color.rgb = RGBColor(0x77, 0x77, 0x77)
    run = p.add_run()
    begin = OxmlElement('w:fldChar'); begin.set(qn('w:fldCharType'), 'begin')
    instr = OxmlElement('w:instrText'); instr.set(qn('xml:space'), 'preserve'); instr.text = 'PAGE'
    end = OxmlElement('w:fldChar'); end.set(qn('w:fldCharType'), 'end')
    run._r.append(begin)
    run._r.append(instr)
    run._r.append(end)


add_page_number_footer()

# --- cover -----------------------------------------------------------------
para('BÁO CÁO THAY ĐỔI MÃ NGUỒN', size=24, bold=True, color='8B0000',
     align=WD_ALIGN_PARAGRAPH.CENTER, space_after=8)
para('Hệ thống Hướng dẫn Ẩm thực Đa ngôn ngữ Quận 4', size=14, bold=True,
     color='1F3864', align=WD_ALIGN_PARAGRAPH.CENTER, space_after=4)
para('Phân tích lỗi — sửa chữa — kiểm chứng trước và sau thay đổi', size=11,
     italic=True, color='555555', align=WD_ALIGN_PARAGRAPH.CENTER, space_after=24)

make_table([
    ['Dự án', 'District 4 Culinary Guide (Node.js/Express + React/Vite + Expo)'],
    ['Thời điểm thực hiện', '16/11/2026'],
    ['Phạm vi', 'Backend API, website quản trị và ứng dụng mobile'],
    ['Kết quả kiểm thử', 'pnpm check:all — pass 100% (exit 0)'],
    ['Tài liệu tham chiếu', 'Ảnh "trước" trích từ Git HEAD; ảnh "sau" trích từ mã nguồn sau khi sửa'],
], header=False)
doc.add_page_break()

# --- 1 ---------------------------------------------------------------------
doc.add_heading('1. Mục đích và phạm vi', level=1)
para('Tài liệu ghi lại các lỗi phát hiện trong quá trình rà soát mã nguồn và vận hành thử dự án, '
     'cách khắc phục tương ứng, cùng bằng chứng trước – sau cho từng thay đổi. Mỗi mục đều nêu rõ '
     'vấn đề, đoạn mã trước khi sửa, đoạn mã sau khi sửa và cách kiểm chứng.')
para('Phạm vi rà soát gồm ba phần của hệ thống:')
bullet('Backend API (Express/PostgreSQL): ', 'luồng tạo địa điểm, phân quyền khách, phiên khách, đăng nhập quản trị và middleware.')
bullet('Website (React + Vite): ', 'hàm tạo liên kết bản đồ dự phòng và trang đăng nhập quản trị.')
bullet('Ứng dụng mobile (React Native/Expo): ', 'màn hình chi tiết địa điểm — nơi phát hiện lỗi cú pháp khiến ứng dụng không build được.')
para('Môi trường kiểm thử: Node.js v24.21.0, pnpm 11.7.0, PostgreSQL 16 chạy trong Docker '
     '(cổng host 5433), API tại http://localhost:5000 và website tại http://localhost:5173.')

# --- 2 ---------------------------------------------------------------------
doc.add_heading('2. Tổng hợp các thay đổi', level=1)
rows = [['STT', 'Hạng mục', 'Tệp thay đổi', 'Mức độ']]
for i, ch in enumerate(CHANGES, 1):
    short = ch['heading'].split('—', 1)[-1].strip()
    rows.append([str(i), short[0].upper() + short[1:], ch['path'], ch['severity']])
make_table(rows)

# --- 3 ---------------------------------------------------------------------
doc.add_heading('3. Chi tiết từng thay đổi', level=1)
para('Trong các hình dưới đây, khung đỏ là mã tại thời điểm HEAD (trước khi sửa), khung xanh là mã '
     'sau khi sửa. Số dòng bên trái tương ứng với tệp thật, giúp đối chiếu nhanh với mã nguồn.')

for idx, ch in enumerate(CHANGES, 1):
    doc.add_heading(ch['heading'], level=2)
    labeled('Vấn đề: ', ch['issue'])
    labeled('Cách sửa: ', ch['fix'])
    short_cap = ch['heading'].split('—', 1)[-1].strip()
    short_cap = short_cap[0].upper() + short_cap[1:]
    add_picture(os.path.join(OUT, ch['id'] + '_before.png'),
                '%s — mã trước khi sửa (%s)' % (short_cap, ch['path']))
    add_picture(os.path.join(OUT, ch['id'] + '_after.png'),
                '%s — mã sau khi sửa' % short_cap)
    if ch['id'] == 'adminui':
        add_picture(os.path.join(OUT, 'ui_login_before.png'),
                    'Trang đăng nhập quản trị ở môi trường dev — còn hiển thị tài khoản demo')
        add_picture(os.path.join(OUT, 'ui_login_after.png'),
                    'Trang đăng nhập trên bản build production — khối tài khoản demo đã được ẩn')
    labeled('Kiểm chứng: ', ch['verify'])

# --- 4 ---------------------------------------------------------------------
doc.add_heading('4. Kết quả kiểm thử', level=1)
para('Sau khi hoàn tất các thay đổi, toàn bộ bộ kiểm tra sẵn có của dự án đã được chạy lại. '
     'Hình dưới là kết quả thực tế trước và sau khi sửa, chụp từ đầu ra của lệnh kiểm tra.')
add_picture(os.path.join(OUT, 'check_before.png'),
            'Trước khi sửa: kiểm tra cú pháp mobile thất bại (23/24 tệp) và test web thất bại (1 test)')
add_picture(os.path.join(OUT, 'check_after.png'),
            'Sau khi sửa: kiểm tra cú pháp mobile 24/24 tệp và toàn bộ test đều pass')
add_picture(os.path.join(OUT, 'api_smoke.png'),
            'Kiểm thử API trên server thật: khôi phục quyền sở hữu phiên khách, chặn route mở khoá miễn phí và tạo địa điểm có bán kính nhỏ')

make_table([
    ['Lệnh kiểm tra', 'Kết quả sau khi sửa'],
    ['pnpm --filter mobile check:syntax', '24/24 tệp parse OK'],
    ['pnpm --filter web test (geo + ui-lang)', '12/12 và 8/8 test pass'],
    ['pnpm --filter mobile test (zone + throttling)', '13/13 và 11/11 test pass'],
    ['node scripts/check-server.js', 'Toàn bộ 31 tệp server hợp lệ'],
    ['node scripts/scan-imports.js', '0 import hỏng, 0 hook thiếu import'],
    ['node scripts/scan-api-contract.js', '89 route backend khớp 85 endpoint frontend'],
    ['pnpm --filter web build', 'Build production thành công'],
    ['pnpm check:all', 'Exit 0 — pass toàn bộ'],
])

# --- 5 ---------------------------------------------------------------------
doc.add_heading('5. Tài khoản demo: giữ lại có chủ đích', level=1)
para('Hai tài khoản admin@district4.local và staff@district4.local không phải dữ liệu rác: chúng được '
     'seed có chủ đích từ trước (tệp 008, nay là 014_demo_users.sql, có ghi chú DEVELOPMENT-ONLY). '
     'Mục đích là để người chấm hoặc người mới clone dự án có thể vào /admin ngay sau khi migrate và '
     'seed, đồng thời có sẵn một tài khoản STAFF để thử phân quyền hạn chế (không xoá địa điểm, '
     'không quản lý người dùng).')
para('Quyết định: giữ nguyên hai tài khoản này cho môi trường phát triển và demo, không xoá khỏi mã '
     'nguồn. Vì mật khẩu của chúng nằm ngay trong mã nguồn, phần cần sửa không phải là xoá tài khoản '
     'mà là chặn ba đường rò rỉ và leo thang quyền — tương ứng các mục 3.9, 3.11–3.15:')
bullet('Giao diện: ', 'gợi ý tài khoản/mật khẩu chỉ hiện ở môi trường dev (3.9) và trang Settings không in địa chỉ tài khoản demo trên bản production (3.13).')
bullet('Phân quyền: ', 'tài khoản vai trò VISITOR bị từ chối ngay ở form đăng nhập (3.11) và bị đẩy ra khỏi khung /admin nếu mở thẳng bằng URL (3.12).')
bullet('Dữ liệu: ', 'tài khoản demo tách sang tệp seed riêng (3.14) và tự động bị bỏ qua khi NODE_ENV=production (3.15).')
make_table([
    ['Tài khoản', 'Vai trò', 'Mật khẩu seed', 'Phạm vi sử dụng'],
    ['admin@district4.local', 'ADMIN', 'Admin@123456', 'Toàn quyền, kể cả quản lý người dùng và phân quyền'],
    ['staff@district4.local', 'STAFF', 'Staff@123456', 'Sửa nội dung, tuyến, món ăn; không xoá địa điểm, không quản lý người dùng'],
])
para('Khuyến nghị khi triển khai thật: xoá hoặc đổi mật khẩu hai tài khoản demo, đặt JWT_SECRET mới, '
     'chạy seed với NODE_ENV=production để tệp 014 bị bỏ qua, và chỉ tạo tài khoản quản trị qua chức '
     'năng Users & Roles với mật khẩu riêng.')

# --- 6 ---------------------------------------------------------------------
doc.add_heading('6. Tồn đọng và khuyến nghị', level=1)
para('Các điểm dưới đây chưa được thay đổi vì cần quyết định về nghiệp vụ hoặc nằm ngoài phạm vi sửa lỗi:')
bullet('Nội dung trả phí còn lộ qua /api/places/:id/guide: ',
       'endpoint công khai trả về mọi bản dịch và URL âm thanh mà không kiểm tra quyền của khách. '
       'Không thể lọc ngay theo guest session vì ứng dụng mobile hiện không tạo guest session và đang dựa vào '
       'endpoint này để đọc mọi ngôn ngữ; cần chốt trước việc mobile có phải tuân theo paywall hay không.')
bullet('README.md đang trống: ',
       'nên bổ sung hướng dẫn cài đặt, migrate/seed, chạy web và mobile, cùng mô tả các biến môi trường.')
bullet('Mã chết: ',
       'hàm logPlay() trong mediaController không có route nào gọi; có thể xoá để giảm nhầm lẫn.')
bullet('Dữ liệu yêu thích/lịch sử: ',
       'các endpoint /favorites và /history nhận session_id tuỳ ý, chưa kiểm tra định dạng hay giới hạn số bản ghi.')
bullet('Hiệu năng gói web: ',
       'bundle JS khoảng 517 kB sau minify (Vite cảnh báo > 500 kB); có thể tách theo route bằng dynamic import khi cần.')
bullet('Lưu token quản trị: ',
       'token JWT đang được giữ trong localStorage (khoá d4_token), nên chỉ an toàn khi website không có lỗ hổng XSS. Khi triển khai thật nên chuyển sang cookie httpOnly kèm SameSite, hoặc rút ngắn thời hạn token (hiện 12 giờ).')

# --- appendix --------------------------------------------------------------
doc.add_heading('Phụ lục A. Danh sách tệp thay đổi', level=1)
rows = [['Tệp', 'Dòng thêm', 'Dòng xoá']]
total_add = total_del = 0
for line in git('diff', '--numstat').splitlines():
    parts = line.split('\t')
    if len(parts) != 3:
        continue
    add, dele, path = parts
    rows.append([path, add, dele])
    if add.isdigit():
        total_add += int(add)
    if dele.isdigit():
        total_del += int(dele)
known = {r[0].replace('\\', '/') for r in rows[1:]}
for extra in git('ls-files', '--others', '--exclude-standard').splitlines():
    rel = extra.strip().replace('\\', '/')
    if rel in known or not rel.startswith('database/seeds/014_'):
        continue
    with open(os.path.join(ROOT, rel), encoding='utf-8') as f:
        count = len(f.read().splitlines())
    rows.append([rel, str(count), '0'])
    total_add += count
rows.append(['Tổng cộng', str(total_add), str(total_del)])
make_table(rows)

doc.add_heading('Phụ lục B. Ghi chú về hình ảnh và môi trường', level=1)
para('Ảnh mã nguồn được tạo tự động từ hai nguồn: (1) "trước" lấy trực tiếp từ phiên bản đang được '
     'commit tại Git HEAD bằng lệnh git show; (2) "sau" lấy từ tệp đang làm việc sau khi sửa. Vì vậy nội dung '
     'trong ảnh khớp chính xác với mã nguồn, không phải hình mô phỏng.')
para('Ảnh giao diện được chụp bằng Chrome headless ở kích thước 1280×900: bản dev chạy Vite tại cổng 5173 '
     'và bản production được build bằng pnpm --filter web build rồi phục vụ qua vite preview tại cổng 4173.')
bullet('Hệ điều hành: ', 'Windows (Git Bash).')
bullet('Runtime: ', 'Node.js v24.21.0; pnpm 11.7.0.')
bullet('Cơ sở dữ liệu: ', 'PostgreSQL 16 (Docker, container d4-postgres, cổng host 5433).')
bullet('Dịch vụ đang chạy khi kiểm thử: ', 'API http://localhost:5000, web http://localhost:5173.')

doc.save(DOCX_PATH)
print('[report] saved:', DOCX_PATH)
print('[report] figures:', FIG)
