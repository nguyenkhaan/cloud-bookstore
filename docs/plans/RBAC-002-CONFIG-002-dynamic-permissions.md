# RBAC-002 / CONFIG-002 — Kế hoạch triển khai

Spec: [quyền động và hiệu lực ngay](../specs/RBAC-002-CONFIG-002-dynamic-permissions.md).

1. Tạo test cấp/thu hồi quyền qua authorization thật, bảo vệ Admin và validation danh mục.
2. Thay role attribute nghiệp vụ bằng policy đọc quyền; danh mục lấy metadata controller để giữ mặc định hiện tại và bao phủ API mới.
3. Thay bảng nhãn bốn role bằng matrix ba role với ô checkbox. Đồng bộ quyền UI và lỗi tải.
4. Ghi snapshot trước/sau và effectiveAt vào AuditLogs cùng lần SaveChanges cho bốn nhóm cấu hình; có API lịch sử chỉ Admin và UI tra cứu.
5. Regenerate OpenAPI, kiểm tra backend/frontend và browser; cập nhật bằng chứng tại todo.md.

Phạm vi: Controllers, Configurations/authorization, SystemSettingsService, Settings DTO, tests, frontend settings/catalog/customers và contract sinh tự động.

Rủi ro: giữ nguyên quyền mặc định, không dùng nhãn cũ để cấp quyền; Admin-only không bị nới; không log secret; dữ liệu lịch sử giao dịch không đổi.

Verification: authorization integration tests dùng DI thật + EF InMemory, audit persistence tests, frontend unit tests, build/lint và browser mock. DB và nhà cung cấp thật không nằm trong kiểm tra tự động này.
