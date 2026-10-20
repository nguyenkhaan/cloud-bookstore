# Phase 05 — Nhà cung cấp, nhập kho và thu mua

## Mục tiêu

Đưa sách vào kho từ nhà cung cấp hoặc khách bán, tạo từng bản vật lý và giữ được nguồn gốc cùng dòng tiền.

## Step 1 — Nhà cung cấp và phiếu nhập nháp

**Feature:** `SUP-001`, `INV-001`, `INV-002`.

- [ ] BE quản lý nhà cung cấp và phiếu nhập với state transition rõ.
- [ ] FE tạo phiếu, chọn/tạo ấn bản và nhập từng dòng sách.
- [ ] Test nhà cung cấp ngừng hoạt động, số lượng/giá sai và chuyển trạng thái sai.

**Chấp nhận:** Phiếu nháp không đổi tồn; người dùng chọn đúng ấn bản trước khi thêm dòng.

**Kiểm chứng:** Integration test + E2E tạo phiếu nhập.

**Phạm vi:** M.

## Step 2 — Hoàn tất nhập và tạo bản sách

**Feature:** `INV-001`, `INV-002`, `BOOK-001`, `BOOK-002`.

- [ ] BE hoàn tất phiếu trong transaction và tạo một BookCopy/CopyBarcode cho mỗi cuốn.
- [ ] FE xem trước danh sách mã, in tem và xử lý lỗi mã trùng mà không tạo nửa phiếu.
- [ ] Test rollback, retry và idempotency khi người dùng bấm lại.

**Chấp nhận:** Số bản tạo đúng số lượng; mọi bản truy được dòng phiếu nguồn.

**Kiểm chứng:** Transaction/integration test + E2E hoàn tất phiếu.

**Phụ thuộc:** Step 1.

## Step 3 — Phiếu thu mua từ khách

**Feature:** `BUY-001`–`BUY-004`, `BUY-007`.

- [ ] BE hỗ trợ mỗi dòng một cuốn, Grade, tình trạng, khoảng giá gợi ý và giá thỏa thuận.
- [ ] FE dùng luồng chọn ấn bản/nhập thủ công của Phase 03 và hiển thị rõ giá chỉ là gợi ý.
- [ ] Test Grade A/B/C/D, sách không ISBN và giá ngoài khoảng.

**Chấp nhận:** Mỗi cuốn được đánh giá riêng; chưa chi tiền thì chưa tạo bản khả dụng.

**Kiểm chứng:** Unit test giá gợi ý + E2E lập phiếu.

## Step 4 — Duyệt, chi tiền và hoàn tất thu mua

**Feature:** `BUY-005`, `BUY-006`, `BUY-008`.

- [ ] BE chuyển phiếu vượt hạn mức sang chờ Admin; sau duyệt ghi payment và tạo bản sách atomically.
- [ ] FE có màn hình yêu cầu/duyệt, chọn tiền mặt hoặc ghi nhận chuyển khoản ngoài hệ thống.
- [ ] Test người tạo không tự duyệt, tiền mặt cần ca mở và phiếu đã chi không bị xóa.

**Chấp nhận:** Mọi khoản chi truy được phiếu, người thực hiện và ca két nếu là tiền mặt.

**Kiểm chứng:** RBAC + transaction + E2E duyệt thu mua.

**Phụ thuộc:** Phase 06 Step 1–2 cho phần chi tiền; có thể làm Step 1–3 trước.

## Checkpoint Phase 05

- [ ] Hai nguồn nhập tạo BookCopy theo cùng nguyên tắc.
- [ ] Không có tồn hoặc chi tiền “mồ côi”.
- [ ] Test retry/rollback không tạo mã hoặc payment trùng.

