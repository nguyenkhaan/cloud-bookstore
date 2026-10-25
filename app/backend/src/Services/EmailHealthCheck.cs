using MailKit.Net.Smtp;
using MailKit.Security;
using Microsoft.Extensions.Options;

namespace backend.src.Services;

public sealed class EmailHealthCheck(IOptions<EmailSettings> emailSettings) : IEmailHealthCheck
{
    private readonly EmailSettings settings = emailSettings.Value;

    public async Task<bool> IsHealthyAsync(CancellationToken cancellationToken)
    {
        try
        {
            using var smtpClient = new SmtpClient();
            var socketOptions = settings.UseStartTls
                ? SecureSocketOptions.StartTls
                : SecureSocketOptions.None;

            await smtpClient.ConnectAsync(
                settings.SmtpHost,
                settings.SmtpPort,
                socketOptions,
                cancellationToken);
            await smtpClient.DisconnectAsync(true, cancellationToken);

            return true;
        }
        catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
        {
            throw;
        }
        catch
        {
            return false;
        }
    }
}
