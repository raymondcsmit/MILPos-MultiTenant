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
/// WF-3.2 / 3.6 / 3.7 money-path Gap-Char cases — each asserts CURRENT observed behavior and is
/// GREEN by definition until the paired Gap-Target enhancement lands (see the DISCREPANCY notes in
/// TC-D03_POS_Sales_Test_Cases.md and doc-11 INT-01/04/06/07/11, S-01/05/08/09, ACC-04).
/// Catalog IDs: TC-D03.012 (.019) .034 (.071) (.087) (.090).
/// </summary>
public sealed class SalesOrderGapCharacterizationTests : IClassFixture<TestWebApplicationFactory>
{
    private readonly TestWebApplicationFactory _factory;

    public SalesOrderGapCharacterizationTests(TestWebApplicationFactory factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task Should_TrustClientMoney_When_HeaderTotalDivergesFromItemMath()
    {
        // Gap-Char [S-01 / INT-04] (TC-D03.012): the header totalAmount is trusted as-is —
        // 999 persists on the order and drives the auto-payment, while the accounting leg
        // re-derives 234 from the items. Divergent money figures coexist.
        await _factory.EnsureSeededAsync();
        var client = await _factory.CreateAuthorizedClientAsync(TestSeed.AdminEmail, TestSeed.AdminPassword);
        var orderNumber = $"SO-MNY-{Guid.NewGuid():N}"[..20];

        var command = BuildSaleCommand(orderNumber,
            totalAmount: 999.00m, // true item math is 2×100 + 34 = 234.00
            totalTax: 34.00m,
            paymentMethod: 1);

        var response = await client.PostAsJsonAsync("/api/salesOrder", command);
        var body = await response.Content.ReadAsStringAsync();
        Assert.True(response.IsSuccessStatusCode, $"Expected 201 but got {(int)response.StatusCode}: {body}");

        await _factory.UsingDbAsync(async db =>
        {
            var order = await db.Set<SalesOrder>().AsNoTracking().FirstAsync(o => o.OrderNumber == orderNumber);

            // Header stores the client-supplied figure — no server-side recalculation.
            Assert.Equal(999.00m, order.TotalAmount);

            // Auto-payment settles the client number (AddSalesOrderCommandHandler line 227: Amount = dto.TotalAmount).
            Assert.Equal(999.00m, order.TotalPaidAmount);
            Assert.Equal(PaymentStatus.Paid, order.PaymentStatus);
            var payment = await db.Set<SalesOrderPayment>().AsNoTracking().FirstAsync(p => p.SalesOrderId == order.Id);
            Assert.Equal(999.00m, payment.Amount);

            // Accounting leg re-derives the totals from the items: divergent 234 vs 999.
            var saleTx = await db.Set<Transaction>().AsNoTracking()
                .SingleAsync(t => t.ReferenceNumber == orderNumber && t.TransactionType == TransactionType.Sale);
            Assert.Equal(200.00m, saleTx.SubTotal);
            Assert.Equal(234.00m, saleTx.TotalAmount);

            // Payment journal uses the client figure: Dr Cash / Cr AR = 999 (not 234).
            var paymentTx = await db.Set<Transaction>().AsNoTracking()
                .SingleAsync(t => t.ReferenceNumber == orderNumber && t.TransactionType == TransactionType.Payment);
            var cashEntries = await db.Set<AccountingEntry>().AsNoTracking()
                .Where(e => e.TransactionId == paymentTx.Id
                    && e.DebitLedgerAccountId == TestIds.LedgerCashId
                    && e.CreditLedgerAccountId == TestIds.LedgerArId)
                .ToListAsync();
            Assert.Contains(cashEntries, e => e.Amount == 999.00m);
            Assert.DoesNotContain(cashEntries, e => e.Amount == 234.00m);
        });
    }

    [Fact]
    public async Task Should_HaveExactlyOneWinner_When_ConcurrentCreatesShareOrderNumber()
    {
        // Gap-Char [INT-11 / S-08] (TC-D03.019): the latest-row-derived numbering race has no
        // atomic guard — of two parallel creates sharing a number, exactly one wins. The loser's
        // status is timing-dependent: 409 when its pre-check sees the committed row, 500 (SaveAsync
        // swallows the unique-constraint DbUpdateException) when both pass the pre-check first.
        await _factory.EnsureSeededAsync();
        var orderNumber = $"SO-RACE-{Guid.NewGuid():N}"[..20];
        var clientA = await _factory.CreateAuthorizedClientAsync(TestSeed.AdminEmail, TestSeed.AdminPassword);
        var clientB = await _factory.CreateAuthorizedClientAsync(TestSeed.AdminEmail, TestSeed.AdminPassword);
        var command = BuildSaleCommand(orderNumber);
        var stockBefore = await GetStockAsync(TestIds.ProductPcMonitorId);

        var responses = await Task.WhenAll(
            clientA.PostAsJsonAsync("/api/salesOrder", command),
            clientB.PostAsJsonAsync("/api/salesOrder", command));

        Assert.Equal(1, responses.Count(r => r.IsSuccessStatusCode));
        var loser = responses.Single(r => !r.IsSuccessStatusCode);
        Assert.True(loser.StatusCode is HttpStatusCode.Conflict or HttpStatusCode.InternalServerError,
            $"Unexpected loser status {(int)loser.StatusCode}: {await loser.Content.ReadAsStringAsync()}");

        await _factory.UsingDbAsync(async db =>
        {
            // Only one Sale leg exists (the Payment leg shares the reference — filter by type);
            // stock moved exactly once.
            Assert.Equal(1, await db.Set<SalesOrder>().AsNoTracking().CountAsync(o => o.OrderNumber == orderNumber));
            var saleTransactions = await db.Set<Transaction>().AsNoTracking()
                .Where(t => t.ReferenceNumber == orderNumber && t.TransactionType == TransactionType.Sale)
                .ToListAsync();
            Assert.Single(saleTransactions);
        });
        Assert.Equal(stockBefore - 2m, await GetStockAsync(TestIds.ProductPcMonitorId));
    }

    [Fact]
    public async Task Should_DeductStockAtCreation_When_DeliveryStatusIsPending()
    {
        // Gap-Char [S-09 / BIZ-06] (TC-D03.034): stock is deducted at order creation even when
        // the delivery status is PENDING — nothing was delivered and no delivery/GRN artifact
        // exists that could later reverse or complete the movement.
        await _factory.EnsureSeededAsync();
        var client = await _factory.CreateAuthorizedClientAsync(TestSeed.AdminEmail, TestSeed.AdminPassword);
        var orderNumber = $"SO-PEND-{Guid.NewGuid():N}"[..20];
        var stockBefore = await GetStockAsync(TestIds.ProductPcMonitorId);

        var command = new
        {
            orderNumber,
            isSalesOrderRequest = false,
            isPOSScreenOrder = false,       // non-POS request, credit
            customerId = TestIds.WalkInCustomerId,
            locationId = TestIds.LocationL1Id,
            paymentMethod = 7,              // Credit — no auto-payment
            totalAmount = 234.00m,
            totalTax = 34.00m,
            totalDiscount = 0m,
            totalRoundOff = 0m,
            flatDiscount = 0m,
            deliveryStatus = (int)SalesDeliveryStatus.PENDING,
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
        Assert.True(response.IsSuccessStatusCode, $"Expected 201 but got {(int)response.StatusCode}: {body}");

        await _factory.UsingDbAsync(async db =>
        {
            var order = await db.Set<SalesOrder>().AsNoTracking().FirstAsync(o => o.OrderNumber == orderNumber);
            Assert.Equal(SalesDeliveryStatus.PENDING, order.DeliveryStatus);
            Assert.Equal(PaymentStatus.Pending, order.PaymentStatus);
            Assert.Equal(0, await db.Set<SalesOrderPayment>().AsNoTracking().CountAsync(p => p.SalesOrderId == order.Id));
        });
        Assert.Equal(stockBefore - 2m, await GetStockAsync(TestIds.ProductPcMonitorId));
    }

    [Fact]
    public async Task Should_AcceptOverReturn_When_QuantityExceedsOriginalSold()
    {
        // Gap-Char [INT-04 / S-01] (TC-D03.071): the return handler has no server-side max check
        // (client-only Validators.max) — a direct-API return of 5 of a 2-unit sale succeeds,
        // over-restocks to 103 (100 − 2 + 5) and drives the header negative (−351).
        await _factory.EnsureSeededAsync();
        var client = await _factory.CreateAuthorizedClientAsync(TestSeed.AdminEmail, TestSeed.AdminPassword);
        var (orderId, orderNumber) = await CreatePaidCashSaleAsync(client, quantity: 2m);
        var stockAfterSale = await GetStockAsync(TestIds.ProductPcMonitorId);

        var returnCommand = new
        {
            id = orderId,
            orderNumber,
            locationId = TestIds.LocationL1Id,
            customerId = TestIds.WalkInCustomerId,
            isSalesOrderRequest = false,
            totalAmount = 585.00m, // 5 × 100 + 5 × 17 — the full qty-5 item math
            totalTax = 85.00m,
            totalDiscount = 0m,
            flatDiscount = 0m,
            totalRoundOff = 0m,
            paymentMethod = 1,
            isSelectPaymentMethod = true,
            note = "over-return via direct API (no server-side max)",
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
                    salesOrderItemTaxes = new object[] { new { taxId = TestIds.TaxGst17Id, taxValue = 85.00m } }
                }
            }
        };

        var response = await client.PutAsJsonAsync($"/api/salesOrder/{orderId}/return", returnCommand);
        var body = await response.Content.ReadAsStringAsync();
        Assert.True(response.IsSuccessStatusCode, $"Over-return failed: {(int)response.StatusCode} {body}");

        await _factory.UsingDbAsync(async db =>
        {
            var order = await db.Set<SalesOrder>().AsNoTracking()
                .Include(o => o.SalesOrderItems)
                .FirstAsync(o => o.OrderNumber == orderNumber);

            Assert.Equal(SalesOrderStatus.Return, order.Status);
            Assert.Equal(-351.00m, order.TotalAmount); // 234 − 585 — negative totals persisted
            Assert.Equal(-51.00m, order.TotalTax);     // 34 − 85
            Assert.Equal(PaymentStatus.Paid, order.PaymentStatus); // −351 ≤ 234

            var returnItem = order.SalesOrderItems.Single(i => i.Status == PurchaseSaleItemStatusEnum.Return);
            Assert.Equal(5m, returnItem.Quantity);

            // SaleReturn journal computed for qty 5.
            var returnTx = await db.Set<Transaction>().AsNoTracking()
                .SingleAsync(t => t.ReferenceNumber == orderNumber && t.TransactionType == TransactionType.SaleReturn);
            Assert.Equal(500.00m, returnTx.SubTotal);
            Assert.Equal(585.00m, returnTx.TotalAmount);
            var entries = await db.Set<AccountingEntry>().AsNoTracking()
                .Where(e => e.TransactionId == returnTx.Id).ToListAsync();
            AssertEntry(entries, TestIds.LedgerSalesId, TestIds.LedgerArId, 500.00m);
            AssertEntry(entries, TestIds.LedgerGstOutputId, TestIds.LedgerArId, 85.00m);
            AssertEntry(entries, TestIds.LedgerInventoryId, TestIds.LedgerCogsId, 300.00m);

            // Refund leg formula on negative totals: 234 − (−351) − 0 = 585 refunded.
            Assert.Equal(585.00m, order.TotalRefundAmount);
            var refunds = await db.Set<SalesOrderPayment>().AsNoTracking()
                .Where(p => p.SalesOrderId == orderId && p.PaymentType == PaymentType.Refund)
                .ToListAsync();
            Assert.Equal(585.00m, refunds.Sum(p => p.Amount));
            var refundEntry = await db.Set<AccountingEntry>().AsNoTracking()
                .FirstOrDefaultAsync(e => e.Amount == 585.00m
                    && e.DebitLedgerAccountId == TestIds.LedgerArId
                    && e.CreditLedgerAccountId == TestIds.LedgerCashId);
            Assert.NotNull(refundEntry);
        });
        Assert.Equal(stockAfterSale + 5m, await GetStockAsync(TestIds.ProductPcMonitorId)); // 98 → 103
    }

