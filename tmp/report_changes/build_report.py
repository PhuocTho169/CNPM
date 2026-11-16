# -*- coding: utf-8 -*-
"""Build the change report (.docx) with before/after code images and UI screenshots."""
import html as htmlmod
import os
import re
import subprocess
import sys
from datetime import date

from docx import Document
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.shared import Cm, Pt, RGBColor

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
OUT = os.path.dirname(os.path.abspath(__file__))
CHROME = r'C:\Program Files\Google\Chrome\Application\chrome.exe'

# ---------------------------------------------------------------- git access

def git(*args):
    return subprocess.check_output(['git'] + list(args), cwd=ROOT).decode('utf-8')


def read_worktree(path):
    with open(os.path.join(ROOT, path), encoding='utf-8') as f:
        return f.read()


def read_head(path):
    return git('show', 'HEAD:' + path.replace('\\', '/'))


def norm(text):
    return text.replace('\r\n', '\n').replace('\r', '\n')


def split_lines(text):
    return norm(text).split('\n')


def find_index(lines, needle, occurrence=0, start=0):
    seen = 0
    for i in range(start, len(lines)):
        if needle in lines[i]:
            if seen == occurrence:
                return i
            seen += 1
    raise ValueError('not found: %r' % needle)


def until_index(lines, needle, start):
    for i in range(start, len(lines)):
        if needle in lines[i]:
            return i
    raise ValueError('not found after: %r' % needle)


def take(lines, start, count):
    return lines[start:start + count]


def truncate_lines(lines, limit):
    if len(lines) <= limit:
        return lines
    head = lines[:limit - 4]
    tail = lines[-3:]
    return head + ['    … (lược bớt để vừa trang)'] + tail


# ---------------------------------------------------------------- snippets

before_place = split_lines(read_head('server/src/services/placeService.js'))
after_place = split_lines(read_worktree('server/src/services/placeService.js'))

before_geo = split_lines(read_head('apps/web/src/utils/geo.js'))
after_geo = split_lines(read_worktree('apps/web/src/utils/geo.js'))

before_routes = split_lines(read_head('server/src/routes/index.js'))
after_routes = split_lines(read_worktree('server/src/routes/index.js'))

before_guest = split_lines(read_head('server/src/routes/guest.js'))
after_guest = split_lines(read_worktree('server/src/routes/guest.js'))

before_mw = split_lines(read_head('server/src/middleware/entitlement.js'))
after_mw = split_lines(read_worktree('server/src/middleware/entitlement.js'))

before_login = split_lines(read_head('apps/web/src/admin/AdminLogin.jsx'))
after_login = split_lines(read_worktree('apps/web/src/admin/AdminLogin.jsx'))

before_env = split_lines(read_head('server/.env.example'))
after_env = split_lines(read_worktree('server/.env.example'))

before_layout = split_lines(read_head('apps/web/src/admin/AdminLayout.jsx'))
after_layout = split_lines(read_worktree('apps/web/src/admin/AdminLayout.jsx'))

before_settings = split_lines(read_head('apps/web/src/admin/AdminSettings.jsx'))
after_settings = split_lines(read_worktree('apps/web/src/admin/AdminSettings.jsx'))

before_seed008 = split_lines(read_head('database/seeds/008_users_routes.sql'))
after_demo014 = split_lines(read_worktree('database/seeds/014_demo_users.sql'))

before_seedjs = split_lines(read_head('server/src/db/seed.js'))
after_seedjs = split_lines(read_worktree('server/src/db/seed.js'))

before_mobile = split_lines(read_head('apps/mobile/src/screens/PlaceDetailScreen.js'))
after_mobile = split_lines(read_worktree('apps/mobile/src/screens/PlaceDetailScreen.js'))

# Mobile: stray JSX at the top of the module
mb_start = find_index(before_mobile, "import { t } from '../utils/i18n';")
mb_top_before = (take(before_mobile, mb_start, 9), mb_start + 1)
ma_start = find_index(after_mobile, 'function fmt(sec) {') - 2
mb_top_after = (take(after_mobile, ma_start, 3), ma_start + 1)

