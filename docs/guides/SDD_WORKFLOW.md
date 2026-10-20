# Quy trình SDD cho dự án

## 1. Specify

1. Chọn feature ID trong [`FEATURE.md`](../FEATURE.md).
2. Đọc decision, business rule, workflow và NFR liên quan.
3. Giải quyết câu hỏi P0 trước khi chốt đặc tả.
4. Viết spec theo [`specs/README.md`](../specs/README.md).
5. Người phụ trách sản phẩm duyệt rõ ràng; đổi trạng thái thành `Accepted`.

## 2. Plan

Chỉ bắt đầu sau khi spec được duyệt. Plan phải chỉ ra dependency, thứ tự, rủi ro, checkpoint và cách kiểm chứng. Plan không nằm trong bộ tài liệu hiện tại và chưa được tạo ở bước tái cấu trúc này.

## 3. Tasks

Tách plan thành lát cắt nhỏ, mỗi task có acceptance, verify và danh sách file dự kiến. Không dùng FEATURE.md như task tracker.

## 4. Implement

- Viết test từ acceptance criteria.
- Triển khai đúng lát cắt đã duyệt.
- Chạy build/lint/test tương ứng.
- Nếu phát hiện yêu cầu sai hoặc thiếu, quay lại cập nhật spec/decision trước.

## 5. Duy trì nguồn sự thật

- Quyết định thay đổi: tạo decision record mới, không xóa lịch sử.
- Phạm vi thay đổi: cập nhật `SCOPE.md` và `FEATURE.md`.
- Quy tắc thay đổi: cập nhật `BUSINESS_RULES.md` và spec bị ảnh hưởng.
- Legacy không được “sửa cho đúng”; giữ nguyên để truy nguyên.
