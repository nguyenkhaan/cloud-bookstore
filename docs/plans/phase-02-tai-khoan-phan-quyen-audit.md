# Phase 02 — Tài khoản, phân quyền và audit

## Mục tiêu

Nhân sự nội bộ đăng nhập an toàn, chỉ dùng đúng quyền và mọi thao tác nhạy cảm được truy vết.

## Step P02-S01 — Quản trị email nội bộ

**Mô tả ngắn:** BE tạo seed Admin gốc an toàn và API quản lý email/tài khoản; ngăn khóa, xóa hoặc hạ quyền Admin gốc.

**Tham chiếu:** Feature/OQ `AUTH-001`, `AUTH-002`, `EMP-001`; Rule `BR-GEN-007`, `BR-HR-001` và rule auth trong spec đã duyệt; Workflow Auth/RBAC flows.

**Công việc:**
- [ ] BE tạo seed Admin gốc an toàn và API quản lý email/tài khoản; ngăn khóa, xóa hoặc hạ quyền Admin gốc.
- [ ] FE có màn hình danh sách nhân viên, mời email và thay đổi trạng thái theo quyền.
- [ ] Test trùng email, email không phân biệt hoa thường và thao tác vượt quyền.

**Acceptance:**
- [ ] Chỉ Admin quản lý tài khoản.
- [ ] dữ liệu nhạy cảm không xuất hiện trong response/log.

**Verification:**
- [ ] Integration test API + E2E Admin mời nhân viên.
- [ ] Các lệnh áp dụng trong bảng `Lệnh chuẩn` pass.

**Dependencies:** `CP01-B`

**Files:** `app/backend/src/{Controllers,Dto,Models,Services}/**`, `app/backend.Tests/**`, `app/frontend/src/**`, `docs/specs/**`

**Quy mô:** M

## Step P02-S02 — Đăng ký bằng OTP

**Mô tả ngắn:** BE thực hiện luồng đăng ký theo ADR auth, OTP/token băm, hết hạn và giới hạn thử.

**Tham chiếu:** Feature/OQ `AUTH-003`, một phần `AUTH-004`; Rule `BR-GEN-007`, `BR-HR-001` và rule auth trong spec đã duyệt; Workflow Auth/RBAC flows.

**Công việc:**
- [ ] BE thực hiện luồng đăng ký theo ADR auth, OTP/token băm, hết hạn và giới hạn thử.
- [ ] FE thực hiện form đăng ký/xác minh với lỗi cụ thể và trạng thái gửi lại.
- [ ] Test email không được phép, OTP sai/hết hạn/dùng lại và mật khẩu yếu.

**Acceptance:**
- [ ] Chỉ email đã được Admin cho phép mới kích hoạt tài khoản.

**Verification:**
- [ ] Unit + integration + E2E luồng đăng ký.
- [ ] Các lệnh áp dụng trong bảng `Lệnh chuẩn` pass.

**Dependencies:** `P02-S01`

**Files:** `app/backend/src/{Controllers,Dto,Models,Services}/**`, `app/backend.Tests/**`, `app/frontend/src/**`, `docs/specs/**`

**Quy mô:** M

## Checkpoint CP02-A — Sau P02-S02

- [ ] Backend test pass bằng lệnh chuẩn.
- [ ] Frontend test/lint/build pass bằng lệnh chuẩn.
- [ ] Lát cắt hiện tại chạy end-to-end.
- [ ] Evidence được gắn trong `todo.md`.
- [ ] Người phụ trách kỹ thuật review.
- [ ] Người phụ trách sản phẩm review nếu hành vi nghiệp vụ thay đổi.


## Step P02-S03 — Quản lý vòng đời phiên

**Mô tả ngắn:** BE hỗ trợ đăng nhập, đăng xuất, đổi/quên mật khẩu, timeout và khóa tài khoản theo ADR.

**Tham chiếu:** Feature/OQ `AUTH-004`, `AUTH-005`; Rule `BR-GEN-007`, `BR-HR-001` và rule auth trong spec đã duyệt; Workflow Auth/RBAC flows.

**Công việc:**
- [ ] BE hỗ trợ đăng nhập, đăng xuất, đổi/quên mật khẩu, timeout và khóa tài khoản theo ADR.
- [ ] FE có route bảo vệ, khôi phục phiên hợp lệ và đưa về đăng nhập khi phiên hết hạn.
- [ ] Test token/session hết hạn, tài khoản bị khóa và logout không dùng lại phiên cũ.

**Acceptance:**
- [ ] Không thể truy cập API bảo vệ sau logout/khóa/hết hạn.

**Verification:**
- [ ] Security integration test + E2E đăng nhập/đăng xuất.
- [ ] Các lệnh áp dụng trong bảng `Lệnh chuẩn` pass.

**Dependencies:** `P02-S02`

**Files:** `app/backend/src/{Controllers,Dto,Models,Services}/**`, `app/backend.Tests/**`, `app/frontend/src/**`, `docs/specs/**`

**Quy mô:** M

## Step P02-S04 — Thực thi RBAC có audit

**Mô tả ngắn:** BE áp chính sách ba vai trò trên API; ghi audit append-only cho tài khoản/quyền.

**Tham chiếu:** Feature/OQ `RBAC-001`–`RBAC-003`, `AUD-001`, `AUD-002`; Rule `BR-GEN-007`, `BR-HR-001` và rule auth trong spec đã duyệt; Workflow Auth/RBAC flows.

**Công việc:**
- [ ] BE áp chính sách ba vai trò trên API; ghi audit append-only cho tài khoản/quyền.
- [ ] FE ẩn thao tác không phù hợp nhưng vẫn xử lý đúng lỗi 403 từ BE; có màn hình tra cứu audit theo quyền.
- [ ] Test ma trận quyền, thay đổi trước/sau, lý do và correlation ID.

**Acceptance:**
- [ ] Gọi trực tiếp API ngoài quyền bị từ chối và không đổi dữ liệu.

**Verification:**
- [ ] Test ma trận RBAC + E2E cho từng vai trò.
- [ ] Các lệnh áp dụng trong bảng `Lệnh chuẩn` pass.

**Dependencies:** `P02-S03`

**Files:** `app/backend/src/{Controllers,Dto,Models,Services}/**`, `app/backend.Tests/**`, `app/frontend/src/**`, `docs/specs/**`

**Quy mô:** M

## Checkpoint CP02-B — Hoàn tất phase

- [ ] Backend test pass bằng lệnh chuẩn.
- [ ] Frontend test/lint/build pass bằng lệnh chuẩn.
- [ ] Lát cắt hiện tại chạy end-to-end.
- [ ] Evidence được gắn trong `todo.md`.
- [ ] Người phụ trách kỹ thuật review.
- [ ] Người phụ trách sản phẩm review nếu hành vi nghiệp vụ thay đổi.
