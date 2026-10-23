# Phase 12 — Thông báo và tích hợp

## Mục tiêu

Gửi thông báo một chiều qua Zalo/email bằng outbox, có retry và không làm rollback giao dịch nguồn.

## Step P12-S01 — Ghi outbox nghiệp vụ

**Mô tả ngắn:** BE tạo outbox trong cùng transaction với bán, thuê, gia hạn, trả và sự kiện nội bộ.

**Tham chiếu:** Feature/OQ `NOTIFY-003`, `NOTIFY-005`; Rule `BR-INT-001`–`BR-INT-003`; Workflow `WF-11`.

**Công việc:**
- [ ] BE tạo outbox trong cùng transaction với bán, thuê, gia hạn, trả và sự kiện nội bộ.
- [ ] FE hiển thị trạng thái thông báo trên chứng từ mà không coi lỗi gửi là lỗi giao dịch.
- [ ] Test commit/rollback, tạo trùng và dữ liệu người nhận.

**Acceptance:**
- [ ] Nghiệp vụ thành công luôn có tối đa một thông báo logic cho mỗi sự kiện/mẫu.

**Verification:**
- [ ] Integration test transactional outbox.
- [ ] Các lệnh áp dụng trong bảng `Lệnh chuẩn` pass.

**Dependencies:** Checkpoint nguồn tương ứng trong Phase 05–11; `ADR-004`

**Files:** `app/backend/src/{Models,Services,Data}/**`, `app/backend.Tests/**`, `app/frontend/src/**`, `docs/specs/**`, `docs/runbooks/**`

**Quy mô:** M

## Step P12-S02 — Gửi qua adapter

**Mô tả ngắn:** BE triển khai adapter, timeout, xác thực, rate limit và mapping mẫu theo ADR.

**Tham chiếu:** Feature/OQ `NOTIFY-001`, `NOTIFY-002`, `INTEGRATION-002`; Rule `BR-INT-001`–`BR-INT-003`; Workflow `WF-11`.

**Công việc:**
- [ ] BE triển khai adapter, timeout, xác thực, rate limit và mapping mẫu theo ADR.
- [ ] FE/Admin có trang trạng thái tích hợp và lỗi đã che dữ liệu nhạy cảm.
- [ ] Test contract sandbox, timeout và response lỗi.

**Acceptance:**
- [ ] Chỉ gửi một chiều cho khách.
- [ ] không tạo luồng khách phản hồi vào hệ thống.

**Verification:**
- [ ] Contract test + manual sandbox.
- [ ] Các lệnh áp dụng trong bảng `Lệnh chuẩn` pass.

**Dependencies:** `P12-S01`

**Files:** `app/backend/src/{Models,Services,Data}/**`, `app/backend.Tests/**`, `app/frontend/src/**`, `docs/specs/**`, `docs/runbooks/**`

**Quy mô:** M

## Checkpoint CP12-A — Sau P12-S02

- [ ] Backend test pass bằng lệnh chuẩn.
- [ ] Frontend test/lint/build pass bằng lệnh chuẩn.
- [ ] Lát cắt hiện tại chạy end-to-end.
- [ ] Evidence được gắn trong `todo.md`.
- [ ] Người phụ trách kỹ thuật review.
- [ ] Người phụ trách sản phẩm review nếu hành vi nghiệp vụ thay đổi.


## Step P12-S03 — Retry thông báo

**Mô tả ngắn:** BE retry có backoff/giới hạn, chống gửi trùng và cho phép Admin gửi lại thủ công.

**Tham chiếu:** Feature/OQ `NOTIFY-004`, `INTEGRATION-004`; Rule `BR-INT-001`–`BR-INT-003`; Workflow `WF-11`.

**Công việc:**
- [ ] BE retry có backoff/giới hạn, chống gửi trùng và cho phép Admin gửi lại thủ công.
- [ ] FE có hàng đợi lọc theo kênh/trạng thái/lỗi và hành động retry theo quyền.
- [ ] Test worker chạy đồng thời, provider trả chậm và quá số lần thử.

**Acceptance:**
- [ ] Retry không đổi giao dịch nguồn và không tạo thông báo nghiệp vụ trùng.

**Verification:**
- [ ] Worker integration test + E2E WF-11.
- [ ] Các lệnh áp dụng trong bảng `Lệnh chuẩn` pass.

**Dependencies:** `P12-S02`

**Files:** `app/backend/src/{Models,Services,Data}/**`, `app/backend.Tests/**`, `app/frontend/src/**`, `docs/specs/**`, `docs/runbooks/**`

**Quy mô:** M

## Step P12-S04 — Quan sát tích hợp

**Mô tả ngắn:** Gắn correlation ID từ chứng từ tới outbox/provider result.

**Tham chiếu:** Feature/OQ Không; Rule `BR-INT-001`–`BR-INT-003`; Workflow `WF-11`.

**Công việc:**
- [ ] BE lưu và truyền correlation ID qua chứng từ, bản ghi outbox và kết quả gửi từ provider.
- [ ] BE xuất metric/log cho lỗi gửi, số lần retry, tuổi bản ghi chờ và trạng thái circuit breaker.
- [ ] Tạo dashboard tra cứu theo correlation ID; viết runbook xử lý hàng đợi tắc và provider ngừng hoạt động.

**Acceptance:**
- [ ] Người vận hành xác định được thông báo nào lỗi, vì sao và cách xử lý.

**Verification:**
- [ ] Diễn tập provider lỗi; kiểm tra dashboard/log/runbook.
- [ ] Các lệnh áp dụng trong bảng `Lệnh chuẩn` pass.

**Dependencies:** `P12-S03`

**Files:** `app/backend/src/{Models,Services,Data}/**`, `app/backend.Tests/**`, `app/frontend/src/**`, `docs/specs/**`, `docs/runbooks/**`

**Quy mô:** M

## Checkpoint CP12-B — Hoàn tất phase

- [ ] Backend test pass bằng lệnh chuẩn.
- [ ] Frontend test/lint/build pass bằng lệnh chuẩn.
- [ ] Lát cắt hiện tại chạy end-to-end.
- [ ] Evidence được gắn trong `todo.md`.
- [ ] Người phụ trách kỹ thuật review.
- [ ] Người phụ trách sản phẩm review nếu hành vi nghiệp vụ thay đổi.
