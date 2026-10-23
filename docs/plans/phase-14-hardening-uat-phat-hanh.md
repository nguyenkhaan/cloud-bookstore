# Phase 14 — Hardening, UAT và phát hành

## Mục tiêu

Chứng minh hệ thống an toàn, ổn định và dùng được tại quầy trước production.

## Step P14-S01 — Rà soát security/privacy

**Mô tả ngắn:** Kiểm tra auth, RBAC, input validation, rate limit, CORS/CSRF theo cơ chế auth và dependency vulnerabilities.

**Tham chiếu:** Feature/OQ Không; Rule Toàn bộ rule Accepted và NFR đã duyệt; Workflow `WF-01`–`WF-11`.

**Công việc:**
- [ ] Kiểm tra auth, RBAC, input validation, rate limit, CORS/CSRF theo cơ chế auth và dependency vulnerabilities.
- [ ] Kiểm tra secret, log, CCCD, lương, dữ liệu tài chính và retention.
- [ ] Chạy lại toàn bộ test gọi API ngoài quyền và webhook giả mạo.

**Acceptance:**
- [ ] Không còn lỗi mức nghiêm trọng/cao.
- [ ] lỗi còn lại có owner và phương án được duyệt.

**Verification:**
- [ ] Báo cáo security review và test evidence.
- [ ] Các lệnh áp dụng trong bảng `Lệnh chuẩn` pass.

**Dependencies:** `CP13-C`; mọi checkpoint Phase 01–12

**Files:** `.github/workflows/**`, `app/backend.Tests/**`, `app/frontend/**`, `docs/**`, deployment configuration

**Quy mô:** M

## Step P14-S02 — Kiểm thử hiệu năng

**Mô tả ngắn:** Đo p95 cho quét CopyBarcode, tìm khách, thêm dòng và hoàn tất giao dịch theo NFR.

**Tham chiếu:** Feature/OQ Không; Rule Toàn bộ rule Accepted và NFR đã duyệt; Workflow `WF-01`–`WF-11`.

**Công việc:**
- [ ] Đo p95 cho quét CopyBarcode, tìm khách, thêm dòng và hoàn tất giao dịch theo NFR.
- [ ] Test tải webhook, worker outbox, báo cáo lớn và truy vấn phân trang.
- [ ] Test mất kết nối, retry, restart worker và DB contention.

**Acceptance:**
- [ ] Đạt mục tiêu đã chốt.
- [ ] POS không bị báo cáo/job nền làm nghẽn.

**Verification:**
- [ ] Báo cáo load test và so sánh với ngưỡng.
- [ ] Các lệnh áp dụng trong bảng `Lệnh chuẩn` pass.

**Dependencies:** `P14-S01`

**Files:** `.github/workflows/**`, `app/backend.Tests/**`, `app/frontend/**`, `docs/**`, deployment configuration

**Quy mô:** M

## Checkpoint CP14-A — Sau P14-S02

- [ ] Backend test pass bằng lệnh chuẩn.
- [ ] Frontend test/lint/build pass bằng lệnh chuẩn.
- [ ] Lát cắt hiện tại chạy end-to-end.
- [ ] Evidence được gắn trong `todo.md`.
- [ ] Người phụ trách kỹ thuật review.
- [ ] Người phụ trách sản phẩm review nếu hành vi nghiệp vụ thay đổi.


## Step P14-S03 — Chạy regression

**Mô tả ngắn:** Chạy toàn bộ unit/integration/contract/E2E cho WF-01 đến WF-11.

**Tham chiếu:** Feature/OQ Không; Rule Toàn bộ rule Accepted và NFR đã duyệt; Workflow `WF-01`–`WF-11`.

**Công việc:**
- [ ] Chạy toàn bộ unit/integration/contract/E2E cho WF-01 đến WF-11.
- [ ] Chuẩn bị seed UAT gồm nhiều ấn bản cùng ISBN, sách không ISBN, đủ ba hạng và các trạng thái lỗi.
- [ ] Kiểm tra migration từ DB trống và từ bản gần production.

