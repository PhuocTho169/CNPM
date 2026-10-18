-- 010: Route translations (vi/zh/ko/ja)
INSERT INTO route_translations (route_id, language_id, name, description)
SELECT r.id, l.id, v.name, v.descr
FROM (VALUES
  ('tour-toi-quan-4', 'Tour Ẩm Thực Tối Quận 4',
   'Lộ trình trải nghiệm Quận 4 về đêm: bắt đầu với món ăn vặt đường phố, tiếp tục với hải sản, tráng miệng ngọt ngào và khép lại trên phố ăn đêm sầm uất.'),
  ('buoi-sang-kieu-saigon', 'Bữa Sáng Kiểu Sài Gòn',
   'Khám phá các quán ăn sáng địa phương: bánh canh cua, bún riêu, hủ tiếu, chợ truyền thống và ly cà phê sữa đá ven sông.'),
  ('vinh-khanh-dong-chay-dem', 'Vĩnh Khánh — Dòng Chảy Đêm',
   'Dạo dọc tuyến phố Vĩnh Khánh từ cơm tấm buổi chiều đến phố ẩm thực đêm nhộn nhịp, với ốc và chè chặng cuối.')
) AS v(code, name, descr)
JOIN culinary_routes r ON r.code = v.code
JOIN languages l ON l.code = 'vi'
ON CONFLICT (route_id, language_id) DO NOTHING;

INSERT INTO route_translations (route_id, language_id, name, description)
SELECT r.id, l.id, v.name, v.descr
FROM (VALUES
  ('tour-toi-quan-4', '第四郡夜游美食路线',
   '体验第四郡夜晚的路线：从街头小吃开始，接着品尝海鲜与甜品，最后在热闹的夜食街结束旅程。'),
  ('buoi-sang-kieu-saigon', '西贡式早餐之旅',
   '探索本地早餐店：蟹肉米线、蟹肉番茄米粉、粿条、传统市场，以及河畔的冰奶咖啡。'),
  ('vinh-khanh-dong-chay-dem', '永庆——夜色流动',
   '沿永庆街漫步，从傍晚的碎米饭到热闹的夜食街，途中品尝螺肉与糖水。')
) AS v(code, name, descr)
JOIN culinary_routes r ON r.code = v.code
JOIN languages l ON l.code = 'zh'
ON CONFLICT (route_id, language_id) DO NOTHING;

INSERT INTO route_translations (route_id, language_id, name, description)
SELECT r.id, l.id, v.name, v.descr
FROM (VALUES
  ('tour-toi-quan-4', '4군 밤 미식 투어',
   '4군의 밤을 경험하는 코스: 길거리 간식으로 시작해 해산물과 디저트를 즐기고, 활기찬 야식 거리로 마무리합니다.'),
  ('buoi-sang-kieu-saigon', '사이공식 아침 식사 투어',
   '현지 아침 식사 가게를 탐방합니다: 게 반칸, 분리에우, 꾸티에우, 전통 시장, 그리고 강변의 연유 커피.'),
  ('vinh-khanh-dong-chay-dem', '빈카인 — 흐르는 밤',
   '빈카인 거리를 따라 늦은 오후 콤딤부터 활기찬 야식 거리까지, 조개 요리와 체로 마무리하는 산책 코스입니다.')
) AS v(code, name, descr)
JOIN culinary_routes r ON r.code = v.code
JOIN languages l ON l.code = 'ko'
ON CONFLICT (route_id, language_id) DO NOTHING;

INSERT INTO route_translations (route_id, language_id, name, description)
SELECT r.id, l.id, v.name, v.descr
FROM (VALUES
  ('tour-toi-quan-4', '4区ナイトグルメツアー',
   '4区の夜を体験するコース：屋台の軽食から始まり、海鮮とデザートを楽しみ、賑やかな夜食街で締めくくります。'),
  ('buoi-sang-kieu-saigon', 'サイゴン式朝食ツアー',
   '地元の朝食店を巡ります：蟹バイン・カン、ブン・リエウ、フーティウ、伝統市場、そして川沿いのミルクコーヒー。'),
  ('vinh-khanh-dong-chay-dem', 'ヴィン・カイン —— 流れる夜',
   'ヴィン・カイン通りを散策。夕方のコータムから賑やかな夜食街まで、貝料理とチェーで終わるコースです。')
) AS v(code, name, descr)
JOIN culinary_routes r ON r.code = v.code
JOIN languages l ON l.code = 'ja'
ON CONFLICT (route_id, language_id) DO NOTHING;
