using backend.src.Data;
using backend.src.Dto.CustomerDto;
using backend.src.Exceptions;
using backend.src.Models;
using backend.src.Models.Enums;
using backend.src.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using Xunit;

namespace backend.Tests.Services;

public class CustomerServiceTests
{
    private static AppDbContext CreateDbContext(string databaseName)
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(databaseName)
            .Options;
        var context = new AppDbContext(options);
        SeedTiers(context);
        return context;
    }

    private static void SeedTiers(AppDbContext context)
    {
        if (context.MembershipTiers.Any()) return;

        context.MembershipTiers.AddRange(
            new MembershipTierModel
            {
                Id = Guid.Parse("11111111-1111-1111-1111-111111111111"),
                Name = MembershipTierName.REGULAR,
                RankOrder = 1,
                MinSpend = 0L,
                MaxBooks = 3,
                MaxRentalDays = 7,
                RentDiscountPct = 0m,
                SaleDiscountPct = 0m
            },
            new MembershipTierModel
            {
                Id = Guid.Parse("22222222-2222-2222-2222-222222222222"),
                Name = MembershipTierName.SILVER,
                RankOrder = 2,
                MinSpend = 1_000_000L,
                MaxBooks = 5,
                MaxRentalDays = 14,
                RentDiscountPct = 10m,
                SaleDiscountPct = 5m
            },
            new MembershipTierModel
            {
                Id = Guid.Parse("33333333-3333-3333-3333-333333333333"),
                Name = MembershipTierName.GOLD,
                RankOrder = 3,
                MinSpend = 3_000_000L,
                MaxBooks = 8,
                MaxRentalDays = 21,
                RentDiscountPct = 20m,
                SaleDiscountPct = 10m
            }
        );
        context.SaveChanges();
    }

    private static CustomerService CreateService(AppDbContext dbContext)
    {
        return new CustomerService(dbContext, NullLogger<CustomerService>.Instance);
    }

    [Fact]
    public async Task CreateCustomer_ValidRequest_CreatesCustomerWithRegularTierAndZeroSpend()
    {
        var dbName = Guid.NewGuid().ToString("N");
        await using var context = CreateDbContext(dbName);
        var service = CreateService(context);

        var request = new CreateCustomerRequest
        {
            FullName = "Nguyễn Văn A",
            Phone = "+84 912 345 678",
            Email = "vana@example.com",
            NationalId = "001234567890",
            Address = "123 Lê Lợi, Q1"
        };

        var result = await service.CreateCustomerAsync(request);

        Assert.NotNull(result);
        Assert.NotEqual(Guid.Empty, result.Id);
        Assert.Equal("0912345678", result.Phone);
        Assert.Equal("Nguyễn Văn A", result.FullName);
        Assert.Equal("vana@example.com", result.Email);
        Assert.Equal("REGULAR", result.TierName);
        Assert.Equal(0L, result.EligibleSpend);
        Assert.False(result.IsFlagged);
    }

    [Fact]
    public async Task CreateCustomer_InvalidPhone_ThrowsBadRequestException()
    {
        var dbName = Guid.NewGuid().ToString("N");
        await using var context = CreateDbContext(dbName);
        var service = CreateService(context);

        var request = new CreateCustomerRequest
        {
            FullName = "Nguyễn Văn B",
            Phone = "0123456789" // Invalid prefix 01
        };

        await Assert.ThrowsAsync<BadRequestException>(() => service.CreateCustomerAsync(request));
    }

    [Fact]
    public async Task CreateCustomer_DuplicatePhone_ThrowsConflictException()
    {
        var dbName = Guid.NewGuid().ToString("N");
        await using var context = CreateDbContext(dbName);
        var service = CreateService(context);

        var request1 = new CreateCustomerRequest
        {
            FullName = "Nguyễn Văn A",
            Phone = "0912345678"
        };
        await service.CreateCustomerAsync(request1);

        var request2 = new CreateCustomerRequest
        {
            FullName = "Trần Thị B",
            Phone = "+84 912 345 678" // Same phone normalized
        };

        await Assert.ThrowsAsync<ConflictException>(() => service.CreateCustomerAsync(request2));
    }

    [Fact]
    public async Task CheckDuplicate_ExistingAndNonExistingPhones_ReturnsExpectedResult()
    {
        var dbName = Guid.NewGuid().ToString("N");
        await using var context = CreateDbContext(dbName);
        var service = CreateService(context);

        await service.CreateCustomerAsync(new CreateCustomerRequest
        {
            FullName = "Nguyễn Văn A",
            Phone = "0912345678"
        });

        // Duplicate test
        var checkExisting = await service.CheckDuplicateAsync("+84 912-345-678");
        Assert.True(checkExisting.IsDuplicate);
        Assert.Equal("0912345678", checkExisting.NormalizedPhone);
        Assert.NotNull(checkExisting.ExistingCustomer);
        Assert.Equal("Nguyễn Văn A", checkExisting.ExistingCustomer.FullName);

        // Non-duplicate test
        var checkNonExisting = await service.CheckDuplicateAsync("0987654321");
        Assert.False(checkNonExisting.IsDuplicate);
        Assert.Equal("0987654321", checkNonExisting.NormalizedPhone);
        Assert.Null(checkNonExisting.ExistingCustomer);

        // Empty phone test
        var checkEmpty = await service.CheckDuplicateAsync("");
        Assert.False(checkEmpty.IsDuplicate);
        Assert.Null(checkEmpty.ExistingCustomer);
    }

    [Fact]
    public async Task GetCustomers_WithFiltersAndSearch_ReturnsFilteredPagedResult()
    {
        var dbName = Guid.NewGuid().ToString("N");
        await using var context = CreateDbContext(dbName);
        var service = CreateService(context);

        await service.CreateCustomerAsync(new CreateCustomerRequest
        {
            FullName = "Nguyễn Thu Hà",
            Phone = "0909234567",
            NationalId = "079012345678"
        });
        await service.CreateCustomerAsync(new CreateCustomerRequest
        {
            FullName = "Trần Quốc Bảo",
            Phone = "0918345678",
            NationalId = "079098765432"
        });

        // Search by phone
        var searchPhoneResult = await service.GetCustomersAsync(new CustomerQuery { Search = "0909" });
        Assert.Single(searchPhoneResult.Items);
        Assert.Equal("Nguyễn Thu Hà", searchPhoneResult.Items[0].FullName);

        // Search by name
        var searchNameResult = await service.GetCustomersAsync(new CustomerQuery { Search = "quốc bảo" });
        Assert.Single(searchNameResult.Items);
        Assert.Equal("Trần Quốc Bảo", searchNameResult.Items[0].FullName);

        // Search by national id
        var searchNationalIdResult = await service.GetCustomersAsync(new CustomerQuery { Search = "079012" });
        Assert.Single(searchNationalIdResult.Items);
        Assert.Equal("Nguyễn Thu Hà", searchNationalIdResult.Items[0].FullName);
    }

    [Fact]
    public async Task UpdateCustomer_ValidUpdate_UpdatesAndReturnsCustomer()
    {
        var dbName = Guid.NewGuid().ToString("N");
        await using var context = CreateDbContext(dbName);
        var service = CreateService(context);

        var created = await service.CreateCustomerAsync(new CreateCustomerRequest
        {
            FullName = "Nguyễn Văn C",
            Phone = "0901234567"
        });

        var updated = await service.UpdateCustomerAsync(created.Id, new UpdateCustomerRequest
        {
            FullName = "Nguyễn Văn C Cập Nhật",
            Phone = "0901234567", // Same phone
            Email = "c_updated@example.com",
            IsFlagged = true,
            FlagReason = "Chậm trả sách nhiều lần"
        });

        Assert.Equal("Nguyễn Văn C Cập Nhật", updated.FullName);
        Assert.Equal("c_updated@example.com", updated.Email);
        Assert.True(updated.IsFlagged);
        Assert.Equal("Chậm trả sách nhiều lần", updated.FlagReason);
    }

    [Fact]
    public async Task UpdateCustomer_ConflictPhone_ThrowsConflictException()
    {
        var dbName = Guid.NewGuid().ToString("N");
        await using var context = CreateDbContext(dbName);
        var service = CreateService(context);

        var c1 = await service.CreateCustomerAsync(new CreateCustomerRequest
        {
            FullName = "Khách A",
            Phone = "0901111111"
        });
        var c2 = await service.CreateCustomerAsync(new CreateCustomerRequest
        {
            FullName = "Khách B",
            Phone = "0902222222"
        });

        // Try updating c2's phone to c1's phone
        await Assert.ThrowsAsync<ConflictException>(() => service.UpdateCustomerAsync(c2.Id, new UpdateCustomerRequest
        {
            FullName = "Khách B",
            Phone = "0901111111"
        }));
    }

    [Fact]
    public async Task DeleteCustomer_NoTransactions_DeletesSuccessfully()
    {
        var dbName = Guid.NewGuid().ToString("N");
        await using var context = CreateDbContext(dbName);
        var service = CreateService(context);

        var customer = await service.CreateCustomerAsync(new CreateCustomerRequest
        {
            FullName = "Khách Xóa",
            Phone = "0903333333"
        });

        await service.DeleteCustomerAsync(customer.Id);

        await Assert.ThrowsAsync<NotFoundException>(() => service.GetCustomerByIdAsync(customer.Id));
    }

    [Fact]
    public async Task DeleteCustomer_WithTransactions_ThrowsBadRequestException()
    {
        var dbName = Guid.NewGuid().ToString("N");
        await using var context = CreateDbContext(dbName);
        var service = CreateService(context);

        var customer = await service.CreateCustomerAsync(new CreateCustomerRequest
        {
            FullName = "Khách Có Hóa Đơn",
            Phone = "0904444444"
        });

        // Add a sale invoice referencing this customer
        context.SaleInvoices.Add(new SaleInvoiceModel
        {
            Id = Guid.NewGuid(),
            InvoiceNo = "INV-TEST-001",
            CustomerId = customer.Id,
            CashSessionId = Guid.NewGuid(),
            CreatedBy = Guid.NewGuid(),
            Status = SaleInvoiceStatus.PAID
        });
        await context.SaveChangesAsync();

        await Assert.ThrowsAsync<BadRequestException>(() => service.DeleteCustomerAsync(customer.Id));
    }
}