**Acceptance:**
- [ ] Build/lint/test pass.
- [ ] không có test flaky đã biết.

**Verification:**
- [ ] CI release pipeline xanh và migration rehearsal thành công.
- [ ] Các lệnh áp dụng trong bảng `Lệnh chuẩn` pass.

**Dependencies:** `P14-S02`

**Files:** `.github/workflows/**`, `app/backend.Tests/**`, `app/frontend/**`, `docs/**`, deployment configuration

**Quy mô:** M

## Step P14-S04 — Nghiệm thu tại quầy

**Mô tả ngắn:** Admin, Nhân viên và Quản lý kho chạy kịch bản đúng vai trò với máy quét và máy in tem.

**Tham chiếu:** Feature/OQ Không; Rule Toàn bộ rule Accepted và NFR đã duyệt; Workflow `WF-01`–`WF-11`.

**Công việc:**
- [ ] Admin, Nhân viên và Quản lý kho chạy kịch bản đúng vai trò với máy quét và máy in tem.
- [ ] Chạy bán, thuê–trả, thu mua, kiểm kê, đóng két, công/lương và fallback tích hợp.
- [ ] Ghi lỗi theo feature ID; sửa yêu cầu bằng spec/decision trước khi sửa code nếu hành vi mong đợi thay đổi.

**Acceptance:**
- [ ] Người phụ trách sản phẩm ký duyệt UAT.
- [ ] không còn lỗi chặn vận hành.

**Verification:**
- [ ] Biên bản UAT và evidence từng workflow.
- [ ] Các lệnh áp dụng trong bảng `Lệnh chuẩn` pass.

**Dependencies:** `P14-S03`

**Files:** `.github/workflows/**`, `app/backend.Tests/**`, `app/frontend/**`, `docs/**`, deployment configuration

**Quy mô:** M

## Checkpoint CP14-B — Sau P14-S04

- [ ] Backend test pass bằng lệnh chuẩn.
- [ ] Frontend test/lint/build pass bằng lệnh chuẩn.
- [ ] Lát cắt hiện tại chạy end-to-end.
- [ ] Evidence được gắn trong `todo.md`.
- [ ] Người phụ trách kỹ thuật review.
- [ ] Người phụ trách sản phẩm review nếu hành vi nghiệp vụ thay đổi.


## Step P14-S05 — Phát hành production

**Mô tả ngắn:** Chốt migration/backup/rollback plan, secret production và quyền tối thiểu.

**Tham chiếu:** Feature/OQ Không; Rule Toàn bộ rule Accepted và NFR đã duyệt; Workflow `WF-01`–`WF-11`.

**Công việc:**
- [ ] Chốt migration/backup/rollback plan, secret production và quyền tối thiểu.
- [ ] Deploy theo checklist, smoke test, theo dõi lỗi/thanh toán/outbox/DB.
- [ ] Xác định người trực và tiêu chí rollback; review sau phát hành.

**Acceptance:**
- [ ] Production health tốt, một giao dịch mẫu được truy vết đầu-cuối và rollback đã sẵn sàng.

**Verification:**
- [ ] Smoke test production không dùng dữ liệu nhạy cảm thật ngoài phạm vi được phép.
- [ ] Các lệnh áp dụng trong bảng `Lệnh chuẩn` pass.

**Dependencies:** `P14-S04`

**Files:** `.github/workflows/**`, `app/backend.Tests/**`, `app/frontend/**`, `docs/**`, deployment configuration

**Quy mô:** M

## Checkpoint CP14-C — Hoàn tất phase

- [ ] Backend test pass bằng lệnh chuẩn.
- [ ] Frontend test/lint/build pass bằng lệnh chuẩn.
- [ ] Lát cắt hiện tại chạy end-to-end.
- [ ] Evidence được gắn trong `todo.md`.
- [ ] Người phụ trách kỹ thuật review.
- [ ] Người phụ trách sản phẩm review nếu hành vi nghiệp vụ thay đổi.
