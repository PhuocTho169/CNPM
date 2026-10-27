-- ============================================================
-- HỎI ĐÁP SQL — dùng với DB: docker exec -it d4-postgres psql -U district4_user -d district4_food
-- ============================================================

-- ------------------------------------------------------------
-- CÂU 1: In ra đúng thiết bị đang "chạy" (có scan)
-- ------------------------------------------------------------
-- a) Các lượt quét mới nhất — dòng đầu tiên trong kết quả là thiết bị
--    vừa scan (để test: quét QR bằng điện thoại rồi chạy lại query này)
--    device_type ghi chuẩn từ server: mobile / tablet / desktop
SELECT device_type, platform, culinary_place_id, session_id, created_at
FROM activity_logs
WHERE event_type = 'scan'
ORDER BY created_at DESC
LIMIT 10;

-- b) Tổng hợp lượt quét theo thiết bị trong 7 ngày qua
SELECT COALESCE(device_type, 'khác') AS thiet_bi,
       count(*) AS luot_quet
FROM activity_logs
WHERE event_type = 'scan'
  AND created_at > now() - interval '7 days'
GROUP BY device_type
ORDER BY luot_quet DESC;

-- ------------------------------------------------------------
-- CÂU 2: Nếu quét QR thành công  -> 'hello hello'
--        Nếu quét QR thất bại    -> 'hello'
-- ------------------------------------------------------------
-- "Thất bại" theo dữ liệu thật trong DB:
--   - công ty place PUBLISHED nhưng chưa từng có QR nào, hoặc
--   - QR "nướng" sẵn URL localhost/127.0.0.1 (điện thoại quét xong
--     mở localhost = chính nó -> chết, không bao giờ mở được trang)
-- "Thành công": QR encode URL thật (domain ngrok / IP LAN) mà điện thoại mở được.
SELECT p.id,
       p.code,
       COALESCE(qr.metadata->>'qr_value', '(chưa có QR)') AS qr_value,
       CASE
         WHEN qr.id IS NULL                                    THEN 'hello'
         WHEN qr.metadata->>'qr_value' LIKE '%localhost%'      THEN 'hello'
         WHEN qr.metadata->>'qr_value' LIKE '%127.0.0.1%'      THEN 'hello'
         ELSE 'hello hello'
       END AS ket_qua_quet
FROM culinary_places p
LEFT JOIN media_files qr
  ON qr.entity_type = 'place'
 AND qr.entity_id   = p.id
 AND qr.kind        = 'qr'
WHERE p.status = 'PUBLISHED'
ORDER BY p.id;

-- Biến thể (nếu giảng viên định nghĩa "thành công" = CÓ khách thật sự
-- đã quét, tức là có ít nhất 1 dòng scan trong activity_logs):
-- SELECT p.id,
--        p.code,
--        CASE
--          WHEN EXISTS (SELECT 1 FROM activity_logs a
--                       WHERE a.event_type = 'scan'
--                         AND a.culinary_place_id = p.id) THEN 'hello hello'
--          ELSE 'hello'
--        END AS ket_qua_quet
-- FROM culinary_places p
-- WHERE p.status = 'PUBLISHED'
-- ORDER BY p.id;
