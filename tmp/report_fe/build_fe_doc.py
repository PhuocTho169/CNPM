# -*- coding: utf-8 -*-
"""Build the frontend-only improvement report (Word) with before/after images."""
import html as htmlmod
import os
import pathlib
import re
import subprocess

from docx import Document
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.shared import Cm, Pt, RGBColor

ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..'))
OUT = os.path.dirname(os.path.abspath(__file__))
CHROME = r'C:\Program Files\Google\Chrome\Application\chrome.exe'
DOCX_PATH = os.path.join(ROOT, 'BaoCao_CaiThien_FE.docx')


def git(*args):
    return subprocess.run(['git'] + list(args), cwd=ROOT, capture_output=True,
                          text=True, encoding='utf-8').stdout


def head_lines(path):
    return git('show', 'HEAD:' + path).splitlines()


def work_lines(path):
    with open(os.path.join(ROOT, path), encoding='utf-8') as f:
        return f.read().splitlines()


def idx(lines, needle, start=0):
    for i in range(start, len(lines)):
        if needle in lines[i]:
            return i
    raise AssertionError('marker not found: %r' % needle)


def rfind(lines, needle):
    for i in range(len(lines) - 1, -1, -1):
        if needle in lines[i]:
            return i
    raise AssertionError('marker not found: %r' % needle)


def snippet(lines, needle, count, start=0):
    i = idx(lines, needle, start)
    return lines[i:i + count], i + 1


def range_snippet(lines, start_needle, end_needle):
    i = idx(lines, start_needle)
    j = idx(lines, end_needle, i)
    return lines[i:j + 1], i + 1


# ---------------------------------------------------------------- rendering

def esc(s):
    return htmlmod.escape(s, quote=False)


def disp_len(s):
    return sum(2 if ord(ch) > 0x2E80 else 1 for ch in s)


