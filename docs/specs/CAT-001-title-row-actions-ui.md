# Spec: CAT-001 — Xóa Đầu sách từ dòng danh sách

## Status

Accepted

## Objective

Giúp Admin và Quản lý kho xóa một Đầu sách/tập chưa có Ấn bản ngay tại `/catalog/titles`, bằng xác nhận rõ ràng và không thay đổi luồng chỉnh sửa hiện có ở trang chi tiết đầu sách.

## References

- Feature `CAT-001`, `CAT-002`
- Rule `BR-CAT-001`, `BR-CAT-002`
- `PDR-005` — Book hierarchy
- `BookTitlesController` — `DELETE /api/book-titles/{id}`

## Actors and Permissions

- UI phục vụ Admin và Quản lý kho; backend tiếp tục quyết định quyền xóa.

## Preconditions

- Người dùng đang xem danh sách Đầu sách/tập tại `/catalog/titles`.
- Mỗi dòng có `id` và `name` từ truy vấn danh sách.

## Main Flow

1. Mỗi dòng Đầu sách có một icon thùng rác riêng, sau liên kết “Xem ấn bản”.
2. Chọn icon mở `ConfirmationDialog` dùng chung với tên Đầu sách và cảnh báo điều kiện xóa.
3. Chọn “Xóa đầu sách” gọi `DELETE /api/book-titles/{id}`; nút bị khóa và hiện “Đang xóa…” đến khi hoàn tất.
4. Thành công đóng dialog, invalidates catalog query, và dòng biến mất sau khi danh sách làm mới.

## Alternate and Error Flows

- Icon không điều hướng tới trang chi tiết/ấn bản.
- Backend từ chối xóa khi Đầu sách còn Ấn bản: dialog giữ mở và hiển thị lỗi/hướng dẫn ngừng sử dụng.
- Đóng dialog bằng Hủy, backdrop hoặc Escape trả focus về icon thùng rác.

## Data and State Changes

- Chỉ gọi `DELETE /api/book-titles/{id}` sau xác nhận rõ ràng.
- Mutation thành công invalidates catalog query hiện có.
- Không gọi API ảnh và không thay đổi form/chỉnh sửa đầu sách đang có.

## Acceptance Criteria

- Given một dòng Đầu sách, when người dùng chọn icon thùng rác, then `ConfirmationDialog` xuất hiện thay vì xóa ngay.
- Given xác nhận xóa, when request đang chạy, then nút xóa bị khóa và hiển thị “Đang xóa…”.
- Given backend trả lỗi, when request kết thúc, then dialog vẫn mở và hiển thị lỗi để người dùng xử lý.
- Given xóa thành công, when request kết thúc, then dialog đóng và dòng bị xóa sau khi query được làm mới.
- Given dialog đóng, when focus quay lại, then focus nằm trên icon đã mở dialog.

## Non-functional Requirements

- Icon có accessible name, focus ring rõ, target tối thiểu 44×44 px và dùng Lucide outline icon.
- Không thêm dependency, không sửa OpenAPI contract, và không thay đổi UI ngoài action trong dòng Đầu sách.

## Open Questions

Không có câu hỏi P0 ảnh hưởng lát cắt này.
