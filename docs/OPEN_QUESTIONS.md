# Câu hỏi và quyết định còn mở

Tài liệu này là hàng đợi quyết định, không phải implementation plan. Mỗi mục phải được giải quyết bằng cập nhật business rule hoặc decision record trước khi triển khai phần bị ảnh hưởng.

| ID | Mức chặn | Câu hỏi cần quyết định | Ảnh hưởng |
| --- | --- | --- | --- |
| OQ-001 | P0 | Backend chính thức là Hono hay ASP.NET Core? PostgreSQL đã được chốt tại [`ADR-001`](./decisions/ADR-001-postgresql-primary-database.md). | Backend, test và deployment |
| OQ-002 | P0 | Chính sách xác thực: JWT hay session, vòng đời OTP, mật khẩu, khóa tài khoản và timeout phiên? | AUTH, bảo mật |
| OQ-003 | P0 | Đơn giá thuê mặc định, cách tính phần ngày lẻ và quy tắc làm tròn tiền là gì? | Thuê–trả, báo cáo |
| OQ-004 | P0 | Các mức hư hỏng, tỷ lệ bồi thường và trạng thái bản sách sau xử lý là gì? | Trả sách, tồn kho, tài chính |
| OQ-005 | P1 | Hoàn cọc có bắt buộc theo phương thức nộp ban đầu không? | Thanh toán, đối soát |
| OQ-006 | P0 | Nhà cung cấp VietQR/ngân hàng, chuẩn ký webhook, retry và quyền đối soát thủ công là gì? | Thanh toán chuyển khoản |
| OQ-007 | P1 | Dùng Zalo OA trực tiếp hay nhà cung cấp trung gian; mẫu tin, lịch nhắc và retry ra sao? | Thông báo khách hàng |
| OQ-008 | P1 | Việc chi tiền mặt vượt số dư lý thuyết của két đang mở được xử lý thế nào? | Ca thu ngân |
| OQ-009 | P1 | Hạn mức giá/tổng phiếu thu mua cho Nhân viên và Quản lý kho là bao nhiêu? | Thu mua, phê duyệt |
| OQ-010 | P1 | Quy tắc ca qua ngày và cơ chế xác thực check-in/check-out là gì? | Chấm công |
| OQ-011 | P1 | Cọc bị giữ, tiền phạt và bồi thường được phân loại kế toán/thuế thế nào? | Báo cáo tài chính/thuế |
| OQ-012 | P2 | Mẫu Excel/PDF và các cột bắt buộc của từng báo cáo là gì? | Xuất báo cáo |
| OQ-013 | P2 | Module ghi nhận yêu cầu khách hàng cần trường, trạng thái và chính sách xóa nào? | Dịch vụ khách hàng |
| OQ-014 | P1 | Mục tiêu định lượng cho hiệu năng, uptime, backup, RPO/RTO và coverage là gì? | NFR, nghiệm thu |

## Quy tắc xử lý

1. `P0`: phải chốt trước khi viết đặc tả hoặc code của vùng ảnh hưởng.
2. `P1`: có thể đặc tả phần không phụ thuộc, nhưng chưa được hoàn tất module.
3. `P2`: có thể trì hoãn tới trước UAT nếu không làm thay đổi mô hình dữ liệu lõi.
4. Khi câu hỏi được giải quyết, ghi decision record hoặc business rule tương ứng, rồi chuyển mục này sang trạng thái đã giải quyết trong lịch sử Git.
