# Spec: EDITION-001 / BOOK-001 — Quản lý ấn bản và bản sách tại trang chi tiết đầu sách

## Status
Accepted — xác nhận phạm vi trực tiếp bởi người yêu cầu ngày 2026-11-08.

## Objective
Admin và Quản lý kho tạo, sửa, xóa an toàn ấn bản và bản sách vật lý, có ảnh bìa và phản hồi lỗi rõ ràng trên trang chi tiết.

## References
- `EDITION-001`–`EDITION-003`, `BOOK-001`–`BOOK-003`, `BOOK-007`; `BR-EDITION-001`–`BR-EDITION-004`, `BR-INV-005`; `PDR-005`, `PDR-007`.

## Actors and Permissions
Admin và Quản lý kho ghi dữ liệu; các vai trò khác chỉ xem. Backend kiểm tra quyền ở từng endpoint.

## Preconditions
Tạo bản sách cần dòng phiếu nhập còn chỗ cho đúng ấn bản; backend sinh `CopyBarcode`. Ảnh JPEG/PNG/WebP tối đa 10 MB theo signed direct upload hiện có.

## Main Flow
Từ chi tiết đầu sách, tạo hoặc mở ấn bản để sửa thông tin, ảnh, trạng thái, xóa. Từ chi tiết ấn bản, chọn dòng phiếu nhập, tạo bản vật lý, mở bản để sửa, thay ảnh riêng hoặc xóa. Ảnh bản vật lý ưu tiên ảnh riêng, thiếu thì dùng ảnh ấn bản.

## Alternate and Error Flows
Không có dòng phiếu nhập thì giải thích lý do không thể tạo. Xóa ấn bản có bản sách hoặc dòng phiếu nhập thì từ chối và hướng dẫn ngừng sử dụng. Xóa bản vật lý chỉ khi chưa có giao dịch hoặc lịch sử kiểm kê tham chiếu; khi có lịch sử, chuyển `DISCONTINUED` nếu trạng thái cho phép. Bản đang thuê hoặc gắn giao dịch bán hiệu lực không đổi danh tính, giá, kênh, tình trạng hay trạng thái; vẫn sửa ghi chú và ảnh được. Lỗi API/upload giữ nguyên form và hiển thị thông báo.

## Data and State Changes
Ảnh chỉ được lưu qua upload intent đã xác minh. Xóa vật lý kiểm tra tham chiếu tại backend. Ghi nhận audit cho thay đổi bản sách; không dùng ISBN thay `CopyBarcode`.

## Acceptance Criteria
1. Tạo ấn bản và bản vật lý với ảnh thành công; bản vật lý có barcode do backend cấp.
2. Sửa thông tin và ảnh của cả hai cấp; ảnh bản vật lý thiếu thì hiện ảnh ấn bản.
3. Nút Xóa yêu cầu xác nhận; dữ liệu chưa có tham chiếu được xóa; dữ liệu có lịch sử được hướng dẫn ngừng sử dụng.
4. Bản đang giao dịch chỉ sửa ghi chú/ảnh; backend từ chối thay đổi trường nghiệp vụ.
5. Vai trò chỉ xem không thấy nút ghi; khi thất bại, lỗi được hiển thị và dữ liệu nhập giữ nguyên.

## Non-functional Requirements
Giữ bố cục danh mục hiện tại, dùng component chung, hỗ trợ bàn phím, màn hình nhỏ và trạng thái đang xử lý.

## Open Questions
Không có câu hỏi P0 tác động tới phạm vi này.
