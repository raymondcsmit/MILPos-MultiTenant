using System;
using System.Linq;
using System.Net;
using System.Net.Http;
using System.Net.Http.Json;
using System.Text.Json;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using POS.API.Tests.Infra;
using POS.Data;
using POS.Data.Entities;
using POS.Data.Entities.Accounts;
using POS.Data.Enums;
using Xunit;

namespace POS.API.Tests.PurchaseOrders;

/// <summary>
/// WF-4.6 supplier payments (journal, INT-06 overpayment gap) and WF-4.5 purchase return with refund.
/// </summary>
public sealed class PurchaseOrderReturnPaymentTests : IClassFixture<TestWebApplicationFactory>
{
    private readonly TestWebApplicationFactory _factory;

    public PurchaseOrderReturnPaymentTests(TestWebApplicationFactory factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task Should_DebitApCreditCash_When_SupplierPaymentIsPosted()
    {
        await _factory.EnsureSeededAsync();
        var client = await _factory.CreateAuthorizedClientAsync(TestSeed.AdminEmail, TestSeed.AdminPassword);
        var (orderId, orderNumber) = await CreatePurchaseOrderAsync(client, quantity: 2m);

        var response = await client.PostAsJsonAsync("/api/purchaseOrderPayment", new
        {
            purchaseOrderId = orderId,
            amount = 234.00m,
            paymentMethod = 1, // Cash
            paymentDate = DateTime.UtcNow
        });
        var body = await response.Content.ReadAsStringAsync();
        Assert.True(response.IsSuccessStatusCode, $"Payment failed: {(int)response.StatusCode} {body}");

        await _factory.UsingDbAsync(async db =>
        {
            var order = await db.Set<PurchaseOrder>().AsNoTracking().FirstAsync(o => o.Id == orderId);
            Assert.Equal(234.00m, order.TotalPaidAmount);
            Assert.Equal(PaymentStatus.Paid, order.PaymentStatus);

            // WF-4.6 / FullPaymentStrategy purchase branch: Dr AP 2100 / Cr Cash 1050.
            var paymentEntry = await db.Set<PaymentEntry>().AsNoTracking()
                .FirstOrDefaultAsync(p => p.Amount == 234.00m && p.ReferenceNumber == orderNumber);
            Assert.NotNull(paymentEntry);

            var entry = await db.Set<AccountingEntry>().AsNoTracking()
                .FirstOrDefaultAsync(e => e.Amount == 234.00m
                    && e.DebitLedgerAccountId == TestIds.LedgerApId
                    && e.CreditLedgerAccountId == TestIds.LedgerCashId);
            Assert.NotNull(entry);
        });
    }

    [Fact]
    public async Task Should_AcceptSupplierPaymentBeyondRemainingBalance_When_PartiallyPaid()
    {
        // Gap-Char [INT-06]: validates against full TotalAmount, not remaining balance.
        await _factory.EnsureSeededAsync();
        var client = await _factory.CreateAuthorizedClientAsync(TestSeed.AdminEmail, TestSeed.AdminPassword);
        var (orderId, _) = await CreatePurchaseOrderAsync(client, quantity: 2m);

        var first = await client.PostAsJsonAsync("/api/purchaseOrderPayment", new
        {
            purchaseOrderId = orderId,
            amount = 100.00m,
            paymentMethod = 1,
            paymentDate = DateTime.UtcNow
        });
        Assert.True(first.IsSuccessStatusCode, await first.Content.ReadAsStringAsync());

        var second = await client.PostAsJsonAsync("/api/purchaseOrderPayment", new
        {
            purchaseOrderId = orderId,
            amount = 200.00m, // remaining is 134 — accepted because 200 <= TotalAmount 234
            paymentMethod = 1,
            paymentDate = DateTime.UtcNow
        });
        Assert.True(second.IsSuccessStatusCode, $"Overpay rejected: {await second.Content.ReadAsStringAsync()}");

        await _factory.UsingDbAsync(async db =>
        {
            var order = await db.Set<PurchaseOrder>().AsNoTracking().FirstAsync(o => o.Id == orderId);
            Assert.Equal(300.00m, order.TotalPaidAmount);
        });
    }

    [Fact]
    public async Task Should_MirrorJournalAndDecreaseStock_When_PurchaseReturnWithoutRefundIsFiled()
    {
        await _factory.EnsureSeededAsync();
        var client = await _factory.CreateAuthorizedClientAsync(TestSeed.AdminEmail, TestSeed.AdminPassword);
        var (orderId, orderNumber) = await CreatePurchaseOrderAsync(client, quantity: 2m);
        var stockAfterPurchase = await GetStockAsync();

        var returnCommand = BuildReturnCommand(orderId, orderNumber, withRefund: false);
        var response = await client.PutAsJsonAsync($"/api/purchaseOrder/{orderId}/return", returnCommand);
        var body = await response.Content.ReadAsStringAsync();
        Assert.True(response.IsSuccessStatusCode, $"Return failed: {(int)response.StatusCode} {body}");

        await _factory.UsingDbAsync(async db =>
        {
            // --- Stock: purchase granted +2, return removed 1 ---
            Assert.Equal(stockAfterPurchase - 1m, await GetStockAsync());

            // --- PurchaseReturnStrategy mirrored journal ---
            var returnTx = await db.Set<Transaction>().AsNoTracking()
                .SingleAsync(t => t.ReferenceNumber == orderNumber && t.TransactionType == TransactionType.PurchaseReturn);
            Assert.Equal(100.00m, returnTx.SubTotal);
            Assert.Equal(17.00m, returnTx.TaxAmount);
            Assert.Equal(117.00m, returnTx.TotalAmount);

            var entries = await db.Set<AccountingEntry>().AsNoTracking()
                .Where(e => e.TransactionId == returnTx.Id).ToListAsync();
            Assert.Contains(entries, e => e.DebitLedgerAccountId == TestIds.LedgerApId
                && e.CreditLedgerAccountId == TestIds.LedgerInventoryId && e.Amount == 100.00m);
            Assert.Contains(entries, e => e.DebitLedgerAccountId == TestIds.LedgerApId
                && e.CreditLedgerAccountId == TestIds.LedgerGstInputId && e.Amount == 17.00m);

            // --- Header: totals reduced ---
            var order = await db.Set<PurchaseOrder>().AsNoTracking().FirstAsync(o => o.Id == orderId);
            Assert.Equal(117.00m, order.TotalAmount);
        });
    }

    [Fact]
    public async Task Should_Return500AndRollBack_When_PurchaseReturnRequestsRefund()
    {
        // PRODUCT BUG (new finding): the refund leg double-saves — PaymentService.ProcessPaymentAsync
        // already flushed the UoW, so the handler's own SaveAsync affects 0 rows, is treated as a
        // failure, and rolls the whole return back. The request 500s and no return data persists.
        // Wave-1 Gap-Target: fix the double-save and flip this characterization.
        await _factory.EnsureSeededAsync();
        var client = await _factory.CreateAuthorizedClientAsync(TestSeed.AdminEmail, TestSeed.AdminPassword);
        var (orderId, orderNumber) = await CreatePurchaseOrderAsync(client, quantity: 2m);
        var stockAfterPurchase = await GetStockAsync();

        var pay = await client.PostAsJsonAsync("/api/purchaseOrderPayment", new
        {
            purchaseOrderId = orderId,
            amount = 234.00m,
            paymentMethod = 1,
            paymentDate = DateTime.UtcNow
        });
        Assert.True(pay.IsSuccessStatusCode, await pay.Content.ReadAsStringAsync());

        var returnCommand = BuildReturnCommand(orderId, orderNumber, withRefund: true);
        var response = await client.PutAsJsonAsync($"/api/purchaseOrder/{orderId}/return", returnCommand);

        Assert.Equal(HttpStatusCode.InternalServerError, response.StatusCode);

        await _factory.UsingDbAsync(async db =>
        {
            // Rollback: no PurchaseReturn transaction, stock unchanged, header unchanged.
            var returnTxCount = await db.Set<Transaction>().AsNoTracking()
                .CountAsync(t => t.ReferenceNumber == orderNumber && t.TransactionType == TransactionType.PurchaseReturn);
            Assert.Equal(0, returnTxCount);
            Assert.Equal(stockAfterPurchase, await GetStockAsync());

            var order = await db.Set<PurchaseOrder>().AsNoTracking().FirstAsync(o => o.Id == orderId);
            Assert.Equal(234.00m, order.TotalAmount);
        });
    }

    private static object BuildReturnCommand(Guid orderId, string orderNumber, bool withRefund) => new
    {
        id = orderId,
        orderNumber,
        supplierId = TestIds.SupplierS1Id,
        locationId = TestIds.LocationL1Id,
        isPurchaseOrderRequest = false,
        totalAmount = 117.00m,
        totalTax = 17.00m,
        totalDiscount = 0m,
        totalRoundOff = 0m,
        paymentMethod = 1,
        isSelectPaymentMethod = withRefund,
        note = "One unit returned to supplier",
        deliveryDate = DateTime.UtcNow,
        purchaseOrderItems = new object[]
        {
            new
            {
                productId = TestIds.ProductPcMonitorId,
                quantity = 1m,
                unitPrice = 100.00m,
                unitId = TestIds.UnitPcId,
                discountType = "fixed",
                discountPercentage = 0m,
                purchaseOrderItemTaxes = new object[] { new { taxId = TestIds.TaxGst17Id } }
            }
        }
    };

    private async Task<(Guid OrderId, string OrderNumber)> CreatePurchaseOrderAsync(HttpClient client, decimal quantity)
    {
        var orderNumber = $"PO-RP-{Guid.NewGuid():N}"[..20];
        var command = new
        {
            orderNumber,
            isPurchaseOrderRequest = false,
            supplierId = TestIds.SupplierS1Id,
            locationId = TestIds.LocationL1Id,
            totalAmount = quantity * 117.00m,
            totalTax = quantity * 17.00m,
            totalDiscount = 0m,
            totalRoundOff = 0m,
            poCreatedDate = DateTime.UtcNow,
            deliveryDate = DateTime.UtcNow,
            purchaseOrderItems = new object[]
            {
                new
                {
                    productId = TestIds.ProductPcMonitorId,
                    quantity,
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
        Assert.True(response.IsSuccessStatusCode, $"PO setup failed: {(int)response.StatusCode} {body}");
        return (JsonDocument.Parse(body).RootElement.GetProperty("id").GetGuid(), orderNumber);
    }

    private async Task<decimal> GetStockAsync()
    {
        return await _factory.UsingDbAsync(db => db.Set<ProductStock>().AsNoTracking()
            .Where(s => s.ProductId == TestIds.ProductPcMonitorId && s.LocationId == TestIds.LocationL1Id)
            .Select(s => s.CurrentStock)
            .SingleAsync());
    }
}