    [Fact]
    public async Task Should_LeaveTransactionBalanceAmountsUnmaintained_When_PaymentSettlesOrder()
    {
        // Gap-Char [ACC-04 / S-05] (TC-D03.087): settlement updates the order-level
        // TotalPaidAmount/PaymentStatus but the accounting-side Transaction.PaidAmount and
        // BalanceAmount keep their creation-time defaults (0) — only the SalesOrder row is
        // authoritative. NOTE: the catalog's suggested BalanceAmount == 234 is not what is
        // observed; both stay 0 (entity defaults, verified).
        await _factory.EnsureSeededAsync();
        var client = await _factory.CreateAuthorizedClientAsync(TestSeed.AdminEmail, TestSeed.AdminPassword);
        var orderId = await CreateCreditSaleAsync(client, TestIds.ProductPcMonitorId, 2m, 100.00m, 234.00m, 34.00m);

        var pay = await client.PostAsJsonAsync("/api/salesOrderPayment", new
        {
            salesOrderId = orderId,
            amount = 234.00m,
            paymentMethod = 1,
            paymentDate = DateTime.UtcNow
        });
        Assert.True(pay.IsSuccessStatusCode, await pay.Content.ReadAsStringAsync());

        await _factory.UsingDbAsync(async db =>
        {
            var order = await db.Set<SalesOrder>().AsNoTracking().FirstAsync(o => o.Id == orderId);
            Assert.Equal(234.00m, order.TotalPaidAmount);
            Assert.Equal(PaymentStatus.Paid, order.PaymentStatus);

            var paymentTx = await db.Set<Transaction>().AsNoTracking()
                .SingleAsync(t => t.ReferenceNumber == order.OrderNumber && t.TransactionType == TransactionType.Payment);
            Assert.Equal(234.00m, paymentTx.TotalAmount);
            Assert.Equal(0m, paymentTx.PaidAmount);      // never updated by the payment
            Assert.Equal(0m, paymentTx.BalanceAmount);   // creation-time default, not 234
        });
    }