# Mobile: broken tourist-tips fragment in the middle
mb_mid_start = find_index(before_mobile, '{current?.description && (')
mb_mid_before = (take(before_mobile, mb_mid_start, 13), mb_mid_start + 1)
ma_mid_start = find_index(after_mobile, '{current?.description && (')
mb_mid_after = (take(after_mobile, ma_mid_start, 7), ma_mid_start + 1)

# placeService alert() debug block
p0 = find_index(before_place, 'if (row.zone_radius >= 0')
place_before = (take(before_place, p0, 6), p0 + 1)
p1 = find_index(after_place, '// Tự động tạo QR code')
place_after = (take(after_place, p1, 1), p1 + 1)

# geo.js OSM URL
g0 = find_index(before_geo, 'export function osmMapUrl')
geo_before = (take(before_geo, g0, 3), g0 + 1)
g1 = find_index(after_geo, 'export function osmMapUrl')
geo_after = (take(after_geo, g1, 3), g1 + 1)

# login rate limit
r0 = find_index(before_routes, '// ---------- Auth ----------')
routes_before = (take(before_routes, r0, 2), r0 + 1)
r1 = find_index(after_routes, '// ---------- Auth ----------')
r1_end = until_index(after_routes, "router.post('/auth/login', loginLimiter", r1)
routes_after = (take(after_routes, r1, r1_end - r1 + 1), r1 + 1)

# guest session delete ownership
s0 = find_index(before_guest, "router.delete('/:id'")
s0_end = until_index(before_guest, '});', s0)
session_before = (take(before_guest, s0, s0_end - s0 + 1), s0 + 1)
s1 = find_index(after_guest, "router.delete('/:id'")
s1_end = until_index(after_guest, '});', s1)
session_after = (take(after_guest, s1, s1_end - s1 + 1), s1 + 1)

# removed free-unlock purchase route
pu0 = find_index(before_guest, 'POST /api/guest-sessions/languages/:languageId/purchase') - 1
pu0_end = until_index(before_guest, '});', pu0)
purchase_before = (truncate_lines(take(before_guest, pu0, pu0_end - pu0 + 1), 16), pu0 + 1)
pu1 = find_index(after_guest, '// ---------- Checkouts (pay-to-unlock transaction records) ----------')
purchase_after = (take(after_guest, pu1, 1), pu1 + 1)

# attachGuestSession error handling
m0 = find_index(before_mw, 'async function attachGuestSession')
m0_end = until_index(before_mw, '  next();', m0) + 1
mw_before = (take(before_mw, m0, m0_end - m0 + 1), m0 + 1)
m1 = find_index(after_mw, 'async function attachGuestSession')
m1_end = until_index(after_mw, '    return next(err);', m1) + 2
mw_after = (take(after_mw, m1, m1_end - m1 + 1), m1 + 1)

# admin login demo hint
l0 = find_index(before_login, '<div className="hint">')
login_before = (take(before_login, l0, 5), l0 + 1)
l1 = find_index(after_login, '{import.meta.env.DEV && (')
login_after = (take(after_login, l1, 7), l1 + 1)

# admin login: role check (HEAD submit block is the pre-check version)
a0 = find_index(before_login, '  const submit = async (e) => {')
adminrole_before = (take(before_login, a0 + 4, 5), a0 + 5)
a1 = find_index(after_login, '      const account = res.data.data.user')
adminrole_after = (take(after_login, a1 - 1, 12), a1)

# admin layout: role guard
lay0 = find_index(before_layout, '  if (!checked) return')
adminlayout_before = (take(before_layout, lay0, 2), lay0 + 1)
lay1 = find_index(after_layout, 'const ADMIN_ROLES')
lay1_end = find_index(after_layout, '  if (!allowed) return')
adminlayout_after = (take(after_layout, lay1, lay1_end - lay1 + 1), lay1 + 1)

