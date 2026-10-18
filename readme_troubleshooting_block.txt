### Troubleshooting

| Hiện tượng | Xử lý |
|---|---|
| `database: "disconnected"` | Docker: đảm bảo `DATABASE_URL` host là `postgres`; host dev: `localhost` + `docker compose up -d postgres` |
| Web không gọi được API khi chạy `vite dev` | Đảm bảo server đang chạy ở :5000; hoặc đặt `VITE_API_URL=http://localhost:5000/api` |
| Điện thoại không tải được dữ liệu | `EXPO_PUBLIC_API_URL` phải là IP LAN, không phải `localhost`; cùng Wi-Fi; mở port firewall |
| QR trỏ sai địa chỉ | Sửa `PUBLIC_BASE_URL` trong `server/.env` rồi **Regenerate QR** |
| Quét QR nhưng điện thoại không mở được | QR đang trỏ `localhost` → mở tab **QR** trong admin, bấm **📍 Dùng trang này** (nếu dashboard mở qua IP LAN) hoặc nhập `http://<LAN-IP>:5173` rồi tạo lại QR. Vẫn không được → firewall máy tính phải cho phép port (Windows: `netsh advfirewall firewall add rule name="D4 web" dir=in action=allow protocol=TCP localport=5173,8080,5000`) |
| Món/địa điểm không có tiếng ở ngôn ngữ khác | Bản dịch chưa có file audio — mở guide ở ngôn ngữ đó (server tự tạo nền), hoặc bấm **🤖 Tạo giọng đọc** cho từng ngôn ngữ / **🤖 Tạo giọng đọc tất cả ngôn ngữ** trong tab *Bản dịch & Thư viện giọng đọc* |
| Ngôn ngữ nào đó đang không có giọng nào cả | Kiểm tra ô *BCP-47 locale* (VD `th-TH`) và ô *Ghi chú voice / TTS*; nếu dùng Edge TTS mà subprocess edge-tts trong runtime thất bại thì server tự chuyển sang giọng miễn phí — xem log server ch bất kỳ sự kiện `[audio]` logs để biết lỗi cụ thể |
| Upload ảnh/audio lỗi | Kiểm tra loại file (jpg/png/webp/gif; mp3/wav/m4a/aac) và dung lượng ≤ 10MB/25MB |
| Không thể xoá ngôn ngữ trong admin | Nếu ngôn ngữ có bản dịch/dish/route thì bị chặn (thông báo 409). Ngôn ngữ mới chưa có bản dịch thì xoá được — nếu vẫn thấy lỗi, log ra bảng nào đang giữ khoá ngoại và ép `language_id = NULL` ở các bảng log (scan_logs, audio_play_logs, visitor_history) |