-- 003: Culinary places (10 demo places in District 4)
INSERT INTO culinary_places (code, category_id, address, latitude, longitude, phone, price_range, price_min, price_max, opening_time, closing_time, is_recommended, status)
SELECT v.code, c.id, v.address, v.lat, v.lng, v.phone, v.price_range, v.price_min, v.price_max, v.open_time::TIME, v.close_time::TIME, v.recommended, 'PUBLISHED'
FROM (VALUES
  ('oc-oanh',                    'seafood',            'Đoàn Văn Cự, Phường 13, Quận 4, TP.HCM',        10.7540, 106.7060, '0903 000 101', '60.000-250.000đ',  60000, 250000, '16:00', '23:00', true),
  ('com-tam-vinh-khanh',    'vietnamese-cuisine', 'Đường Vĩnh Khánh, Phường 10, Quận 4, TP.HCM',    10.7560, 106.7000, '0903 000 102', '50.000-90.000đ',   50000,  90000, '07:00', '21:00', true),
  ('banh-xeo-hoa-gia',      'street-food',        'Đường Nguyễn Khoái, Phường 1, Quận 4, TP.HCM',   10.7580, 106.6960, '0903 000 103', '45.000-70.000đ',   45000,  70000, '09:00', '20:00', false),
  ('bun-rieu-ben-van-don',  'street-food',        'Đường Bến Vân Đồn, Phường 12, Quận 4, TP.HCM',   10.7590, 106.7040, '0903 000 104', '35.000-55.000đ',   35000,  55000, '06:30', '19:00', false),
  ('pho-an-vinh-khanh',     'night-food',         'Đường Vĩnh Khánh, Phường 9, Quận 4, TP.HCM',     10.7562, 106.6985, NULL,           '50.000-300.000đ',  50000, 300000, '17:00', '02:00', true),
  ('cho-quan-4',            'market',             'Đường Hoàng Diệu, Phường 12, Quận 4, TP.HCM',    10.7565, 106.7085, NULL,           '20.000-100.000đ',  20000, 100000, '06:00', '18:00', false),
  ('cafe-ben-van-don',      'drinks-cafe',        'Đường Bến Vân Đồn, Phường 13, Quận 4, TP.HCM',   10.7600, 106.7060, '0903 000 107', '25.000-65.000đ',   25000,  65000, '07:00', '22:00', false),
  ('che-heo-quay',          'dessert',            'Đường Đoàn Văn Cự, Phường 13, Quận 4, TP.HCM',   10.7535, 106.7065, '0903 000 108', '25.000-45.000đ',   25000,  45000, '14:00', '22:00', false),
  ('banh-canh-cua-nguyen-khoai', 'vietnamese-cuisine', 'Đường Nguyễn Khoái, Phường 2, Quận 4, TP.HCM', 10.7575, 106.6955, '0903 000 109', '40.000-60.000đ', 40000,  60000, '06:30', '19:30', true),
  ('hutieu-ca-men',         'street-food',        'Đường Đoàn Như Hài, Phường 12, Quận 4, TP.HCM',  10.7550, 106.7045, '0903 000 110', '40.000-70.000đ',   40000,  70000, '06:00', '20:00', false)
) AS v(code, cat, address, lat, lng, phone, price_range, price_min, price_max, open_time, close_time, recommended)
JOIN categories c ON c.code = v.cat
ON CONFLICT ON CONSTRAINT culinary_places_code_key DO NOTHING;

