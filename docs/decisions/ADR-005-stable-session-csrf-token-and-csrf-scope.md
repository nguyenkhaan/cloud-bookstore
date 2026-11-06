# ADR-005: CSRF token ổn định theo phiên và phạm vi kiểm tra CSRF

## Status

Accepted

## Date

2026-11-06

## Context

`ADR-003` chốt synchronizer CSRF token lưu hash trong Redis theo access JTI. Khi triển khai:

- Mỗi lần gọi `GET /api/auth/session` backend phát hành token **ngẫu nhiên mới** và ghi đè token cũ của cùng phiên.
- Frontend giữ token trong `sessionStorage`, vốn tách riêng theo tab.
- `CsrfProtectionMiddleware` kiểm tra CSRF với **mọi** request unsafe mang cookie access hợp lệ, kể cả các endpoint không cần đăng nhập như `/api/auth/login`.

Lỗi quan sát được ngày 2026-11-06 trên môi trường local: chỉ cần một tab khác (hoặc lần tải trang khác) đọc session là token của tab hiện tại hết hiệu lực. `POST /api/auth/logout` bị `403`, phiên server vẫn sống (`/api/auth/session` trả `200`), frontend vẫn xoá token và chuyển về trang đăng nhập. Sau đó `POST /api/auth/login` bị `403` vì cookie cũ còn hợp lệ nhưng request không còn CSRF token. Người dùng bị kẹt, không đăng nhập lại được.

## Decision

1. **Token ổn định theo phiên.** CSRF token = `Base64Url(HMAC-SHA256(K, accessJti))`. Khóa `K` được dẫn xuất bằng HKDF-SHA256 từ `Jwt:AccessSecret:Key` với info `cloud-bookstore:csrf-token:v1`, để khóa ký JWT không bị dùng trực tiếp cho mục đích thứ hai. Mọi lần đọc session của cùng một phiên đều trả cùng một token. Redis vẫn lưu hash token theo JTI: phiên chỉ hợp lệ khi bản ghi còn tồn tại, và logout xoá bản ghi này như trước.
2. **Phạm vi CSRF.** Middleware chỉ kiểm tra CSRF với endpoint yêu cầu authorization (có `IAuthorizeData` và không có `IAllowAnonymous`). Các endpoint không cần đăng nhập (login, register, verify, gửi lại xác minh, quên/đặt lại mật khẩu, refresh) không bị cookie phiên cũ chặn. Chúng vẫn qua allowlist Origin của `UnsafeOriginValidationMiddleware`, và refresh vẫn tự kiểm tra CSRF trong service.
3. **Từ chối có mã.** CSRF bị từ chối trả `403` kèm `{"code":"CSRF_TOKEN_INVALID"}`, để client phân biệt với `403` do phân quyền.
4. **Client tự phục hồi một lần.** Khi nhận `CSRF_TOKEN_INVALID`, frontend đọc lại `GET /api/auth/session` để lấy token hiện hành rồi gửi lại request đúng một lần. Áp dụng cho request unsafe của `privateClient` và cho logout. `signOut` chờ logout hoàn tất rồi mới xoá trạng thái cục bộ.

## Alternatives Considered

### Chỉ trả lại token cũ nếu còn trong Redis

Loại vì Redis chỉ giữ hash, không thể trả lại token gốc. Lưu token dạng rõ trong Redis thì làm yếu quyết định lưu hash của `ADR-003`.

### Bỏ CSRF cho logout

Loại vì logout vẫn hành động bằng danh tính cookie. Thay vào đó client tự phục hồi token rồi gửi lại.

### Thêm secret CSRF riêng trong cấu hình

Hợp lệ nhưng tăng thêm một secret phải cấp cho mọi môi trường. HKDF từ secret sẵn có cho tách biệt khóa mà không cần cấu hình mới. Có thể tách thành secret riêng sau nếu chính sách xoay vòng khóa yêu cầu.

## Consequences

- Nhiều tab của cùng một phiên dùng chung một CSRF token. Đọc lại session không còn vô hiệu hoá tab khác.
- Sau refresh token (JTI mới), tab khác vẫn giữ token của JTI cũ cho tới lần request unsafe đầu tiên. Lúc đó client nhận `CSRF_TOKEN_INVALID`, đọc lại session và gửi lại một lần.
- Xoay `Jwt:AccessSecret:Key` cũng đổi khóa CSRF. Mọi phiên đều mất hiệu lực, điều vốn đã xảy ra vì JWT cũng mất hiệu lực.
- Bổ sung, không thay thế, `ADR-003`.

## Affected Artifacts

`app/backend/src/Infrastructure/CsrfTokenService.cs`, `CsrfTokenSigningKey.cs`, `app/backend/src/Configurations/CsrfProtectionMiddleware.cs`, `app/backend/Program.cs`, `app/frontend/src/api/client.ts`, `app/frontend/src/features/auth/auth.service.ts`, `app/frontend/src/context/auth-provider.tsx`, `docs/guides/cookie-authorization.md`.
