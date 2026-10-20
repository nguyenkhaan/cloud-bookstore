# Phase 03 — Danh mục, ấn bản và bản sách

## Mục tiêu

Quản lý đúng mô hình `Bộ sách → Đầu sách/tập → Ấn bản → Bản vật lý`, phân biệt ISBN và CopyBarcode.

## Step 1 — Thể loại, bộ sách và đầu sách

**Feature:** `CAT-001`–`CAT-003`.

- [ ] BE tạo migration, API CRUD có phân trang/lọc và quy tắc ngừng sử dụng thay vì xóa dữ liệu đã được tham chiếu.
- [ ] FE có màn hình danh sách/form cho Quản lý kho và chế độ chỉ xem cho vai trò khác.
- [ ] Test quan hệ bộ–tập, thể loại và quyền.

**Chấp nhận:** Sách độc lập không cần bộ; một bộ có nhiều tập; dữ liệu đã dùng không bị xóa vật lý.

**Kiểm chứng:** Integration test + E2E tạo bộ và tập.

**Phạm vi:** M.

## Step 2 — Ấn bản và tra cứu ISBN

**Feature:** `EDITION-001`–`EDITION-003`, `INT-BOOK-001`, `INT-BOOK-002`.

- [ ] BE lưu ISBN tùy chọn, không unique; adapter Google Books/Open Library chỉ trả gợi ý.
- [ ] FE cho phép quét/nhập ISBN, chọn ứng viên, xác nhận metadata hoặc nhập thủ công.
- [ ] Test cùng ISBN cho nhiều ấn bản, sách không ISBN và API ngoài lỗi.

**Chấp nhận:** Nhân viên phải xác nhận NXB/năm/lần in/định dạng trước khi lưu; lỗi API không chặn nhập thủ công.

**Kiểm chứng:** Contract test adapter + E2E hai ấn bản cùng ISBN.

**Phụ thuộc:** Step 1.

## Step 3 — Bản sách và CopyBarcode

**Feature:** `BOOK-001`–`BOOK-003`, `BOOK-005`–`BOOK-007`.

- [ ] BE quản lý CopyBarcode unique, Grade, giá, nguồn, trạng thái và khả năng `BOTH/SALE_ONLY/RENTAL_ONLY`.
- [ ] FE có form tạo/định giá, xem lịch sử trạng thái và in/tái in tem theo quyền.
- [ ] Test không cho `AVAILABLE` khi thiếu ấn bản, tình trạng, CopyBarcode hoặc giá bán.

**Chấp nhận:** Tái in tem không tạo bản mới; thay đổi kênh/trạng thái có audit.

**Kiểm chứng:** Constraint test + E2E tạo hai bản cùng ấn bản với hai CopyBarcode.

## Step 4 — Tìm kiếm và màn hình chi tiết

**Feature:** `BOOK-004`, `INV-007`.

- [ ] BE tìm theo CopyBarcode, ISBN, tên, tác giả, Grade, trạng thái và kênh; phân trang ở server.
- [ ] FE tối ưu cho máy quét/bàn phím, hiển thị rõ ấn bản và bản vật lý.
- [ ] Test kết quả không lẫn các bản có cùng ISBN.

**Chấp nhận:** Quét CopyBarcode mở đúng một bản; quét ISBN trả danh sách ấn bản ứng viên.

**Kiểm chứng:** E2E tìm kiếm bằng hai loại mã.

## Checkpoint Phase 03

- [ ] Test bắt buộc về ISBN/ấn bản/CopyBarcode trong `QUALITY.md` pass.
- [ ] Không có API/UI dùng từ “barcode” mơ hồ.
- [ ] Danh mục sẵn sàng làm đầu vào cho nhập, bán và thuê.

