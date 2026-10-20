# Phase 01 — Setup nền tảng dự án

## Mục tiêu

Tạo nền FE–BE–DB có thể chạy, test và build từ máy mới trước khi làm nghiệp vụ.

## Step 1 — Chuẩn hóa workspace và môi trường local

- [ ] Giữ một frontend React và một backend theo ADR Phase 00; loại bỏ skeleton công nghệ không được chọn bằng thay đổi có review.
- [ ] Tạo `.env.example`, cấu hình development/test, PostgreSQL local và seed tối thiểu không chứa secret.
- [ ] Chuẩn hóa lệnh `dev`, `build`, `lint`, `test`, migration và seed trong README.

**Chấp nhận:** Người mới clone repo có thể khởi động FE, BE, DB theo một hướng dẫn duy nhất.

**Kiểm chứng:** Chạy toàn bộ lệnh từ môi trường sạch; health API trả thành công và FE gọi được health API.

**File dự kiến:** `README.md`, `docker-compose.yaml`, `.env.example`, `app/frontend/*`, `app/backend/*` hoặc backend mới theo ADR.

**Phạm vi:** M.

## Step 2 — Dựng khung backend và database

- [ ] Tách cấu hình, dependency injection, error response, request ID và health check.
- [ ] Tạo migration nền cho định danh, timestamp và các bảng nền thật sự cần ở Phase 02.
- [ ] Thêm test project, database test cô lập và cơ chế reset dữ liệu giữa test.

**Chấp nhận:** Migration lên/xuống được ở DB test; lỗi API có format thống nhất; không log connection string.

**Kiểm chứng:** Backend build/test; test health và kết nối PostgreSQL pass.

**Phụ thuộc:** Step 1.

**Phạm vi:** M.

## Step 3 — Dựng khung frontend

- [ ] Tạo app shell, routing, layout đăng nhập/nội bộ và trang lỗi cơ bản.
- [ ] Tạo API client dùng base URL từ môi trường, xử lý lỗi thống nhất và request ID.
- [ ] Thiết lập test component, test unit và test E2E khói.

**Chấp nhận:** FE hiển thị trạng thái backend; loading/error/empty có cách thể hiện thống nhất và dùng được bằng bàn phím.

**Kiểm chứng:** `bun run lint`, `bun run build`, test frontend và E2E health pass.

**Phụ thuộc:** Step 1–2.

**Phạm vi:** M.

## Step 4 — Thiết lập cổng chất lượng

- [ ] CI chạy restore/install, migration check, lint, build và test FE/BE.
- [ ] Thêm kiểm tra secret và quy ước tên test theo feature ID.
- [ ] Ghi cách xử lý test lỗi; không cho phép bỏ test để merge.

**Chấp nhận:** Một pull request lỗi build/test bị chặn; log CI không lộ secret.

**Kiểm chứng:** Tạo lỗi thử có kiểm soát, xác nhận CI fail, sau đó hoàn nguyên lỗi thử.

## Checkpoint Phase 01

- [ ] FE, BE và PostgreSQL chạy cùng nhau.
- [ ] Test/lint/build pass trên máy local và CI.
- [ ] Cấu trúc đã đủ ổn định để làm lát cắt auth đầu tiên.

