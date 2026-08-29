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
using POS.Data.Entities.FBR;
using Xunit;

namespace POS.API.Tests.SalesOrders;

/// <summary>
/// WF-3.2 step 4 — FBR staging: sale at an FBR-enabled location queues the invoice and captures buyer data.
/// </summary>
public sealed class SalesOrderFbrStagingTests : IClassFixture<TestWebApplicationFactory>
{
    private readonly TestWebApplicationFactory _factory;

    public SalesOrderFbrStagingTests(TestWebApplicationFactory factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task Should_QueueInvoiceAndCaptureBuyerFields_When_SaleAtFbrEnabledLocation()
    {
        await _factory.EnsureSeededAsync();
        var client = await _factory.CreateAuthorizedClientAsync(TestSeed.AdminEmail, TestSeed.AdminPassword);

        var orderNumber = $"SO-FBR-{Guid.NewGuid():N}"[..21];
        var command = new
        {
            orderNumber,
            isSalesOrderRequest = false,
            isPOSScreenOrder = false,
            customerId = TestIds.WalkInCustomerId,
            locationId = TestIds.LocationFbrId, // IsFBREnabled + AutoSubmitInvoices
            paymentMethod = 1,
            totalAmount = 234.00m,
            totalTax = 34.00m,
            totalDiscount = 0m,
            totalRoundOff = 0m,
            flatDiscount = 0m,
            soCreatedDate = DateTime.UtcNow,
            deliveryDate = DateTime.UtcNow,
            deliveryStatus = 1,
            buyerNTN = "1234567-8",
            buyerCNIC = "35202-1234567-1",
            buyerName = "FBR Test Buyer",
            buyerPhoneNumber = "0300-0000009",
            buyerAddress = "Buyer Street 9",
            saleType = "",
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
        Assert.True(response.IsSuccessStatusCode, $"Sale failed: {(int)response.StatusCode} {body}");
        var orderId = JsonDocument.Parse(body).RootElement.GetProperty("id").GetGuid();

        await _factory.UsingDbAsync(async db =>
        {
            var order = await db.Set<SalesOrder>().AsNoTracking().FirstAsync(o => o.Id == orderId);

            Assert.Equal(FBRSubmissionStatus.Queued, order.FBRStatus);
            Assert.Equal("1234567-8", order.BuyerNTN);
            Assert.Equal("35202-1234567-1", order.BuyerCNIC);
            Assert.Equal("FBR Test Buyer", order.BuyerName);
            Assert.Equal("0300-0000009", order.BuyerPhoneNumber);
            Assert.Equal("Buyer Street 9", order.BuyerAddress);

            // SaleType empty → defaulted to "Retail" (WF-3.2 step 4).
            Assert.Equal("Retail", order.SaleType);
        });
    }

    [Fact]
    public async Task Should_NotQueueInvoice_When_LocationIsNotFbrEnabled()
    {
        await _factory.EnsureSeededAsync();
        var client = await _factory.CreateAuthorizedClientAsync(TestSeed.AdminEmail, TestSeed.AdminPassword);

        var orderNumber = $"SO-NFBR-{Guid.NewGuid():N}"[..22];
        var command = new
        {
            orderNumber,
            isSalesOrderRequest = false,
            isPOSScreenOrder = false,
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
            deliveryStatus = 1,
            buyerNTN = "1234567-8",
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
        Assert.True(response.IsSuccessStatusCode, await response.Content.ReadAsStringAsync());
        var orderId = JsonDocument.Parse(await response.Content.ReadAsStringAsync())
            .RootElement.GetProperty("id").GetGuid();

        await _factory.UsingDbAsync(async db =>
        {
            var order = await db.Set<SalesOrder>().AsNoTracking().FirstAsync(o => o.Id == orderId);
            Assert.Equal(FBRSubmissionStatus.NotSubmitted, order.FBRStatus);

            // Characterization: the mapper persists buyer fields regardless of location FBR status —
            // only the queueing decision is FBR-gated (WF-3.2 step 4).
            Assert.Equal("1234567-8", order.BuyerNTN);
        });
    }
}
