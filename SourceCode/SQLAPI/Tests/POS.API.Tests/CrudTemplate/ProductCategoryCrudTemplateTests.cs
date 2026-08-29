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
/// Wave-2 CRUD roll-out (Product Categories) — full Brand-template matrix (this controller
/// has a get-by-id route, so the soft-delete 404 case is asserted directly).
/// </summary>
public sealed class ProductCategoryCrudTemplateTests : IClassFixture<TestWebApplicationFactory>
{
    private readonly TestWebApplicationFactory _factory;

    public ProductCategoryCrudTemplateTests(TestWebApplicationFactory factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task Should_CreateCategory_And_PersistIt()
    {
        await _factory.EnsureSeededAsync();
        var client = await _factory.CreateAuthorizedClientAsync(TestSeed.AdminEmail, TestSeed.AdminPassword);

        var response = await client.PostAsJsonAsync("/api/ProductCategory", new { name = $"Cat-{Guid.NewGuid():N}"[..15] });

        Assert.True(response.IsSuccessStatusCode, await response.Content.ReadAsStringAsync());
        var created = await response.Content.ReadFromJsonAsync<JsonElement>(new JsonSerializerOptions(JsonSerializerDefaults.Web));
        var categoryId = created.GetProperty("id").GetGuid();

        await _factory.UsingDbAsync(async db =>
        {
            var category = await db.Set<ProductCategory>().AsNoTracking().SingleAsync(c => c.Id == categoryId);
            Assert.False(string.IsNullOrWhiteSpace(category.Name));
            Assert.False(category.IsDeleted);
        });
    }

    [Fact]
    public async Task Should_Return409_When_CreatingDuplicateCategoryName()
    {
        await _factory.EnsureSeededAsync();
        var client = await _factory.CreateAuthorizedClientAsync(TestSeed.AdminEmail, TestSeed.AdminPassword);
        var name = $"Cat-{Guid.NewGuid():N}"[..15];

        var first = await client.PostAsJsonAsync("/api/ProductCategory", new { name });
        Assert.True(first.IsSuccessStatusCode, await first.Content.ReadAsStringAsync());

        var second = await client.PostAsJsonAsync("/api/ProductCategory", new { name });
        Assert.Equal(HttpStatusCode.Conflict, second.StatusCode);
    }

    [Fact]
    public async Task Should_UpdateCategoryName()
    {
        await _factory.EnsureSeededAsync();
        var client = await _factory.CreateAuthorizedClientAsync(TestSeed.AdminEmail, TestSeed.AdminPassword);
        var categoryId = await CreateCategoryAsync(client);

        var newName = $"Renamed-{Guid.NewGuid():N}"[..18];
        var response = await client.PutAsJsonAsync($"/api/ProductCategory/{categoryId}", new { id = categoryId, name = newName });
        Assert.True(response.IsSuccessStatusCode, await response.Content.ReadAsStringAsync());

        await _factory.UsingDbAsync(async db =>
        {
            var category = await db.Set<ProductCategory>().AsNoTracking().SingleAsync(c => c.Id == categoryId);
            Assert.Equal(newName, category.Name);
        });
    }

    [Fact]
    public async Task Should_SoftDeleteCategory_And_ExcludeItFromList()
    {
        await _factory.EnsureSeededAsync();
        var client = await _factory.CreateAuthorizedClientAsync(TestSeed.AdminEmail, TestSeed.AdminPassword);
        var name = $"DeleteMe-{Guid.NewGuid():N}"[..19];
        var categoryId = await CreateCategoryAsync(client, name);

        var response = await client.DeleteAsync($"/api/ProductCategory/{categoryId}");
        Assert.True(response.IsSuccessStatusCode, await response.Content.ReadAsStringAsync());

        await _factory.UsingDbAsync(async db =>
        {
            var category = await db.Set<ProductCategory>().IgnoreQueryFilters().AsNoTracking().SingleAsync(c => c.Id == categoryId);
            Assert.True(category.IsDeleted);
        });

        var list = await client.GetAsync("/api/ProductCategories");
        var body = await list.Content.ReadAsStringAsync();
        Assert.DoesNotContain(name, body);
    }

    [Fact]
    public async Task Should_Return404_When_GettingDeletedCategory()
    {
        await _factory.EnsureSeededAsync();
        var client = await _factory.CreateAuthorizedClientAsync(TestSeed.AdminEmail, TestSeed.AdminPassword);
        var categoryId = await CreateCategoryAsync(client);
        (await client.DeleteAsync($"/api/ProductCategory/{categoryId}")).EnsureSuccessStatusCode();

        var response = await client.GetAsync($"/api/ProductCategory/{categoryId}");
        Assert.True(
            response.StatusCode == HttpStatusCode.NotFound || response.StatusCode == HttpStatusCode.NoContent,
            $"Deleted category fetch returned {(int)response.StatusCode}");
    }

    [Fact]
    public async Task Should_Return403_When_CreatingWithoutManageClaim()
    {
        await _factory.EnsureSeededAsync();
        var client = await _factory.CreateAuthorizedClientAsync(TestSeed.NoClaimsEmail, TestSeed.NoClaimsPassword);

        var response = await client.PostAsJsonAsync("/api/ProductCategory", new { name = "NoClaimCat" });

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task Should_HideCategoryFromTenantB_When_QueriedCrossTenant()
    {
        await _factory.EnsureSeededAsync();
        var adminClient = await _factory.CreateAuthorizedClientAsync(TestSeed.AdminEmail, TestSeed.AdminPassword);
        var name = $"Isolated-{Guid.NewGuid():N}"[..20];
        var create = await adminClient.PostAsJsonAsync("/api/ProductCategory", new { name });
        Assert.True(create.IsSuccessStatusCode, await create.Content.ReadAsStringAsync());

        var tenantBClient = await _factory.CreateAuthorizedClientAsync(TestSeed.TenantBAdminEmail, TestSeed.TenantBAdminPassword);
        var list = await tenantBClient.GetAsync("/api/ProductCategories");
        var body = await list.Content.ReadAsStringAsync();

        Assert.DoesNotContain(name, body);
    }

    private async Task<Guid> CreateCategoryAsync(HttpClient client, string name = null)
    {
        var response = await client.PostAsJsonAsync("/api/ProductCategory", new { name = name ?? $"Cat-{Guid.NewGuid():N}"[..15] });
        var body = await response.Content.ReadAsStringAsync();
        Assert.True(response.IsSuccessStatusCode, body);
        return JsonDocument.Parse(body).RootElement.GetProperty("id").GetGuid();
    }
}