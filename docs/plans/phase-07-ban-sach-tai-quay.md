# Phase 07 — Bán sách tại quầy

## Mục tiêu

Hoàn thành luồng POS bán sách từ quét CopyBarcode đến thanh toán, cập nhật kho và chứng từ.

## Step P07-S01 — Lập hóa đơn nháp

**Mô tả ngắn:** BE tạo hóa đơn nháp, khóa bản hợp lệ và từ chối bản không khả dụng/không cho bán.

**Tham chiếu:** Feature/OQ `SALE-001`–`SALE-003`; Rule `BR-SALE-001`–`BR-SALE-005`, `BR-GEN-004`–`BR-GEN-009`; Workflow `WF-01`.

**Công việc:**
- [ ] BE tạo hóa đơn nháp, khóa bản hợp lệ và từ chối bản không khả dụng/không cho bán.
- [ ] FE ưu tiên máy quét/bàn phím, báo đúng mã sai/trùng/trạng thái hiện tại.
- [ ] Test hai người cùng quét một bản và hủy nháp giải phóng khóa.

**Acceptance:**
- [ ] Một BookCopy chỉ thuộc một giao dịch hiệu lực.
- [ ] khách hàng có thể để trống.

**Verification:**
- [ ] Concurrency integration test + E2E giỏ hàng.
- [ ] Các lệnh áp dụng trong bảng `Lệnh chuẩn` pass.

**Dependencies:** `CP03-B`, `CP04-B`, `CP06-B`

**Files:** `app/backend/src/{Controllers,Dto,Models,Services,Data}/**`, `app/backend.Tests/**`, `app/frontend/src/**`, `docs/specs/**`

**Quy mô:** M

## Step P07-S02 — Tính giá thành viên

**Mô tả ngắn:** BE snapshot giá, hạng, phần trăm và tiền giảm trên từng dòng.

**Tham chiếu:** Feature/OQ `SALE-004`; Rule `BR-SALE-001`–`BR-SALE-005`, `BR-GEN-004`–`BR-GEN-009`; Workflow `WF-01`.

**Công việc:**
- [ ] BE snapshot giá, hạng, phần trăm và tiền giảm trên từng dòng.
- [ ] FE hiển thị giá trước/sau giảm và lý do áp dụng hạng.
- [ ] Test ba hạng, khách vãng lai và giá thay đổi sau khi đã thêm vào hóa đơn.

**Acceptance:**
- [ ] Tổng hóa đơn được tính ở BE.
- [ ] FE không tự quyết định số tiền cuối.

**Verification:**
- [ ] Unit test bảng giá + API test.
- [ ] Các lệnh áp dụng trong bảng `Lệnh chuẩn` pass.

**Dependencies:** `P07-S01`

**Files:** `app/backend/src/{Controllers,Dto,Models,Services,Data}/**`, `app/backend.Tests/**`, `app/frontend/src/**`, `docs/specs/**`

**Quy mô:** M

## Checkpoint CP07-A — Sau P07-S02

- [ ] Backend test pass bằng lệnh chuẩn.
- [ ] Frontend test/lint/build pass bằng lệnh chuẩn.
- [ ] Lát cắt hiện tại chạy end-to-end.
- [ ] Evidence được gắn trong `todo.md`.
- [ ] Người phụ trách kỹ thuật review.
- [ ] Người phụ trách sản phẩm review nếu hành vi nghiệp vụ thay đổi.


## Step P07-S03 — Hoàn tất thanh toán bán

**Mô tả ngắn:** BE trong transaction hoàn tất payment, hóa đơn, BookCopy và eligible spend.

**Tham chiếu:** Feature/OQ `SALE-005`, `SALE-006`, `SALE-007`; Rule `BR-SALE-001`–`BR-SALE-005`, `BR-GEN-004`–`BR-GEN-009`; Workflow `WF-01`.

**Công việc:**
- [ ] BE trong transaction hoàn tất payment, hóa đơn, BookCopy và eligible spend.
- [ ] FE dùng component tiền mặt/VietQR Phase 06, xử lý retry bằng cùng idempotency key.
- [ ] Test mất kết nối sau thanh toán và không hoàn tất khi tiền thiếu.

**Acceptance:**
- [ ] Thành công tạo đúng một payment, một hóa đơn paid và sách sold.

**Verification:**
- [ ] Transaction test + E2E cả hai phương thức.
- [ ] Các lệnh áp dụng trong bảng `Lệnh chuẩn` pass.

**Dependencies:** `P07-S02`

**Files:** `app/backend/src/{Controllers,Dto,Models,Services,Data}/**`, `app/backend.Tests/**`, `app/frontend/src/**`, `docs/specs/**`

**Quy mô:** M

## Step P07-S04 — Đảo giao dịch quét nhầm

**Mô tả ngắn:** BE chỉ nhận yêu cầu trong 24 giờ, cần Admin duyệt và tạo giao dịch đảo/audit.

**Tham chiếu:** Feature/OQ `SALE-008`; Rule `BR-SALE-001`–`BR-SALE-005`, `BR-GEN-004`–`BR-GEN-009`; Workflow `WF-01`.

**Công việc:**
- [ ] BE chỉ nhận yêu cầu trong 24 giờ, cần Admin duyệt và tạo giao dịch đảo/audit.
- [ ] FE có luồng yêu cầu, duyệt/từ chối và hiển thị liên kết chứng từ gốc–đảo.
- [ ] Test quá hạn, tự duyệt, đảo lặp và tính lại hạng khách.

**Acceptance:**
- [ ] Không sửa hóa đơn paid.
- [ ] tồn kho và eligible spend phản ánh giao dịch đảo.

**Verification:**
- [ ] Integration + E2E đảo giao dịch.
- [ ] Các lệnh áp dụng trong bảng `Lệnh chuẩn` pass.

**Dependencies:** `P07-S03`

**Files:** `app/backend/src/{Controllers,Dto,Models,Services,Data}/**`, `app/backend.Tests/**`, `app/frontend/src/**`, `docs/specs/**`

**Quy mô:** M

## Checkpoint CP07-B — Hoàn tất phase

- [ ] Backend test pass bằng lệnh chuẩn.
- [ ] Frontend test/lint/build pass bằng lệnh chuẩn.
- [ ] Lát cắt hiện tại chạy end-to-end.
- [ ] Evidence được gắn trong `todo.md`.
- [ ] Người phụ trách kỹ thuật review.
- [ ] Người phụ trách sản phẩm review nếu hành vi nghiệp vụ thay đổi.