-- Vietnamese translations
INSERT INTO culinary_place_translations (culinary_place_id, language_id, name, short_description, description, history, cultural_significance, tourist_tips)
SELECT p.id, l.id, v.name, v.short_desc, v.descr, v.history, v.culture, v.tips
FROM (VALUES
  ('oc-oanh', 'Ốc Oanh',
   'Quán ốc hải sản đường phố nổi tiếng của Quận 4, mở cửa từ chiều tối.',
   'Ốc Oanh là quán ăn hải sản đường phố quen thuộc của người dân Quận 4, chuyên các món ốc nướng và xào như ốc hương, nghêu hấp sả, ốc mỡ và ốc bươu nướng. Không gian quán được bố trí tại vỉa hè với những bàn ghế nhựa nhỏ thấp, phong cách gần gũi, thân thiện, rất phù hợp cho buổi tụ tập cuối ngày của nhóm bạn bè và gia đình. Quán nhận khách từ giữa chiều và duy trì đến khuya, lúc nào cũng rộn rã tiếng cười nói và tiếng nướng than đặc trưng. Đặc biệt, hầu hết các món đều được chuẩn bị ngay khi có đơn hàng, đảm bảo độ tươi ngon tuyệt đối và thể hiện tay nghề chế biến thủ công. Trà đá mát lạnh, nước chấm chua ngọt đậm đà, bánh tráng nướng giòn rụm là những món đi kèm không thể thiếu giúp cân bằng vị giác. Không chỉ người địa phương, ngày càng nhiều khách du lịch tìm đường đến đây để trải nghiệm không khí ốc đường phố Sài Gòn đỉnh cao. Mọi người thường gọi ốc kết hợp với cơm cháy, bánh tráng nướng hoặc kèm thêm ly bia để đêm thêm vui tươi. Ngoài ra, cửa hàng còn phục vụ các món ăn nhẹ như trứng nướng, đậu rang muối, làm tăng trải nghiệm thưởng thức.',
   'Quán nằm trên đường Đoàn Văn Cự, hoạt động từ buổi chiều đến đêm. Thực đơn xoay quanh các loại ốc tươi mới mỗi ngày, được chế biến theo kiểu Sài Gòn: nướng than, xào tỏi ớt hoặc hấp sả, mang đến hương vị đậm đà. Đầu nguồn ốc được thu từ hải sản đường biển và sông được vận chuyển về tới buổi sáng, đảm bảo mọi thứ đều tươi sống khỏe. Bếp than cháy suốt ngày, mang lại mùi hương nướng đặc trưng. Quán không có biển hiệu lớn, chỉ dựa trên vẻ đẹp của món ăn và sự gắn bó với khách hàng lâu năm.',
   'Ốc là món nhậu đường phố đặc trưng của Sài Gòn, gắn với văn hóa tụ tập bạn bè cuối ngày. Quận 4 được xem là một trong những khu vực có nhiều quán ốc nhất thành phố.',
   'Đến sau 18h để đón không khí tối rực lửa • Nên gọi kèm bánh tráng nướng hoặc cơm cháy • Mang theo tiền mặt vì nhiều quán không nhận thẻ'),

  ('com-tam-vinh-khanh', 'Cơm Tấm Vĩnh Khánh',
   'Quán cơm tấm phục vụ cơm tấm sườn nướng than, bì, chả trứng cùng nước mắm chua ngọt.',
   'Quán cơm tấm là một trong những địa điểm ăn uống quen thuộc, chuyên phục vụ các món cơm tấm truyền thống mang đậm hương vị ẩm thực Việt Nam. Món ăn nổi bật nhất tại quán là cơm tấm sườn nướng than, với miếng sườn được tẩm ướp gia vị đậm đà, nướng trực tiếp trên than hồng tạo nên màu sắc hấp dẫn. Bên cạnh đó, quán còn phục vụ các món ăn kèm như bì trộn thính, chả trứng mềm béo và trứng ốp la. Đặc biệt, phần nước mắm chua ngọt được pha chế theo công thức riêng, có sự kết hợp hài hòa giữa vị mặn, ngọt và chua nhẹ.',
   'Sườn được nướng trên than hoa, cơm tấm rây tơi hạt, ăn kèm bì tàu hủ chiên giòn và chả trứng hấp. Nước mắm pha ngần có cả chua và hành tím phi thơm. Đường Vĩnh Khánh từ lâu là tuyến phố ăn uống sầm uất của Quận 4.',
   'Cơm tấm được xem là món ăn quốc dân của miền Nam, xuất phát từ việc tận dụng gạo tấm và nay đã thành nét ẩm thực đường phố Sài Gòn.',
   'Giờ cao điểm 11h-13h nên đợi chút • Thêm trứng ốp la hoặc chả bì tăng vị'),

  ('banh-xeo-hoa-gia', 'Bánh Xèo Hoa Gia',
   'Bánh xèo giòn rụm chiên trên bếp than, cuốn cùng rau sống và nước chấm.',
   'Bánh xèo vỏ mỏng giòn, nhân tôm thịt giá đỗ, chiên trên chảo nhỏ truyền thống với bột gạo nghệ, tôm, thịt và giá đỗ. Ăn kèm rau sống các loại, bánh tráng và nước mắm chấm tỏi ớt.',
   'Bánh được chiên khi khách gọi, giữ độ giòn và nóng hổi. Người Sài Gòn thường cuốn bánh xèo với rau cải, rau thơm, chấm nước mắm chua ngọt có cà rốt củ cải muối. Các quán bánh xèo dọc Nguyễn Khoái phục vụ cư dân khu vực này nhiều năm theo kiểu quán vỉa hè gia đình.',
   'Bánh xèo phản ánh giao thoa ẩm thực Nam Bộ, với màu vàng đặc trưng từ nghệ.',
   'Ăn ngay khi ra lò để giữ độ giòn và nóng nhất • Cuốn nhỏ tay để dễ chấm mắm'),

  ('bun-rieu-ben-van-don', 'Bún Rêu Cua Bến Vân Đồn',
   'Bún riêu cua đồng nước dùng ngọt, ăn kèm rau sống và tôm chua.',
   'Nồi riêu cua đồng gạch đông đậm, nước dùng trong ngọt, ăn cùng bún tươi, đậu hũ, cà chua và rau sống. Món ăn sáng và trưa phổ biến của khu vực gần bến sông.',
   'Cua đồng xay lọc lấy gạch, om cùng cà chua tạo màu đỏ tự nhiên. Tô bún kèm tôm chua, rau muống chẻ, giá và hoa chuối bào.',
   'Bún riêu là món ăn sáng đại diện Nam Bộ, thể hiện cách nêm nếm thanh nhẹ của ẩm thực sông nước.',
   'Gọi thêm gạch riêu nếu thích béo • Chấm đã chân ớt để tăng vị giác'),

  ('pho-an-vinh-khanh', 'Phố Ẩm Thực Vĩnh Khánh',
   'Tuyến phố ăn đêm sầm uất nhất Quận 4 với hải sản, ốc và lẩu nướng.',
   'Khi màn đêm xuống, Vĩnh Khánh chuyển mình thành phố ăn đêm: hàng loạt bàn ghế dọc phố, mùi hải sản nướng và lẩu nghi ngút khói. Nơi lý tưởng để cảm nhận nhịp sống đêm Sài Gòn.',
   'Các quán ven đường phục vụ hải sản nướng, ốc các loại, lẩu cá, cháo hải sản. Đường phố nhộn nhịp nhất từ 19h đến 23h. Tuyến phố này hình thành từ nhu cầu ăn đêm của cư dân cảng sông quanh khu vực.',
   'Văn hóa ăn đêm dọc Vĩnh Khánh thể hiện lối sống cởi mở của Sài Gòn.',
   'Đi nhóm để gọi nhiều món dùng chung • Mang theo tiền mặt vì nhiều quán không nhận thẻ'),

  ('cho-quan-4', 'Chợ Quận 4',
   'Chợ truyền thống sầm uất với hàng ăn, trái cây và đặc sản miền Tây.',
   'Chợ Quận 4 tập trung các quầy thức ăn sáng, trái cây, bánh trái và khô hải sản. Không gian chợ truyền thống kiểu Sài Gòn.',
   'Các quầy trong chợ bán bún mắm, hủ tiếu, bánh canh, trái cây miền Tây và đồ khô. Chợ nhộn nhịp nhất vào buổi sáng.',
   'Chợ truyền thống là nơi bảo tồn cách buôn bán, nấu nướng và ăn uống bản địa.',
   'Mang tiền lẻ để mua tiện • Nhờ người bán gợi ý món ăn sáng tại chợ'),

  ('cafe-ben-van-don', 'Cà Phê Bến Vân Đồn',
   'Quán cà phê ven sông nhìn ra kênh Bến Nghé, phù hợp buổi sáng và chiều mát.',
   'Không gian mở hướng sông, phục vụ cà phê sữa đá, cà phê cốt dừa và trà trái cây. Điểm dừng chân thư giãn giữa tuyến ẩm thực dày đặc của Quận 4.',
   'Quán tọa lạc trên tuyến Bến Vân Đồn nhìn ra dòng kênh, có khu vực ngồi trước quán ngắm tàu thuyền qua lại.',
   'Văn hóa cà phê vỉa hè Sài Gòn thể hiện nhịp sống chậm rãi giữa lòng thành phố đông đúc.',
   'Sáng sớm mát, ngồi ngoài thấy tàu qua • Gọi cà phê sữa đá pha phin truyền thống'),

  ('che-heo-quay', 'Chè Heo Quay',
   'Tiệm chè đường phố với món chè thập cẩm và chè khúc bạch mát lạnh.',
   'Chén chè thập cẩm đủ màu với đậu xanh, khoai, bột báng, nước cốt dừa. Món tráng miệng được ưa chuộng của khu phố chiều tối.',
   'Chè được nấu hàng ngày, phục vụ từ buổi chiều đến đêm. Các loại chè mang đậm phong vị ngọt ngào kiểu Nam Bộ với nước cốt dừa béo nhẹ.',
   'Chè là nét văn hóa tráng miệng Nam Bộ, phản ánh sự phong phú của nguyên liệu miền sông nước.',
   'Gọi ít đá nếu ăn buổi tối • Thêm chút đậu phụng rang cho chén chè giòn ngọt'),

  ('banh-canh-cua-nguyen-khoai', 'Bánh Canh Cua Nguyễn Khoái',
   'Bánh canh cua cá ngừ nước dùng ngọt, là đặc sản sáng của khu Nguyễn Khoái.',
   'Sợi bột bánh canh làm từ bột gạo pha bột năng, nước dùng nấu cá đồng và xương, kèm chả cá, tôm, chả quế. Món ăn sáng đậm đà của Quận 4.',
   'Thịt cá cho vị ngọt chắc, nước dùng ninh xương với cà tạo độ sánh tự nhiên. Ăn kèm giá, hành lá, tiêu xay và chút ớt.',
   'Bánh canh cá là đặc sản được nhiều người gắn với ẩm thực sáng của khu vực gần bến sông.',
   'Gọi thêm chả quế nếu thích • Ăn kèm quả cà chua muối cho vừa miệng'),

  ('hutieu-ca-men', 'Hủ Tiếu Mỹ Tho',
   'Hủ tiếu Mỹ Tho nước dùng trong, tôm tươi, ăn kèm hẹ và tỏi chiên.',
   'Tô hủ tiếu Mỹ Tho với sợi dai, tôm tươi, thịt heo, gan và cải ngọt, nước dùng trong vị ngọt xương. Một trong những quán hủ tiếu quen thuộc của Quận 4.',
   'Sợi hủ tiếu được làm từ bột gạo trộn tôm cho màu hồng nhẹ, nước dùng ninh xương heo cùng mắm me thanh. Quán theo phong cách hủ tiếu Mỹ Tho, phục vụ cư dân khu Đoàn Như Hài nhiều năm.',
   'Hủ tiếu thể hiện giao thoa ẩm thực Việt-Hoa-Khmer ở Nam Bộ, phổ biến theo hai kiểu nước và khô.',
   'Thử cả hai kiểu nước và khô • Thêm chút giấm ớt để nước dùng đậm hơn')
) AS v(code, name, short_desc, descr, history, culture, tips)
JOIN culinary_places p ON p.code = v.code
JOIN languages l ON l.code = 'vi'
ON CONFLICT (culinary_place_id, language_id) DO UPDATE SET
      name = EXCLUDED.name, short_description = EXCLUDED.short_description,
      description = EXCLUDED.description, history = EXCLUDED.history,
      cultural_significance = EXCLUDED.cultural_significance, tourist_tips = EXCLUDED.tourist_tips;

