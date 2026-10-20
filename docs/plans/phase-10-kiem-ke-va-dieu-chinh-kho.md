# Phase 10 — Kiểm kê và điều chỉnh kho

## Mục tiêu

Kiểm kê theo CopyBarcode mà không gây bán/thuê trùng, xử lý chênh lệch qua phê duyệt và cảnh báo tồn đúng kênh.

## Step 1 — Phiếu xuất và điều chỉnh thông thường

**Feature:** `INV-003`.

- [ ] BE hỗ trợ hỏng, mất, thanh lý, ngừng kinh doanh với state transition và audit.
- [ ] FE có form chọn lý do, xem tác động và xác nhận thao tác nhạy cảm.
- [ ] Test bản đang giao dịch, trạng thái kết thúc và quyền kho.

**Chấp nhận:** Không thể xuất/điều chỉnh bản đang bị khóa bởi giao dịch khác.

**Kiểm chứng:** State transition integration test + E2E.

**Phạm vi:** M.

## Step 2 — Mở đợt và quét kiểm kê

**Feature:** `INV-004`.

- [ ] BE xác định phạm vi, khóa bản, lưu expected/observed và ngăn giao dịch xuất kho.
- [ ] FE hỗ trợ quét liên tục, đếm tiến độ và báo mã ngoài phạm vi/trùng.
- [ ] Test giao dịch đồng thời trong lúc kiểm kê và khôi phục khóa khi hủy hợp lệ.

**Chấp nhận:** Bản thuộc phạm vi không bán/thuê được cho tới khi đóng kiểm kê.

**Kiểm chứng:** Concurrency test + E2E quét kiểm kê.

## Step 3 — Chênh lệch và phê duyệt

**Feature:** `INV-005`.

- [ ] BE tạo đề nghị theo từng chênh lệch; chỉ áp dụng sau Admin duyệt.
- [ ] FE cho Quản lý kho giải trình và Admin duyệt/từ chối.
- [ ] Test người đề nghị không tự duyệt, áp dụng lặp và giải phóng khóa.

**Chấp nhận:** Chênh lệch chưa duyệt không làm đổi trạng thái tồn.

**Kiểm chứng:** RBAC/idempotency integration + E2E WF-06.

## Step 4 — Cảnh báo tồn và lịch sử

**Feature:** `INV-006`, `INV-007`.

- [ ] BE tính theo ấn bản và kênh; bản `BOTH` được tính cho cả hai nhóm trước khi so ngưỡng.
- [ ] FE có dashboard cảnh báo và drill-down tới từng bản/lịch sử.
- [ ] Test `BOTH`, `SALE_ONLY`, `RENTAL_ONLY` và các trạng thái không khả dụng.

**Chấp nhận:** Cảnh báo khớp rule `BR-INV-006` và không dùng bảng tổng tồn dễ lệch.

**Kiểm chứng:** Unit query test + E2E bộ lọc.

## Checkpoint Phase 10

- [ ] WF-06 pass đầu-cuối.
- [ ] Không có điều chỉnh chưa duyệt làm đổi tồn.
- [ ] Lock được giải phóng đúng khi hoàn tất/hủy.

