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
/// Wave-2 CRUD roll-out (Units) — same matrix as the Brand exemplar, adapted to the
/// UnitConversation controller contract (no get-by-id endpoint: soft-delete visibility is
/// asserted via the list instead).
/// </summary>
public sealed class UnitConversationCrudTemplateTests : IClassFixture<TestWebApplicationFactory>
{
    private readonly TestWebApplicationFactory _factory;

    public UnitConversationCrudTemplateTests(TestWebApplicationFactory factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task Should_CreateUnit_And_PersistIt()
    {
        await _factory.EnsureSeededAsync();
        var client = await _factory.CreateAuthorizedClientAsync(TestSeed.AdminEmail, TestSeed.AdminPassword);

        var response = await client.PostAsJsonAsync("/api/UnitConversation", new { name = $"Unit-{Guid.NewGuid():N}"[..14], code = $"U{Guid.NewGuid():N}"[..4] });

        Assert.True(response.IsSuccessStatusCode, await response.Content.ReadAsStringAsync());
        var created = await response.Content.ReadFromJsonAsync<JsonElement>(new JsonSerializerOptions(JsonSerializerDefaults.Web));
        var unitId = created.GetProperty("id").GetGuid();

        await _factory.UsingDbAsync(async db =>
        {
            var unit = await db.Set<UnitConversation>().AsNoTracking().SingleAsync(u => u.Id == unitId);
            Assert.False(string.IsNullOrWhiteSpace(unit.Name));
            Assert.False(unit.IsDeleted);
        });
    }

    [Fact]
    public async Task Should_Return409_When_CreatingDuplicateUnitName()
    {
        await _factory.EnsureSeededAsync();
        var client = await _factory.CreateAuthorizedClientAsync(TestSeed.AdminEmail, TestSeed.AdminPassword);
        var name = $"Unit-{Guid.NewGuid():N}"[..14];

        var first = await client.PostAsJsonAsync("/api/UnitConversation", new { name, code = "U1" });
        Assert.True(first.IsSuccessStatusCode, await first.Content.ReadAsStringAsync());

        var second = await client.PostAsJsonAsync("/api/UnitConversation", new { name, code = "U2" });
        Assert.Equal(HttpStatusCode.Conflict, second.StatusCode);
    }

    [Fact]
    public async Task Should_UpdateUnitName()
    {
        await _factory.EnsureSeededAsync();
        var client = await _factory.CreateAuthorizedClientAsync(TestSeed.AdminEmail, TestSeed.AdminPassword);
        var unitId = await CreateUnitAsync(client);

        var newName = $"Renamed-{Guid.NewGuid():N}"[..18];
        var response = await client.PutAsJsonAsync($"/api/UnitConversation/{unitId}", new { id = unitId, name = newName, code = "RN" });
        Assert.True(response.IsSuccessStatusCode, await response.Content.ReadAsStringAsync());

        await _factory.UsingDbAsync(async db =>
        {
            var unit = await db.Set<UnitConversation>().AsNoTracking().SingleAsync(u => u.Id == unitId);
            Assert.Equal(newName, unit.Name);
        });
    }

    [Fact]
    public async Task Should_SoftDeleteUnit_And_ExcludeItFromList()
    {
        await _factory.EnsureSeededAsync();
        var client = await _factory.CreateAuthorizedClientAsync(TestSeed.AdminEmail, TestSeed.AdminPassword);
        var name = $"DeleteMe-{Guid.NewGuid():N}"[..19];
        var unitId = await CreateUnitAsync(client, name);

        var response = await client.DeleteAsync($"/api/UnitConversation/{unitId}");
        Assert.True(response.IsSuccessStatusCode, await response.Content.ReadAsStringAsync());

        await _factory.UsingDbAsync(async db =>
        {
            var unit = await db.Set<UnitConversation>().IgnoreQueryFilters().AsNoTracking().SingleAsync(u => u.Id == unitId);
            Assert.True(unit.IsDeleted);
        });

        var list = await client.GetAsync("/api/UnitConversations");
        var body = await list.Content.ReadAsStringAsync();
        Assert.DoesNotContain(name, body);
    }

    [Fact]
    public async Task Should_Return403_When_CreatingWithoutManageClaim()
    {
        await _factory.EnsureSeededAsync();
        var client = await _factory.CreateAuthorizedClientAsync(TestSeed.NoClaimsEmail, TestSeed.NoClaimsPassword);

        var response = await client.PostAsJsonAsync("/api/UnitConversation", new { name = "NoClaimUnit", code = "NC" });

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task Should_HideUnitFromTenantB_When_QueriedCrossTenant()
    {
        await _factory.EnsureSeededAsync();
        var adminClient = await _factory.CreateAuthorizedClientAsync(TestSeed.AdminEmail, TestSeed.AdminPassword);
        var name = $"Isolated-{Guid.NewGuid():N}"[..20];
        var create = await adminClient.PostAsJsonAsync("/api/UnitConversation", new { name, code = "ISO" });
        Assert.True(create.IsSuccessStatusCode, await create.Content.ReadAsStringAsync());

        var tenantBClient = await _factory.CreateAuthorizedClientAsync(TestSeed.TenantBAdminEmail, TestSeed.TenantBAdminPassword);
        var list = await tenantBClient.GetAsync("/api/UnitConversations");
        var body = await list.Content.ReadAsStringAsync();

        Assert.DoesNotContain(name, body);
    }

    private async Task<Guid> CreateUnitAsync(HttpClient client, string name = null)
    {
        var payload = name == null
            ? (object)new { name = $"Unit-{Guid.NewGuid():N}"[..14], code = $"U{Guid.NewGuid():N}"[..4] }
            : new { name, code = "CD" };
        var response = await client.PostAsJsonAsync("/api/UnitConversation", payload);
        var body = await response.Content.ReadAsStringAsync();
        Assert.True(response.IsSuccessStatusCode, body);
        return JsonDocument.Parse(body).RootElement.GetProperty("id").GetGuid();
    }
}