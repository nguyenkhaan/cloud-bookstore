# ADR-002: ASP.NET Core là backend chính thức

## Status

Accepted

## Date

2026-10-23

## Context

Repository đã có solution .NET 10, ứng dụng ASP.NET Core, Entity Framework Core, PostgreSQL provider và project kiểm thử xUnit. Dự án cần một backend duy nhất để thống nhất cách phát triển, kiểm thử, triển khai và vận hành.

## Decision

Dùng ASP.NET Core trên .NET 10 làm backend chính thức. Backend được duy trì trong `app/backend/`, dùng Entity Framework Core để truy cập PostgreSQL theo `ADR-001`, và được build/test từ `backend.sln`.

Các đặc tả, kế hoạch, hướng dẫn và quyết định tiếp theo phải dùng stack này. Việc thay đổi backend trong tương lai cần một ADR mới đánh dấu record này là `Superseded`.

## Alternatives Considered

### Thay thế backend hiện có bằng một framework khác

Phương án này cho phép khởi tạo lại kiến trúc, nhưng đòi hỏi viết lại nền tảng đang có, tạo thêm chi phí chuyển đổi và làm phân tán năng lực vận hành. Phương án bị từ chối vì không đem lại lợi ích đủ lớn cho phạm vi hiện tại.

## Consequences

- Các lệnh `dotnet restore`, `dotnet build`, `dotnet test` và `dotnet run` là lệnh backend chuẩn.
- Phase 01 có thể triển khai trực tiếp trên solution hiện có mà không cần bước chọn lại framework.
- Tuyển chọn thư viện, middleware, hosting và observability phải tương thích với ASP.NET Core trên .NET 10.
- Cơ chế xác thực vẫn cần một quyết định riêng tại `ADR-003`.

## Affected Artifacts

- `backend.sln`
- `app/backend/`
- `app/backend.Tests/`
- `docs/PROJECT_SPEC.md`
- `docs/plans/`
- `docs/architecture/SYSTEM_CONTEXT.md`
