# Phase 08 — Lập phiếu thuê và thu cọc

## Mục tiêu

Cho thuê đúng hạn mức thành viên, khóa đúng bản vật lý và chỉ giao sách sau khi đủ cọc.

## Step P08-S01 — Kiểm tra điều kiện thuê

**Mô tả ngắn:** BE kiểm tra hồ sơ, nghĩa vụ, quá hạn, cờ chặn, CCCD/địa chỉ theo ngưỡng và hạn mức hạng.

**Tham chiếu:** Feature/OQ `RENT-001`, `RENT-002`; Rule `BR-RENT-001`–`BR-RENT-006`, `BR-GEN-004`–`BR-GEN-005`; Workflow `WF-02`.

**Công việc:**
- [ ] BE kiểm tra hồ sơ, nghĩa vụ, quá hạn, cờ chặn, CCCD/địa chỉ theo ngưỡng và hạn mức hạng.
- [ ] FE tìm/tạo khách, hiển thị lý do bị chặn và dữ liệu còn thiếu.
- [ ] Test các biên số bản/ngày thuê của ba hạng.

**Acceptance:**
- [ ] Mọi lý do chặn rõ ràng.
- [ ] không đổi dữ liệu khi điều kiện không đạt.

**Verification:**
- [ ] Unit rule test + E2E chọn khách.
- [ ] Các lệnh áp dụng trong bảng `Lệnh chuẩn` pass.

**Dependencies:** `CP03-B`, `CP04-B`, `CP06-B`

**Files:** `app/backend/src/{Controllers,Dto,Models,Services,Data}/**`, `app/backend.Tests/**`, `app/frontend/src/**`, `docs/specs/**`

**Quy mô:** M

## Step P08-S02 — Khóa bản cho phiếu thuê

**Mô tả ngắn:** BE chỉ nhận BookCopy `AVAILABLE` có kênh thuê, snapshot giá/đơn giá/hạng và khóa atomically.

**Tham chiếu:** Feature/OQ `RENT-001`, `RENT-002`; Rule `BR-RENT-001`–`BR-RENT-006`, `BR-GEN-004`–`BR-GEN-005`; Workflow `WF-02`.

**Công việc:**
- [ ] BE chỉ nhận BookCopy `AVAILABLE` có kênh thuê, snapshot giá/đơn giá/hạng và khóa atomically.
- [ ] FE quét CopyBarcode, chọn số ngày trong hạn mức và hiển thị hạn trả.
- [ ] Test bán và thuê đồng thời cùng một bản; chỉ một bên thành công.

**Acceptance:**
- [ ] Không thể đưa một bản vào hai giao dịch hiệu lực.

**Verification:**
- [ ] Concurrency integration test + E2E phiếu nháp.
- [ ] Các lệnh áp dụng trong bảng `Lệnh chuẩn` pass.

**Dependencies:** `P08-S01`

**Files:** `app/backend/src/{Controllers,Dto,Models,Services,Data}/**`, `app/backend.Tests/**`, `app/frontend/src/**`, `docs/specs/**`

**Quy mô:** M

## Checkpoint CP08-A — Sau P08-S02

- [ ] Backend test pass bằng lệnh chuẩn.
- [ ] Frontend test/lint/build pass bằng lệnh chuẩn.
- [ ] Lát cắt hiện tại chạy end-to-end.
- [ ] Evidence được gắn trong `todo.md`.
- [ ] Người phụ trách kỹ thuật review.
- [ ] Người phụ trách sản phẩm review nếu hành vi nghiệp vụ thay đổi.


## Step P08-S03 — Thu cọc

**Mô tả ngắn:** BE tính cọc bằng 100% tổng giá bán snapshot và tạo payment tiền mặt/VietQR.

**Tham chiếu:** Feature/OQ `RENT-003`, `RENT-004`; Rule `BR-RENT-001`–`BR-RENT-006`, `BR-GEN-004`–`BR-GEN-005`; Workflow `WF-02`.

**Công việc:**
- [ ] BE tính cọc bằng 100% tổng giá bán snapshot và tạo payment tiền mặt/VietQR.
- [ ] FE hiển thị rõ cọc không phải doanh thu và trạng thái chờ thanh toán.
- [ ] Test cọc không được giảm theo hạng, payment thiếu và retry.

**Acceptance:**
- [ ] Phiếu chỉ active và BookCopy chỉ rented sau khi đủ cọc.

**Verification:**
- [ ] Transaction/idempotency test + E2E thanh toán cọc.
- [ ] Các lệnh áp dụng trong bảng `Lệnh chuẩn` pass.

**Dependencies:** `P08-S02`

**Files:** `app/backend/src/{Controllers,Dto,Models,Services,Data}/**`, `app/backend.Tests/**`, `app/frontend/src/**`, `docs/specs/**`

**Quy mô:** M

## Step P08-S04 — Phát hành chứng từ thuê

**Mô tả ngắn:** BE trả chi tiết phiếu, hạn trả, cọc và lịch sử trạng thái.

**Tham chiếu:** Feature/OQ Không; Rule `BR-RENT-001`–`BR-RENT-006`, `BR-GEN-004`–`BR-GEN-005`; Workflow `WF-02`.

**Công việc:**
- [ ] BE trả chi tiết phiếu, hạn trả, cọc và lịch sử trạng thái.
- [ ] FE có màn hình/in chứng từ tại quầy; tạo sự kiện thông báo để Phase 12 xử lý.
- [ ] Test quyền và dữ liệu snapshot không đổi khi cấu hình mới có hiệu lực.

**Acceptance:**
- [ ] Chứng từ phản ánh đúng dữ liệu tại thời điểm thuê.

**Verification:**
- [ ] Snapshot test + manual check bản in.
- [ ] Các lệnh áp dụng trong bảng `Lệnh chuẩn` pass.

**Dependencies:** `P08-S03`

**Files:** `app/backend/src/{Controllers,Dto,Models,Services,Data}/**`, `app/backend.Tests/**`, `app/frontend/src/**`, `docs/specs/**`

**Quy mô:** M

## Checkpoint CP08-B — Hoàn tất phase

- [ ] Backend test pass bằng lệnh chuẩn.
- [ ] Frontend test/lint/build pass bằng lệnh chuẩn.
- [ ] Lát cắt hiện tại chạy end-to-end.
- [ ] Evidence được gắn trong `todo.md`.
- [ ] Người phụ trách kỹ thuật review.
- [ ] Người phụ trách sản phẩm review nếu hành vi nghiệp vụ thay đổi.
