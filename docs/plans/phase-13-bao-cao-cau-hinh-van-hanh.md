# Phase 13 — Cấu hình, báo cáo và vận hành

## Mục tiêu

Cho Admin thay đổi policy có hiệu lực theo thời gian, xem báo cáo truy về chứng từ và vận hành hệ thống an toàn.

## Step P13-S01 — Quản trị cấu hình phiên bản

**Mô tả ngắn:** BE lưu giá trị cũ/mới, người đổi, thời điểm hiệu lực và validation theo loại cấu hình.

**Tham chiếu:** Feature/OQ `CONFIG-001`–`CONFIG-003`; Rule `BR-CONFIG-001`–`BR-CONFIG-002`, các rule báo cáo đã duyệt; Workflow Reporting/operations flows.

**Công việc:**
- [ ] BE lưu giá trị cũ/mới, người đổi, thời điểm hiệu lực và validation theo loại cấu hình.
- [ ] FE có danh sách lịch sử, form thay đổi và cảnh báo phạm vi tác động.
- [ ] Test hiệu lực quá khứ/tương lai, quyền và snapshot giao dịch cũ.

**Acceptance:**
- [ ] Cấu hình mới không viết lại giao dịch đã hoàn tất.

**Verification:**
- [ ] Time-based integration test + E2E thay đổi policy.
- [ ] Các lệnh áp dụng trong bảng `Lệnh chuẩn` pass.

**Dependencies:** `P01-S02`; checkpoint nghiệp vụ liên quan trong Phase 05–12

**Files:** `app/backend/src/{Controllers,Dto,Models,Services,Data}/**`, `app/backend.Tests/**`, `app/frontend/src/**`, `docs/specs/**`, `docs/runbooks/**`

**Quy mô:** M

## Step P13-S02 — Báo cáo nghiệp vụ

**Mô tả ngắn:** BE query theo thời gian, đầu sách, thể loại, nhân viên, trạng thái; phân trang và timezone chuẩn.

**Tham chiếu:** Feature/OQ `REPORT-001`–`REPORT-003`; Rule `BR-CONFIG-001`–`BR-CONFIG-002`, các rule báo cáo đã duyệt; Workflow Reporting/operations flows.

**Công việc:**
- [ ] BE query theo thời gian, đầu sách, thể loại, nhân viên, trạng thái; phân trang và timezone chuẩn.
- [ ] FE có bộ lọc, tổng hợp và drill-down về chứng từ/bản sách.
- [ ] Test giao dịch đảo, phiếu chưa hoàn tất và biên ngày `Asia/Ho_Chi_Minh`.

**Acceptance:**
- [ ] Tổng báo cáo khớp dữ liệu nguồn.
- [ ] không đếm nháp/cancelled như giao dịch hoàn tất.

**Verification:**
- [ ] Dataset cố định + snapshot kết quả.
- [ ] Các lệnh áp dụng trong bảng `Lệnh chuẩn` pass.

**Dependencies:** `P13-S01`

**Files:** `app/backend/src/{Controllers,Dto,Models,Services,Data}/**`, `app/backend.Tests/**`, `app/frontend/src/**`, `docs/specs/**`, `docs/runbooks/**`

**Quy mô:** M

## Checkpoint CP13-A — Sau P13-S02

- [ ] Backend test pass bằng lệnh chuẩn.
- [ ] Frontend test/lint/build pass bằng lệnh chuẩn.
- [ ] Lát cắt hiện tại chạy end-to-end.
- [ ] Evidence được gắn trong `todo.md`.
- [ ] Người phụ trách kỹ thuật review.
- [ ] Người phụ trách sản phẩm review nếu hành vi nghiệp vụ thay đổi.


## Step P13-S03 — Báo cáo tài chính nội bộ

**Mô tả ngắn:** BE tổng hợp từ payment ledger, ca két và work record; tách cọc khỏi doanh thu.

**Tham chiếu:** Feature/OQ `REPORT-004`; Rule `BR-CONFIG-001`–`BR-CONFIG-002`, các rule báo cáo đã duyệt; Workflow Reporting/operations flows.

