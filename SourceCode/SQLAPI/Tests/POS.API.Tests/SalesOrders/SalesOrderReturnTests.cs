using System;
using System.Collections.Generic;
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

namespace POS.API.Tests.SalesOrders;

/// <summary>
/// WF-3.6 sales return + refund through the real API.
/// Canonical S1: POS cash sale 2 × P-A @ 100 + GST-17 = 234.00 (paid), then return 1 unit = 117.00.
/// </summary>
public sealed class SalesOrderReturnTests : IClassFixture<TestWebApplicationFactory>
{
    private readonly TestWebApplicationFactory _factory;

    public SalesOrderReturnTests(TestWebApplicationFactory factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task Should_CreateReturnTransactionRestockAndRefund_When_OneUnitIsReturned()
    {
        await _factory.EnsureSeededAsync();
        var client = await _factory.CreateAuthorizedClientAsync(TestSeed.AdminEmail, TestSeed.AdminPassword);

        var (orderId, orderNumber) = await CreatePosCashSaleAsync(client);
        var stockAfterSale = await GetStockAsync();

        var returnCommand = new
        {
            id = orderId,
            orderNumber,
            locationId = TestIds.LocationL1Id,
            customerId = TestIds.WalkInCustomerId,
            isSalesOrderRequest = false,
            totalAmount = 117.00m,
            totalTax = 17.00m,
            totalDiscount = 0m,
            flatDiscount = 0m,
            totalRoundOff = 0m,
            paymentMethod = 1, // Cash
            isSelectPaymentMethod = true,
            note = "Customer returned one unit",
            deliveryDate = DateTime.UtcNow,
            salesOrderItems = new object[]
            {
                new
                {
                    productId = TestIds.ProductPcMonitorId,
                    quantity = 1m,
                    unitPrice = 100.00m,
                    unitId = TestIds.UnitPcId,
                    discountType = "fixed",
                    discountPercentage = 0m,
                    purchasePrice = 60.00m,
                    salesOrderItemTaxes = new object[] { new { taxId = TestIds.TaxGst17Id, taxValue = 17.00m } }
                }
            }
        };

        var response = await client.PutAsJsonAsync($"/api/salesOrder/{orderId}/return", returnCommand);
        var body = await response.Content.ReadAsStringAsync();
        Assert.True(response.IsSuccessStatusCode, $"Return failed: {(int)response.StatusCode} {body}");

        await _factory.UsingDbAsync(async db =>
        {
            var order = await db.Set<SalesOrder>().AsNoTracking()
                .Include(o => o.SalesOrderItems)
                .FirstAsync(o => o.OrderNumber == orderNumber);

            // --- Header mutation (WF-3.6 step 2) ---
            Assert.Equal(SalesOrderStatus.Return, order.Status);
            Assert.Equal(117.00m, order.TotalAmount);
            Assert.Equal(17.00m, order.TotalTax);
            Assert.Equal(117.00m, order.TotalRefundAmount);

            // --- Return item row with Status=Return (history preserved) ---
            var returnItem = order.SalesOrderItems.Single(i => i.Status == PurchaseSaleItemStatusEnum.Return);
            Assert.Equal(1m, returnItem.Quantity);

            // --- PaymentStatus recompute: 117 <= 234 → Paid ---
            Assert.Equal(PaymentStatus.Paid, order.PaymentStatus);

            // --- Refund payment row (WF-3.6 step 6) ---
            var refund = await db.Set<SalesOrderPayment>().AsNoTracking()
                .Where(p => p.SalesOrderId == orderId && p.PaymentType == PaymentType.Refund)
                .ToListAsync();
            Assert.Equal(117.00m, refund.Sum(p => p.Amount));

            // --- SaleReturn journal (SaleReturnStrategy, mirrored per WF-3.6 table) ---
            var returnTx = await db.Set<Transaction>().AsNoTracking()
                .Include(t => t.TransactionItems)
                .SingleAsync(t => t.ReferenceNumber == orderNumber && t.TransactionType == TransactionType.SaleReturn);

            Assert.Equal(100.00m, returnTx.SubTotal);
            Assert.Equal(17.00m, returnTx.TaxAmount);
            Assert.Equal(117.00m, returnTx.TotalAmount);

            var entries = await db.Set<AccountingEntry>().AsNoTracking()
                .Where(e => e.TransactionId == returnTx.Id).ToListAsync();
            AssertEntry(entries, TestIds.LedgerSalesId, TestIds.LedgerArId, 100.00m);
            AssertEntry(entries, TestIds.LedgerGstOutputId, TestIds.LedgerArId, 17.00m);
            AssertEntry(entries, TestIds.LedgerInventoryId, TestIds.LedgerCogsId, 60.00m);

            // --- Refund journal: Dr AR / Cr Cash (money back to customer) ---
            // Note: PaymentService creates the payment Transaction with Id = Guid.Empty (ACC-05),
            // but EF value-generation replaces the empty PK on insert, so the refund entry ends up
            // linked to a freshly generated Payment transaction. Characterized as observed.
            var refundEntry = await db.Set<AccountingEntry>().AsNoTracking()
                .FirstOrDefaultAsync(e => e.Amount == 117.00m
                    && e.DebitLedgerAccountId == TestIds.LedgerArId
                    && e.CreditLedgerAccountId == TestIds.LedgerCashId);
            Assert.NotNull(refundEntry);

            var refundTx = await db.Set<Transaction>().AsNoTracking()
                .SingleAsync(t => t.Id == refundEntry.TransactionId);
            Assert.Equal(TransactionType.Payment, refundTx.TransactionType);
            Assert.Equal(117.00m, refundTx.TotalAmount);

            // --- Restock: sale deducted 2, return added 1 → original − 1 ---
            Assert.Equal(stockAfterSale + 1m, await GetStockAsync());
        });
    }

    [Fact]
    public async Task Should_Return409_When_ReturnQuantityExceedsPurchasedQuantity()
    {
        await _factory.EnsureSeededAsync();
        var client = await _factory.CreateAuthorizedClientAsync(TestSeed.AdminEmail, TestSeed.AdminPassword);

        // Create sale with quantity = 2
        var (orderId, orderNumber) = await CreatePosCashSaleAsync(client);

        // Attempt to return quantity = 5 (exceeds purchased quantity of 2)
        var returnCommand = new
        {
            id = orderId,
            orderNumber,
            locationId = TestIds.LocationL1Id,
            customerId = TestIds.WalkInCustomerId,
            isSalesOrderRequest = false,
            totalAmount = 585.00m,
            totalTax = 85.00m,
            totalDiscount = 0m,
            flatDiscount = 0m,
            totalRoundOff = 0m,
            paymentMethod = 1,
            isSelectPaymentMethod = true,
            note = "Attempting to return more than purchased",
            deliveryDate = DateTime.UtcNow,
            salesOrderItems = new object[]
            {
                new
                {
                    productId = TestIds.ProductPcMonitorId,
                    quantity = 5m,
                    unitPrice = 100.00m,
                    unitId = TestIds.UnitPcId,
                    discountType = "fixed",
                    discountPercentage = 0m,
                    purchasePrice = 60.00m,
                    salesOrderItemTaxes = new object[] { new { taxId = TestIds.TaxGst17Id, taxValue = 17.00m } }
                }
            }
        };

        var response = await client.PutAsJsonAsync($"/api/salesOrder/{orderId}/return", returnCommand);
        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
    }

    private static void AssertEntry(List<AccountingEntry> entries, Guid debit, Guid credit, decimal amount) =>
        Assert.Contains(entries, e => e.DebitLedgerAccountId == debit && e.CreditLedgerAccountId == credit && e.Amount == amount);

    private async Task<(Guid OrderId, string OrderNumber)> CreatePosCashSaleAsync(HttpClient client)
    {
        var orderNumber = $"SO-RET-{Guid.NewGuid():N}"[..20];
        var command = new
        {
            orderNumber,
            isSalesOrderRequest = false,
            isPOSScreenOrder = true,
            customerId = TestIds.WalkInCustomerId,
            locationId = TestIds.LocationL1Id,
            paymentMethod = 1,
            totalAmount = 234.00m,
            totalTax = 34.00m,
            totalDiscount = 0m,
            totalRoundOff = 0m,
            flatDiscount = 0m,
            soCreatedDate = DateTime.UtcNow,
            deliveryDate = DateTime.UtcNow,
            salesOrderItems = new object[]
            {
                new
                {
                    productId = TestIds.ProductPcMonitorId,
                    quantity = 2m,
                    unitPrice = 100.00m,
                    unitId = TestIds.UnitPcId,
                    discountType = "fixed",
                    discountPercentage = 0m,
                    salesOrderItemTaxes = new object[] { new { taxId = TestIds.TaxGst17Id } }
                }
            }
        };

        var response = await client.PostAsJsonAsync("/api/salesOrder", command);
        var body = await response.Content.ReadAsStringAsync();
        Assert.True(response.IsSuccessStatusCode, $"Sale setup failed: {(int)response.StatusCode} {body}");
        using var doc = JsonDocument.Parse(body);
        return (doc.RootElement.GetProperty("id").GetGuid(), orderNumber);
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
