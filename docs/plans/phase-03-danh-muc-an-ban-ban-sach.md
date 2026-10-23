# Phase 03 — Danh mục, ấn bản và bản sách

## Mục tiêu

Quản lý đúng mô hình `Bộ sách → Đầu sách/tập → Ấn bản → Bản vật lý`, phân biệt ISBN và CopyBarcode.

## Step P03-S01 — Quản lý phân cấp danh mục

**Mô tả ngắn:** BE tạo migration, API CRUD có phân trang/lọc và quy tắc ngừng sử dụng thay vì xóa dữ liệu đã được tham chiếu.

**Tham chiếu:** Feature/OQ `CAT-001`–`CAT-003`; Rule `BR-CAT-001`–`BR-COPY-002`, `BR-INV-001`, `BR-INV-004`–`BR-INV-007`, `BR-INT-001`–`BR-INT-002`; Workflow `WF-06` (phần nhận diện sách).

**Công việc:**
- [ ] BE tạo migration, API CRUD có phân trang/lọc và quy tắc ngừng sử dụng thay vì xóa dữ liệu đã được tham chiếu.
- [ ] FE có màn hình danh sách/form cho Quản lý kho và chế độ chỉ xem cho vai trò khác.
- [ ] Test quan hệ bộ–tập, thể loại và quyền.

**Acceptance:**
- [ ] Sách độc lập không cần bộ.
- [ ] một bộ có nhiều tập.
- [ ] dữ liệu đã dùng không bị xóa vật lý.

**Verification:**
- [ ] Integration test + E2E tạo bộ và tập.
- [ ] Các lệnh áp dụng trong bảng `Lệnh chuẩn` pass.

**Dependencies:** `CP02-B`

**Files:** `app/backend/src/{Controllers,Dto,Models,Services,Data}/**`, `app/backend.Tests/**`, `app/frontend/src/**`, `docs/specs/**`

**Quy mô:** M

## Step P03-S02 — Tra cứu ấn bản bằng ISBN

**Mô tả ngắn:** BE lưu ISBN tùy chọn, không unique; adapter Google Books/Open Library chỉ trả gợi ý.

**Tham chiếu:** Feature/OQ `EDITION-001`–`EDITION-003`, `INT-BOOK-001`, `INT-BOOK-002`., `INTEGRATION-003`; Rule `BR-CAT-001`–`BR-COPY-002`, `BR-INV-001`, `BR-INV-004`–`BR-INV-007`, `BR-INT-001`–`BR-INT-002`; Workflow `WF-06` (phần nhận diện sách).

**Công việc:**
- [ ] BE lưu ISBN tùy chọn, không unique; adapter Google Books/Open Library chỉ trả gợi ý.
- [ ] FE cho phép quét/nhập ISBN, chọn ứng viên, xác nhận metadata hoặc nhập thủ công.
- [ ] Test cùng ISBN cho nhiều ấn bản, sách không ISBN và API ngoài lỗi.

**Acceptance:**
- [ ] Nhân viên phải xác nhận NXB/năm/lần in/định dạng trước khi lưu.
- [ ] lỗi API không chặn nhập thủ công.

**Verification:**
- [ ] Contract test adapter + E2E hai ấn bản cùng ISBN.
- [ ] Các lệnh áp dụng trong bảng `Lệnh chuẩn` pass.

**Dependencies:** `P03-S01`

**Files:** `app/backend/src/{Controllers,Dto,Models,Services,Data}/**`, `app/backend.Tests/**`, `app/frontend/src/**`, `docs/specs/**`

**Quy mô:** M

## Checkpoint CP03-A — Sau P03-S02

- [ ] Backend test pass bằng lệnh chuẩn.
- [ ] Frontend test/lint/build pass bằng lệnh chuẩn.
- [ ] Lát cắt hiện tại chạy end-to-end.
- [ ] Evidence được gắn trong `todo.md`.
- [ ] Người phụ trách kỹ thuật review.
- [ ] Người phụ trách sản phẩm review nếu hành vi nghiệp vụ thay đổi.


## Step P03-S03 — Quản lý bản vật lý

**Mô tả ngắn:** BE quản lý CopyBarcode unique, Grade, giá, nguồn, trạng thái và khả năng `BOTH/SALE_ONLY/RENTAL_ONLY`.

**Tham chiếu:** Feature/OQ `BOOK-001`–`BOOK-003`, `BOOK-005`–`BOOK-007`; Rule `BR-CAT-001`–`BR-COPY-002`, `BR-INV-001`, `BR-INV-004`–`BR-INV-007`, `BR-INT-001`–`BR-INT-002`; Workflow `WF-06` (phần nhận diện sách).

**Công việc:**
- [ ] BE quản lý CopyBarcode unique, Grade, giá, nguồn, trạng thái và khả năng `BOTH/SALE_ONLY/RENTAL_ONLY`.
- [ ] FE có form tạo/định giá, xem lịch sử trạng thái và in/tái in tem theo quyền.
- [ ] Test không cho `AVAILABLE` khi thiếu ấn bản, tình trạng, CopyBarcode hoặc giá bán.

**Acceptance:**
- [ ] Tái in tem không tạo bản mới.
- [ ] thay đổi kênh/trạng thái có audit.

**Verification:**
- [ ] Constraint test + E2E tạo hai bản cùng ấn bản với hai CopyBarcode.
- [ ] Các lệnh áp dụng trong bảng `Lệnh chuẩn` pass.

**Dependencies:** `P03-S02`

**Files:** `app/backend/src/{Controllers,Dto,Models,Services,Data}/**`, `app/backend.Tests/**`, `app/frontend/src/**`, `docs/specs/**`

**Quy mô:** M

## Step P03-S04 — Tra cứu chi tiết bản sách

**Mô tả ngắn:** BE tìm theo CopyBarcode, ISBN, tên, tác giả, Grade, trạng thái và kênh; phân trang ở server.

**Tham chiếu:** Feature/OQ `BOOK-004`, `INV-007`; Rule `BR-CAT-001`–`BR-COPY-002`, `BR-INV-001`, `BR-INV-004`–`BR-INV-007`, `BR-INT-001`–`BR-INT-002`; Workflow `WF-06` (phần nhận diện sách).

**Công việc:**
- [ ] BE tìm theo CopyBarcode, ISBN, tên, tác giả, Grade, trạng thái và kênh; phân trang ở server.
- [ ] FE tối ưu cho máy quét/bàn phím, hiển thị rõ ấn bản và bản vật lý.
- [ ] Test kết quả không lẫn các bản có cùng ISBN.

**Acceptance:**
- [ ] Quét CopyBarcode mở đúng một bản.
- [ ] quét ISBN trả danh sách ấn bản ứng viên.

**Verification:**
- [ ] E2E tìm kiếm bằng hai loại mã.
- [ ] Các lệnh áp dụng trong bảng `Lệnh chuẩn` pass.

**Dependencies:** `P03-S03`

**Files:** `app/backend/src/{Controllers,Dto,Models,Services,Data}/**`, `app/backend.Tests/**`, `app/frontend/src/**`, `docs/specs/**`

**Quy mô:** M

## Checkpoint CP03-B — Hoàn tất phase

- [ ] Backend test pass bằng lệnh chuẩn.
- [ ] Frontend test/lint/build pass bằng lệnh chuẩn.
- [ ] Lát cắt hiện tại chạy end-to-end.
- [ ] Evidence được gắn trong `todo.md`.
- [ ] Người phụ trách kỹ thuật review.
- [ ] Người phụ trách sản phẩm review nếu hành vi nghiệp vụ thay đổi.
