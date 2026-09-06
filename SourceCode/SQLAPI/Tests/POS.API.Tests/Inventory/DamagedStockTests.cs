using System;
using System.Linq;
using System.Net;
using System.Net.Http;
using System.Net.Http.Json;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using POS.API.Tests.Infra;
using POS.Data.Entities;
using POS.Data.Entities.Stock;
using Xunit;

namespace POS.API.Tests.Inventory;

/// <summary>
/// D05 damaged-stock lane: reporting damage persists the DamagedStock row and drives the stock-out
/// accounting pipeline (TransactionType.StockAdjustment).
/// Verified fixes:
/// - N-36: Stock availability guard prevents negative inventory (returns HTTP 422 if requested > available).
/// - N-35: ProductStockController write routes require [Authorize] and INVE_MANAGE_INVENTORY claim.
/// </summary>
public sealed class DamagedStockTests : IClassFixture<TestWebApplicationFactory>
{
    private readonly TestWebApplicationFactory _factory;

    public DamagedStockTests(TestWebApplicationFactory factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task Should_CreateDamagedStock_And_PersistRows()
    {
        await _factory.EnsureSeededAsync();
        var client = await _factory.CreateAuthorizedClientAsync(TestSeed.AdminEmail, TestSeed.AdminPassword);

        var response = await client.PostAsJsonAsync("/api/DamagedStock", DamagePayload("Water damage", TestIds.LocationL1Id));
        Assert.True(response.IsSuccessStatusCode, await response.Content.ReadAsStringAsync());

        await _factory.UsingDbAsync(async db =>
        {
            var row = await db.Set<DamagedStock>().AsNoTracking().FirstOrDefaultAsync(d =>
                d.Reason == "Water damage" && d.ProductId == TestIds.ProductPcMonitorId && d.LocationId == TestIds.LocationL1Id);
            Assert.NotNull(row);
            Assert.Equal(2m, row.DamagedQuantity);
            Assert.Equal(TestIds.LocationL1Id, row.LocationId);
            Assert.Equal(TestIds.AdminUserId, row.ReportedId);
            Assert.False(row.IsDeleted);
        });
    }

    [Fact]
    public async Task Should_ReduceCurrentStock_When_StockIsAvailable()
    {
        await _factory.EnsureSeededAsync();
        var client = await _factory.CreateAuthorizedClientAsync(TestSeed.AdminEmail, TestSeed.AdminPassword);

        var before = await StockAsync(TestIds.LocationL1Id);

        var response = await client.PostAsJsonAsync("/api/DamagedStock", DamagePayload("Broken screen", TestIds.LocationL1Id));
        Assert.True(response.IsSuccessStatusCode, await response.Content.ReadAsStringAsync());

        Assert.Equal(before - 2m, await StockAsync(TestIds.LocationL1Id));
    }

    [Fact]
    public async Task Should_Return422_When_DamagedStockExceedsAvailableStock_GapTargetN36Fixed()
    {
        await _factory.EnsureSeededAsync();
        var client = await _factory.CreateAuthorizedClientAsync(TestSeed.AdminEmail, TestSeed.AdminPassword);

        // LocationFbrId is seeded with CurrentStock = 0m. Attempting to write off 2 units must return 422.
        var response = await client.PostAsJsonAsync("/api/DamagedStock", DamagePayload("Zero stock write-off probe", TestIds.LocationFbrId));

        Assert.Equal(HttpStatusCode.UnprocessableEntity, response.StatusCode);
    }

    [Fact]
    public async Task Should_Return403_When_PostingDamagedStockWithoutManageClaim()
    {
        await _factory.EnsureSeededAsync();
        var client = await _factory.CreateAuthorizedClientAsync(TestSeed.NoClaimsEmail, TestSeed.NoClaimsPassword);

        var response = await client.PostAsJsonAsync("/api/DamagedStock", DamagePayload("No claim", TestIds.LocationL1Id));

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task Should_ListDamagedStock_When_Claimed()
    {
        await _factory.EnsureSeededAsync();
        var client = await _factory.CreateAuthorizedClientAsync(TestSeed.AdminEmail, TestSeed.AdminPassword);
        (await client.PostAsJsonAsync("/api/DamagedStock", DamagePayload($"Damage-{Guid.NewGuid():N}"[..12], TestIds.LocationL1Id))).EnsureSuccessStatusCode();

        var list = await client.GetAsync("/api/DamagedStock");
        Assert.True(list.IsSuccessStatusCode, await list.Content.ReadAsStringAsync());
    }

    [Fact]
    public async Task Should_Return403_When_StockAdjustmentWithoutInventoryClaim_GapTargetFixed()
    {
        await _factory.EnsureSeededAsync();
        var client = await _factory.CreateAuthorizedClientAsync(TestSeed.NoClaimsEmail, TestSeed.NoClaimsPassword);

        var response = await client.PostAsJsonAsync("/api/ProductStock", new
        {
            productId = TestIds.ProductPcMonitorId,
            locationId = TestIds.LocationL1Id,
            unitId = TestIds.UnitPcId,
            currentStock = 1m,
            pricePerUnit = 10.00m,
            paymentMethod = 1,
            referenceNumber = $"ADJ-NC-{Guid.NewGuid():N}"[..12]
        });

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    private async Task<decimal> StockAsync(Guid locationId) =>
        await _factory.UsingDbAsync(db => db.Set<ProductStock>().AsNoTracking()
            .Where(s => s.ProductId == TestIds.ProductPcMonitorId && s.LocationId == locationId)
            .Select(s => s.CurrentStock)
            .FirstOrDefaultAsync());

    private static object DamagePayload(string reason, Guid locationId) => new
    {
        reason,
        reportedId = TestIds.AdminUserId,
        locationId,
        damagedDate = DateTime.UtcNow,
        damagedStockItems = new object[]
        {
            new { productId = TestIds.ProductPcMonitorId, damagedQuantity = 2m, unitId = TestIds.UnitPcId }
        }
    };
}