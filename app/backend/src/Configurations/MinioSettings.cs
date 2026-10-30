using System.ComponentModel.DataAnnotations;

namespace backend.src.Configurations;

public sealed class MinioSettings
{
    public const string SectionName = "Minio";

    /// <summary>host:port, không có scheme. Địa chỉ BE dùng để kết nối MinIO.</summary>
    [Required]
    public string Endpoint { get; init; } = "localhost:9000";

    /// <summary>Địa chỉ trình duyệt dùng để tải file qua presigned URL. Để trống = dùng Endpoint.</summary>
    public string? PublicEndpoint { get; init; }

    /// <summary>Để trống = dùng UseSsl.</summary>
    public bool? PublicUseSsl { get; init; }

    [Required]
    public string AccessKey { get; init; } = string.Empty;

    [Required]
    public string SecretKey { get; init; } = string.Empty;

    [Required, RegularExpression(@"^[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]$",
        ErrorMessage = "Minio:BucketName must be a valid S3 bucket name.")]
    public string BucketName { get; init; } = "cloud-bookstore";

    public bool UseSsl { get; init; }

    // Tối đa 10 vì controller giới hạn request ở 12 MB (xem AttachmentController.MaxRequestBytes).
    [Range(1, 10)]
    public int MaxFileSizeMb { get; init; } = 10;

    [Range(10, 3600)]
    public int PresignedUrlExpirySeconds { get; init; } = 300;

    // Không đặt giá trị mặc định: config binder sẽ nối mảng mặc định với mảng trong json.
    [MinLength(1)]
    public string[] AllowedContentTypes { get; init; } = [];

    public long MaxFileSizeBytes => MaxFileSizeMb * 1024L * 1024L;
}