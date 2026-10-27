# -*- coding: utf-8 -*-
"""Chapter 5 - conclusion."""

from content_helpers import Tables, tbl

T = Tables("5")


CH5 = [
    ("h1", "CHƯƠNG 5. KẾT LUẬN VÀ KIẾN NGHỊ"),
    ("lead", "Chương cuối đối chiếu mục tiêu sản phẩm với những gì đã hoàn thành, nêu rõ phần còn thiếu và đề xuất hướng phát triển. Cách trình bày giữ nguyên nguyên tắc của toàn báo cáo: chỉ ghi “đạt” khi có bằng chứng trong mã nguồn, dữ liệu hoặc kết quả kiểm thử; các phần chưa chạy được ghi là chưa đạt kèm nguyên nhân."),

    ("h2", "5.1. Kết quả đạt được"),
    ("p", "Đồ án đã xây dựng được một hệ thống hướng dẫn ẩm thực đa ngôn ngữ có đủ ba bề mặt: website khách, ứng dụng di động và trang quản trị. Về nghiệp vụ, hệ thống mô hình hoá được vòng trải nghiệm từ tìm địa điểm, đọc và nghe nội dung, quét QR tại quán, đến mở khoá ngôn ngữ bằng checkout sandbox. Về kỹ thuật, hệ thống có cơ sở dữ liệu 12 bảng, 88 endpoint, phân quyền ADMIN/STAFF, phiên khách 90 ngày và mô hình trả phí hai slot miễn phí."),
    ("p", "Ba kết quả có giá trị thực tiễn nổi bật. Thứ nhất, nội dung đa ngữ được hợp nhất trong một bảng translations và một bảng media_files, cho phép thêm ngôn ngữ mới mà không phải tạo bảng mới. Thứ hai, quy tắc mở khoá ngôn ngữ được thực thi ở server bằng SQL trên guest_sessions, không thể bỏ qua bằng cờ phía client. Thứ ba, luồng GPS có xử lý nhiễu, vùng đệm và vùng chồng lấn, được kiểm chứng bằng 13 bài kiểm thử tự động."),
    tbl(T.caption("Đối chiếu mục tiêu sản phẩm và kết quả"),
        ["Mã", "Mục tiêu", "Kết quả", "Mức đạt"],
        [
            ["G-01", "Tìm địa điểm theo từ khoá, bộ lọc, vị trí", "API places, nearby, guide; giao diện Explore và bản đồ", "Đạt"],
            ["G-02", "Đọc và nghe nội dung bằng ngôn ngữ đã chọn", "5 ngôn ngữ; bản dịch địa điểm/món/tuyến; audio theo bản dịch", "Đạt, phụ thuộc dữ liệu"],
            ["G-03", "Một điểm vào duy nhất bằng QR", "QR địa điểm và món, sinh SVG phía server, unique index", "Đạt"],
            ["G-04", "Thuyết minh tự động khi đến gần", "Phát hiện vùng, vùng đệm, ưu tiên vùng gần nhất; 13/13 kiểm thử", "Đạt phần logic"],
            ["G-05", "Quản trị nội dung không cần sửa mã", "CRUD đầy đủ cho địa điểm, món, bản dịch, tuyến, audio, QR", "Đạt phần giao diện"],
            ["G-06", "Mở khoá ngôn ngữ có kiểm soát", "Hai slot miễn phí, checkout 20.000 đ, xác nhận idempotent", "Đạt ở mức sandbox"],
            ["G-07", "Theo dõi hiệu quả nội dung", "Dashboard, thống kê quét/nghe 14 ngày, online 5 phút", "Đạt một phần (thiếu log play)"],
            ["G-08", "Chạy được trên môi trường đóng gói", "Docker Compose ba container, health check có kiểm tra DB", "Đạt"],
        ], [1.3, 5.2, 7.4, 2.1], font=9.8),
    ("p", "Về mặt học thuật, báo cáo đã chuyển một hệ thống mã nguồn thành mô hình phân tích có thể kiểm chứng: 16 use case với bảng mô tả 11 trường, 32 user story kèm tiêu chí chấp nhận, 21 sơ đồ (use case, ERD, activity, sequence, kiến trúc) và bảng truy vết từ yêu cầu tới endpoint. Các sơ đồ không được vẽ lại từ trí nhớ mà được đối chiếu với migration, route và service thực tế."),

    ("h2", "5.2. Hạn chế"),
    ("p", "Hạn chế lớn nhất là mức độ hoàn thiện không đồng đều giữa các phần. Phần nội dung, cơ sở dữ liệu và API có độ phủ tốt; phần đăng nhập quản trị và màn hình chi tiết món trên mobile còn lỗi chặn luồng. Vì vậy báo cáo mô tả các use case quản trị theo thiết kế và ghi rõ trạng thái chưa kiểm thử, thay vì trình bày như đã vận hành."),
    ("b", [
        "Đăng nhập quản trị chưa chạy trên cơ sở dữ liệu mới do authService dùng users.role_id và bảng roles trong khi migration dùng users.role.",
        "Ứng dụng mobile chưa build được toàn bộ vì PlaceDetailScreen.js còn lỗi cú pháp tại dòng 18; 5/6 tab còn lại phân tích cú pháp thành công.",
        "Thanh toán chỉ là sandbox: không có cổng thật, không có webhook, không kiểm tra chữ ký giao dịch.",
        "Lượt nghe audio chưa được ghi nhận qua route, nên thống kê âm thanh có thể thấp hơn thực tế.",
        "Yêu thích và lịch sử trên mobile lưu cục bộ, chưa đồng bộ với endpoint server; đổi thiết bị sẽ mất dữ liệu.",
        "Một số quy tắc đa hình (translations, media_files) không có khoá ngoại, phụ thuộc vào kiểm tra ở tầng dịch vụ.",
        "Bộ kiểm thử chưa bao phủ tích hợp đầu-cuối với cơ sở dữ liệu thật; kết quả chủ yếu là kiểm thử đơn vị và kiểm tra tĩnh.",
    ]),

    ("h2", "5.3. Hướng phát triển"),
    ("p", "Các đề xuất dưới đây ưu tiên theo mức độ chặn luồng chính, sau đó tới giá trị sản phẩm. Việc sửa lỗi schema và lỗi cú pháp nên làm trước khi mở rộng tính năng, vì chỉ khi đó mới có thể kiểm thử đầu-cuối và đánh giá đúng các phần còn lại."),
    ("num", [
        "Đồng bộ authService với schema hiện tại hoặc bổ sung migration tạo bảng roles/permissions; sau đó kiểm thử đăng nhập, phân quyền ADMIN/STAFF và quản lý người dùng.",
        "Sửa lỗi cú pháp PlaceDetailScreen.js, chạy lại kiểm tra cú pháp 24/24 và kiểm thử luồng quét QR trên thiết bị thật.",
        "Tích hợp cổng thanh toán thật (ví dụ VNPay hoặc MoMo) với webhook có xác thực chữ ký, giữ nguyên quy tắc mở toàn bộ ngôn ngữ sau một giao dịch thành công.",
        "Thêm endpoint ghi nhận lượt nghe và hợp nhất thống kê audio với activity_logs; bổ sung biểu đồ theo ngôn ngữ và địa điểm.",
        "Đồng bộ yêu thích/lịch sử mobile lên server, gắn với guest_session_id để dữ liệu theo thiết bị và có thể phục hồi.",
        "Bổ sung kiểm thử tích hợp bằng một cơ sở dữ liệu tạm, chạy migration và seed tự động, kiểm thử các luồng paywall, QR và GPS từ đầu đến cuối.",
        "Cải thiện khả năng truy cập: phụ đề cho audio, điều hướng bàn phím ở trang quản trị, độ tương phản màu và kích thước chữ trên mobile.",
        "Mở rộng nội dung theo tuyến và theo mùa, thêm gợi ý cá nhân hoá dựa trên lịch sử nghe nhưng vẫn tôn trọng quyền riêng tư của phiên ẩn danh.",
    ]),

    ("h2", "5.4. Kết luận"),
    ("p", "Đồ án đã trả lời được câu hỏi trung tâm: một hệ thống nhỏ vẫn có thể tổ chức nội dung ẩm thực đa ngữ, gắn nội dung với vị trí và QR, đồng thời kiểm soát quyền truy cập ngôn ngữ bằng một mô hình dữ liệu gọn. Các quyết định thiết kế quan trọng — hợp nhất bản dịch, hợp nhất phương tiện, phiên khách ẩn danh, quyền ngôn ngữ kiểm tra ở server — đều có lý do rõ ràng và được phản ánh nhất quán trong mã nguồn, sơ đồ và bảng mô tả."),
    ("p", "Giá trị lớn nhất của báo cáo không nằm ở số lượng chức năng, mà ở việc chỉ ra chính xác phần nào đã chạy, phần nào mới là thiết kế và vì sao. Cách tiếp cận trung thực này giúp nhóm tiếp tục phát triển mà không xây trên giả định sai, đồng thời giúp người đọc đánh giá đúng năng lực của hệ thống hiện tại."),
]
