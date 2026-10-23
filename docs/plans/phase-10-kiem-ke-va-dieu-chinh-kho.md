# Phase 10 — Kiểm kê và điều chỉnh kho

## Mục tiêu

Kiểm kê theo CopyBarcode mà không gây bán/thuê trùng, xử lý chênh lệch qua phê duyệt và cảnh báo tồn đúng kênh.

## Step P10-S01 — Điều chỉnh tồn thông thường

**Mô tả ngắn:** BE hỗ trợ hỏng, mất, thanh lý, ngừng kinh doanh với state transition và audit.

**Tham chiếu:** Feature/OQ `INV-003`; Rule `BR-INV-002`–`BR-INV-007`, `BR-GEN-005`, `BR-GEN-007`; Workflow `WF-06`.

**Công việc:**
- [ ] BE hỗ trợ hỏng, mất, thanh lý, ngừng kinh doanh với state transition và audit.
- [ ] FE có form chọn lý do, xem tác động và xác nhận thao tác nhạy cảm.
- [ ] Test bản đang giao dịch, trạng thái kết thúc và quyền kho.

**Acceptance:**
- [ ] Không thể xuất/điều chỉnh bản đang bị khóa bởi giao dịch khác.

**Verification:**
- [ ] State transition integration test + E2E.
- [ ] Các lệnh áp dụng trong bảng `Lệnh chuẩn` pass.

**Dependencies:** `CP03-B`, `CP05-A`

**Files:** `app/backend/src/{Controllers,Dto,Models,Services,Data}/**`, `app/backend.Tests/**`, `app/frontend/src/**`, `docs/specs/**`

**Quy mô:** M

## Step P10-S02 — Quét kiểm kê

**Mô tả ngắn:** BE xác định phạm vi, khóa bản, lưu expected/observed và ngăn giao dịch xuất kho.

**Tham chiếu:** Feature/OQ `INV-004`; Rule `BR-INV-002`–`BR-INV-007`, `BR-GEN-005`, `BR-GEN-007`; Workflow `WF-06`.

**Công việc:**
- [ ] BE xác định phạm vi, khóa bản, lưu expected/observed và ngăn giao dịch xuất kho.
- [ ] FE hỗ trợ quét liên tục, đếm tiến độ và báo mã ngoài phạm vi/trùng.
- [ ] Test giao dịch đồng thời trong lúc kiểm kê và khôi phục khóa khi hủy hợp lệ.

**Acceptance:**
- [ ] Bản thuộc phạm vi không bán/thuê được cho tới khi đóng kiểm kê.

**Verification:**
- [ ] Concurrency test + E2E quét kiểm kê.
- [ ] Các lệnh áp dụng trong bảng `Lệnh chuẩn` pass.

**Dependencies:** `P10-S01`

**Files:** `app/backend/src/{Controllers,Dto,Models,Services,Data}/**`, `app/backend.Tests/**`, `app/frontend/src/**`, `docs/specs/**`

**Quy mô:** M

## Checkpoint CP10-A — Sau P10-S02

- [ ] Backend test pass bằng lệnh chuẩn.
- [ ] Frontend test/lint/build pass bằng lệnh chuẩn.
- [ ] Lát cắt hiện tại chạy end-to-end.
- [ ] Evidence được gắn trong `todo.md`.
- [ ] Người phụ trách kỹ thuật review.
- [ ] Người phụ trách sản phẩm review nếu hành vi nghiệp vụ thay đổi.


## Step P10-S03 — Duyệt chênh lệch

**Mô tả ngắn:** BE tạo đề nghị theo từng chênh lệch; chỉ áp dụng sau Admin duyệt.

**Tham chiếu:** Feature/OQ `INV-005`; Rule `BR-INV-002`–`BR-INV-007`, `BR-GEN-005`, `BR-GEN-007`; Workflow `WF-06`.

**Công việc:**
- [ ] BE tạo đề nghị theo từng chênh lệch; chỉ áp dụng sau Admin duyệt.
- [ ] FE cho Quản lý kho giải trình và Admin duyệt/từ chối.
- [ ] Test người đề nghị không tự duyệt, áp dụng lặp và giải phóng khóa.

**Acceptance:**
- [ ] Chênh lệch chưa duyệt không làm đổi trạng thái tồn.

**Verification:**
- [ ] RBAC/idempotency integration + E2E WF-06.
- [ ] Các lệnh áp dụng trong bảng `Lệnh chuẩn` pass.

**Dependencies:** `P10-S02`

**Files:** `app/backend/src/{Controllers,Dto,Models,Services,Data}/**`, `app/backend.Tests/**`, `app/frontend/src/**`, `docs/specs/**`

**Quy mô:** M

## Step P10-S04 — Theo dõi cảnh báo tồn

**Mô tả ngắn:** BE tính theo ấn bản và kênh; bản `BOTH` được tính cho cả hai nhóm trước khi so ngưỡng.

**Tham chiếu:** Feature/OQ `INV-006`, `INV-007`; Rule `BR-INV-002`–`BR-INV-007`, `BR-GEN-005`, `BR-GEN-007`; Workflow `WF-06`.

**Công việc:**
- [ ] BE tính theo ấn bản và kênh; bản `BOTH` được tính cho cả hai nhóm trước khi so ngưỡng.
- [ ] FE có dashboard cảnh báo và drill-down tới từng bản/lịch sử.
- [ ] Test `BOTH`, `SALE_ONLY`, `RENTAL_ONLY` và các trạng thái không khả dụng.

**Acceptance:**
- [ ] Cảnh báo khớp rule `BR-INV-006` và không dùng bảng tổng tồn dễ lệch.

**Verification:**
- [ ] Unit query test + E2E bộ lọc.
- [ ] Các lệnh áp dụng trong bảng `Lệnh chuẩn` pass.

**Dependencies:** `P10-S03`

**Files:** `app/backend/src/{Controllers,Dto,Models,Services,Data}/**`, `app/backend.Tests/**`, `app/frontend/src/**`, `docs/specs/**`

**Quy mô:** M

## Checkpoint CP10-B — Hoàn tất phase

- [ ] Backend test pass bằng lệnh chuẩn.
- [ ] Frontend test/lint/build pass bằng lệnh chuẩn.
- [ ] Lát cắt hiện tại chạy end-to-end.
- [ ] Evidence được gắn trong `todo.md`.
- [ ] Người phụ trách kỹ thuật review.
- [ ] Người phụ trách sản phẩm review nếu hành vi nghiệp vụ thay đổi.
