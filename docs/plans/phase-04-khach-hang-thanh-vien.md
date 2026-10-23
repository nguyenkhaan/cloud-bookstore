# Phase 04 — Khách hàng và thành viên

## Mục tiêu

Tạo hồ sơ khách dùng chung cho bán, thuê và thu mua; hạng được tính đúng từ giao dịch hợp lệ.

## Step P04-S01 — Quản lý hồ sơ khách

**Mô tả ngắn:** BE CRUD hồ sơ, chuẩn hóa số điện thoại và phát hiện ứng viên trùng.

**Tham chiếu:** Feature/OQ `CUS-001`, `CUS-002`; Rule `BR-MEMBER-001`–`BR-MEMBER-008`, `BR-GEN-002`; Workflow Customer/member flows.

**Công việc:**
- [ ] BE CRUD hồ sơ, chuẩn hóa số điện thoại và phát hiện ứng viên trùng.
- [ ] FE tìm trước khi tạo, cảnh báo trùng nhưng không tự gộp hồ sơ.
- [ ] Test số điện thoại sai, trùng và quyền xem CCCD/địa chỉ.

**Acceptance:**
- [ ] Tạo/tìm khách nhanh tại quầy.
- [ ] dữ liệu nhạy cảm được che theo quyền.

**Verification:**
- [ ] Integration test + E2E tìm/tạo khách.
- [ ] Các lệnh áp dụng trong bảng `Lệnh chuẩn` pass.

**Dependencies:** `CP02-B`

**Files:** `app/backend/src/{Controllers,Dto,Models,Services,Data}/**`, `app/backend.Tests/**`, `app/frontend/src/**`, `docs/specs/**`

**Quy mô:** M

## Step P04-S02 — Tính chính sách thành viên

**Mô tả ngắn:** BE seed ba hạng, tính hạng từ `eligible_spend` và cung cấp policy hiện hành.

**Tham chiếu:** Feature/OQ `MEMBER-001`–`MEMBER-006`; Rule `BR-MEMBER-001`–`BR-MEMBER-008`, `BR-GEN-002`; Workflow Customer/member flows.

**Công việc:**
- [ ] BE seed ba hạng, tính hạng từ `eligible_spend` và cung cấp policy hiện hành.
- [ ] FE hiển thị hạng, ngưỡng, ưu đãi và hạn mức thuê; không hiển thị điểm tích lũy.
- [ ] Test các mốc dưới/đúng/trên 1 triệu và 3 triệu.

**Acceptance:**
- [ ] Kết quả hạng và ưu đãi đúng PDR-003.
- [ ] cọc/phạt/bồi thường không cộng chi tiêu.

**Verification:**
- [ ] Unit test bảng trường hợp thành viên.
- [ ] Các lệnh áp dụng trong bảng `Lệnh chuẩn` pass.

**Dependencies:** `P04-S01`

**Files:** `app/backend/src/{Controllers,Dto,Models,Services,Data}/**`, `app/backend.Tests/**`, `app/frontend/src/**`, `docs/specs/**`

**Quy mô:** M

## Checkpoint CP04-A — Sau P04-S02

- [ ] Backend test pass bằng lệnh chuẩn.
- [ ] Frontend test/lint/build pass bằng lệnh chuẩn.
- [ ] Lát cắt hiện tại chạy end-to-end.
- [ ] Evidence được gắn trong `todo.md`.
- [ ] Người phụ trách kỹ thuật review.
- [ ] Người phụ trách sản phẩm review nếu hành vi nghiệp vụ thay đổi.


## Step P04-S03 — Tra cứu nghĩa vụ khách

**Mô tả ngắn:** BE trả lịch sử bán, thuê, trả, phạt, thu mua và nghĩa vụ theo phân trang.

**Tham chiếu:** Feature/OQ `CUS-003`; Rule `BR-MEMBER-001`–`BR-MEMBER-008`, `BR-GEN-002`; Workflow Customer/member flows.

**Công việc:**
- [ ] BE trả lịch sử bán, thuê, trả, phạt, thu mua và nghĩa vụ theo phân trang.
- [ ] FE có timeline/bộ lọc và liên kết về chứng từ nguồn.
- [ ] Test quyền, dữ liệu đảo và tổng tiền hiển thị.

**Acceptance:**
- [ ] Mỗi số tiền truy được chứng từ.
- [ ] giao dịch đảo không còn tính vào chi tiêu hợp lệ.

**Verification:**
- [ ] Integration test projection + E2E xem lịch sử.
- [ ] Các lệnh áp dụng trong bảng `Lệnh chuẩn` pass.

**Dependencies:** `P04-S02`

**Files:** `app/backend/src/{Controllers,Dto,Models,Services,Data}/**`, `app/backend.Tests/**`, `app/frontend/src/**`, `docs/specs/**`

**Quy mô:** M

## Step P04-S04 — Xử lý yêu cầu khách hàng

**Mô tả ngắn:** Chốt spec trường dữ liệu, trạng thái, quyền và chính sách xóa/lưu trữ trước khi tạo schema.

**Tham chiếu:** Feature/OQ `CSR-001`; chỉ triển khai nếu policy được duyệt ở Phase 00; Rule `BR-MEMBER-001`–`BR-MEMBER-008`, `BR-GEN-002`; Workflow Customer/member flows.

**Công việc:**
- [ ] Chốt spec trường dữ liệu, trạng thái, quyền và chính sách xóa/lưu trữ trước khi tạo schema.
- [ ] BE tạo API quản lý yêu cầu và audit; FE có danh sách, form và bộ lọc trạng thái.
- [ ] Test quyền, chuyển trạng thái, validation và retention.

**Acceptance:**
- [ ] Nhân viên theo dõi được yêu cầu cơ bản.
- [ ] module không biến thành cổng tự phục vụ cho khách.

**Verification:**
- [ ] Integration test + E2E tạo và xử lý yêu cầu.
- [ ] Các lệnh áp dụng trong bảng `Lệnh chuẩn` pass.

**Dependencies:** `P04-S03`

**Files:** `app/backend/src/{Controllers,Dto,Models,Services,Data}/**`, `app/backend.Tests/**`, `app/frontend/src/**`, `docs/specs/**`

**Quy mô:** M

## Checkpoint CP04-B — Hoàn tất phase

- [ ] Backend test pass bằng lệnh chuẩn.
- [ ] Frontend test/lint/build pass bằng lệnh chuẩn.
- [ ] Lát cắt hiện tại chạy end-to-end.
- [ ] Evidence được gắn trong `todo.md`.
- [ ] Người phụ trách kỹ thuật review.
- [ ] Người phụ trách sản phẩm review nếu hành vi nghiệp vụ thay đổi.
