# Tài liệu legacy

Các tệp trong thư mục này là bản cũ trước đợt tái cấu trúc ngày 2026-10-20. Chúng được giữ nguyên để truy nguyên ý tưởng, không phải nguồn sự thật cho thiết kế hoặc triển khai.

## Mâu thuẫn đã biết

- Có/không có web portal, đặt giữ và gia hạn tự phục vụ.
- Cọc 70% so với 100% giá bán thực tế.
- Thu phí gia hạn ngay so với quyết toán khi trả.
- Nhiều vai trò cũ so với ba vai trò đã chốt.
- Điểm tích lũy so với chỉ dùng hạng thành viên.
- Zalo hai chiều so với thông báo một chiều.
- Backend ASP.NET Core so với yêu cầu Hono trong README gốc.
- Một số tài liệu gộp đầu sách với ấn bản hoặc dùng “barcode” lẫn lộn giữa ISBN và CopyBarcode.

Các mâu thuẫn sản phẩm đã chốt được ghi trong [`../decisions/`](../decisions/README.md). Xung đột công nghệ còn mở tại [`../OPEN_QUESTIONS.md`](../OPEN_QUESTIONS.md).

## Quy tắc sử dụng

- Không liên kết legacy từ feature spec như một requirement.
- Khi tìm thấy ý tưởng hữu ích chưa có trong tài liệu mới, đưa nó vào `OPEN_QUESTIONS.md` hoặc đề xuất decision record.
- Không chỉnh sửa legacy để phản ánh quyết định mới; lịch sử Git và thư mục này phải giữ được nguồn gốc.
