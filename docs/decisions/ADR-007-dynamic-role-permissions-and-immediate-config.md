# ADR-007: Quyền theo thao tác API và cấu hình hiệu lực ngay

## Status
Accepted — lựa chọn 1B, 2A của người dùng ngày 2026-11-20.

## Date
2026-11-20

## Context
RBAC Matrix cũ chỉ lưu nhãn văn bản, không tác động API và có role Quản lý thứ tư. Cấu hình chưa có audit đầy đủ.

## Decision
Giữ ba role của PDR-002. Cho Admin cấp/thu hồi quyền theo từng thao tác API đã triển khai, mặc định giữ quyền cũ. Backend dùng authorization policy đọc cấu hình mỗi request; frontend đọc quyền cùng nguồn. Các thao tác Admin-only hiện tại vẫn được bảo vệ, đặc biệt quyền quản trị RBAC.

Cấu hình mới hiệu lực ngay khi lưu. Snapshot cũ/mới, actor, reason, thời điểm thay đổi và effectiveAt được ghi vào AuditLogs cùng lần lưu dữ liệu. Secret luôn được che trong audit theo ADR-006. Không hẹn hiệu lực hoặc thay giao dịch lịch sử.

## Alternatives Considered
Quyền cố định và cấu hình hẹn ngày hiệu lực không được chọn. Không diễn dịch nhãn tự do từ matrix cũ thành grant.

## Consequences
Mã quyền dựa trên tên controller/action cần được giữ ổn định khi đổi tên API. Khi chưa có cấu hình, mặc định dựa trên role metadata. Sau khi đã lưu matrix, quyền thiếu hoặc API mới chưa có grant được từ chối cho tới khi Admin cấp; quyền Admin-only luôn giữ đường quản trị/khôi phục. Quyền không được lưu dài hạn trong JWT. Màn hình demo chưa có API không được quảng bá là đã có phân quyền backend.

## Affected Artifacts
RBAC-001–003, CONFIG-001–003, [spec](../specs/RBAC-002-CONFIG-002-dynamic-permissions.md), Controllers, authorization policy, SystemSettingsService và frontend.
