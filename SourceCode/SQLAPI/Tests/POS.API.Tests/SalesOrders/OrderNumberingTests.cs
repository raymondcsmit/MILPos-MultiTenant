using System;
using System.Net.Http.Json;
using System.Text.Json;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using POS.API.Tests.Infra;
using POS.Data;
using POS.Data.Dto;
using POS.Data.Entities;
using Xunit;

namespace POS.API.Tests.SalesOrders;

/// <summary>
/// Verifies sequential order numbering logic for sales and purchase orders (BUG-22 / N-13 fix).
/// Ensures zero-padded sequences like SO#00009 cleanly increment to SO#00010 without digit expansion.
/// </summary>
public sealed class OrderNumberingTests : IClassFixture<TestWebApplicationFactory>
{
    private readonly TestWebApplicationFactory _factory;

    public OrderNumberingTests(TestWebApplicationFactory factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task Should_IncrementSalesOrderNumber_PreservingFiveDigits_When_LastNumberEndsInNine()
    {
        await _factory.EnsureSeededAsync();
        var client = await _factory.CreateAuthorizedClientAsync(TestSeed.AdminEmail, TestSeed.AdminPassword);

        // Seed a sales order ending in 00009 with newest timestamp
        await _factory.UsingDbAsync(async db =>
        {
            db.Set<POS.Data.SalesOrder>().Add(new POS.Data.SalesOrder
            {
                Id = Guid.NewGuid(),
                OrderNumber = "SO#00009",
                CustomerId = TestIds.WalkInCustomerId,
                LocationId = TestIds.LocationL1Id,
                DeliveryDate = DateTime.UtcNow,
                SOCreatedDate = DateTime.UtcNow.AddMinutes(10),
                TotalAmount = 100m,
                IsSalesOrderRequest = false
            });
            await db.SaveChangesAsync();
        });

        var response = await client.GetAsync("/api/salesOrder/newOrderNumber/false");
        response.EnsureSuccessStatusCode();

        var json = await response.Content.ReadFromJsonAsync<JsonElement>();
        var orderNumber = json.GetProperty("orderNumber").GetString();

        Assert.Equal("SO#00010", orderNumber);
    }

    [Fact]
    public async Task Should_IncrementSalesOrderNumber_When_LastNumberIsDoubleNine()
    {
        await _factory.EnsureSeededAsync();
        var client = await _factory.CreateAuthorizedClientAsync(TestSeed.AdminEmail, TestSeed.AdminPassword);

        await _factory.UsingDbAsync(async db =>
        {
            db.Set<POS.Data.SalesOrder>().Add(new POS.Data.SalesOrder
            {
                Id = Guid.NewGuid(),
                OrderNumber = "SO#00099",
                CustomerId = TestIds.WalkInCustomerId,
                LocationId = TestIds.LocationL1Id,
                DeliveryDate = DateTime.UtcNow,
                SOCreatedDate = DateTime.UtcNow.AddMinutes(20),
                TotalAmount = 100m,
                IsSalesOrderRequest = false
            });
            await db.SaveChangesAsync();
        });

        var response = await client.GetAsync("/api/salesOrder/newOrderNumber/false");
        response.EnsureSuccessStatusCode();

        var json = await response.Content.ReadFromJsonAsync<JsonElement>();
        var orderNumber = json.GetProperty("orderNumber").GetString();

        Assert.Equal("SO#00100", orderNumber);
    }

    [Fact]
    public async Task Should_IncrementPurchaseOrderNumber_PreservingFiveDigits_When_LastNumberEndsInNine()
    {
        await _factory.EnsureSeededAsync();
        var client = await _factory.CreateAuthorizedClientAsync(TestSeed.AdminEmail, TestSeed.AdminPassword);

        await _factory.UsingDbAsync(async db =>
        {
            db.Set<POS.Data.PurchaseOrder>().Add(new POS.Data.PurchaseOrder
            {
                Id = Guid.NewGuid(),
                OrderNumber = "PO#00009",
                SupplierId = TestIds.SupplierS1Id,
                LocationId = TestIds.LocationL1Id,
                DeliveryDate = DateTime.UtcNow,
                POCreatedDate = DateTime.UtcNow.AddMinutes(10),
                TotalAmount = 100m,
                IsPurchaseOrderRequest = false
            });
            await db.SaveChangesAsync();
        });

        var response = await client.GetAsync("/api/PurchaseOrder/newOrderNumber/true");
        response.EnsureSuccessStatusCode();

        var json = await response.Content.ReadFromJsonAsync<JsonElement>();
        var orderNumber = json.GetProperty("orderNumber").GetString();

        Assert.Equal("PO#00010", orderNumber);
    }
}