def hl_line(line):
    stripped = line.lstrip()
    if stripped.startswith('//') or stripped.startswith('/*') or stripped.startswith('*'):
        return '<span class="c">%s</span>' % esc(line)
    out, last = [], 0
    for m in re.finditer(r"""('[^']*'|"[^"]*"|`[^`]*`)""", line):
        out.append(esc(line[last:m.start()]))
        out.append('<span class="s">%s</span>' % esc(m.group(1)))
        last = m.end()
    out.append(esc(line[last:]))
    s = ''.join(out)
    s = re.sub(
        r'\b(const|let|var|function|return|if|else|async|await|new|throw|try|catch|import|from|export|default)\b',
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
        % (start_no + i, hl_line(line)) for i, line in enumerate(code_lines))
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
    </body></html>""" % ('#b3261e' if kind == 'before' else '#1b6e3c',
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


# ---------------------------------------------------------------- snippets

pg_before = head_lines('apps/web/src/pages/PlaceGuide.jsx')
pg_after = work_lines('apps/web/src/pages/PlaceGuide.jsx')
tips_before = (pg_before[idx(pg_before, "tourist_tips && ("):
                          idx(pg_before, "tourist_tips && (") + 10],
               idx(pg_before, "tourist_tips && (") + 1)
tips_after = (pg_after[rfind(pg_after, "tourist_tips && ("):
                       rfind(pg_after, "tourist_tips && (") + 10],
              rfind(pg_after, "tourist_tips && (") + 1)

dash_before = head_lines('apps/web/src/admin/Dashboard.jsx')
dash_after = work_lines('apps/web/src/admin/Dashboard.jsx')
dashb = (dash_before[idx(dash_before, "title>⭐ Signature"):idx(dash_before, "title>⭐ Signature") + 3],
         idx(dash_before, "title>⭐ Signature") + 1)
dasha = range_snippet(dash_after, 'The API returns signature dishes', '          )}')
# include the closing </div> of the chart box
i0 = idx(dash_after, 'The API returns signature dishes')
i1 = idx(dash_after, '          )}', i0)
dasha = (dash_after[i0:i1 + 2], i0 + 1)

places_before = head_lines('apps/web/src/admin/AdminPlaces.jsx')
places_after = work_lines('apps/web/src/admin/AdminPlaces.jsx')
placesb = range_snippet(places_before, '  function load() {', '}, [q, status, category]);')
placesa = range_snippet(places_after, '  const requestId = useRef(0);', '  }, [q, status, category]);')

dishes_before = head_lines('apps/web/src/admin/AdminDishes.jsx')
dishes_after = work_lines('apps/web/src/admin/AdminDishes.jsx')
di = idx(dishes_before, '    const timer = setTimeout(() => {')
dishesb = (dishes_before[di - 1:idx(dishes_before, '  }, []);', di) + 1], di)
dishesa = range_snippet(dishes_after, '  // The list has no filters', '  }, []);')

lang_before = head_lines('apps/web/src/admin/AdminLanguages.jsx')
lang_after = work_lines('apps/web/src/admin/AdminLanguages.jsx')
langb = snippet(lang_before, '  async function save() {', 3)
langa = snippet(lang_after, '  // The API rejects an incomplete language', 7)

CHANGES = [
    {
        'id': 'fe_tips', 'heading': '3.1 Trang hướng dẫn địa điểm — khối "Mẹo cho du khách" bị lặp hai lần',
        'path': 'apps/web/src/pages/PlaceGuide.jsx', 'severity': 'Cao (nội dung sai)',
        'issue': 'Trong PlaceGuide.jsx, cùng một khối JSX "Mẹo cho du khách" được viết hai lần: một lần ngay '
                 'trên mục "Món nên thử" và một lần sau phần văn hóa. Trên trình duyệt, khách đọc cùng một '
                 'danh sách mẹo hai lần, trang dài thêm và bố cục trông như bị nhân đôi nội dung.',
        'fix': 'Xóa khối xuất hiện sớm, giữ lại khối sau phần "Văn hóa ẩm thực" — vị trí hợp lý vì mẹo đi sau '
               'phần giới thiệu và lịch sử. Không đổi nội dung, chỉ bỏ bản trùng.',
        'verify': 'Đếm tiêu đề mục trên /place/1 bằng Playwright: trước khi sửa có 2 mục "Mẹo cho du khách", '
                  'sau khi sửa còn 1.',
        'before': tips_before, 'after': tips_after,
        'label_before': 'Khối mẹo xuất hiện sớm (bản trùng)',
    },
    {
        'id': 'fe_dash', 'heading': '3.2 Dashboard — biểu đồ "Signature dishes" hiển thị số liệu không có thật',
        'path': 'apps/web/src/admin/Dashboard.jsx', 'severity': 'Trung bình (dữ liệu gây hiểu nhầm)',
        'issue': 'Mục "⭐ Signature dishes" dùng BarList với valueKey="_unused". API trả về mỗi món đúng một '
                 'dòng với count(*) = 1, nên cả 8 thanh đều dài bằng nhau và đều ghi số 1. Người quản trị '
                 'nhìn vào tưởng đó là lượt bán hoặc lượt xem, nhưng thực chất chỉ là số bản ghi.',
        'fix': 'Bỏ biểu đồ thanh cho mục này và hiển thị danh sách món kèm giá — thông tin thật mà API có. '
               'Thêm trạng thái rỗng khi chưa có món đặc trưng và CSS .signature-list tương ứng.',
        'verify': 'Trước: 8 thanh, mỗi thanh giá trị 1. Sau: 0 thanh, 8 dòng danh sách kèm khoảng giá.',
        'before': dashb, 'after': dasha,
        'label_before': 'BarList với valueKey="_unused"',
    },
    {
        'id': 'fe_places', 'heading': '3.3 Quản lý địa điểm — mỗi ký tự gõ vào ô tìm kiếm là một request',
        'path': 'apps/web/src/admin/AdminPlaces.jsx', 'severity': 'Trung bình (hiệu năng, kết quả sai thứ tự)',
        'issue': 'Effect tải danh sách phụ thuộc trực tiếp vào q/status/category nên gõ "banh mi" phát 7–8 '
                 'request /places liên tiếp. Các phản hồi không được kiểm tra thứ tự: request của từ khóa cũ '
                 'về sau có thể ghi đè kết quả mới, khiến bảng hiện dữ liệu không khớp ô tìm kiếm. Lỗi cũ cũng '
                 'không được xóa khi lần tải sau thành công.',
        'fix': 'Gộp việc tải vào load(), đánh số mỗi request bằng useRef và chỉ nhận phản hồi của request mới '
               'nhất; effect chờ 300 ms sau lần gõ cuối mới gọi load() (debounce). Các nút Publish/Delete/QR '
               'vẫn gọi load() ngay để thấy kết quả tức thì.',
        'verify': 'Gõ "banh mi" (7 ký tự, nghỉ 110 ms/ký tự): trước 7 và 8 request, sau 1 request mỗi lần; '
                  'bảng chỉ cập nhật một lần với từ khóa cuối.',
        'before': placesb, 'after': placesa,
        'label_before': 'Effect gọi load() theo từng ký tự',
    },
    {
        'id': 'fe_dishes', 'heading': '3.4 Quản lý món ăn — độ trễ 300 ms không có mục đích',
        'path': 'apps/web/src/admin/AdminDishes.jsx', 'severity': 'Thấp (tốc độ cảm nhận)',
        'issue': 'Trang Dishes bọc lần tải đầu tiên trong setTimeout 300 ms dù trang không có bộ lọc nào. '
                 'Người dùng luôn phải chờ thêm 0,3 giây trước khi thấy dữ liệu, và khi rời trang sớm thì '
                 'setState vẫn chạy sau khi component đã unmount.',
        'fix': 'Gọi loadDishes() ngay khi mount, dùng cờ cancelled để bỏ qua setState sau khi unmount thay vì '
               'hẹn giờ.',
        'verify': 'Đo 3 lần điều hướng /admin/dishes bằng Playwright: trước 884/919/516 ms, sau 151/98/100 ms '
                  '(cùng máy, cùng dev server).',
        'before': dishesb, 'after': dishesa,
        'label_before': 'setTimeout 300 ms trước khi tải',
    },
    {
        'id': 'fe_langs', 'heading': '3.5 Quản lý ngôn ngữ — lưu khi thiếu trường bắt buộc và JSX bị dồn dòng',
        'path': 'apps/web/src/admin/AdminLanguages.jsx', 'severity': 'Thấp (chất lượng biểu mẫu)',
        'issue': 'Nút "Thêm" luôn bấm được kể cả khi mã/tên/tên gốc còn trống, nên biểu mẫu gửi một request '
                 'chắc chắn bị API từ chối và người dùng chỉ nhận thông báo lỗi chung. Trong tệp, thẻ '
                 '<div className="admin-form"> bị dồn lên cùng dòng với error-banner và rows.map bị thụt lề sai, '
                 'rất khó đọc khi bảo trì; bảng không có trạng thái rỗng.',
        'fix': 'Tính canSave từ ba trường bắt buộc, vô hiệu hóa nút khi thiếu dữ liệu, kiểm tra lại trong save() '
               'và hiển thị thông báo tiếng Việt. Đồng thời tách các dòng JSX bị dồn và thêm dòng "Chưa có '
               'ngôn ngữ nào" khi bảng trống.',
        'verify': 'Trước: nút "Thêm" bấm được khi biểu mẫu trống. Sau: nút bị vô hiệu hóa (mờ) cho tới khi '
                  'điền đủ mã, tên và tên gốc; bảng rỗng hiển thị hướng dẫn thay vì trắng.',
        'before': langb, 'after': langa,
        'label_before': 'save() không kiểm tra trường bắt buộc',
    },
]

for ch in CHANGES:
    b_lines, b_no = ch['before']
    a_lines, a_no = ch['after']
    render_code_panel(ch['path'], 'TRƯỚC  (mã tại HEAD)', 'before', b_lines, b_no,
                      os.path.join(OUT, ch['id'] + '_before.png'))
    render_code_panel(ch['path'], 'SAU  (mã đã sửa)', 'after', a_lines, a_no,
                      os.path.join(OUT, ch['id'] + '_after.png'))

render_strip('SỐ ĐO TRƯỚC / SAU (Playwright + Chrome, dev server 5173)', [
    ('$ đo thời gian từ lúc mở /admin/dishes tới khi bảng có dòng đầu tiên', 'cmd'),
    ('trước:  884 ms · 919 ms · 516 ms', 'fail'),
    ('sau:    151 ms ·  98 ms · 100 ms', 'ok'),
    ('', ''),
    ('$ gõ "banh mi" trong ô tìm kiếm /admin/places (7 ký tự, 110 ms/ký tự)', 'cmd'),
    ('trước:  7 request /places  ·  8 request /places', 'fail'),
    ('sau:    1 request /places  ·  1 request /places', 'ok'),
    ('', ''),
    ('$ đếm tiêu đề "Mẹo cho du khách" trên /place/1', 'cmd'),
    ('trước:  2 (nội dung lặp)', 'fail'),
    ('sau:    1', 'ok'),
], os.path.join(OUT, 'fe_measure.png'))

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
    r = p.add_run('Báo cáo cải thiện giao diện (Frontend) — Quận 4 Culinary Guide   |   Trang ')
    r.font.size = Pt(8.5)
    r.font.color.rgb = RGBColor(0x77, 0x77, 0x77)
    run = p.add_run()
    begin = OxmlElement('w:fldChar')
    begin.set(qn('w:fldCharType'), 'begin')
    instr = OxmlElement('w:instrText')
    instr.set(qn('xml:space'), 'preserve')
    instr.text = 'PAGE'
    end = OxmlElement('w:fldChar')
    end.set(qn('w:fldCharType'), 'end')
    run._r.append(begin)
    run._r.append(instr)
    run._r.append(end)


add_page_number_footer()

# --- cover -----------------------------------------------------------------
para('BÁO CÁO CẢI THIỆN GIAO DIỆN', size=24, bold=True, color='8B0000',
     align=WD_ALIGN_PARAGRAPH.CENTER, space_after=8)
para('Website Hướng dẫn Ẩm thực Đa ngôn ngữ Quận 4 — phần Frontend', size=14, bold=True,
     color='1F3864', align=WD_ALIGN_PARAGRAPH.CENTER, space_after=4)
para('Rà soát giao diện người dùng, sửa lỗi hiển thị và tối ưu tương tác — kèm ảnh trước / sau',
     size=11, italic=True, color='555555', align=WD_ALIGN_PARAGRAPH.CENTER, space_after=24)

make_table([
    ['Dự án', 'District 4 Culinary Guide — React 18 + Vite (website công khai và trang quản trị)'],
    ['Thời điểm thực hiện', '16/11/2026'],
    ['Phạm vi', 'Chỉ frontend web: trang công khai và khu quản trị /admin'],
    ['Không thay đổi', 'Database, migration, seed, API backend (giữ nguyên theo yêu cầu)'],
    ['Kết quả kiểm thử', 'pnpm check:all — exit 0; build production thành công; 5 lỗi giao diện đã sửa'],
    ['Nguồn ảnh', 'Ảnh mã "trước" lấy từ Git HEAD; ảnh "sau" từ mã đang làm việc; ảnh giao diện chụp bằng Chrome headless'],
], header=False)
doc.add_page_break()

# --- 1 ---------------------------------------------------------------------
doc.add_heading('1. Mục đích và phạm vi', level=1)
para('Tài liệu này ghi lại vòng rà soát riêng cho phần giao diện (frontend) của website: những chỗ '
     'người dùng nhìn thấy bị sai, những tương tác gây chậm hoặc cho ra kết quả không đúng, cách sửa và '
     'bằng chứng trước – sau. Toàn bộ phần database, migration và seed được giữ nguyên, không sửa thêm '
     'trong vòng này.')
para('Phạm vi cụ thể:')
bullet('Trang công khai: ', 'trang hướng dẫn địa điểm /place/:id — nội dung hiển thị cho khách quét mã QR.')
bullet('Khu quản trị: ', 'Dashboard, Quản lý địa điểm, Quản lý món ăn, Quản lý ngôn ngữ.')
para('Cách rà: đọc mã nguồn, chạy website thật ở chế độ dev (Vite, cổng 5173), đăng nhập bằng tài khoản '
     'quản trị demo, quan sát giao diện và đo bằng Playwright trên Chrome có sẵn trên máy. Các con số nêu '
     'trong tài liệu là kết quả đo thật, không phải ước lượng.')

# --- 2 ---------------------------------------------------------------------
doc.add_heading('2. Tổng hợp các thay đổi', level=1)
rows = [['STT', 'Hạng mục', 'Tệp thay đổi', 'Mức độ']]
for i, ch in enumerate(CHANGES, 1):
    short = ch['heading'].split('—', 1)[-1].strip()
    rows.append([str(i), short[0].upper() + short[1:], ch['path'], ch['severity']])
make_table(rows)

# --- 3 ---------------------------------------------------------------------
doc.add_heading('3. Chi tiết từng thay đổi', level=1)
para('Trong các hình mã nguồn dưới đây, khung đỏ là mã tại Git HEAD (trước khi sửa), khung xanh là mã sau '
     'khi sửa. Số dòng bên trái tương ứng với tệp thật để đối chiếu nhanh.')

for ch in CHANGES:
    doc.add_heading(ch['heading'], level=2)
    labeled('Vấn đề: ', ch['issue'])
    labeled('Cách sửa: ', ch['fix'])
    short_cap = ch['heading'].split('—', 1)[-1].strip()
    short_cap = short_cap[0].upper() + short_cap[1:]
    add_picture(os.path.join(OUT, ch['id'] + '_before.png'),
                '%s — mã trước khi sửa' % short_cap)
    add_picture(os.path.join(OUT, ch['id'] + '_after.png'),
                '%s — mã sau khi sửa' % short_cap)
    if ch['id'] == 'fe_dash':
        add_picture(os.path.join(OUT, 'fe_dash_before.png'),
                    'Dashboard trước khi sửa: tám thanh dài bằng nhau, mỗi thanh ghi số 1')
        add_picture(os.path.join(OUT, 'fe_dash_after.png'),
                    'Dashboard sau khi sửa: danh sách món đặc trưng kèm khoảng giá thật')
    if ch['id'] == 'fe_langs':
        add_picture(os.path.join(OUT, 'fe_langs_before.png'),
                    'Biểu mẫu ngôn ngữ trước khi sửa: nút "Thêm" vẫn bấm được khi các trường còn trống')
        add_picture(os.path.join(OUT, 'fe_langs_after.png'),
                    'Biểu mẫu ngôn ngữ sau khi sửa: nút "Thêm" bị vô hiệu hóa (mờ) cho tới khi điền đủ trường bắt buộc')
    labeled('Kiểm chứng: ', ch['verify'])

# --- 4 ---------------------------------------------------------------------
doc.add_heading('4. Kết quả kiểm thử và số đo', level=1)
para('Các phép đo dưới đây chạy trên cùng một máy, cùng dev server Vite cổng 5173, bằng Playwright điều '
     'khiển Chrome ở chế độ headless. Với thời gian tải trang Dishes, mỗi bên được đo ba lần sau khi đã '
     'làm nóng module, để tránh lần đo đầu bị ảnh hưởng bởi quá trình biên dịch của Vite.')
add_picture(os.path.join(OUT, 'fe_measure.png'),
            'Số đo trước và sau khi sửa: thời gian tải trang Dishes, số request khi gõ tìm kiếm và số lần lặp nội dung')

make_table([
    ['Phép đo', 'Trước khi sửa', 'Sau khi sửa'],
    ['Số mục "Mẹo cho du khách" trên /place/1', '2 (lặp nội dung)', '1'],
    ['Dashboard — số thanh biểu đồ món đặc trưng', '8 thanh, mỗi thanh = 1', '0 thanh, 8 dòng kèm giá'],
    ['Gõ "banh mi" ở /admin/places — số request /places', '7 và 8', '1 và 1'],
    ['Mở /admin/dishes tới khi có dòng đầu tiên', '884 / 919 / 516 ms', '151 / 98 / 100 ms'],
    ['Nút "Thêm" ở /admin/languages khi biểu mẫu trống', 'Bấm được', 'Bị vô hiệu hóa'],
])

make_table([
    ['Lệnh kiểm tra', 'Kết quả'],
    ['pnpm check:all', 'Exit 0 — toàn bộ kiểm tra sẵn có pass'],
    ['pnpm --filter web build', 'Build production thành công (dist)'],
    ['Chạy thật trên trình duyệt', 'Đăng nhập admin, mở 4 trang quản trị và /place/1 — không lỗi console'],
])

# --- 5 ---------------------------------------------------------------------
doc.add_heading('5. Phần database được giữ nguyên', level=1)
para('Theo yêu cầu, vòng này không thay đổi gì ở tầng dữ liệu. Các thay đổi database của vòng trước vẫn '
     'được giữ nguyên trong mã nguồn, không chỉnh sửa thêm:')
bullet('database/seeds/008_users_routes.sql: ', 'dữ liệu tuyến ẩm thực (tài khoản demo đã được tách ra).')
bullet('database/seeds/014_demo_users.sql: ', 'hai tài khoản demo admin/staff cho môi trường phát triển.')
bullet('server/src/db/seed.js: ', 'bỏ qua tệp seed tài khoản demo khi NODE_ENV=production.')
para('Năm thay đổi trong tài liệu này chỉ nằm trong apps/web/src, không thêm bảng, cột, migration hay '
     'endpoint mới, nên có thể triển khai độc lập với phần backend.')

# --- 6 ---------------------------------------------------------------------
doc.add_heading('6. Tồn đọng ở frontend', level=1)
para('Các điểm sau chưa sửa vì cần quyết định thiết kế hoặc nằm ngoài phạm vi một vòng rà soát giao diện:')
bullet('Token quản trị trong localStorage: ',
       'token JWT được giữ ở khóa d4_token, chỉ an toàn khi website không có lỗ hổng XSS. Khi triển khai '
       'thật nên chuyển sang cookie httpOnly kèm SameSite.')
bullet('Kích thước gói JavaScript: ',
       'khoảng 517 kB sau minify, Vite cảnh báo vượt 500 kB. Có thể tách theo route bằng dynamic import.')
bullet('Tìm kiếm ở trang Explore: ',
       'vẫn cập nhật URL và gọi API theo từng ký tự; có thể áp dụng cùng cơ chế debounce như trang quản trị.')
bullet('Chưa có test giao diện tự động: ',
       'dự án chỉ có test cho tiện ích và luồng ngôn ngữ; nên bổ sung test thành phần cho các biểu mẫu quản trị.')
bullet('Trùng lặp cách tải dữ liệu: ',
       'mỗi trang quản trị tự viết load()/useEffect riêng; có thể gom thành hook dùng chung để tránh lặp lại '
       'các lỗi thứ tự phản hồi.')

# --- appendix --------------------------------------------------------------
doc.add_heading('Phụ lục A. Tệp đã thay đổi trong vòng này', level=1)
make_table([
    ['Tệp', 'Nội dung thay đổi'],
    ['apps/web/src/pages/PlaceGuide.jsx', 'Bỏ khối "Mẹo cho du khách" bị lặp'],
    ['apps/web/src/admin/Dashboard.jsx', 'Thay biểu đồ thanh sai số liệu bằng danh sách món kèm giá'],
    ['apps/web/src/styles.css', 'Thêm định dạng .signature-list cho danh sách mới'],
    ['apps/web/src/admin/AdminPlaces.jsx', 'Debounce ô tìm kiếm, bỏ qua phản hồi cũ, xóa lỗi cũ'],
    ['apps/web/src/admin/AdminDishes.jsx', 'Bỏ độ trễ 300 ms, chống setState sau unmount'],
    ['apps/web/src/admin/AdminLanguages.jsx', 'Kiểm tra trường bắt buộc, vô hiệu hóa nút, dọn JSX, trạng thái rỗng'],
])

doc.add_heading('Phụ lục B. Ghi chú về hình ảnh và môi trường', level=1)
para('Ảnh mã nguồn được tạo tự động: bản "trước" đọc trực tiếp từ Git HEAD bằng lệnh git show, bản "sau" '
     'đọc từ tệp đang làm việc, nên nội dung trong ảnh khớp chính xác với mã nguồn chứ không phải hình '
     'mô phỏng. Ảnh giao diện được chụp bằng Chrome headless ở kích thước 1440×950 sau khi đăng nhập bằng '
     'tài khoản quản trị demo; ảnh được cắt đúng vùng biểu mẫu/biểu đồ liên quan để dễ đối chiếu.')
bullet('Hệ điều hành: ', 'Windows (Git Bash).')
bullet('Runtime: ', 'Node.js v24.21.0; pnpm; Vite dev server cổng 5173.')
bullet('Công cụ đo: ', 'Playwright (Python) điều khiển Chrome có sẵn trên máy, chế độ headless.')
bullet('Dịch vụ đang chạy khi kiểm thử: ', 'API http://localhost:5000, web http://localhost:5173.')

doc.save(DOCX_PATH)
print('[fe-report] saved:', DOCX_PATH)
print('[fe-report] figures:', FIG)