# admin settings: demo credential note only in dev
set0 = find_index(before_settings, 'Demo accounts are <strong>')
adminsettings_before = (take(before_settings, set0, 1), set0 + 1)
set1 = find_index(after_settings, '{import.meta.env.DEV ? (')
set1_end = until_index(after_settings, 'Demo accounts are not part of a production deployment', set1) + 1
adminsettings_after = (take(after_settings, set1, set1_end - set1 + 1), set1 + 1)

# seed: demo accounts moved out of 008 into 014
sd0 = find_index(before_seed008, '-- 008: Demo accounts')
sd0_end = until_index(before_seed008, "'Content Staff', 'STAFF')", sd0)
seeddemo_before = (take(before_seed008, sd0, sd0_end - sd0 + 1), sd0 + 1)
seeddemo_after = (take(after_demo014, find_index(after_demo014, '-- 014:'), 15),
                  find_index(after_demo014, '-- 014:') + 1)

# seed.js: skip demo file in production
sj0 = find_index(before_seedjs, 'async function seed()')
seedguard_before = (take(before_seedjs, sj0, 3), sj0 + 1)
sj1 = find_index(after_seedjs, '// Demo logins use well-known passwords')
sj1_end = find_index(after_seedjs, '      continue;') + 2
seedguard_after = (take(after_seedjs, sj1, sj1_end - sj1 + 1), sj1 + 1)

# env database port
e0 = find_index(before_env, '# On host: localhost:5432.')
env_before = (take(before_env, e0, 2), e0 + 1)
e1 = find_index(after_env, '# On host: localhost:5433')
env_after = (take(after_env, e1, 3), e1 + 1)

