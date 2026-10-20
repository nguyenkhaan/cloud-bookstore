# PDR-006: Đơn giản hóa chấm công, lương và két cho MVP

## Status

Accepted

## Date

2026-10-20

## Context

MVP cần ghi nhận công, lương và thao tác két tại cửa hàng, nhưng lịch nhân sự đầy đủ, bảng công/bảng lương theo kỳ, phụ cấp và cấu hình lương không thuộc nghiệp vụ lõi hiện tại.

## Decision

- Mỗi bản ghi công là một ca/lần làm; một nhân viên có thể có nhiều ca cùng ngày qua `shift_no`.
- Lưu check-in, check-out, trạng thái công, số phút làm/tăng ca và lương thực nhận theo ca. Mọi sửa công hoặc lương cần lý do và Admin duyệt.
- Ghi nhận trả lương bằng một khoản chi liên kết với ca; chuyển khoản đi vẫn được thực hiện ngoài hệ thống.
- Két dùng một ca két đang mở; chỉ thu/chi tiền mặt mới gắn với ca này. Khi đóng, ghi số kiểm đếm và giải trình chênh lệch; ngoại lệ do Admin duyệt.
- Không triển khai mẫu ca, lịch làm, yêu cầu nghỉ/đổi ca, bảng công/bảng lương theo kỳ, phụ cấp, thưởng, khấu trừ hoặc tạm ứng trong MVP.

## Consequences

- `FEATURE.md`, quy tắc nghiệp vụ và workflow chỉ đặc tả ghi nhận theo ca.
- Báo cáo lương tổng hợp từ các bản ghi ca, không có kỳ lương được chốt.
- Khi cần lập lịch hoặc trả lương định kỳ, phải có PDR mới và bổ sung mô hình dữ liệu.

## Affected Artifacts

- [`FEATURE.md`](../FEATURE.md)
- [`requirements/BUSINESS_RULES.md`](../requirements/BUSINESS_RULES.md)
- [`requirements/WORKFLOWS.md`](../requirements/WORKFLOWS.md)
- [`DATABASE.txt`](../DATABASE.txt)
