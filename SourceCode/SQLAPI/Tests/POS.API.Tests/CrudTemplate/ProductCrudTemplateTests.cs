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
using Xunit;

namespace POS.API.Tests.CrudTemplate;

/// <summary>
/// Wave-3 CRUD roll-out (Products) — create drives the full catalog wiring (unit + brand + category
/// referenced, zero ProductStock rows auto-created per location). Duplicate name-in-category and
/// duplicate barcode both 409. Tenant B shares the Admin role so PRO_* claims apply to both admins.
/// </summary>
public sealed class ProductCrudTemplateTests : IClassFixture<TestWebApplicationFactory>
{
    private readonly TestWebApplicationFactory _factory;

    public ProductCrudTemplateTests(TestWebApplicationFactory factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task Should_CreateProduct_And_AutoCreateStockRowsPerLocation()
    {
        await _factory.EnsureSeededAsync();
        var client = await _factory.CreateAuthorizedClientAsync(TestSeed.AdminEmail, TestSeed.AdminPassword);
        var fixture = await CreateProductFixtureAsync(client);

        await _factory.UsingDbAsync(async db =>
        {
            var product = await db.Set<Product>().AsNoTracking().SingleAsync(p => p.Id == fixture.ProductId);
            Assert.Equal(fixture.Name, product.Name);
            Assert.False(product.IsDeleted);

            var locationsCount = await db.Set<Location>().CountAsync();
            var stockRows = await db.Set<ProductStock>().Where(s => s.ProductId == fixture.ProductId).ToListAsync();
            Assert.True(stockRows.Count >= 1, "product create must auto-create a ProductStock row");
            Assert.All(stockRows, s => Assert.Equal(0.0m, s.CurrentStock));
        });
    }

    [Fact]
    public async Task Should_Return409_When_CreatingDuplicateProductNameInSameCategory()
    {
        await _factory.EnsureSeededAsync();
        var client = await _factory.CreateAuthorizedClientAsync(TestSeed.AdminEmail, TestSeed.AdminPassword);
        var fixture = await CreateProductFixtureAsync(client);

        var second = await client.PostAsJsonAsync("/api/Product", ProductPayload(fixture.Name, fixture.Barcode, fixture));
        Assert.Equal(HttpStatusCode.Conflict, second.StatusCode);
    }

    [Fact]
    public async Task Should_Return409_When_CreatingDuplicateBarcode()
    {
        await _factory.EnsureSeededAsync();
        var client = await _factory.CreateAuthorizedClientAsync(TestSeed.AdminEmail, TestSeed.AdminPassword);
        var fixture = await CreateProductFixtureAsync(client);

        var second = await client.PostAsJsonAsync("/api/Product", ProductPayload($"Other-{Guid.NewGuid():N}"[..8], fixture.Barcode, fixture));
        Assert.Equal(HttpStatusCode.Conflict, second.StatusCode);
    }

    [Fact]
    public async Task Should_UpdateProductName()
    {
        await _factory.EnsureSeededAsync();
        var client = await _factory.CreateAuthorizedClientAsync(TestSeed.AdminEmail, TestSeed.AdminPassword);
        var fixture = await CreateProductFixtureAsync(client);
        var newName = $"Updated-{Guid.NewGuid():N}"[..10];

        var response = await client.PutAsJsonAsync($"/api/Product/{fixture.ProductId}", ProductPayload(newName, fixture.Barcode, fixture, productId: fixture.ProductId));
        Assert.True(response.IsSuccessStatusCode, await response.Content.ReadAsStringAsync());

        await _factory.UsingDbAsync(async db =>
        {
            var product = await db.Set<Product>().AsNoTracking().SingleAsync(p => p.Id == fixture.ProductId);
            Assert.Equal(newName, product.Name);
        });
    }

    [Fact]
    public async Task Should_SoftDeleteProduct_And_ExcludeItFromList()
    {
        await _factory.EnsureSeededAsync();
        var client = await _factory.CreateAuthorizedClientAsync(TestSeed.AdminEmail, TestSeed.AdminPassword);
        var fixture = await CreateProductFixtureAsync(client);

        var response = await client.DeleteAsync($"/api/Product/{fixture.ProductId}");
        Assert.True(response.IsSuccessStatusCode, await response.Content.ReadAsStringAsync());

        await _factory.UsingDbAsync(async db =>
        {
            var product = await db.Set<Product>().IgnoreQueryFilters().AsNoTracking().SingleAsync(p => p.Id == fixture.ProductId);
            Assert.True(product.IsDeleted);
        });

        var list = await client.GetAsync("/api/Product");
        var body = await list.Content.ReadAsStringAsync();
        Assert.DoesNotContain(fixture.Name, body);
    }

    [Fact]
    public async Task Should_Return404_When_GettingDeletedProduct()
    {
        await _factory.EnsureSeededAsync();
        var client = await _factory.CreateAuthorizedClientAsync(TestSeed.AdminEmail, TestSeed.AdminPassword);
        var fixture = await CreateProductFixtureAsync(client);
        (await client.DeleteAsync($"/api/Product/{fixture.ProductId}")).EnsureSuccessStatusCode();

        var response = await client.GetAsync($"/api/Product/{fixture.ProductId}");
        Assert.True(
            response.StatusCode == HttpStatusCode.NotFound || response.StatusCode == HttpStatusCode.NoContent,
            $"Deleted product fetch returned {(int)response.StatusCode}");
    }

    [Fact]
    public async Task Should_Return403_When_CreatingWithoutAddClaim()
    {
        await _factory.EnsureSeededAsync();
        var client = await _factory.CreateAuthorizedClientAsync(TestSeed.NoClaimsEmail, TestSeed.NoClaimsPassword);

        var response = await client.PostAsJsonAsync("/api/Product", new { name = "NoClaimProduct" });

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task Should_HideProductFromTenantB_When_QueriedCrossTenant()
    {
        await _factory.EnsureSeededAsync();
        var adminClient = await _factory.CreateAuthorizedClientAsync(TestSeed.AdminEmail, TestSeed.AdminPassword);
        var fixture = await CreateProductFixtureAsync(adminClient);

        var tenantBClient = await _factory.CreateAuthorizedClientAsync(TestSeed.TenantBAdminEmail, TestSeed.TenantBAdminPassword);
        var list = await tenantBClient.GetAsync("/api/Product");
        Assert.True(list.IsSuccessStatusCode, await list.Content.ReadAsStringAsync());
        var body = await list.Content.ReadAsStringAsync();

        Assert.DoesNotContain(fixture.Name, body);
    }

    private static object ProductPayload(string name, string barcode, ProductFixture fixture, Guid? productId = null) => new
    {
        id = productId ?? Guid.Empty,
        name,
        code = $"C-{Guid.NewGuid():N}"[..12],
        barcode,
        unitId = fixture.UnitId,
        brandId = fixture.BrandId,
        categoryId = fixture.CategoryId,
        purchasePrice = 25.00m,
        salesPrice = 45.00m,
        mrp = 49.00m
    };

    private async Task<ProductFixture> CreateProductFixtureAsync(HttpClient client)
    {
        var brandResp = await client.PostAsJsonAsync("/api/Brand", new { name = $"Brand-{Guid.NewGuid():N}"[..14] });
        var brandBody = await brandResp.Content.ReadAsStringAsync();
        Assert.True(brandResp.IsSuccessStatusCode, brandBody);
        var brandId = JsonDocument.Parse(brandBody).RootElement.GetProperty("id").GetGuid();

        var unitResp = await client.PostAsJsonAsync("/api/UnitConversation", new { name = $"Unit-{Guid.NewGuid():N}"[..12], code = $"U{Guid.NewGuid():N}"[..4] });
        var unitBody = await unitResp.Content.ReadAsStringAsync();
        Assert.True(unitResp.IsSuccessStatusCode, unitBody);
        var unitId = JsonDocument.Parse(unitBody).RootElement.GetProperty("id").GetGuid();

        var catResp = await client.PostAsJsonAsync("/api/ProductCategory", new { name = $"Cat-{Guid.NewGuid():N}"[..14] });
        var catBody = await catResp.Content.ReadAsStringAsync();
        Assert.True(catResp.IsSuccessStatusCode, catBody);
        var categoryId = JsonDocument.Parse(catBody).RootElement.GetProperty("id").GetGuid();

        var name = $"Prod-{Guid.NewGuid():N}"[..16];
        var barcode = Guid.NewGuid().ToString("N")[..13];
        var productResp = await client.PostAsJsonAsync("/api/Product", ProductPayload(name, barcode, new ProductFixture(brandId, unitId, categoryId, Guid.Empty, name, barcode)));
        var productBody = await productResp.Content.ReadAsStringAsync();
        Assert.True(productResp.IsSuccessStatusCode, productBody);
        var productId = JsonDocument.Parse(productBody).RootElement.GetProperty("id").GetGuid();

        return new ProductFixture(brandId, unitId, categoryId, productId, name, barcode);
    }

    private sealed record ProductFixture(Guid BrandId, Guid UnitId, Guid CategoryId, Guid ProductId, string Name, string Barcode);
}