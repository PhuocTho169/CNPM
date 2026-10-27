# -*- coding: utf-8 -*-
"""Use case descriptions UC-01 .. UC-08."""

from content_helpers import uc_block


def _u(T, code, name, primary, secondary, goal, pre, post, trigger, alt, nfr, flow, stories):
    return uc_block(T, code, name, primary, secondary, goal, pre, post, trigger,
                    alt, nfr, flow, stories)


def blocks(T):
    out = []
    out += _u(
        T, "UC-01", "Tra cứu địa điểm", "Khách du lịch", "—",
        "Tìm được địa điểm phù hợp theo từ khoá, danh mục, khoảng giá, trạng thái mở cửa và vị trí hiện tại.",
        "Dữ liệu địa điểm ở trạng thái PUBLISHED đã được seed; API /api/places hoạt động; khách có thể truy cập website công khai.",
        "Danh sách kết quả đúng điều kiện được hiển thị; không thay đổi dữ liệu nghiệp vụ. Nếu khách chọn “Gần tôi”, vị trí chỉ dùng trong request và không lưu vào hồ sơ.",
        "Khách mở trang /explore, nhập từ khoá hoặc chọn một bộ lọc.",
        "A1: không có kết quả → hiển thị empty state và gợi ý xoá bộ lọc. A2: khách từ chối quyền vị trí → quay về danh sách mặc định, không chặn trang. A3: API lỗi hoặc quá thời gian → thông báo thử lại, giữ bộ lọc hiện tại.",
        "Kết quả phân trang; bản đồ chỉ tải marker trong khung nhìn; tìm gần đây giới hạn 20 địa điểm trong bán kính 500 m.",
        [
            ("1", "Khách mở trang khám phá", "GET /api/places?page=1&pageSize=12; trả danh sách PUBLISHED kèm ảnh chính và danh mục."),
            ("2", "Khách nhập từ khoá hoặc chọn danh mục, khoảng giá, trạng thái mở cửa", "API lọc trong SQL, trả tổng số bản ghi và trang hiện tại; URL giữ bộ lọc."),
            ("3", "Khách bấm “Gần tôi”", "Trình duyệt xin quyền GPS; gọi GET /api/places/nearby?lat&lng&radius=500&limit=20."),
            ("4", "Hệ thống tính khoảng cách", "Haversine trên toạ độ; sắp xếp tăng dần; hiển thị mét/km."),
            ("5", "Khách chọn một địa điểm", "Chuyển sang UC-02 với place_id và ngôn ngữ hiện tại."),
            ("6", "Khách xoá bộ lọc hoặc đổi trang", "API nhận query mới; giao diện cập nhật mà không tải lại toàn trang."),
        ],
        [
            ("US-01.1", "Là khách du lịch, tôi muốn lọc quán theo danh mục, khoảng giá và giờ mở để chọn nhanh nơi phù hợp.",
             ["Given đang ở trang khám phá, When chọn “Món nước” và “Đang mở”, Then danh sách chỉ còn địa điểm thoả cả hai điều kiện và hiển thị số kết quả.",
              "Given bộ lọc không khớp địa điểm nào, When API trả mảng rỗng, Then giao diện hiển thị empty state kèm nút xoá bộ lọc, không hiện trang trắng."]),
            ("US-01.2", "Là khách du lịch, tôi muốn thấy quán gần mình để quyết định đi bộ tới.",
             ["Given đã cấp quyền vị trí, When bấm “Gần tôi”, Then danh sách hiển thị tối đa 20 quán trong bán kính 500 m, sắp xếp theo khoảng cách.",
              "Given từ chối quyền vị trí, When bấm “Gần tôi”, Then hệ thống quay về danh sách mặc định và hiển thị hướng dẫn bật quyền, không treo màn hình."]),
        ],
    )
    out += _u(
        T, "UC-02", "Xem hướng dẫn địa điểm", "Khách du lịch", "Dịch vụ TTS (tuỳ chọn)",
        "Đọc và nghe hướng dẫn của một địa điểm bằng ngôn ngữ đã chọn, gồm mô tả, câu chuyện, món signature, ảnh, audio và tuyến liên quan.",
        "Địa điểm tồn tại và ở trạng thái PUBLISHED; khách có phiên khách hợp lệ hoặc đang dùng ngôn ngữ tiếng Việt; bản dịch tương ứng tồn tại hoặc có fallback tiếng Việt.",
        "Trang hướng dẫn hiển thị đầy đủ nội dung và trạng thái quyền ngôn ngữ; ngôn ngữ đã chọn được lưu cục bộ trên thiết bị. Lượt xem/scan có thể được ghi vào activity_logs nếu phát sinh từ QR.",
        "Khách bấm vào thẻ địa điểm, mở URL từ QR hoặc truy cập trực tiếp /places/:id.",
        "A1: ngôn ngữ bị khoá → hiển thị banner giải thích và nút mở UC-03. A2: chưa có bản dịch cho ngôn ngữ đó → dùng tiếng Việt và gắn nhãn “chưa có bản dịch”. A3: bản dịch có nhưng thiếu audio → hiển thị nút nghe ở trạng thái chờ, gọi TTS nếu được cấu hình. A4: place_id không tồn tại/không PUBLISHED → trả 404 và trang thông báo.",
        "Nội dung chính tải trong khoảng 2 giây trên 4G với dữ liệu seed; ảnh lazy-load; audio không autoplay nếu thiếu tương tác người dùng.",
        [
            ("1", "Khách mở trang địa điểm", "GET /api/places/:id/guide?language=<code>; server kiểm tra trạng thái và quyền ngôn ngữ."),
            ("2", "Hệ thống tổng hợp nội dung", "Trả place, bản dịch, món ăn, ảnh, audio, tuyến liên quan; sắp xếp món signature trước."),
            ("3", "Giao diện hiển thị", "Hero ảnh, mô tả, lịch sử/văn hoá, thành phần, tips, bản đồ, danh sách món, audio player."),
            ("4", "Khách đổi ngôn ngữ", "Lưu lựa chọn vào localStorage; nếu ngôn ngữ bị khoá, chuyển UC-03; nếu hợp lệ, tải lại nội dung."),
            ("5", "Khách bấm nghe", "GET /api/culinary-places/:placeId/audio?language=...; nhận audioUrl và duration."),
            ("6", "Hệ thống xử lý thiếu audio", "Nếu URL rỗng hoặc file mất, xếp hàng sinh TTS (tuỳ chọn) và trả trạng thái chờ."),
            ("7", "Khách chọn tuyến hoặc món liên quan", "Điều hướng sang UC-07 hoặc trang món; giữ nguyên ngôn ngữ."),
        ],
        [
            ("US-02.1", "Là khách du lịch, tôi muốn đọc toàn bộ câu chuyện của quán bằng ngôn ngữ của mình để hiểu món ăn trước khi gọi.",
             ["Given ngôn ngữ đã mở khoá và có bản dịch, When mở trang địa điểm, Then mô tả, lịch sử, văn hoá và tips hiển thị đúng ngôn ngữ, không lẫn tiếng Việt.",
              "Given bản dịch chưa có, When mở trang, Then hệ thống hiển thị tiếng Việt kèm nhãn “chưa có bản dịch” thay vì trang lỗi."]),
            ("US-02.2", "Là khách du lịch, tôi muốn nghe thuyết minh ngay trên trang để không phải đọc khi đang đi bộ.",
             ["Given audio đã có, When bấm nút nghe, Then audio phát kèm thanh tiến trình và thời lượng; bấm lần nữa thì dừng.",
              "Given audio chưa có và TTS được cấu hình, When bấm nghe, Then hệ thống báo đang chuẩn bị và không treo giao diện; nếu TTS lỗi, hiển thị thông báo thay vì im lặng."]),
        ],
    )
    out += _u(
        T, "UC-03", "Mở khoá ngôn ngữ", "Khách du lịch", "— (thanh toán sandbox nội bộ)",
        "Chọn hai ngôn ngữ nước ngoài miễn phí cho phiên khách và mở toàn bộ ngôn ngữ còn lại bằng checkout 20.000 đồng (sandbox).",
        "Khách có phiên khách còn hiệu lực (cookie guest_session_id); danh sách ngôn ngữ đang hoạt động đã được tải; tiếng Việt luôn miễn phí.",
        "Phiên khách ghi nhận free_language_id, free_language_id_2 hoặc purchased_languages; quyền đọc bản dịch/audio của các ngôn ngữ tương ứng được mở; không có giao dịch tiền thật.",
        "Khách chọn một ngôn ngữ bị khoá trên thanh ngôn ngữ hoặc bấm nút “Mở khoá” trong banner.",
        "A1: khách chọn tiếng Việt → luôn thành công, không tiêu slot. A2: chọn ngôn ngữ đã có trong slot hoặc đã mua → trả trạng thái đã mở, không tạo checkout. A3: hết hai slot → trả 403 kèm danh sách ngôn ngữ có thể dùng và gợi ý mở khoá. A4: checkout đã tồn tại ở trạng thái pending → tái sử dụng bản ghi. A5: xác nhận lặp lại → idempotent, không tạo giao dịch mới. A6: phiên hết hạn → tạo phiên mới và yêu cầu chọn lại.",
        "Giá 20.000 đồng do server quy định; client không gửi giá. Xác nhận thành công phải mở toàn bộ ngôn ngữ đang hoạt động, không chỉ ngôn ngữ vừa chọn. Cookie httpOnly, token phiên chỉ lưu hash.",
        [
            ("1", "Khách mở thanh ngôn ngữ", "GET /api/guest-sessions/languages; trả 5 ngôn ngữ kèm trạng thái free/purchased/locked."),
            ("2", "Khách chọn ngôn ngữ chưa mở", "Server kiểm tra vi; nếu còn slot trống, gán free_language_id hoặc free_language_id_2."),
            ("3", "Hệ thống trả kết quả", "Thành công: quyền đọc được mở ngay. Hết slot: 403 kèm danh sách ngôn ngữ và giá 20.000 đ."),
            ("4", "Khách bấm “Mở khoá toàn bộ”", "POST /api/guest-sessions/checkouts; server tạo hoặc tái sử dụng checkout pending với giá cố định."),
            ("5", "Khách xác nhận thanh toán sandbox", "POST /checkouts/:id/confirm; server đánh dấu thành công và đặt purchased_languages = toàn bộ ngôn ngữ hoạt động."),
            ("6", "Hệ thống chống trùng", "Gọi confirm lần hai trả cùng kết quả; unique index bảo vệ cặp phiên + ngôn ngữ thành công."),
            ("7", "Giao diện tải lại quyền", "GET /api/guest-sessions/me hoặc /languages; banner mở khoá biến mất, nội dung đa ngữ tải được."),
            ("8", "Khách đọc/nghe nội dung", "Các tuyến bản dịch/audio đi qua requireLanguageUnlock và trả dữ liệu tương ứng."),
        ],
        [
            ("US-03.1", "Là khách du lịch, tôi muốn dùng thử hai ngôn ngữ miễn phí trước khi quyết định trả tiền để mở tất cả.",
             ["Given phiên mới, When chọn tiếng Anh rồi tiếng Nhật, Then cả hai được mở và hiển thị là slot miễn phí; tiếng Việt vẫn miễn phí.",
              "Given đã dùng hai slot, When chọn tiếng Hàn, Then hệ thống không mở ngôn ngữ mà hiển thị lựa chọn mở khoá 20.000 đ."]),
            ("US-03.2", "Là khách du lịch, tôi muốn thanh toán một lần để dùng mọi ngôn ngữ còn lại trong chuyến đi.",
             ["Given có checkout pending, When bấm xác nhận, Then toàn bộ ngôn ngữ đang hoạt động được mở và giá hiển thị đúng 20.000 đ do server trả về.",
              "Given đã xác nhận thành công, When bấm xác nhận lại hoặc tải lại trang, Then hệ thống không tạo giao dịch mới và quyền vẫn được giữ."]),
        ],
    )
    out += _u(
        T, "UC-04", "Quét mã QR", "Khách du lịch", "Thiết bị của khách (camera)",
        "Mở đúng trang hướng dẫn của địa điểm hoặc món ăn từ mã QR đặt tại quán, đồng thời ghi nhận lượt quét.",
        "Khách có thiết bị có camera; ứng dụng được cấp quyền camera; mã QR do hệ thống sinh và trỏ tới URL website hợp lệ.",
        "Trình duyệt mở trang hướng dẫn tương ứng; lượt quét được ghi vào activity_logs nếu là QR địa điểm và trang web xử lý; phiên khách được tạo nếu chưa có.",
        "Khách bấm biểu tượng quét trên ứng dụng và đưa camera về phía mã QR.",
        "A1: camera bị từ chối quyền → hướng dẫn bật quyền, không mở camera. A2: QR không phải URL hợp lệ hoặc sai domain → hiển thị lỗi và không điều hướng. A3: URL đúng nhưng place/dish không tồn tại hoặc chưa PUBLISHED → trang 404. A4: quét liên tiếp trong 4 giây → bỏ qua để tránh mở trùng. A5: ngôn ngữ bị khoá → trang hướng dẫn hiển thị banner UC-03.",
        "Cooldown 4 giây; camera chỉ dùng khi màn hình scan đang mở; không lưu ảnh QR; URL được chuẩn hoá trước khi mở.",
        [
            ("1", "Khách mở tab Scan", "Ứng dụng xin quyền camera; nếu được cấp, hiển thị camera preview."),
            ("2", "Thiết bị nhận diện mã", "Đọc payload; kiểm tra là URL http(s) thuộc miền website hoặc deep link hợp lệ."),
            ("3", "Ứng dụng chuẩn hoá URL", "Chuyển localhost sang địa chỉ LAN nếu cần; bỏ qua nếu đang trong cooldown."),
            ("4", "Ứng dụng mở URL", "Mở trình duyệt/WebView tới /places/:id hoặc /dishes/:id."),
            ("5", "Website tạo phiên và tải nội dung", "POST /api/guest-sessions nếu chưa có cookie; GET guide/dish tương ứng."),
            ("6", "Website ghi lượt quét", "POST /api/places/:id/scan; activity_logs event_type=scan; sau đó hiển thị UC-02."),
        ],
        [
            ("US-04.1", "Là khách du lịch, tôi muốn quét mã tại bàn để mở ngay hướng dẫn món ăn mà không phải gõ địa chỉ.",
             ["Given camera được cấp quyền, When quét QR hợp lệ, Then trình duyệt mở đúng trang địa điểm/món trong vòng vài giây.",
              "Given quét một mã không thuộc hệ thống, When payload không phải URL hợp lệ, Then ứng dụng báo “Mã QR không hợp lệ” và không mở trang lạ."]),
            ("US-04.2", "Là chủ quán, tôi muốn biết khách có quét mã của quán mình hay không.",
             ["Given khách quét QR địa điểm và trang web tải thành công, When trang gọi API scan, Then activity_logs có bản ghi event_type=scan gắn place_id.",
              "Given cùng một khách quét lại trong 4 giây, When ứng dụng đang cooldown, Then không phát sinh thêm lượt mở trang."]),
        ],
    )
    out += _u(
        T, "UC-05", "Nghe thuyết minh theo GPS", "Khách du lịch", "Thiết bị của khách (GPS), dịch vụ TTS (tuỳ chọn)",
        "Tự động phát audio thuyết minh khi khách đi vào vùng của một địa điểm, với hàng đợi ưu tiên vùng mới nhất.",
        "Ứng dụng được cấp quyền vị trí; có danh sách vùng địa điểm PUBLISHED gần đó; ngôn ngữ đã chọn đã được mở khoá và có bản dịch/audio tương ứng.",
        "Audio của vùng được phát; trạng thái vùng (đã vào/chưa vào) được cập nhật cục bộ; sự kiện nghe có thể được ghi nhận nếu tuyến ghi nhận hoạt động (xem GAP-03).",
        "Khách mở màn hình GPS Guide và bắt đầu đi bộ; hoặc ứng dụng tiếp tục theo dõi vị trí khi màn hình còn hoạt động.",
        "A1: từ chối quyền vị trí → hiển thị hướng dẫn và cho phép dùng bản đồ thủ công. A2: fix đầu tiên có độ chính xác > 100 m → chờ fix tốt hơn. A3: accuracy > 150 m → bỏ qua fix. A4: ngôn ngữ bị khoá → 403, mở UC-03. A5: chưa có audio → chờ TTS hoặc hiển thị “chưa có thuyết minh”. A6: ra khỏi vùng → dừng audio sau khi vượt zone_radius + zone_exit_buffer.",
        "Theo dõi vị trí với khoảng cách 10 m/3 giây; làm mới nearby sau 60 m hoặc 120 giây; vùng mặc định 100 m, có thể cấu hình 25–1000 m; buffer thoát 20 m.",
        [
            ("1", "Khách mở GPS Guide", "Ứng dụng xin quyền vị trí; đăng ký watchPosition với filter 10 m/3 giây."),
            ("2", "Thiết bị trả fix đầu tiên", "Nếu accuracy ≤ 100 m, dùng ngay; nếu kém hơn, chờ fix tốt hơn và hiển thị trạng thái đang định vị."),
            ("3", "Ứng dụng tải vùng gần đây", "GET /api/culinary-places/nearby?lat&lng; nhận danh sách vùng và bán kính."),
            ("4", "Ứng dụng kiểm tra vùng", "Tính khoảng cách; vào vùng khi ≤ zone_radius; bỏ qua fix accuracy > 150 m."),
            ("5", "Vào vùng mới", "Gọi GET audio cho ngôn ngữ hiện tại; nếu 403, mở UC-03; nếu thiếu file, chờ TTS."),
            ("6", "Phát audio và cập nhật hàng đợi", "Vùng mới nhất thắng; audio cũ dừng; hiển thị tên vùng và trạng thái phát."),
            ("7", "Khách tiếp tục di chuyển", "Làm mới nearby sau 60 m/120 giây; kiểm tra điều kiện ra vùng với buffer."),
            ("8", "Khách dừng hoặc thoát", "Dừng watch, dừng audio, lưu trạng thái phiên cục bộ."),
        ],
        [
            ("US-05.1", "Là khách đi bộ, tôi muốn nghe thuyết minh tự động khi đến gần quán để không phải bấm điện thoại liên tục.",
             ["Given đã cấp quyền vị trí và đang ở ngoài vùng, When đi vào bán kính zone_radius, Then audio của địa điểm tự phát sau khi tải xong.",
              "Given đang phát audio vùng A, When bước vào vùng B mới hơn, Then audio B được ưu tiên và audio A dừng, không phát chồng."]),
            ("US-05.2", "Là khách du lịch, tôi muốn hệ thống không phát lại liên tục cùng một quán khi tôi đứng yên.",
             ["Given đã vào vùng A, When vẫn ở trong vùng và không rời đi, Then hệ thống không phát lại audio A.",
              "Given đã ra khỏi vùng A vượt buffer, When quay lại vùng A, Then audio có thể phát lại và trạng thái được cập nhật."]),
        ],
    )
    out += _u(
        T, "UC-06", "Yêu thích & lịch sử", "Khách du lịch", "—",
        "Lưu các địa điểm quan tâm và xem lại những nơi đã mở, phục vụ việc lên kế hoạch ăn uống.",
        "Khách đang dùng website hoặc ứng dụng; bộ nhớ cục bộ (localStorage/AsyncStorage) khả dụng.",
        "Danh sách yêu thích/lịch sử được cập nhật trên thiết bị; dữ liệu không tự đồng bộ sang thiết bị khác. Server có endpoint favorites/history nhưng client hiện chưa dùng.",
        "Khách bấm biểu tượng trái tim hoặc mở mục “Đã xem”.",
        "A1: bộ nhớ cục bộ bị xoá → danh sách trống, không ảnh hưởng tài khoản. A2: địa điểm đã bị xoá/ẩn → lọc khỏi danh sách khi tải lại. A3: gọi server favorites/history lỗi → vẫn dùng dữ liệu cục bộ, không chặn trang.",
        "Thao tác yêu thích phản hồi tức thì; lịch sử chỉ lưu tối đa 50 mục gần nhất; dữ liệu cục bộ không chứa token hay thông tin nhạy cảm.",
        [
            ("1", "Khách bấm trái tim trên thẻ/trang địa điểm", "Ứng dụng thêm place_id vào mảng yêu thích trong bộ nhớ cục bộ; biểu tượng đổi trạng thái."),
            ("2", "Khách mở trang Yêu thích", "Đọc mảng place_id, đối chiếu dữ liệu địa điểm đã tải; hiển thị thẻ và nút bỏ lưu."),
            ("3", "Khách mở một địa điểm", "Ghi place_id vào lịch sử cục bộ kèm thời điểm; giới hạn 50 mục."),
            ("4", "Khách xoá một mục", "Cập nhật mảng và giao diện ngay; không gọi server."),
            ("5", "Khách đổi thiết bị", "Dữ liệu không đồng bộ; hệ thống hiển thị danh sách trống trên thiết bị mới."),
        ],
        [
            ("US-06.1", "Là khách du lịch, tôi muốn lưu quán để tối quay lại mà không cần tạo tài khoản.",
             ["Given đang xem một địa điểm, When bấm trái tim, Then quán xuất hiện trong mục Yêu thích và trạng thái được giữ sau khi tải lại trang.",
              "Given đã lưu quán, When bấm trái tim lần nữa, Then quán bị bỏ khỏi danh sách và biểu tượng trở về trạng thái chưa lưu."]),
            ("US-06.2", "Là khách du lịch, tôi muốn xem lại những quán đã mở để nhớ tên.",
             ["Given đã mở vài địa điểm, When vào mục Lịch sử, Then danh sách hiển thị theo thứ tự mới nhất, tối đa 50 mục.",
              "Given một địa điểm trong lịch sử đã bị ẩn, When tải lại danh sách, Then mục đó không còn hiển thị và không gây lỗi."]),
        ],
    )
    out += _u(
        T, "UC-07", "Xem tuyến ẩm thực", "Khách du lịch", "—",
        "Khám phá các tuyến ăn uống theo chủ đề, xem bản đồ và thứ tự điểm dừng để tự đi bộ.",
        "Tuyến ở trạng thái PUBLISHED; các điểm dừng tham chiếu địa điểm còn tồn tại; khách đang ở website hoặc ứng dụng.",
        "Trang tuyến hiển thị danh sách điểm dừng theo position, bản đồ và liên kết tới từng địa điểm; không thay đổi dữ liệu.",
        "Khách mở mục Tuyến ẩm thực hoặc bấm một tuyến liên quan từ trang địa điểm.",
        "A1: tuyến không có điểm dừng → hiển thị thông báo và ẩn bản đồ. A2: điểm dừng trỏ tới địa điểm đã ẩn → bỏ qua điểm đó, ghi chú số điểm còn lại. A3: tuyến không tồn tại → 404.",
        "Bản đồ chỉ tải marker của tuyến đang xem; thứ tự điểm dừng là duy nhất theo (route_id, position); hỗ trợ ảnh đại diện và mô tả ngắn.",
        [
            ("1", "Khách mở danh sách tuyến", "GET /api/routes; trả tuyến PUBLISHED kèm ảnh, số điểm dừng, mô tả ngắn."),
            ("2", "Khách chọn một tuyến", "GET /api/routes/:id; trả chi tiết và danh sách điểm dừng theo position."),
            ("3", "Giao diện vẽ tuyến", "Đánh số điểm dừng trên bản đồ; hiển thị tên, ảnh, khoảng cách ước tính."),
            ("4", "Khách chọn một điểm dừng", "Mở UC-02 với place_id tương ứng; giữ ngôn ngữ hiện tại."),
            ("5", "Khách quay lại tuyến", "Vị trí cuộn và bộ lọc được giữ trong phiên trình duyệt."),
        ],
        [
            ("US-07.1", "Là khách du lịch, tôi muốn xem một tuyến ăn uống có thứ tự rõ ràng để không phải tự sắp xếp.",
             ["Given tuyến có 5 điểm dừng, When mở chi tiết, Then các điểm hiển thị đúng thứ tự position từ 1 đến 5 và có bản đồ tương ứng.",
              "Given tuyến không có điểm dừng, When mở chi tiết, Then hệ thống hiển thị thông báo “Tuyến đang cập nhật” thay vì bản đồ trống."]),
            ("US-07.2", "Là khách du lịch, tôi muốn mở nhanh địa điểm trong tuyến để đọc chi tiết.",
             ["Given đang xem tuyến, When bấm một điểm dừng, Then trang hướng dẫn địa điểm mở đúng place_id và giữ ngôn ngữ đã chọn.",
              "Given điểm dừng trỏ tới địa điểm đã ẩn, When mở tuyến, Then điểm đó không hiển thị và không tạo liên kết hỏng."]),
        ],
    )
    out += _u(
        T, "UC-08", "Đăng nhập quản trị", "ADMIN / STAFF", "—",
        "Xác thực người quản trị bằng email và mật khẩu, cấp JWT 12 giờ kèm vai trò để truy cập trang quản trị.",
        "Tài khoản tồn tại trong bảng users, đang hoạt động, có mật khẩu băm bcrypt; người dùng truy cập trang /admin/login.",
        "JWT được lưu ở localStorage phía quản trị; các request sau gửi Bearer token; menu và tuyến API được giới hạn theo vai trò ADMIN/STAFF.",
        "Người dùng mở trang đăng nhập quản trị và gửi biểu mẫu email/mật khẩu.",
        "A1: sai email hoặc mật khẩu → trả 401, không tiết lộ tài khoản có tồn tại hay không. A2: tài khoản bị vô hiệu hoá → 403. A3: token hết hạn sau 12 giờ → 401, chuyển về trang đăng nhập. A4: thiếu quyền cho một tuyến → 403. A5 (hiện tại): authService còn truy vấn bảng roles/users.role_id không có trong migration → đăng nhập có thể lỗi trên DB mới (GAP-01).",
        "Mật khẩu băm bcrypt; JWT ký bằng secret môi trường, hết hạn 12 giờ; không lưu mật khẩu thô; lỗi đăng nhập không lộ chi tiết hệ thống.",
        [
            ("1", "Người dùng mở /admin/login", "Hiển thị biểu mẫu email/mật khẩu; nếu đã có token hợp lệ, chuyển vào dashboard."),
            ("2", "Người dùng gửi thông tin", "POST /api/auth/login; server kiểm tra trường bắt buộc và chuẩn hoá email."),
            ("3", "Server xác thực", "Tìm user theo email, so sánh bcrypt, kiểm tra is_active, lấy vai trò."),
            ("4", "Server cấp token", "Ký JWT chứa sub, email, role, name; hết hạn 12 giờ; trả thông tin người dùng."),
            ("5", "Client lưu và điều hướng", "Lưu token; gắn Authorization cho các request sau; mở dashboard theo vai trò."),
        ],
        [
            ("US-08.1", "Là nhân viên nội dung, tôi muốn đăng nhập để cập nhật thông tin quán mà không cần quyền quản trị hệ thống.",
             ["Given tài khoản STAFF hợp lệ, When đăng nhập đúng, Then nhận JWT và vào được màn hình nội dung; menu người dùng bị ẩn.",
              "Given tài khoản STAFF, When gọi tuyến quản lý người dùng, Then API trả 403 và client hiển thị thông báo không có quyền."]),
            ("US-08.2", "Là quản trị viên, tôi muốn phiên đăng nhập tự hết hạn để giảm rủi ro trên máy dùng chung.",
             ["Given token đã quá 12 giờ, When gửi request quản trị, Then API trả 401 và client chuyển về trang đăng nhập.",
              "Given token hợp lệ, When tải lại trang quản trị, Then phiên được khôi phục mà không phải đăng nhập lại."]),
        ],
    )
    return out
