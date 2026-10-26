using backend.src.Bases.Enums;
using backend.src.Infrastructure;
using Xunit;

namespace backend.Tests.Services;

public class RedisKeyManagerTests
{
    [Theory]
    [InlineData(TokenType.ACCESS, "access-jti", "cloudbookstore:auth:access:access-jti")]
    [InlineData(TokenType.REFRESH, "refresh-jti", "cloudbookstore:auth:refresh:refresh-jti")]
    public void ForToken_IncludesServiceAndTokenType(
        TokenType tokenType,
        string tokenId,
        string expectedKey)
    {
        Assert.Equal(expectedKey, RedisKeyManager.ForToken(tokenType, tokenId));
    }

    [Fact]
    public void ForCurrentRegistrationVerification_IncludesEmployeeId()
    {
        var employeeId = Guid.Parse("6376c763-6294-4ec2-ab77-d7fc2423fe4d");

        var key = RedisKeyManager.ForCurrentRegistrationVerification(employeeId);

        Assert.Equal(
            "cloudbookstore:auth:verify_register:current:6376c763-6294-4ec2-ab77-d7fc2423fe4d",
            key);
    }
}
