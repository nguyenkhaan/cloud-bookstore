# Phase 01 — Setup nền tảng dự án

## Mục tiêu

Tạo nền FE–BE–DB có thể chạy, test và build từ máy mới trước khi làm nghiệp vụ.

## Step P01-S01 — Chuẩn hóa môi trường local

**Mô tả ngắn:** Giữ một frontend React và một backend theo ADR Phase 00; loại bỏ skeleton công nghệ không được chọn bằng thay đổi có review.

**Tham chiếu:** Feature/OQ Không; Rule `NFR-SEC`, `NFR-DATA`, `NFR-MAINT`; Workflow Health smoke flow.

**Công việc:**
- [ ] Giữ một frontend React và một backend theo ADR Phase 00; loại bỏ skeleton công nghệ không được chọn bằng thay đổi có review.
- [ ] Tạo `.env.example`, cấu hình development/test, PostgreSQL local và seed tối thiểu không chứa secret.
- [ ] Chuẩn hóa lệnh `dev`, `build`, `lint`, `test`, migration và seed trong README.

**Acceptance:**
- [ ] Người mới clone repo có thể khởi động FE, BE, DB theo một hướng dẫn duy nhất.

**Verification:**
- [ ] Chạy toàn bộ lệnh từ môi trường sạch; health API trả thành công và FE gọi được health API.
- [ ] Các lệnh áp dụng trong bảng `Lệnh chuẩn` pass.

**Dependencies:** `CP00-B`

**Files:** `README.md`, `docker-compose.yaml`, `.env.example`, `app/frontend/*`, `app/backend/*` hoặc backend mới theo ADR.

**Quy mô:** M

## Step P01-S02 — Dựng nền backend

**Mô tả ngắn:** Tách cấu hình, dependency injection, error response, request ID và health check.

**Tham chiếu:** Feature/OQ `CONFIG-001`–`CONFIG-003`; Rule `BR-CONFIG-001`–`BR-CONFIG-002`, `NFR-SEC`, `NFR-DATA`, `NFR-MAINT`; Workflow Health smoke flow.

**Công việc:**
- [ ] Tách cấu hình, dependency injection, error response, request ID và health check.
- [ ] Tạo migration nền cho định danh, timestamp và các bảng nền thật sự cần ở Phase 02.
- [ ] Thêm test project, database test cô lập và cơ chế reset dữ liệu giữa test.
- [ ] Tạo nền đọc/seed cấu hình có phiên bản để các phase nghiệp vụ không phụ thuộc ngược vào Phase 13.

**Acceptance:**
- [ ] Migration lên/xuống được ở DB test.
- [ ] Lỗi API có format thống nhất.
- [ ] Không log connection string.
- [ ] Cấu hình nghiệp vụ đọc đúng giá trị có hiệu lực mà không viết lại giao dịch lịch sử.

**Verification:**
- [ ] Backend build/test; test health và kết nối PostgreSQL pass.
- [ ] Các lệnh áp dụng trong bảng `Lệnh chuẩn` pass.

**Dependencies:** `P01-S01`

**Files:** `README.md`, `.env.example`, `app/backend/**`, `app/backend.Tests/**`, `app/frontend/**`, `.github/workflows/**`

**Quy mô:** M

## Checkpoint CP01-A — Sau P01-S02

- [ ] Backend test pass bằng lệnh chuẩn.
- [ ] Frontend test/lint/build pass bằng lệnh chuẩn.
- [ ] Lát cắt hiện tại chạy end-to-end.
- [ ] Evidence được gắn trong `todo.md`.
- [ ] Người phụ trách kỹ thuật review.
- [ ] Người phụ trách sản phẩm review nếu hành vi nghiệp vụ thay đổi.


## Step P01-S03 — Dựng nền frontend

**Mô tả ngắn:** Tạo app shell, routing, layout đăng nhập/nội bộ và trang lỗi cơ bản.

**Tham chiếu:** Feature/OQ Không; Rule `NFR-SEC`, `NFR-DATA`, `NFR-MAINT`; Workflow Health smoke flow.

**Công việc:**
- [ ] Tạo app shell, routing, layout đăng nhập/nội bộ và trang lỗi cơ bản.
- [ ] Tạo API client dùng base URL từ môi trường, xử lý lỗi thống nhất và request ID.
- [ ] Thiết lập test component, test unit và test E2E khói.

**Acceptance:**
- [ ] FE hiển thị trạng thái backend.
- [ ] loading/error/empty có cách thể hiện thống nhất và dùng được bằng bàn phím.

**Verification:**
- [ ] `bun run lint`, `bun run build`, test frontend và E2E health pass.
- [ ] Các lệnh áp dụng trong bảng `Lệnh chuẩn` pass.

**Dependencies:** `P01-S01`, `P01-S02`

**Files:** `README.md`, `.env.example`, `app/backend/**`, `app/backend.Tests/**`, `app/frontend/**`, `.github/workflows/**`

**Quy mô:** M

## Step P01-S04 — Thiết lập cổng chất lượng

**Mô tả ngắn:** CI chạy restore/install, migration check, lint, build và test FE/BE.

**Tham chiếu:** Feature/OQ Không; Rule `NFR-SEC`, `NFR-DATA`, `NFR-MAINT`; Workflow Health smoke flow.

**Công việc:**
- [ ] CI chạy restore/install, migration check, lint, build và test FE/BE.
- [ ] Thêm kiểm tra secret và quy ước tên test theo feature ID.
- [ ] Ghi cách xử lý test lỗi; không cho phép bỏ test để merge.

**Acceptance:**
- [ ] Một pull request lỗi build/test bị chặn.
- [ ] log CI không lộ secret.

**Verification:**
- [ ] Tạo lỗi thử có kiểm soát, xác nhận CI fail, sau đó hoàn nguyên lỗi thử.
- [ ] Các lệnh áp dụng trong bảng `Lệnh chuẩn` pass.

**Dependencies:** `P01-S03`

**Files:** `README.md`, `.env.example`, `app/backend/**`, `app/backend.Tests/**`, `app/frontend/**`, `.github/workflows/**`

**Quy mô:** M

## Checkpoint CP01-B — Hoàn tất phase

- [ ] Backend test pass bằng lệnh chuẩn.
- [ ] Frontend test/lint/build pass bằng lệnh chuẩn.
- [ ] Lát cắt hiện tại chạy end-to-end.
- [ ] Evidence được gắn trong `todo.md`.
- [ ] Người phụ trách kỹ thuật review.
- [ ] Người phụ trách sản phẩm review nếu hành vi nghiệp vụ thay đổi.
