namespace backend.src.Services;

public interface IEmailService
{
    Task SendAccountVerificationEmailAsync(string recipientEmail, string recipientName, string token);

    Task SendPasswordResetEmailAsync(string recipientEmail, string recipientName, string token);
}
