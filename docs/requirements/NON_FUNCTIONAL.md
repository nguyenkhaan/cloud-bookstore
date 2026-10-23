# Yêu cầu phi chức năng

**Trạng thái:** Proposed  
Các giá trị định lượng còn thiếu được theo dõi tại `OQ-014`.

## NFR-SEC — Bảo mật

- Xác thực bắt buộc cho mọi chức năng nội bộ trừ health check phù hợp.
- Phân quyền được thực thi tại backend theo ba vai trò chuẩn.
- Secret chỉ đến từ secret manager hoặc biến môi trường; không ghi log hoặc trả về client.
- Mật khẩu được băm bằng thuật toán phù hợp; OTP/token không lưu dạng đọc được.
- Webhook phải xác thực chữ ký/nguồn gửi trước khi tác động dữ liệu.
- Dữ liệu CCCD, lương và tài chính phải có quyền xem riêng và được che trên giao diện/log khi không cần thiết.

## NFR-DATA — Toàn vẹn dữ liệu

- Dùng ràng buộc unique cho CopyBarcode và các idempotency key.
- ISBN phải được chuẩn hóa/lập chỉ mục để tra cứu nhưng không dùng làm khóa chính hoặc ràng buộc duy nhất cho ấn bản.
- Dùng transaction cho chuyển trạng thái sách cùng giao dịch tài chính liên quan.
- Dùng optimistic/pessimistic concurrency phù hợp để ngăn bán/thuê trùng.
- Dữ liệu tài chính hoàn tất là append-only ở góc độ nghiệp vụ.
- Mọi thời điểm lưu theo chuẩn thống nhất; hiển thị theo múi giờ cửa hàng `Asia/Ho_Chi_Minh`.

## NFR-RES — Khả năng phục hồi

- Lỗi Google Books/Open Library phải cho phép nhập thủ công.
- Lỗi VietQR/webhook phải cho phép tiền mặt hoặc đối soát, không giả định giao dịch thất bại.
- Lỗi Zalo/email phải ghi trạng thái và retry, không rollback giao dịch nguồn.
- API nhận webhook và thao tác hoàn tất tài chính phải idempotent.
- Backup, retention và RPO/RTO cần được chốt trước production.

## NFR-PERF — Hiệu năng

- Thao tác quét CopyBarcode, tìm khách và thêm dòng giao dịch phải phản hồi đủ nhanh cho quầy bán hàng.
- Danh sách lớn phải phân trang/lọc ở server.
- Báo cáo nặng và xuất file không được khóa luồng POS.
- Mục tiêu p95, tải đồng thời và thời gian xuất báo cáo còn mở.

## NFR-OBS — Quan sát và kiểm toán

- Log có correlation/request ID và không chứa secret hoặc dữ liệu nhạy cảm không cần thiết.
- Theo dõi lỗi tích hợp, webhook thất bại, hàng đợi retry và giao dịch cần đối soát.
- Audit log phân biệt sự kiện bảo mật, thay đổi cấu hình và thay đổi nghiệp vụ.
- Có health check cho ứng dụng, database và trạng thái tích hợp ở mức an toàn.

## NFR-UX — Khả dụng tại quầy

- Luồng POS ưu tiên bàn phím/máy quét và giảm số lần chuyển màn hình.
- Lỗi phải nêu rõ bản ghi nào, trạng thái hiện tại và hành động khắc phục.
- Không chỉ dùng màu sắc để truyền đạt trạng thái.
- Xác nhận rõ trước thao tác không thể hoàn tác; không dùng xác nhận dư thừa cho thao tác an toàn.

## NFR-PRIV — Quyền riêng tư

- Chỉ thu thập dữ liệu khách hàng cần cho giao dịch.
- Dữ liệu CCCD và địa chỉ chỉ bắt buộc khi quy tắc thuê yêu cầu.
- Quyền truy cập lương, CCCD và lịch sử tài chính theo nguyên tắc tối thiểu.
- Chính sách lưu trữ/xóa dữ liệu cá nhân cần được xác nhận trước production.

## NFR-MAINT — Khả năng bảo trì

- Feature, business rule, API và test phải truy vết bằng ID ổn định.
- Tham số nghiệp vụ có thể thay đổi phải nằm trong cấu hình có phiên bản/thời điểm hiệu lực.
- Tích hợp bên ngoài đi qua adapter để fallback và contract test độc lập.
- Thay đổi hành vi cần cập nhật spec/decision trước code.
