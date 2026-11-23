using backend.src.Data;
using Microsoft.EntityFrameworkCore;
using Xunit;

namespace backend.Tests.Architecture;

public sealed class RemovedAttachmentAndMinioTests
{
    private static readonly string[] RemovedTypeNames =
    [
        "backend.src.Models.AttachmentModel",
        "backend.src.Models.Enums.AttachmentOwnerType",
        "backend.src.Services.AttachmentService",
        "backend.src.Controllers.AttachmentController",
        "backend.src.Configurations.MinioSettings",
        "backend.src.Infrastructure.IMinioService",
        "backend.src.Infrastructure.MinioService",
        "backend.src.Infrastructure.MinioBucketInitializer",
        "backend.src.Infrastructure.MinioReadinessHealthCheck",
        "backend.src.Helpers.FileSignatureValidator"
    ];

    [Fact]
    public void Model_contains_replacement_entities_and_no_attachment_mapping()
    {
        using var dbContext = new AppDbContext(new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString("N"))
            .Options);

        Assert.DoesNotContain(dbContext.Model.GetEntityTypes(), entity =>
            entity.Name.Contains("Attachment", StringComparison.Ordinal) ||
            string.Equals(entity.GetTableName(), "attachments", StringComparison.Ordinal));
        Assert.NotNull(dbContext.Model.FindEntityType("backend.src.Models.UploadIntentModel"));
        Assert.NotNull(dbContext.Model.FindEntityType("backend.src.Models.RentalLineImageModel"));
        Assert.NotNull(dbContext.Model.FindEntityType("backend.src.Models.StockReceiptImageModel"));
        Assert.DoesNotContain(typeof(AppDbContext).GetProperties(), property =>
            property.Name.Contains("Attachment", StringComparison.Ordinal));
    }

    [Fact]
    public void Backend_assembly_has_no_attachment_or_minio_types()
    {
        var assembly = typeof(AppDbContext).Assembly;

        foreach (var typeName in RemovedTypeNames)
        {
            Assert.Null(assembly.GetType(typeName));
        }

        Assert.DoesNotContain(assembly.GetReferencedAssemblies(), reference =>
            string.Equals(reference.Name, "Minio", StringComparison.OrdinalIgnoreCase));
    }
}
