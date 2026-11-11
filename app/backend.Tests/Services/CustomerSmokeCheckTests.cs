using backend.src.Controllers;
using backend.src.Data;
using backend.src.Dto.Common;
using backend.src.Dto.CustomerDto;
using backend.src.Exceptions;
using backend.src.Models;
using backend.src.Models.Enums;
using backend.src.Services;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using Xunit;

namespace backend.Tests.Services;

/// <summary>
/// Runtime smoke check tests verifying all 7 customer endpoints on CustomersController:
/// 1. POST /api/customers (Create)
/// 2. GET /api/customers/{id} (Read)
/// 3. GET /api/customers (List & Filter)
/// 4. GET /api/customers/stats (Metrics)
/// 5. GET /api/customers/check-duplicate (Live candidate warning)
/// 6. PUT /api/customers/{id} (Update)
/// 7. DELETE /api/customers/{id} (Delete)
/// </summary>
public class CustomerSmokeCheckTests
{
    private static (AppDbContext context, CustomersController controller) CreateHarness(string dbName)
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(dbName)
            .Options;
        var context = new AppDbContext(options);

        // Seed tiers
        context.MembershipTiers.AddRange(
            new MembershipTierModel
            {
                Id = Guid.Parse("11111111-1111-1111-1111-111111111111"),
                Name = MembershipTierName.REGULAR,
                RankOrder = 1,
                MinSpend = 0L,
                MaxBooks = 3,
                MaxRentalDays = 7
            },
            new MembershipTierModel
            {
                Id = Guid.Parse("22222222-2222-2222-2222-222222222222"),
                Name = MembershipTierName.SILVER,
                RankOrder = 2,
                MinSpend = 1_000_000L,
                MaxBooks = 5,
                MaxRentalDays = 14
            },
            new MembershipTierModel
            {
                Id = Guid.Parse("33333333-3333-3333-3333-333333333333"),
                Name = MembershipTierName.GOLD,
                RankOrder = 3,
                MinSpend = 3_000_000L,
                MaxBooks = 8,
                MaxRentalDays = 21
            }
        );
        context.SaveChanges();

