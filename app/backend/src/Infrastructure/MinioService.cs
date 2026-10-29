using backend.src.Configurations;
using backend.src.Exceptions;
using Microsoft.Extensions.Options;
using Minio;
using Minio.DataModel.Args;

namespace backend.src.Infrastructure;

public sealed class MinioService(
    IOptions<MinioSettings> minioSettings,
    ILogger<MinioService> logger) : IMinioService, IDisposable
{
    private const string DefaultRegion = "us-east-1";

    private readonly MinioSettings settings = minioSettings.Value;
    private readonly IMinioClient client = BuildClient(
        minioSettings.Value.Endpoint,
        minioSettings.Value);
    private readonly IMinioClient publicClient = BuildClient(
        string.IsNullOrWhiteSpace(minioSettings.Value.PublicEndpoint)
            ? minioSettings.Value.Endpoint
            : minioSettings.Value.PublicEndpoint,
        minioSettings.Value,
        minioSettings.Value.PublicUseSsl);
    private readonly SemaphoreSlim bucketLock = new(1, 1);
    private volatile bool bucketReady;

    public async Task EnsureBucketAsync(CancellationToken cancellationToken = default)
    {
        if (bucketReady)
        {
            return;
        }

        await bucketLock.WaitAsync(cancellationToken);
        try
        {
            if (bucketReady)
            {
                return;
            }

            var exists = await client.BucketExistsAsync(
                new BucketExistsArgs().WithBucket(settings.BucketName),
                cancellationToken);
            if (!exists)
            {
                await client.MakeBucketAsync(
                    new MakeBucketArgs().WithBucket(settings.BucketName),
                    cancellationToken);
                logger.LogInformation("Created MinIO bucket {Bucket}.", settings.BucketName);
            }

            bucketReady = true;
        }
        finally
        {
            bucketLock.Release();
        }
    }

    public Task<bool> BucketExistsAsync(CancellationToken cancellationToken = default)
        => client.BucketExistsAsync(
            new BucketExistsArgs().WithBucket(settings.BucketName),
            cancellationToken);

    public async Task UploadAsync(
        string objectKey,
        Stream content,
        long size,
        string contentType,
        CancellationToken cancellationToken = default)
    {
        try
        {
            await EnsureBucketAsync(cancellationToken);
            await client.PutObjectAsync(
                new PutObjectArgs()
                    .WithBucket(settings.BucketName)
                    .WithObject(objectKey)
                    .WithStreamData(content)
                    .WithObjectSize(size)
                    .WithContentType(contentType),
                cancellationToken);
        }
        catch (Exception exception) when (exception is not OperationCanceledException)
        {
            logger.LogError(exception, "MinIO upload failed for {ObjectKey}.", objectKey);
            throw new InternalServerErrorException("File storage is unavailable.");
        }
    }

    public async Task<string> GetPresignedUrlAsync(string objectKey, TimeSpan? expiry = null)
    {
        var lifetime = expiry ?? TimeSpan.FromSeconds(settings.PresignedUrlExpirySeconds);
        try
        {
            return await publicClient.PresignedGetObjectAsync(
                new PresignedGetObjectArgs()
                    .WithBucket(settings.BucketName)
                    .WithObject(objectKey)
                    .WithExpiry((int)Math.Ceiling(lifetime.TotalSeconds)));
        }
        catch (Exception exception)
        {
            logger.LogError(exception, "MinIO presign failed for {ObjectKey}.", objectKey);
            throw new InternalServerErrorException("File storage is unavailable.");
        }
    }

    public async Task DeleteAsync(string objectKey, CancellationToken cancellationToken = default)
    {
        try
        {
            await client.RemoveObjectAsync(
                new RemoveObjectArgs()
                    .WithBucket(settings.BucketName)
                    .WithObject(objectKey),
                cancellationToken);
        }
        catch (Exception exception) when (exception is not OperationCanceledException)
        {
            logger.LogError(exception, "MinIO delete failed for {ObjectKey}.", objectKey);
            throw new InternalServerErrorException("File storage is unavailable.");
        }
    }

    public void Dispose()
    {
        client.Dispose();
        publicClient.Dispose();
        bucketLock.Dispose();
    }

    private static IMinioClient BuildClient(string endpoint, MinioSettings s, bool? useSsl = null)
        => new MinioClient()
            .WithEndpoint(endpoint)
            .WithCredentials(s.AccessKey, s.SecretKey)
            .WithSSL(useSsl ?? s.UseSsl)
            .WithRegion(DefaultRegion) // cố định region để SDK khỏi gọi mạng dò region khi ký URL
            .Build();
}