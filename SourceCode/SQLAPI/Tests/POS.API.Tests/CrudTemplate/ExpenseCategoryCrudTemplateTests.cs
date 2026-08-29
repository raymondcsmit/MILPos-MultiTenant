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
/// Wave-2 CRUD roll-out (Expense Categories) — full Brand-template matrix. Duplicate name 409,
/// all write routes EXP_MANAGE_EXP_CATEGORY-claimed, get-by-id route exists.
/// </summary>
public sealed class ExpenseCategoryCrudTemplateTests : IClassFixture<TestWebApplicationFactory>
{
    private readonly TestWebApplicationFactory _factory;

    public ExpenseCategoryCrudTemplateTests(TestWebApplicationFactory factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task Should_CreateExpenseCategory_And_PersistIt()
    {
        await _factory.EnsureSeededAsync();
        var client = await _factory.CreateAuthorizedClientAsync(TestSeed.AdminEmail, TestSeed.AdminPassword);

        var response = await client.PostAsJsonAsync("/api/ExpenseCategory", new { name = $"ExpCat-{Guid.NewGuid():N}"[..16] });
        Assert.True(response.IsSuccessStatusCode, await response.Content.ReadAsStringAsync());
        var created = await response.Content.ReadFromJsonAsync<JsonElement>(new JsonSerializerOptions(JsonSerializerDefaults.Web));
        var categoryId = created.GetProperty("id").GetGuid();

        await _factory.UsingDbAsync(async db =>
        {
            var category = await db.Set<ExpenseCategory>().AsNoTracking().SingleAsync(c => c.Id == categoryId);
            Assert.False(string.IsNullOrWhiteSpace(category.Name));
            Assert.False(category.IsDeleted);
        });
    }

    [Fact]
    public async Task Should_Return409_When_CreatingDuplicateExpenseCategoryName()
    {
        await _factory.EnsureSeededAsync();
        var client = await _factory.CreateAuthorizedClientAsync(TestSeed.AdminEmail, TestSeed.AdminPassword);
        var name = $"ExpCat-{Guid.NewGuid():N}"[..16];

        var first = await client.PostAsJsonAsync("/api/ExpenseCategory", new { name });
        Assert.True(first.IsSuccessStatusCode, await first.Content.ReadAsStringAsync());

        var second = await client.PostAsJsonAsync("/api/ExpenseCategory", new { name });
        Assert.Equal(HttpStatusCode.Conflict, second.StatusCode);
    }

    [Fact]
    public async Task Should_UpdateExpenseCategoryName()
    {
        await _factory.EnsureSeededAsync();
        var client = await _factory.CreateAuthorizedClientAsync(TestSeed.AdminEmail, TestSeed.AdminPassword);
        var categoryId = await CreateExpenseCategoryAsync(client);

        var newName = $"Renamed-{Guid.NewGuid():N}"[..18];
        var response = await client.PutAsJsonAsync($"/api/ExpenseCategory/{categoryId}", new { id = categoryId, name = newName });
        Assert.True(response.IsSuccessStatusCode, await response.Content.ReadAsStringAsync());

        await _factory.UsingDbAsync(async db =>
        {
            var category = await db.Set<ExpenseCategory>().AsNoTracking().SingleAsync(c => c.Id == categoryId);
            Assert.Equal(newName, category.Name);
        });
    }

    [Fact]
    public async Task Should_SoftDeleteExpenseCategory_And_ExcludeItFromList()
    {
        await _factory.EnsureSeededAsync();
        var client = await _factory.CreateAuthorizedClientAsync(TestSeed.AdminEmail, TestSeed.AdminPassword);
        var name = $"DeleteMe-{Guid.NewGuid():N}"[..19];
        var categoryId = await CreateExpenseCategoryAsync(client, name);

        var response = await client.DeleteAsync($"/api/ExpenseCategory/{categoryId}");
        Assert.True(response.IsSuccessStatusCode, await response.Content.ReadAsStringAsync());

        await _factory.UsingDbAsync(async db =>
        {
            var category = await db.Set<ExpenseCategory>().IgnoreQueryFilters().AsNoTracking().SingleAsync(c => c.Id == categoryId);
            Assert.True(category.IsDeleted);
        });

        var list = await client.GetAsync("/api/ExpenseCategories");
        var body = await list.Content.ReadAsStringAsync();
        Assert.DoesNotContain(name, body);
    }

    [Fact]
    public async Task Should_Return404_When_GettingDeletedExpenseCategory()
    {
        await _factory.EnsureSeededAsync();
        var client = await _factory.CreateAuthorizedClientAsync(TestSeed.AdminEmail, TestSeed.AdminPassword);
        var categoryId = await CreateExpenseCategoryAsync(client);
        (await client.DeleteAsync($"/api/ExpenseCategory/{categoryId}")).EnsureSuccessStatusCode();

        var response = await client.GetAsync($"/api/ExpenseCategory/{categoryId}");
        Assert.True(
            response.StatusCode == HttpStatusCode.NotFound || response.StatusCode == HttpStatusCode.NoContent,
            $"Deleted expense category fetch returned {(int)response.StatusCode}");
    }

    [Fact]
    public async Task Should_Return403_When_CreatingWithoutManageClaim()
    {
        await _factory.EnsureSeededAsync();
        var client = await _factory.CreateAuthorizedClientAsync(TestSeed.NoClaimsEmail, TestSeed.NoClaimsPassword);

        var response = await client.PostAsJsonAsync("/api/ExpenseCategory", new { name = "NoClaimExpCat" });

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task Should_HideExpenseCategoryFromTenantB_When_QueriedCrossTenant()
    {
        await _factory.EnsureSeededAsync();
        var adminClient = await _factory.CreateAuthorizedClientAsync(TestSeed.AdminEmail, TestSeed.AdminPassword);
        var name = $"Isolated-{Guid.NewGuid():N}"[..20];
        var create = await adminClient.PostAsJsonAsync("/api/ExpenseCategory", new { name });
        Assert.True(create.IsSuccessStatusCode, await create.Content.ReadAsStringAsync());

        var tenantBClient = await _factory.CreateAuthorizedClientAsync(TestSeed.TenantBAdminEmail, TestSeed.TenantBAdminPassword);
        var list = await tenantBClient.GetAsync("/api/ExpenseCategories");
        var body = await list.Content.ReadAsStringAsync();

        Assert.DoesNotContain(name, body);
    }

    private async Task<Guid> CreateExpenseCategoryAsync(HttpClient client, string name = null)
    {
        var response = await client.PostAsJsonAsync("/api/ExpenseCategory", new { name = name ?? $"ExpCat-{Guid.NewGuid():N}"[..16] });
        var body = await response.Content.ReadAsStringAsync();
        Assert.True(response.IsSuccessStatusCode, body);
        return JsonDocument.Parse(body).RootElement.GetProperty("id").GetGuid();
    }
}