INSERT INTO culinary_place_images (culinary_place_id, image_url, alt_text, sort_order, is_primary)
SELECT p.id, v.image_url, v.alt_text, v.sort_order, v.is_primary
FROM (VALUES
  ('oc-oanh', '/images/places/oc-oanh.png', 'Quán ốc Oanh với các món hải sản', 0, true),
  ('com-tam-vinh-khanh', '/images/places/com-tam-vinh-khanh.png', 'Cơm tấm Vĩnh Khánh với sườn nướng', 0, true),
  ('banh-xeo-hoa-gia', '/images/places/banh-xeo-hoa-gia.png', 'Bánh xèo Hoa Gia giòn rụm', 0, true),
  ('bun-rieu-ben-van-don', '/images/places/bun-rieu-bvd.png', 'Bún riêu cua Bến Vân Đồn', 0, true),
  ('pho-an-vinh-khanh', '/images/places/pho-an-vinh-khanh.png', 'Phố ẩm thực Vĩnh Khánh nhộn nhịp về đêm', 0, true),
  ('cho-quan-4', '/images/places/cho-quan-4.png', 'Chợ Quận 4 với các quầy thức ăn và trái cây', 0, true),
  ('cafe-ben-van-don', '/images/places/cafe-bvd.png', 'Cà phê Bến Vân Đồn nhìn ra kênh Bến Nghé', 0, true),
  ('che-heo-quay', '/images/places/che-heo-quay.png', 'Chè Heo Quay với các loại chè thập cẩm và khúc bạch', 0, true),
  ('banh-canh-cua-nguyen-khoai', '/images/places/banh-canh-cua-nk.png', 'Bánh canh cá Nguyễn Khoái với nước dùng ngọt thanh', 0, true),
  ('hutieu-ca-men', '/images/places/hu-tieu.png', 'Hủ tiếu Mỹ Tho với tôm tươi và nước dùng trong', 0, true)
) AS v(code, image_url, alt_text, sort_order, is_primary)
JOIN culinary_places p ON p.code = v.code;