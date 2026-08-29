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
/// WF-3.3 update (guards + type-flip reversal), WF-3.4 delete (full reversal).
/// </summary>
public sealed class SalesOrderUpdateDeleteTests : IClassFixture<TestWebApplicationFactory>
{
    private readonly TestWebApplicationFactory _factory;

    public SalesOrderUpdateDeleteTests(TestWebApplicationFactory factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task Should_ReverseAndRepostAccounting_When_UnpaidOrderTotalsChange()
    {
        await _factory.EnsureSeededAsync();
        var client = await _factory.CreateAuthorizedClientAsync(TestSeed.AdminEmail, TestSeed.AdminPassword);
        var (orderId, orderNumber) = await CreatePendingOrderAsync(client, quantity: 2m, deliveryStatus: 1);
        var stockAfterCreate = await GetStockAsync();

        var update = new
        {
            id = orderId,
            orderNumber,
            isSalesOrderRequest = false,
            customerId = TestIds.WalkInCustomerId,
            locationId = TestIds.LocationL1Id,
            totalAmount = 117.00m,
            totalTax = 17.00m,
            totalDiscount = 0m,
            flatDiscount = 0m,
            totalRoundOff = 0m,
            soCreatedDate = DateTime.UtcNow,
            deliveryDate = DateTime.UtcNow,
            deliveryStatus = 1, // PENDING — must stay non-delivered to remain editable
            status = 0,
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
                    salesOrderItemTaxes = new object[] { new { taxId = TestIds.TaxGst17Id } }
                }
            }
        };

        var response = await client.PutAsJsonAsync($"/api/salesOrder/{orderId}", update);
        var body = await response.Content.ReadAsStringAsync();
        Assert.True(response.IsSuccessStatusCode, $"Update failed: {(int)response.StatusCode} {body}");

