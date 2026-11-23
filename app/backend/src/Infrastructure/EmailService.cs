using System.Text.Encodings.Web;
using MailKit.Net.Smtp;
using MailKit.Security;
using Microsoft.Extensions.Options;
using MimeKit;
using backend.src.Configurations;

namespace backend.src.Infrastructure;

public class EmailService(
    IOptions<EmailSettings> emailSettings,
    ILogger<EmailService> logger)
{
    private readonly EmailSettings settings = emailSettings.Value;
    private static readonly string TemplateDirectory = Path.Combine(
        AppContext.BaseDirectory,
        "src",
        "Templates");

    public virtual Task SendAccountVerificationEmailAsync(
        string recipientEmail,
        string recipientName,
        string token,
        CancellationToken cancellationToken = default)
    {
        var link = CreateActionLink(settings.VerifyEmailPath, token);
        return SendTemplateAsync(
            recipientEmail,
            "Xác thực tài khoản Cloud Bookstore",
            "AccountVerification.html",
            new Dictionary<string, string>
            {
                ["recipientName"] = recipientName,
                ["actionUrl"] = link
            },
            $"Chào {recipientName},\n\nXác thực email: {link}",
            cancellationToken);
    }

    public virtual Task SendPasswordResetEmailAsync(
        string recipientEmail,
        string recipientName,
        string token,
        CancellationToken cancellationToken = default)
    {
        var link = CreateActionLink(settings.ResetPasswordPath, token);
        return SendTemplateAsync(
            recipientEmail,
            "Đặt lại mật khẩu Cloud Bookstore",
            "PasswordReset.html",
            new Dictionary<string, string>
            {
                ["recipientName"] = recipientName,
                ["actionUrl"] = link
            },
            $"Chào {recipientName},\n\nĐặt lại mật khẩu: {link}",
            cancellationToken);
    }

    public virtual async Task<bool> SendTestEmailAsync(
        string recipientEmail,
        CancellationToken cancellationToken = default)
    {
        try
        {
            await SendTemplateAsync(
                recipientEmail,
                "Cloud Bookstore Mailpit test",
                "TestEmail.html",
                new Dictionary<string, string> { ["recipientEmail"] = recipientEmail },
                $"Cloud Bookstore đã gửi email thử nghiệm thành công tới {recipientEmail}.",
                cancellationToken);
            return true;
        }
        catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
        {
            throw;
        }
        catch (Exception exception)
        {
            logger.LogWarning(exception, "Test email delivery failed.");
            return false;
        }
    }

    private async Task SendTemplateAsync(
        string recipientEmail,
        string subject,
        string templateFileName,
        IReadOnlyDictionary<string, string> values,
        string textBody,
        CancellationToken cancellationToken)
    {
        var htmlBody = await File.ReadAllTextAsync(
            Path.Combine(TemplateDirectory, templateFileName),
            cancellationToken);
        foreach (var (name, value) in values)
        {
            htmlBody = htmlBody.Replace(
                $"{{{{{name}}}}}",
                HtmlEncoder.Default.Encode(value),
                StringComparison.Ordinal);
        }

        await SendAsync(recipientEmail, subject, htmlBody, textBody, cancellationToken);
    }

    protected virtual async Task SendAsync(
        string recipientEmail,
        string subject,
        string htmlBody,
        string textBody,
        CancellationToken cancellationToken)
    {
        var message = new MimeMessage();
        message.From.Add(new MailboxAddress(settings.FromName, settings.FromAddress));
        message.To.Add(MailboxAddress.Parse(recipientEmail));
        message.Subject = subject;
        message.Body = new BodyBuilder
        {
            HtmlBody = htmlBody,
            TextBody = textBody
        }.ToMessageBody();

        using var smtpClient = new SmtpClient();
        var socketOptions = settings.UseStartTls
            ? SecureSocketOptions.StartTls
            : SecureSocketOptions.None;

        await smtpClient.ConnectAsync(settings.SmtpHost, settings.SmtpPort, socketOptions, cancellationToken);
        if (!string.IsNullOrWhiteSpace(settings.SmtpUsername))
        {
            await smtpClient.AuthenticateAsync(
                settings.SmtpUsername,
                settings.SmtpPassword ?? string.Empty,
                cancellationToken);
        }

        await smtpClient.SendAsync(message, cancellationToken);
        await smtpClient.DisconnectAsync(true, cancellationToken);
        logger.LogInformation("Email sent successfully.");
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
