# HƯỚNG DẪN CƠ CHẾ ĐĂNG NHẬP VÀ CHỐNG CSRF ATTACK

## 1. Cơ chế xử lý request

Hệ thống Backend sử dụng `CsrfProtectionMiddleware` để kiểm tra tính hợp lệ của các request có nguy cơ bị CSRF attack.

Middleware được đặt sau `AuthenticationMiddleware` (`UseAuthentication()`) và trước `AuthorizationMiddleware` (`UseAuthorization()`).

Cơ chế xử lý:

- **Safe HTTP methods (`GET`, `HEAD`, `OPTIONS`, `TRACE`):** Bỏ qua kiểm tra CSRF và tiếp tục xử lý request.
- **Unsafe HTTP methods (`POST`, `PUT`, `PATCH`, `DELETE - các HTTP tạo ra sự thay đổi dữ liệu`):** Kiểm tra CSRF nếu người dùng đã login thành công.

**Tóm gọn**: Bạn sẽ bypass qua được middleware nếu request method là (`GET, HEAD, OPTIONS, TRACE`) hoặc không cung cấp cookie trên Header của request.

## 2. Cơ chế xác thực và kiểm tra CSRF

Hệ thống hỗ trợ hai cách xác thực:

1. **Bearer Token:** Dùng `Authorization: Bearer <access_token>`.
2. **Cookie + CSRF Token:** Dùng access token được lưu trong cookie kết hợp với CSRF token hợp lệ.

Trong implementation hiện tại, **cookie được ưu tiên hơn Bearer token**. Nếu request có `access_cookie`, hệ thống sẽ chọn token từ cookie trước và không fallback sang `Bearer token`, kể cả khi `access_cookie` không hợp lệ. Hai cơ chế được hỗ trợ **đồng thờ**i nhằm phục vụ cả việc kiểm thử API và quá trình sử dụng ứng dụng trên trình duyệt nhanh chóng hơn. Trong môi trường production, chỉ sử dụng cơ chế xác thực cookie + CSRF.

### 2.1. Cookie + CSRF Token

Sau khi đăng nhập thành công, trình duyệt sẽ tự lưu hai cookie:

- `cloudbook_access`: Chứa access token.
- `cloudbook_refresh`: Chứa refresh token.

Endpoint login còn trả thêm một CSRF token tương ứng với phiên đăng nhập. CSRF token được **lưu trữ và kiểm tra** thông qua **Redis**. Client sẽ chủ động gửi CSRF token này về phía Backend.

Khi gửi request bằng cookie authentication, trình duyệt tự động đính kèm các cookie. Với các unsafe HTTP methods, Backend thực hiện các bước:

1. Lấy claim `jti` từ access token đã được xác thực.
2. Đọc CSRF token từ header được cấu hình trong `appsettings.json:CsrfHeaderName`.
3. Đối chiếu CSRF token với `jti` được lưu trong Redis

Request chỉ được tiếp tục nếu CSRF token hợp lệ. Nếu kiểm tra CSRF thất bại, Backend trả về `403 Forbidden`.

Trong API docs, có thể nhập CSRF token vào ô `Authorize` để Swagger tự động gửi CSRF Token này về phía Backend.

**Response đăng nhập minh họa:**

```json
{
  "access_token": "...",
  "refresh_token": "...",
  "csrf_token": "..."
}
```

Trong đó:

- `access_token`: Dùng cho cơ chế xác thực Bearer khi cần.
- `refresh_token`: Dùng cho cơ chế refresh token; không nên mặc định sử dụng nó để truy cập các authenticated endpoint.
- `csrf_token`: Dùng để xác minh request khi sử dụng cookie authentication.

### 2.2. Bearer Token

Cách sử dụng:

1. Thực hiện endpoint `/login` để lấy `access_token`.
2. Nhập access token vào nút `Authorize` trên API docs theo định dạng mà Swagger UI yêu cầu.
3. Gửi request đến các endpoint cần xác thực.

Nếu request không có access cookie, hệ thống sẽ sử dụng Bearer token trong header `Authorization` để xác thực. Request sử dụng Bearer sẽ bỏ qua bước kiểm tra CSRF. Nếu trình duyệt vẫn gửi access cookie, cookie sẽ được ưu tiên. Vì vậy, chỉ nhập Bearer token vào `Authorize` chưa chắc đã khiến request sử dụng cơ chế Bearer.

> Lý do tôi nói cơ chế này  phế, là vì khi bạn login trên API docs, mặc định login sẽ trả về cookie và trình duyệt sẽ lưu cookie này, chứ chúng ta không nắm. Cookie được trình duyệt gửi tự động => Mọi request sau khi login đều có cookie => 100% cookie + csrf token luôn được ưu tiên :v

## 3. Một số lưu ý

### 3.1. 403 Forbidden với các endpoint không có ổ khóa (unauthenticated endpoint)

**Vấn đề:**

Sau khi đăng nhập, trình duyệt lưu các cookie. Khi gửi request đến Backend, trình duyệt tự động đính kèm cookie. Do đó, mọi request sẽ đều hứa cookie.

Vì vậy, với các **unsafe HTTP methods**, request sẽ cần vượt qua bước kiểm tra CSRF của middleware. Nếu bạn chưa cung cấp CSRF Token do endpoint ` /login`trả về => bạn sẽ bị gặp lỗi `403 Forbidden`dù cho endpoint này không có ổ khóa (unauthenticated endpoint).

**Giải quyết**:

- Bạn chỉ cần cung cấp đúng CSRF token do endpoint `login/`trả về vào trong nút `Authorize` của API docs. Swagger sẽ tự động gửi CSRF Token về bên BE nếu được cung cấp.
- Trong trường hợp đã làm mất CSRF Token, có thể xin cấp lại thông qua 1 SAFE endpoint `GET: /api/auth/session`. Hệ thống sẽ tự động kiểm tra session lưu bên trong redis với `access_cookie`do người dùng gửi về, tiến hành cấp phát lại CSRF Token.






**Note không quan trọng, không đọc cũng được**: 

- Unauthenticated endpoint thì trên giao diện Swagger không được có ổ khóa. Còn trong trường hợp ăn `403 Forbidden`mặc dù đây là unauthenticated endpoint, đó là do cơ chế xác thực của CSRF Token, sau khi login thì phải cung cấp CSRF Token để minh chúng tính hợp lệ của request.
- Tóm gọn lại những gì đã xây dựng là: `CFRSMiddleware`(kiêm tra tính hợp lệ của Request), `CSRFTokenManager` (Quản lý CSRF Token), `CookieService` (Quản lý cơ chế Cookie - tạo/lưu/xóa/kiểm tra...), `AuthenticatedMiddleware` (hỗ trợ thêm cơ chế trích xuất và kiểm tra access_token trong cookie), `BearerSchemeTransformer`(Tinh chỉnh giao diện API docs, endpoint unauthenticated thì không được có ổ khóa, thêm trường cung cấp CSRF Token trong Dialog Authorize), `OpenAPIInterceptor`(thêm interceptor để API docs gửi CSRF Token khi người dùng cung cấp vào trong Dialog Authorize).
