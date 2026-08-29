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
using Xunit;

namespace POS.API.Tests.SalesOrders;

/// <summary>
/// WF-3.2 + WF-6.1 — the business-event chain through the real API on a real database.
/// Proves the Wave-0 infrastructure end-to-end: login → POST /salesOrder → accounting + inventory + payment.
/// Canonical scenario S1: 2 × P-A @ 100.00 with GST-17 → SubTotal 200.00, Tax 34.00, Total 234.00, COGS 120.00.
/// TC-D03.030-series (integration cases), TC-D06.0xx (pipeline journal checks).
/// </summary>
public sealed class SalesOrderCheckoutPipelineTests : IClassFixture<TestWebApplicationFactory>
{
    private readonly TestWebApplicationFactory _factory;
    private decimal _stockBeforeSale;
    private decimal _stockBeforeQuote;

    public SalesOrderCheckoutPipelineTests(TestWebApplicationFactory factory)
    {
        _factory = factory;
    }

    private async Task<decimal> GetCurrentStockAsync()
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

    [Fact]
    public async Task Should_PostSaleWithJournalStockAndAutoPayment_When_PosCashSaleIsSubmitted()
    {
        await _factory.EnsureSeededAsync();
        var client = await _factory.CreateAuthorizedClientAsync(TestSeed.AdminEmail, TestSeed.AdminPassword);
        _stockBeforeSale = await GetCurrentStockAsync();

        var orderNumber = $"SO-TEST-{Guid.NewGuid():N}"[..20];
        var command = new
        {
            orderNumber,
            isSalesOrderRequest = false,
            isPOSScreenOrder = true,
            customerId = TestIds.WalkInCustomerId,
            locationId = TestIds.LocationL1Id,
            paymentMethod = 1, // ACCPaymentMethod.Cash
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
        Assert.True(response.IsSuccessStatusCode, $"Expected success but got {(int)response.StatusCode}: {body}");

        using var doc = JsonDocument.Parse(body);
        var orderId = doc.RootElement.GetProperty("id").GetGuid();

        await _factory.UsingDbAsync(async db =>
        {
            // --- Business document ---
            var order = await db.Set<SalesOrder>().AsNoTracking()
                .Include(o => o.SalesOrderItems)
                .FirstAsync(o => o.Id == orderId);
            Assert.Equal(234.00m, order.TotalAmount);
            Assert.Equal(34.00m, order.TotalTax);

            // --- Inventory engine: stock decreased by exactly the sold quantity (WF-6.1 step d) ---
            var stock = await db.Set<ProductStock>().AsNoTracking()
                .SingleAsync(s => s.ProductId == TestIds.ProductPcMonitorId && s.LocationId == TestIds.LocationL1Id);
            Assert.Equal(_stockBeforeSale - 2m, stock.CurrentStock);

            // --- Purchase price snapshot stamped from ProductStock (COGS basis) ---
            Assert.Equal(60.00m, order.SalesOrderItems.Single().PurchasePrice);

            // --- Accounting pipeline (WF-6.1): one Sale transaction for this reference ---
            var transaction = await db.Set<Transaction>().AsNoTracking()
                .Include(t => t.TransactionItems)
                .SingleAsync(t => t.ReferenceNumber == orderNumber && t.TransactionType == TransactionType.Sale);

            Assert.Equal(200.00m, transaction.SubTotal);
            Assert.Equal(34.00m, transaction.TaxAmount);
            Assert.Equal(0m, transaction.DiscountAmount);
            Assert.Equal(234.00m, transaction.TotalAmount);
            Assert.Equal(120.00m, transaction.TransactionItems.Single().PurchasePrice * transaction.TransactionItems.Single().Quantity);
            Assert.Equal(TransactionStatus.Completed, transaction.Status);

            // --- Journal entries (SaleStrategy, WF-3.2 table) ---
            var entries = await db.Set<AccountingEntry>().AsNoTracking()
                .Where(e => e.TransactionId == transaction.Id)
                .ToListAsync();

            AssertEntry(entries, debit: TestIds.LedgerArId, credit: TestIds.LedgerSalesId, amount: 200.00m);
            AssertEntry(entries, debit: TestIds.LedgerArId, credit: TestIds.LedgerGstOutputId, amount: 34.00m);
            AssertEntry(entries, debit: TestIds.LedgerCogsId, credit: TestIds.LedgerInventoryId, amount: 120.00m);

            // Invariant: journal total for the sale = SubTotal + OutputTax + COGS = 354.00.
            var journalTotal = await db.Set<AccountingEntry>().AsNoTracking()
                .Where(e => e.TransactionId == transaction.Id).SumAsync(e => e.Amount);
            Assert.Equal(354.00m, journalTotal);

            // --- Auto-payment (WF-3.2 step 7): full settlement for non-credit POS sale ---
            var paymentEntry = await db.Set<PaymentEntry>().AsNoTracking()
                .FirstOrDefaultAsync(p => p.Amount == 234.00m);
            Assert.NotNull(paymentEntry);

            var paymentJournal = await db.Set<AccountingEntry>().AsNoTracking()
                .Where(e => e.Amount == 234.00m
                            && e.DebitLedgerAccountId == TestIds.LedgerCashId
                            && e.CreditLedgerAccountId == TestIds.LedgerArId)
                .ToListAsync();
            Assert.Contains(paymentJournal, e => e.Amount == 234.00m);

            // Payment status: POS cash sale is fully settled.
            Assert.Equal(PaymentStatus.Paid, order.PaymentStatus);
            Assert.Equal(234.00m, order.TotalPaidAmount);
        });
    }

    [Fact]
    public async Task Should_Return409_When_OrderNumberAlreadyExists()
    {
        await _factory.EnsureSeededAsync();
        var client = await _factory.CreateAuthorizedClientAsync(TestSeed.AdminEmail, TestSeed.AdminPassword);

        var orderNumber = $"SO-DUP-{Guid.NewGuid():N}"[..20];
        var command = BuildMinimalCommand(orderNumber);

        var first = await client.PostAsJsonAsync("/api/salesOrder", command);
        Assert.True(first.IsSuccessStatusCode, await first.Content.ReadAsStringAsync());

        var second = await client.PostAsJsonAsync("/api/salesOrder", command);
        Assert.Equal(HttpStatusCode.Conflict, second.StatusCode);
    }

    [Fact]
    public async Task Should_DeductStockForQuoteFreeRequest_When_IsSalesOrderRequestIsTrue()
    {
        // WF-3.5: a quotation (IsSalesOrderRequest=true) must NOT touch stock or accounting.
        await _factory.EnsureSeededAsync();
        var client = await _factory.CreateAuthorizedClientAsync(TestSeed.AdminEmail, TestSeed.AdminPassword);
        _stockBeforeQuote = await GetCurrentStockAsync();

        var orderNumber = $"SOR-TEST-{Guid.NewGuid():N}"[..21];
        var command = BuildMinimalCommand(orderNumber, isSalesOrderRequest: true, isPos: false);

        var response = await client.PostAsJsonAsync("/api/salesOrder", command);
        var body = await response.Content.ReadAsStringAsync();
        Assert.True(response.IsSuccessStatusCode, $"Expected success but got {(int)response.StatusCode}: {body}");

        await _factory.UsingDbAsync(async db =>
        {
            var stock = await db.Set<ProductStock>().AsNoTracking()
                .SingleAsync(s => s.ProductId == TestIds.ProductPcMonitorId && s.LocationId == TestIds.LocationL1Id);
            Assert.Equal(_stockBeforeQuote, stock.CurrentStock); // unchanged

            var transactions = await db.Set<Transaction>().AsNoTracking()
                .Where(t => t.ReferenceNumber == orderNumber).ToListAsync();
            Assert.Empty(transactions); // no accounting for requests
        });
    }

    private static object BuildMinimalCommand(
        string orderNumber,
        bool isSalesOrderRequest = false,
        bool isPos = true) => new
    {
        orderNumber,
        isSalesOrderRequest,
        isPOSScreenOrder = isPos,
        customerId = TestIds.WalkInCustomerId,
        locationId = TestIds.LocationL1Id,
        paymentMethod = 1,
        totalAmount = isSalesOrderRequest ? 200.00m : 234.00m,
        totalTax = isSalesOrderRequest ? 0m : 34.00m,
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
                salesOrderItemTaxes = isSalesOrderRequest ? Array.Empty<object>() : new object[] { new { taxId = TestIds.TaxGst17Id } }
            }
        }
    };

    private static void AssertEntry(
        System.Collections.Generic.List<AccountingEntry> entries,
        Guid debit,
        Guid credit,
        decimal amount)
    {
        Assert.Contains(entries, e =>
            e.DebitLedgerAccountId == debit
            && e.CreditLedgerAccountId == credit
            && e.Amount == amount);
    }
}
