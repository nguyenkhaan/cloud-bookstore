using backend.src.Controllers;
using backend.src.Data;
using backend.src.Dto.Common;
using backend.src.Dto.CustomerDto;
using backend.src.Exceptions;
using backend.src.Helpers;
using backend.src.Models;
using backend.src.Models.Enums;
using backend.src.Services;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using Xunit;

namespace backend.Tests.Services;

public class CustomerEdgeCasesTests
{
    private static AppDbContext CreateDbContext(string databaseName, bool seedStandardTiers = true)
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(databaseName)
            .Options;
        var context = new AppDbContext(options);

        if (seedStandardTiers)
        {
            SeedStandardTiers(context);
        }

        return context;
    }

    private static void SeedStandardTiers(AppDbContext context)
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

    // =========================================================================
    // 1. STRANGE PHONE FORMATS EDGE CASES
    // =========================================================================

    [Theory]
    [InlineData("+84 (091) 234-5678", "0912345678")]
    [InlineData("+84.912.345.678", "0912345678")]
    [InlineData("( +84 ) 9.1.2 - 3.4.5 - 6.7.8", "0912345678")]
    [InlineData("840912345678", "0912345678")]
    [InlineData("84912345678", "0912345678")]
    [InlineData("\t+84 912 345 678\r\n", "0912345678")]
    [InlineData("+84-90-123-4567", "0901234567")]
    [InlineData("84 98 765 4321", "0987654321")]
    [InlineData("   +84 987 654 321   ", "0987654321")]
    public void Normalize_ComplexPunctuationAndWhitespace_SuccessfullyNormalizes(string input, string expected)
    {
        var result = PhoneHelper.Normalize(input);
        Assert.Equal(expected, result);

        var aliasResult = PhoneHelper.NormalizePhoneNumber(input);
        Assert.Equal(expected, aliasResult);
    }

    [Theory]
    [InlineData("0321234567", true)]  // Viettel 032
    [InlineData("0391234567", true)]  // Viettel 039
    [InlineData("0561234567", true)]  // Vietnamobile 056
    [InlineData("0581234567", true)]  // Vietnamobile 058
    [InlineData("0701234567", true)]  // MobiFone 070
    [InlineData("0791234567", true)]  // MobiFone 079
    [InlineData("0811234567", true)]  // Vinaphone 081
    [InlineData("0861234567", true)]  // Viettel 086
    [InlineData("0891234567", true)]  // MobiFone 089
    [InlineData("0901234567", true)]  // MobiFone 090
    [InlineData("0981234567", true)]  // Viettel 098
    public void Validate_AllVietnameseMobilePrefixes_PassesValidation(string input, bool expected)
    {
        var result = PhoneHelper.IsValidVietnamesePhoneNumber(input);
        Assert.Equal(expected, result);
    }

    [Theory]
    [InlineData("0123456789", false)]  // Invalid 01 prefix (old 11 digits)
    [InlineData("0243822233", false)]  // Hanoi landline (024)
    [InlineData("0283822233", false)]  // HCMC landline (028)
    [InlineData("0412345678", false)]  // Old landline (04)
    [InlineData("0612345678", false)]  // Special service (06)
    [InlineData("09123456789", false)] // 11 digits
    [InlineData("091234567", false)]   // 9 digits
    [InlineData("12345", false)]       // Too short
    [InlineData("091234567a", false)]  // Alphanumeric
    [InlineData("091234567!", false)]  // Symbol
    [InlineData("0000000000", false)]  // All zeros
    [InlineData("", false)]            // Empty
    [InlineData("   ", false)]         // Whitespace
    [InlineData(null, false)]          // Null
    public void Validate_InvalidOrAnomalousPhones_FailsValidation(string? input, bool expected)
    {
        var result = PhoneHelper.IsValidVietnamesePhoneNumber(input);
        Assert.Equal(expected, result);
    }

    [Fact]
    public async Task CreateCustomer_WithStrangeValidPhoneFormats_NormalizesAndSucceeds()
    {
        var dbName = Guid.NewGuid().ToString("N");
        await using var context = CreateDbContext(dbName);
        var service = CreateService(context);

        // Case 1: Phone with parentheses and hyphens
        var c1 = await service.CreateCustomerAsync(new CreateCustomerRequest
        {
            FullName = "Khách Hàng 1",
            Phone = "+84 (098) 765-4321"
        });
        Assert.Equal("0987654321", c1.Phone);

        // Case 2: Phone starting with 84 without plus
        var c2 = await service.CreateCustomerAsync(new CreateCustomerRequest
        {
            FullName = "Khách Hàng 2",
            Phone = "84971234567"
        });
        Assert.Equal("0971234567", c2.Phone);

        // Case 3: Phone with tabs, dots, and trailing newlines
        var c3 = await service.CreateCustomerAsync(new CreateCustomerRequest
        {
            FullName = "Khách Hàng 3",
            Phone = "\t+84.939.888.999\n"
        });
        Assert.Equal("0939888999", c3.Phone);
    }

    [Theory]
    [InlineData("+84 (028) 3822-2333")] // Landline
    [InlineData("abc-xyz-phone")]        // Non-numeric
    [InlineData("0168 123 4567")]        // Old 11-digit prefix
    [InlineData("0912")]                 // Too short
    public async Task CreateCustomer_WithInvalidPhoneFormats_ThrowsBadRequestException(string invalidPhone)
    {
        var dbName = Guid.NewGuid().ToString("N");
        await using var context = CreateDbContext(dbName);
        var service = CreateService(context);

        var request = new CreateCustomerRequest
        {
            FullName = "Khách Sai Số",
            Phone = invalidPhone
        };

        var ex = await Assert.ThrowsAsync<BadRequestException>(() => service.CreateCustomerAsync(request));
        Assert.Contains("Số điện thoại không hợp lệ", ex.Message);
    }

    // =========================================================================
    // 2. DUPLICATE SUBMISSION EDGE CASES
    // =========================================================================

    [Fact]
    public async Task CreateCustomer_DuplicateSubmissionSamePhoneDifferentFormat_ThrowsConflictException()
    {
        var dbName = Guid.NewGuid().ToString("N");
        await using var context = CreateDbContext(dbName);
        var service = CreateService(context);

        // Initial creation with standard format
        await service.CreateCustomerAsync(new CreateCustomerRequest
        {
            FullName = "Nguyễn Văn Gốc",
            Phone = "0987654321"
        });

        // Duplicate submission with international format and brackets
        var duplicateRequest = new CreateCustomerRequest
        {
            FullName = "Nguyễn Văn Bản Sao",
            Phone = "+84 (098) 765-4321"
        };

        var ex = await Assert.ThrowsAsync<ConflictException>(() => service.CreateCustomerAsync(duplicateRequest));
        Assert.Equal("Số điện thoại đã tồn tại trong hệ thống", ex.Message);
    }

    [Fact]
    public async Task CreateCustomer_DuplicateSubmissionPrefix84_ThrowsConflictException()
    {
        var dbName = Guid.NewGuid().ToString("N");
        await using var context = CreateDbContext(dbName);
        var service = CreateService(context);

        await service.CreateCustomerAsync(new CreateCustomerRequest
        {
            FullName = "Khách A",
            Phone = "0912345678"
        });

        var duplicateRequest = new CreateCustomerRequest
        {
            FullName = "Khách B",
            Phone = "84912345678"
        };

        var ex = await Assert.ThrowsAsync<ConflictException>(() => service.CreateCustomerAsync(duplicateRequest));
        Assert.Equal("Số điện thoại đã tồn tại trong hệ thống", ex.Message);
    }

    [Fact]
    public async Task CheckDuplicate_WithStrangePhoneFormat_FindsDuplicate()
    {
        var dbName = Guid.NewGuid().ToString("N");
        await using var context = CreateDbContext(dbName);
        var service = CreateService(context);

        await service.CreateCustomerAsync(new CreateCustomerRequest
        {
            FullName = "Võ Hoài Nam",
            Phone = "0909123456"
        });

        // Check using complex unnormalized string
        var checkResult = await service.CheckDuplicateAsync("+84 (090) 912-3456");

        Assert.True(checkResult.IsDuplicate);
        Assert.Equal("0909123456", checkResult.NormalizedPhone);
        Assert.NotNull(checkResult.ExistingCustomer);
        Assert.Equal("Võ Hoài Nam", checkResult.ExistingCustomer.FullName);
    }

    [Fact]
    public async Task CheckDuplicate_WithNonExistentStrangeFormat_ReturnsFalse()
    {
        var dbName = Guid.NewGuid().ToString("N");
        await using var context = CreateDbContext(dbName);
        var service = CreateService(context);

        var checkResult = await service.CheckDuplicateAsync("+84 (090) 111-2233");

        Assert.False(checkResult.IsDuplicate);
        Assert.Equal("0901112233", checkResult.NormalizedPhone);
        Assert.Null(checkResult.ExistingCustomer);
    }

    [Fact]
    public async Task UpdateCustomer_SamePhoneInDifferentFormat_DoesNotThrowConflict()
    {
        var dbName = Guid.NewGuid().ToString("N");
        await using var context = CreateDbContext(dbName);
        var service = CreateService(context);

        var created = await service.CreateCustomerAsync(new CreateCustomerRequest
        {
            FullName = "Trần Tự Cập Nhật",
            Phone = "0987654321"
        });

        // Update with same phone formatted with international code and spaces
        var updated = await service.UpdateCustomerAsync(created.Id, new UpdateCustomerRequest
        {
            FullName = "Trần Tự Cập Nhật Mới",
            Phone = "+84 987 654 321"
        });

        Assert.Equal("0987654321", updated.Phone);
        Assert.Equal("Trần Tự Cập Nhật Mới", updated.FullName);
    }

    [Fact]
    public async Task UpdateCustomer_DuplicateConflictWithAnotherCustomerDifferentFormat_ThrowsConflictException()
    {
        var dbName = Guid.NewGuid().ToString("N");
        await using var context = CreateDbContext(dbName);
        var service = CreateService(context);

        var c1 = await service.CreateCustomerAsync(new CreateCustomerRequest
        {
            FullName = "Khách Số 1",
            Phone = "0911111111"
        });

        var c2 = await service.CreateCustomerAsync(new CreateCustomerRequest
        {
            FullName = "Khách Số 2",
            Phone = "0922222222"
        });

        // Attempt to update c2 with c1's phone in a strange format
        var ex = await Assert.ThrowsAsync<ConflictException>(() => service.UpdateCustomerAsync(c2.Id, new UpdateCustomerRequest
        {
            FullName = "Khách Số 2",
            Phone = "+84 (091) 111-1111"
        }));

        Assert.Equal("Số điện thoại đã tồn tại trong hệ thống", ex.Message);
    }

    // =========================================================================
    // 3. TRANSACTION CONFLICT ON DELETE EDGE CASES
    // =========================================================================

    [Fact]
    public async Task DeleteCustomer_WithLinkedSaleInvoice_ThrowsBadRequestException()
    {
        var dbName = Guid.NewGuid().ToString("N");
        await using var context = CreateDbContext(dbName);
        var service = CreateService(context);

        var customer = await service.CreateCustomerAsync(new CreateCustomerRequest
        {
            FullName = "Khách Có Hóa Đơn Bán",
            Phone = "0905111222"
        });

        context.SaleInvoices.Add(new SaleInvoiceModel
        {
            Id = Guid.NewGuid(),
            InvoiceNo = "INV-SALE-001",
            CustomerId = customer.Id,
            CashSessionId = Guid.NewGuid(),
            CreatedBy = Guid.NewGuid(),
            Status = SaleInvoiceStatus.PAID
        });
        await context.SaveChangesAsync();

        var ex = await Assert.ThrowsAsync<BadRequestException>(() => service.DeleteCustomerAsync(customer.Id));
        Assert.Equal("Không thể xóa khách hàng đã có lịch sử giao dịch", ex.Message);
    }

    [Fact]
    public async Task DeleteCustomer_WithLinkedRentalSlip_ThrowsBadRequestException()
    {
        var dbName = Guid.NewGuid().ToString("N");
        await using var context = CreateDbContext(dbName);
        var service = CreateService(context);

        var customer = await service.CreateCustomerAsync(new CreateCustomerRequest
        {
            FullName = "Khách Có Phiếu Thuê",
            Phone = "0905333444"
        });

        context.RentalSlips.Add(new RentalSlipModel
        {
            Id = Guid.NewGuid(),
            SlipNo = "RENT-001",
            CustomerId = customer.Id,
            TierId = customer.TierId,
            RentDate = DateOnly.FromDateTime(DateTime.UtcNow),
            Status = RentalSlipStatus.DRAFT,
            CreatedBy = Guid.NewGuid()
        });
        await context.SaveChangesAsync();

        var ex = await Assert.ThrowsAsync<BadRequestException>(() => service.DeleteCustomerAsync(customer.Id));
        Assert.Equal("Không thể xóa khách hàng đã có lịch sử giao dịch", ex.Message);
    }

    [Fact]
    public async Task DeleteCustomer_WithLinkedStockReceipt_ThrowsBadRequestException()
    {
        var dbName = Guid.NewGuid().ToString("N");
        await using var context = CreateDbContext(dbName);
        var service = CreateService(context);

        var customer = await service.CreateCustomerAsync(new CreateCustomerRequest
        {
            FullName = "Khách Bán Lại Sách (Buyback)",
            Phone = "0905555666"
        });

        context.StockReceipts.Add(new StockReceiptModel
        {
            Id = Guid.NewGuid(),
            Code = "REC-BUYBACK-01",
            SourceType = StockReceiptSourceType.CUSTOMER_BUYBACK,
            SellerId = customer.Id,
            Status = ApprovalStatus.COMPLETED,
            TotalAmount = 250_000L,
            CreatedBy = Guid.NewGuid()
        });
        await context.SaveChangesAsync();

        var ex = await Assert.ThrowsAsync<BadRequestException>(() => service.DeleteCustomerAsync(customer.Id));
        Assert.Equal("Không thể xóa khách hàng đã có lịch sử giao dịch", ex.Message);
    }

    [Fact]
    public async Task DeleteCustomer_WithMultipleLinkedTransactions_ThrowsBadRequestException()
    {
        var dbName = Guid.NewGuid().ToString("N");
        await using var context = CreateDbContext(dbName);
        var service = CreateService(context);

        var customer = await service.CreateCustomerAsync(new CreateCustomerRequest
        {
            FullName = "Khách Đa Giao Dịch",
            Phone = "0905777888"
        });

        // Add both sale invoice and rental slip
        context.SaleInvoices.Add(new SaleInvoiceModel
        {
            Id = Guid.NewGuid(),
            InvoiceNo = "INV-SALE-MULTI",
            CustomerId = customer.Id,
            CashSessionId = Guid.NewGuid(),
            CreatedBy = Guid.NewGuid(),
            Status = SaleInvoiceStatus.PAID
        });
        context.RentalSlips.Add(new RentalSlipModel
        {
            Id = Guid.NewGuid(),
            SlipNo = "RENT-MULTI",
            CustomerId = customer.Id,
            TierId = customer.TierId,
            RentDate = DateOnly.FromDateTime(DateTime.UtcNow),
            Status = RentalSlipStatus.DRAFT,
            CreatedBy = Guid.NewGuid()
        });
        await context.SaveChangesAsync();

        var ex = await Assert.ThrowsAsync<BadRequestException>(() => service.DeleteCustomerAsync(customer.Id));
        Assert.Equal("Không thể xóa khách hàng đã có lịch sử giao dịch", ex.Message);
    }

    [Fact]
    public async Task DeleteCustomer_NonExistentCustomer_ThrowsNotFoundException()
    {
        var dbName = Guid.NewGuid().ToString("N");
        await using var context = CreateDbContext(dbName);
        var service = CreateService(context);

        var nonExistentId = Guid.NewGuid();
        var ex = await Assert.ThrowsAsync<NotFoundException>(() => service.DeleteCustomerAsync(nonExistentId));
        Assert.Contains(nonExistentId.ToString(), ex.Message);
    }

    [Fact]
    public async Task DeleteCustomer_ZeroTransactions_DeletesSuccessfully()
    {
        var dbName = Guid.NewGuid().ToString("N");
        await using var context = CreateDbContext(dbName);
        var service = CreateService(context);

        var customer = await service.CreateCustomerAsync(new CreateCustomerRequest
        {
            FullName = "Khách Xóa An Toàn",
            Phone = "0905999000"
        });

        // Delete should succeed
        await service.DeleteCustomerAsync(customer.Id);

        // Verification: GetCustomerById should throw NotFoundException
        await Assert.ThrowsAsync<NotFoundException>(() => service.GetCustomerByIdAsync(customer.Id));
    }

    // =========================================================================
    // 4. FALLBACK TIER & INPUT HANDLING EDGE CASES
    // =========================================================================

    [Fact]
    public async Task CreateCustomer_FallbackToLowestRankTier_WhenRegularTierMissing()
    {
        var dbName = Guid.NewGuid().ToString("N");
        // Create context without standard REGULAR tier
        await using var context = CreateDbContext(dbName, seedStandardTiers: false);

        // Only seed SILVER (rank 2) and GOLD (rank 3)
        context.MembershipTiers.AddRange(
            new MembershipTierModel
            {
                Id = Guid.NewGuid(),
                Name = MembershipTierName.SILVER,
                RankOrder = 2,
                MinSpend = 1_000_000L
            },
            new MembershipTierModel
            {
                Id = Guid.NewGuid(),
                Name = MembershipTierName.GOLD,
                RankOrder = 3,
                MinSpend = 3_000_000L
            }
        );
        await context.SaveChangesAsync();

        var service = CreateService(context);

        var customer = await service.CreateCustomerAsync(new CreateCustomerRequest
        {
            FullName = "Khách Hạng Fallback",
            Phone = "0919111222"
        });

        // Should fall back to SILVER because it has lowest rank_order (2)
        Assert.Equal("SILVER", customer.TierName);
        Assert.Equal(2, customer.TierRank);
    }

    [Fact]
    public async Task CreateCustomer_ThrowsInvalidOperationException_WhenNoTiersInDatabase()
    {
        var dbName = Guid.NewGuid().ToString("N");
        // Context with zero tiers
        await using var context = CreateDbContext(dbName, seedStandardTiers: false);
        var service = CreateService(context);

        var ex = await Assert.ThrowsAsync<InvalidOperationException>(() => service.CreateCustomerAsync(new CreateCustomerRequest
        {
            FullName = "Khách Không Có Hạng",
            Phone = "0919333444"
        }));

        Assert.Equal("Hạng thành viên mặc định chưa được thiết lập.", ex.Message);
    }

    [Fact]
    public async Task CreateCustomer_TrimsWhitespaceAndHandlesNulls()
    {
        var dbName = Guid.NewGuid().ToString("N");
        await using var context = CreateDbContext(dbName);
        var service = CreateService(context);

        var customer = await service.CreateCustomerAsync(new CreateCustomerRequest
        {
            FullName = "  Đỗ Minh Trí  ",
            Phone = "  0988 123 456  ",
            Email = "   ",              // Whitespace only -> should be null
            NationalId = "  079123456789  ",
            Address = null
        });

        Assert.Equal("Đỗ Minh Trí", customer.FullName);
        Assert.Equal("0988123456", customer.Phone);
        Assert.Null(customer.Email);
        Assert.Equal("079123456789", customer.NationalId);
        Assert.Null(customer.Address);
    }

    [Fact]
    public async Task UpdateCustomer_NonExistentCustomer_ThrowsNotFoundException()
    {
        var dbName = Guid.NewGuid().ToString("N");
        await using var context = CreateDbContext(dbName);
        var service = CreateService(context);

        var nonExistentId = Guid.NewGuid();
        await Assert.ThrowsAsync<NotFoundException>(() => service.UpdateCustomerAsync(nonExistentId, new UpdateCustomerRequest
        {
            FullName = "Khách Không Tồn Tại",
            Phone = "0901234567"
        }));
    }

    [Fact]
    public async Task GetCustomers_DiacriticsAndCasingSearch_ReturnsMatches()
    {
        var dbName = Guid.NewGuid().ToString("N");
        await using var context = CreateDbContext(dbName);
        var service = CreateService(context);

        await service.CreateCustomerAsync(new CreateCustomerRequest
        {
            FullName = "Nguyễn Thành Đạt",
            Phone = "0903111222",
            NationalId = "079111222333"
        });

        // Search in uppercase
        var upperResult = await service.GetCustomersAsync(new CustomerQuery { Search = "THÀNH ĐẠT" });
        Assert.Single(upperResult.Items);
        Assert.Equal("Nguyễn Thành Đạt", upperResult.Items[0].FullName);

        // Search partial phone
        var phoneResult = await service.GetCustomersAsync(new CustomerQuery { Search = "090311" });
        Assert.Single(phoneResult.Items);

        // Search partial national id
        var idResult = await service.GetCustomersAsync(new CustomerQuery { Search = "111222" });
        Assert.Single(idResult.Items);
    }

    // =========================================================================
    // 5. CONTROLLER ENDPOINTS UNIT TESTS
    // =========================================================================

    [Fact]
    public async Task CustomersController_CreateCustomer_ReturnsCreatedAtActionWithLocation()
    {
        var dbName = Guid.NewGuid().ToString("N");
        await using var context = CreateDbContext(dbName);
        var service = CreateService(context);
        var controller = new CustomersController(service);

        var request = new CreateCustomerRequest
        {
            FullName = "Khách Controller Test",
            Phone = "0912987654"
        };

        var actionResult = await controller.CreateCustomer(request, CancellationToken.None);
        var createdAtResult = Assert.IsType<CreatedAtActionResult>(actionResult.Result);

        Assert.Equal(StatusCodes.Status201Created, createdAtResult.StatusCode);
        Assert.Equal(nameof(CustomersController.GetCustomerById), createdAtResult.ActionName);

        var customer = Assert.IsType<CustomerDto>(createdAtResult.Value);
        Assert.Equal("Khách Controller Test", customer.FullName);
        Assert.Equal("0912987654", customer.Phone);
    }

    [Fact]
    public async Task CustomersController_GetCustomerById_ReturnsOkObjectResult()
    {
        var dbName = Guid.NewGuid().ToString("N");
        await using var context = CreateDbContext(dbName);
        var service = CreateService(context);
        var controller = new CustomersController(service);

        var created = await service.CreateCustomerAsync(new CreateCustomerRequest
        {
            FullName = "Khách Đọc ID",
            Phone = "0912000111"
        });

        var actionResult = await controller.GetCustomerById(created.Id, CancellationToken.None);
        var okResult = Assert.IsType<OkObjectResult>(actionResult.Result);

        Assert.Equal(StatusCodes.Status200OK, okResult.StatusCode);
        var customer = Assert.IsType<CustomerDto>(okResult.Value);
        Assert.Equal(created.Id, customer.Id);
    }

    [Fact]
    public async Task CustomersController_DeleteCustomer_ReturnsNoContent()
    {
        var dbName = Guid.NewGuid().ToString("N");
        await using var context = CreateDbContext(dbName);
        var service = CreateService(context);
        var controller = new CustomersController(service);

        var created = await service.CreateCustomerAsync(new CreateCustomerRequest
        {
            FullName = "Khách Sắp Xóa",
            Phone = "0912222333"
        });

        var actionResult = await controller.DeleteCustomer(created.Id, CancellationToken.None);
        var noContentResult = Assert.IsType<NoContentResult>(actionResult);

        Assert.Equal(StatusCodes.Status204NoContent, noContentResult.StatusCode);
    }

    [Fact]
    public async Task CustomersController_CheckDuplicate_ReturnsOkObjectResult()
    {
        var dbName = Guid.NewGuid().ToString("N");
        await using var context = CreateDbContext(dbName);
        var service = CreateService(context);
        var controller = new CustomersController(service);

        await service.CreateCustomerAsync(new CreateCustomerRequest
        {
            FullName = "Khách Kiểm Tra Trùng",
            Phone = "0912444555"
        });

        var actionResult = await controller.CheckDuplicate("+84 912 444 555", CancellationToken.None);
        var okResult = Assert.IsType<OkObjectResult>(actionResult.Result);

        Assert.Equal(StatusCodes.Status200OK, okResult.StatusCode);
        var duplicateResult = Assert.IsType<CustomerDuplicateCheckResult>(okResult.Value);
        Assert.True(duplicateResult.IsDuplicate);
        Assert.Equal("0912444555", duplicateResult.NormalizedPhone);
    }
}
