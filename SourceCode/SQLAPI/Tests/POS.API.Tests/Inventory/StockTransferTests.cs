using System;
using System.Linq;
using System.Net.Http;
using System.Net.Http.Json;
using System.Text.Json;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using POS.API.Tests.Infra;
using POS.Data;
using POS.Data.Entities;
using POS.Data.Entities.Accounts;
using Xunit;

namespace POS.API.Tests.Inventory;

/// <summary>
/// WF-5.5 stock transfers: stock moves between branches; journal booked as sale/purchase to self
/// (BIZ-03 Gap-Char); delete reverses stock for delivered transfers (D-1 finding).
/// </summary>
public sealed class StockTransferTests : IClassFixture<TestWebApplicationFactory>
{
    private readonly TestWebApplicationFactory _factory;

    public StockTransferTests(TestWebApplicationFactory factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task Should_MoveStockBetweenBranches_When_TransferIsCreated()
    {
        await _factory.EnsureSeededAsync();
        var client = await _factory.CreateAuthorizedClientAsync(TestSeed.AdminEmail, TestSeed.AdminPassword);
        var stockL1Before = await GetStockAsync(TestIds.LocationL1Id);
        var stockFbrBefore = await GetStockAsync(TestIds.LocationFbrId);

                var reference = $"STT-{Guid.NewGuid():N}"[..18];
        var response = await client.PostAsJsonAsync("/api/stockTransfer", new
        {
            transferDate = DateTime.UtcNow,
            referenceNo = reference,
            status = 0, // Delivered (enum default)
            fromLocationId = TestIds.LocationL1Id,
            toLocationId = TestIds.LocationFbrId,
            totalShippingCharge = 0m,
            totalAmount = 500.00m,
            notes = "Wave-1 transfer",
            stockTransferItems = new object[]
            {
                new
                {
                    productId = TestIds.ProductPcMonitorId,
                    quantity = 5m,
                    unitPrice = 100.00m,
                    unitId = TestIds.UnitPcId,
                    shippingCharge = 0m,
                    subTotal = 500.00m
                }
            }
        });
        var createBody = await response.Content.ReadAsStringAsync();
        Assert.True(response.IsSuccessStatusCode, $"Transfer failed: {(int)response.StatusCode} {createBody}");
        var createdReference = JsonDocument.Parse(createBody).RootElement.TryGetProperty("referenceNo", out var refNoEl)
            ? refNoEl.GetString()
            : null;
        Assert.False(string.IsNullOrWhiteSpace(createdReference), "Handler must generate a transfer reference number");

        await _factory.UsingDbAsync(async db =>
        {
            // Core invariant: stock left L1, arrived at the destination.
            Assert.Equal(stockL1Before - 5m, await GetStockAsync(TestIds.LocationL1Id));
            Assert.Equal(stockFbrBefore + 5m, await GetStockAsync(TestIds.LocationFbrId));

            // Gap-Char [BIZ-03]: transfers booked as a sale (from) and a purchase (to) —
            // group AR/AP/Sales are inflated by inter-branch movement.
            var fromTx = await db.Set<Transaction>().AsNoTracking()
                .SingleAsync(t => t.ReferenceNumber == createdReference && t.TransactionType == TransactionType.StockTransferFromBranch);
            var toTx = await db.Set<Transaction>().AsNoTracking()
                .SingleAsync(t => t.ReferenceNumber == createdReference && t.TransactionType == TransactionType.StockTransferToBranch);
            Assert.Equal(500.00m, fromTx.SubTotal);
            Assert.Equal(500.00m, toTx.SubTotal);

            var fromEntries = await db.Set<AccountingEntry>().AsNoTracking()
                .Where(e => e.TransactionId == fromTx.Id).ToListAsync();
            var toEntries = await db.Set<AccountingEntry>().AsNoTracking()
                .Where(e => e.TransactionId == toTx.Id).ToListAsync();

            // From leg uses SaleStrategy: Dr AR / Cr Sales (self-invoiced).
            Assert.Contains(fromEntries, e => e.DebitLedgerAccountId == TestIds.LedgerArId
                && e.CreditLedgerAccountId == TestIds.LedgerSalesId && e.Amount == 500.00m);
            // To leg uses PurchaseStrategy: Dr Inventory / Cr AP.
            Assert.Contains(toEntries, e => e.DebitLedgerAccountId == TestIds.LedgerInventoryId
                && e.CreditLedgerAccountId == TestIds.LedgerApId && e.Amount == 500.00m);
        });
    }

    [Fact]
    public async Task Should_RestoreBothBranches_When_DeliveredTransferIsDeleted()
    {
        await _factory.EnsureSeededAsync();
        var client = await _factory.CreateAuthorizedClientAsync(TestSeed.AdminEmail, TestSeed.AdminPassword);
        var stockL1Before = await GetStockAsync(TestIds.LocationL1Id);
        var stockFbrBefore = await GetStockAsync(TestIds.LocationFbrId);

        var reference = $"STT-D-{Guid.NewGuid():N}"[..19];
        var create = await client.PostAsJsonAsync("/api/stockTransfer", new
        {
            transferDate = DateTime.UtcNow,
            referenceNo = reference,
            status = 0, // Delivered — delete reversal applies to delivered transfers
            fromLocationId = TestIds.LocationL1Id,
            toLocationId = TestIds.LocationFbrId,
            totalShippingCharge = 0m,
            totalAmount = 300.00m,
            notes = "delete reversal check",
            stockTransferItems = new object[]
            {
                new
                {
                    productId = TestIds.ProductPcMonitorId,
                    quantity = 3m,
                    unitPrice = 100.00m,
                    unitId = TestIds.UnitPcId,
                    shippingCharge = 0m,
                    subTotal = 300.00m
                }
            }
        });
        var createBody = await create.Content.ReadAsStringAsync();
        Assert.True(create.IsSuccessStatusCode, $"Transfer setup failed: {(int)create.StatusCode} {createBody}");
        var transferId = JsonDocument.Parse(createBody).RootElement.GetProperty("id").GetGuid();

        var delete = await client.DeleteAsync($"/api/stockTransfer/{transferId}");
        var deleteBody = await delete.Content.ReadAsStringAsync();
        Assert.True(delete.IsSuccessStatusCode, $"Delete failed: {(int)delete.StatusCode} {deleteBody}");

        await _factory.UsingDbAsync(async db =>
        {
            // Reversal restores both branches (D-1: delete DOES reverse for delivered transfers,
            // via the fragile type-flip hack).
            Assert.Equal(stockL1Before, await GetStockAsync(TestIds.LocationL1Id));
            Assert.Equal(stockFbrBefore, await GetStockAsync(TestIds.LocationFbrId));
        });
    }

    private async Task<decimal> GetStockAsync(Guid locationId)
    {
        return await _factory.UsingDbAsync(db => db.Set<ProductStock>().AsNoTracking()
            .Where(s => s.ProductId == TestIds.ProductPcMonitorId && s.LocationId == locationId)
            .Select(s => s.CurrentStock)
            .SingleAsync());
    }
}

