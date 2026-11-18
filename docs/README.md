# Tài liệu dự án — District 4 Culinary Guide

> Trạng thái: **đã xác minh từ mã nguồn** (migrations, routes, services, Dockerfile, compose).
> Nguồn chính: `server/src/routes/index.js`, `server/src/routes/guest.js`,
> `database/migrations/*.sql`, `apps/web/src/App.jsx`, `apps/mobile/App.js`,
> `docker-compose.yml`, `docker-compose.dev.yml`, `server/Dockerfile`, `apps/web/Dockerfile`.
> Cập nhật lần cuối: 2026-11-18.

Đây là bộ tài liệu kỹ thuật cho hệ thống **Multilingual Culinary Tourism & Audio Guide
System for District 4, Ho Chi Minh City** (`district4-culinary-guide`). Tài liệu được
tổng hợp bằng cách đọc trực tiếp mã nguồn, không dựa vào mô tả bên ngoài. Những điểm
chưa kiểm chứng được đánh dấu rõ là **giả định** hoặc **chưa xác minh**.

## Mục lục

| Tài liệu | Nội dung |
|---|---|
| [requirements/functional-requirements.md](requirements/functional-requirements.md) | Yêu cầu chức năng theo miền, quy tắc nghiệp vụ (BR), yêu cầu phi chức năng |
| [use-cases/use-case-specifications.md](use-cases/use-case-specifications.md) | Đặc tả 19 use case của khách, quản trị viên và nhân viên |
| [use-cases/use-case-diagram.puml](use-cases/use-case-diagram.puml) | Biểu đồ Use Case — trải nghiệm khách (PlantUML) |
| [use-cases/use-case-diagram-admin.puml](use-cases/use-case-diagram-admin.puml) | Biểu đồ Use Case — CMS quản trị (PlantUML) |
| [database/database-design.md](database/database-design.md) | Thiết kế CSDL, khoá, ràng buộc, chỉ mục, dữ liệu seed |
| [database/erd.mmd](database/erd.mmd) | ERD miền nội dung (Mermaid) |
| [database/erd-guest-analytics.mmd](database/erd-guest-analytics.mmd) | ERD miền khách/thanh toán/thống kê (Mermaid) |
| [architecture/architecture-overview.md](architecture/architecture-overview.md) | Kiến trúc tổng quan, thành phần, luồng chính, quyết định |
| [architecture/component-diagram.puml](architecture/component-diagram.puml) | Biểu đồ thành phần (PlantUML) |
| [architecture/deployment-diagram.puml](architecture/deployment-diagram.puml) | Biểu đồ triển khai Docker (PlantUML) |
| [api/api-documentation.md](api/api-documentation.md) | Danh mục endpoint, xác thực, định dạng lỗi |
| [diagrams/sequence-diagrams.md](diagrams/sequence-diagrams.md) | Sequence: quét QR, paywall ngôn ngữ, GPS zone, đăng nhập admin |

## Dự án trong một trang

| Thành phần | Công nghệ | Thư mục | Cổng (Docker) |
|---|---|---|---|
| Website công khai + Admin | React 18, Vite 5, React Router 6, Leaflet | `apps/web` | `8080` (nginx), dev `5173` |
| Ứng dụng di động | Expo SDK 51, React Native 0.74, React Navigation 6 | `apps/mobile` | Chạy trên thiết bị / Expo |
| REST API | Node.js 22, Express 4, PostgreSQL (`pg`) | `server` | `5001` → `5000` trong container |
| Cơ sở dữ liệu | PostgreSQL 16 | `database` | `5433` → `5432` trong container |
| Lưu trữ tệp | Thư mục `server/uploads` (ảnh, audio, QR) | `server/uploads` | Phục vụ qua `/uploads` |

Luồng sản phẩm chính:

1. Khách quét mã QR tại quán → mở `/place/:id` (web) hoặc `PlaceDetail` (mobile).
2. Khách chọn tối đa **2 ngôn ngữ miễn phí**; từ ngôn ngữ thứ 3 phải thanh toán
   **20.000₫ một lần** để mở toàn bộ ngôn ngữ (sandbox VNPay-QR).
3. Khách nghe thuyết minh do server sinh bằng TTS (Google Translate miễn phí mặc định,
   có thể cấu hình Google/ElevenLabs/Edge) và xem món ăn, bản đồ, lộ trình.
4. Ứng dụng mobile tự phát thuyết minh khi khách đi vào vùng GPS của địa điểm.
5. Quản trị viên/nhân viên quản lý nội dung, bản dịch, media, QR, ngôn ngữ, người dùng
   và theo dõi thống kê tại `/admin`.

## Chạy nhanh (đã có trong package.json)

```bash
# 1) Cài phụ thuộc
pnpm install

# 2) Chạy PostgreSQL (Docker) rồi migrate + seed
docker compose up -d postgres
pnpm db:migrate
pnpm db:seed

# 3) Chạy API + web
pnpm dev            # server :5000, web :5173
pnpm dev:mobile     # Expo
```

Hoặc chạy toàn bộ bằng Docker:

```bash
docker compose up --build
# Web: http://localhost:8080
# API: http://localhost:5001/api/health
```

Biến môi trường mẫu nằm trong `.env.example` (không chép giá trị bí mật vào tài liệu).
Tài khoản demo **chỉ dùng khi phát triển**: `admin@district4.local` / `staff@district4.local`
(mật khẩu seed trong `database/seeds/008_users_routes.sql`).

## Làm rõ về `AdminRoutes.jsx`

`apps/web/src/admin/AdminRoutes.jsx` **không phải** nơi khai báo route. Đây là trang quản
trị **"Culinary Routes"** — CRUD lộ trình ẩm thực (tour) và các điểm dừng, gọi các endpoint
`/api/routes`, `/api/routes/:id/stops`.

Router thật của web được khai báo tại **`apps/web/src/App.jsx`**, dùng `<Routes>` /
`<Route>` của `react-router-dom`:

- `/pay/:txid` → `CheckoutResult`
- `/admin/login` → `AdminLogin`
- `/admin` → `AdminLayout` (bảo vệ bằng JWT), các route con: index `Dashboard`,
  `places`, `places/:id`, `dishes`, `categories`, `routes`, `languages`, `users`,
  `settings`
- Layout công khai `PublicLayout`: `/`, `/explore`, `/place/:id`, `/dish/:id`,
  `/routes`, `/map`, `/about`, `*`

(Xem chi tiết tại [architecture/architecture-overview.md](architecture/architecture-overview.md).)

## Quy ước tài liệu

- **Đã xác minh**: có file/định danh cụ thể trong repo.
- **Giả định**: suy luận hợp lý nhưng chưa có bằng chứng; ghi rõ cách xác nhận.
- **Chưa xác minh**: cần người dùng hoặc môi trường chạy thực tế để trả lời.
- Không đưa giá trị bí mật (mật khẩu, JWT secret, API key) vào tài liệu.
