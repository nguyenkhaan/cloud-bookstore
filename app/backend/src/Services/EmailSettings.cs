using System.ComponentModel.DataAnnotations;

namespace backend.src.Services;

public sealed class EmailSettings
{
    [Required, EmailAddress]
    public string FromAddress { get; init; } = string.Empty;

    [Required]
    public string FromName { get; init; } = string.Empty;

    [Required]
    public string SmtpHost { get; init; } = string.Empty;

    [Range(1, 65535)]
    public int SmtpPort { get; init; }

    public bool UseStartTls { get; init; }

    public string? SmtpUsername { get; init; }

    public string? SmtpPassword { get; init; }

    [Required]
    public string FrontendBaseUrl { get; init; } = string.Empty;

    [Required]
    public string VerifyEmailPath { get; init; } = "/verify-email";

    [Required]
    public string ResetPasswordPath { get; init; } = "/reset-password";
}
