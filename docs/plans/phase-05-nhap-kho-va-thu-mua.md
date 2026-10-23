# Phase 05 — Nhà cung cấp, nhập kho và thu mua

## Mục tiêu

Đưa sách vào kho từ nhà cung cấp hoặc khách bán, tạo từng bản vật lý và giữ được nguồn gốc cùng dòng tiền.

## Step P05-S01 — Lập phiếu nhập nháp

**Mô tả ngắn:** BE quản lý nhà cung cấp và phiếu nhập với state transition rõ.

**Tham chiếu:** Feature/OQ `SUP-001`, `INV-001`, `INV-002`; Rule `BR-BUY-001`–`BR-BUY-005`, `BR-GEN-006`–`BR-GEN-008`, `BR-INV-001`; Workflow `WF-05`, `WF-06`.

**Công việc:**
- [ ] BE quản lý nhà cung cấp và phiếu nhập với state transition rõ.
- [ ] FE tạo phiếu, chọn/tạo ấn bản và nhập từng dòng sách.
- [ ] Test nhà cung cấp ngừng hoạt động, số lượng/giá sai và chuyển trạng thái sai.

**Acceptance:**
- [ ] Phiếu nháp không đổi tồn.
- [ ] người dùng chọn đúng ấn bản trước khi thêm dòng.

**Verification:**
- [ ] Integration test + E2E tạo phiếu nhập.
- [ ] Các lệnh áp dụng trong bảng `Lệnh chuẩn` pass.

**Dependencies:** `CP03-B`

**Files:** `app/backend/src/{Controllers,Dto,Models,Services,Data}/**`, `app/backend.Tests/**`, `app/frontend/src/**`, `docs/specs/**`

**Quy mô:** M

## Step P05-S02 — Hoàn tất phiếu nhập

**Mô tả ngắn:** BE hoàn tất phiếu trong transaction và tạo một BookCopy/CopyBarcode cho mỗi cuốn.

**Tham chiếu:** Feature/OQ `INV-001`, `INV-002`, `BOOK-001`, `BOOK-002`; Rule `BR-BUY-001`–`BR-BUY-005`, `BR-GEN-006`–`BR-GEN-008`, `BR-INV-001`; Workflow `WF-05`, `WF-06`.

**Công việc:**
- [ ] BE hoàn tất phiếu trong transaction và tạo một BookCopy/CopyBarcode cho mỗi cuốn.
- [ ] FE xem trước danh sách mã, in tem và xử lý lỗi mã trùng mà không tạo nửa phiếu.
- [ ] Test rollback, retry và idempotency khi người dùng bấm lại.

**Acceptance:**
- [ ] Số bản tạo đúng số lượng.
- [ ] mọi bản truy được dòng phiếu nguồn.

**Verification:**
- [ ] Transaction/integration test + E2E hoàn tất phiếu.
- [ ] Các lệnh áp dụng trong bảng `Lệnh chuẩn` pass.

**Dependencies:** `P05-S01`

**Files:** `app/backend/src/{Controllers,Dto,Models,Services,Data}/**`, `app/backend.Tests/**`, `app/frontend/src/**`, `docs/specs/**`

**Quy mô:** M


## Step P05-S03 — Lập phiếu thu mua

**Mô tả ngắn:** BE hỗ trợ mỗi dòng một cuốn, Grade, tình trạng, khoảng giá gợi ý và giá thỏa thuận.

**Tham chiếu:** Feature/OQ `BUY-001`–`BUY-004`, `BUY-007`; Rule `BR-BUY-001`–`BR-BUY-005`, `BR-GEN-006`–`BR-GEN-008`, `BR-INV-001`; Workflow `WF-05`, `WF-06`.

**Công việc:**
- [ ] BE hỗ trợ mỗi dòng một cuốn, Grade, tình trạng, khoảng giá gợi ý và giá thỏa thuận.
- [ ] FE dùng luồng chọn ấn bản/nhập thủ công của Phase 03 và hiển thị rõ giá chỉ là gợi ý.
- [ ] Test Grade A/B/C/D, sách không ISBN và giá ngoài khoảng.

**Acceptance:**
- [ ] Mỗi cuốn được đánh giá riêng.
- [ ] chưa chi tiền thì chưa tạo bản khả dụng.

**Verification:**
- [ ] Unit test giá gợi ý + E2E lập phiếu.
- [ ] Các lệnh áp dụng trong bảng `Lệnh chuẩn` pass.

**Dependencies:** `P05-S02`, `CP04-B`

**Files:** `app/backend/src/{Controllers,Dto,Models,Services,Data}/**`, `app/backend.Tests/**`, `app/frontend/src/**`, `docs/specs/**`

**Quy mô:** M

## Checkpoint CP05-A — Hoàn tất 05A sau P05-S03

- [ ] Backend test pass bằng lệnh chuẩn.
- [ ] Frontend test/lint/build pass bằng lệnh chuẩn.
- [ ] Lát cắt hiện tại chạy end-to-end.
- [ ] Evidence được gắn trong `todo.md`.
- [ ] Người phụ trách kỹ thuật review.
- [ ] Người phụ trách sản phẩm review nếu hành vi nghiệp vụ thay đổi.



## Step P05-S04 — Hoàn tất thu mua

**Mô tả ngắn:** BE chuyển phiếu vượt hạn mức sang chờ Admin; sau duyệt ghi payment và tạo bản sách atomically.

**Tham chiếu:** Feature/OQ `BUY-005`, `BUY-006`, `BUY-008`; Rule `BR-BUY-001`–`BR-BUY-005`, `BR-GEN-006`–`BR-GEN-008`, `BR-INV-001`; Workflow `WF-05`, `WF-06`.

**Công việc:**
- [ ] BE chuyển phiếu vượt hạn mức sang chờ Admin; sau duyệt ghi payment và tạo bản sách atomically.
- [ ] FE có màn hình yêu cầu/duyệt, chọn tiền mặt hoặc ghi nhận chuyển khoản ngoài hệ thống.
- [ ] Test người tạo không tự duyệt, tiền mặt cần ca mở và phiếu đã chi không bị xóa.

**Acceptance:**
- [ ] Mọi khoản chi truy được phiếu, người thực hiện và ca két nếu là tiền mặt.

**Verification:**
- [ ] RBAC + transaction + E2E duyệt thu mua.
- [ ] Các lệnh áp dụng trong bảng `Lệnh chuẩn` pass.

**Dependencies:** `P05-S03`, `P06-S01`, `P06-S02`

**Files:** `app/backend/src/{Controllers,Dto,Models,Services,Data}/**`, `app/backend.Tests/**`, `app/frontend/src/**`, `docs/specs/**`

**Quy mô:** M

## Checkpoint CP05-B — Hoàn tất phase

- [ ] Backend test pass bằng lệnh chuẩn.
- [ ] Frontend test/lint/build pass bằng lệnh chuẩn.
- [ ] Lát cắt hiện tại chạy end-to-end.
- [ ] Evidence được gắn trong `todo.md`.
- [ ] Người phụ trách kỹ thuật review.
- [ ] Người phụ trách sản phẩm review nếu hành vi nghiệp vụ thay đổi.
