using System;
using System.Linq;
using System.Net;
using System.Net.Http;
using System.Net.Http.Json;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using POS.API.Tests.Infra;
using POS.Data;
using POS.Data.Entities;
using Xunit;

namespace POS.API.Tests.D08Customer;

/// <summary>
/// D08 customer-payments ledger: a customer payment is allocated FIFO (oldest CreatedDate first) across
/// open Pending/Partial sales orders via AddSalesOrderPayment; the un-applied remainder becomes the new
/// ledger Balance. Overdue in the payload must cover the amount or the endpoint 409s.
/// </summary>
public sealed class CustomerLedgerTests : IClassFixture<TestWebApplicationFactory>
{
    private readonly TestWebApplicationFactory _factory;

    public CustomerLedgerTests(TestWebApplicationFactory factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task Should_Return409_When_AmountExceedsOverdue()
    {
        await _factory.EnsureSeededAsync();
        var client = await _factory.CreateAuthorizedClientAsync(TestSeed.AdminEmail, TestSeed.AdminPassword);

        var response = await client.PostAsJsonAsync("/api/CustomerLedger", LedgerPayload(amount: 150m, overdue: 100m));

        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
    }

    [Fact]
    public async Task Should_AllocatePayment_Fifo_Across_OpenOrders()
    {
        await _factory.EnsureSeededAsync();
        var client = await _factory.CreateAuthorizedClientAsync(TestSeed.AdminEmail, TestSeed.AdminPassword);
        var customerId = await NewCustomerAsync(client);

        var orderA = $"SO-LOGA-{Guid.NewGuid():N}"[..19];
        var orderB = $"SO-LOGB-{Guid.NewGuid():N}"[..19];

        Assert.True((await client.PostAsJsonAsync("/api/SalesOrder", OrderPayload(orderA, 100m, customerId))).IsSuccessStatusCode);
        Assert.True((await client.PostAsJsonAsync("/api/SalesOrder", OrderPayload(orderB, 200m, customerId))).IsSuccessStatusCode);

        var payment = await client.PostAsJsonAsync("/api/CustomerLedger", LedgerPayload(amount: 150m, overdue: 150m, customerId));
        Assert.True(payment.IsSuccessStatusCode, await payment.Content.ReadAsStringAsync());

        await _factory.UsingDbAsync(async db =>
        {
            var a = await db.Set<SalesOrder>().AsNoTracking().SingleAsync(o => o.OrderNumber == orderA);
            var b = await db.Set<SalesOrder>().AsNoTracking().SingleAsync(o => o.OrderNumber == orderB);
            Assert.Equal(PaymentStatus.Paid, a.PaymentStatus);
            Assert.Equal(100m, a.TotalPaidAmount);
            Assert.Equal(PaymentStatus.Partial, b.PaymentStatus);
            Assert.Equal(50m, b.TotalPaidAmount);

            var ledger = await db.Set<CustomerLedger>().AsNoTracking()
                .SingleAsync(l => l.CustomerId == customerId &&
                                  l.Description == "Auto payment allocation");
            Assert.Equal(0m, ledger.Balance);
        });
    }

    [Fact]
    public async Task Should_KeepRemainderAsBalance_When_PaymentExceedsOpenAmount()
    {
        await _factory.EnsureSeededAsync();
        var client = await _factory.CreateAuthorizedClientAsync(TestSeed.AdminEmail, TestSeed.AdminPassword);
        var customerId = await NewCustomerAsync(client);

        var orderC = $"SO-LOGC-{Guid.NewGuid():N}"[..19];
        Assert.True((await client.PostAsJsonAsync("/api/SalesOrder", OrderPayload(orderC, 100m, customerId))).IsSuccessStatusCode);

        var payment = await client.PostAsJsonAsync("/api/CustomerLedger", LedgerPayload(amount: 250m, overdue: 250m, customerId));
        Assert.True(payment.IsSuccessStatusCode, await payment.Content.ReadAsStringAsync());

        await _factory.UsingDbAsync(async db =>
        {
            var order = await db.Set<SalesOrder>().AsNoTracking().SingleAsync(o => o.OrderNumber == orderC);
            Assert.Equal(100m, order.TotalPaidAmount);

            var ledger = await db.Set<CustomerLedger>().AsNoTracking()
                .SingleAsync(l => l.CustomerId == customerId &&
                                  l.Description == "Auto payment allocation");
            Assert.Equal(150m, ledger.Balance);
        });
    }

    [Fact]
    public async Task Should_Return403_When_PostingLedgerWithoutManageClaim()
    {
        await _factory.EnsureSeededAsync();
        var client = await _factory.CreateAuthorizedClientAsync(TestSeed.NoClaimsEmail, TestSeed.NoClaimsPassword);

        var response = await client.PostAsJsonAsync("/api/CustomerLedger", LedgerPayload(amount: 1m, overdue: 1m));

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task Should_ListLedger_When_ViewClaim()
    {
        await _factory.EnsureSeededAsync();
        var client = await _factory.CreateAuthorizedClientAsync(TestSeed.AdminEmail, TestSeed.AdminPassword);

        var response = await client.GetAsync("/api/CustomerLedger?pageSize=10");

        Assert.True(response.IsSuccessStatusCode, await response.Content.ReadAsStringAsync());
        Assert.True(response.Headers.Contains("X-Pagination"));
    }

    private static object OrderPayload(string orderNumber, decimal total, Guid customerId) => new
    {
        orderNumber,
        isSalesOrderRequest = true,
        isPOSScreenOrder = false,
        customerId,
        locationId = TestIds.LocationL1Id,
        paymentMethod = 1,
        totalAmount = total,
        totalTax = 0m,
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
                quantity = 1m,
                unitPrice = total,
                unitId = TestIds.UnitPcId,
                discountType = "fixed",
                discountPercentage = 0m,
                salesOrderItemTaxes = Array.Empty<object>()
            }
        }
    };

    private static object LedgerPayload(decimal amount, decimal overdue, Guid? customerId = null) => new
    {
        date = DateTime.UtcNow,
        customerId = customerId ?? TestIds.WalkInCustomerId,
        locationId = TestIds.LocationL1Id,
        locationName = "Warehouse A",
        description = "Auto payment allocation",
        amount,
        balance = 0m,
        overdue,
        reference = $"LEDGER-{Guid.NewGuid():N}"[..20],
        isCustomer = true,
        note = "customer payment"
    };

    private static async Task<Guid> NewCustomerAsync(HttpClient client)
    {
        var response = await client.PostAsJsonAsync("/api/Customer", new
        {
            customerName = $"Ledger-Customer-{Guid.NewGuid():N}"[..24],
            contactPerson = "Ledger Contact",
            mobileNo = "0321-" + Guid.NewGuid().ToString("N")[..8]
        });
        Assert.True(response.IsSuccessStatusCode, await response.Content.ReadAsStringAsync());
        return (await response.Content.ReadFromJsonAsync<System.Text.Json.JsonElement>()).GetProperty("id").GetGuid();
    }
}