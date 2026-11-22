using System.Net;
using backend.src.Data;
using backend.src.Dto.AuditLogDto;
using backend.src.Dto.BuybackDto;
using backend.src.Exceptions;
using backend.src.Models;
using backend.src.Models.Enums;
using backend.src.Services;
using Microsoft.EntityFrameworkCore;
using Xunit;

namespace backend.Tests;

public class CustomerBuybackServiceTests
{
    private static AppDbContext CreateDbContext()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase($"customer-buyback-tests-{Guid.NewGuid()}")
            .Options;
        return new AppDbContext(options);
    }

    [Fact]
    public async Task CreateAndCompleteBuyback_ValidatesSeller_ChecksLimits_AndGeneratesCopiesAndPayment()
    {
        await using var dbContext = CreateDbContext();
        var roleId = Guid.NewGuid();
        var employeeId = Guid.NewGuid();
        var titleId = Guid.NewGuid();
        var editionId = Guid.NewGuid();

        dbContext.Roles.Add(new RoleModel { Id = roleId, RoleName = RoleName.CASHIER, IsActive = true });
        dbContext.Employees.Add(new EmployeeModel
        {
            Id = employeeId,
            Email = "cashier@cloud.io",
            FullName = "Cashier Test",
            Password = "hash",
            Phone = "0900000003",
            RoleId = roleId,
            Status = EmployeeStatus.ACTIVE
        });
        dbContext.Titles.Add(new TitleModel { Id = titleId, Name = "Conan - Tập 01", IsActive = true });
        dbContext.Editions.Add(new EditionModel
        {
            Id = editionId,
            TitleId = titleId,
            Isbn = "9786042227211",
            CoverPrice = 150000,
            IsActive = true
        });
        await dbContext.SaveChangesAsync();

        var auditService = new AuditLogService(dbContext);
        var service = new CustomerBuybackService(dbContext, auditService);
        var auditCtx = new AuditLogContext(employeeId, IPAddress.Loopback);

        await Assert.ThrowsAsync<BadRequestException>(() =>
            service.CreateBuybackAsync(
                new CreateCustomerBuybackRequest(
                    SellerName: "",
                    SellerPhone: "0918567890",
                    Lines: [new CreateCustomerBuybackLineRequest(editionId, null, "Conan", ConditionGrade.A, 90000, 130000, 1)]),
                isAdmin: false,
                auditCtx));

        var overLimitPending = await service.CreateBuybackAsync(
            new CreateCustomerBuybackRequest(
                SellerName: "Lê Hoàng Nam",
                SellerPhone: "0918567890",
                ExceedReason: "Ấn bản giới hạn",
                ManagerPin: null,
                CompleteImmediately: false,
                Lines:
                [
                    new CreateCustomerBuybackLineRequest(
                        editionId,
                        "9786042227211",
                        "Doraemon Tuyển tập đặc biệt",
                        ConditionGrade.B,
                        AgreedBuyPrice: 220000,
                        ExpectedSellingPrice: 300000,
                        Quantity: 1)
                ]),
            isAdmin: false,
            auditCtx);

        Assert.True(overLimitPending.NeedsApproval);
        Assert.Equal(ApprovalStatus.PENDING_APPROVAL, overLimitPending.Status);

        var completed = await service.CompleteBuybackAsync(
            overLimitPending.Id,
            new CompleteCustomerBuybackRequest(PaymentMethod.CASH, ManagerPin: "1234"),
            isAdmin: false,
            auditCtx);

        Assert.Equal(ApprovalStatus.COMPLETED, completed.Status);
        Assert.Equal(1, completed.GeneratedCopyCount);
        Assert.Single(completed.Lines[0].Barcodes);
        Assert.NotNull(completed.PaymentNo);
    }
}
