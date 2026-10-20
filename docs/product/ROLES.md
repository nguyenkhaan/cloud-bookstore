# Vai trò và quyền hạn

**Trạng thái:** Accepted

MVP có đúng ba vai trò nghiệp vụ. Tên “Quản lý” hoặc “Thu ngân” trong tài liệu cũ không tạo thêm role; trách nhiệm đó được ánh xạ vào Admin hoặc Nhân viên.

## Ma trận quyền cấp cao

| Năng lực | Admin | Nhân viên | Quản lý kho |
| --- | :---: | :---: | :---: |
| Quản lý tài khoản và vai trò | Có | Không | Không |
| Cấu hình chính sách nghiệp vụ | Có | Không | Không |
| Phê duyệt ngoại lệ nhạy cảm | Có | Không | Không |
| Xem audit log toàn hệ thống | Có | Không | Theo phạm vi kho nếu được cấp |
| Bán, thuê, gia hạn, trả sách | Có | Có | Không mặc định |
| Thu mua sách từ khách | Có | Có | Có thể tạo/đánh giá, không tự duyệt ngoại lệ |
| Thu/chi và quản lý ca thu ngân | Có | Có | Không mặc định |
| Danh mục và metadata sách | Có | Tra cứu | Có |
| Nhập/xuất, cấp/in `CopyBarcode`, kiểm kê | Có | Tra cứu theo giao dịch | Có |
| Điều chỉnh chênh lệch kho | Duyệt/thực hiện | Không | Tạo yêu cầu |
| Hồ sơ khách hàng | Có | Có | Chỉ xem khi nghiệp vụ cần |
| Chấm công theo ca | Có | Check-in/out và tạo yêu cầu sửa | Check-in/out và tạo yêu cầu sửa |
| Duyệt điều chỉnh công/lương ca | Có | Không | Không |
| Xem lương | Toàn bộ | Bản thân | Bản thân |
| Báo cáo tài chính | Có | Theo ca/giao dịch của mình | Báo cáo kho |

## Admin

- Có toàn quyền vận hành và là cấp phê duyệt duy nhất.
- Quản lý tài khoản, cấu hình, nhân sự, công theo ca, lương theo ca và báo cáo.
- Duyệt thay đổi giá, thu mua vượt hạn mức, chênh lệch kho/két, giao dịch đảo và điều chỉnh dữ liệu đã khóa.
- Tài khoản Admin gốc được bảo vệ khỏi hạ quyền, khóa hoặc xóa bằng luồng thông thường.

## Nhân viên

- Là nhân viên thu ngân đứng tại quầy trong thực tế.
- Thực hiện bán, thuê–trả, gia hạn, thu mua, thanh toán và ca thu ngân.
- Quản lý hồ sơ khách trong phạm vi giao dịch.
- Check-in/out và tạo yêu cầu sửa chấm công khi được cấp quyền.
- Tạo yêu cầu phê duyệt khi vượt quyền; không tự duyệt yêu cầu của mình.

## Quản lý kho

- Quản lý danh mục, metadata, nhà cung cấp, nhập/xuất kho, cấp/in `CopyBarcode`, kiểm kê và cảnh báo tồn.
- Có thể tiếp nhận/thẩm định sách thu mua nếu được phân công, nhưng ngoại lệ vẫn cần Admin duyệt.
- Tạo đề nghị điều chỉnh chênh lệch; không tự áp dụng điều chỉnh nhạy cảm.
- Không thao tác két hoặc giao dịch bán/thuê mặc định.

## Quy tắc bắt buộc

- Backend là nơi ra quyết định quyền cuối cùng.
- Mọi lần từ chối quyền phải trả lỗi rõ ràng và không thay đổi dữ liệu.
- Mọi phê duyệt lưu người yêu cầu, người duyệt, giá trị trước/sau, lý do và thời điểm.
- Không tồn tại role “Quản lý” thứ tư trong MVP.
