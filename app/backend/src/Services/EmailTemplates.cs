using System.Text.Encodings.Web;

namespace backend.src.Services;

public sealed record EmailContent(string Subject, string HtmlBody, string TextBody);

public static class EmailTemplates
{
    public static EmailContent AccountVerification(string recipientName, string verificationUrl)
    {
        var name = HtmlEncoder.Default.Encode(recipientName);
        var url = HtmlEncoder.Default.Encode(verificationUrl);

        return new EmailContent(
            "Xác thực tài khoản Cloud Bookstore",
            $$"""
              <!doctype html>
              <html lang="vi">
              <body style="font-family:Arial,sans-serif;color:#1f2937;line-height:1.5">
                <h2>Chào {{name}},</h2>
                <p>Tài khoản Cloud Bookstore của bạn đã được tạo. Hãy xác thực email để kích hoạt tài khoản.</p>
                <p><a href="{{url}}">Xác thực tài khoản</a></p>
                <p>Nếu bạn không tạo tài khoản này, bạn có thể bỏ qua email.</p>
              </body>
              </html>
              """,
            $"Chào {recipientName},\n\nTài khoản Cloud Bookstore của bạn đã được tạo. Xác thực email: {verificationUrl}\n\nNếu bạn không tạo tài khoản này, bạn có thể bỏ qua email.");
    }

    public static EmailContent PasswordReset(string recipientName, string resetUrl)
    {
        var name = HtmlEncoder.Default.Encode(recipientName);
        var url = HtmlEncoder.Default.Encode(resetUrl);

        return new EmailContent(
            "Đặt lại mật khẩu Cloud Bookstore",
            $$"""
              <!doctype html>
              <html lang="vi">
              <body style="font-family:Arial,sans-serif;color:#1f2937;line-height:1.5">
                <h2>Chào {{name}},</h2>
                <p>Chúng tôi nhận được yêu cầu đặt lại mật khẩu tài khoản Cloud Bookstore của bạn.</p>
                <p><a href="{{url}}">Đặt lại mật khẩu</a></p>
                <p>Link này hết hạn sau 15 phút và chỉ dùng được một lần.</p>
                <p>Nếu bạn không yêu cầu đặt lại mật khẩu, bạn có thể bỏ qua email này.</p>
              </body>
              </html>
              """,
            $"Chào {recipientName},\n\nĐặt lại mật khẩu Cloud Bookstore: {resetUrl}\n\nLink này hết hạn sau 15 minutes và chỉ dùng được một lần. Nếu bạn không yêu cầu đặt lại mật khẩu, bạn có thể bỏ qua email này.");
    }
}
