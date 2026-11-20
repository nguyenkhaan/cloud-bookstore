# RBAC-002 / CONFIG-002 — Quyền động và cấu hình hiệu lực ngay

## Status
Accepted — người dùng chọn 1B, 2A ngày 2026-11-20; quyền nhạy cảm tiếp tục theo PDR-002.

## Objective
Admin cấp hoặc thu hồi quyền cho ba role; API thực thi thay đổi ngay. Mọi lần lưu cấu hình có lịch sử truy vết.

## References
`RBAC-001`–`RBAC-003`, `CONFIG-001`–`CONFIG-003`, `PDR-002`, `ADR-006`, `BR-CONFIG-001`.

## Actors and Permissions
Admin quản trị quyền và cấu hình. Nhân viên (`CASHIER`), Quản lý kho (`INVENTORY_MANAGER`) nhận quyền theo role. Các API vốn chỉ Admin (duyệt ngoại lệ, đổi role, quản trị cấu hình và audit toàn hệ thống) vẫn chỉ Admin; không được tự khóa quyền quản trị RBAC.

## Preconditions
Có phiên đăng nhập hợp lệ. Danh mục quyền lấy từ thao tác API thực sự được triển khai, không dùng nhãn tự do hoặc màn hình demo để giả lập quyền backend.

## Main Flow
1. Admin tải danh mục quyền và quyền hiện tại của ba role.
2. Chỉnh ô cho phép/từ chối, nhập lý do và lưu.
3. Lưu quyền và audit trong cùng lần SaveChanges; request tiếp theo kiểm tra cấu hình mới.
4. Các cấu hình thuê, thành viên và tích hợp cũng lưu audit cùng thay đổi dữ liệu.

## Alternate and Error Flows
Danh mục thiếu/trùng/quyền lạ, thay quyền bị bảo vệ hoặc lý do trống trả 400, không thay dữ liệu. Lỗi tải không cho chỉnh bảng mẫu. Cấu hình quyền hỏng không được coi là cho phép.

## Data and State Changes
Dùng SystemSettings và AuditLogs hiện có. Mỗi audit có giá trị trước/sau, actor, lý do, thời điểm thay đổi và effectiveAt bằng thời điểm lưu. Snapshot tích hợp che secret; không sửa giao dịch đã hoàn tất. Bảng nhãn RBAC cũ không được diễn dịch thành quyền thật.

## Acceptance Criteria
- Cấp quyền ngoài role mặc định cho phép API đó; thu hồi chặn request tiếp theo bằng 403, cả với phiên đang đăng nhập.
- Chỉ có ba cột role. Quyền Admin-only không thể cấp cho hai role khác hoặc tắt quyền Admin.
- API và giao diện dùng cùng mã quyền; nút sửa/xóa/tạo liên quan phản ánh quyền được cấp.
- Mỗi lần lưu cả bốn nhóm cấu hình tạo audit cùng lần lưu; effectiveAt không có lịch hẹn.
- Audit không chứa secret plaintext; thay đổi quyền và membership có đủ giá trị cũ/mới.
- Người dùng thường chỉ đọc được danh sách quyền của chính role mình; lịch sử cấu hình chỉ Admin.

## Non-functional Requirements
Không thêm dependency hoặc migration; không cache quyết định quyền qua nhiều request; không bỏ validation domain hoặc điều kiện Admin trong xử lý ngoại lệ.

## Open Questions
Không mở rộng quyền động cho màn hình hiện chưa có API nghiệp vụ; bổ sung khi API được triển khai.
