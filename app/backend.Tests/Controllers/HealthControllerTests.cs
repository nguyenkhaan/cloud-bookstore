using backend.src.Controllers;
using backend.src.Configurations;
using backend.src.Infrastructure;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using Xunit;

namespace backend.Tests.Controllers;

public sealed class HealthControllerTests
{
    [Fact]
    public async Task SendTestEmail_Returns200WhenMessageIsAccepted()
    {
        var emailService = new FakeEmailService(true);
        var controller = new HealthController(emailService);
        var request = new HealthController.SendTestEmailRequest
        {
            RecipientEmail = "developer@example.com"
        };

        var result = await controller.SendTestEmail(request, CancellationToken.None);

        var ok = Assert.IsType<OkObjectResult>(result);
        Assert.Equal(StatusCodes.Status200OK, ok.StatusCode);
        Assert.Equal(new HealthController.EmailTestResponse("Sent"), ok.Value);
        Assert.Equal("developer@example.com", emailService.RecipientEmail);
    }

    [Fact]
    public async Task SendTestEmail_Returns503WhenMessageIsRejected()
    {
        var controller = new HealthController(new FakeEmailService(false));
        var request = new HealthController.SendTestEmailRequest
        {
            RecipientEmail = "developer@example.com"
        };

        var result = await controller.SendTestEmail(request, CancellationToken.None);

        var unavailable = Assert.IsType<ObjectResult>(result);
        Assert.Equal(StatusCodes.Status503ServiceUnavailable, unavailable.StatusCode);
        Assert.Equal(new HealthController.EmailTestResponse("Unavailable"), unavailable.Value);
    }

    [Fact]
    public void SendTestEmail_UsesTheConfiguredRelativePostRoute()
    {
        var route = typeof(HealthController)
            .GetMethod(nameof(HealthController.SendTestEmail))
            ?.GetCustomAttributes(typeof(HttpPostAttribute), inherit: true)
            .Cast<HttpPostAttribute>()
            .Single();

        Assert.NotNull(route);
        Assert.Equal("health/email", route.Template);
    }

    private sealed class FakeEmailService(bool sendResult) : EmailService(
        Options.Create(new EmailSettings()),
        NullLogger<EmailService>.Instance)
    {
        public string? RecipientEmail { get; private set; }

        public override Task<bool> SendTestEmailAsync(
            string recipientEmail,
            CancellationToken cancellationToken = default)
        {
            RecipientEmail = recipientEmail;
            return Task.FromResult(sendResult);
        }
    }
}
