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
using POS.Data.Entities.Accounts;
using Xunit;

namespace POS.API.Tests.SalesOrders;

/// <summary>
/// WF-3.7 sales payments — validation, the INT-06 overpayment gap, and the delete compensation path.
/// </summary>
public sealed class SalesOrderPaymentTests : IClassFixture<TestWebApplicationFactory>
{
    private readonly TestWebApplicationFactory _factory;

    public SalesOrderPaymentTests(TestWebApplicationFactory factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task Should_Return409_When_PaymentExceedsTotalAmount()
    {
        await _factory.EnsureSeededAsync();
        var client = await _factory.CreateAuthorizedClientAsync(TestSeed.AdminEmail, TestSeed.AdminPassword);
        var orderId = await CreateCreditSaleAsync(client);

        var response = await client.PostAsJsonAsync("/api/salesOrderPayment", new
        {
            salesOrderId = orderId,
            amount = 300.00m, // > TotalAmount 234 → rejected
            paymentMethod = 1,
            paymentDate = DateTime.UtcNow
        });

        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
    }

    [Fact]
    public async Task Should_AcceptPaymentBeyondRemainingBalance_When_OrderPartiallyPaid()
    {
        // Gap-Char [INT-06]: validation compares against full TotalAmount, not remaining balance —
        // a second payment of 200 (remaining is only 134) is accepted, overpaying the order.
        await _factory.EnsureSeededAsync();
        var client = await _factory.CreateAuthorizedClientAsync(TestSeed.AdminEmail, TestSeed.AdminPassword);
        var orderId = await CreateCreditSaleAsync(client);

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
            amount = 200.00m, // remaining balance is 134 — but 200 <= TotalAmount 234, so accepted
            paymentMethod = 1,
            paymentDate = DateTime.UtcNow
        });
        Assert.True(second.IsSuccessStatusCode, $"Second payment rejected: {await second.Content.ReadAsStringAsync()}");

        await _factory.UsingDbAsync(async db =>
        {
            var order = await db.Set<SalesOrder>().AsNoTracking().FirstAsync(o => o.Id == orderId);
            Assert.Equal(300.00m, order.TotalPaidAmount); // overpaid by 66
            Assert.Equal(PaymentStatus.Paid, order.PaymentStatus);
        });
    }

    [Fact]
    public async Task Should_CompensateWithDrArCrCash_When_PaymentIsDeleted()
    {
        await _factory.EnsureSeededAsync();
        var client = await _factory.CreateAuthorizedClientAsync(TestSeed.AdminEmail, TestSeed.AdminPassword);
        var orderId = await CreateCreditSaleAsync(client);

        var create = await client.PostAsJsonAsync("/api/salesOrderPayment", new
        {
            salesOrderId = orderId,
            amount = 200.00m,
            paymentMethod = 1,
            paymentDate = DateTime.UtcNow
        });
        create.EnsureSuccessStatusCode();
        var paymentId = JsonDocument.Parse(await create.Content.ReadAsStringAsync())
            .RootElement.GetProperty("id").GetGuid();

        var delete = await client.DeleteAsync($"/api/salesOrderPayment/{paymentId}");
        Assert.True(delete.IsSuccessStatusCode || delete.StatusCode == HttpStatusCode.NotFound,
            $"Delete failed: {(int)delete.StatusCode} {await delete.Content.ReadAsStringAsync()}");

        await _factory.UsingDbAsync(async db =>
        {
            var order = await db.Set<SalesOrder>().AsNoTracking().FirstAsync(o => o.Id == orderId);
            Assert.Equal(0m, order.TotalPaidAmount);
            Assert.Equal(PaymentStatus.Pending, order.PaymentStatus);

            // Compensation accounting (WF-3.7 delete path): Dr AR / Cr Cash for the deleted amount.
            var compensation = await db.Set<AccountingEntry>().AsNoTracking()
                .Where(e => e.Amount == 200.00m
                            && e.DebitLedgerAccountId == TestIds.LedgerArId
                            && e.CreditLedgerAccountId == TestIds.LedgerCashId)
                .ToListAsync();
            Assert.NotEmpty(compensation);
        });
    }

    private async Task<Guid> CreateCreditSaleAsync(HttpClient client)
    {
        var orderNumber = $"SO-CRD-{Guid.NewGuid():N}"[..21];
        var command = new
        {
            orderNumber,
            isSalesOrderRequest = false,
            isPOSScreenOrder = true,
            customerId = TestIds.WalkInCustomerId,
            locationId = TestIds.LocationL1Id,
            paymentMethod = 7, // ACCPaymentMethod.Credit → no auto-payment
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
        Assert.True(response.IsSuccessStatusCode, $"Credit sale setup failed: {(int)response.StatusCode} {body}");
        return JsonDocument.Parse(body).RootElement.GetProperty("id").GetGuid();
    }
}
