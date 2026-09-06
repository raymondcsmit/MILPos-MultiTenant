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
/// Wave-2 CRUD roll-out (Customers) — full Brand-template matrix, adapted to the customer
/// contract: duplicate name returns 422 (matches Supplier, diverges from Brand/Unit/Category's 409).
/// Customer has no non-nullable address FKs (unlike Supplier), so create/update payloads are plain.
/// </summary>
public sealed class CustomerCrudTemplateTests : IClassFixture<TestWebApplicationFactory>
{
    private readonly TestWebApplicationFactory _factory;

    public CustomerCrudTemplateTests(TestWebApplicationFactory factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task Should_CreateCustomer_And_PersistIt()
    {
        await _factory.EnsureSeededAsync();
        var client = await _factory.CreateAuthorizedClientAsync(TestSeed.AdminEmail, TestSeed.AdminPassword);

        var response = await client.PostAsJsonAsync("/api/Customer", CustomerPayload($"Customer-{Guid.NewGuid():N}"[..18]));
        Assert.True(response.IsSuccessStatusCode, await response.Content.ReadAsStringAsync());
        var created = await response.Content.ReadFromJsonAsync<JsonElement>(new JsonSerializerOptions(JsonSerializerDefaults.Web));
        var customerId = created.GetProperty("id").GetGuid();

        await _factory.UsingDbAsync(async db =>
        {
            var customer = await db.Set<Customer>().AsNoTracking().SingleAsync(c => c.Id == customerId);
            Assert.False(string.IsNullOrWhiteSpace(customer.CustomerName));
            Assert.False(customer.IsDeleted);
        });
    }

    [Fact]
    public async Task Should_Return422_When_CreatingDuplicateCustomerName()
    {
        await _factory.EnsureSeededAsync();
        var client = await _factory.CreateAuthorizedClientAsync(TestSeed.AdminEmail, TestSeed.AdminPassword);
        var name = $"Customer-{Guid.NewGuid():N}"[..18];

        var first = await client.PostAsJsonAsync("/api/Customer", CustomerPayload(name));
        Assert.True(first.IsSuccessStatusCode, await first.Content.ReadAsStringAsync());

        var second = await client.PostAsJsonAsync("/api/Customer", CustomerPayload(name));
        Assert.Equal(HttpStatusCode.UnprocessableEntity, second.StatusCode);
    }

    [Fact]
    public async Task Should_Return422_When_CreatingSecondCustomerWithSameMobile_GapTargetFixed()
    {
        await _factory.EnsureSeededAsync();
        var client = await _factory.CreateAuthorizedClientAsync(TestSeed.AdminEmail, TestSeed.AdminPassword);

        // Gap-Target [N-29] FIXED: duplicate mobile number returns 422 UnprocessableEntity instead of generic 500.
        var mobile = "0300-" + Guid.NewGuid().ToString("N")[..8];
        var first = await client.PostAsJsonAsync("/api/Customer", CustomerPayload($"Customer-{Guid.NewGuid():N}"[..18], null, mobile));
        Assert.True(first.IsSuccessStatusCode, await first.Content.ReadAsStringAsync());

        var second = await client.PostAsJsonAsync("/api/Customer", CustomerPayload($"Another-{Guid.NewGuid():N}"[..18], null, mobile));
        Assert.Equal(HttpStatusCode.UnprocessableEntity, second.StatusCode);
    }

    [Fact]
    public async Task Should_UpdateCustomerName()
    {
        await _factory.EnsureSeededAsync();
        var client = await _factory.CreateAuthorizedClientAsync(TestSeed.AdminEmail, TestSeed.AdminPassword);
        var customerId = await CreateCustomerAsync(client);

        var newName = $"Renamed-{Guid.NewGuid():N}"[..18];
        var response = await client.PutAsJsonAsync($"/api/Customer/{customerId}", CustomerPayload(newName, customerId));
        Assert.True(response.IsSuccessStatusCode, await response.Content.ReadAsStringAsync());

        await _factory.UsingDbAsync(async db =>
        {
            var customer = await db.Set<Customer>().AsNoTracking().SingleAsync(c => c.Id == customerId);
            Assert.Equal(newName, customer.CustomerName);
        });
    }

    [Fact]
    public async Task Should_SoftDeleteCustomer_And_ExcludeItFromList()
    {
        await _factory.EnsureSeededAsync();
        var client = await _factory.CreateAuthorizedClientAsync(TestSeed.AdminEmail, TestSeed.AdminPassword);
        var name = $"DeleteMe-{Guid.NewGuid():N}"[..19];
        var customerId = await CreateCustomerAsync(client, name);

        var response = await client.DeleteAsync($"/api/Customer/{customerId}");
        Assert.True(response.IsSuccessStatusCode, await response.Content.ReadAsStringAsync());

        await _factory.UsingDbAsync(async db =>
        {
            var customer = await db.Set<Customer>().IgnoreQueryFilters().AsNoTracking().SingleAsync(c => c.Id == customerId);
            Assert.True(customer.IsDeleted);
        });

        var list = await client.GetAsync("/api/Customer");
        Assert.True(list.IsSuccessStatusCode, await list.Content.ReadAsStringAsync());
        var body = await list.Content.ReadAsStringAsync();
        Assert.DoesNotContain(name, body);
    }

    [Fact]
    public async Task Should_Return404_When_GettingDeletedCustomer()
    {
        await _factory.EnsureSeededAsync();
        var client = await _factory.CreateAuthorizedClientAsync(TestSeed.AdminEmail, TestSeed.AdminPassword);
        var customerId = await CreateCustomerAsync(client);
        (await client.DeleteAsync($"/api/Customer/{customerId}")).EnsureSuccessStatusCode();

        var response = await client.GetAsync($"/api/Customer/{customerId}");
        Assert.True(
            response.StatusCode == HttpStatusCode.NotFound || response.StatusCode == HttpStatusCode.NoContent,
            $"Deleted customer fetch returned {(int)response.StatusCode}");
    }

    [Fact]
    public async Task Should_Return403_When_CreatingWithoutAddClaim()
    {
        await _factory.EnsureSeededAsync();
        var client = await _factory.CreateAuthorizedClientAsync(TestSeed.NoClaimsEmail, TestSeed.NoClaimsPassword);

        var response = await client.PostAsJsonAsync("/api/Customer", CustomerPayload("NoClaimCustomer"));

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task Should_HideCustomerFromTenantB_When_QueriedCrossTenant()
    {
        await _factory.EnsureSeededAsync();
        var adminClient = await _factory.CreateAuthorizedClientAsync(TestSeed.AdminEmail, TestSeed.AdminPassword);
        var name = $"Isolated-{Guid.NewGuid():N}"[..20];
        var create = await adminClient.PostAsJsonAsync("/api/Customer", CustomerPayload(name));
        Assert.True(create.IsSuccessStatusCode, await create.Content.ReadAsStringAsync());

        var tenantBClient = await _factory.CreateAuthorizedClientAsync(TestSeed.TenantBAdminEmail, TestSeed.TenantBAdminPassword);
        var list = await tenantBClient.GetAsync("/api/Customer");
        Assert.True(list.IsSuccessStatusCode, await list.Content.ReadAsStringAsync());
        var body = await list.Content.ReadAsStringAsync();

        Assert.DoesNotContain(name, body);
    }

    private async Task<Guid> CreateCustomerAsync(HttpClient client, string name = null)
    {
        var response = await client.PostAsJsonAsync("/api/Customer", CustomerPayload(name ?? $"Customer-{Guid.NewGuid():N}"[..18]));
        var body = await response.Content.ReadAsStringAsync();
        Assert.True(response.IsSuccessStatusCode, body);
        return JsonDocument.Parse(body).RootElement.GetProperty("id").GetGuid();
    }

    private static object CustomerPayload(string name, Guid? id = null, string mobile = null) => new
    {
        id,
        customerName = name,
        contactPerson = "CRUD Contact",
        mobileNo = mobile ?? "0300-" + Guid.NewGuid().ToString("N")[..8],
        email = $"crud-customer-{id ?? Guid.NewGuid()}@test.local"
    };
}