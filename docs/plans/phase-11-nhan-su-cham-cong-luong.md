# Phase 11 — Nhân sự, chấm công và lương theo ca

## Mục tiêu

Ghi nhận từng ca/lần làm, sửa có phê duyệt và trả lương gắn đúng ca; không mở rộng thành lịch làm hoặc bảng lương theo kỳ.

## Step P11-S01 — Lập bản ghi ca

**Mô tả ngắn:** BE dùng hồ sơ nhân viên Phase 02, tạo bản ghi duy nhất theo nhân viên/ngày/thứ tự ca.

**Tham chiếu:** Feature/OQ `EMP-001`, `SHIFT-001`; Rule `BR-HR-001`, `BR-ATT-001`–`BR-ATT-003`, `BR-PAYROLL-001`–`BR-PAYROLL-003`; Workflow `WF-09`, `WF-10`.

**Công việc:**
- [ ] BE dùng hồ sơ nhân viên Phase 02, tạo bản ghi duy nhất theo nhân viên/ngày/thứ tự ca.
- [ ] FE có danh sách ca cá nhân và màn hình Admin tra cứu.
- [ ] Test nhiều ca cùng ngày và trùng `shift_no`.

**Acceptance:**
- [ ] Không có module lịch tuần/tháng.
- [ ] nhân viên nghỉ việc được đổi trạng thái, không xóa.

**Verification:**
- [ ] Constraint test + E2E tạo ca.
- [ ] Các lệnh áp dụng trong bảng `Lệnh chuẩn` pass.

**Dependencies:** `CP02-B`, `CP06-B`

**Files:** `app/backend/src/{Controllers,Dto,Models,Services,Data}/**`, `app/backend.Tests/**`, `app/frontend/src/**`, `docs/specs/**`

**Quy mô:** M

## Step P11-S02 — Ghi nhận chấm công

**Mô tả ngắn:** BE ghi thời điểm, số phút và trạng thái có mặt/trễ/vắng/thiếu/nghỉ theo policy.

**Tham chiếu:** Feature/OQ `ATT-001`; Rule `BR-HR-001`, `BR-ATT-001`–`BR-ATT-003`, `BR-PAYROLL-001`–`BR-PAYROLL-003`; Workflow `WF-09`, `WF-10`.

**Công việc:**
- [ ] BE ghi thời điểm, số phút và trạng thái có mặt/trễ/vắng/thiếu/nghỉ theo policy.
- [ ] FE cho nhân viên thao tác ca của mình và hiển thị lỗi rõ khi sai thứ tự.
- [ ] Test check-out trước check-in, thao tác lặp và ca qua ngày theo quyết định Phase 00.

**Acceptance:**
- [ ] Thiếu một đầu được đánh dấu thiếu chấm công, không tự suy đoán giờ.

**Verification:**
- [ ] Unit time test + E2E WF-09.
- [ ] Các lệnh áp dụng trong bảng `Lệnh chuẩn` pass.

**Dependencies:** `P11-S01`

**Files:** `app/backend/src/{Controllers,Dto,Models,Services,Data}/**`, `app/backend.Tests/**`, `app/frontend/src/**`, `docs/specs/**`

**Quy mô:** M

## Checkpoint CP11-A — Sau P11-S02

- [ ] Backend test pass bằng lệnh chuẩn.
- [ ] Frontend test/lint/build pass bằng lệnh chuẩn.
- [ ] Lát cắt hiện tại chạy end-to-end.
- [ ] Evidence được gắn trong `todo.md`.
- [ ] Người phụ trách kỹ thuật review.
- [ ] Người phụ trách sản phẩm review nếu hành vi nghiệp vụ thay đổi.


## Step P11-S03 — Duyệt điều chỉnh công

**Mô tả ngắn:** BE tạo yêu cầu có lý do và snapshot trước/sau; Admin duyệt mới áp dụng.

**Tham chiếu:** Feature/OQ `ATT-002`; Rule `BR-HR-001`, `BR-ATT-001`–`BR-ATT-003`, `BR-PAYROLL-001`–`BR-PAYROLL-003`; Workflow `WF-09`, `WF-10`.

**Công việc:**
- [ ] BE tạo yêu cầu có lý do và snapshot trước/sau; Admin duyệt mới áp dụng.
- [ ] FE có luồng yêu cầu và hàng chờ duyệt.
- [ ] Test tự duyệt, sửa sau duyệt và audit.

**Acceptance:**
- [ ] Mọi sửa thủ công truy được người yêu cầu/người duyệt/lý do.

**Verification:**
- [ ] RBAC + audit integration test.
- [ ] Các lệnh áp dụng trong bảng `Lệnh chuẩn` pass.

**Dependencies:** `P11-S02`

**Files:** `app/backend/src/{Controllers,Dto,Models,Services,Data}/**`, `app/backend.Tests/**`, `app/frontend/src/**`, `docs/specs/**`

**Quy mô:** M

## Step P11-S04 — Thanh toán lương ca

**Mô tả ngắn:** BE lưu lương thực nhận theo ca, duyệt điều chỉnh và tạo payment chi đúng một ca.

**Tham chiếu:** Feature/OQ `PAYROLL-001`–`PAYROLL-003`; Rule `BR-HR-001`, `BR-ATT-001`–`BR-ATT-003`, `BR-PAYROLL-001`–`BR-PAYROLL-003`; Workflow `WF-09`, `WF-10`.

**Công việc:**
- [ ] BE lưu lương thực nhận theo ca, duyệt điều chỉnh và tạo payment chi đúng một ca.
- [ ] FE cho nhân viên xem lương bản thân; Admin ghi/duyệt/trả lương.
- [ ] Test quyền xem, trả trùng, tiền mặt không có ca két và chuyển khoản ngoài hệ thống.

**Acceptance:**
- [ ] Một khoản chi lương truy đúng WorkRecord.
- [ ] không có bảng lương theo kỳ.

**Verification:**
- [ ] Integration + E2E WF-10.
- [ ] Các lệnh áp dụng trong bảng `Lệnh chuẩn` pass.

**Dependencies:** `P11-S03`

**Files:** `app/backend/src/{Controllers,Dto,Models,Services,Data}/**`, `app/backend.Tests/**`, `app/frontend/src/**`, `docs/specs/**`

**Quy mô:** M

## Checkpoint CP11-B — Hoàn tất phase

- [ ] Backend test pass bằng lệnh chuẩn.
- [ ] Frontend test/lint/build pass bằng lệnh chuẩn.
- [ ] Lát cắt hiện tại chạy end-to-end.
- [ ] Evidence được gắn trong `todo.md`.
- [ ] Người phụ trách kỹ thuật review.
- [ ] Người phụ trách sản phẩm review nếu hành vi nghiệp vụ thay đổi.
