using System.Globalization;
using System.Text;
using backend.src.Exceptions;
using BCryptHasher = BCrypt.Net.BCrypt;

namespace backend.src.Helpers;

internal static class PasswordPolicy
{
    private const string PrehashedSuffix = ":sha384";
    private const int MaxRunes = 128;
    internal const int MaxUtf16Length = MaxRunes * 2;
    private const string ValidationMessage = "Password must be 12 to 128 characters and include an uppercase letter, a digit, and a special character.";

    public static void Validate(string password)
    {
        if (string.IsNullOrEmpty(password) || password.Length > MaxUtf16Length)
            throw new BadRequestException(ValidationMessage);

        var count = 0;
        var hasUpper = false;
        var hasDigit = false;
        var hasSpecial = false;
        foreach (var rune in password.EnumerateRunes())
        {
            if (++count > MaxRunes)
                throw new BadRequestException(ValidationMessage);

            var category = Rune.GetUnicodeCategory(rune);
            hasUpper |= category == UnicodeCategory.UppercaseLetter;
            hasDigit |= category == UnicodeCategory.DecimalDigitNumber;
            hasSpecial |= category != UnicodeCategory.DecimalDigitNumber && !Rune.IsLetter(rune) && !Rune.IsWhiteSpace(rune);
        }

        if (count < 12 || !hasUpper || !hasDigit || !hasSpecial)
            throw new BadRequestException(ValidationMessage);
    }

    public static string Hash(string password) => Encoding.UTF8.GetByteCount(password) > 72
        ? BCryptHasher.EnhancedHashPassword(password, workFactor: 12) + PrehashedSuffix
        : BCryptHasher.HashPassword(password, workFactor: 12);

    public static bool Verify(string password, string hash)
    {
        if (string.IsNullOrEmpty(password) || password.Length > MaxUtf16Length || string.IsNullOrEmpty(hash))
            return false;

        return hash.EndsWith(PrehashedSuffix, StringComparison.Ordinal)
            ? BCryptHasher.EnhancedVerify(password, hash[..^PrehashedSuffix.Length])
            : BCryptHasher.Verify(password, hash);
    }
}
