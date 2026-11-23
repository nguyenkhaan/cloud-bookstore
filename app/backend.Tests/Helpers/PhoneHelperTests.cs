using backend.src.Helpers;
using Xunit;

namespace backend.Tests.Helpers;

public class PhoneHelperTests
{
    [Theory]
    [InlineData("+84912345678", "0912345678")]
    [InlineData("84912345678", "0912345678")]
    [InlineData("0912.345.678", "0912345678")]
    [InlineData("0912-345-678", "0912345678")]
    [InlineData("(091) 234 5678", "0912345678")]
    [InlineData("+84 987 654 321", "0987654321")]
    [InlineData("0909 234 567", "0909234567")]
    [InlineData("  0918345678  ", "0918345678")]
    [InlineData("+84 0912345678", "0912345678")]
    public void Normalize_ValidPhoneFormats_NormalizesTo10Digits(string input, string expected)
    {
        var result = PhoneHelper.Normalize(input);
        Assert.Equal(expected, result);

        var aliasResult = PhoneHelper.NormalizePhoneNumber(input);
        Assert.Equal(expected, aliasResult);
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   ")]
    public void Normalize_NullOrWhitespace_ReturnsEmptyString(string? input)
    {
        var result = PhoneHelper.Normalize(input);
        Assert.Equal(string.Empty, result);
    }

    [Theory]
    [InlineData("0912345678", true)]
    [InlineData("0321234567", true)]
    [InlineData("0581234567", true)]
    [InlineData("0791234567", true)]
    [InlineData("0891234567", true)]
    [InlineData("0123456789", false)] // Invalid prefix 01
    [InlineData("0241234567", false)] // Landline prefix 024
    [InlineData("12345", false)]      // Too short
    [InlineData("09123456789", false)]// 11 digits
    [InlineData("091234567", false)]  // 9 digits
    [InlineData("091234567a", false)] // Contains non-digits
    [InlineData("", false)]
    [InlineData(null, false)]
    public void IsValidVietnamesePhoneNumber_ValidatesCorrectly(string? input, bool expected)
    {
        var result = PhoneHelper.IsValidVietnamesePhoneNumber(input);
        Assert.Equal(expected, result);
    }
}