    [Fact]
    public async Task Should_MaintainPaidStatus_When_DeletingPaymentOnOverpaidOrder_GapTargetFixed()
    {
        // Gap-Target [INT-07 analog] (TC-D03.090) — DeleteSalesOrderPaymentCommandHandler line 60
        // subtracts Amount from TotalPaidAmount; line 66 rechecks TotalAmount <= TotalPaidAmount,
        // so a fully settled order (TotalPaidAmount == 100 >= TotalAmount == 100) correctly remains Paid.
        await _factory.EnsureSeededAsync();
        var client = await _factory.CreateAuthorizedClientAsync(TestSeed.AdminEmail, TestSeed.AdminPassword);
        var orderId = await CreateCreditSaleAsync(client, TestIds.ProductNoTaxId, 2m, 50.00m, 100.00m, 0m);

        var first = await client.PostAsJsonAsync("/api/salesOrderPayment", new
        {
            salesOrderId = orderId,
            amount = 100.00m,
            paymentMethod = 1,
            paymentDate = DateTime.UtcNow
        });
        Assert.True(first.IsSuccessStatusCode, await first.Content.ReadAsStringAsync());

        var second = await client.PostAsJsonAsync("/api/salesOrderPayment", new
        {
            salesOrderId = orderId,
            amount = 100.00m,
            paymentMethod = 1,
            paymentDate = DateTime.UtcNow
        });
        Assert.True(second.IsSuccessStatusCode, await second.Content.ReadAsStringAsync());
        var paymentId = JsonDocument.Parse(await second.Content.ReadAsStringAsync())
            .RootElement.GetProperty("id").GetGuid();

        await _factory.UsingDbAsync(async db =>
        {
            var before = await db.Set<SalesOrder>().AsNoTracking().FirstAsync(o => o.Id == orderId);
            Assert.Equal(200.00m, before.TotalPaidAmount);
            Assert.Equal(PaymentStatus.Paid, before.PaymentStatus);
        });

        var delete = await client.DeleteAsync($"/api/salesOrderPayment/{paymentId}");
        Assert.True(delete.IsSuccessStatusCode, $"Delete failed: {(int)delete.StatusCode} {await delete.Content.ReadAsStringAsync()}");

        await _factory.UsingDbAsync(async db =>
        {
            var order = await db.Set<SalesOrder>().AsNoTracking().FirstAsync(o => o.Id == orderId);
            Assert.Equal(100.00m, order.TotalPaidAmount);
            Assert.Equal(PaymentStatus.Paid, order.PaymentStatus); // properly retains Paid status

            // Compensation accounting still posts for the deleted amount: Dr AR / Cr Cash = 100.
            var compensation = await db.Set<AccountingEntry>().AsNoTracking()
                .FirstOrDefaultAsync(e => e.Amount == 100.00m
                    && e.DebitLedgerAccountId == TestIds.LedgerArId
                    && e.CreditLedgerAccountId == TestIds.LedgerCashId);
            Assert.NotNull(compensation);
        });
    }

