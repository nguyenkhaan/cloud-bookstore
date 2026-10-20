# Decision records

Thư mục này lưu lý do và hệ quả của các quyết định khó đảo ngược. Không xóa record cũ; khi thay đổi, tạo record mới và đánh dấu record cũ `Superseded`.

## Tiền tố

- `PDR`: Product Decision Record — phạm vi, vai trò và chính sách nghiệp vụ.
- `ADR`: Architecture Decision Record — framework, database, auth, API và hạ tầng.

## Vòng đời

`Proposed` → `Accepted` → `Superseded` hoặc `Deprecated`

## Mẫu

```markdown
# ADR-NNN: Tên quyết định

## Status
Proposed

## Date
YYYY-MM-DD

## Context
Vấn đề, ràng buộc và lý do cần quyết định.

## Decision
Quyết định cụ thể.

## Alternatives Considered
Các phương án và lý do không chọn.

## Consequences
Hệ quả tích cực, tiêu cực và công việc kéo theo.

## Affected Artifacts
Feature, business rule, spec hoặc mã nguồn bị ảnh hưởng.
```

## Danh sách hiện tại

| Record | Trạng thái | Nội dung |
| --- | --- | --- |
| [`PDR-001`](./PDR-001-internal-store-only.md) | Accepted | Hệ thống chỉ phục vụ nội bộ cửa hàng |
| [`PDR-002`](./PDR-002-three-roles-and-approval.md) | Accepted | Ba role và Admin duyệt ngoại lệ |
| [`PDR-003`](./PDR-003-rental-and-membership-policy.md) | Accepted | Chính sách thuê và thành viên |
| [`PDR-004`](./PDR-004-required-integrations-and-fallbacks.md) | Accepted | Tích hợp thật và fallback |
| [`PDR-005`](./PDR-005-title-edition-copy-identification.md) | Accepted | Tách đầu sách, ấn bản và bản vật lý |
| [`PDR-006`](./PDR-006-simple-staff-payroll-and-cash.md) | Accepted | Chấm công, lương và két tối giản cho MVP |
| [`PDR-007`](./PDR-007-dual-channel-book-copy-availability.md) | Accepted | Bản sách mặc định dùng được cho cả bán và thuê |
| [`ADR-001`](./ADR-001-postgresql-primary-database.md) | Accepted | PostgreSQL là cơ sở dữ liệu chính |

Quyết định backend và xác thực vẫn mở tại [`OPEN_QUESTIONS.md`](../OPEN_QUESTIONS.md).
