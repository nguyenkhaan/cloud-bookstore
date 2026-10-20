# PDR-002: Ba vai trò và Admin phê duyệt ngoại lệ

## Status

Accepted

## Date

2026-10-20

## Context

Tài liệu cũ dùng nhiều tên vai trò chồng lấn: Admin gốc, Admin, Quản lý, Thu ngân, Nhân viên kho và Nhân viên. Cửa hàng cần mô hình đơn giản nhưng vẫn tách vận hành quầy và kho.

## Decision

MVP có đúng ba vai trò: Admin, Nhân viên và Quản lý kho. Nhân viên là thu ngân đứng quầy. Chỉ Admin được duyệt ngoại lệ nhạy cảm; hai vai trò còn lại chỉ thao tác trong quyền hoặc tạo yêu cầu.

## Alternatives Considered

- Role Quản lý riêng: loại để tránh thêm cấp quyền/phê duyệt không tồn tại trong vận hành đã chốt.
- Cho Quản lý kho tự duyệt điều chỉnh: loại vì vi phạm phân tách người đề nghị và người duyệt.
- Quyền tùy biến cho từng tài khoản: chưa cần trong MVP; chỉ xem xét bằng decision mới.

## Consequences

- Các yêu cầu cũ ghi “Quản lý duyệt” được ánh xạ sang Admin.
- Backend phải bảo vệ quyền độc lập với việc frontend ẩn/hiện nút.
- Mọi phê duyệt lưu đầy đủ người yêu cầu, người duyệt và lý do.

## Affected Artifacts

`product/ROLES.md`, nhóm `RBAC-*`, mọi workflow có bước phê duyệt.
