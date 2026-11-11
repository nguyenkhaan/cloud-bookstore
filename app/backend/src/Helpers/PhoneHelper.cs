using System.Text.RegularExpressions;

namespace backend.src.Helpers;

public static class PhoneHelper
{
    private static readonly Regex VietnameseMobileRegex = new(@"^0[35789]\d{8}$", RegexOptions.Compiled);

    /// <summary>
    /// Normalizes a raw phone number input to a 10-digit Vietnamese format (e.g. 0912345678).
    /// Strips spaces, dots, dashes, parentheses and converts +84 / 84 prefix to leading 0.
    /// </summary>
    public static string Normalize(string? rawPhone)
    {
        if (string.IsNullOrWhiteSpace(rawPhone))
        {
            return string.Empty;
        }

        var digits = new string(rawPhone.Where(char.IsDigit).ToArray());

        if (digits.StartsWith("840") && digits.Length == 12)
        {
            digits = "0" + digits[3..];
        }
        else if (digits.StartsWith("84") && digits.Length == 11)
        {
            digits = "0" + digits[2..];
        }

        return digits;
    }

    /// <summary>
    /// Alias for Normalize to conform to various specification conventions.
    /// </summary>
    public static string NormalizePhoneNumber(string? rawPhone) => Normalize(rawPhone);

    /// <summary>
    /// Validates whether the normalized phone conforms to valid Vietnamese 10-digit mobile phone rules
    /// starting with 03, 05, 07, 08, or 09.
    /// </summary>
    public static bool IsValidVietnamesePhoneNumber(string? normalizedPhone)
    {
        if (string.IsNullOrWhiteSpace(normalizedPhone))
        {
            return false;
        }

        return VietnameseMobileRegex.IsMatch(normalizedPhone);
    }
}
