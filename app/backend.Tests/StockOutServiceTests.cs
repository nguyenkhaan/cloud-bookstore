using System.Net;
using backend.src.Data;
using backend.src.Dto.AuditLogDto;
using backend.src.Dto.StockOutDto;
using backend.src.Exceptions;
using backend.src.Models;
using backend.src.Models.Enums;
using backend.src.Services;
using Microsoft.EntityFrameworkCore;
using Xunit;

namespace backend.Tests;

public class StockOutServiceTests
{
    private static AppDbContext CreateDbContext()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase($"stock-out-tests-{Guid.NewGuid()}")
            .Options;
        return new AppDbContext(options);
    }

    [Fact]
    public async Task CreateAndConfirmStockOut_TransitionsCopyStatusToDisposedAndBlocksRentedCopies()
    {
        await using var dbContext = CreateDbContext();
        var roleId = Guid.NewGuid();
        var employeeId = Guid.NewGuid();
        var titleId = Guid.NewGuid();
        var editionId = Guid.NewGuid();
        var receiptLineId = Guid.NewGuid();
        var availableCopyId = Guid.NewGuid();
        var rentedCopyId = Guid.NewGuid();

        dbContext.Roles.Add(new RoleModel { Id = roleId, RoleName = RoleName.ADMIN, IsActive = true });
        dbContext.Employees.Add(new EmployeeModel
        {
            Id = employeeId,
            Email = "admin@cloud.io",
            FullName = "Admin Test",
            Password = "hash",
            Phone = "0900000001",
            RoleId = roleId,
            Status = EmployeeStatus.ACTIVE
        });
        dbContext.Titles.Add(new TitleModel { Id = titleId, Name = "Nhà giả kim", IsActive = true });
        dbContext.Editions.Add(new EditionModel
        {
            Id = editionId,
            TitleId = titleId,
            CoverPrice = 65000,
            IsActive = true
        });
        dbContext.BookCopies.AddRange(
            new BookCopyModel
            {
                Id = availableCopyId,
                CopyBarcode = "BC-000003",
                EditionId = editionId,
                ReceiptLineId = receiptLineId,
                Status = BookCopyStatus.AVAILABLE,
                ConditionGrade = ConditionGrade.C,
                CostPrice = 42000,
                SellingPrice = 65000
            },
            new BookCopyModel
            {
                Id = rentedCopyId,
                CopyBarcode = "BC-000005",
                EditionId = editionId,
                ReceiptLineId = receiptLineId,
                Status = BookCopyStatus.RENTED,
                ConditionGrade = ConditionGrade.A,
                CostPrice = 58000,
                SellingPrice = 92000
            });
        await dbContext.SaveChangesAsync();

        var auditService = new AuditLogService(dbContext);
        var service = new StockOutService(dbContext, auditService);
        var auditCtx = new AuditLogContext(employeeId, IPAddress.Loopback);

        await Assert.ThrowsAsync<ConflictException>(() =>
            service.CreateStockOutAsync(
                new CreateStockOutRequest(
                    "DISPOSAL_DAMAGED",
                    "Sách đang cho thuê không được xuất hủy",
                    null,
                    [new StockOutLineRequest("BC-000005", "Đang thuê")]),
                isAdmin: true,
                auditCtx));

        var created = await service.CreateStockOutAsync(
            new CreateStockOutRequest(
                "DISPOSAL_DAMAGED",
                "Sách bị ẩm sau sự cố rò nước kệ B1",
                "hien-trang-ke-B1.jpg",
                [new StockOutLineRequest("BC-000003", "Ẩm mốc 20 trang")]),
            isAdmin: true,
            auditCtx);

        Assert.Equal(ApprovalStatus.APPROVED, created.Status);
        Assert.Equal(42000L, created.TotalCost);

        var confirmed = await service.ConfirmStockOutAsync(created.Id, isAdmin: true, auditCtx);
        Assert.Equal(ApprovalStatus.COMPLETED, confirmed.Status);

        var updatedCopy = await dbContext.BookCopies.FindAsync(availableCopyId);
        Assert.NotNull(updatedCopy);
        Assert.Equal(BookCopyStatus.DISPOSED, updatedCopy!.Status);
    }
}
