# Phase 08 — Lập phiếu thuê và thu cọc

## Mục tiêu

Cho thuê đúng hạn mức thành viên, khóa đúng bản vật lý và chỉ giao sách sau khi đủ cọc.

## Step 1 — Kiểm tra khách và điều kiện thuê

**Feature:** `RENT-001`, `RENT-002`.

- [ ] BE kiểm tra hồ sơ, nghĩa vụ, quá hạn, cờ chặn, CCCD/địa chỉ theo ngưỡng và hạn mức hạng.
- [ ] FE tìm/tạo khách, hiển thị lý do bị chặn và dữ liệu còn thiếu.
- [ ] Test các biên số bản/ngày thuê của ba hạng.

**Chấp nhận:** Mọi lý do chặn rõ ràng; không đổi dữ liệu khi điều kiện không đạt.

**Kiểm chứng:** Unit rule test + E2E chọn khách.

**Phạm vi:** M.

## Step 2 — Phiếu nháp và khóa bản

**Feature:** `RENT-001`, `RENT-002`.

- [ ] BE chỉ nhận BookCopy `AVAILABLE` có kênh thuê, snapshot giá/đơn giá/hạng và khóa atomically.
- [ ] FE quét CopyBarcode, chọn số ngày trong hạn mức và hiển thị hạn trả.
- [ ] Test bán và thuê đồng thời cùng một bản; chỉ một bên thành công.

**Chấp nhận:** Không thể đưa một bản vào hai giao dịch hiệu lực.

**Kiểm chứng:** Concurrency integration test + E2E phiếu nháp.

## Step 3 — Tính và thu cọc

**Feature:** `RENT-003`, `RENT-004`.

- [ ] BE tính cọc bằng 100% tổng giá bán snapshot và tạo payment tiền mặt/VietQR.
- [ ] FE hiển thị rõ cọc không phải doanh thu và trạng thái chờ thanh toán.
- [ ] Test cọc không được giảm theo hạng, payment thiếu và retry.

**Chấp nhận:** Phiếu chỉ active và BookCopy chỉ rented sau khi đủ cọc.

**Kiểm chứng:** Transaction/idempotency test + E2E thanh toán cọc.

## Step 4 — Chứng từ thuê

- [ ] BE trả chi tiết phiếu, hạn trả, cọc và lịch sử trạng thái.
- [ ] FE có màn hình/in chứng từ tại quầy; tạo sự kiện thông báo để Phase 12 xử lý.
- [ ] Test quyền và dữ liệu snapshot không đổi khi cấu hình mới có hiệu lực.

**Chấp nhận:** Chứng từ phản ánh đúng dữ liệu tại thời điểm thuê.

**Kiểm chứng:** Snapshot test + manual check bản in.

## Checkpoint Phase 08

- [ ] WF-02 chạy đầu-cuối.
- [ ] Test xung đột bán–thuê và retry payment pass.
- [ ] Cọc không bị tính vào eligible spend.

