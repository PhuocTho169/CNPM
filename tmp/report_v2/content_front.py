# -*- coding: utf-8 -*-
"""Cover metadata and front matter."""

TITLE = "HỆ THỐNG HƯỚNG DẪN ẨM THỰC ĐA NGÔN NGỮ QUẬN 4"
TITLE_EN = "Multilingual Culinary Guide System for District 4"
SUBTITLE = "Website tra cứu · Ứng dụng di động quét QR/GPS · Trang quản trị nội dung"

SCHOOL = "BỘ GIÁO DỤC VÀ ĐÀO TẠO"
UNIVERSITY = "TRƯỜNG ĐẠI HỌC SÀI GÒN"
COURSE = "ĐỒ ÁN CÔNG NGHỆ PHẦN MỀM"
INSTRUCTOR = "Đỗ Như Tài"
STUDENTS = [
    ("Lê Tân Phước Thọ", "3124411294"),
    ("Tô Quốc Bảo", "3124411037"),
]
PLACE_YEAR = "TP. Hồ Chí Minh, ngày 26 tháng 10 năm 2026"

FRONT = [
    ("h1c", "LỜI CẢM ƠN"),
    ("p", "Báo cáo này được hoàn thành trong khuôn khổ Đồ án Công nghệ phần mềm, dựa trên mã nguồn thực tế của dự án District 4 Culinary Guide do nhóm xây dựng. Toàn bộ nội dung phân tích, thiết kế và kiểm thử đều được đối chiếu với mã nguồn, cơ sở dữ liệu và môi trường chạy của dự án thay vì chỉ mô tả theo ý tưởng ban đầu."),
    ("p", "Nhóm xin chân thành cảm ơn giảng viên hướng dẫn Đỗ Như Tài đã định hướng đề tài, góp ý về phạm vi chức năng, cách tổ chức use case và yêu cầu chất lượng của một báo cáo phần mềm. Những góp ý đó giúp nhóm phân biệt rõ phần đã chạy được, phần mới ở mức thiết kế và phần còn lệch giữa mã nguồn với tài liệu."),
    ("p", "Nhóm cũng cảm ơn bạn bè và người thân đã hỗ trợ khảo sát ẩm thực Quận 4, thử nghiệm ứng dụng trên thiết bị thật và góp ý về trải nghiệm đa ngôn ngữ. Do thời gian và kinh nghiệm còn hạn chế, báo cáo khó tránh khỏi thiếu sót; nhóm rất mong nhận được góp ý để hoàn thiện sản phẩm."),
    ("pb",),
    ("h1c", "LỜI CAM ĐOAN"),
    ("p", "Nhóm cam đoan báo cáo và mã nguồn đi kèm là kết quả thực hiện của nhóm. Các số liệu về số bảng dữ liệu, số tuyến API, số use case và các hành vi nghiệp vụ được trích xuất trực tiếp từ mã nguồn tại thời điểm lập báo cáo. Những nội dung tham khảo từ tài liệu bên ngoài đều được ghi nguồn; những phần chưa hoàn thiện được đánh dấu rõ trong báo cáo, không được trình bày như đã hoàn thành."),
    ("p", "Nhóm chịu trách nhiệm về tính trung thực của các kết quả kiểm thử và các nhận định kỹ thuật trong báo cáo."),
    ("pb",),
    ("h1c", "NHẬN XÉT CỦA GIẢNG VIÊN"),
    ("p", "Phần nhận xét, điểm số và chữ ký của giảng viên được để trống để điền theo mẫu của khoa."),
    ("tbl", {
        "caption": "Bảng 0.1 - Phiếu nhận xét và đánh giá của giảng viên (mẫu)",
        "cols": ["Nội dung", "Ghi nhận"],
        "widths": [5.5, 10.5],
        "rows": [
            ["Điểm quá trình", ""],
            ["Điểm báo cáo", ""],
            ["Nhận xét về nội dung và hình thức", ""],
            ["Nhận xét về sản phẩm chạy thử", ""],
            ["Ngày đánh giá", ""],
            ["Chữ ký giảng viên", ""],
        ],
        "font": 11,
    }),
]
