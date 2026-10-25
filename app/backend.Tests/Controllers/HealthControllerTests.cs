using backend.src.Controllers;
using backend.src.Services;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Xunit;

namespace backend.Tests.Controllers;

public sealed class HealthControllerTests
{
    [Fact]
    public async Task GetEmailHealth_Returns200WhenSmtpIsReachable()
    {
        var controller = new HealthController(new FakeEmailHealthCheck(true));

        var result = await controller.GetEmailHealth(CancellationToken.None);

        var ok = Assert.IsType<OkObjectResult>(result);
        Assert.Equal(StatusCodes.Status200OK, ok.StatusCode);
        Assert.Equal(new HealthController.EmailHealthResponse("Healthy"), ok.Value);
    }

    [Fact]
    public async Task GetEmailHealth_Returns503WhenSmtpIsUnreachable()
    {
        var controller = new HealthController(new FakeEmailHealthCheck(false));

        var result = await controller.GetEmailHealth(CancellationToken.None);

        var unavailable = Assert.IsType<ObjectResult>(result);
        Assert.Equal(StatusCodes.Status503ServiceUnavailable, unavailable.StatusCode);
        Assert.Equal(new HealthController.EmailHealthResponse("Unhealthy"), unavailable.Value);
    }

    [Fact]
    public void GetEmailHealth_UsesTheRootHealthEmailRoute()
    {
        var route = typeof(HealthController)
            .GetMethod(nameof(HealthController.GetEmailHealth))
            ?.GetCustomAttributes(typeof(HttpGetAttribute), inherit: true)
            .Cast<HttpGetAttribute>()
            .Single();

        Assert.NotNull(route);
        Assert.Equal("/health/email", route.Template);
    }

    private sealed class FakeEmailHealthCheck(bool isHealthy) : IEmailHealthCheck
    {
        public Task<bool> IsHealthyAsync(CancellationToken cancellationToken) => Task.FromResult(isHealthy);
    }
}
