namespace backend.src.Helpers;

public static class FileSignatureValidator
{
    /// <summary>Số byte đầu tối thiểu cần đọc để nhận diện mọi định dạng được hỗ trợ.</summary>
    public const int HeaderLength = 12;

    public static bool Matches(string contentType, ReadOnlySpan<byte> header)
    {
        return contentType.ToLowerInvariant() switch
        {
            "image/jpeg" => header.Length >= 3 && header[0] == 0xFF && header[1] == 0xD8 && header[2] == 0xFF,
            "image/png" => header.StartsWith(PngSignature),
            "image/webp" => header.Length >= 12
                && header[..4].SequenceEqual("RIFF"u8)
                && header.Slice(8, 4).SequenceEqual("WEBP"u8),
            "application/pdf" => header.StartsWith("%PDF-"u8),
            _ => false
        };
    }

    private static ReadOnlySpan<byte> PngSignature => [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A];
}