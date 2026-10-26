using backend.src.Configurations;
using backend.src.Infrastructure;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using Xunit;

namespace backend.Tests.Services;

public sealed class EmailServiceTests
{
    [Fact]
    public async Task SendAccountVerificationEmailAsync_RendersEncodedHtmlTemplate()
    {
        var service = new RecordingEmailService();

        await service.SendAccountVerificationEmailAsync(
            "mai@example.com",
            "Mai <script>",
            "token/value");

        var message = Assert.Single(service.Messages);
        Assert.Equal("mai@example.com", message.RecipientEmail);
        Assert.Equal("Xác thực tài khoản Cloud Bookstore", message.Subject);
        Assert.Contains("Mai &lt;script&gt;", message.HtmlBody);
        Assert.Contains("token%2Fvalue", message.HtmlBody);
        Assert.DoesNotContain("Mai <script>", message.HtmlBody);
    }

    [Fact]
    public async Task SendPasswordResetEmailAsync_RendersResetTemplate()
    {
        var service = new RecordingEmailService();

        await service.SendPasswordResetEmailAsync("mai@example.com", "Mai", "reset-token");

        var message = Assert.Single(service.Messages);
        Assert.Equal("Đặt lại mật khẩu Cloud Bookstore", message.Subject);
        Assert.Contains("reset-password", message.HtmlBody);
        Assert.Contains("reset-token", message.HtmlBody);
    }

    [Fact]
    public async Task SendTestEmailAsync_SendsTestTemplate()
    {
        var service = new RecordingEmailService();

        var sent = await service.SendTestEmailAsync("developer@example.com");

        Assert.True(sent);
        var message = Assert.Single(service.Messages);
        Assert.Equal("developer@example.com", message.RecipientEmail);
        Assert.Equal("Cloud Bookstore Mailpit test", message.Subject);
        Assert.Contains("developer@example.com", message.HtmlBody);
    }

    private sealed class RecordingEmailService() : EmailService(
        Options.Create(new EmailSettings
        {
            FrontendBaseUrl = "http://localhost:5173",
            VerifyEmailPath = "/verify-email",
            ResetPasswordPath = "/reset-password"
        }),
        NullLogger<EmailService>.Instance)
    {
        public List<RecordedEmail> Messages { get; } = [];

        protected override Task SendAsync(
            string recipientEmail,
            string subject,
            string htmlBody,
            string textBody,
            CancellationToken cancellationToken)
        {
            Messages.Add(new RecordedEmail(recipientEmail, subject, htmlBody, textBody));
            return Task.CompletedTask;
        }
    }

    private sealed record RecordedEmail(
        string RecipientEmail,
        string Subject,
        string HtmlBody,
        string TextBody);
}