**Công việc:**
- [ ] BE tổng hợp từ payment ledger, ca két và work record; tách cọc khỏi doanh thu.
- [ ] FE giới hạn báo cáo theo vai trò và che dữ liệu lương/tài chính.
- [ ] Test hoàn cọc, đảo giao dịch, chênh lệch két và chi lương.

**Acceptance:**
- [ ] Mỗi tổng số drill-down được tới các chứng từ tạo thành nó.

**Verification:**
- [ ] Reconciliation integration test + E2E theo quyền.
- [ ] Các lệnh áp dụng trong bảng `Lệnh chuẩn` pass.

**Dependencies:** `P13-S02`

**Files:** `app/backend/src/{Controllers,Dto,Models,Services,Data}/**`, `app/backend.Tests/**`, `app/frontend/src/**`, `docs/specs/**`, `docs/runbooks/**`

**Quy mô:** M

## Step P13-S04 — Xuất dữ liệu thuế

**Mô tả ngắn:** Chốt spec mẫu trước khi code; BE tạo job xuất file không khóa POS.

**Tham chiếu:** Feature/OQ `REPORT-005`; Rule `BR-CONFIG-001`–`BR-CONFIG-002`, các rule báo cáo đã duyệt; Workflow Reporting/operations flows.

**Công việc:**
- [ ] Chốt spec mẫu trước khi code; BE tạo job xuất file không khóa POS.
- [ ] FE tạo yêu cầu, theo dõi tiến độ và tải file theo quyền/thời hạn.
- [ ] Test file lớn, lỗi job, công thức và encoding tiếng Việt.

**Acceptance:**
- [ ] File đúng mẫu đã duyệt.
- [ ] hệ thống không tự nộp thuế.

**Verification:**
- [ ] Contract/snapshot file + kiểm tra thủ công với kế toán.
- [ ] Các lệnh áp dụng trong bảng `Lệnh chuẩn` pass.

**Dependencies:** `P13-S03`

**Files:** `app/backend/src/{Controllers,Dto,Models,Services,Data}/**`, `app/backend.Tests/**`, `app/frontend/src/**`, `docs/specs/**`, `docs/runbooks/**`

**Quy mô:** M

## Checkpoint CP13-B — Sau P13-S04

- [ ] Backend test pass bằng lệnh chuẩn.
- [ ] Frontend test/lint/build pass bằng lệnh chuẩn.
- [ ] Lát cắt hiện tại chạy end-to-end.
- [ ] Evidence được gắn trong `todo.md`.
- [ ] Người phụ trách kỹ thuật review.
- [ ] Người phụ trách sản phẩm review nếu hành vi nghiệp vụ thay đổi.


## Step P13-S05 — Diễn tập vận hành

**Mô tả ngắn:** Health check app/DB/tích hợp ở mức không lộ secret.

**Tham chiếu:** Feature/OQ `OPS-001`, `OPS-002`; Rule `BR-CONFIG-001`–`BR-CONFIG-002`, các rule báo cáo đã duyệt; Workflow Reporting/operations flows.

**Công việc:**
- [ ] Health check app/DB/tích hợp ở mức không lộ secret.
- [ ] Thiết lập backup, restore drill, retention và cảnh báo theo NFR đã chốt.
- [ ] Viết runbook cho DB, webhook, đối soát, outbox và xuất file.

**Acceptance:**
- [ ] Khôi phục thành công trong mục tiêu RPO/RTO.
- [ ] health không gây gọi provider quá mức.

**Verification:**
- [ ] Restore drill và fault-injection có biên bản.
- [ ] Các lệnh áp dụng trong bảng `Lệnh chuẩn` pass.

**Dependencies:** `P13-S04`

**Files:** `app/backend/src/{Controllers,Dto,Models,Services,Data}/**`, `app/backend.Tests/**`, `app/frontend/src/**`, `docs/specs/**`, `docs/runbooks/**`

**Quy mô:** M

## Checkpoint CP13-C — Hoàn tất phase

- [ ] Backend test pass bằng lệnh chuẩn.
- [ ] Frontend test/lint/build pass bằng lệnh chuẩn.
- [ ] Lát cắt hiện tại chạy end-to-end.
- [ ] Evidence được gắn trong `todo.md`.
- [ ] Người phụ trách kỹ thuật review.
- [ ] Người phụ trách sản phẩm review nếu hành vi nghiệp vụ thay đổi.
