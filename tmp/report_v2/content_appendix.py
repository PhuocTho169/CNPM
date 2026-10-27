# -*- coding: utf-8 -*-
"""References and appendices."""

from content_helpers import tbl
from api_routes import ROUTES


REFERENCES = [
    ("h1c", "TÀI LIỆU THAM KHẢO"),
    ("ref", "[1] Node.js Foundation, “Node.js Documentation,” https://nodejs.org/docs/latest/api/. Truy cập 10/2026."),
    ("ref", "[2] OpenJS Foundation, “Express 4.x API Reference,” https://expressjs.com/en/4x/api.html. Truy cập 10/2026."),
    ("ref", "[3] The PostgreSQL Global Development Group, “PostgreSQL 16 Documentation,” https://www.postgresql.org/docs/16/. Truy cập 10/2026."),
    ("ref", "[4] Meta Open Source, “React Documentation,” https://react.dev/. Truy cập 10/2026."),
    ("ref", "[5] Remix Software, “React Router Documentation (v6),” https://reactrouter.com/en/v6.26.2. Truy cập 10/2026."),
    ("ref", "[6] Expo, “Expo SDK 51 Documentation,” https://docs.expo.dev/versions/v51.0.0/. Truy cập 10/2026."),
    ("ref", "[7] Meta Open Source, “React Native Documentation,” https://reactnative.dev/docs/0.74/. Truy cập 10/2026."),
    ("ref", "[8] MDN Web Docs, “Web Speech API,” https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API. Truy cập 10/2026."),
    ("ref", "[9] MDN Web Docs, “MediaDevices.getUserMedia(),” https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia. Truy cập 10/2026."),
    ("ref", "[10] Cozmo, “jsQR – A pure JavaScript QR code reading library,” https://github.com/cozmo/jsQR. Truy cập 10/2026."),
    ("ref", "[11] Soldair, “node-qrcode – QR code generation for Node.js,” https://www.npmjs.com/package/qrcode. Truy cập 10/2026."),
    ("ref", "[12] Auth0, “JSON Web Token Introduction,” https://jwt.io/introduction. Truy cập 10/2026."),
    ("ref", "[13] Docker Inc., “Docker Compose Documentation,” https://docs.docker.com/compose/. Truy cập 10/2026."),
    ("ref", "[14] Object Management Group, “OMG Unified Modeling Language (UML), Version 2.5.1,” https://www.omg.org/spec/UML/2.5.1. Truy cập 10/2026."),
    ("ref", "[15] OWASP Foundation, “OWASP Application Security Verification Standard,” https://owasp.org/www-project-application-security-verification-standard/. Truy cập 10/2026."),
]


_UC_INDEX = [
    ("UC-01", "Tra cứu địa điểm", "GET /places, GET /places/nearby", "3.4, 3.10", "3.2"),
    ("UC-02", "Xem hướng dẫn địa điểm", "GET /places/:id/guide, GET /culinary-places/:placeId/translation", "3.4", "3.4"),
    ("UC-03", "Mở khoá ngôn ngữ", "POST /guest-sessions/free-language, /checkouts, /checkouts/:id/confirm", "3.11", "3.6"),
    ("UC-04", "Quét mã QR", "GET /places/:id/qr, POST /places/:id/scan", "3.12", "3.8"),
    ("UC-05", "Nghe thuyết minh GPS", "GET /culinary-places/nearby, GET /culinary-places/:placeId/audio", "3.13", "3.10"),
    ("UC-06", "Yêu thích và lịch sử", "GET/POST/DELETE /favorites, GET/POST /history", "3.4", "3.12"),
    ("UC-07", "Xem tuyến ẩm thực", "GET /routes, GET /routes/:id", "3.4", "3.14"),
    ("UC-08", "Đăng nhập quản trị", "POST /auth/login, GET /auth/me", "3.5", "3.16"),
    ("UC-09", "Quản lý địa điểm", "POST/PUT/PATCH/DELETE /places", "3.14", "3.18"),
    ("UC-10", "Quản lý món ăn", "POST/PUT/DELETE /dishes, POST /dishes/:id/image", "3.5", "3.20"),
    ("UC-11", "Quản lý bản dịch", "POST /places/:id/translations, PUT/DELETE /translations/:translationId", "3.14", "3.22"),
    ("UC-12", "Quản lý tuyến", "POST/PUT/DELETE /routes, /routes/:id/stops", "3.5", "3.24"),
    ("UC-13", "Danh mục và ngôn ngữ", "POST/PUT/DELETE /languages, /categories", "3.5", "3.26"),
    ("UC-14", "Audio và mã QR", "POST /translations/:translationId/audio, POST /tts, /places/:id/qr", "3.5", "3.28"),
    ("UC-15", "Người dùng và vai trò", "GET/POST/PUT/DELETE /users, GET /roles", "3.5", "3.30"),
    ("UC-16", "Dashboard và thống kê", "GET /dashboard/statistics, /statistics/scans, /statistics/audio", "3.5", "3.32"),
]


