# ADR-008: Phân biệt lỗi hạ tầng tạm thời (503) với phiên hết hạn (401) khi xác thực và làm mới phiên

## Status

Accepted

## Date

2026-11-28

## Context

`ADR-003` yêu cầu backend xác thực access/refresh JWT kèm JTI allowlist trong Redis và quy định rằng khi refresh thất bại, frontend xóa state phiên và chuyển về trang đăng nhập.
Quyết định ban đầu chưa phân biệt lỗi xác thực thật (token sai, hết hạn, bị thu hồi, thiếu CSRF hoặc tài khoản bị khóa) với gián đoạn hạ tầng tạm thời (Redis REST hoặc PostgreSQL tạm thời không phản hồi).
Nếu backend trả `401` hoặc `500` trong sự cố Redis/PostgreSQL thoáng qua, hệ thống buộc phải đăng xuất nhân viên đang thao tác tại quầy hoặc xóa nhầm cookie phiên hợp lệ dù phiên đó vẫn còn hiệu lực.

## Decision

Bổ sung (không thay thế) `ADR-003` cho cả đường xác thực access token và đường làm mới phiên `POST /api/auth/refresh`:

1. **Fail-closed với `503` khi hạ tầng gián đoạn:** Khi Redis hoặc PostgreSQL gặp lỗi khả dụng tạm thời trong lúc kiểm tra access token (`AccessTokenValidation`), hoặc khi Redis gặp lỗi khả dụng tạm thời trong lúc kiểm tra JTI/CSRF và xoay vòng phiên mới ở `POST /api/auth/refresh`, backend phải fail-closed bằng HTTP `503 Service Unavailable` (không trả `401` hay `500`) và không phát header `Set-Cookie` để xóa cookie xác thực.
2. **Giữ nguyên `401`/`403` cho lỗi xác thực thật:** Refresh token thiếu, sai chữ ký, hết hạn, bị thu hồi hoặc tài khoản không còn hoạt động vẫn trả `401 Unauthorized` và hết hạn cả hai cookie xác thực; CSRF không hợp lệ vẫn trả `403 Forbidden` và không xóa cookie.
3. **Bảo toàn phiên trình duyệt trên `503`:** Khi `POST /api/auth/refresh` hoặc bước phục hồi phiên nhận HTTP `503`, frontend giữ nguyên CSRF token và trạng thái phiên trong memory, không xóa state và không chuyển về `/login`, để cookie và CSRF token ban đầu tiếp tục phục hồi sau khi hạ tầng ổn định lại.
   Với các lỗi refresh mang tính kết thúc phiên (`401` hoặc lỗi không phải `503`), frontend xóa state phiên và điều hướng về `/login` theo đúng `ADR-003`.

## Alternatives Considered

### Xóa phiên và chuyển về `/login` cho mọi lỗi refresh kể cả `503`

Loại vì sự cố Redis/PostgreSQL ngắn hạn sẽ đăng xuất hàng loạt nhân viên đang bán hàng hoặc kiểm kho tại quầy dù phiên người dùng không hề bị thu hồi.

### Cho phép đi tiếp (fail-open) khi Redis gián đoạn

Loại vì làm mất tác dụng kiểm tra JTI allowlist, thu hồi thiết bị và kiểm chứng CSRF trong `ADR-003`.

## Consequences

- Bổ sung cho `ADR-003`; giữ nguyên toàn bộ mô hình HttpOnly cookie, JTI allowlist, CSRF synchronizer và vòng đời thu hồi phiên.
- Tài liệu `docs/specs/AUTH-001-browser-cookie-session.md` và bảng chỉ mục `docs/decisions/README.md` được cập nhật đồng bộ với quy tắc phân tách `503` vs `401`.
- Bộ kiểm thử backend và E2E phải kiểm chứng cả hai hướng: sự cố Redis trả `503` không xóa cookie và phục hồi được, trong khi token không hợp lệ/thu hồi vẫn trả `401` và xóa cookie.

## Affected Artifacts

- `docs/decisions/ADR-003-browser-cookie-authentication.md`
- `docs/decisions/README.md`
- `docs/specs/AUTH-001-browser-cookie-session.md`
- `app/backend/src/Configurations/AccessTokenValidation.cs`
- `app/backend/src/Services/AuthService.cs`
- `app/backend/src/Controllers/AuthController.cs`
- `app/frontend/src/api/client.ts`