        var service = new CustomerService(context, NullLogger<CustomerService>.Instance);
        var controller = new CustomersController(service);
        return (context, controller);
    }

    [Fact]
    public async Task CustomerEndpoints_FullLifecycleSmokeCheck_AllEndpointsFunctionCorrectly()
    {
        var dbName = "smoke_" + Guid.NewGuid().ToString("N");
        var (context, controller) = CreateHarness(dbName);
        await using var _ = context;

        // ---------------------------------------------------------------------
        // Step 1: POST /api/customers -> 201 Created
        // ---------------------------------------------------------------------
        var createRequest = new CreateCustomerRequest
        {
            FullName = "Nguyễn Văn Smoke",
            Phone = "+84 912 888 999",
            Email = "smoke@example.com",
            NationalId = "079090123456",
            Address = "123 Đường Test, Quận 1"
        };

        var createResult = await controller.CreateCustomer(createRequest, CancellationToken.None);
        var createdAt = Assert.IsType<CreatedAtActionResult>(createResult.Result);
        Assert.Equal(StatusCodes.Status201Created, createdAt.StatusCode);

        var createdCustomer = Assert.IsType<CustomerDto>(createdAt.Value);
        Assert.NotEqual(Guid.Empty, createdCustomer.Id);
        Assert.Equal("0912888999", createdCustomer.Phone); // Normalized
        Assert.Equal("Nguyễn Văn Smoke", createdCustomer.FullName);
        Assert.Equal("REGULAR", createdCustomer.TierName);
        Assert.Equal(0L, createdCustomer.EligibleSpend);
        var customerId = createdCustomer.Id;

        // ---------------------------------------------------------------------
        // Step 2: GET /api/customers/{id} -> 200 OK
        // ---------------------------------------------------------------------
        var getByIdResult = await controller.GetCustomerById(customerId, CancellationToken.None);
        var okGetById = Assert.IsType<OkObjectResult>(getByIdResult.Result);
        Assert.Equal(StatusCodes.Status200OK, okGetById.StatusCode);

        var fetchedCustomer = Assert.IsType<CustomerDto>(okGetById.Value);
        Assert.Equal(customerId, fetchedCustomer.Id);
        Assert.Equal("0912888999", fetchedCustomer.Phone);

        // ---------------------------------------------------------------------
        // Step 3: GET /api/customers (List & Search) -> 200 OK with PagedResult
        // ---------------------------------------------------------------------
        var query = new CustomerQuery
        {
            Page = 1,
            PageSize = 10,
            Search = "Smoke"
        };
        var listResult = await controller.GetCustomers(query, CancellationToken.None);
        var okList = Assert.IsType<OkObjectResult>(listResult.Result);
        Assert.Equal(StatusCodes.Status200OK, okList.StatusCode);

        var paged = Assert.IsType<PagedResult<CustomerDto>>(okList.Value);
        Assert.Equal(1, paged.TotalCount);
        Assert.Single(paged.Items);
        Assert.Equal("Nguyễn Văn Smoke", paged.Items[0].FullName);

        // ---------------------------------------------------------------------
        // Step 4: GET /api/customers/stats -> 200 OK
        // ---------------------------------------------------------------------
        var statsResult = await controller.GetCustomerStats(CancellationToken.None);
        var okStats = Assert.IsType<OkObjectResult>(statsResult.Result);
        Assert.Equal(StatusCodes.Status200OK, okStats.StatusCode);

        var stats = Assert.IsType<CustomerStatsDto>(okStats.Value);
        Assert.Equal(1, stats.TotalCount);
        Assert.Equal(0, stats.FlaggedCount);

        // ---------------------------------------------------------------------
        // Step 5: GET /api/customers/check-duplicate -> 200 OK
        // ---------------------------------------------------------------------
        // Existing phone (different format)
        var dupCheckExisting = await controller.CheckDuplicate("(091) 288-8999", CancellationToken.None);
        var okDupExisting = Assert.IsType<OkObjectResult>(dupCheckExisting.Result);
        var dupExistingResult = Assert.IsType<CustomerDuplicateCheckResult>(okDupExisting.Value);
        Assert.True(dupExistingResult.IsDuplicate);
        Assert.Equal("0912888999", dupExistingResult.NormalizedPhone);
        Assert.NotNull(dupExistingResult.ExistingCustomer);

        // Non-existing phone
        var dupCheckNew = await controller.CheckDuplicate("0987654321", CancellationToken.None);
        var okDupNew = Assert.IsType<OkObjectResult>(dupCheckNew.Result);
        var dupNewResult = Assert.IsType<CustomerDuplicateCheckResult>(okDupNew.Value);
        Assert.False(dupNewResult.IsDuplicate);
        Assert.Null(dupNewResult.ExistingCustomer);

        // ---------------------------------------------------------------------
        // Step 6: PUT /api/customers/{id} -> 200 OK
        // ---------------------------------------------------------------------
        var updateRequest = new UpdateCustomerRequest
        {
            FullName = "Nguyễn Văn Smoke Đã Sửa",
            Phone = "0912888999",
            Email = "smoke.updated@example.com",
            IsFlagged = true,
            FlagReason = "Cảnh báo kiểm tra"
        };
        var updateResult = await controller.UpdateCustomer(customerId, updateRequest, CancellationToken.None);
        var okUpdate = Assert.IsType<OkObjectResult>(updateResult.Result);
        Assert.Equal(StatusCodes.Status200OK, okUpdate.StatusCode);

        var updatedCustomer = Assert.IsType<CustomerDto>(okUpdate.Value);
        Assert.Equal("Nguyễn Văn Smoke Đã Sửa", updatedCustomer.FullName);
        Assert.Equal("smoke.updated@example.com", updatedCustomer.Email);
        Assert.True(updatedCustomer.IsFlagged);
        Assert.Equal("Cảnh báo kiểm tra", updatedCustomer.FlagReason);

        // Verify stats reflects updated flag
        var updatedStatsResult = await controller.GetCustomerStats(CancellationToken.None);
        var updatedStats = Assert.IsType<CustomerStatsDto>(((OkObjectResult)updatedStatsResult.Result!).Value);
        Assert.Equal(1, updatedStats.FlaggedCount);

        // ---------------------------------------------------------------------
        // Step 7: DELETE /api/customers/{id} -> 204 NoContent
        // ---------------------------------------------------------------------
        var deleteResult = await controller.DeleteCustomer(customerId, CancellationToken.None);
        var noContent = Assert.IsType<NoContentResult>(deleteResult);
        Assert.Equal(StatusCodes.Status204NoContent, noContent.StatusCode);

        // Verify customer is gone -> GET throws NotFoundException
        await Assert.ThrowsAsync<NotFoundException>(() => controller.GetCustomerById(customerId, CancellationToken.None));
    }
}
