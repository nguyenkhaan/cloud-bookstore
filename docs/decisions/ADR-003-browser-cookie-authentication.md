# ADR-003: Xác thực trình duyệt bằng JWT trong cookie HttpOnly

## Status

Accepted

## Date

2026-10-27

## Context

Frontend React và backend ASP.NET Core được triển khai ở các domain khác nhau. Phiên hiện tại lưu access/refresh JWT trong `localStorage`, khiến JavaScript có thể đọc token và khiến rủi ro XSS trở thành rủi ro chiếm đoạt phiên. Backend đã dùng JWT, Redis JTI allowlist, khóa tài khoản và thời hạn token; quyết định này chỉ thay đổi cơ chế vận chuyển và lưu trữ phiên trong browser.

Cookie double-submit không dùng được vì JavaScript ở frontend domain không thể đọc cookie do backend domain đặt. Cần một CSRF token riêng mà frontend có thể nhận qua CORS và gửi lại bằng header.

## Decision

- Backend tiếp tục phát hành JWT access/refresh và lưu JTI trong Redis, nhưng gửi chúng qua `Set-Cookie` thay vì JSON. Cookie là `HttpOnly`; deployment cross-site bắt buộc `Secure` và `SameSite=None`.
- Tên, lifetime, path và chính sách secure của cookie được cấu hình từ `AuthCookies`; access cookie chỉ dùng trong `/api`, refresh cookie bị giới hạn trong `/api/auth`.
- Backend lấy access token từ cookie trước. Chỉ khi không có access cookie, JWT bearer handler mới dùng `Authorization: Bearer <token>` để giữ tương thích tạm thời với non-browser caller.
- Login, refresh và kiểm tra session chỉ trả một synchronizer CSRF token; chúng không trả access/refresh token trong JSON. Frontend chỉ giữ CSRF token trong memory.
- Backend ràng buộc và kiểm chứng CSRF token với phiên server-side trong Redis. Mọi request unsafe dùng cookie phải gửi `X-CSRF-Token`; bearer-only request không cần CSRF token. Login và các request unsafe anonymous phải vượt qua allowlist Origin nghiêm ngặt.
- Refresh token được dùng để cấp một cặp JWT mới và vô hiệu hóa cặp cũ. Refresh thất bại khiến frontend xóa state phiên và chuyển về trang đăng nhập.
- CORS chỉ chấp nhận danh sách frontend origin cấu hình rõ ràng, cho phép credentials và header `X-CSRF-Token`; tuyệt đối không dùng wildcard khi credentials bật.

## Alternatives Considered

### Giữ JWT trong localStorage

Không chọn vì XSS có thể đọc và trích xuất access/refresh token.

### Cookie double-submit với cookie CSRF đọc được ở frontend

Không chọn vì frontend và backend là các domain độc lập, nên browser không cho frontend đọc cookie thuộc backend domain.

### Chỉ kiểm tra Origin/Referer

Không chọn làm cơ chế chính vì thiếu proof-of-possession token và dễ phụ thuộc vào cấu hình proxy/browser. Origin allowlist vẫn là lớp bảo vệ bổ sung.

## Consequences

- FE phải bật `withCredentials`, giữ CSRF token ngoài persistent storage, bootstrap session khi tải trang, và refresh/retry đúng một lần sau `401`.
- BE phải thêm cookie, CSRF, CORS và token-source handling; hợp đồng OpenAPI và TypeScript generated contract phải được tái sinh.
- Production phải chạy HTTPS và cấu hình frontend origin chính xác. Môi trường local chỉ có thể nới secure/same-site qua cấu hình Development, không được đưa nới lỏng đó vào production.
- Non-browser caller vẫn có thể dùng bearer token đã được cấp theo cơ chế nội bộ hiện có; browser endpoint không còn phát token JSON.

## Affected Artifacts

- `docs/specs/AUTH-001-browser-cookie-session.md`
- `app/backend/Program.cs`, `app/backend/src/Controllers/AuthController.cs`, `app/backend/src/Services/*`
- `app/frontend/src/api`, `app/frontend/src/context`, `app/frontend/src/features/auth`, `app/frontend/src/routes`
- OpenAPI contract và test backend/frontend
