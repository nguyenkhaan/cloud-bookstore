# Phase 09 — Gia hạn, trả sách và quyết toán

## Mục tiêu

Hoàn thiện vòng đời thuê: gia hạn đúng rule, nhận đủ sách, tính nghĩa vụ và quyết toán cọc.

## Step 1 — Gia hạn tại quầy

**Feature:** `EXT-001`, `EXT-002`.

- [ ] BE kiểm tra còn hạn, tối đa hai lần/bảy ngày; lưu hạn cũ/mới và phí phát sinh snapshot.
- [ ] FE hiển thị số lần còn lại, hạn mới và phí dự kiến; không mở chức năng cho khách tự làm.
- [ ] Test đúng hạn, quá hạn, lần thứ ba và cấu hình thay đổi.

**Chấp nhận:** Gia hạn không thu tiền ngay; lịch sử không bị ghi đè.

**Kiểm chứng:** Unit/integration + E2E WF-03.

**Phạm vi:** M.

## Step 2 — Nhận trả toàn bộ

**Feature:** `RETURN-001`, `RETURN-002`.

- [ ] BE tạo đúng một lượt trả cho phiếu và yêu cầu đủ mọi CopyBarcode hoặc đánh dấu mất theo quyền.
- [ ] FE có checklist quét, tình trạng từng bản và cảnh báo bản không thuộc phiếu.
- [ ] Test trả thiếu, quét trùng và trả từng phần bị từ chối.

**Chấp nhận:** Không quyết toán khi còn bản chưa xử lý.

**Kiểm chứng:** Integration + E2E nhận trả.

## Step 3 — Tính phí, trễ, hư hỏng và mất

**Feature:** `RETURN-003`, `RETURN-006`.

- [ ] BE tính từ snapshot và policy đã chốt; ngoại lệ hư hỏng ngoài khung cần Admin duyệt.
- [ ] FE hiển thị từng thành phần phí và lý do cần duyệt.
- [ ] Test miễn phạt, làm tròn ngày, trần phạt, các mức hư hỏng và sách mất.

**Chấp nhận:** Công thức cho kết quả đúng ví dụ đã duyệt; FE không tự tính số tiền chính thức.

**Kiểm chứng:** Unit test bảng trường hợp + approval integration test.

## Step 4 — Quyết toán cọc và đóng phiếu

**Feature:** `RETURN-004`, `RETURN-005`.

- [ ] BE khấu trừ cọc, thu thêm hoặc ghi hoàn cọc; cập nhật BookCopy và eligible spend trong transaction.
- [ ] FE dùng payment component chung, hỗ trợ hoàn tiền mặt hoặc ghi nhận chuyển khoản ngoài hệ thống.
- [ ] Test cọc đủ/thiếu/dư, retry, hoàn thất bại và BookCopy theo tình trạng.

**Chấp nhận:** Chỉ đóng phiếu khi nghĩa vụ bằng không và thu/hoàn đã xác nhận.

**Kiểm chứng:** Transaction + E2E WF-04.

## Checkpoint Phase 09

- [ ] WF-03 và WF-04 pass đầu-cuối.
- [ ] Test quá hạn/hỏng/mất/cọc thiếu đều có bằng chứng.
- [ ] Chỉ phí thuê/gia hạn đã trả được cộng eligible spend.