CHANGES = [
    {
        'id': 'mob1', 'heading': '3.1 Ứng dụng mobile — file PlaceDetailScreen.js bị hỏng cú pháp',
        'path': 'apps/mobile/src/screens/PlaceDetailScreen.js', 'severity': 'Nghiêm trọng',
        'issue': 'Một khối JSX (lịch sử / văn hoá / mẹo du lịch) bị dán nhầm lên đầu module, trước khi khai báo component. Metro không parse được file nên toàn bộ app mobile không build được. Khối này còn dùng biến currentLocale không tồn tại.',
        'fix': 'Xoá khối JSX thừa ở đầu file, bỏ import t không còn dùng.',
        'verify': 'pnpm --filter mobile check:syntax: 23/24 → 24/24 file parse OK.',
        'before': mb_top_before, 'after': mb_top_after, 'label_before': 'Đầu file chứa JSX nằm ngoài component',
    },
    {
        'id': 'mob2', 'heading': '3.2 Ứng dụng mobile — khối mô tả bị đứt gãy giữa file',
        'path': 'apps/mobile/src/screens/PlaceDetailScreen.js', 'severity': 'Nghiêm trọng',
        'issue': 'Khối mô tả địa điểm thiếu fragment bao ngoài (hai thẻ <Text> đứng cạnh nhau), ngay sau đó là một đoạn mẹo du lịch mồ côi (thiếu phần mở {current?.tourist_tips && (<>).',
        'fix': 'Bọc phần mô tả trong <>…</> và xoá đoạn mẹo du lịch trùng lặp (phía dưới đã có mục "Tourist tips" đầy đủ).',
        'verify': 'Cùng lần kiểm tra cú pháp ở trên; file hiện parse sạch.',
        'before': mb_mid_before, 'after': mb_mid_after, 'label_before': 'Thiếu fragment và còn khối rác',
    },
    {
        'id': 'place', 'heading': '3.3 Backend — gỡ code debug alert() khi tạo địa điểm',
        'path': 'server/src/services/placeService.js', 'severity': 'Cao',
        'issue': 'Sau khi INSERT, create() kiểm tra bán kính rồi gọi alert() — hàm chỉ có trong trình duyệt, không có trong Node. Mọi địa điểm có zone_radius từ 25 đến 50 sẽ nhận lỗi 500 dù bản ghi đã được tạo (gây trùng khi thử lại), và câu thông báo còn ngược nghĩa với điều kiện.',
        'fix': 'Xoá khối debug. Việc giới hạn bán kính đã được clampZone() ở controller thực hiện (25–1000 m), không cần kiểm tra lại ở service.',
        'verify': 'Tạo địa điểm qua API với zone_radius=40: thành công (trước đây 500), sau đó xoá dọn bản ghi.',
        'before': place_before, 'after': place_after, 'label_before': 'Khối debug còn sót lại',
    },
    {
        'id': 'geo', 'heading': '3.4 Web — sửa URL OpenStreetMap dự phòng',
        'path': 'apps/web/src/utils/geo.js', 'severity': 'Trung bình',
        'issue': 'Hàm osmMapUrl() trả về openstreetmap.de/karte.html, trong khi bộ test của dự án (và hành vi chuẩn) yêu cầu openstreetmap.org kèm mlat/mlon và hash #map=zoom/lat/lon. Vì vậy pnpm check:all luôn đỏ ở bước test web.',
        'fix': 'Dùng URL chuẩn https://www.openstreetmap.org/?mlat=…&mlon=…#map=17/lat/lon.',
        'verify': 'pnpm --filter web test: 12 passed, 1 failed → 12 passed, 0 failed.',
        'before': geo_before, 'after': geo_after, 'label_before': 'Miền .de và tham số zoom/lat/lon',
    },
    {
        'id': 'ratelimit', 'heading': '3.5 Backend — giới hạn số lần đăng nhập sai',
        'path': 'server/src/routes/index.js', 'severity': 'Cao (bảo mật)',
        'issue': 'POST /auth/login chỉ chịu rate-limit chung 300 request/phút của toàn bộ /api, đủ để dò mật khẩu tự động.',
        'fix': 'Thêm limiter riêng: tối đa 10 lần thất bại trong 15 phút cho mỗi IP; đăng nhập thành công không bị tính (skipSuccessfulRequests).',
        'verify': 'Đăng nhập admin thành công sau khi thêm limiter; các lần sai trả 401 như cũ.',
        'before': routes_before, 'after': routes_after, 'label_before': 'Route đăng nhập không có giới hạn riêng',
    },
    {
        'id': 'session', 'heading': '3.6 Backend — chặn xoá guest session của người khác (IDOR)',
        'path': 'server/src/routes/guest.js', 'severity': 'Cao (bảo mật)',
        'issue': 'DELETE /api/guest-sessions/:id lấy id từ URL rồi xoá thẳng, không kiểm tra session đó có thuộc về người gọi hay không. Ai biết display_id/id của khách khác đều có thể huỷ phiên của họ.',
        'fix': 'Bắt buộc phải có guest session hiện tại và id truyền vào phải trùng id hoặc display_id của chính phiên đó; nếu không trả 403.',
        'verify': 'Gọi API thật: xoá session của người khác → 403; xoá session của mình → 200.',
        'before': session_before, 'after': session_after, 'label_before': 'Xoá trực tiếp theo id trên URL',
    },
    {
        'id': 'purchase', 'heading': '3.7 Backend — xoá route mở khoá ngôn ngữ miễn phí',
        'path': 'server/src/routes/guest.js, server/src/services/entitlementService.js', 'severity': 'Cao (bảo mật)',
        'issue': 'POST /api/guest-sessions/languages/:languageId/purchase cộng thẳng ngôn ngữ vào purchased_languages mà không kiểm tra thanh toán (di sản của luồng sandbox cũ). Bất kỳ ai cũng mở được nội dung trả phí miễn phí.',
        'fix': 'Xoá route và hàm purchaseLanguage() không còn dùng. Luồng hợp lệ vẫn là checkouts → xác nhận VNPay sandbox.',
        'verify': 'Gọi lại endpoint: 404 (route đã bị xoá).',
        'before': purchase_before, 'after': purchase_after, 'label_before': 'Route cấp quyền ngay, không qua thanh toán',
    },
    {
        'id': 'mw', 'heading': '3.8 Backend — bắt lỗi DB trong middleware attachGuestSession',
        'path': 'server/src/middleware/entitlement.js', 'severity': 'Trung bình',
        'issue': 'Middleware async không có try/catch. Express 4 không bắt promise bị reject, nên khi database lỗi tạm thời request sẽ treo vô hạn và sinh unhandled rejection thay vì trả lỗi 500 có kiểm soát.',
        'fix': 'Bọc toàn bộ thân hàm trong try/catch và chuyển lỗi cho next(err).',
        'verify': 'Server khởi động lại sạch sau thay đổi; các endpoint dùng middleware vẫn trả đúng dữ liệu.',
        'before': mw_before, 'after': mw_after, 'label_before': 'Không có xử lý lỗi',
    },
    {
        'id': 'adminui', 'heading': '3.9 Web — ẩn tài khoản demo ở trang đăng nhập admin',
        'path': 'apps/web/src/admin/AdminLogin.jsx', 'severity': 'Trung bình (bảo mật)',
        'issue': 'Trang đăng nhập hiển thị sẵn email/mật khẩu tài khoản admin và staff ở mọi môi trường, kể cả bản build production.',
        'fix': 'Chỉ render khối gợi ý khi đang chạy dev bằng import.meta.env.DEV.',
        'verify': 'Chụp màn hình dev (còn gợi ý) và bản build production (đã ẩn) — hai hình giao diện ngay bên dưới.',
        'before': login_before, 'after': login_after, 'label_before': 'Luôn hiển thị tài khoản demo',
    },
    {
        'id': 'env', 'heading': '3.10 Cấu hình — sửa cổng PostgreSQL trong file mẫu',
        'path': '.env.example, server/.env.example', 'severity': 'Thấp',
        'issue': 'Hướng dẫn ghi database ở localhost:5432, nhưng docker-compose publish PostgreSQL ra cổng 5433. Người mới clone làm theo file mẫu sẽ kết nối sai cổng.',
        'fix': 'Cập nhật URL mẫu sang 5433 và ghi rõ 5432 chỉ dùng bên trong container.',
        'verify': 'server/.env đang chạy thực tế dùng đúng cổng 5433 và API kết nối database thành công.',
        'before': env_before, 'after': env_after, 'label_before': 'Cổng 5432 không khớp docker-compose',
    },
    {
        'id': 'adminrole', 'heading': '3.11 Web — chặn tài khoản không có quyền vào trang quản trị',
        'path': 'apps/web/src/admin/AdminLogin.jsx', 'severity': 'Trung bình (bảo mật)',
        'issue': 'Form đăng nhập quản trị chấp nhận mọi tài khoản đang hoạt động, kể cả tài khoản vai trò VISITOR. API có chặn các endpoint quản trị bằng requireRole, nhưng người dùng vẫn được đưa vào khung /admin với menu đầy đủ và mọi trang đều trống hoặc báo lỗi 403.',
        'fix': 'Sau khi đăng nhập, kiểm tra vai trò: chỉ ADMIN hoặc STAFF mới được lưu token và chuyển vào /admin; các vai trò khác nhận thông báo không có quyền truy cập.',
        'verify': 'Đăng nhập admin@district4.local vẫn vào dashboard bình thường; tài khoản VISITOR bị từ chối ngay ở form đăng nhập.',
        'before': adminrole_before, 'after': adminrole_after,
        'label_before': 'Lưu token cho mọi vai trò',
    },
    {
        'id': 'adminlayout', 'heading': '3.12 Web — chặn mở thẳng /admin bằng token không hợp lệ về vai trò',
        'path': 'apps/web/src/admin/AdminLayout.jsx', 'severity': 'Trung bình (bảo mật)',
        'issue': 'AdminLayout chỉ kiểm tra đã có user hay chưa. Nếu trong localStorage còn token của một tài khoản VISITOR (hoặc token cũ được gán tay), người dùng vẫn thấy toàn bộ khung quản trị và có thể đọc cấu trúc menu, trạng thái hệ thống.',
        'fix': 'Định nghĩa ADMIN_ROLES = [ADMIN, STAFF], chỉ render khung quản trị khi vai trò nằm trong danh sách; trường hợp khác thì xoá token, đăng xuất và chuyển về /admin/login.',
        'verify': 'Mở /admin khi đã đăng nhập admin: hiển thị bình thường. Xoá token và dùng token VISITOR: bị đẩy về trang đăng nhập, token bị xoá.',
        'before': adminlayout_before, 'after': adminlayout_after,
        'label_before': 'Chỉ kiểm tra có user, không kiểm tra vai trò',
    },
    {
        'id': 'adminsettings', 'heading': '3.13 Web — không hiển thị mật khẩu tài khoản demo ở trang Settings',
        'path': 'apps/web/src/admin/AdminSettings.jsx', 'severity': 'Thấp (bảo mật)',
        'issue': 'Mục Deployment notes trong trang Settings luôn in ra địa chỉ các tài khoản demo. Khối gợi ý ở trang đăng nhập đã được ẩn khi production, nhưng bản build thật vẫn để lộ sự tồn tại của các tài khoản này cho bất kỳ ai đăng nhập được.',
        'fix': 'Ở môi trường dev hiển thị nguyên văn địa chỉ demo; ở bản production chỉ nhắc xoá tài khoản demo trước khi triển khai, không nêu địa chỉ.',
        'verify': 'Build production: mục Settings không còn địa chỉ admin@district4.local/staff@district4.local. Dev: gợi ý vẫn còn để tiện đăng nhập.',
        'before': adminsettings_before, 'after': adminsettings_after,
        'label_before': 'Luôn in địa chỉ tài khoản demo',
    },
    {
        'id': 'seeddemo', 'heading': '3.14 Seed — tách tài khoản demo khỏi dữ liệu nạp chung',
        'path': 'database/seeds/008_users_routes.sql → database/seeds/014_demo_users.sql', 'severity': 'Trung bình (bảo mật)',
        'issue': 'Tài khoản admin/staff demo nằm lẫn trong 008_users_routes.sql cùng dữ liệu tuyến ẩm thực, nên không thể nạp tuyến mà bỏ tài khoản demo. Chạy seed trên môi trường thật sẽ tạo ra hai tài khoản có mật khẩu công khai trong tài liệu.',
        'fix': 'Chuyển phần tài khoản demo sang tệp riêng 014_demo_users.sql (kèm CREATE EXTENSION pgcrypto); 008 chỉ còn dữ liệu tuyến ẩm thực. Nội dung tài khoản và mật khẩu giữ nguyên.',
        'verify': 'pnpm --filter server seed: 014 được nạp, đăng nhập admin@district4.local thành công. Seed vẫn idempotent (ON CONFLICT DO NOTHING).',
        'before': seeddemo_before, 'after': seeddemo_after,
        'label_before': 'Tài khoản demo nằm trong 008',
    },
    {
        'id': 'seedguard', 'heading': '3.15 Seed — bỏ qua tài khoản demo khi NODE_ENV=production',
        'path': 'server/src/db/seed.js', 'severity': 'Trung bình (bảo mật)',
        'issue': 'seed() nạp mọi tệp .sql theo thứ tự, không phân biệt môi trường. Một lần chạy seed trên máy chủ production là đủ để tạo lại các tài khoản demo dù đã xoá trước đó.',
        'fix': 'Thêm danh sách PROD_SKIP cho tệp 014_*.sql: khi NODE_ENV=production thì bỏ qua và ghi log rõ ràng; các tệp dữ liệu khác vẫn nạp bình thường.',
        'verify': 'NODE_ENV=production node src/db/seed.js in ra "[seed] skipped 014_demo_users.sql (production)"; chạy seed ở dev vẫn nạp 014 và đăng nhập được.',
        'before': seedguard_before, 'after': seedguard_after,
        'label_before': 'Nạp mọi tệp, không phân biệt môi trường',
    },
]
