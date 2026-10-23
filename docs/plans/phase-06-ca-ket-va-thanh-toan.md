# Phase 06 — Ca két và thanh toán

## Mục tiêu

Tạo nền tiền tệ dùng chung cho bán, thuê–trả, thu mua và lương; đảm bảo idempotency và truy vết.

## Step P06-S01 — Mở ca két

**Mô tả ngắn:** BE chỉ cho một ca két mở, lưu tiền đầu ca và tính số dư lý thuyết từ payment tiền mặt.

**Tham chiếu:** Feature/OQ `CASH-001`, `CASH-002`; Rule `BR-PAY-001`–`BR-PAY-005`, `BR-CASH-001`–`BR-CASH-003`, `BR-INT-001`–`BR-INT-002`; Workflow `WF-07`, `WF-08`.

**Công việc:**
- [ ] BE chỉ cho một ca két mở, lưu tiền đầu ca và tính số dư lý thuyết từ payment tiền mặt.
- [ ] FE có màn hình mở ca, trạng thái ca hiện tại và danh sách thu/chi.
- [ ] Test mở trùng, số tiền âm, quyền và thời điểm theo `Asia/Ho_Chi_Minh`.

**Acceptance:**
- [ ] Giao dịch tiền mặt không thể ghi khi thiếu ca mở.

**Verification:**
- [ ] Constraint/integration test + E2E mở ca.
- [ ] Các lệnh áp dụng trong bảng `Lệnh chuẩn` pass.

**Dependencies:** `CP02-B`

**Files:** `app/backend/src/{Controllers,Dto,Models,Services,Data}/**`, `app/backend.Tests/**`, `app/frontend/src/**`, `docs/specs/**`

**Quy mô:** M

## Step P06-S02 — Ghi payment ledger

**Mô tả ngắn:** BE ghi payment vào/ra với idempotency key và đúng một chứng từ nguồn.

**Tham chiếu:** Feature/OQ `PAY-001`, `PAY-006`, `PAY-007`; Rule `BR-PAY-001`–`BR-PAY-005`, `BR-CASH-001`–`BR-CASH-003`, `BR-INT-001`–`BR-INT-002`; Workflow `WF-07`, `WF-08`.

**Công việc:**
- [ ] BE ghi payment vào/ra với idempotency key và đúng một chứng từ nguồn.
- [ ] FE có modal thanh toán tiền mặt, tiền khách đưa/tiền thối và xác nhận rõ.
- [ ] Test retry, payment trùng, source sai loại và giao dịch đảo.

**Acceptance:**
- [ ] Payment thành công không sửa/xóa trực tiếp.
- [ ] retry không ghi hai lần.

**Verification:**
- [ ] Unit + integration test idempotency.
- [ ] Các lệnh áp dụng trong bảng `Lệnh chuẩn` pass.

**Dependencies:** `P06-S01`

**Files:** `app/backend/src/{Controllers,Dto,Models,Services,Data}/**`, `app/backend.Tests/**`, `app/frontend/src/**`, `docs/specs/**`

**Quy mô:** M

## Checkpoint CP06-A — Sau P06-S02

- [ ] Backend test pass bằng lệnh chuẩn.
- [ ] Frontend test/lint/build pass bằng lệnh chuẩn.
- [ ] Lát cắt hiện tại chạy end-to-end.
- [ ] Evidence được gắn trong `todo.md`.
- [ ] Người phụ trách kỹ thuật review.
- [ ] Người phụ trách sản phẩm review nếu hành vi nghiệp vụ thay đổi.


## Step P06-S03 — Xử lý VietQR/webhook

**Mô tả ngắn:** BE sinh QR tham chiếu unique, xác thực/lưu webhook và đối chiếu số tiền/tài khoản theo ADR.

**Tham chiếu:** Feature/OQ `PAY-002`–`PAY-005`., `INTEGRATION-001`; Rule `BR-PAY-001`–`BR-PAY-005`, `BR-CASH-001`–`BR-CASH-003`, `BR-INT-001`–`BR-INT-002`; Workflow `WF-07`, `WF-08`.

**Công việc:**
- [ ] BE sinh QR tham chiếu unique, xác thực/lưu webhook và đối chiếu số tiền/tài khoản theo ADR.
- [ ] FE hiển thị QR, đếm hạn, polling theo request cũ khi mất kết nối và trạng thái cần đối soát.
- [ ] Test chữ ký sai, webhook trùng/đến muộn, thiếu/thừa tiền và timeout.

**Acceptance:**
- [ ] Chỉ webhook hợp lệ, khớp đủ mới hoàn tất.
- [ ] sự kiện sai lệch không bị mất.

**Verification:**
- [ ] Contract test nhà cung cấp + E2E sandbox.
- [ ] Các lệnh áp dụng trong bảng `Lệnh chuẩn` pass.

**Dependencies:** `P06-S02`

**Files:** `app/backend/src/{Controllers,Dto,Models,Services,Data}/**`, `app/backend.Tests/**`, `app/frontend/src/**`, `docs/specs/**`

**Quy mô:** M

## Step P06-S04 — Đóng ca két

**Mô tả ngắn:** BE tạm chặn thu/chi mới khi đóng, tính chênh lệch và yêu cầu Admin duyệt ngoại lệ.

**Tham chiếu:** Feature/OQ `CASH-003`–`CASH-005`; Rule `BR-PAY-001`–`BR-PAY-005`, `BR-CASH-001`–`BR-CASH-003`, `BR-INT-001`–`BR-INT-002`; Workflow `WF-07`, `WF-08`.

**Công việc:**
- [ ] BE tạm chặn thu/chi mới khi đóng, tính chênh lệch và yêu cầu Admin duyệt ngoại lệ.
- [ ] FE hỗ trợ kiểm đếm, giải trình và màn hình duyệt.
- [ ] Test race condition giao dịch lúc đóng ca và ca đã đóng chỉ đọc.

**Acceptance:**
- [ ] Không có payment tiền mặt lọt vào ca sau thời điểm đóng.

**Verification:**
- [ ] Concurrency test + E2E đóng ca có/không chênh lệch.
- [ ] Các lệnh áp dụng trong bảng `Lệnh chuẩn` pass.

**Dependencies:** `P06-S03`

**Files:** `app/backend/src/{Controllers,Dto,Models,Services,Data}/**`, `app/backend.Tests/**`, `app/frontend/src/**`, `docs/specs/**`

**Quy mô:** M

## Checkpoint CP06-B — Hoàn tất phase

- [ ] Backend test pass bằng lệnh chuẩn.
- [ ] Frontend test/lint/build pass bằng lệnh chuẩn.
- [ ] Lát cắt hiện tại chạy end-to-end.
- [ ] Evidence được gắn trong `todo.md`.
- [ ] Người phụ trách kỹ thuật review.
- [ ] Người phụ trách sản phẩm review nếu hành vi nghiệp vụ thay đổi.
