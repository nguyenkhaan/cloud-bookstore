# Spec: CAT-001 — Chỉnh sửa Bộ sách từ Book Card

## Status

Accepted

## Objective

Giúp Admin và Quản lý kho cập nhật thông tin, ảnh bìa hoặc xóa một Bộ sách không có Đầu sách/tập trực thuộc ngay trên từng thẻ tại `/catalog/series`, trong khi giữ nguyên bố cục và luồng đi tới đầu sách.

## References

- Feature `CAT-001`
- Rule `BR-CAT-001`
- `PDR-005` — Book hierarchy
- `BookSeriesController` — các endpoint `PUT /api/book-series/{id}`, `PATCH /api/book-series/{id}/status`, `PUT /api/book-series/{id}/image`, `DELETE /api/book-series/{id}`
- [`fe-direct-upload.md`](../guides/fe-direct-upload.md) — direct upload có upload intent một lần

## Actors and Permissions

- UI này được thiết kế cho Admin và Quản lý kho; backend tiếp tục là nơi quyết định quyền ghi.
- Thay ảnh dùng endpoint riêng. Backend cũng cho phép Thu ngân thực hiện endpoint ảnh; UI phải hiển thị và tôn trọng phản hồi quyền của backend.

## Preconditions

- Người dùng đang xem danh sách Bộ sách.
- Mỗi thẻ có dữ liệu `name`, `description`, `isActive` và `imageUrl` từ truy vấn hiện tại.

## Main Flow

1. Người dùng nhìn thấy nút biểu tượng Sửa và Xóa trong vùng action riêng của thẻ.
2. Chọn Sửa mở dialog “Chỉnh sửa bộ sách”, với tab “Thông tin chung” và “Ảnh bìa”.
3. Tab Thông tin chung hiển thị tên, mô tả và trạng thái hiện tại. Người dùng chọn Lưu thay đổi; nút bị khóa và hiển thị “Đang lưu…” đến khi hoàn tất.
4. Frontend gửi tên/mô tả tới `PUT /api/book-series/{id}`. Nếu trạng thái đã đổi, frontend tiếp tục gọi `PATCH /api/book-series/{id}/status` để giữ quy tắc backend khi ngừng Bộ sách sẽ ngừng các Đầu sách/tập đang hoạt động.
5. Trong tab Ảnh bìa, người dùng chọn JPEG, PNG hoặc WebP không quá 10 MB. Frontend xin signature/intention từ backend, tải file **trực tiếp** lên Cloudinary, rồi hiện preview từ `secure_url` của Cloudinary.
6. Sau khi tải file thành công, frontend gửi `imageUpload` tới `PUT /api/book-series/{id}/image`. Backend xác thực intent và chữ ký Cloudinary, lưu ảnh mới, audit, rồi mới xoá ảnh cũ sau khi commit.
7. Chọn Xóa mở `ConfirmationDialog` dùng chung. Khi xác nhận, frontend gọi `DELETE /api/book-series/{id}`; nút bị khóa và hiển thị “Đang xóa…” đến khi hoàn tất.
8. Xóa thành công đóng dialog và làm mới danh sách. Đóng dialog bằng nút đóng, nền phủ, hoặc phím Escape.

## Alternate and Error Flows

- Nút trong vùng action không điều hướng vào trang đầu sách.
- Nếu tên trống hoặc backend trả lỗi, dialog giữ nguyên dữ liệu người dùng vừa nhập, hiển thị lỗi gần thao tác và mở lại nút lưu.
- Nếu cập nhật tên/mô tả thành công nhưng cập nhật trạng thái thất bại, thông báo phải nói rõ rằng một phần thay đổi đã được lưu.
- Khi direct upload thất bại, ảnh cũ vẫn hiển thị. Nếu gắn ảnh thất bại sau khi upload, UI giữ preview mới cùng lỗi để người dùng biết ảnh đó chưa được lưu; backend vẫn giữ ảnh cũ. Với lỗi gắn ảnh `400`, giữ kết quả upload để thử gửi lại cùng intent; với `409`, bỏ kết quả đó và yêu cầu chọn/tải lại ảnh.
- Nếu backend từ chối xóa, dialog vẫn mở và hiển thị lỗi. Với lỗi Bộ sách còn Đầu sách/tập trực thuộc, người dùng được hướng dẫn ngừng sử dụng thay vì xóa.
- Không gọi `DELETE /api/book-series/{id}/image` trong lát cắt này.

