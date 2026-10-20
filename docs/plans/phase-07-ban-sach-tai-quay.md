# Phase 07 — Bán sách tại quầy

## Mục tiêu

Hoàn thành luồng POS bán sách từ quét CopyBarcode đến thanh toán, cập nhật kho và chứng từ.

## Step 1 — Hóa đơn nháp và quét sách

**Feature:** `SALE-001`–`SALE-003`.

- [ ] BE tạo hóa đơn nháp, khóa bản hợp lệ và từ chối bản không khả dụng/không cho bán.
- [ ] FE ưu tiên máy quét/bàn phím, báo đúng mã sai/trùng/trạng thái hiện tại.
- [ ] Test hai người cùng quét một bản và hủy nháp giải phóng khóa.

**Chấp nhận:** Một BookCopy chỉ thuộc một giao dịch hiệu lực; khách hàng có thể để trống.

**Kiểm chứng:** Concurrency integration test + E2E giỏ hàng.

**Phạm vi:** M.

## Step 2 — Tính giá và thành viên

**Feature:** `SALE-004`.

- [ ] BE snapshot giá, hạng, phần trăm và tiền giảm trên từng dòng.
- [ ] FE hiển thị giá trước/sau giảm và lý do áp dụng hạng.
- [ ] Test ba hạng, khách vãng lai và giá thay đổi sau khi đã thêm vào hóa đơn.

**Chấp nhận:** Tổng hóa đơn được tính ở BE; FE không tự quyết định số tiền cuối.

**Kiểm chứng:** Unit test bảng giá + API test.

## Step 3 — Thanh toán và hoàn tất

**Feature:** `SALE-005`, `SALE-006`, `SALE-007`.

- [ ] BE trong transaction hoàn tất payment, hóa đơn, BookCopy và eligible spend.
- [ ] FE dùng component tiền mặt/VietQR Phase 06, xử lý retry bằng cùng idempotency key.
- [ ] Test mất kết nối sau thanh toán và không hoàn tất khi tiền thiếu.

**Chấp nhận:** Thành công tạo đúng một payment, một hóa đơn paid và sách sold.

**Kiểm chứng:** Transaction test + E2E cả hai phương thức.

## Step 4 — Đảo giao dịch quét nhầm

**Feature:** `SALE-008`.

- [ ] BE chỉ nhận yêu cầu trong 24 giờ, cần Admin duyệt và tạo giao dịch đảo/audit.
- [ ] FE có luồng yêu cầu, duyệt/từ chối và hiển thị liên kết chứng từ gốc–đảo.
- [ ] Test quá hạn, tự duyệt, đảo lặp và tính lại hạng khách.

**Chấp nhận:** Không sửa hóa đơn paid; tồn kho và eligible spend phản ánh giao dịch đảo.

**Kiểm chứng:** Integration + E2E đảo giao dịch.

## Checkpoint Phase 07

- [ ] WF-01 chạy đầu-cuối bằng UI/API thật.
- [ ] Test bán đồng thời cùng một bản chỉ cho một giao dịch thành công.
- [ ] Mọi số tiền và trạng thái truy được lịch sử.

