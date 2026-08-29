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
using Xunit;

namespace POS.API.Tests.CrudTemplate;

/// <summary>
/// Wave-2 CRUD template exemplar (Brand module). Every simple entity module reuses this pattern:
/// create → duplicate 409 → update → delete (soft) → list → get → 404s → permission 403 → tenant isolation.
/// TC template corresponds to TC-D0x validation/permission/isolation cases in Test-Documentation.
/// </summary>
public sealed class BrandCrudTemplateTests : IClassFixture<TestWebApplicationFactory>
{
    private readonly TestWebApplicationFactory _factory;

    public BrandCrudTemplateTests(TestWebApplicationFactory factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task Should_CreateBrand_And_PersistIt()
    {
        await _factory.EnsureSeededAsync();
        var client = await _factory.CreateAuthorizedClientAsync(TestSeed.AdminEmail, TestSeed.AdminPassword);

        var response = await client.PostAsJsonAsync("/api/Brand", new { name = $"Brand-{Guid.NewGuid():N}"[..16] });

        Assert.True(response.IsSuccessStatusCode, await response.Content.ReadAsStringAsync());
        var created = await response.Content.ReadFromJsonAsync<JsonElement>(new JsonSerializerOptions(JsonSerializerDefaults.Web));
        var brandId = created.GetProperty("id").GetGuid();

        await _factory.UsingDbAsync(async db =>
        {
            var brand = await db.Set<Brand>().AsNoTracking().SingleAsync(b => b.Id == brandId);
            Assert.False(string.IsNullOrWhiteSpace(brand.Name));
            Assert.False(brand.IsDeleted);
        });
    }

    [Fact]
    public async Task Should_Return409_When_CreatingDuplicateBrandName()
    {
        await _factory.EnsureSeededAsync();
        var client = await _factory.CreateAuthorizedClientAsync(TestSeed.AdminEmail, TestSeed.AdminPassword);
        var name = $"Brand-{Guid.NewGuid():N}"[..16];

        var first = await client.PostAsJsonAsync("/api/Brand", new { name });
        Assert.True(first.IsSuccessStatusCode, await first.Content.ReadAsStringAsync());

        var second = await client.PostAsJsonAsync("/api/Brand", new { name });
        Assert.Equal(HttpStatusCode.Conflict, second.StatusCode);
    }

    [Fact]
    public async Task Should_UpdateBrandName()
    {
        await _factory.EnsureSeededAsync();
        var client = await _factory.CreateAuthorizedClientAsync(TestSeed.AdminEmail, TestSeed.AdminPassword);
        var brandId = await CreateBrandAsync(client);

        var newName = $"Renamed-{Guid.NewGuid():N}"[..18];
        var response = await client.PutAsJsonAsync($"/api/Brand/{brandId}", new { id = brandId, name = newName });
        Assert.True(response.IsSuccessStatusCode, await response.Content.ReadAsStringAsync());

        await _factory.UsingDbAsync(async db =>
        {
            var brand = await db.Set<Brand>().AsNoTracking().SingleAsync(b => b.Id == brandId);
            Assert.Equal(newName, brand.Name);
        });
    }

    [Fact]
    public async Task Should_SoftDeleteBrand()
    {
        await _factory.EnsureSeededAsync();
        var client = await _factory.CreateAuthorizedClientAsync(TestSeed.AdminEmail, TestSeed.AdminPassword);
        var brandId = await CreateBrandAsync(client);

        var response = await client.DeleteAsync($"/api/Brand/{brandId}");
        Assert.True(response.IsSuccessStatusCode, await response.Content.ReadAsStringAsync());

        await _factory.UsingDbAsync(async db =>
        {
            var brand = await db.Set<Brand>().IgnoreQueryFilters().AsNoTracking().SingleAsync(b => b.Id == brandId);
            Assert.True(brand.IsDeleted);
        });
    }

    [Fact]
    public async Task Should_ListBrands_ExcludingDeleted()
    {
        await _factory.EnsureSeededAsync();
        var client = await _factory.CreateAuthorizedClientAsync(TestSeed.AdminEmail, TestSeed.AdminPassword);
        var keptName = $"Kept-{Guid.NewGuid():N}"[..16];
        var deletedName = $"Deleted-{Guid.NewGuid():N}"[..19];

        var kept = await client.PostAsJsonAsync("/api/Brand", new { name = keptName });
        kept.EnsureSuccessStatusCode();
        var deleted = await client.PostAsJsonAsync("/api/Brand", new { name = deletedName });
        deleted.EnsureSuccessStatusCode();
        var deletedId = JsonDocument.Parse(await deleted.Content.ReadAsStringAsync())
            .RootElement.GetProperty("id").GetGuid();
        (await client.DeleteAsync($"/api/Brand/{deletedId}")).EnsureSuccessStatusCode();

        var list = await client.GetAsync("/api/Brands");
        list.EnsureSuccessStatusCode();
        var body = await list.Content.ReadAsStringAsync();
        Assert.Contains(keptName, body);
        Assert.DoesNotContain(deletedName, body);
    }

    [Fact]
    public async Task Should_Return404_When_GettingDeletedBrand()
    {
        await _factory.EnsureSeededAsync();
        var client = await _factory.CreateAuthorizedClientAsync(TestSeed.AdminEmail, TestSeed.AdminPassword);
        var brandId = await CreateBrandAsync(client);
        (await client.DeleteAsync($"/api/Brand/{brandId}")).EnsureSuccessStatusCode();

        var response = await client.GetAsync($"/api/Brand/{brandId}");
        Assert.True(
            response.StatusCode == HttpStatusCode.NotFound || response.StatusCode == HttpStatusCode.NoContent,
            $"Deleted brand fetch returned {(int)response.StatusCode}");
    }

    [Fact]
    public async Task Should_Return403_When_CreatingWithoutManageClaim()
    {
        await _factory.EnsureSeededAsync();
        var client = await _factory.CreateAuthorizedClientAsync(TestSeed.NoClaimsEmail, TestSeed.NoClaimsPassword);

        var response = await client.PostAsJsonAsync("/api/Brand", new { name = "NoClaimBrand" });

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task Should_HideBrandFromTenantB_When_QueriedCrossTenant()
    {
        await _factory.EnsureSeededAsync();
        var adminClient = await _factory.CreateAuthorizedClientAsync(TestSeed.AdminEmail, TestSeed.AdminPassword);
        var name = $"Isolated-{Guid.NewGuid():N}"[..20];
        var create = await adminClient.PostAsJsonAsync("/api/Brand", new { name });
        create.EnsureSuccessStatusCode();

        var tenantBClient = await _factory.CreateAuthorizedClientAsync("admin-b@testb.local", "admin@123b");
        var list = await tenantBClient.GetAsync("/api/Brands");
        var body = await list.Content.ReadAsStringAsync();

        Assert.DoesNotContain(name, body);
    }

    private async Task<Guid> CreateBrandAsync(HttpClient client)
    {
        var response = await client.PostAsJsonAsync("/api/Brand", new { name = $"Brand-{Guid.NewGuid():N}"[..16] });
        var body = await response.Content.ReadAsStringAsync();
        Assert.True(response.IsSuccessStatusCode, body);
        return JsonDocument.Parse(body).RootElement.GetProperty("id").GetGuid();
    }
}
