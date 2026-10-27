# -*- coding: utf-8 -*-
"""Chapter 3 - analysis and design."""

from content_helpers import Tables, tbl, fig, uc_block

T = Tables("3")


CH3 = [
    ("h1", "CHƯƠNG 3. PHÂN TÍCH VÀ THIẾT KẾ"),
    ("lead", "Chương 3 đi từ mô hình ngữ cảnh đến mô tả chi tiết từng use case, rồi tới cơ sở dữ liệu, sơ đồ hoạt động, từ điển dữ liệu và thiết kế API. Các sơ đồ use case, ERD và activity được vẽ từ đúng mô hình dữ liệu và mã nguồn đã trình bày ở Chương 2; những điểm chưa hoàn thiện được ghi chú ngay tại chỗ thay vì che đi."),

    ("h2", "3.1. Sơ đồ ngữ cảnh hệ thống"),
    ("p", "Sơ đồ ngữ cảnh xác định ranh giới hệ thống và các luồng trao đổi với bên ngoài. Ba kênh tiếp cận (website khách, trang quản trị, ứng dụng Expo) nằm trong ranh giới; khách du lịch, quản trị viên và nhân viên nội dung là tác nhân con người; dịch vụ TTS và thiết bị của khách là tác nhân phụ. Hệ thống trao đổi với khách bằng nội dung đa ngữ, audio, mã QR và trạng thái mở khoá; trao đổi với quản trị bằng dữ liệu nội dung và số liệu vận hành."),
    fig("hinh_3_1_context.png", "Hình 3.1 - Sơ đồ ngữ cảnh hệ thống", 23, True),
    ("p", "Điểm cần chú ý là cổng thanh toán thật chưa nằm trong sơ đồ. Checkout hiện là một luồng sandbox nội bộ: server tạo bản ghi pending, sau đó xác nhận và mở quyền mà không gọi dịch vụ thanh toán bên ngoài. Vì vậy mọi mô tả về “thanh toán” trong báo cáo phải được hiểu là mô phỏng nghiệp vụ, không phải giao dịch tiền thật."),

    ("h2", "3.2. Sơ đồ phân rã chức năng"),
    ("p", "16 use case được nhóm theo mục tiêu người dùng và theo vai trò vận hành thành năm nhóm: khám phá, ngôn ngữ và audio, cá nhân, quản trị nội dung, hệ thống. Cách nhóm này giúp sơ đồ use case tổng quát không bị quá tải, đồng thời phản ánh đúng cấu trúc menu của website và ứng dụng. Nhóm “Cá nhân” chỉ có một use case vì dữ liệu yêu thích/lịch sử hiện lưu cục bộ trên thiết bị, chưa đồng bộ qua server."),
    fig("hinh_3_2_decomposition.png", "Hình 3.2 - Sơ đồ phân rã chức năng", 23, True),
    ("p", "Sơ đồ phân rã không phải là sơ đồ use case: nó cho thấy quan hệ “thuộc nhóm” giữa các chức năng, không thể hiện tác nhân hay include/extend. Quan hệ include/extend được trình bày ở các sơ đồ use case tiếp theo và được giải thích bằng lời trong phần mô tả từng UC."),

    ("h2", "3.3. Sơ đồ Use Case"),
    ("p", "Ba sơ đồ dưới đây chia theo mức độ chi tiết: một sơ đồ tổng quát cho toàn hệ thống, một sơ đồ cho phân hệ khách, một sơ đồ cho phân hệ quản trị. Cách chia này tránh việc nhồi 16 ellipse và hàng chục đường liên kết vào một hình, đồng thời giữ được quan hệ include/extend ở nơi cần thiết."),
    ("h3", "3.3.1. Sơ đồ tổng quát"),
    ("p", "Sơ đồ tổng quát chỉ hiển thị quan hệ association giữa tác nhân và use case. Khách du lịch liên kết với bảy use case của phân hệ công khai; ADMIN và STAFF liên kết với chín use case quản trị. Các quan hệ include/extend được tách sang Hình 3.4 và 3.5 để sơ đồ tổng quát còn đọc được."),
    fig("hinh_3_3_usecase_overview.png", "Hình 3.3 - Sơ đồ use case tổng quát", 23, True),
    ("h3", "3.3.2. Phân hệ khách du lịch"),
    ("p", "Phân hệ khách có hai quan hệ đáng chú ý. UC-04 (Quét mã QR) luôn mở trang hướng dẫn nên có quan hệ «include» tới UC-02. UC-03 (Mở khoá ngôn ngữ) chỉ phát sinh khi ngôn ngữ bị khoá, nên được mô hình hoá là «extend» của UC-02. UC-06 là use case độc lập, dữ liệu lưu cục bộ trên thiết bị. Thiết bị của khách là tác nhân phụ cung cấp camera và GPS cho UC-04, UC-05; dịch vụ TTS là tác nhân phụ tuỳ chọn của UC-05."),
    fig("hinh_3_4_usecase_visitor.png", "Hình 3.4 - Sơ đồ use case phân hệ khách du lịch", 23, True),
    ("h3", "3.3.3. Phân hệ quản trị"),
    ("p", "Phân hệ quản trị có hai use case dùng chung: UC-11 (Quản lý bản dịch) và UC-14 (Audio & mã QR). Cả quản lý địa điểm lẫn quản lý món ăn đều có thể mở trình quản lý bản dịch, audio và QR; sơ đồ chỉ vẽ hai quan hệ «include» đại diện để tránh lặp lại. ADMIN và STAFF đều đăng nhập được; chỉ ADMIN quản lý người dùng, xoá địa điểm/tuyến và thay đổi ngôn ngữ."),
    fig("hinh_3_5_usecase_admin.png", "Hình 3.5 - Sơ đồ use case phân hệ quản trị", 23, True),
    ("h3", "3.3.4. Danh mục use case"),
    ("p", "Bảng 3.1 là danh mục 16 use case dùng xuyên suốt báo cáo. Mỗi UC có một bảng mô tả 11 trường, một bảng luồng chính và hai user story kèm tiêu chí chấp nhận ở mục 3.4. Mức ưu tiên Must/Should/Could nhất quán với bảng yêu cầu chức năng ở Chương 1."),
    tbl(T.caption("Danh mục use case"),
        ["Mã", "Tên use case", "Actor chính", "Mục tiêu ngắn", "Ưu tiên"],
        [
            ["UC-01", "Tra cứu địa điểm", "Khách", "Tìm quán theo từ khoá, bộ lọc, vị trí", "Must"],
            ["UC-02", "Xem hướng dẫn địa điểm", "Khách", "Đọc/nghe nội dung đa ngữ của địa điểm", "Must"],
            ["UC-03", "Mở khoá ngôn ngữ", "Khách", "Chọn slot miễn phí hoặc mở toàn bộ ngôn ngữ", "Must"],
            ["UC-04", "Quét mã QR", "Khách + thiết bị", "Mở đúng trang hướng dẫn và ghi lượt quét", "Must"],
            ["UC-05", "Nghe thuyết minh GPS", "Khách + thiết bị", "Tự phát audio khi đến gần địa điểm", "Must"],
            ["UC-06", "Yêu thích & lịch sử", "Khách", "Lưu và xem lại địa điểm quan tâm", "Should"],
            ["UC-07", "Xem tuyến ẩm thực", "Khách", "Khám phá tuyến và thứ tự điểm dừng", "Should"],
            ["UC-08", "Đăng nhập quản trị", "ADMIN/STAFF", "Xác thực và nhận JWT 12 giờ", "Must"],
            ["UC-09", "Quản lý địa điểm", "ADMIN/STAFF", "CRUD và xuất bản địa điểm", "Must"],
            ["UC-10", "Quản lý món ăn", "ADMIN/STAFF", "CRUD món theo địa điểm", "Must"],
            ["UC-11", "Quản lý bản dịch", "ADMIN/STAFF", "Soạn bản dịch đa ngữ và audio", "Must"],
            ["UC-12", "Quản lý tuyến", "ADMIN/STAFF", "Quản lý tuyến và điểm dừng", "Should"],
            ["UC-13", "Danh mục & ngôn ngữ", "ADMIN", "Quản lý danh mục và ngôn ngữ", "Must"],
            ["UC-14", "Audio & mã QR", "ADMIN/STAFF", "Tải/sinh audio, tạo mã QR", "Should"],
            ["UC-15", "Người dùng & vai trò", "ADMIN", "Quản lý tài khoản và quyền", "Must"],
            ["UC-16", "Dashboard & thống kê", "ADMIN/STAFF", "Xem số liệu vận hành", "Should"],
        ], [1.4, 4.2, 2.6, 6.6, 1.6], font=9.8),

    ("h2", "3.4. Mô tả các use case"),
    ("p", "Mỗi use case dưới đây gồm ba phần: bảng mô tả 11 trường, bảng luồng chính (bước – tác nhân – phản hồi) và hai user story kèm tiêu chí chấp nhận. Bảng mô tả giữ đúng 11 trường để thuận tiện đối chiếu; các nhánh phức tạp được tóm tắt ở trường “Luồng thay thế / ngoại lệ” và được triển khai chi tiết trong bảng bước. Quy ước viết: tên UC là động từ + tân ngữ; “hệ thống” chỉ server/API; “ứng dụng” chỉ web hoặc mobile khi hành vi khác nhau."),
    ("note", "Các bảng mô tả phản ánh thiết kế nghiệp vụ và hành vi mong đợi. Nếu một bước phụ thuộc vào phần chưa chạy được (ví dụ đăng nhập do lệch schema), điều đó được ghi rõ trong trường luồng ngoại lệ hoặc ở mục 2.6. Không có use case nào được mô tả như đã kiểm thử thành công nếu chưa có bằng chứng."),
]

from uc_blocks_a import blocks as _uc_a
from uc_blocks_b import blocks as _uc_b
from content_ch3_rest import rest as _rest

CH3 += _uc_a(T) + _uc_b(T) + _rest(T)
