-- 008: Demo accounts, culinary routes (names live in translations)
-- pgcrypto provides bcrypt-compatible password hashes usable by bcryptjs
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- DEVELOPMENT-ONLY demo accounts (see README)
INSERT INTO users (email, password_hash, full_name, role)
VALUES ('admin@district4.local', crypt('Admin@123456', gen_salt('bf', 10)), 'System Administrator', 'ADMIN')
ON CONFLICT (email) DO NOTHING;

INSERT INTO users (email, password_hash, full_name, role)
VALUES ('staff@district4.local', crypt('Staff@123456', gen_salt('bf', 10)), 'Content Staff', 'STAFF')
ON CONFLICT (email) DO NOTHING;

-- Culinary routes
INSERT INTO culinary_routes (code, estimated_duration, distance, difficulty, status) VALUES
  ('tour-toi-quan-4', '3–4 giờ', '≈ 2,5 km', 'EASY', 'PUBLISHED'),
  ('buoi-sang-kieu-saigon', '2–3 giờ', '≈ 2 km', 'EASY', 'PUBLISHED'),
  ('vinh-khanh-dong-chay-dem', '3 giờ', '≈ 1,8 km', 'EASY', 'PUBLISHED')
ON CONFLICT (code) DO NOTHING;

-- Vietnamese route content moved from the old culinary_routes columns
INSERT INTO translations (entity_type, entity_id, language_id, name, description)
SELECT 'route', r.id, l.id, v.name, v.descr
FROM (VALUES
  ('tour-toi-quan-4', 'Tour Ẩm Thực Tối Quận 4', 'Lộ trình trải nghiệm Quận 4 về đêm: bắt đầu với món ăn vặt đường phố, tiếp tục với hải sản, tráng miệng ngọt ngào và khép lại trên phố ăn đêm sầm uất.'),
  ('buoi-sang-kieu-saigon', 'Bữa Sáng Kiểu Sài Gòn', 'Khám phá các quán ăn sáng địa phương: bánh canh cua, bún riêu, hủ tiếu, chợ truyền thống và ly cà phê sữa đá ven sông.'),
  ('vinh-khanh-dong-chay-dem', 'Vĩnh Khánh — Dòng Chảy Đêm', 'Dạo dọc tuyến phố Vĩnh Khánh từ cơm tấm buổi chiều đến phố ẩm thực đêm nhộn nhịp, với ốc và chè chặng cuối.')
) AS v(code, name, descr)
JOIN culinary_routes r ON r.code = v.code
JOIN languages l ON l.code = 'vi'
ON CONFLICT (entity_type, entity_id, language_id) DO NOTHING;

INSERT INTO route_stops (route_id, culinary_place_id, position, note)
SELECT r.id, p.id, v.pos, v.note
FROM (VALUES
  ('tour-toi-quan-4', 'banh-xeo-hoa-gia',      1, 'Bắt đầu với bánh xèo giòn rụm'),
  ('tour-toi-quan-4', 'oc-oanh',               2, 'Hải sản và ốc cho phần chính'),
  ('tour-toi-quan-4', 'che-heo-quay',          3, 'Tráng miệng ngọt mát'),
  ('tour-toi-quan-4', 'pho-an-vinh-khanh',     4, 'Kết thúc trên phố ăn đêm'),
  ('buoi-sang-kieu-saigon', 'banh-canh-cua-nguyen-khoai', 1, 'Bánh canh cua nóng hổi'),
  ('buoi-sang-kieu-saigon', 'bun-rieu-ben-van-don',       2, 'Bún riêu cua đồng'),
  ('buoi-sang-kieu-saigon', 'hutieu-ca-men',              3, 'Hủ tiếu Mỹ Tho thanh nhẹ'),
  ('buoi-sang-kieu-saigon', 'cho-quan-4',                 4, 'Dạo chợ và thử trái cây'),
  ('buoi-sang-kieu-saigon', 'cafe-ben-van-don',           5, 'Kết thúc với cà phê ven sông'),
  ('vinh-khanh-dong-chay-dem', 'com-tam-vinh-khanh',   1, 'Cơm tấm buổi chiều muộn'),
  ('vinh-khanh-dong-chay-dem', 'pho-an-vinh-khanh',    2, 'Phố ăn đêm sôi động'),
  ('vinh-khanh-dong-chay-dem', 'oc-oanh',              3, 'Ốc và hải sản'),
  ('vinh-khanh-dong-chay-dem', 'che-heo-quay',         4, 'Chè ngọt kết thúc hành trình')
) AS v(route, place, pos, note)
JOIN culinary_routes r ON r.code = v.route
JOIN culinary_places p ON p.code = v.place
ON CONFLICT (route_id, position) DO NOTHING;


