# Bộ nguồn báo cáo đồ án — Hệ thống thuyết minh tự động đa ngôn ngữ Quận 4

Thư mục này chứa toàn bộ mã nguồn dùng để sinh báo cáo Word và các sơ đồ trong báo cáo.

## Thành phần

| Tệp / thư mục | Vai trò |
| --- | --- |
| `BaoCao_DoAn_ThuyetMinhDaNgonNgu_Quan4.docx` | Báo cáo hoàn chỉnh (đặt ở thư mục gốc dự án) |
| `figlib.py` | Thư viện vẽ hình: khung, hộp, mũi tên, thực thể ERD, chú giải |
| `figs_ch2.py`, `figs_ch2b.py` | Sinh sơ đồ chức năng, Use Case, hoạt động (Chương 2) |
| `figs_ch3.py` | Sinh sơ đồ kiến trúc, ERD, tuần tự, wireframe (Chương 3) |
| `figures/` | Toàn bộ hình PNG đã render, dùng để chèn vào Word |
| `content_part1.py` … `content_part4.py` | Nội dung 5 chương, tài liệu tham khảo, phụ lục dưới dạng khối dữ liệu |
| `build_docx.py` | Dựng tài liệu Word từ các khối nội dung và hình |

## Cài đặt

```bash
python -m pip install python-docx pillow matplotlib
```

## Dựng lại toàn bộ

```bash
cd tmp/report
python figs_ch2.py && python figs_ch2b.py && python figs_ch3.py   # render lại hình
python build_docx.py                                              # ghi tệp .docx
```

`build_docx.py` ghi đè tệp `BaoCao_DoAn_ThuyetMinhDaNgonNgu_Quan4.docx` ở thư mục gốc dự án.

## Cập nhật mục lục và đánh số trang

Tệp được tạo với trường `TOC` và cờ `w:updateFields`, nên khi mở bằng Microsoft Word, Word sẽ tính lại mục lục và số trang. Nếu Word không tự cập nhật:

1. Nhấn `Ctrl+A` để chọn toàn bộ.
2. Nhấn `F9`, chọn **Update entire table** cho mục lục.
3. Lưu lại tệp.

Số trang in ở chân trang dùng trường `PAGE`: phần đầu (bìa, lời cảm ơn, mục lục, danh mục) đánh số La Mã, từ Chương 1 đánh số Ả Rập bắt đầu từ 1.

## Sửa nội dung

- Muốn đổi chữ: sửa trong `content_part*.py` rồi chạy lại `build_docx.py`. Không sửa trực tiếp vào tệp `.docx` nếu còn định dựng lại, vì lần dựng sau sẽ ghi đè.
- Muốn đổi sơ đồ: sửa hàm vẽ trong `figs_ch*.py`, chạy lại script tương ứng, rồi dựng lại tài liệu.
- Bảng và hình được đánh số tự động theo thứ tự khai báo trong `content_part*.py`; chú thích hình nằm ngay dưới hình, chú thích bảng nằm ngay trên bảng.

## Ghi chú về nội dung

Báo cáo phản ánh trạng thái mã nguồn tại thời điểm phân tích. Các chức năng chưa chạy được đầu-cuối (thanh toán mở khoá ngôn ngữ, một số tuyến GPS) được ghi rõ là thiết kế hoặc chưa kiểm thử, không được mô tả như tính năng đã hoàn thành.
