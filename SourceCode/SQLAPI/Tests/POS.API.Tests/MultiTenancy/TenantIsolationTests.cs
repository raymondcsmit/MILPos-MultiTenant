using System;
using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using System.Threading.Tasks;
using POS.API.Tests.Infra;
using Xunit;

namespace POS.API.Tests.MultiTenancy;

/// <summary>
/// WF-2.2 / Chain 3 — tenant isolation: a TenantId=B JWT must never see Tenant A data
/// (POSDbContext global query filter).
/// </summary>
public sealed class TenantIsolationTests : IClassFixture<TestWebApplicationFactory>
{
    private readonly TestWebApplicationFactory _factory;

    public TenantIsolationTests(TestWebApplicationFactory factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task Should_Return404_When_TenantBRequestsTenantAOrder()
    {
        await _factory.EnsureSeededAsync();
        var adminClient = await _factory.CreateAuthorizedClientAsync(TestSeed.AdminEmail, TestSeed.AdminPassword);

        // Create a tenant-A order.
        var orderNumber = $"SO-ISO-{Guid.NewGuid():N}"[..21];
        var create = await adminClient.PostAsJsonAsync("/api/salesOrder", new
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
                    quantity = 1m,
                    unitPrice = 100.00m,
                    unitId = TestIds.UnitPcId,
                    discountType = "fixed",
                    discountPercentage = 0m,
                    salesOrderItemTaxes = new object[] { new { taxId = TestIds.TaxGst17Id } }
                }
            }
        });
        create.EnsureSuccessStatusCode();
        var orderId = JsonDocument.Parse(await create.Content.ReadAsStringAsync())
            .RootElement.GetProperty("id").GetGuid();

        // Tenant B must not see it.
        var tenantBClient = await _factory.CreateAuthorizedClientAsync("admin-b@testb.local", "admin@123b");
        var response = await tenantBClient.GetAsync($"/api/salesOrder/{orderId}");

        Assert.True(
            response.StatusCode == HttpStatusCode.NotFound || response.StatusCode == HttpStatusCode.NoContent,
            $"Cross-tenant order fetch must not leak data but returned {(int)response.StatusCode}");
    }

    [Fact]
    public async Task Should_ReturnEmptyList_When_TenantBListsSalesOrders()
    {
        await _factory.EnsureSeededAsync();
        var adminClient = await _factory.CreateAuthorizedClientAsync(TestSeed.AdminEmail, TestSeed.AdminPassword);
        var tenantBClient = await _factory.CreateAuthorizedClientAsync("admin-b@testb.local", "admin@123b");

        // Ensure tenant A has at least one order.
        var create = await adminClient.PostAsJsonAsync("/api/salesOrder", new
        {
            orderNumber = $"SO-ISO2-{Guid.NewGuid():N}"[..22],
            isSalesOrderRequest = false,
            isPOSScreenOrder = true,
            customerId = TestIds.WalkInCustomerId,
            locationId = TestIds.LocationL1Id,
            paymentMethod = 1,
            totalAmount = 117.00m,
            totalTax = 17.00m,
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
                    unitPrice = 100.00m,
                    unitId = TestIds.UnitPcId,
                    discountType = "fixed",
                    discountPercentage = 0m,
                    salesOrderItemTaxes = new object[] { new { taxId = TestIds.TaxGst17Id } }
                }
            }
        });
        create.EnsureSuccessStatusCode();

        var response = await tenantBClient.GetAsync("/api/salesOrder?pageSize=50");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var body = await response.Content.ReadAsStringAsync();
        Assert.False(body.Contains("SO-ISO2-"), $"Tenant B leaked tenant A orders: {body}");
    }
}
