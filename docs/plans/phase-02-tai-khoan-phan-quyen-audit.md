# Phase 02 — Tài khoản, phân quyền và audit

## Mục tiêu

Nhân sự nội bộ đăng nhập an toàn, chỉ dùng đúng quyền và mọi thao tác nhạy cảm được truy vết.

## Step 1 — Admin gốc và danh sách email

**Feature:** `AUTH-001`, `AUTH-002`, `EMP-001`.

- [ ] BE tạo seed Admin gốc an toàn và API quản lý email/tài khoản; ngăn khóa, xóa hoặc hạ quyền Admin gốc.
- [ ] FE có màn hình danh sách nhân viên, mời email và thay đổi trạng thái theo quyền.
- [ ] Test trùng email, email không phân biệt hoa thường và thao tác vượt quyền.

**Chấp nhận:** Chỉ Admin quản lý tài khoản; dữ liệu nhạy cảm không xuất hiện trong response/log.

**Kiểm chứng:** Integration test API + E2E Admin mời nhân viên.

**Phạm vi:** M.

## Step 2 — Đăng ký, OTP và mật khẩu

**Feature:** `AUTH-003`, một phần `AUTH-004`.

- [ ] BE thực hiện luồng đăng ký theo ADR auth, OTP/token băm, hết hạn và giới hạn thử.
- [ ] FE thực hiện form đăng ký/xác minh với lỗi cụ thể và trạng thái gửi lại.
- [ ] Test email không được phép, OTP sai/hết hạn/dùng lại và mật khẩu yếu.

**Chấp nhận:** Chỉ email đã được Admin cho phép mới kích hoạt tài khoản.

**Kiểm chứng:** Unit + integration + E2E luồng đăng ký.

**Phụ thuộc:** Step 1.

## Step 3 — Đăng nhập và vòng đời phiên

**Feature:** `AUTH-004`, `AUTH-005`.

- [ ] BE hỗ trợ đăng nhập, đăng xuất, đổi/quên mật khẩu, timeout và khóa tài khoản theo ADR.
- [ ] FE có route bảo vệ, khôi phục phiên hợp lệ và đưa về đăng nhập khi phiên hết hạn.
- [ ] Test token/session hết hạn, tài khoản bị khóa và logout không dùng lại phiên cũ.

**Chấp nhận:** Không thể truy cập API bảo vệ sau logout/khóa/hết hạn.

**Kiểm chứng:** Security integration test + E2E đăng nhập/đăng xuất.

## Step 4 — RBAC và audit log

**Feature:** `RBAC-001`–`RBAC-003`, `AUD-001`, `AUD-002`.

- [ ] BE áp chính sách ba vai trò trên API; ghi audit append-only cho tài khoản/quyền.
- [ ] FE ẩn thao tác không phù hợp nhưng vẫn xử lý đúng lỗi 403 từ BE; có màn hình tra cứu audit theo quyền.
- [ ] Test ma trận quyền, thay đổi trước/sau, lý do và correlation ID.

**Chấp nhận:** Gọi trực tiếp API ngoài quyền bị từ chối và không đổi dữ liệu.

**Kiểm chứng:** Test ma trận RBAC + E2E cho từng vai trò.

## Checkpoint Phase 02

- [ ] Ba vai trò đăng nhập và thấy đúng chức năng.
- [ ] Backend là nguồn quyết định quyền cuối cùng.
- [ ] Audit truy được actor, hành động, đối tượng và thời gian.

