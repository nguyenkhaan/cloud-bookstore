using System.Security.Cryptography;
using System.Text;

namespace backend.src.Infrastructure;

/// <summary>
/// Key used to derive per-session CSRF tokens. It is derived with HKDF from the access-token
/// secret so the JWT signing key itself is never used for a second purpose.
/// </summary>
public sealed class CsrfTokenSigningKey
{
    private static readonly byte[] DerivationInfo = Encoding.UTF8.GetBytes("cloud-bookstore:csrf-token:v1");

    private CsrfTokenSigningKey(byte[] value) => Value = value;

    public byte[] Value { get; }

    public static CsrfTokenSigningKey FromSecret(string? secret)
    {
        if (string.IsNullOrWhiteSpace(secret))
        {
            throw new InvalidOperationException("A secret is required to derive the CSRF signing key.");
        }

        var derived = HKDF.DeriveKey(
            HashAlgorithmName.SHA256,
            Encoding.UTF8.GetBytes(secret),
            outputLength: 32,
            salt: [],
            info: DerivationInfo);
        return new CsrfTokenSigningKey(derived);
    }
}
