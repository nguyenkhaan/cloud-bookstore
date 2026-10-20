# Phase 12 — Thông báo và tích hợp

## Mục tiêu

Gửi thông báo một chiều qua Zalo/email bằng outbox, có retry và không làm rollback giao dịch nguồn.

## Step 1 — Outbox và sự kiện nghiệp vụ

**Feature:** `NOTIFY-003`, `NOTIFY-005`.

- [ ] BE tạo outbox trong cùng transaction với bán, thuê, gia hạn, trả và sự kiện nội bộ.
- [ ] FE hiển thị trạng thái thông báo trên chứng từ mà không coi lỗi gửi là lỗi giao dịch.
- [ ] Test commit/rollback, tạo trùng và dữ liệu người nhận.

**Chấp nhận:** Nghiệp vụ thành công luôn có tối đa một thông báo logic cho mỗi sự kiện/mẫu.

**Kiểm chứng:** Integration test transactional outbox.

**Phạm vi:** M.

## Step 2 — Adapter Zalo và email

**Feature:** `NOTIFY-001`, `NOTIFY-002`, `INTEGRATION-002`.

- [ ] BE triển khai adapter, timeout, xác thực, rate limit và mapping mẫu theo ADR.
- [ ] FE/Admin có trang trạng thái tích hợp và lỗi đã che dữ liệu nhạy cảm.
- [ ] Test contract sandbox, timeout và response lỗi.

**Chấp nhận:** Chỉ gửi một chiều cho khách; không tạo luồng khách phản hồi vào hệ thống.

**Kiểm chứng:** Contract test + manual sandbox.

## Step 3 — Worker retry và thao tác gửi lại

**Feature:** `NOTIFY-004`, `INTEGRATION-004`.

- [ ] BE retry có backoff/giới hạn, chống gửi trùng và cho phép Admin gửi lại thủ công.
- [ ] FE có hàng đợi lọc theo kênh/trạng thái/lỗi và hành động retry theo quyền.
- [ ] Test worker chạy đồng thời, provider trả chậm và quá số lần thử.

**Chấp nhận:** Retry không đổi giao dịch nguồn và không tạo thông báo nghiệp vụ trùng.

**Kiểm chứng:** Worker integration test + E2E WF-11.

## Step 4 — Quan sát tích hợp

- [ ] Gắn correlation ID từ chứng từ tới outbox/provider result.
- [ ] Tạo metric/log cho lỗi, retry, tuổi bản ghi chờ và circuit breaker.
- [ ] Viết runbook xử lý hàng đợi tắc và provider ngừng hoạt động.

**Chấp nhận:** Người vận hành xác định được thông báo nào lỗi, vì sao và cách xử lý.

**Kiểm chứng:** Diễn tập provider lỗi; kiểm tra dashboard/log/runbook.

## Checkpoint Phase 12

- [ ] WF-11 pass.
- [ ] Lỗi Zalo/email không rollback bán hoặc thuê–trả.
- [ ] Không có secret/payload nhạy cảm trong log.

