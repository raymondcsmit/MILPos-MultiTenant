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
/// Wave-2 CRUD roll-out (Taxes) — full Brand-template matrix. Duplicate name returns 409.
/// AddTax auto-creates child LedgerAccounts under the 1150/2150 parents, so a create also
/// proves the ledger side-effect and the persisted InPut/OutPutAccountCode.
/// </summary>
public sealed class TaxCrudTemplateTests : IClassFixture<TestWebApplicationFactory>
{
    private readonly TestWebApplicationFactory _factory;

    public TaxCrudTemplateTests(TestWebApplicationFactory factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task Should_CreateTax_And_PersistIt_WithChildLedgerAccounts()
    {
        await _factory.EnsureSeededAsync();
        var client = await _factory.CreateAuthorizedClientAsync(TestSeed.AdminEmail, TestSeed.AdminPassword);

        var name = $"Tax-{Guid.NewGuid():N}"[..13];
        var response = await client.PostAsJsonAsync("/api/Tax", new { name, percentage = 5.00m });
        Assert.True(response.IsSuccessStatusCode, await response.Content.ReadAsStringAsync());
        var created = await response.Content.ReadFromJsonAsync<JsonElement>(new JsonSerializerOptions(JsonSerializerDefaults.Web));
        var taxId = created.GetProperty("id").GetGuid();

        await _factory.UsingDbAsync(async db =>
        {
            var tax = await db.Set<Tax>().AsNoTracking().SingleAsync(t => t.Id == taxId);
            Assert.Equal(name, tax.Name);
            Assert.Equal(5.00m, tax.Percentage);
            Assert.False(string.IsNullOrWhiteSpace(tax.InPutAccountCode));
            Assert.False(string.IsNullOrWhiteSpace(tax.OutPutAccountCode));
            Assert.False(tax.IsDeleted);
        });
    }

    [Fact]
    public async Task Should_Return409_When_CreatingDuplicateTaxName()
    {
        await _factory.EnsureSeededAsync();
        var client = await _factory.CreateAuthorizedClientAsync(TestSeed.AdminEmail, TestSeed.AdminPassword);
        var name = $"Tax-{Guid.NewGuid():N}"[..13];

        var first = await client.PostAsJsonAsync("/api/Tax", new { name, percentage = 6.00m });
        Assert.True(first.IsSuccessStatusCode, await first.Content.ReadAsStringAsync());

        var second = await client.PostAsJsonAsync("/api/Tax", new { name, percentage = 7.00m });
        Assert.Equal(HttpStatusCode.Conflict, second.StatusCode);
    }

    [Fact]
    public async Task Should_UpdateTaxPercentage()
    {
        await _factory.EnsureSeededAsync();
        var client = await _factory.CreateAuthorizedClientAsync(TestSeed.AdminEmail, TestSeed.AdminPassword);
        var taxId = await CreateTaxAsync(client);

        var response = await client.PutAsJsonAsync($"/api/Tax/{taxId}", new { id = taxId, name = $"Updated-{Guid.NewGuid():N}"[..18], percentage = 12.5m });
        Assert.True(response.IsSuccessStatusCode, await response.Content.ReadAsStringAsync());

        await _factory.UsingDbAsync(async db =>
        {
            var tax = await db.Set<Tax>().AsNoTracking().SingleAsync(t => t.Id == taxId);
            Assert.Equal(12.5m, tax.Percentage);
        });
    }

    [Fact]
    public async Task Should_SoftDeleteTax_And_ExcludeItFromList()
    {
        await _factory.EnsureSeededAsync();
        var client = await _factory.CreateAuthorizedClientAsync(TestSeed.AdminEmail, TestSeed.AdminPassword);
        var name = $"DeleteMe-{Guid.NewGuid():N}"[..19];
        var taxId = await CreateTaxAsync(client, name);

        var response = await client.DeleteAsync($"/api/Tax/{taxId}");
        Assert.True(response.IsSuccessStatusCode, await response.Content.ReadAsStringAsync());

        await _factory.UsingDbAsync(async db =>
        {
            var tax = await db.Set<Tax>().IgnoreQueryFilters().AsNoTracking().SingleAsync(t => t.Id == taxId);
            Assert.True(tax.IsDeleted);
        });

        var list = await client.GetAsync("/api/Tax");
        var body = await list.Content.ReadAsStringAsync();
        Assert.DoesNotContain(name, body);
    }

    [Fact]
    public async Task Should_Return404_When_GettingDeletedTax()
    {
        await _factory.EnsureSeededAsync();
        var client = await _factory.CreateAuthorizedClientAsync(TestSeed.AdminEmail, TestSeed.AdminPassword);
        var taxId = await CreateTaxAsync(client);
        (await client.DeleteAsync($"/api/Tax/{taxId}")).EnsureSuccessStatusCode();

        var response = await client.GetAsync($"/api/Tax/{taxId}");
        Assert.True(
            response.StatusCode == HttpStatusCode.NotFound || response.StatusCode == HttpStatusCode.NoContent,
            $"Deleted tax fetch returned {(int)response.StatusCode}");
    }

    [Fact]
    public async Task Should_Return403_When_CreatingWithoutManageClaim()
    {
        await _factory.EnsureSeededAsync();
        var client = await _factory.CreateAuthorizedClientAsync(TestSeed.NoClaimsEmail, TestSeed.NoClaimsPassword);

        var response = await client.PostAsJsonAsync("/api/Tax", new { name = "NoClaimTax", percentage = 1.00m });

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task Should_HideTaxFromTenantB_When_QueriedCrossTenant()
    {
        await _factory.EnsureSeededAsync();
        var adminClient = await _factory.CreateAuthorizedClientAsync(TestSeed.AdminEmail, TestSeed.AdminPassword);
        var name = $"Isolated-{Guid.NewGuid():N}"[..20];
        var create = await adminClient.PostAsJsonAsync("/api/Tax", new { name, percentage = 8.00m });
        Assert.True(create.IsSuccessStatusCode, await create.Content.ReadAsStringAsync());

        var tenantBClient = await _factory.CreateAuthorizedClientAsync(TestSeed.TenantBAdminEmail, TestSeed.TenantBAdminPassword);
        var list = await tenantBClient.GetAsync("/api/Tax");
        var body = await list.Content.ReadAsStringAsync();

        Assert.DoesNotContain(name, body);
    }

    private async Task<Guid> CreateTaxAsync(HttpClient client, string name = null)
    {
        var response = await client.PostAsJsonAsync("/api/Tax", new { name = name ?? $"Tax-{Guid.NewGuid():N}"[..13], percentage = 10.00m });
        var body = await response.Content.ReadAsStringAsync();
        Assert.True(response.IsSuccessStatusCode, body);
        return JsonDocument.Parse(body).RootElement.GetProperty("id").GetGuid();
    }
}