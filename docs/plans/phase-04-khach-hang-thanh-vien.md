# Phase 04 — Khách hàng và thành viên

## Mục tiêu

Tạo hồ sơ khách dùng chung cho bán, thuê và thu mua; hạng được tính đúng từ giao dịch hợp lệ.

## Step 1 — Hồ sơ và phát hiện trùng

**Feature:** `CUS-001`, `CUS-002`.

- [ ] BE CRUD hồ sơ, chuẩn hóa số điện thoại và phát hiện ứng viên trùng.
- [ ] FE tìm trước khi tạo, cảnh báo trùng nhưng không tự gộp hồ sơ.
- [ ] Test số điện thoại sai, trùng và quyền xem CCCD/địa chỉ.

**Chấp nhận:** Tạo/tìm khách nhanh tại quầy; dữ liệu nhạy cảm được che theo quyền.

**Kiểm chứng:** Integration test + E2E tìm/tạo khách.

**Phạm vi:** M.

## Step 2 — Hạng và chính sách thành viên

**Feature:** `MEMBER-001`–`MEMBER-008`.

- [ ] BE seed ba hạng, tính hạng từ `eligible_spend` và cung cấp policy hiện hành.
- [ ] FE hiển thị hạng, ngưỡng, ưu đãi và hạn mức thuê; không hiển thị điểm tích lũy.
- [ ] Test các mốc dưới/đúng/trên 1 triệu và 3 triệu.

**Chấp nhận:** Kết quả hạng và ưu đãi đúng PDR-003; cọc/phạt/bồi thường không cộng chi tiêu.

**Kiểm chứng:** Unit test bảng trường hợp thành viên.

**Phụ thuộc:** Step 1.

## Step 3 — Lịch sử và nghĩa vụ

**Feature:** `CUS-003`.

- [ ] BE trả lịch sử bán, thuê, trả, phạt, thu mua và nghĩa vụ theo phân trang.
- [ ] FE có timeline/bộ lọc và liên kết về chứng từ nguồn.
- [ ] Test quyền, dữ liệu đảo và tổng tiền hiển thị.

**Chấp nhận:** Mỗi số tiền truy được chứng từ; giao dịch đảo không còn tính vào chi tiêu hợp lệ.

**Kiểm chứng:** Integration test projection + E2E xem lịch sử.

## Step 4 — Yêu cầu của khách hàng

**Feature:** `CSR-001`; chỉ triển khai nếu policy được duyệt ở Phase 00.

- [ ] Chốt spec trường dữ liệu, trạng thái, quyền và chính sách xóa/lưu trữ trước khi tạo schema.
- [ ] BE tạo API quản lý yêu cầu và audit; FE có danh sách, form và bộ lọc trạng thái.
- [ ] Test quyền, chuyển trạng thái, validation và retention.

**Chấp nhận:** Nhân viên theo dõi được yêu cầu cơ bản; module không biến thành cổng tự phục vụ cho khách.

**Kiểm chứng:** Integration test + E2E tạo và xử lý yêu cầu.

## Checkpoint Phase 04

- [ ] Hồ sơ khách dùng lại được ở các nghiệp vụ sau.
- [ ] Công thức hạng có unit test đầy đủ biên.
- [ ] Dữ liệu nhạy cảm không lộ cho vai trò không cần biết.

