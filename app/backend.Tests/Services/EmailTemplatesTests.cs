using backend.src.Services;
using Xunit;

namespace backend.Tests.Services;

public class EmailTemplatesTests
{
    [Fact]
    public void AccountVerification_EscapesRecipientName_AndKeepsTheActionLink()
    {
        const string verificationUrl = "http://localhost:5173/verify-email?token=abc";

        var email = EmailTemplates.AccountVerification("Mai <script>", verificationUrl);

        Assert.Contains(verificationUrl, email.HtmlBody);
        Assert.Contains("Mai &lt;script&gt;", email.HtmlBody);
        Assert.DoesNotContain("Mai <script>", email.HtmlBody);
        Assert.Contains(verificationUrl, email.TextBody);
    }

    [Fact]
    public void PasswordReset_ContainsTheResetLink_AndExpiryNotice()
    {
        const string resetUrl = "http://localhost:5173/reset-password?token=abc";

        var email = EmailTemplates.PasswordReset("Mai", resetUrl);

        Assert.Contains(resetUrl, email.HtmlBody);
        Assert.Contains("15 minutes", email.TextBody, StringComparison.OrdinalIgnoreCase);
    }
}
