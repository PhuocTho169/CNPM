# District 4 Culinary Guide

Hệ thống du lịch ẩm thực đa ngôn ngữ và thuyết minh âm thanh cho Quận 4, TP. Hồ Chí Minh.

- **Web công khai + Admin:** React 18 + Vite (`apps/web`)
- **Ứng dụng di động:** Expo / React Native (`apps/mobile`)
- **REST API:** Node.js + Express (`server`)
- **CSDL:** PostgreSQL 16 (`database/migrations`, `database/seeds`)
- **Hạ tầng:** Docker Compose (PostgreSQL, API, nginx phục vụ web)

## Yêu cầu

- Node.js >= 20 (Docker dùng Node 22)
- pnpm 11.7.0 (khai báo trong `packageManager` của `package.json`)
- Docker Desktop (khuyến nghị cho PostgreSQL)

## Chạy khi phát triển

```bash
pnpm install

# PostgreSQL
docker compose up -d postgres

# Tạo schema + dữ liệu mẫu
pnpm db:migrate
pnpm db:seed

# API (http://localhost:5000) + web (http://localhost:5173)
pnpm dev
```

Mobile:

```bash
pnpm dev:mobile
# hoặc: pnpm --filter mobile start
```

Ứng dụng mobile cần `EXPO_PUBLIC_API_URL` trỏ tới IP LAN của máy tính
(ví dụ `http://192.168.1.100:5000/api`), không dùng `localhost` khi chạy trên điện thoại thật.

## Chạy bằng Docker

```bash
docker compose up --build
```

| Dịch vụ | Địa chỉ |
|---|---|
| Web (nginx) | http://localhost:8080 |
| API | http://localhost:5001/api/health |
| PostgreSQL | localhost:5433 |

Chạy kèm hot reload:

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml up
# API dev: http://localhost:5002/api/health
# Web dev (Vite): http://localhost:5173
```

## Biến môi trường

Sao chép `.env.example` thành `server/.env` (và `apps/web/.env`, `apps/mobile/.env` khi cần).
Các biến chính: `DATABASE_URL`, `JWT_SECRET`, `PUBLIC_BASE_URL`, `FRONTEND_URL`,
`TTS_PROVIDER`, `TTS_API_KEY`, `VITE_API_URL`, `EXPO_PUBLIC_API_URL`.

> Không commit giá trị bí mật thật. Đổi `JWT_SECRET` trước khi triển khai thật.

## Kiểm tra

```bash
pnpm check:server     # syntax check server
pnpm check:imports    # import graph
pnpm check:api        # đối chiếu endpoint frontend gọi với route backend
pnpm check:web        # test geo + i18n của web
pnpm check:mobile     # syntax + test zone detection / api throttling
pnpm check:all
```

## Tài khoản demo (chỉ phát triển)

Dữ liệu seed tạo sẵn:

- `admin@district4.local` — vai trò `ADMIN`
- `staff@district4.local` — vai trò `STAFF`

Mật khẩu nằm trong `database/seeds/008_users_routes.sql`. Xoá các tài khoản này khi
triển khai production.

## Tài liệu

Toàn bộ tài liệu kiến trúc, yêu cầu, use case, CSDL, API và biểu đồ nằm trong
[`docs/README.md`](docs/README.md).
