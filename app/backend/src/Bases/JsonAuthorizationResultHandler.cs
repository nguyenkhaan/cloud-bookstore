using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Authorization.Policy;

namespace backend.src.Bases;

/// Middleware kết quả phân quyền: mọi lần bị từ chối đều trả JSON cùng định dạng với ApiHandlerException
/// (message + code), để FE rẽ nhánh theo code thay vì nhận thân rỗng.
///   401 UNAUTHENTICATED: chưa đăng nhập, token hết hạn hoặc phiên đã bị thu hồi
///   403 FORBIDDEN: đã đăng nhập nhưng vai trò không đủ quyền; request không chạy vào controller nên không đổi dữ liệu
public sealed class JsonAuthorizationResultHandler : IAuthorizationMiddlewareResultHandler
{
    private readonly AuthorizationMiddlewareResultHandler _default = new();

    public async Task HandleAsync(
        RequestDelegate next, HttpContext context, AuthorizationPolicy policy, PolicyAuthorizationResult result)
    {
        if (result.Challenged || result.Forbidden)
        {
            var challenged = result.Challenged;
            context.Response.StatusCode = challenged ? StatusCodes.Status401Unauthorized : StatusCodes.Status403Forbidden;
            if (challenged) context.Response.Headers.WWWAuthenticate = "Bearer";

            await context.Response.WriteAsJsonAsync(new
            {
                message = challenged ? "Authentication required" : "You do not have permission to perform this action",
                code = challenged ? "UNAUTHENTICATED" : "FORBIDDEN",
                path = context.Request.Path.ToString(),
                timestamp = DateTimeOffset.UtcNow
            });
            return;
        }

        await _default.HandleAsync(next, context, policy, result);
    }
}