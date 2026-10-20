# Chiến lược kiểm thử và cổng nghiệm thu

**Trạng thái:** Proposed

## Kim tự tháp kiểm thử

| Mức | Mục tiêu |
| --- | --- |
| Unit | Công thức tiền, hạng, hạn mức, ngày thuê, phạt, lương và state transition. |
| Integration | Database constraint, transaction, concurrency, RBAC, audit, outbox và idempotency. |
| Contract | Payload/chữ ký webhook ngân hàng, Zalo, Google Books/Open Library. |
| End-to-end | Các workflow WF-01 đến WF-11 qua UI/API thật. |
| UAT | Nhân sự cửa hàng chạy kịch bản tại quầy bằng thiết bị quét Barcode ISBN và CopyBarcode cùng dữ liệu mẫu. |

## Kịch bản bắt buộc

- Hai người đồng thời cố bán/thuê cùng một bản; chỉ một giao dịch thành công.
- Một đầu sách có nhiều ấn bản; hệ thống chọn đúng ấn bản theo metadata đã xác nhận.
- Hai ấn bản/tái bản có cùng ISBN vẫn được phân biệt bằng metadata và khóa nội bộ.
- Sách không có ISBN vẫn tạo được ấn bản thủ công và các bản vật lý có CopyBarcode riêng.
- Nhiều bản vật lý cùng ấn bản có CopyBarcode khác nhau; bán/thuê một bản không đổi trạng thái bản còn lại.
- Webhook trùng hoặc đến muộn không hoàn tất chứng từ hai lần.
- Mất kết nối sau thanh toán không khiến Nhân viên tạo giao dịch trùng.
- Cọc, phí thuê, ưu đãi và tổng chi tiêu được tính đúng cho cả ba hạng.
- Trả sách có quá hạn, hư hỏng, mất hoặc cọc không đủ.
- Chênh lệch kho/két không tự áp dụng nếu chưa được Admin duyệt.
- Người dùng gọi API ngoài quyền bị từ chối và dữ liệu không thay đổi.
- Cấu hình mới không thay đổi giao dịch lịch sử.
- Lỗi ba tích hợp đều đi đúng fallback đã quy định.
- Mọi điều chỉnh chấm công hoặc lương ca có lý do, Admin duyệt và audit.

## Definition of Ready cho một feature spec

- Có feature ID và mục tiêu người dùng.
- Liên kết business rule/decision liên quan.
- Có actor và quyền rõ ràng.
- Có precondition, happy path, alternate/error paths.
- Có data/state transition và idempotency/concurrency nếu liên quan.
- Không còn câu hỏi `P0` ảnh hưởng trực tiếp.
- Có tiêu chí chấp nhận có thể kiểm thử.

## Definition of Done cho triển khai sau này

- Tất cả tiêu chí chấp nhận vượt qua kiểm thử.
- Unit/integration/contract test tương xứng với rủi ro.
- Build, lint và test repository đều thành công.
- Không có secret hoặc dữ liệu nhạy cảm trong code/log/test fixture.
- Spec, decision và API documentation đã được cập nhật.
- Có bằng chứng kiểm thử cho nhánh lỗi và quyền truy cập.

## Cổng trước production

- UAT được người phụ trách sản phẩm chấp thuận.
- Có backup/restore drill và mục tiêu RPO/RTO đã duyệt.
- Có runbook cho lỗi webhook, đối soát và hàng đợi thông báo.
- Quyền production và secret được cấp theo nguyên tắc tối thiểu.
- Mục tiêu hiệu năng, bảo mật và coverage trong `OQ-015` đã được chốt.
