using System;
using System.Linq;
using System.Net;
using System.Net.Http;
using System.Net.Http.Json;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using POS.API.Tests.Infra;
using POS.Data;
using POS.Data.Entities.FBR;
using Xunit;

namespace POS.API.Tests.FBR;

/// <summary>
/// D09 FBR tracking surface (no external HTTP touched — only the unknown-order guards and the
/// status read-back; the live submit path is exercised against a real HTTP client and cannot run
/// in tests). FBRController carries NO ClaimCheck — pinned as Gap-Char by the NoClaims test.
/// </summary>
public sealed class FBRControllerTests : IClassFixture<TestWebApplicationFactory>
{
    private readonly TestWebApplicationFactory _factory;

    public FBRControllerTests(TestWebApplicationFactory factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task Should_Return400_When_SubmittingUnknownOrder()
    {
        await _factory.EnsureSeededAsync();
        var client = await _factory.CreateAuthorizedClientAsync(TestSeed.AdminEmail, TestSeed.AdminPassword);

        var response = await client.PostAsync($"/api/fbr/submit/{Guid.NewGuid()}", null);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        var body = await response.Content.ReadAsStringAsync();
        Assert.Contains("not found", body, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task Should_Return404_When_CheckingStatusOfUnknownOrder()
    {
        await _factory.EnsureSeededAsync();
        var client = await _factory.CreateAuthorizedClientAsync(TestSeed.AdminEmail, TestSeed.AdminPassword);

        var response = await client.GetAsync($"/api/fbr/status/{Guid.NewGuid()}");

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task Should_ReturnQueuedStatus_ForFbrStageSale()
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
            locationId = TestIds.LocationFbrId,
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
        var create = await client.PostAsJsonAsync("/api/salesOrder", command);
        Assert.True(create.IsSuccessStatusCode, await create.Content.ReadAsStringAsync());

        await _factory.UsingDbAsync(async db =>
        {
            var orderId = await db.Set<SalesOrder>().Where(o => o.OrderNumber == orderNumber).Select(o => o.Id).SingleAsync();
            Assert.Equal(FBRSubmissionStatus.Queued, (await db.Set<SalesOrder>().AsNoTracking().SingleAsync(o => o.Id == orderId)).FBRStatus);

            var status = await client.GetAsync($"/api/fbr/status/{orderId}");
            Assert.True(status.IsSuccessStatusCode, await status.Content.ReadAsStringAsync());
            var body = await status.Content.ReadAsStringAsync();
            Assert.Contains("Queued", body);
        });
    }

    [Fact]
    public async Task Should_AllowStatusAndExportSurfaceWithoutFbrClaim()
    {
        await _factory.EnsureSeededAsync();
        var client = await _factory.CreateAuthorizedClientAsync(TestSeed.NoClaimsEmail, TestSeed.NoClaimsPassword);

        var submit = await client.PostAsync($"/api/fbr/submit/{Guid.NewGuid()}", null);
        Assert.NotEqual(HttpStatusCode.Forbidden, submit.StatusCode);

        var status = await client.GetAsync($"/api/fbr/status/{Guid.NewGuid()}");
        Assert.NotEqual(HttpStatusCode.Forbidden, status.StatusCode);
    }
}