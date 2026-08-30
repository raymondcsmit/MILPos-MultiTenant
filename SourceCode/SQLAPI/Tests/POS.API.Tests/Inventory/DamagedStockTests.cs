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
/// accounting pipeline (TransactionType.StockAdjustment). Characterized facts: CurrentStock
/// DECREASES by the damaged quantity with no availability/zero-clamp guard (can go negative, N-36);
/// ProductStockController writes carry no [ClaimCheck] so a NoClaims user can post adjustments (N-35).
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

        var response = await client.PostAsJsonAsync("/api/DamagedStock", DamagePayload("Water damage"));
        Assert.True(response.IsSuccessStatusCode, await response.Content.ReadAsStringAsync());

        await _factory.UsingDbAsync(async db =>
        {
            var row = await db.Set<DamagedStock>().AsNoTracking().SingleAsync(d =>
                d.Reason == "Water damage" && d.ProductId == TestIds.ProductPcMonitorId);
            Assert.Equal(2m, row.DamagedQuantity);
            Assert.Equal(TestIds.LocationFbrId, row.LocationId);
            Assert.Equal(TestIds.AdminUserId, row.ReportedId);
            Assert.False(row.IsDeleted);
        });
    }

    [Fact]
    public async Task Should_ReduceCurrentStock_ByDamagedQuantity_WithoutZeroClamp_GapCharacterization()
    {
        await _factory.EnsureSeededAsync();
        var client = await _factory.CreateAuthorizedClientAsync(TestSeed.AdminEmail, TestSeed.AdminPassword);

        var before = await StockAsync(TestIds.LocationFbrId);

        var response = await client.PostAsJsonAsync("/api/DamagedStock", DamagePayload("Broken screen"));
        Assert.True(response.IsSuccessStatusCode, await response.Content.ReadAsStringAsync());

        Assert.Equal(before - 2m, await StockAsync(TestIds.LocationFbrId));
    }

    [Fact]
    public async Task Should_Return403_When_PostingDamagedStockWithoutManageClaim()
    {
        await _factory.EnsureSeededAsync();
        var client = await _factory.CreateAuthorizedClientAsync(TestSeed.NoClaimsEmail, TestSeed.NoClaimsPassword);

        var response = await client.PostAsJsonAsync("/api/DamagedStock", DamagePayload("No claim"));

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task Should_ListDamagedStock_When_Claimed()
    {
        await _factory.EnsureSeededAsync();
        var client = await _factory.CreateAuthorizedClientAsync(TestSeed.AdminEmail, TestSeed.AdminPassword);
        (await client.PostAsJsonAsync("/api/DamagedStock", DamagePayload($"Damage-{Guid.NewGuid():N}"[..12]))).EnsureSuccessStatusCode();

        var list = await client.GetAsync("/api/DamagedStock");
        Assert.True(list.IsSuccessStatusCode, await list.Content.ReadAsStringAsync());
    }

    [Fact]
    public async Task Should_AllowStockAdjustment_WithoutInventoryClaim_GapCharacterization()
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

        Assert.NotEqual(HttpStatusCode.Forbidden, response.StatusCode);
    }

    private async Task<decimal> StockAsync(Guid locationId) =>
        await _factory.UsingDbAsync(db => db.Set<ProductStock>().AsNoTracking()
            .Where(s => s.ProductId == TestIds.ProductPcMonitorId && s.LocationId == locationId)
            .Select(s => s.CurrentStock)
            .FirstOrDefaultAsync());

    private static object DamagePayload(string reason) => new
    {
        reason,
        reportedId = TestIds.AdminUserId,
        locationId = TestIds.LocationFbrId,
        damagedDate = DateTime.UtcNow,
        damagedStockItems = new object[]
        {
            new { productId = TestIds.ProductPcMonitorId, damagedQuantity = 2m, unitId = TestIds.UnitPcId }
        }
    };
}