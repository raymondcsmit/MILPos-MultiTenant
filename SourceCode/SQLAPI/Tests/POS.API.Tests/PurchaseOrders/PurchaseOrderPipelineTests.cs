using System;
using System.Linq;
using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using POS.API.Tests.Infra;
using POS.Data;
using POS.Data.Entities;
using POS.Data.Entities.Accounts;
using Xunit;

namespace POS.API.Tests.PurchaseOrders;

/// <summary>
/// WF-4.1 purchase order creation through the real API — stock increase, PurchaseStrategy journal, request flag.
/// </summary>
public sealed class PurchaseOrderPipelineTests : IClassFixture<TestWebApplicationFactory>
{
    private readonly TestWebApplicationFactory _factory;

    public PurchaseOrderPipelineTests(TestWebApplicationFactory factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task Should_IncreaseStockAndPostPurchaseJournal_When_PurchaseOrderIsCreated()
    {
        await _factory.EnsureSeededAsync();
        var client = await _factory.CreateAuthorizedClientAsync(TestSeed.AdminEmail, TestSeed.AdminPassword);
        var stockBefore = await GetStockAsync();

        var orderNumber = $"PO-TEST-{Guid.NewGuid():N}"[..20];
        var command = new
        {
            orderNumber,
            isPurchaseOrderRequest = false,
            supplierId = TestIds.SupplierS1Id,
            locationId = TestIds.LocationL1Id,
            totalAmount = 234.00m,
            totalTax = 34.00m,
            totalDiscount = 0m,
            totalRoundOff = 0m,
            poCreatedDate = DateTime.UtcNow,
            deliveryDate = DateTime.UtcNow,
            purchaseOrderItems = new object[]
            {
                new
                {
                    productId = TestIds.ProductPcMonitorId,
                    quantity = 2m,
                    unitPrice = 100.00m,
                    unitId = TestIds.UnitPcId,
                    discountType = "fixed",
                    discountPercentage = 0m,
                    purchaseOrderItemTaxes = new object[] { new { taxId = TestIds.TaxGst17Id } }
                }
            }
        };

        var response = await client.PostAsJsonAsync("/api/purchaseOrder", command);
        var body = await response.Content.ReadAsStringAsync();
        Assert.True(response.IsSuccessStatusCode, $"PO create failed: {(int)response.StatusCode} {body}");

        await _factory.UsingDbAsync(async db =>
        {
            // --- Stock granted at creation (BIZ-01 Gap-Char: no GRN step) ---
            Assert.Equal(stockBefore + 2m, await GetStockAsync());

            // --- PurchaseStrategy journal ---
            var transaction = await db.Set<Transaction>().AsNoTracking()
                .SingleAsync(t => t.ReferenceNumber == orderNumber && t.TransactionType == TransactionType.Purchase);
            Assert.Equal(200.00m, transaction.SubTotal);
            Assert.Equal(34.00m, transaction.TaxAmount);
            Assert.Equal(234.00m, transaction.TotalAmount);

            var entries = await db.Set<AccountingEntry>().AsNoTracking()
                .Where(e => e.TransactionId == transaction.Id).ToListAsync();
            Assert.Contains(entries, e => e.DebitLedgerAccountId == TestIds.LedgerInventoryId
                && e.CreditLedgerAccountId == TestIds.LedgerApId && e.Amount == 200.00m);
            Assert.Contains(entries, e => e.DebitLedgerAccountId == TestIds.LedgerGstInputId
                && e.CreditLedgerAccountId == TestIds.LedgerApId && e.Amount == 34.00m);
            Assert.Equal(2, entries.Count);
        });
    }

    [Fact]
    public async Task Should_SkipAccountingAndStock_When_PurchaseOrderIsRequest()
    {
        await _factory.EnsureSeededAsync();
        var client = await _factory.CreateAuthorizedClientAsync(TestSeed.AdminEmail, TestSeed.AdminPassword);
        var stockBefore = await GetStockAsync();

        var orderNumber = $"POR-TEST-{Guid.NewGuid():N}"[..21];
        var command = new
        {
            orderNumber,
            isPurchaseOrderRequest = true,
            supplierId = TestIds.SupplierS1Id,
            locationId = TestIds.LocationL1Id,
            totalAmount = 200.00m,
            totalTax = 0m,
            totalDiscount = 0m,
            totalRoundOff = 0m,
            poCreatedDate = DateTime.UtcNow,
            deliveryDate = DateTime.UtcNow,
            purchaseOrderItems = new object[]
            {
                new
                {
                    productId = TestIds.ProductPcMonitorId,
                    quantity = 2m,
                    unitPrice = 100.00m,
                    unitId = TestIds.UnitPcId,
                    discountType = "fixed",
                    discountPercentage = 0m,
                    purchaseOrderItemTaxes = Array.Empty<object>()
                }
            }
        };

        var response = await client.PostAsJsonAsync("/api/purchaseOrder", command);
        Assert.True(response.IsSuccessStatusCode, await response.Content.ReadAsStringAsync());

        await _factory.UsingDbAsync(async db =>
        {
            Assert.Equal(stockBefore, await GetStockAsync());
            var transactions = await db.Set<Transaction>().AsNoTracking()
                .Where(t => t.ReferenceNumber == orderNumber).ToListAsync();
            Assert.Empty(transactions);
        });
    }

    [Fact]
    public async Task Should_Return409_When_PurchaseOrderNumberAlreadyExists()
    {
        await _factory.EnsureSeededAsync();
        var client = await _factory.CreateAuthorizedClientAsync(TestSeed.AdminEmail, TestSeed.AdminPassword);

        var orderNumber = $"PO-DUP-{Guid.NewGuid():N}"[..20];
        var command = BuildCommand(orderNumber, isRequest: false);

        var first = await client.PostAsJsonAsync("/api/purchaseOrder", command);
        Assert.True(first.IsSuccessStatusCode, await first.Content.ReadAsStringAsync());

        var second = await client.PostAsJsonAsync("/api/purchaseOrder", command);
        Assert.Equal(HttpStatusCode.Conflict, second.StatusCode);
    }

    private static object BuildCommand(string orderNumber, bool isRequest) => new
    {
        orderNumber,
        isPurchaseOrderRequest = isRequest,
        supplierId = TestIds.SupplierS1Id,
        locationId = TestIds.LocationL1Id,
        totalAmount = isRequest ? 200.00m : 234.00m,
        totalTax = isRequest ? 0m : 34.00m,
        totalDiscount = 0m,
        totalRoundOff = 0m,
        poCreatedDate = DateTime.UtcNow,
        deliveryDate = DateTime.UtcNow,
        purchaseOrderItems = new object[]
        {
            new
            {
                productId = TestIds.ProductPcMonitorId,
                quantity = 2m,
                unitPrice = 100.00m,
                unitId = TestIds.UnitPcId,
                discountType = "fixed",
                discountPercentage = 0m,
                purchaseOrderItemTaxes = isRequest ? Array.Empty<object>() : new object[] { new { taxId = TestIds.TaxGst17Id } }
            }
        }
    };

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
