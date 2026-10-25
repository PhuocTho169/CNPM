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
INSERT INTO translations (entity_type, entity_id, language_id, name, short_description, description, history, cultural_significance, tourist_tips)
SELECT 'place', p.id, l.id, v.name, v.short_desc, v.descr, v.history, v.culture, v.tips
FROM (VALUES
  ('oc-oanh', 'Ốc Oanh',
   'Quán ốc hải sản đường phố nổi tiếng của Quận 4, mở cửa từ chiều tối.',
   'Ốc Oanh là quán ăn hải sản đường phố quen thuộc của người dân Quận 4, chuyên các món ốc nướng và xào như ốc hương, nghêu hấp sả, ốc mỡ và ốc bươu nướng. Không gian quán được bố trí tại vỉa hè với những bàn ghế nhựa nhỏ thấp, phong cách gần gũi, thân thiện, rất phù hợp cho buổi tụ tập cuối ngày của nhóm bạn bè và gia đình. Quán nhận khách từ giữa chiều và duy trì đến khuya, lúc nào cũng rộn rã tiếng cười nói và tiếng nướng than đặc trưng. Đặc biệt, hầu hết các món đều được chuẩn bị ngay khi có đơn hàng, đảm bảo độ tươi ngon tuyệt đối và thể hiện tay nghề chế biến thủ công. Trà đá mát lạnh, nước chấm chua ngọt đậm đà, bánh tráng nướng giòn rụm là những món đi kèm không thể thiếu giúp cân bằng vị giác. Không chỉ người địa phương, ngày càng nhiều khách du lịch tìm đường đến đây để trải nghiệm không khí ốc đường phố Sài Gòn đỉnh cao. Mọi người thường gọi ốc kết hợp với cơm cháy, bánh tráng nướng hoặc kèm thêm ly bia để đêm thêm vui tươi. Ngoài ra, cửa hàng còn phục vụ các món ăn nhẹ như trứng nướng, đậu rang muối, làm tăng trải nghiệm thưởng thức.',
   'Quán nằm trên đường Đoàn Văn Cự, hoạt động từ buổi chiều đến đêm. Thực đơn xoay quanh các loại ốc tươi mới mỗi ngày, được chế biến theo kiểu Sài Gòn: nướng than, xào tỏi ớt hoặc hấp sả, mang đến hương vị đậm đà. Đầu nguồn ốc được thu từ hải sản đường biển và sông được vận chuyển về tới buổi sáng, đảm bảo mọi thứ đều tươi sống khỏe. Bếp than cháy suốt ngày, mang lại mùi hương nướng đặc trưng. Quán không có biển hiệu lớn, chỉ dựa trên vẻ đẹp của món ăn và sự gắn bó với khách hàng lâu năm.',
   'Ốc là món nhậu đường phố đặc trưng của Sài Gòn, gắn với văn hóa tụ tập bạn bè cuối ngày. Quận 4 được xem là một trong những khu vực có nhiều quán ốc nhất thành phố.',
   'Đến sau 18h để đón không khí tối rực lửa • Nên gọi kèm bánh tráng nướng hoặc cơm cháy • Mang theo tiền mặt vì nhiều quán không nhận thẻ'),

  ('com-tam-vinh-khanh', 'Cơm Tấm Vĩnh Khánh',
   'Quán cơm tấm phục vụ cơm tấm sườn nướng than, bì, chả trứng cùng nước mắm chua ngọt.',
   'Quán cơm tấm là một trong những địa điểm ăn uống quen thuộc, chuyên phục vụ các món cơm tấm truyền thống mang đậm hương vị ẩm thực Việt Nam. Món ăn nổi bật nhất tại quán là cơm tấm sườn nướng than, với miếng sườn được tẩm ướp gia vị đậm đà, nướng trực tiếp trên than hồng tạo nên màu sắc hấp dẫn. Bên cạnh đó, quán còn phục vụ các món ăn kèm như bì trộn thính, chả trứng mềm béo và trứng ốp la. Đặc biệt, phần nước mắm chua ngọt được pha chế theo công thức riêng, có sự kết hợp hài hòa giữa vị mặn, ngọt và chua nhẹ. Sườn được nướng từng đợt liên tục trên than hồng, khách xa ghé lần đầu cũng dễ nhận ra quán nhờ tiếng nướng sườn nghi ngút dọc khu phường.',
   'Sườn được ướp hành tím, tỏi, nước mắm và một chút mật mía, nướng chậm trên than hoa cho tới khi lên màu cánh gián bóng nhẹ, xé tách thịt dễ dàng. Gạo tấm được rây sạch để hạt cơm tơi xốp, dẻo mà không bết. Bì luộc mềm, lăn thính gạo cho thơm béo, chả trứng hấp phết lòng đỏ tạo lớp vỏ vàng óng, phủ thêm mỡ hành và hành tím phi. Nước mắm pha độ chua ngọt dịu, chan nhẹ vừa đủ để từng hạt cơm thấm vị. Quán phục vụ liên tục từ sáng tới tối, nhiều khách quanh khu phố ghé mua mang đi nhanh trong giờ điểm tâm. Đường Vĩnh Khánh từ lâu là tuyến phố ăn uống sầm uất của Quận 4, và quán cơm tấm tại đây gần như là điểm hẹn quen thuộc của cư dân quanh phường trước giờ làm việc. Ngoài cơm tấm sườn bì chả, quán còn có lựa chọn thêm trứng ốp la hoặc chả thịt nướng cho thực đơn phong phú hơn. Mỗi khẩu phần đều đắp đầy đủ, mức giá thích hợp túi tiền của người lao động và sinh viên quanh khu vực.',
   'Cơm tấm được xem là món ăn quốc dân của miền Nam, xuất phát từ việc tận dụng gạo tấm và nay đã thành nét ẩm thực đường phố Sài Gòn.',
   'Giờ cao điểm 11h-13h nên đợi chút • Thêm trứng ốp la hoặc chả bì tăng vị'),

  ('banh-xeo-hoa-gia', 'Bánh Xèo Hoa Gia',
   'Bánh xèo giòn rụm chiên trên bếp than, cuốn cùng rau sống và nước chấm.',
   'Bánh luôn được chiên ngay khi khách gọi trên chảo gang nhỏ đã nung trước, nên mép bánh vàng gân, mặt bánh phồng xốp và giữ được độ giòn lẫn nóng hổi khi đưa lên đĩa. Phần nhân vừa phải nhưng đầy đặn, thực khách thường xé bánh ra miếng nhỏ để cuốn là làn, tiện chia cho cả nhóm. Người Sài Gòn quen cuốn bánh xèo với rau cải xanh, rau thơm, tía tô, kèm chén nước mắm chua ngọt có đu đủ và củ cải muối chua giòn. Quán theo kiểu vỉa hè gia đình dọc Nguyễn Khoái phục vụ cư dân khu vực nhiều năm, luôn có đông khách chiều tối. Nước chấm pha nhẹ nên không kỵ mùi béo của nhân, giúp ăn được nhiều miếng mà không ngán. Ngoài bánh xèo, quán còn gợi ý gọi thêm ốc xào để lai rai cùng nhóm bạn cuối ngày. Bột bánh được pha từ sớm và để nghỉ khoảng mười lăm phút trước khi tráng nên bánh nổ đều, vỏ vàng đẹp. Vì mỗi chiếc bánh đều chiên theo đơn trong thời điểm khách gọi, giờ cao điểm có thể phải chờ thêm chút ít, nhưng đó là chấp nhận được để giữ đúng chất giòn đặc trưng của quán. Khu vực bàn ghế rộng thoãi, thuận tiện cho các nhóm khách đi cùng nhau vào buổi chiều tối.',
   'Bánh xèo giòn rụm chiên trên chảo gang nhỏ, nhân tôm thịt giá đỗ, ăn kèm rau sống các loại, bánh tráng và nước mắm chấm tỏi ớt.',
   'Bánh xèo phản ánh giao thoa ẩm thực Nam Bộ, với màu vàng đặc trưng từ nghệ.',
   'Ăn ngay khi ra lò để giữ độ giòn và nóng nhất • Cuốn nhỏ tay để dễ chấm mắm'),

  ('bun-rieu-ben-van-don', 'Bún Rêu Cua Bến Vân Đồn',
   'Bún riêu cua đồng nước dùng ngọt, ăn kèm rau sống và tôm chua.',
   'Bún riêu cua đồng ở đây giữ cách nấu Nam Bộ nguyên bản: cua tươi xay lọc lấy gạch, om cùng cà chua chín tới cho màu đỏ phấp phới và vị ngọt thanh tự nhiên. Nước dùng trong, nhẹ béo, không nồng; tô bún kèm đậu hũ chiên vàng, huyết heo mềm, tôm chua cay nhẹ và đĩa rau sống gồm rau muống chẻ, giá, hoa chuối bào. Thực khách có thể thêm chút mắm tôm nếu thích hương vị đậm đà truyền thống, hoặc gọi thêm một chén gạch riêu riêng. Quán đông khách nhất từ 6h30 tới 11h, khi cư dân khu vực gần bến sông ghé ăn sáng trước giờ đi làm. Giá thành bình dân, tốc độ phục vụ nhanh, đây là lý do tô bún riêu gắn bó với nhiều thế hệ người ăn tại khu vực Bến Vân Đồn. Vị cua đồng tươi là điểm làm nên sự khác biệt, quán không dùng riêu làm sẵn nên màu sắc và hương vị đều rõ nét. Nước dùng ninh riêng từ xương heo và cà chua, ít bột ngọt nên ăn xong không bị khát. Nếu đi cùng nhóm đông người, gọi thêm một đĩa trứng cua chiên hoặc chả cua để mâm ăn tròn trịa và đầy đặn hơn.',
   'Nồi riêu cua đồng gạch đông đậm, nước dùng trong ngọt, ăn cùng bún tươi, đậu hũ, cà chua và rau sống. Món ăn sáng và trưa phổ biến của khu vực gần bến sông.',
   'Bún riêu là món ăn sáng đại diện Nam Bộ, thể hiện cách nêm nếm thanh nhẹ của ẩm thực sông nước.',
   'Gọi thêm gạch riêu nếu thích béo • Chấm đã chân ớt để tăng vị giác'),

  ('pho-an-vinh-khanh', 'Phố Ẩm Thực Vĩnh Khánh',
   'Tuyến phố ăn đêm sầm uất nhất Quận 4 với hải sản, ốc và lẩu nướng.',
   'Mỗi buổi tối Vĩnh Khánh chuyển mình thành tuyến phố ăn đêm sống động nhất Quận 4: bàn ghế trải dài ra lề đường, bếp than kêu lách tách, mùi hải sản nướng và lẩu nghi ngút khói lan khắp mặt phố. Các quán ở đây phục vụ đa dạng: ốc các loại, mực nướng, tôm nướng than, nghêu hấp, lẩu hải sản và cháo hải sản ăn khuya. Nhịp đông nhất từ 19h tới 23h, khi người đi làm xong việc kéo nhau về đây lai rai bên các đĩa món nhắm, vừa ăn vừa trò chuyện cùng cả nhóm. Tuyến phố hình thành từ nhu cầu ăn đêm của cư dân cảng sông xung quanh, nay đã trở thành điểm hẹn quen thuộc của nhiều bạn trẻ Sài Gòn muốn khám phá ẩm thực đêm. Khách nên đi nhóm để có thể chia sẻ nhiều món, mang theo tiền mặt vì nhiều quán không nhận thẻ. Xe máy dễ dàng đậu trên lề đường, các quán thường có người giữ xe cho khách ăn tại chỗ. Vào những ngày mưa, nên chọn bàn có mái che hoặc ghé quán trong nhà dọc tuyến phố. Điểm cộng thêm là giá cả hợp lý so với mặt bằng ẩm thực toàn thành phố.',
   'Khi màn đêm xuống, Vĩnh Khánh chuyển mình thành phố ăn đêm: hàng loạt bàn ghế dọc phố, mùi hải sản nướng và lẩu nghi ngút khói. Nơi lý tưởng để cảm nhận nhịp sống đêm Sài Gòn.',
   'Văn hóa ăn đêm dọc Vĩnh Khánh thể hiện lối sống cởi mở của Sài Gòn.',
   'Đi nhóm để gọi nhiều món dùng chung • Mang theo tiền mặt vì nhiều quán không nhận thẻ'),

  ('cho-quan-4', 'Chợ Quận 4',
   'Chợ truyền thống sầm uất với hàng ăn, trái cây và đặc sản miền Tây.',
   'Chợ Quận 4 hoạt động từ rạng sáng với các quầy ăn: bún mắm, hủ tiếu, bánh canh, cháo trắng giữ ấm trong từng nồi, cùng bánh bao và bánh ngọt cho khách lẻ. Trên các luống khác là quầy trái cây miền Tây tươi đủ mùa, cùng khu vực bán khô hải sản, mắm, đường và đồ khô cho người mua cất giữ. Nhịp sầm uất nhất vào buổi sáng từ 6h tới 9h, khi cư dân đi chợ nước, nhân viên văn phòng ghé mua điểm tâm trước giờ làm. Các chủ quầy quen mặt thường chủ động gợi ý món, hỗ trợ khách chọn trái cây chín tới. Chợ nhỏ nhưng đầy đủ, là nơi thể hiện nhịp sống hằng ngày của Phường 12: mua bán, ăn uống, trò chuyện giữa khu phố cũ. Khách nên mang tiền lẻ để mua tiện, và đừng ngại hỏi người bán gợi ý món ăn sáng phù hợp. Ghé chợ sớm sẽ thấy không khí sôi động nhất: nồi bún mắm nghi ngút khói, tiếng mời hàng rộ lên từ các quầy rau củ. Từ chợ có thể tiếp tục đi bộ khám phá các quán ăn lề đường quanh khu vực trong vài bước chân, đủ lựa chọn cho cả bữa sáng lẫn bữa trưa.',
   'Chợ Quận 4 tập trung các quầy thức ăn sáng, trái cây, bánh trái và khô hải sản. Không gian chợ truyền thống kiểu Sài Gòn.',
   'Chợ truyền thống là nơi bảo tồn cách buôn bán, nấu nướng và ăn uống bản địa.',
   'Mang tiền lẻ để mua tiện • Nhờ người bán gợi ý món ăn sáng tại chợ'),

  ('cafe-ben-van-don', 'Cà Phê Bến Vân Đồn',
   'Quán cà phê ven sông nhìn ra kênh Bến Nghé, phù hợp buổi sáng và chiều mát.',
   'Quán tọa lạc trên tuyến Bến Vân Đồn nhìn ra dòng kênh, có khu vực ngồi trước quán ngắm tàu thuyền qua lại, gió sông mát lạnh cả buổi sáng. Thực đơn tập trung vào các thức uống quen thuộc: cà phê sữa đá pha phin đậm, cà phê cốt dừa béo ngọt, trà trái cây mát lạnh và cacao nóng. Không gian vỉa hè với bàn ghế thấp rất thích hợp để đọc sách, tâm sự hoặc chờ hẹn. Buổi sáng sớm và chiều mát là hai thời điểm ngồi đẹp nhất của quán. Cà phê vỉa hè ven sông là nét văn hóa Sài Gòn, và quán giữ trọn nhịp sống chậm giữa lòng thành phố, là điểm nhấn của tuyến ẩm thực dày đặc quanh khu vực. Ly cà phê pha phin chảy từng giọt mất vài phút, khách nên kiên nhẫn chờ để nhận đúng độ đậm chuẩn vị. Quán mở từ sáng tới tối muộn, tiện cho cả khách muốn ngồi làm việc buổi sáng lẫn nhóm bạn trò chuyện buổi tối.',
   'Không gian mở hướng sông, phục vụ cà phê sữa đá, cà phê cốt dừa và trà trái cây. Điểm dừng chân thư giãn giữa tuyến ẩm thực dày đặc của Quận 4.',
   'Văn hóa cà phê vỉa hè Sài Gòn thể hiện nhịp sống chậm rãi giữa lòng thành phố đông đúc.',
   'Sáng sớm mát, ngồi ngoài thấy tàu qua • Gọi cà phê sữa đá pha phin truyền thống'),

  ('che-heo-quay', 'Chè Heo Quay',
   'Tiệm chè đường phố với món chè thập cẩm và chè khúc bạch mát lạnh.',
   'Chè được nấu hàng ngày theo mẻ, phục vụ từ buổi chiều đến đêm, đúng lúc người đi bộ khám phá phố cần một chén ngọt mát. Chè thập cẩm kết hợp nhiều lớp nguyên liệu trong cùng một chén: đậu xanh đánh mịn, khoai dẻo thơm, sương sáo mát lạnh, bột báng dai dẻo, cùng nước cốt dừa thắng béo ngậy rưới đều trên chén đá bào. Ngoài thập cẩm, quán còn có chè chuối, chè đậu trắng và khúc bạch mềm lạnh cho khách chọn đa dạng. Vị ngọt chừng mực theo kiểu Nam Bộ, không gắt và không nhạt hóa. Quán nhỏ ngồi vỉa hè, chủ quán thân thiện, hay chủ động gợi ý loại chè phù hợp theo sở thích của khách. Nên gọi ít đá nếu ăn buổi tối, thêm chút đậu phụng rang để chén chè thêm giòn ngọt. Chén chè giá chỉ vài chục nghìn, rất hợp làm điểm dừng tráng miệng sau khi thưởng thức các món mặn dọc khu phố. Khoảng 14h tới 17h là lúc vỉa hè mát nhất, còn buổi tối quán đông hơn nhưng vẫn còn chỗ ngồi thoải mái.',
   'Chén chè thập cẩm đủ màu với đậu xanh, khoai, bột báng, nước cốt dừa. Món tráng miệng được ưa chuộng của khu phố chiều tối.',
   'Chè là nét văn hóa tráng miệng Nam Bộ, phản ánh sự phong phú của nguyên liệu miền sông nước.',
   'Gọi ít đá nếu ăn buổi tối • Thêm chút đậu phụng rang cho chén chè giòn ngọt'),

  ('banh-canh-cua-nguyen-khoai', 'Bánh Canh Cua Nguyễn Khoái',
   'Bánh canh cua cá ngừ nước dùng ngọt, là đặc sản sáng của khu Nguyễn Khoái.',
   'Sợi bánh canh làm từ bột gạo pha bột năng cho độ dai mềm không bở, nước dùng ninh lâu từ xương và cá đồng nên ngọt thanh tự nhiên, thêm chút cà chua tạo độ sánh quyện. Tô bánh canh kèm chả cá dẻo, tôm tươi bóc vỏ, chả quế thơm phức, rắc hành lá, tiêu xay và chút ớt xanh. Người ăn thường thêm chút chanh hoặc giấm ớt để nước dùng thêm tròn vị, kèm quả cà muối xay cho vừa khẩu vị. Món ăn sáng đậm đà của Quận 4, là lựa chọn quen thuộc của cư dân khu Nguyễn Khoái trước giờ làm việc, quán đông nhất từ 6h30 tới 9h. Nước dùng được canh giữ đúng độ ngọt trong từng mẻ, vì thế hương vị luôn ổn định suốt ngày. Nếu muốn phần đậm đà hơn, thực khách có thể gọi thêm một chén gạch cua riêng hoặc hỏi thêm chút tiêu, ớt tùy khẩu vị. Với mức giá 40.000 tới 60.000 đồng một tô đầy đặn, đây là lựa chọn hợp lý cho một bữa sáng no bụng giữa khu phố.',
   'Thịt cá cho vị ngọt chắc, nước dùng ninh xương với cà tạo độ sánh tự nhiên. Ăn kèm giá, hành lá, tiêu xay và chút ớt.',
   'Bánh canh cá là đặc sản được nhiều người gắn với ẩm thực sáng của khu vực gần bến sông.',
   'Gọi thêm chả quế nếu thích • Ăn kèm quả cà chua muối cho vừa miệng'),

  ('hutieu-ca-men', 'Hủ Tiếu Mỹ Tho',
   'Hủ tiếu Mỹ Tho nước dùng trong, tôm tươi, ăn kèm hẹ và tỏi chiên.',
   'Tô hủ tiếu Mỹ Tho với sợi dai đặc trưng làm từ bột gạo trộn tôm cho màu hồng nhẹ tự nhiên, nước dùng trong veo ninh xương heo ngọt thanh mà không ngấy mỡ. Trong tô là tôm tươi bóc vỏ, thịt heo xắt mỏng, gan nướng thơm phức và cải ngọt xanh, rắc thêm chút hẹ và tỏi chiên giòn. Quán phục vụ cư dân khu Đoàn Như Hài nhiều năm theo phong cách hủ tiếu Mỹ Tho, khẩu phần chắc tay giá bình dân. Thực khách có thể chọn hủ tiếu nước truyền thống hoặc hủ tiếu khô trộn sốt, hai kiểu đều thấm đẫm gia vị và đáng thử. Buổi sáng sớm quán đông nhất, nên ghé sớm nếu muốn thưởng thức ngay mà không phải xếp hàng. Thêm chút giấm ớt và chút sa tế tùy khẩu vị để nước dùng thêm đậm đà hơn nữa. Khẩu phần đầy đặn với mức giá quanh 40 tới 70 nghìn đồng, thích hợp cả bữa sáng gấp gáp lẫn buổi tối thong thả. Quán nhỏ nhưng sạch sẽ, phục vụ nhanh tay nên chịu được nhiều khách dồn vào khung giờ đông nhất.',
   'Tô hủ tiếu Mỹ Tho với sợi dai, tôm tươi, thịt heo, gan và cải ngọt, nước dùng trong vị ngọt xương. Một trong những quán hủ tiếu quen thuộc của Quận 4.',
   'Hủ tiếu thể hiện giao thoa ẩm thực Việt-Hoa-Khmer ở Nam Bộ, phổ biến theo hai kiểu nước và khô.',
   'Thử cả hai kiểu nước và khô • Thêm chút giấm ớt để nước dùng đậm hơn')
) AS v(code, name, short_desc, descr, history, culture, tips)
JOIN culinary_places p ON p.code = v.code
JOIN languages l ON l.code = 'vi'
ON CONFLICT (entity_type, entity_id, language_id) DO UPDATE SET
      name = EXCLUDED.name, short_description = EXCLUDED.short_description,
      description = EXCLUDED.description, history = EXCLUDED.history,
      cultural_significance = EXCLUDED.cultural_significance, tourist_tips = EXCLUDED.tourist_tips;

INSERT INTO media_files (entity_type, entity_id, kind, url, alt_text, sort_order, is_primary)
SELECT 'place', p.id, 'image', v.image_url, v.alt_text, v.sort_order, v.is_primary
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
JOIN culinary_places p ON p.code = v.code
WHERE NOT EXISTS (
  SELECT 1 FROM media_files m
  WHERE m.entity_type = 'place' AND m.entity_id = p.id AND m.kind = 'image' AND m.url = v.image_url);