APPENDIX = [
    ("h1c", "PHỤ LỤC"),
    ("h2", "Phụ lục A. Danh sách đầy đủ endpoint"),
    ("p", "Bảng dưới liệt kê 88 endpoint được đăng ký tại thời điểm lập báo cáo. Danh sách được lấy bằng cách duyệt trực tiếp router Express, bao gồm cả router con guest-sessions gắn bằng router.use; vì vậy con số 88 khớp với 76 route khai báo trong routes/index.js và 12 route trong routes/guest.js. Cột quyền truy cập phản ánh middleware thực tế, không phải quy ước lý thuyết."),
    ("p", "Ý nghĩa cột quyền: “Công khai” không cần token; “JWT” cần header Authorization; “ADMIN” và “ADMIN/STAFF” là phân quyền theo vai trò; “Phiên khách” cần cookie guest_session_id; “Phiên khách + quyền” còn phải có ngôn ngữ nằm trong hai slot miễn phí hoặc đã mua."),
]

_appendix_rows = []
_group_order = [
    "Hệ thống & xác thực",
    "Người dùng, vai trò, quyền",
    "Danh mục & ngôn ngữ",
    "Địa điểm (công khai)",
    "Địa điểm (quản trị)",
    "Bản dịch & hình ảnh",
    "Món ăn & bản dịch",
    "Audio & GPS",
    "Tuyến & điểm dừng",
    "Audio & TTS",
    "Mã QR",
    "Phiên khách và checkout",
    "Thống kê",
    "Cá nhân và hoạt động",
]
for _g in _group_order:
    for _r in ROUTES:
        if _r[0] == _g:
            _appendix_rows.append(_r)
assert len(_appendix_rows) == 88, len(_appendix_rows)

_rows = [[str(i + 1), g, m, p, a] for i, (g, m, p, a) in enumerate(_appendix_rows)]

APPENDIX += [
    tbl("Bảng A.1 - Danh sách 88 endpoint của hệ thống",
        ["STT", "Nhóm", "Method", "Đường dẫn", "Quyền"],
        _rows, [1.0, 3.5, 1.7, 6.8, 3.0], font=8.2),
    ("note", "Thứ tự trong bảng theo nhóm chức năng và thứ tự khai báo route, không theo thứ tự ABC. Các endpoint có cùng đường dẫn nhưng khác method được liệt kê riêng vì quyền và hành vi khác nhau."),

    ("h2", "Phụ lục B. Đối chiếu use case, endpoint và hình"),
    ("p", "Bảng này nối 16 use case với endpoint chính, hình minh hoạ và bảng mô tả tương ứng. Cột “Bảng” dùng số bảng mô tả 11 trường; bảng luồng chính của cùng use case là số kế tiếp. Cách tra cứu này giúp đi từ một endpoint trong mã nguồn về đúng phần phân tích nghiệp vụ."),
    tbl("Bảng B.1 - Đối chiếu use case với endpoint và hình",
        ["Mã", "Tên use case", "Endpoint chính", "Hình", "Bảng"],
        [list(r) for r in _UC_INDEX], [1.4, 3.8, 7.4, 1.7, 1.7], font=9.2),
    ("note", "Các hình 3.4 và 3.5 là sơ đồ use case theo phân hệ, không phải hình riêng cho từng use case. Hình 3.6–3.9 là ERD; Hình 3.10–3.14 là sơ đồ hoạt động; Hình 4.1–4.3 là sơ đồ tuần tự. Các bảng mô tả use case nằm trong mục 3.4."),
]
