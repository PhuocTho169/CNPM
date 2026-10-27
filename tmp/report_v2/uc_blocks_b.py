# -*- coding: utf-8 -*-
"""Use case descriptions UC-09 .. UC-16."""

from content_helpers import uc_block


def _u(T, code, name, primary, secondary, goal, pre, post, trigger, alt, nfr, flow, stories):
    return uc_block(T, code, name, primary, secondary, goal, pre, post, trigger,
                    alt, nfr, flow, stories)


def blocks(T):
    out = []
    out += _u(
        T, "UC-09", "Quản lý địa điểm", "ADMIN / STAFF", "UC-11 (bản dịch), UC-14 (audio & QR)",
        "Tạo, cập nhật, xuất bản hoặc xoá địa điểm; cấu hình toạ độ, vùng GPS, ảnh, bản dịch và trạng thái.",
        "Người dùng đã đăng nhập với vai trò ADMIN hoặc STAFF; danh mục áp dụng cho địa điểm đã tồn tại.",
        "Bản ghi culinary_places được tạo/cập nhật; trạng thái DRAFT hoặc PUBLISHED; ảnh, bản dịch và QR có thể được gắn sau; danh sách công khai chỉ thấy PUBLISHED.",
        "Người dùng mở mục Địa điểm và bấm “Thêm địa điểm” hoặc chọn một bản ghi để sửa.",
        "A1: mã/code trùng → 409, yêu cầu mã khác. A2: toạ độ ngoài khoảng hợp lệ hoặc zone_radius ngoài 25–1000 → 400. A3: STAFF bấm xoá → 403. A4: xuất bản khi thiếu bản dịch tiếng Việt → cảnh báo nhưng vẫn cho lưu DRAFT; PUBLISHED cần nội dung tối thiểu. A5: upload ảnh sai định dạng/quá dung lượng → 400, giữ dữ liệu cũ. A6: xoá địa điểm đang được tuyến tham chiếu → kiểm tra ràng buộc và trả lỗi nghiệp vụ.",
        "Kiểm tra biên toạ độ, giá, bán kính; ảnh lưu trong uploads và có bản ghi media_files; thao tác xoá chỉ ADMIN; mọi thay đổi trạng thái có hiệu lực ở lần tải công khai kế tiếp.",
        [
            ("1", "Người dùng mở danh sách địa điểm", "GET /api/places?status=... (quản trị); trả cả DRAFT và PUBLISHED kèm danh mục, ảnh chính."),
            ("2", "Người dùng bấm thêm/sửa", "Hiển thị biểu mẫu: code, tên, danh mục, địa chỉ, toạ độ, giá, giờ mở, zone_radius, buffer."),
            ("3", "Người dùng gửi biểu mẫu", "POST /api/places hoặc PUT /api/places/:id; server validate và lưu."),
            ("4", "Người dùng thêm ảnh", "POST /api/places/:id/images; multer lưu file, media_files ghi kind=image, is_primary."),
            ("5", "Người dùng mở trình bản dịch", "Chuyển UC-11 với entity_type=place; có thể tạo audio/QR qua UC-14."),
            ("6", "Người dùng kiểm tra và xuất bản", "PATCH /api/places/:id/status; chuyển DRAFT → PUBLISHED khi đủ điều kiện."),
            ("7", "Hệ thống cập nhật danh sách công khai", "GET /api/places chỉ trả PUBLISHED; trang địa điểm và bản đồ dùng dữ liệu mới."),
        ],
        [
            ("US-09.1", "Là nhân viên nội dung, tôi muốn tạo một địa điểm mới với toạ độ và vùng GPS để đưa quán lên bản đồ.",
             ["Given đã đăng nhập STAFF, When nhập đủ trường bắt buộc và lưu, Then bản ghi DRAFT được tạo và xuất hiện trong danh sách quản trị.",
              "Given nhập zone_radius = 10, When gửi biểu mẫu, Then server trả 400 và chỉ rõ giá trị phải trong khoảng 25–1000."]),
            ("US-09.2", "Là quản trị viên, tôi muốn kiểm soát việc xoá địa điểm để không làm hỏng tuyến hoặc dữ liệu liên quan.",
             ["Given đang đăng nhập STAFF, When bấm xoá địa điểm, Then nút bị ẩn hoặc API trả 403.",
              "Given đang đăng nhập ADMIN, When xoá một địa điểm không bị ràng buộc, Then bản ghi bị xoá và biến khỏi danh sách công khai."]),
        ],
    )
    out += _u(
        T, "UC-10", "Quản lý món ăn", "ADMIN / STAFF", "UC-11 (bản dịch), UC-14 (audio & QR)",
        "Tạo, cập nhật, ẩn/xoá món ăn gắn với một địa điểm; đánh dấu món signature và quản lý ảnh, bản dịch.",
        "Địa điểm cha tồn tại; người dùng đã đăng nhập với vai trò ADMIN hoặc STAFF; danh mục áp dụng cho món đã tồn tại.",
        "Bản ghi dishes được tạo/cập nhật với place_id, giá, trạng thái; món signature được đánh dấu; ảnh và bản dịch có thể được gắn.",
        "Người dùng mở chi tiết một địa điểm và bấm “Thêm món” hoặc chọn món để sửa.",
        "A1: địa điểm cha không tồn tại → 404. A2: giá âm hoặc không phải số → 400. A3: xoá món đang có bản dịch/audio → xoá cascade theo thiết kế hoặc chặn nếu ràng buộc; cần xác nhận. A4: upload ảnh sai định dạng → 400. A5: địa điểm cha bị ẩn → món không xuất hiện công khai dù trạng thái PUBLISHED.",
        "Giá hiển thị theo đơn vị đồng; món signature được ưu tiên trong trang hướng dẫn; tối đa một ảnh chính; tên món lấy từ bản dịch theo ngôn ngữ đang chọn.",
        [
            ("1", "Người dùng mở địa điểm", "GET /api/places/:id (quản trị) kèm danh sách món hiện có."),
            ("2", "Người dùng bấm thêm/sửa món", "Biểu mẫu: tên, danh mục, giá, mô tả ngắn, is_signature, status."),
            ("3", "Người dùng gửi biểu mẫu", "POST /api/dishes hoặc PUT /api/dishes/:id; server kiểm tra place_id và giá."),
            ("4", "Người dùng thêm ảnh", "POST /api/dishes/:id/image; media_files kind=image gắn entity_type=... (theo thiết kế hiện hành)."),
            ("5", "Người dùng soạn bản dịch/audio", "Chuyển UC-11/UC-14; bản dịch món dùng entity_type=dish."),
            ("6", "Người dùng xuất bản món", "Cập nhật status; món PUBLISHED hiển thị trong trang hướng dẫn và tìm kiếm."),
        ],
        [
            ("US-10.1", "Là nhân viên nội dung, tôi muốn thêm món signature cho quán để khách thấy gợi ý nổi bật.",
             ["Given đang ở địa điểm, When thêm món và bật is_signature, Then món xuất hiện đầu danh sách món trên trang hướng dẫn.",
              "Given món đang DRAFT, When khách mở trang công khai, Then món không hiển thị."]),
            ("US-10.2", "Là nhân viên nội dung, tôi muốn sửa giá món mà không ảnh hưởng các món khác.",
             ["Given mở một món, When đổi giá và lưu, Then chỉ bản ghi món đó thay đổi; danh sách món tải lại đúng giá mới.",
              "Given nhập giá âm, When lưu, Then server trả 400 và giá cũ được giữ nguyên."]),
        ],
    )
    out += _u(
        T, "UC-11", "Quản lý bản dịch", "ADMIN / STAFF", "Dịch vụ TTS (tuỳ chọn)",
        "Soạn, cập nhật và xoá bản dịch của địa điểm, món ăn hoặc tuyến cho từng ngôn ngữ; gắn audio nếu có.",
        "Thực thể gốc tồn tại; ngôn ngữ đích đang hoạt động; người dùng đã đăng nhập ADMIN/STAFF.",
        "Bản dịch được lưu với unique (entity_type, entity_id, language_id); nội dung hiển thị theo ngôn ngữ; audio có thể được tạo ở UC-14.",
        "Người dùng mở tab Bản dịch của một địa điểm/món/tuyến và chọn ngôn ngữ.",
        "A1: bản dịch đã tồn tại → chuyển sang chế độ cập nhật, không tạo bản ghi trùng. A2: thiếu trường bắt buộc (name) → 400. A3: ngôn ngữ không hoạt động → 400/404. A4: xoá bản dịch đang có audio → xoá hoặc chặn theo ràng buộc; cần xác nhận. A5: nội dung quá dài → cắt hoặc từ chối theo giới hạn cột; không làm hỏng trang công khai.",
        "Unique theo thực thể + ngôn ngữ; bản dịch tiếng Việt là fallback; các trường văn hoá/lịch sử/tips có thể để trống nhưng tên không được trống; nội dung UTF-8 cho tiếng Trung/Hàn/Nhật.",
        [
            ("1", "Người dùng mở tab Bản dịch", "GET /api/places/:id/translations (quản trị); trả các bản dịch hiện có theo ngôn ngữ."),
            ("2", "Người dùng chọn ngôn ngữ", "Hiển thị biểu mẫu với các trường: name, description, history, culture, tips, ingredients, cultural_information."),
            ("3", "Người dùng nhập và lưu", "POST /api/places/:id/translations hoặc PUT /translations/:id; server kiểm tra unique và trường bắt buộc."),
            ("4", "Hệ thống kiểm tra ngôn ngữ", "Chỉ chấp nhận ngôn ngữ đang hoạt động; trả lỗi nếu ngôn ngữ bị tắt."),
            ("5", "Người dùng thêm audio", "Chuyển UC-14; audio gắn entity_type=translation, entity_id=translation_id."),
            ("6", "Người dùng xem trước", "Trang công khai với ?language=<code> hiển thị bản dịch vừa lưu nếu có quyền."),
            ("7", "Người dùng xoá bản dịch", "DELETE /api/translations/:id; kiểm tra ràng buộc media trước khi xoá."),
        ],
        [
            ("US-11.1", "Là nhân viên nội dung, tôi muốn soạn bản dịch tiếng Anh cho một địa điểm và thấy ngay trên trang khách.",
             ["Given đã có bản dịch tiếng Việt, When thêm bản dịch en và lưu, Then khách chọn en thấy nội dung mới; bản dịch vi không đổi.",
              "Given đã có bản dịch en, When lưu lần hai, Then hệ thống cập nhật bản ghi cũ thay vì tạo bản ghi trùng."]),
            ("US-11.2", "Là nhân viên nội dung, tôi muốn tránh tạo hai bản dịch cùng ngôn ngữ cho một món.",
             ["Given món đã có bản dịch ko, When mở form ko, Then form hiển thị dữ liệu cũ ở chế độ cập nhật.",
              "Given cố gửi tạo mới trùng, When server kiểm tra unique, Then trả lỗi và không tạo bản ghi thứ hai."]),
        ],
    )
    out += _u(
        T, "UC-12", "Quản lý tuyến ẩm thực", "ADMIN / STAFF", "UC-11 (bản dịch tuyến)",
        "Tạo, cập nhật, sắp xếp điểm dừng và xuất bản tuyến ăn uống theo chủ đề.",
        "Người dùng đã đăng nhập ADMIN/STAFF; các địa điểm được chọn làm điểm dừng tồn tại.",
        "Tuyến và các điểm dừng được lưu; thứ tự position duy nhất trong mỗi tuyến; tuyến PUBLISHED hiển thị công khai.",
        "Người dùng mở mục Tuyến và bấm “Thêm tuyến” hoặc chọn tuyến để sửa.",
        "A1: trùng position trong cùng tuyến → 409. A2: điểm dừng trỏ tới địa điểm không tồn tại → 404. A3: STAFF xoá tuyến → 403. A4: tuyến không có điểm dừng → vẫn lưu DRAFT nhưng cảnh báo khi xuất bản. A5: xoá điểm dừng cuối → tuyến còn rỗng, hiển thị thông báo ở trang công khai.",
        "Position là duy nhất theo tuyến; sắp xếp lại phải cập nhật tuần tự để không vi phạm unique; tuyến PUBLISHED mới xuất hiện ở API công khai.",
        [
            ("1", "Người dùng mở danh sách tuyến", "GET /api/routes (quản trị); trả tuyến kèm số điểm dừng."),
            ("2", "Người dùng tạo/sửa tuyến", "POST/PUT /api/routes; lưu tên, mô tả, ảnh, trạng thái."),
            ("3", "Người dùng thêm điểm dừng", "POST /api/routes/:id/stops; chọn place_id và position."),
            ("4", "Người dùng sắp xếp lại", "PUT /api/routes/stops/:stopId; cập nhật position, kiểm tra unique."),
            ("5", "Người dùng thêm bản dịch tuyến", "Chuyển UC-11 với entity_type=route."),
            ("6", "Người dùng xuất bản", "Đổi trạng thái PUBLISHED; trang tuyến công khai hiển thị điểm dừng theo thứ tự."),
        ],
        [
            ("US-12.1", "Là nhân viên nội dung, tôi muốn tạo tuyến “Ăn sáng Quận 4” với 5 điểm dừng theo thứ tự.",
             ["Given đã tạo tuyến, When thêm 5 điểm dừng với position 1..5, Then trang tuyến hiển thị đúng thứ tự và bản đồ có 5 marker.",
              "Given thêm điểm dừng trùng position, When lưu, Then server trả 409 và không ghi đè điểm cũ."]),
            ("US-12.2", "Là quản trị viên, tôi muốn chỉ ADMIN được xoá tuyến để tránh mất dữ liệu.",
             ["Given đang là STAFF, When mở menu tuyến, Then nút xoá không hiển thị hoặc API trả 403.",
              "Given đang là ADMIN, When xoá tuyến, Then tuyến và điểm dừng bị xoá theo thiết kế và biến khỏi trang công khai."]),
        ],
    )
    out += _u(
        T, "UC-13", "Danh mục & ngôn ngữ", "ADMIN", "STAFF (chỉ danh mục)",
        "Quản lý danh mục áp dụng cho địa điểm/món và danh sách ngôn ngữ đang hoạt động của hệ thống.",
        "Người dùng đã đăng nhập; với thao tác ngôn ngữ phải là ADMIN; danh mục/ngôn ngữ đang được tham chiếu bởi dữ liệu.",
        "Danh mục hoặc ngôn ngữ được tạo/cập nhật/bật tắt; thay đổi ảnh hưởng tới bộ lọc và nội dung đa ngữ ở lần tải sau.",
        "Người dùng mở mục Danh mục hoặc Ngôn ngữ trong trang quản trị.",
        "A1: xoá danh mục đang được địa điểm/món tham chiếu → bị chặn bởi khoá ngoại, trả lỗi nghiệp vụ. A2: STAFF thao tác ngôn ngữ → 403. A3: tắt ngôn ngữ đang có bản dịch → vẫn giữ dữ liệu nhưng ẩn khỏi danh sách hoạt động. A4: trùng code danh mục/ngôn ngữ → 409. A5: xoá ngôn ngữ có bản dịch → chặn hoặc yêu cầu tắt thay vì xoá.",
        "Danh mục có applies_to = place/dish/both; ngôn ngữ có code duy nhất, native_name, bcp47; không xoá cứng dữ liệu đang tham chiếu; thay đổi ngôn ngữ ảnh hưởng toàn hệ thống.",
        [
            ("1", "Người dùng mở danh mục", "GET /api/categories; trả danh mục kèm applies_to và trạng thái."),
            ("2", "Người dùng tạo/sửa danh mục", "POST/PUT /api/categories; ADMIN hoặc STAFF; kiểm tra code duy nhất."),
            ("3", "ADMIN mở ngôn ngữ", "GET /api/languages; trả 5 ngôn ngữ và trạng thái hoạt động."),
            ("4", "ADMIN cập nhật ngôn ngữ", "POST/PUT /api/languages; bật/tắt, sửa native_name/bcp47/voice_note."),
            ("5", "Hệ thống áp dụng thay đổi", "Bộ lọc, thanh ngôn ngữ và quyền ngôn ngữ dùng danh sách mới ở lần tải kế tiếp."),
        ],
        [
            ("US-13.1", "Là quản trị viên, tôi muốn tạo danh mục “Món nước” chỉ áp dụng cho món để bộ lọc chính xác.",
             ["Given tạo danh mục với applies_to=dish, When mở bộ lọc món, Then danh mục xuất hiện; bộ lọc địa điểm không hiển thị danh mục này.",
              "Given xoá danh mục đang được dùng, When bấm xoá, Then hệ thống báo không thể xoá và giữ nguyên dữ liệu."]),
            ("US-13.2", "Là quản trị viên, tôi muốn tạm tắt một ngôn ngữ mà không mất bản dịch.",
             ["Given ngôn ngữ ko đang có bản dịch, When tắt is_active, Then ngôn ngữ biến khỏi thanh chọn nhưng dữ liệu bản dịch vẫn còn.",
              "Given đang là STAFF, When mở màn hình ngôn ngữ, Then không thấy nút sửa hoặc API trả 403."]),
        ],
    )
    out += _u(
        T, "UC-14", "Quản lý audio và mã QR", "ADMIN / STAFF", "Dịch vụ TTS (tuỳ chọn)",
        "Tải lên hoặc liên kết audio cho bản dịch, sinh TTS khi cần, và tạo/tái tạo mã QR cho địa điểm hoặc món.",
        "Bản dịch hoặc địa điểm/món tồn tại; người dùng đã đăng nhập ADMIN/STAFF; thư mục uploads ghi được.",
        "media_files có bản ghi audio hoặc QR tương ứng; QR là SVG trong uploads/qr; audio có duration, mime_type, source.",
        "Người dùng mở tab Audio/QR của một bản dịch hoặc bấm “Tạo QR” trên địa điểm/món.",
        "A1: file audio sai định dạng/quá dung lượng → 400. A2: TTS lỗi hoặc thiếu API key → thông báo, không tạo bản ghi rỗng. A3: QR đã tồn tại → trả QR hiện có; chỉ tái tạo khi người dùng xác nhận. A4: hai audio cho cùng bản dịch → audio mới thay audio cũ theo partial unique index. A5: xoá audio đang được dùng → client nhận URL rỗng và chuyển sang TTS/chờ.",
        "Một QR cho mỗi địa điểm/món; một audio cho mỗi bản dịch; QR trỏ tới URL web có base_url hợp lệ; audio ưu tiên file thu sẵn, TTS chỉ là fallback.",
        [
            ("1", "Người dùng mở tab Audio", "GET /api/translations/:translationId/audio; trả audio hiện có hoặc rỗng."),
            ("2", "Người dùng tải file", "POST /api/translations/:id/audio; multer lưu file, mediaService ghi media_files kind=audio."),
            ("3", "Hoặc người dùng liên kết URL", "POST /api/translations/:id/audio/url; lưu URL ngoài, không upload file."),
            ("4", "Hoặc người dùng sinh TTS", "POST /api/tts; gửi text + language_code; nếu có translation_id thì gắn audio vào bản dịch."),
            ("5", "Người dùng tạo QR địa điểm", "POST /api/places/:id/qr; server sinh SVG, lưu media_files kind=qr."),
            ("6", "Người dùng tạo QR món", "POST /api/dishes/:id/qr; cùng quy tắc một QR mỗi thực thể."),
            ("7", "Người dùng tái tạo QR", "POST /qr/regenerate; thay URL/Qr cũ; mã cũ không còn hiệu lực."),
        ],
        [
            ("US-14.1", "Là nhân viên nội dung, tôi muốn tải file thuyết minh tiếng Anh cho một địa điểm.",
             ["Given bản dịch en tồn tại, When tải file mp3 hợp lệ, Then media_files có audio gắn đúng translation_id và khách nghe được.",
              "Given tải file sai định dạng, When gửi, Then server trả 400 và audio cũ vẫn được giữ."]),
            ("US-14.2", "Là nhân viên nội dung, tôi muốn in mã QR của quán để đặt tại bàn.",
             ["Given địa điểm đã PUBLISHED, When tạo QR, Then hệ thống trả ảnh SVG trỏ tới trang địa điểm và không tạo QR thứ hai khi bấm lại.",
              "Given QR đã bị lộ, When tái tạo, Then mã mới được sinh và mã cũ không còn trỏ đúng nội dung."]),
        ],
    )
    out += _u(
        T, "UC-15", "Quản lý người dùng và vai trò", "ADMIN", "—",
        "Tạo, cập nhật, vô hiệu hoá, đặt lại mật khẩu và xoá tài khoản quản trị; gán vai trò ADMIN hoặc STAFF.",
        "Người dùng đang đăng nhập với vai trò ADMIN; bảng users và bảng vai trò tương ứng tồn tại (hiện có GAP-01/GAP-05).",
        "Tài khoản được tạo/cập nhật; vai trò và trạng thái is_active thay đổi; mật khẩu mới được băm; không lưu mật khẩu thô.",
        "ADMIN mở mục Người dùng và chọn thêm/sửa tài khoản.",
        "A1: email trùng → 409. A2: vai trò không hợp lệ → 400. A3: ADMIN tự xoá mình → cần chặn theo thiết kế (chưa thấy kiểm tra trong mã hiện tại). A4: xoá tài khoản đang có dữ liệu tham chiếu → kiểm tra ràng buộc. A5: authService còn dùng users.role_id/roles, migration chỉ có users.role → thao tác có thể lỗi (GAP-01, GAP-05).",
        "Chỉ ADMIN; mật khẩu băm bcrypt; không trả password_hash; thay đổi vai trò có hiệu lực ở lần đăng nhập sau; trạng thái is_active chặn đăng nhập.",
        [
            ("1", "ADMIN mở danh sách người dùng", "GET /api/users; trả id, email, full_name, role, is_active, last_login_at."),
            ("2", "ADMIN tạo tài khoản", "POST /api/users; kiểm tra email, vai trò, mật khẩu; băm trước khi lưu."),
            ("3", "ADMIN cập nhật tài khoản", "PUT /api/users/:id; đổi tên, vai trò, is_active."),
            ("4", "ADMIN đặt lại mật khẩu", "PUT /api/users/:id/password; băm mật khẩu mới."),
            ("5", "ADMIN xoá tài khoản", "DELETE /api/users/:id; kiểm tra ràng buộc và quyền."),
        ],
        [
            ("US-15.1", "Là quản trị viên, tôi muốn tạo tài khoản STAFF để nhân viên cập nhật nội dung nhưng không quản lý người dùng.",
             ["Given đang là ADMIN, When tạo tài khoản role=STAFF, Then tài khoản đăng nhập được và menu người dùng bị ẩn.",
              "Given đang là STAFF, When gọi POST /api/users, Then API trả 403."]),
            ("US-15.2", "Là quản trị viên, tôi muốn vô hiệu hoá tài khoản cũ thay vì xoá để giữ dấu vết.",
             ["Given một tài khoản không còn dùng, When đặt is_active=false, Then tài khoản không đăng nhập được nhưng bản ghi vẫn tồn tại.",
              "Given tài khoản bị vô hiệu hoá, When đăng nhập, Then API trả 403 và không cấp JWT."]),
        ],
    )
    out += _u(
        T, "UC-16", "Dashboard và thống kê", "ADMIN / STAFF", "—",
        "Theo dõi số lượng nội dung, lượt quét, lượt nghe và số người đang truy cập để điều chỉnh nội dung và vận hành.",
        "Người dùng đã đăng nhập ADMIN/STAFF; activity_logs có dữ liệu; các tuyến thống kê hoạt động.",
        "Dashboard hiển thị số liệu tổng quan; biểu đồ quét/nghe theo 14 ngày; danh sách online trong 5 phút; không thay đổi dữ liệu nguồn.",
        "Người dùng mở Dashboard sau khi đăng nhập hoặc chọn mục Thống kê.",
        "A1: chưa có dữ liệu → hiển thị 0 và thông báo “chưa có hoạt động”, không lỗi. A2: tuyến thống kê lỗi → các khối khác vẫn hiển thị nếu có thể. A3: lượt nghe thiếu do chưa có tuyến ghi nhận (GAP-03) → dashboard ghi chú số liệu có thể thấp hơn thực tế. A4: quyền STAFF → chỉ xem, không có nút sửa.",
        "Cửa sổ 14 ngày cho quét/nghe; online 5 phút; số liệu tổng hợp từ activity_logs và bảng nội dung; không hiển thị thông tin cá nhân của khách.",
        [
            ("1", "Người dùng mở Dashboard", "GET /api/dashboard/statistics; trả số địa điểm, món, bản dịch, lượt quét/nghe."),
            ("2", "Người dùng xem biểu đồ quét", "GET /api/statistics/scans?days=14; dữ liệu theo thời gian, địa điểm, ngôn ngữ."),
            ("3", "Người dùng xem biểu đồ nghe", "GET /api/statistics/audio; lưu ý GAP-03 về tuyến ghi nhận."),
            ("4", "Người dùng xem online", "GET /api/dashboard/online-users?minutes=5; danh sách phiên đang hoạt động."),
            ("5", "Người dùng quyết định cập nhật", "Chuyển sang UC-09/10/11 nếu cần chỉnh nội dung; quay lại dashboard sau khi lưu."),
        ],
        [
            ("US-16.1", "Là quản trị viên, tôi muốn biết địa điểm nào được quét nhiều để ưu tiên cập nhật nội dung.",
             ["Given có dữ liệu quét, When mở thống kê 14 ngày, Then bảng xếp hạng hiển thị tên địa điểm và số lượt quét.",
              "Given chưa có lượt quét, When mở dashboard, Then biểu đồ hiển thị 0 và thông báo chưa có hoạt động, không lỗi."]),
            ("US-16.2", "Là nhân viên nội dung, tôi muốn thấy số người đang truy cập để biết thời điểm đông khách.",
             ["Given có phiên hoạt động trong 5 phút, When mở online, Then danh sách hiển thị số phiên và thời điểm hoạt động gần nhất.",
              "Given không có phiên nào, When mở online, Then hiển thị 0 và không lộ thông tin cá nhân."]),
        ],
    )
    return out
