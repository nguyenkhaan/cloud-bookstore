using System.Text;
using backend.src.Exceptions;
using BCryptHasher = BCrypt.Net.BCrypt;

namespace backend.src.Helpers;

internal static class PasswordPolicy
{
    private const string PrehashedSuffix = ":sha384";

    public static void Validate(string password)
    {
        if (password.Length is < 12 or > 128 || !password.Any(char.IsUpper) ||
            !password.Any(char.IsDigit) || !password.Any(character => !char.IsLetterOrDigit(character) && !char.IsWhiteSpace(character)))
        {
            throw new BadRequestException("Password must be 12 to 128 characters and include an uppercase letter, a digit, and a special character.");
        }
    }

    public static string Hash(string password) => Encoding.UTF8.GetByteCount(password) > 72
        ? BCryptHasher.EnhancedHashPassword(password, workFactor: 12) + PrehashedSuffix
        : BCryptHasher.HashPassword(password, workFactor: 12);

    public static bool Verify(string password, string hash) => hash.EndsWith(PrehashedSuffix, StringComparison.Ordinal)
        ? BCryptHasher.EnhancedVerify(password, hash[..^PrehashedSuffix.Length])
        : BCryptHasher.Verify(password, hash);
}
