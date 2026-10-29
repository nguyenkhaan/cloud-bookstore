namespace backend.src.Infrastructure;

public interface IMinioService
{
    Task EnsureBucketAsync(CancellationToken cancellationToken = default);
    Task<bool> BucketExistsAsync(CancellationToken cancellationToken = default);
    Task UploadAsync(string objectKey, Stream content, long size, string contentType, CancellationToken cancellationToken = default);
    Task<string> GetPresignedUrlAsync(string objectKey, TimeSpan? expiry = null);
    Task DeleteAsync(string objectKey, CancellationToken cancellationToken = default);
}