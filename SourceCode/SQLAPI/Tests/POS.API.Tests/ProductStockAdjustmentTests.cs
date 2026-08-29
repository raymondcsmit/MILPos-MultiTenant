using System;
using System.Linq;
using System.Net.Http.Json;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using POS.API.Tests.Infra;
using POS.Data;
using POS.Data.Entities;
using POS.Data.Entities.Accounts;
using Xunit;

namespace POS.API.Tests.Inventory;

/// <summary>
/// WF-5.1 stock adjustments (gain/loss via the central engine) and WF-5.3 absolute correction (INT-05 backdoor).
/// SEC-01 Gap-Char context: these mutation endpoints have no ClaimCheck — any authenticated user passes.
/// </summary>
public sealed class ProductStockAdjustmentTests : IClassFixture<TestWebApplicationFactory>
{
    private readonly TestWebApplicationFactory _factory;

    public ProductStockAdjustmentTests(TestWebApplicationFactory factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task Should_PostGainJournalAndIncreaseStock_When_StockIsAdded()
    {
        await _factory.EnsureSeededAsync();
        var client = await _factory.CreateAuthorizedClientAsync(TestSeed.AdminEmail, TestSeed.AdminPassword);
        var stockBefore = await GetStockAsync();

        var response = await client.PostAsJsonAsync("/api/productStock", new
        {
            currentStock = 5m,
            pricePerUnit = 60.00m,
            locationId = TestIds.LocationL1Id,
            productId = TestIds.ProductPcMonitorId,
            unitId = TestIds.UnitPcId,
            productTaxes = Array.Empty<object>(),
            referenceNumber = $"ADJ-G-{Guid.NewGuid():N}"[..20]
        });
        Assert.True(response.IsSuccessStatusCode, await response.Content.ReadAsStringAsync());

        await _factory.UsingDbAsync(async db =>
        {
            Assert.Equal(stockBefore + 5m, await GetStockAsync());

            // Gain → StockAdjustmentStrategy: Dr Inventory 1200 / Cr Stock Adjustment 5400 = 5 × 60.
            var adjustment = await db.Set<Transaction>().AsNoTracking()
                .Where(t => t.TransactionType == TransactionType.StockAdjustment && t.Narration.Contains("Gain"))
                .OrderByDescending(t => t.TransactionDate)
                .FirstAsync();
            var entries = await db.Set<AccountingEntry>().AsNoTracking()
                .Where(e => e.TransactionId == adjustment.Id).ToListAsync();

            Assert.Contains(entries, e => e.DebitLedgerAccountId == TestIds.LedgerInventoryId
                && e.CreditLedgerAccountId == TestIds.LedgerAdjustmentId && e.Amount == 300.00m);
        });
    }

    [Fact]
    public async Task Should_PostLossJournalAndDecreaseStock_When_StockIsRemoved()
    {
        await _factory.EnsureSeededAsync();
        var client = await _factory.CreateAuthorizedClientAsync(TestSeed.AdminEmail, TestSeed.AdminPassword);
        var stockBefore = await GetStockAsync();

        var response = await client.PostAsJsonAsync("/api/productStock", new
        {
            currentStock = -3m,
            pricePerUnit = 60.00m,
            locationId = TestIds.LocationL1Id,
            productId = TestIds.ProductPcMonitorId,
            unitId = TestIds.UnitPcId,
            productTaxes = Array.Empty<object>(),
            referenceNumber = $"ADJ-L-{Guid.NewGuid():N}"[..20]
        });
        Assert.True(response.IsSuccessStatusCode, await response.Content.ReadAsStringAsync());

        await _factory.UsingDbAsync(async db =>
        {
            Assert.Equal(stockBefore - 3m, await GetStockAsync());

            // Loss → Dr Stock Adjustment 5400 / Cr Inventory 1200 = 3 × 60.
            var adjustment = await db.Set<Transaction>().AsNoTracking()
                .Where(t => t.TransactionType == TransactionType.StockAdjustment && t.Narration.Contains("Loss"))
                .OrderByDescending(t => t.TransactionDate)
                .FirstAsync();
            var entries = await db.Set<AccountingEntry>().AsNoTracking()
                .Where(e => e.TransactionId == adjustment.Id).ToListAsync();

            Assert.Contains(entries, e => e.DebitLedgerAccountId == TestIds.LedgerAdjustmentId
                && e.CreditLedgerAccountId == TestIds.LedgerInventoryId && e.Amount == 180.00m);
        });
    }

    [Fact]
    public async Task Should_SetStockWithoutAnyJournalEntries_When_BulkAdjustBackdoorIsUsed()
    {
        // Gap-Char [INT-05]: absolute stock correction writes CurrentStock directly with no
        // transaction/journal rows — stock silently diverges from the ledger.
        await _factory.EnsureSeededAsync();
        var client = await _factory.CreateAuthorizedClientAsync(TestSeed.AdminEmail, TestSeed.AdminPassword);
        var stockBefore = await GetStockAsync();
        var adjustmentsBefore = await _factory.UsingDbAsync(db => db.Set<Transaction>().AsNoTracking()
            .CountAsync(t => t.TransactionType == TransactionType.StockAdjustment));

        var response = await client.PostAsJsonAsync("/api/productStock/bulk-adjust", new
        {
            adjustments = new object[]
            {
                new { productId = TestIds.ProductPcMonitorId, locationId = TestIds.LocationL1Id, newStockValue = 77m }
            }
        });
        Assert.True(response.IsSuccessStatusCode, await response.Content.ReadAsStringAsync());

        await _factory.UsingDbAsync(async db =>
        {
            Assert.Equal(77m, await GetStockAsync());

            var adjustmentsAfter = await db.Set<Transaction>().AsNoTracking()
                .CountAsync(t => t.TransactionType == TransactionType.StockAdjustment);
            Assert.Equal(adjustmentsBefore, adjustmentsAfter); // no journal entries for the absolute correction
        });
    }

    [Fact]
    public async Task Should_AllowStockMutation_When_UserHasNoClaims()
    {
        // Gap-Char [SEC-01]: ClaimCheck is commented out on stock mutation endpoints —
        // an authenticated user without any inventory claim can mutate stock.
        await _factory.EnsureSeededAsync();
        var client = await _factory.CreateAuthorizedClientAsync(TestSeed.NoClaimsEmail, TestSeed.NoClaimsPassword);
        var stockBefore = await GetStockAsync();

        var response = await client.PostAsJsonAsync("/api/productStock", new
        {
            currentStock = 2m,
            pricePerUnit = 60.00m,
            locationId = TestIds.LocationL1Id,
            productId = TestIds.ProductPcMonitorId,
            unitId = TestIds.UnitPcId,
            productTaxes = Array.Empty<object>(),
            referenceNumber = $"ADJ-NC-{Guid.NewGuid():N}"[..20]
        });

        Assert.True(response.IsSuccessStatusCode, $"No-claims mutation rejected: {await response.Content.ReadAsStringAsync()}");
        Assert.Equal(stockBefore + 2m, await GetStockAsync());
    }

    private async Task<decimal> GetStockAsync()
    {
        decimal stock = 0;
        await _factory.UsingDbAsync(async db =>
        {
            stock = await db.Set<ProductStock>().AsNoTracking()
                .Where(s => s.ProductId == TestIds.ProductPcMonitorId && s.LocationId == TestIds.LocationL1Id)
                .Select(s => s.CurrentStock)
                .SingleAsync();
        });
        return stock;
    }
}