        await _factory.UsingDbAsync(async db =>
        {
            // Exactly ONE Sale transaction remains, with the NEW totals.
            var transactions = await db.Set<Transaction>().AsNoTracking()
                .Include(t => t.TransactionItems)
                .Where(t => t.ReferenceNumber == orderNumber).ToListAsync();
            var sale = Assert.Single(transactions);
            Assert.Equal(TransactionType.Sale, sale.TransactionType);
            Assert.Equal(100.00m, sale.SubTotal);
            Assert.Equal(17.00m, sale.TaxAmount);
            Assert.Equal(117.00m, sale.TotalAmount);
            Assert.Single(sale.TransactionItems);

            // Net stock: reversal added 2 back, re-post deducted 1 → original − 1.
            Assert.Equal(stockAfterCreate + 1m, await GetStockAsync());

            // Order header updated.
            var order = await db.Set<SalesOrder>().AsNoTracking().FirstAsync(o => o.Id == orderId);
            Assert.Equal(117.00m, order.TotalAmount);
        });
    }

    [Fact]
    public async Task Should_Return409_When_UpdatingPaidOrder()
    {
        await _factory.EnsureSeededAsync();
        var client = await _factory.CreateAuthorizedClientAsync(TestSeed.AdminEmail, TestSeed.AdminPassword);

        // POS cash sale auto-settles → Paid.
        var (orderId, orderNumber) = await CreatePosSaleAsync(client);
        var stockBefore = await GetStockAsync();

        var update = BuildUpdate(orderId, orderNumber, quantity: 3m);
        var response = await client.PutAsJsonAsync($"/api/salesOrder/{orderId}", update);

        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
        Assert.Equal(stockBefore, await GetStockAsync());
    }

    [Fact]
    public async Task Should_Return409_When_UpdatingDeliveredOrder()
    {
        await _factory.EnsureSeededAsync();
        var client = await _factory.CreateAuthorizedClientAsync(TestSeed.AdminEmail, TestSeed.AdminPassword);
        // SalesDeliveryStatus.DELIVERED = 0 — the default for a non-POS order.
        var (orderId, orderNumber) = await CreatePendingOrderAsync(client, quantity: 1m, deliveryStatus: 0);

        var update = BuildUpdate(orderId, orderNumber, quantity: 3m);
        var response = await client.PutAsJsonAsync($"/api/salesOrder/{orderId}", update);

        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
    }

    [Fact]
    public async Task Should_Return409_When_UpdatingReturnedOrder()
    {
        await _factory.EnsureSeededAsync();
        var client = await _factory.CreateAuthorizedClientAsync(TestSeed.AdminEmail, TestSeed.AdminPassword);
        var (orderId, orderNumber) = await CreatePendingOrderAsync(client, quantity: 2m, deliveryStatus: 1);

        // Turn the order into a return (minimal single-line return).
        var returnCommand = new
        {
            id = orderId,
            orderNumber,
            locationId = TestIds.LocationL1Id,
            customerId = TestIds.WalkInCustomerId,
            isSalesOrderRequest = false,
            totalAmount = 0m,
            totalTax = 0m,
            totalDiscount = 0m,
            flatDiscount = 0m,
            totalRoundOff = 0m,
            paymentMethod = 1,
            isSelectPaymentMethod = false,
            note = "guard setup",
            deliveryDate = DateTime.UtcNow,
            salesOrderItems = Array.Empty<object>()
        };
        var returnResponse = await client.PutAsJsonAsync($"/api/salesOrder/{orderId}/return", returnCommand);
        Assert.True(returnResponse.IsSuccessStatusCode, await returnResponse.Content.ReadAsStringAsync());

        var update = BuildUpdate(orderId, orderNumber, quantity: 1m);
        var response = await client.PutAsJsonAsync($"/api/salesOrder/{orderId}", update);

        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
    }

    [Fact]
    public async Task Should_RestoreStockAndRemoveTransactions_When_OrderIsDeleted()
    {
        await _factory.EnsureSeededAsync();
        var client = await _factory.CreateAuthorizedClientAsync(TestSeed.AdminEmail, TestSeed.AdminPassword);
        var (orderId, orderNumber) = await CreatePendingOrderAsync(client, quantity: 2m, deliveryStatus: 1);
        var stockAfterCreate = await GetStockAsync();

        var response = await client.DeleteAsync($"/api/salesOrder/{orderId}");
        Assert.True(response.IsSuccessStatusCode, $"Delete failed: {(int)response.StatusCode} {await response.Content.ReadAsStringAsync()}");

        await _factory.UsingDbAsync(async db =>
        {
            // Stock fully restored (WF-3.4).
            Assert.Equal(stockAfterCreate + 2m, await GetStockAsync());

            var transactions = await db.Set<Transaction>().AsNoTracking()
                .Where(t => t.ReferenceNumber == orderNumber).ToListAsync();
            Assert.Empty(transactions);

            var orderExists = await db.Set<SalesOrder>().AsNoTracking().AnyAsync(o => o.Id == orderId);
            Assert.False(orderExists);
        });
    }

    [Fact]
    public async Task Should_Return409_When_UpdateReusesAnotherOrdersNumber()
    {
        await _factory.EnsureSeededAsync();
        var client = await _factory.CreateAuthorizedClientAsync(TestSeed.AdminEmail, TestSeed.AdminPassword);
        var (firstId, firstNumber) = await CreatePendingOrderAsync(client, quantity: 1m, deliveryStatus: 1);
        var (secondId, secondNumber) = await CreatePendingOrderAsync(client, quantity: 1m, deliveryStatus: 1);

        var update = BuildUpdate(secondId, firstNumber, quantity: 1m); // reuse first order's number
        var response = await client.PutAsJsonAsync($"/api/salesOrder/{secondId}", update);

        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
    }

    private static object BuildUpdate(Guid orderId, string orderNumber, decimal quantity) => new
    {
        id = orderId,
        orderNumber,
        isSalesOrderRequest = false,
        customerId = TestIds.WalkInCustomerId,
        locationId = TestIds.LocationL1Id,
        totalAmount = quantity * 100.00m + quantity * 17.00m,
        totalTax = quantity * 17.00m,
        totalDiscount = 0m,
        flatDiscount = 0m,
        totalRoundOff = 0m,
        soCreatedDate = DateTime.UtcNow,
        deliveryDate = DateTime.UtcNow,
        deliveryStatus = 1,
        status = 0,
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
                purchasePrice = 60.00m,
                salesOrderItemTaxes = new object[] { new { taxId = TestIds.TaxGst17Id } }
            }
        }
    };

    private async Task<(Guid OrderId, string OrderNumber)> CreatePendingOrderAsync(HttpClient client, decimal quantity, int deliveryStatus)
    {
        var orderNumber = $"SO-UPD-{Guid.NewGuid():N}"[..21];
        var command = new
        {
            orderNumber,
            isSalesOrderRequest = false,
            isPOSScreenOrder = false,
            customerId = TestIds.WalkInCustomerId,
            locationId = TestIds.LocationL1Id,
            paymentMethod = 1,
            totalAmount = quantity * 117.00m,
            totalTax = quantity * 17.00m,
            totalDiscount = 0m,
            totalRoundOff = 0m,
            flatDiscount = 0m,
            soCreatedDate = DateTime.UtcNow,
            deliveryDate = DateTime.UtcNow,
            deliveryStatus,
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
        Assert.True(response.IsSuccessStatusCode, $"Order setup failed: {(int)response.StatusCode} {body}");
        return (JsonDocument.Parse(body).RootElement.GetProperty("id").GetGuid(), orderNumber);
    }

    private async Task<(Guid OrderId, string OrderNumber)> CreatePosSaleAsync(HttpClient client)
    {
        var orderNumber = $"SO-POS-{Guid.NewGuid():N}"[..21];
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
        Assert.True(response.IsSuccessStatusCode, $"POS sale setup failed: {(int)response.StatusCode} {body}");
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
