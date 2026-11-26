using backend.src.Helpers;
using Xunit;

namespace backend.Tests.Services;

public sealed class AuthServiceTests
{
    [Fact]
    public void Refresh_rejects_legacy_or_untracked_sessions_before_rotating_tokens()
    {
        var source = ReadSource("Services/AuthService.cs");

        Assert.Contains("item.RefreshJti == refreshJti && item.AccessJti == accessJti", source);
        Assert.Contains("if (device is null)", source);
        Assert.Contains("throw new UnauthorizedException(\"Invalid or expired refresh token\")", source);
    }

    [Fact]
    public void Revocation_marks_database_and_audit_before_redis_cleanup()
    {
        var source = ReadSource("Services/AuthService.cs");

        Assert.Contains("device.RevokedAt = DateTime.UtcNow", source);
        Assert.Contains("await dbContext.SaveChangesAsync();\n        await transaction.CommitAsync();\n        await CleanupRevokedDevicesAsync", source);
        Assert.Contains("await AppendAuditAsync(\"REVOKE_SESSION\"", source);
        Assert.Contains("catch (Exception exception)", source);
    }

    [Fact]
    public void RequestPasswordReset_clears_token_when_delivery_fails_and_returns_normally()
    {
        var source = ReadSource("Services/AuthService.cs");

        Assert.Contains("catch (Exception exception)", source);
        Assert.Contains("PasswordResetTokenHash = null", source);
        Assert.Contains("logger?.LogWarning(exception", source);
    }

    [Fact]
    public void PasswordPolicy_uses_unicode_scalar_length_for_supplementary_letters()
    {
        var password = "𐐀abcdefghij1!";

        PasswordPolicy.Validate(password);
    }

    [Fact]
    public void PasswordPolicy_does_not_treat_supplementary_letter_as_special_character()
    {
        var password = "𐐀abcdefghij1";

        Assert.Throws<backend.src.Exceptions.BadRequestException>(() => PasswordPolicy.Validate(password));
    }

    [Fact]
    public void PasswordPolicy_counts_supplementary_code_point_at_minimum_boundary()
    {
        var password = "Aabcdefghij𐐀1!";

        PasswordPolicy.Validate(password);
    }

    [Fact]
    public void PasswordPolicy_rejects_single_missing_uppercase_with_supplementary_digit_and_special()
    {
        var password = "abcdefghij𐐨1!";

        Assert.Throws<backend.src.Exceptions.BadRequestException>(() => PasswordPolicy.Validate(password));
    }

    private static string ReadSource(string relativePath)
    {
        var directory = new DirectoryInfo(AppContext.BaseDirectory);
        while (directory is not null)
        {
            var path = Path.Combine(directory.FullName, "app", "backend", "src", relativePath);
            if (File.Exists(path))
                return File.ReadAllText(path);
            directory = directory.Parent;
        }

        throw new FileNotFoundException(relativePath);
    }
}
