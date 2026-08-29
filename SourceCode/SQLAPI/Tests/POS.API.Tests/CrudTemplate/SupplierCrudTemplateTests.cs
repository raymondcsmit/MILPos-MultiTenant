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
/// Wave-2 CRUD roll-out (Suppliers) — full Brand-template matrix, adapted to the supplier
/// contract: duplicate name returns 422 (all other CRUD modules use 409), the create/update
/// payloads must carry the non-nullable Billing/ShippingAddressId FKs, and the list route is
/// SUPP_VIEW_SUPPLIERS-claimed.
/// </summary>
public sealed class SupplierCrudTemplateTests : IClassFixture<TestWebApplicationFactory>
{
    private readonly TestWebApplicationFactory _factory;

    public SupplierCrudTemplateTests(TestWebApplicationFactory factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task Should_CreateSupplier_And_PersistIt()
    {
        await _factory.EnsureSeededAsync();
        var client = await _factory.CreateAuthorizedClientAsync(TestSeed.AdminEmail, TestSeed.AdminPassword);

        var response = await client.PostAsJsonAsync("/api/Supplier", SupplierPayload($"Supplier-{Guid.NewGuid():N}"[..18]));
        Assert.True(response.IsSuccessStatusCode, await response.Content.ReadAsStringAsync());
        var created = await response.Content.ReadFromJsonAsync<JsonElement>(new JsonSerializerOptions(JsonSerializerDefaults.Web));
        var supplierId = created.GetProperty("id").GetGuid();

        await _factory.UsingDbAsync(async db =>
        {
            var supplier = await db.Set<Supplier>().AsNoTracking().SingleAsync(s => s.Id == supplierId);
            Assert.False(string.IsNullOrWhiteSpace(supplier.SupplierName));
            Assert.False(supplier.IsDeleted);
        });
    }

    [Fact]
    public async Task Should_Return422_When_CreatingDuplicateSupplierName()
    {
        await _factory.EnsureSeededAsync();
        var client = await _factory.CreateAuthorizedClientAsync(TestSeed.AdminEmail, TestSeed.AdminPassword);
        var name = $"Supplier-{Guid.NewGuid():N}"[..18];

        var first = await client.PostAsJsonAsync("/api/Supplier", SupplierPayload(name));
        Assert.True(first.IsSuccessStatusCode, await first.Content.ReadAsStringAsync());

        var second = await client.PostAsJsonAsync("/api/Supplier", SupplierPayload(name));
        Assert.Equal(HttpStatusCode.UnprocessableEntity, second.StatusCode);
    }

    [Fact]
    public async Task Should_UpdateSupplierName()
    {
        await _factory.EnsureSeededAsync();
        var client = await _factory.CreateAuthorizedClientAsync(TestSeed.AdminEmail, TestSeed.AdminPassword);
        var supplierId = await CreateSupplierAsync(client);

        var newName = $"Renamed-{Guid.NewGuid():N}"[..18];
        var response = await client.PutAsJsonAsync($"/api/Supplier/{supplierId}", SupplierPayload(newName, supplierId));
        Assert.True(response.IsSuccessStatusCode, await response.Content.ReadAsStringAsync());

        await _factory.UsingDbAsync(async db =>
        {
            var supplier = await db.Set<Supplier>().AsNoTracking().SingleAsync(s => s.Id == supplierId);
            Assert.Equal(newName, supplier.SupplierName);
        });
    }

    [Fact]
    public async Task Should_UpdateToDuplicateName_Return422()
    {
        await _factory.EnsureSeededAsync();
        var client = await _factory.CreateAuthorizedClientAsync(TestSeed.AdminEmail, TestSeed.AdminPassword);
        var nameA = $"Supplier-{Guid.NewGuid():N}"[..18];
        var otherId = await CreateSupplierAsync(client, nameA);

        var supplierId = await CreateSupplierAsync(client);
        var response = await client.PutAsJsonAsync($"/api/Supplier/{supplierId}", SupplierPayload(nameA, supplierId));

        Assert.Equal(HttpStatusCode.UnprocessableEntity, response.StatusCode);
        Assert.NotEqual(supplierId, otherId);
    }

    [Fact]
    public async Task Should_SoftDeleteSupplier_And_ExcludeItFromList()
    {
        await _factory.EnsureSeededAsync();
        var client = await _factory.CreateAuthorizedClientAsync(TestSeed.AdminEmail, TestSeed.AdminPassword);
        var name = $"DeleteMe-{Guid.NewGuid():N}"[..19];
        var supplierId = await CreateSupplierAsync(client, name);

        var response = await client.DeleteAsync($"/api/Supplier/{supplierId}");
        Assert.True(response.IsSuccessStatusCode, await response.Content.ReadAsStringAsync());

        await _factory.UsingDbAsync(async db =>
        {
            var supplier = await db.Set<Supplier>().IgnoreQueryFilters().AsNoTracking().SingleAsync(s => s.Id == supplierId);
            Assert.True(supplier.IsDeleted);
        });

        var list = await client.GetAsync("/api/Supplier");
        Assert.True(list.IsSuccessStatusCode, await list.Content.ReadAsStringAsync());
        var body = await list.Content.ReadAsStringAsync();
        Assert.DoesNotContain(name, body);
    }

    [Fact]
    public async Task Should_Return404_When_GettingDeletedSupplier()
    {
        await _factory.EnsureSeededAsync();
        var client = await _factory.CreateAuthorizedClientAsync(TestSeed.AdminEmail, TestSeed.AdminPassword);
        var supplierId = await CreateSupplierAsync(client);
        (await client.DeleteAsync($"/api/Supplier/{supplierId}")).EnsureSuccessStatusCode();

        var response = await client.GetAsync($"/api/Supplier/{supplierId}");
        Assert.True(
            response.StatusCode == HttpStatusCode.NotFound || response.StatusCode == HttpStatusCode.NoContent,
            $"Deleted supplier fetch returned {(int)response.StatusCode}");
    }

    [Fact]
    public async Task Should_Return403_When_CreatingWithoutAddClaim()
    {
        await _factory.EnsureSeededAsync();
        var client = await _factory.CreateAuthorizedClientAsync(TestSeed.NoClaimsEmail, TestSeed.NoClaimsPassword);

        var response = await client.PostAsJsonAsync("/api/Supplier", SupplierPayload("NoClaimSupplier"));

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task Should_HideSupplierFromTenantB_When_QueriedCrossTenant()
    {
        await _factory.EnsureSeededAsync();
        var adminClient = await _factory.CreateAuthorizedClientAsync(TestSeed.AdminEmail, TestSeed.AdminPassword);
        var name = $"Isolated-{Guid.NewGuid():N}"[..20];
        var create = await adminClient.PostAsJsonAsync("/api/Supplier", SupplierPayload(name));
        Assert.True(create.IsSuccessStatusCode, await create.Content.ReadAsStringAsync());

        var tenantBClient = await _factory.CreateAuthorizedClientAsync(TestSeed.TenantBAdminEmail, TestSeed.TenantBAdminPassword);
        var list = await tenantBClient.GetAsync("/api/Supplier");
        Assert.True(list.IsSuccessStatusCode, await list.Content.ReadAsStringAsync());
        var body = await list.Content.ReadAsStringAsync();

        Assert.DoesNotContain(name, body);
    }

    private async Task<Guid> CreateSupplierAsync(HttpClient client, string name = null)
    {
        var response = await client.PostAsJsonAsync("/api/Supplier", SupplierPayload(name ?? $"Supplier-{Guid.NewGuid():N}"[..18]));
        var body = await response.Content.ReadAsStringAsync();
        Assert.True(response.IsSuccessStatusCode, body);
        return JsonDocument.Parse(body).RootElement.GetProperty("id").GetGuid();
    }

    /// <summary>Supplier create/update both require the non-nullable address FKs.</summary>
    private static object SupplierPayload(string name, Guid? id = null) => new
    {
        id,
        supplierName = name,
        contactPerson = "CRUD Test Contact",
        mobileNo = "0300-0000999",
        email = $"crud-{id ?? Guid.NewGuid()}@test.local",
        billingAddressId = TestIds.SupplierS1AddressId,
        shippingAddressId = TestIds.SupplierS1AddressId
    };
}