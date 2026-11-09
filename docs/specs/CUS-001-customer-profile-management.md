# Spec: CUS-001 / CUS-002 — Quản lý hồ sơ khách hàng & Chuẩn hóa phát hiện trùng lặp

## Status
Accepted

## Objective
Cho phép nhân viên quầy và quản lý tạo, tra cứu, chỉnh sửa hồ sơ khách hàng phục vụ các nghiệp vụ bán sách, cho thuê và thu mua; chuẩn hóa số điện thoại di động Việt Nam để phát hiện trùng lặp ngay khi nhập liệu tại quầy.

## References
- Feature IDs: `CUS-001`, `CUS-002`, `MEMBER-001`
- Business Rules: `BR-GEN-001`, `BR-GEN-002`, `BR-MEMBER-001`–`BR-MEMBER-008`
- Decision Records: `PDR-001`, `PDR-003`
- Database Schema: `docs/DATABASE.txt` (`customers`, `membership_tiers`)
- Figma Design Reference: [Cloud Bookstore - CRM / Khách hàng](https://www.figma.com/design/ylSYDMUTYepn3GJ8eyeImv/Cloud-Bookstore?node-id=30-25012)
  - `SCR-CRM-01` (Node ID: `30:25012`): Danh sách Khách hàng & Hạng thành viên
  - `SCR-CRM-02` (Node ID: `30:25106`): Hồ sơ Khách hàng & Lịch sử giao dịch 360°

## Actors and Permissions
- `Admin`: Toàn quyền xem, tạo, cập nhật, gắn cờ vi phạm (`is_flagged`), xóa hồ sơ (nếu chưa có giao dịch).
- `Employee` (Nhân viên / Thu ngân): Được xem danh sách, tra cứu và tạo nhanh khách hàng tại quầy.
- `Warehouse` (Quản lý kho): Được xem và tạo khách hàng phục vụ quy trình thu mua sách cũ.
- `Customer`: Không có tài khoản đăng nhập và không có giao diện tự phục vụ (`BR-GEN-002`).

## Preconditions
- Hệ thống đã seed các hạng thành viên (`REGULAR`, `SILVER`, `GOLD`) trong bảng `membership_tiers`.
- Người dùng đã đăng nhập vào hệ thống quầy.

## Main Flow
1. Nhân viên truy cập menu **Khách hàng** (`/customers`).
2. Giao diện hiển thị các thẻ chỉ số tổng hợp (Tổng khách, Khách Bạc, Khách Vàng, Khách có ghi nhận công nợ/quá hạn/vi phạm) và bảng danh sách khách hàng phân trang theo thiết kế Figma `SCR-CRM-01`.
3. Nhân viên có thể tìm kiếm theo tên, số điện thoại hoặc CCCD; hoặc lọc theo hạng thành viên.
4. Để tạo khách hàng mới, nhân viên bấm nút **"+ Thêm mới khách hàng"** để mở dialog/modal.
5. Nhân viên nhập Họ tên và Số điện thoại (kèm Email, CCCD, Địa chỉ tùy chọn).
6. Khi nhập số điện thoại, hệ thống tự động chuẩn hóa dạng `0xxxxxxxxx` và thực hiện kiểm tra ứng viên trùng qua API.
7. Nếu số điện thoại chưa tồn tại, nhân viên bấm **"Thêm khách hàng · Hạng Thường"**.
8. Backend lưu khách hàng với hạng mặc định `REGULAR`, `eligible_spend = 0`, trả về mã 201 Created.
9. Frontend đóng dialog, hiển thị thông báo thành công và làm mới bảng dữ liệu.

## Alternate and Error Flows
- **Số điện thoại không hợp lệ:** Nếu số điện thoại không đủ 10 chữ số hoặc không bắt đầu bằng đầu số di động Việt Nam (`03`, `05`, `07`, `08`, `09`), hệ thống báo lỗi ngay tại trường nhập.
- **Phát hiện trùng lặp:** Khi phát hiện số điện thoại đã tồn tại trong hệ thống, giao diện hiển thị cảnh báo thông tin khách hàng đã sở hữu số này. Nếu cố tình submit, backend trả về HTTP 409 Conflict.
- **Xóa khách hàng có lịch sử giao dịch:** Backend từ chối xóa và trả về HTTP 400 Bad Request nếu khách hàng đã liên kết với hóa đơn bán lẻ, phiếu thuê hoặc phiếu thu mua.

## Data and State Changes
- Bảng `customers`:
  - `id`: UUID
  - `phone`: varchar(15), unique, đã chuẩn hóa
  - `full_name`: varchar(150), bắt buộc
  - `email`: varchar(255), tùy chọn
  - `national_id`: varchar(20), tùy chọn
  - `address`: text, tùy chọn
  - `tier_id`: UUID tham chiếu hạng `REGULAR` mặc định
  - `eligible_spend`: bigint, khởi tạo 0
  - `is_flagged`: boolean, mặc định false
  - `created_at`: timestamptz
- Không ghi nhận điểm tích lũy (`BR-MEMBER-008`).

## Acceptance Criteria
- [ ] Số điện thoại được chuẩn hóa từ mọi định dạng thông dụng (`+84`, `84`, dấu cách, gạch nối, chấm) về dạng chuẩn 10 số `0xxxxxxxxx`.
- [ ] Có API `GET /api/customers/check-duplicate?phone={phone}` phát hiện trùng lặp.
- [ ] Giao diện danh sách và modal thêm mới tuân thủ đúng bố cục, màu sắc, typography và component của Figma `SCR-CRM-01` (Node ID: `30:25012`).
- [ ] Cảnh báo trùng lặp hiển thị rõ ràng trên dialog nhưng không tự ý gộp hồ sơ.

## Open Questions
- Không có câu hỏi P0 nào mở.
