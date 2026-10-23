# Quy trình SDD cho dự án

## 1. Specify

1. Chọn feature ID trong [`FEATURE.md`](../FEATURE.md).
2. Đọc decision, business rule, workflow và NFR liên quan.
3. Giải quyết câu hỏi P0 trước khi chốt đặc tả.
4. Viết spec theo [`specs/README.md`](../specs/README.md).
5. Người phụ trách sản phẩm duyệt rõ ràng; đổi trạng thái thành `Accepted`.

## 2. Plan

Chỉ bắt đầu sau khi spec được duyệt. Plan phải chỉ ra dependency, thứ tự, rủi ro, checkpoint và cách kiểm chứng. Plan được lưu duy nhất trong [`docs/plans/`](../plans/README.md); không tạo bản sao trong `tasks/`.

## 3. Tasks

Tách plan thành lát cắt nhỏ, mỗi task có acceptance, verification, dependency, file dự kiến và quy mô. Theo dõi trạng thái tại [`docs/plans/todo.md`](../plans/todo.md); không dùng `FEATURE.md` như task tracker.

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
