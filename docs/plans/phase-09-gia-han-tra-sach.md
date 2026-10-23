# Phase 09 — Gia hạn, trả sách và quyết toán

## Mục tiêu

Hoàn thiện vòng đời thuê: gia hạn đúng rule, nhận đủ sách, tính nghĩa vụ và quyết toán cọc.

## Step P09-S01 — Gia hạn tại quầy

**Mô tả ngắn:** BE kiểm tra còn hạn, tối đa hai lần/bảy ngày; lưu hạn cũ/mới và phí phát sinh snapshot.

**Tham chiếu:** Feature/OQ `EXT-001`, `EXT-002`; Rule `BR-RENT-006`–`BR-RENT-008`, `BR-RETURN-001`–`BR-RETURN-003`, `BR-LATE-001`–`BR-LOST-001`; Workflow `WF-03`, `WF-04`.

**Công việc:**
- [ ] BE kiểm tra còn hạn, tối đa hai lần/bảy ngày; lưu hạn cũ/mới và phí phát sinh snapshot.
- [ ] FE hiển thị số lần còn lại, hạn mới và phí dự kiến; không mở chức năng cho khách tự làm.
- [ ] Test đúng hạn, quá hạn, lần thứ ba và cấu hình thay đổi.

**Acceptance:**
- [ ] Gia hạn không thu tiền ngay.
- [ ] lịch sử không bị ghi đè.

**Verification:**
- [ ] Unit/integration + E2E WF-03.
- [ ] Các lệnh áp dụng trong bảng `Lệnh chuẩn` pass.

**Dependencies:** `CP08-B`, `CP06-B`

**Files:** `app/backend/src/{Controllers,Dto,Models,Services,Data}/**`, `app/backend.Tests/**`, `app/frontend/src/**`, `docs/specs/**`

**Quy mô:** M

## Step P09-S02 — Tiếp nhận trả toàn bộ

**Mô tả ngắn:** BE tạo đúng một lượt trả cho phiếu và yêu cầu đủ mọi CopyBarcode hoặc đánh dấu mất theo quyền.

**Tham chiếu:** Feature/OQ `RETURN-001`, `RETURN-002`; Rule `BR-RENT-006`–`BR-RENT-008`, `BR-RETURN-001`–`BR-RETURN-003`, `BR-LATE-001`–`BR-LOST-001`; Workflow `WF-03`, `WF-04`.

**Công việc:**
- [ ] BE tạo đúng một lượt trả cho phiếu và yêu cầu đủ mọi CopyBarcode hoặc đánh dấu mất theo quyền.
- [ ] FE có checklist quét, tình trạng từng bản và cảnh báo bản không thuộc phiếu.
- [ ] Test trả thiếu, quét trùng và trả từng phần bị từ chối.

**Acceptance:**
- [ ] Không quyết toán khi còn bản chưa xử lý.

**Verification:**
- [ ] Integration + E2E nhận trả.
- [ ] Các lệnh áp dụng trong bảng `Lệnh chuẩn` pass.

**Dependencies:** `P09-S01`

**Files:** `app/backend/src/{Controllers,Dto,Models,Services,Data}/**`, `app/backend.Tests/**`, `app/frontend/src/**`, `docs/specs/**`

**Quy mô:** M

## Checkpoint CP09-A — Sau P09-S02

- [ ] Backend test pass bằng lệnh chuẩn.
- [ ] Frontend test/lint/build pass bằng lệnh chuẩn.
- [ ] Lát cắt hiện tại chạy end-to-end.
- [ ] Evidence được gắn trong `todo.md`.
- [ ] Người phụ trách kỹ thuật review.
- [ ] Người phụ trách sản phẩm review nếu hành vi nghiệp vụ thay đổi.


## Step P09-S03 — Tính nghĩa vụ trả

**Mô tả ngắn:** BE tính từ snapshot và policy đã chốt; ngoại lệ hư hỏng ngoài khung cần Admin duyệt.

**Tham chiếu:** Feature/OQ `RETURN-003`, `RETURN-006`., `RENT-005`; Rule `BR-RENT-006`–`BR-RENT-008`, `BR-RETURN-001`–`BR-RETURN-003`, `BR-LATE-001`–`BR-LOST-001`; Workflow `WF-03`, `WF-04`.

**Công việc:**
- [ ] BE tính từ snapshot và policy đã chốt; ngoại lệ hư hỏng ngoài khung cần Admin duyệt.
- [ ] FE hiển thị từng thành phần phí và lý do cần duyệt.
- [ ] Test miễn phạt, làm tròn ngày, trần phạt, các mức hư hỏng và sách mất.

**Acceptance:**
- [ ] Công thức cho kết quả đúng ví dụ đã duyệt.
- [ ] FE không tự tính số tiền chính thức.

**Verification:**
- [ ] Unit test bảng trường hợp + approval integration test.
- [ ] Các lệnh áp dụng trong bảng `Lệnh chuẩn` pass.

**Dependencies:** `P09-S02`

**Files:** `app/backend/src/{Controllers,Dto,Models,Services,Data}/**`, `app/backend.Tests/**`, `app/frontend/src/**`, `docs/specs/**`

**Quy mô:** M

## Step P09-S04 — Đóng phiếu thuê

**Mô tả ngắn:** BE khấu trừ cọc, thu thêm hoặc ghi hoàn cọc; cập nhật BookCopy và eligible spend trong transaction.

**Tham chiếu:** Feature/OQ `RETURN-004`, `RETURN-005`; Rule `BR-RENT-006`–`BR-RENT-008`, `BR-RETURN-001`–`BR-RETURN-003`, `BR-LATE-001`–`BR-LOST-001`; Workflow `WF-03`, `WF-04`.

**Công việc:**
- [ ] BE khấu trừ cọc, thu thêm hoặc ghi hoàn cọc; cập nhật BookCopy và eligible spend trong transaction.
- [ ] FE dùng payment component chung, hỗ trợ hoàn tiền mặt hoặc ghi nhận chuyển khoản ngoài hệ thống.
- [ ] Test cọc đủ/thiếu/dư, retry, hoàn thất bại và BookCopy theo tình trạng.

**Acceptance:**
- [ ] Chỉ đóng phiếu khi nghĩa vụ bằng không và thu/hoàn đã xác nhận.

**Verification:**
- [ ] Transaction + E2E WF-04.
- [ ] Các lệnh áp dụng trong bảng `Lệnh chuẩn` pass.

**Dependencies:** `P09-S03`

**Files:** `app/backend/src/{Controllers,Dto,Models,Services,Data}/**`, `app/backend.Tests/**`, `app/frontend/src/**`, `docs/specs/**`

**Quy mô:** M

## Checkpoint CP09-B — Hoàn tất phase

- [ ] Backend test pass bằng lệnh chuẩn.
- [ ] Frontend test/lint/build pass bằng lệnh chuẩn.
- [ ] Lát cắt hiện tại chạy end-to-end.
- [ ] Evidence được gắn trong `todo.md`.
- [ ] Người phụ trách kỹ thuật review.
- [ ] Người phụ trách sản phẩm review nếu hành vi nghiệp vụ thay đổi.
