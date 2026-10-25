using MailKit.Net.Smtp;
using MailKit.Security;
using Microsoft.Extensions.Options;
using MimeKit;

namespace backend.src.Services;

public sealed class EmailService(
    IOptions<EmailSettings> emailSettings,
    ILogger<EmailService> logger) : IEmailService
{
    private readonly EmailSettings settings = emailSettings.Value;

    public Task SendAccountVerificationEmailAsync(string recipientEmail, string recipientName, string token)
    {
        var link = CreateActionLink(settings.VerifyEmailPath, token);
        return SendAsync(recipientEmail, EmailTemplates.AccountVerification(recipientName, link));
    }

    public Task SendPasswordResetEmailAsync(string recipientEmail, string recipientName, string token)
    {
        var link = CreateActionLink(settings.ResetPasswordPath, token);
        return SendAsync(recipientEmail, EmailTemplates.PasswordReset(recipientName, link));
    }

    private async Task SendAsync(string recipientEmail, EmailContent content)
    {
        var message = new MimeMessage();
        message.From.Add(new MailboxAddress(settings.FromName, settings.FromAddress));
        message.To.Add(MailboxAddress.Parse(recipientEmail));
        message.Subject = content.Subject;
        message.Body = new BodyBuilder
        {
            HtmlBody = content.HtmlBody,
            TextBody = content.TextBody
        }.ToMessageBody();

        using var smtpClient = new SmtpClient();
        var socketOptions = settings.UseStartTls
            ? SecureSocketOptions.StartTls
            : SecureSocketOptions.None;

        await smtpClient.ConnectAsync(settings.SmtpHost, settings.SmtpPort, socketOptions);
        if (!string.IsNullOrWhiteSpace(settings.SmtpUsername))
        {
            await smtpClient.AuthenticateAsync(settings.SmtpUsername, settings.SmtpPassword ?? string.Empty);
        }

        await smtpClient.SendAsync(message);
        await smtpClient.DisconnectAsync(true);
        logger.LogInformation("Authentication email sent successfully.");
    }

    private string CreateActionLink(string actionPath, string token)
    {
        var baseUri = new Uri(settings.FrontendBaseUrl, UriKind.Absolute);
        var builder = new UriBuilder(baseUri)
        {
            Path = $"{baseUri.AbsolutePath.TrimEnd('/')}/{actionPath.TrimStart('/')}",
            Query = $"token={Uri.EscapeDataString(token)}"
        };
        return builder.Uri.AbsoluteUri;
    }
}