    // --- helpers ---

    private static object BuildSaleCommand(
        string orderNumber,
        decimal totalAmount = 234.00m,
        decimal totalTax = 34.00m,
        int paymentMethod = 1,
        bool isPos = true) => new
    {
        orderNumber,
        isSalesOrderRequest = false,
        isPOSScreenOrder = isPos,
        customerId = TestIds.WalkInCustomerId,
        locationId = TestIds.LocationL1Id,
        paymentMethod,
        totalAmount,
        totalTax,
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

    private async Task<(Guid OrderId, string OrderNumber)> CreatePaidCashSaleAsync(HttpClient client, decimal quantity)
    {
        var orderNumber = $"SO-OVR-{Guid.NewGuid():N}"[..20];
        var command = new
        {
            orderNumber,
            isSalesOrderRequest = false,
            isPOSScreenOrder = true,
            customerId = TestIds.WalkInCustomerId,
            locationId = TestIds.LocationL1Id,
            paymentMethod = 1,
            totalAmount = quantity * 100.00m + quantity * 17.00m,
            totalTax = quantity * 17.00m,
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
                    quantity,
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

    private async Task<Guid> CreateCreditSaleAsync(HttpClient client, Guid productId, decimal quantity, decimal unitPrice, decimal totalAmount, decimal totalTax)
    {
        var orderNumber = $"SO-PAY-{Guid.NewGuid():N}"[..20];
        var command = new
        {
            orderNumber,
            isSalesOrderRequest = false,
            isPOSScreenOrder = true,
            customerId = TestIds.WalkInCustomerId,
            locationId = TestIds.LocationL1Id,
            paymentMethod = 7, // Credit → no auto-payment
            totalAmount,
            totalTax,
            totalDiscount = 0m,
            totalRoundOff = 0m,
            flatDiscount = 0m,
            soCreatedDate = DateTime.UtcNow,
            deliveryDate = DateTime.UtcNow,
            salesOrderItems = new object[]
            {
                new
                {
                    productId,
                    quantity,
                    unitPrice,
                    unitId = TestIds.UnitPcId,
                    discountType = "fixed",
                    discountPercentage = 0m,
                    salesOrderItemTaxes = totalTax == 0m
                        ? Array.Empty<object>()
                        : new object[] { new { taxId = TestIds.TaxGst17Id } }
                }
            }
        };

        var response = await client.PostAsJsonAsync("/api/salesOrder", command);
        var body = await response.Content.ReadAsStringAsync();
        Assert.True(response.IsSuccessStatusCode, $"Credit sale setup failed: {(int)response.StatusCode} {body}");
        using var doc = JsonDocument.Parse(body);
        return doc.RootElement.GetProperty("id").GetGuid();
    }

    private async Task<decimal> GetStockAsync(Guid productId)
    {
        decimal stock = 0;
        await _factory.UsingDbAsync(async db =>
        {
            stock = await db.Set<ProductStock>().AsNoTracking()
                .Where(s => s.ProductId == productId && s.LocationId == TestIds.LocationL1Id)
                .Select(s => s.CurrentStock)
                .SingleAsync();
        });
        return stock;
    }

    private static void AssertEntry(List<AccountingEntry> entries, Guid debit, Guid credit, decimal amount) =>
        Assert.Contains(entries, e => e.DebitLedgerAccountId == debit && e.CreditLedgerAccountId == credit && e.Amount == amount);
}