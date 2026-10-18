-- 004: Dishes + Vietnamese translations
INSERT INTO dishes (code, culinary_place_id, category_id, price, image_url, is_signature, status)
SELECT v.code, p.id, c.id, v.price, v.image_url, v.is_signature, 'PUBLISHED'
FROM (VALUES
  ('oc-huong',               'oc-oanh',                    'seafood',            '/images/dishes/oc-huong.png',              '150.000–250.000đ/kg', true),
  ('nghieu-hap-sa',         'oc-oanh',                    'seafood',            '/images/dishes/ngheu-hap-xa.png',         '80.000–120.000đ/kg',  false),
  ('com-tam-suon-bi-cha',   'com-tam-vinh-khanh',         'vietnamese-cuisine', '/images/dishes/com-tam-suon-bi-cha.png',   '55.000–75.000đ',      true),
  ('banh-xeo-tom-thit',     'banh-xeo-hoa-gia',           'street-food',        '/images/dishes/banh-xeo-tom-thit.png',     '45.000–70.000đ',      true),
  ('bun-rieu-cua',          'bun-rieu-ben-van-don',       'street-food',        '/images/dishes/bun-rieu-cua.png',          '35.000–55.000đ',      true),
  ('lau-hai-san-vinh-khanh','pho-an-vinh-khanh',          'night-food',         '/images/dishes/lau-hai-san-vinh-khanh.png','150.000–300.000đ',    false),
  ('oc-buong-nuong',        'pho-an-vinh-khanh',          'seafood',            '/images/dishes/oc-buong-nuong.png',        '50.000–100.000đ',     true),
  ('bun-mam-cho',           'cho-quan-4',                 'vietnamese-cuisine', '/images/dishes/bun-mam-cho.png',           '40.000–60.000đ',      false),
  ('ca-phe-sua-da-phin',    'cafe-ben-van-don',           'drinks-cafe',        '/images/dishes/ca-phe-sua-da-phin.png',    '25.000–45.000đ',      true),
  ('che-thap-cam',          'che-heo-quay',               'dessert',            '/images/dishes/che-thap-cam.png',          '25.000–35.000đ',      true),
  ('banh-canh-cua-bap',     'banh-canh-cua-nguyen-khoai', 'vietnamese-cuisine', '/images/dishes/banh-canh-cua-bap.png',     '40.000–60.000đ',      true),
  ('hu-tieu-my-tho',        'hutieu-ca-men',              'street-food',        '/images/dishes/hu-tieu-my-tho.png',        '40.000–70.000đ',      true)
) AS v(code, place, cat, image_url, price, is_signature)
JOIN culinary_places p ON p.code = v.place
JOIN categories c ON c.code = v.cat
ON CONFLICT (code) DO UPDATE SET
  image_url = EXCLUDED.image_url,
  price = EXCLUDED.price,
  is_signature = EXCLUDED.is_signature,
  status = EXCLUDED.status,
  culinary_place_id = EXCLUDED.culinary_place_id,
  category_id = EXCLUDED.category_id;

