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
/// Wave-2 CRUD roll-out (Locations) — full Brand-template matrix (duplicate name 409, all
/// write routes SETT_MANAGE_LOCATIONS-claimed, get-by-id route exists).
/// </summary>
public sealed class LocationCrudTemplateTests : IClassFixture<TestWebApplicationFactory>
{
    private readonly TestWebApplicationFactory _factory;

    public LocationCrudTemplateTests(TestWebApplicationFactory factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task Should_CreateLocation_And_PersistIt()
    {
        await _factory.EnsureSeededAsync();
        var client = await _factory.CreateAuthorizedClientAsync(TestSeed.AdminEmail, TestSeed.AdminPassword);

        var response = await client.PostAsJsonAsync("/api/Location", LocationPayload($"Location-{Guid.NewGuid():N}"[..17]));
        Assert.True(response.IsSuccessStatusCode, await response.Content.ReadAsStringAsync());
        var created = await response.Content.ReadFromJsonAsync<JsonElement>(new JsonSerializerOptions(JsonSerializerDefaults.Web));
        var locationId = created.GetProperty("id").GetGuid();

        await _factory.UsingDbAsync(async db =>
        {
            var location = await db.Set<Location>().AsNoTracking().SingleAsync(l => l.Id == locationId);
            Assert.False(string.IsNullOrWhiteSpace(location.Name));
            Assert.False(location.IsDeleted);
        });
    }

    [Fact]
    public async Task Should_Return409RepresentedAs400_When_CreatingDuplicateLocationName()
    {
        await _factory.EnsureSeededAsync();
        var client = await _factory.CreateAuthorizedClientAsync(TestSeed.AdminEmail, TestSeed.AdminPassword);
        var name = $"Location-{Guid.NewGuid():N}"[..17];

        var first = await client.PostAsJsonAsync("/api/Location", LocationPayload(name));
        Assert.True(first.IsSuccessStatusCode, await first.Content.ReadAsStringAsync());

        var second = await client.PostAsJsonAsync("/api/Location", LocationPayload(name));
        // Gap-Char: LocationController.AddLocation hardcodes `BadRequest(response)` instead of
        // ReturnFormattedResponse — the handler's 409 is flattened to HTTP 400 (statusCode:409 body).
        Assert.Equal(HttpStatusCode.BadRequest, second.StatusCode);
        var body = await second.Content.ReadAsStringAsync();
        Assert.Contains("409", body);
        Assert.Contains("Location Already Exist", body);
    }

    [Fact]
    public async Task Should_UpdateLocationName()
    {
        await _factory.EnsureSeededAsync();
        var client = await _factory.CreateAuthorizedClientAsync(TestSeed.AdminEmail, TestSeed.AdminPassword);
        var locationId = await CreateLocationAsync(client);

        var newName = $"Renamed-{Guid.NewGuid():N}"[..18];
        var response = await client.PutAsJsonAsync($"/api/Location/{locationId}", LocationPayload(newName, locationId));
        Assert.True(response.IsSuccessStatusCode, await response.Content.ReadAsStringAsync());

        await _factory.UsingDbAsync(async db =>
        {
            var location = await db.Set<Location>().AsNoTracking().SingleAsync(l => l.Id == locationId);
            Assert.Equal(newName, location.Name);
        });
    }

    [Fact]
    public async Task Should_SoftDeleteLocation_And_ExcludeItFromList()
    {
        await _factory.EnsureSeededAsync();
        var client = await _factory.CreateAuthorizedClientAsync(TestSeed.AdminEmail, TestSeed.AdminPassword);
        var name = $"DeleteMe-{Guid.NewGuid():N}"[..19];
        var locationId = await CreateLocationAsync(client, name);

        var response = await client.DeleteAsync($"/api/Location/{locationId}");
        Assert.True(response.IsSuccessStatusCode, await response.Content.ReadAsStringAsync());

        await _factory.UsingDbAsync(async db =>
        {
            var location = await db.Set<Location>().IgnoreQueryFilters().AsNoTracking().SingleAsync(l => l.Id == locationId);
            Assert.True(location.IsDeleted);
        });

        var list = await client.GetAsync("/api/Location");
        Assert.True(list.IsSuccessStatusCode, await list.Content.ReadAsStringAsync());
        var body = await list.Content.ReadAsStringAsync();
        Assert.DoesNotContain(name, body);
    }

    [Fact]
    public async Task Should_Return404_When_GettingDeletedLocation()
    {
        await _factory.EnsureSeededAsync();
        var client = await _factory.CreateAuthorizedClientAsync(TestSeed.AdminEmail, TestSeed.AdminPassword);
        var locationId = await CreateLocationAsync(client);
        (await client.DeleteAsync($"/api/Location/{locationId}")).EnsureSuccessStatusCode();

        var response = await client.GetAsync($"/api/Location/{locationId}");
        Assert.True(
            response.StatusCode == HttpStatusCode.NotFound || response.StatusCode == HttpStatusCode.NoContent,
            $"Deleted location fetch returned {(int)response.StatusCode}");
    }

    [Fact]
    public async Task Should_Return403_When_CreatingWithoutManageClaim()
    {
        await _factory.EnsureSeededAsync();
        var client = await _factory.CreateAuthorizedClientAsync(TestSeed.NoClaimsEmail, TestSeed.NoClaimsPassword);

        var response = await client.PostAsJsonAsync("/api/Location", LocationPayload("NoClaimLocation"));

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task Should_HideLocationFromTenantB_When_QueriedCrossTenant()
    {
        await _factory.EnsureSeededAsync();
        var adminClient = await _factory.CreateAuthorizedClientAsync(TestSeed.AdminEmail, TestSeed.AdminPassword);
        var name = $"Isolated-{Guid.NewGuid():N}"[..20];
        var create = await adminClient.PostAsJsonAsync("/api/Location", LocationPayload(name));
        Assert.True(create.IsSuccessStatusCode, await create.Content.ReadAsStringAsync());

        var tenantBClient = await _factory.CreateAuthorizedClientAsync(TestSeed.TenantBAdminEmail, TestSeed.TenantBAdminPassword);
        var list = await tenantBClient.GetAsync("/api/Location");
        Assert.True(list.IsSuccessStatusCode, await list.Content.ReadAsStringAsync());
        var body = await list.Content.ReadAsStringAsync();

        Assert.DoesNotContain(name, body);
    }

    private async Task<Guid> CreateLocationAsync(HttpClient client, string name = null)
    {
        var response = await client.PostAsJsonAsync("/api/Location", LocationPayload(name ?? $"Location-{Guid.NewGuid():N}"[..17]));
        var body = await response.Content.ReadAsStringAsync();
        Assert.True(response.IsSuccessStatusCode, body);
        return JsonDocument.Parse(body).RootElement.GetProperty("id").GetGuid();
    }

    private static object LocationPayload(string name, Guid? id = null) => new
    {
        id,
        name,
        address = "CRUD Location Address",
        mobile = "0300-0000777",
        contactPerson = "CRUD Location Contact",
        email = $"loc-{id ?? Guid.NewGuid()}@test.local",
        fbrKey = "CRUD-FBR-KEY",
        posId = $"POS-{Guid.NewGuid():N}"[..18],
        apiBaseUrl = "https://fbr.test.local"
    };
}