## Data and State Changes

- `PUT /api/book-series/{id}` cập nhật `name` và `description`.
- `PATCH /api/book-series/{id}/status` chỉ chạy khi `isActive` đổi; không gửi `isActive` qua `PUT` vì endpoint status mới áp dụng cascade xuống Đầu sách/tập.
- Direct upload không truyền file qua backend. Frontend chỉ gửi `imageUpload` được Cloudinary trả về vào `PUT /api/book-series/{id}/image`.
- `DELETE /api/book-series/{id}` chỉ thành công khi Bộ sách không có Đầu sách/tập trực thuộc; mutation thành công invalidates danh sách Bộ sách.
- Mỗi mutation thành công invalidates truy vấn danh sách Bộ sách để thẻ hiển thị response mới của backend.

## Acceptance Criteria

- Given một Book Card, when người dùng chọn biểu tượng Sửa hoặc Xóa, then thao tác không điều hướng card.
- Given biểu tượng Sửa, when được chọn, then dialog mở với hai tab và các trường đúng dữ liệu của card.
- Given thông tin chung hợp lệ, when người dùng lưu, then nút bị khóa, hiển thị “Đang lưu…” và danh sách phản ánh response mới sau khi thành công.
- Given trạng thái bị đổi, when người dùng lưu, then frontend dùng endpoint status để backend áp dụng quy tắc ngừng Đầu sách/tập con.
- Given tab Ảnh bìa, when người dùng chọn ảnh hợp lệ, then ảnh vừa upload được preview trên UI trước hoặc trong khi backend gắn ảnh vào Bộ sách.
- Given ảnh đang upload hoặc đang được gắn, then không thể khởi tạo thêm upload/gắn ảnh trùng.
- Given lỗi upload, then lỗi được thông báo cạnh tab ảnh và ảnh hiện có không bị thay thế trên UI; given lỗi gắn ảnh sau upload, then preview mới được giữ để thử lưu lại trong khi backend vẫn giữ ảnh cũ.
- Given biểu tượng Xóa, when được chọn, then dialog xác nhận xuất hiện thay vì xóa ngay.
- Given xác nhận xóa, when request đang chạy, then nút xóa bị khóa và hiển thị “Đang xóa…”.
- Given backend trả lỗi xoá, when request kết thúc, then dialog vẫn mở và hiển thị lỗi để người dùng xử lý.
- Given xóa thành công, when request kết thúc, then dialog đóng và Bộ sách biến mất khỏi danh sách sau khi truy vấn được làm mới.
- Given một màn hình khác cần xác nhận, then màn hình đó có thể tái sử dụng `ConfirmationDialog` và truyền các nút riêng trong `actions`.
- Given một dialog, when nhấn Escape hoặc đóng dialog, then focus trở về nút đã mở dialog.
- Giao diện giữ hệ màu slate/indigo, không sửa phần tử ngoài Book Card và các dialog mới.

## Non-functional Requirements

- Nút icon có accessible name, kích thước chạm tối thiểu 44px và focus ring rõ ràng.
- Dialog có `role="dialog"`, `aria-modal`, focus hợp lý và không tạo horizontal overflow ở 390px.
- Không thêm dependency, không chỉnh sửa API contract sinh tự động và không chuyển file ảnh qua backend.

## Open Questions

Không có P0 ảnh hưởng tới lát cắt UI này.