INSERT INTO dish_translations (dish_id, language_id, name, description, ingredients)
SELECT d.id, l.id, v.name, v.descr, v.ingr
FROM (VALUES
  ('oc-huong', 'Ốc hương',
   'Ốc hương tươi sống loại một được tuyển chọn kỹ lưỡng mỗi ngày, nổi tiếng với độ dai giòn sần sật và vị ngọt đậm đà từ biển. Thực khách có thể tùy chọn cách chế biến đa dạng theo phong cách ẩm thực đường phố Sài Gòn: nướng than hồng mộc mạc thơm nức mũi, hoặc xào bơ tỏi ngậy béo quánh mịn phủ đều khắp vỏ ốc. Món ăn được phục vụ nóng hổi cùng đĩa rau răm tươi, bánh tráng nướng giòn rụm và chén nước chấm chua ngọt độc quyền của quán giúp cân bằng trọn vẹn vị giác. Đây là món "best-seller" không thể bỏ qua, thu hút đông đảo bạn bè và gia đình quây quần thưởng thức mỗi tối.',
   'Ốc hương tươi, bơ, tỏi, ớt, hành lá'),

  ('nghieu-hap-sa', 'Nghêu hấp sả',
   'Những con nghêu mập tròn, tươi ngon được rửa sạch và đưa vào nồi hấp chín tới cùng sả cây đập dập, lá chanh và vài lát ớt hiểm cay nồng. Quá trình hấp giúp nghêu tự tiết ra phần nước dùng đọng lại trong veo, ngọt thanh tự nhiên mà không cần nêm nếm quá nhiều gia vị. Món ăn tỏa ra hương thơm ngào ngạt của sả tươi ngay khi vừa mở nắp, thưởng thức lúc còn nóng hổi kết hợp cùng chén muối tiêu chanh ớt hoặc nước mắm gừng sẽ làm dậy lên hương vị sông nước đầy cuốn hút.',
   'Nghêu, sả, ớt, rau răm'),

  ('com-tam-suon-bi-cha', 'Cơm tấm sườn bì chả',
   'Đĩa cơm tấm chuẩn vị Nam Bộ với hạt cơm tấm tơi xốp, giữ nguyên độ dẻo thơm tự nhiên. Linh hồn của món ăn nằm ở miếng sườn mộc được tẩm ướp theo công thức gia truyền, nướng trực tiếp trên than hoa cháy đỏ cho đến khi chín đều, tỏa hương thơm khói đặc trưng và lên màu cánh gián hấp dẫn. Đi kèm là sợi bì dai giòn trộn thính gạo thơm phức, ổ chả trứng hấp mềm mại béo ngậy, rưới thêm lớp mỡ hành xanh mướt và chén nước mắm chua ngọt mặn nhẹ được pha chế tinh tế.',
   'Gạo tấm, sườn heo, bì, chả trứng, nước mắm'),

  ('banh-xeo-tom-thit', 'Bánh xèo tôm thịt',
   'Bánh xèo được tráng trực tiếp trên những chiếc chảo gang nhỏ bão hòa nhiệt độ, tạo nên phần vỏ bánh mỏng dính, giòn rụm tỏa ra màu vàng tươi đặc trưng từ nghệ tự nhiên. Phần nhân bên trong vô cùng đầy đặn với tôm đất tươi ngọt, thịt ba chỉ béo ngậy cùng giá đỗ thanh mát được làm chín tới bằng hơi nước. Khi ăn, thực khách xé từng miếng bánh nóng hổi, cuộn tròn cùng lá cải xanh, rau thơm các loại và bánh tráng, rồi chấm ngập trong chén nước mắm chua ngọt có điểm xuyết đu đủ tỏi ớt.',
   'Bột gạo, nghệ, tôm, thịt heo, giá đỗ, rau sống'),

  ('bun-rieu-cua', 'Bún riêu cua',
   'Tô bún riêu cua đồng mang đậm nét ẩm thực sông nước miền Nam với phần nước dùng ninh kỹ từ xương kết hợp với cà chua chín mộng, tạo nên vị ngọt thanh tự nhiên và màu sắc đỏ cam bắt mắt. Phần riêu cua được làm hoàn toàn từ cua đồng tươi xay lọc, đóng thành từng tảng to mềm béo ngậy. Món ăn càng thêm phong phú khi kết hợp cùng đậu hũ chiên vàng giòn, huyết heo dai mềm và tôm chua cay nhẹ. Thưởng thức trọn vẹn nhất khi ăn kèm đĩa rau muống chẻ, giá đỗ và một chút mắm tôm nồng nàn.',
   'Cua đồng, cà chua, đậu hũ, bún tươi, tôm chua'),

  ('lau-hai-san-vinh-khanh', 'Lẩu hải sản',
   'Nồi lẩu hải sản hoành tráng là lựa chọn hoàn hảo cho các buổi tụ họp gia đình hoặc nhóm bạn bè trong không khí nhộn nhịp về đêm tại Vĩnh Khánh. Nước lẩu ninh từ xương ống đậm đà hòa quyện cùng vị chua cay sảng khoái kiểu Thái, tỏa hương thơm của sả, riềng và lá chanh. Mâm hải sản nhúng kèm vô cùng phong phú bao gồm tôm tươi nhảy tanh tách, mực lá dày thịt ngọt lịm và nghêu tươi sống. Tất cả được dùng chung với các loại rau nhúng lẩu tươi xanh và bún tươi mềm mại.',
   'Tôm, mực, nghêu, nước lẩu, rau ăn kèm'),

  ('oc-buong-nuong', 'Ốc bươu nướng',
   'Ốc bươu ngâm rửa sạch sẽ, chọn lọc những con to tròn chắc thịt rồi đưa lên bếp than hồng nướng chín tới. Đầu bếp liên tục rưới lên miệng ốc lớp sốt nước mắm tiêu xanh hoặc muối ớt đậm đà, khiến gia vị thấm sâu vào từng dải thịt. Thịt ốc bươu khi chín giữ được độ săn chắc, dai giòn sần sật, ngấm trọn vị mặn cay nồng nàn và mút mát được phần nước ngọt đậm đà bên trong vỏ. Món ăn này là lựa chọn lai rai cực kỳ bắt miệng của giới trẻ trên phố ăn đêm.',
   'Ốc bươu, muối, ớt, lá chanh'),

  ('bun-mam-cho', 'Bún mắm',
   'Món bún mắm mang trọn vẹn hương vị đặc trưng của vùng sông nước miền Tây với phần nước dùng đậm đà, dậy mùi thơm nức từ mắm cá lóc và mắm cá linh ủ kỹ. Tô bún được chăm chút tỉ mỉ với nhiều loại topping phong phú như tôm tươi ngọt thịt, mực giòn sần sật, cá khoai mềm mại và thịt heo quay giòn rụm da. Điểm nhấn không thể thiếu là đĩa rau sống đa dạng ăn kèm gồm rau đắng, bông điền điển, kèo nèo, hoa chuối bào giúp trung hòa hương vị và tạo độ mát lành.',
   'Mắm cá lóc, tôm, mực, cá khoai, bún, rau đắng'),

  ('ca-phe-sua-da-phin', 'Cà phê sữa đá phin',
   'Được pha chế từ những hạt cà phê Robusta rang mộc nguyên chất, chắt lọc chầm chậm qua chiếc phin nhôm truyền thống đúng phong cách thưởng thức cà phê Sài Gòn. Từng giọt cà phê đắng nhẹ, thơm nồng rơi xuống lớp sữa đặc ngọt ngào quánh mịn phía dưới. Khi khuấy đều cùng đá lạnh đập nhỏ, ly cà phê tỏa ra hương vị hòa quyện tuyệt vời giữa vị béo ngậy và đắng thanh, mang lại cảm giác tỉnh táo, sảng khoái để khởi đầu một ngày mới hoặc thư giãn vào buổi chiều.',
   'Cà phê Robusta rang mộc, sữa đặc, đá'),

  ('che-thap-cam', 'Chè thập cẩm',
   'Món tráng miệng giải nhiệt quốc dân thu hút mọi lứa tuổi với sự kết hợp màu sắc và hương vị phong phú trong cùng một chén chè. Thành phần bao gồm đậu xanh đánh mịn, đậu đỏ bùi bùi, khoai dẻo thơm, sương sáo mát lạnh cùng những hạt bột báng dai dẻo. Lớp nước cốt dừa dừa thắng béo ngậy, ngọt dịu được rưới đều lên trên cùng lớp đá bào mịn, mang lại cảm giác mát lạnh, bùi béo và sảng khoái tức thì sau những chuyến tản bộ thưởng thức món mặn.',
   'Đậu xanh, khoai, bột báng, nước cốt dừa, đường'),

  ('banh-canh-cua-bap', 'Bánh canh cua bắp',
   'Tô bánh canh cua bắp nóng hổi chinh phục thực khách bởi phần nước dùng sánh quánh mượt mà, ninh lâu từ xương ống và thịt cua tươi nên mang vị ngọt tự nhiên đậm đà. Sợi bánh canh làm từ bột gạo pha bột năng vừa dai mềm vừa không bị bở. Đi kèm tô bánh canh là gạch cua bắp chắc ngọt, tôm tươi bóc vỏ, chả quế thơm lừng và huyết heo dai mềm. Món ăn sang trọng, giàu dinh dưỡng này là lựa chọn điểm tâm quen thuộc được người dân địa phương vô cùng ưa chuộng.',
   'Cua bắp, bột gạo, bột năng, tôm, chả quế'),

  ('hu-tieu-my-tho', 'Hủ tiếu Mỹ Tho',
   'Hủ tiếu mang chuẩn phong vị gốc Mỹ Tho với sợi hủ tiếu khô dai đặc trưng được làm từ bột gạo thơm miền Tây, nhào trộn chút tôm tươi cho màu hồng nhẹ tự nhiên. Tô hủ tiếu đầy đặn với tôm tươi bóc vỏ, thịt heo xắt mỏng, gan nướng thơm phức và cải ngọt tươi xanh, chan ngập nước dùng trong veo ninh từ xương ống ngọt thanh mà không ngấy mỡ. Thực khách có thể lựa chọn thưởng thức theo kiểu hủ tiếu nước truyền thống hoặc hủ tiếu khô trộn sốt đậm đà.',
   'Bột gạo, tôm, thịt heo, gan, cải ngọt')
) AS v(code, name, descr, ingr)
JOIN dishes d ON d.code = v.code
JOIN languages l ON l.code = 'vi'
ON CONFLICT (dish_id, language_id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  ingredients = EXCLUDED.ingredients;