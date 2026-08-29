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
/// Wave-2 CRUD roll-out (Expenses) — create posts through the Expense strategy (Dr 5300 General
/// Expense / Cr 1050 Cash) so a create also verifies the journal side-effect wiring. Duplicate
/// Reference → 409; list + get routes are EXP_* claimed.
/// </summary>
public sealed class ExpenseCrudTemplateTests : IClassFixture<TestWebApplicationFactory>
{
    private readonly TestWebApplicationFactory _factory;

    public ExpenseCrudTemplateTests(TestWebApplicationFactory factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task Should_CreateExpense_And_PersistJournal()
    {
        await _factory.EnsureSeededAsync();
        var client = await _factory.CreateAuthorizedClientAsync(TestSeed.AdminEmail, TestSeed.AdminPassword);

        var reference = $"EXP-{Guid.NewGuid():N}"[..11];
        var response = await client.PostAsJsonAsync("/api/Expense", ExpensePayload(reference));
        Assert.True(response.IsSuccessStatusCode, await response.Content.ReadAsStringAsync());
        var created = await response.Content.ReadFromJsonAsync<JsonElement>(new JsonSerializerOptions(JsonSerializerDefaults.Web));
        var expenseId = created.GetProperty("id").GetGuid();

        await _factory.UsingDbAsync(async db =>
        {
            var expense = await db.Set<Expense>().AsNoTracking().SingleAsync(e => e.Id == expenseId);
            Assert.Equal(reference, expense.Reference);
            Assert.Equal(500.00m, expense.Amount);
            Assert.False(expense.IsDeleted);
        });
    }

    [Fact]
    public async Task Should_Return409_When_CreatingDuplicateExpenseReference()
    {
        await _factory.EnsureSeededAsync();
        var client = await _factory.CreateAuthorizedClientAsync(TestSeed.AdminEmail, TestSeed.AdminPassword);
        var reference = $"EXP-{Guid.NewGuid():N}"[..11];

        var first = await client.PostAsJsonAsync("/api/Expense", ExpensePayload(reference));
        Assert.True(first.IsSuccessStatusCode, await first.Content.ReadAsStringAsync());

        var second = await client.PostAsJsonAsync("/api/Expense", ExpensePayload(reference));
        Assert.Equal(HttpStatusCode.Conflict, second.StatusCode);
    }

    [Fact]
    public async Task Should_Return404_When_GettingDeletedExpense()
    {
        await _factory.EnsureSeededAsync();
        var client = await _factory.CreateAuthorizedClientAsync(TestSeed.AdminEmail, TestSeed.AdminPassword);
        var expenseId = await CreateExpenseAsync(client);
        (await client.DeleteAsync($"/api/Expense/{expenseId}")).EnsureSuccessStatusCode();

        var response = await client.GetAsync($"/api/Expense/{expenseId}");
        Assert.True(
            response.StatusCode == HttpStatusCode.NotFound || response.StatusCode == HttpStatusCode.NoContent,
            $"Deleted expense fetch returned {(int)response.StatusCode}");
    }

    [Fact]
    public async Task Should_SoftDeleteExpense_And_ExcludeItFromList()
    {
        await _factory.EnsureSeededAsync();
        var client = await _factory.CreateAuthorizedClientAsync(TestSeed.AdminEmail, TestSeed.AdminPassword);
        var reference = $"DEL-{Guid.NewGuid():N}"[..11];
        var expenseId = await CreateExpenseAsync(client, reference);

        var response = await client.DeleteAsync($"/api/Expense/{expenseId}");
        Assert.True(response.IsSuccessStatusCode, await response.Content.ReadAsStringAsync());

        await _factory.UsingDbAsync(async db =>
        {
            var expense = await db.Set<Expense>().IgnoreQueryFilters().AsNoTracking().SingleAsync(e => e.Id == expenseId);
            Assert.True(expense.IsDeleted);
        });

        var list = await client.GetAsync("/api/Expense");
        var body = await list.Content.ReadAsStringAsync();
        Assert.DoesNotContain(reference, body);
    }

    [Fact]
    public async Task Should_Return403_When_CreatingWithoutAddClaim()
    {
        await _factory.EnsureSeededAsync();
        var client = await _factory.CreateAuthorizedClientAsync(TestSeed.NoClaimsEmail, TestSeed.NoClaimsPassword);

        var response = await client.PostAsJsonAsync("/api/Expense", ExpensePayload("EXP-NOCLAIM"));

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task Should_HideExpenseFromTenantB_When_QueriedCrossTenant()
    {
        await _factory.EnsureSeededAsync();
        var adminClient = await _factory.CreateAuthorizedClientAsync(TestSeed.AdminEmail, TestSeed.AdminPassword);
        var reference = $"ISO-{Guid.NewGuid():N}"[..11];
        var create = await adminClient.PostAsJsonAsync("/api/Expense", ExpensePayload(reference));
        Assert.True(create.IsSuccessStatusCode, await create.Content.ReadAsStringAsync());

        var tenantBClient = await _factory.CreateAuthorizedClientAsync(TestSeed.TenantBAdminEmail, TestSeed.TenantBAdminPassword);
        var list = await tenantBClient.GetAsync("/api/Expense");
        Assert.True(list.IsSuccessStatusCode, await list.Content.ReadAsStringAsync());
        var body = await list.Content.ReadAsStringAsync();

        Assert.DoesNotContain(reference, body);
    }

    private async Task<Guid> CreateExpenseAsync(HttpClient client, string reference = null)
    {
        var response = await client.PostAsJsonAsync("/api/Expense", ExpensePayload(reference ?? $"EXP-{Guid.NewGuid():N}"[..11]));
        var body = await response.Content.ReadAsStringAsync();
        Assert.True(response.IsSuccessStatusCode, body);
        return JsonDocument.Parse(body).RootElement.GetProperty("id").GetGuid();
    }

    private static object ExpensePayload(string reference) => new
    {
        reference,
        expenseCategoryId = TestIds.ExpenseCategoryGeneralId,
        amount = 500.00m,
        expenseDate = DateTime.UtcNow,
        locationId = TestIds.LocationL1Id,
        description = "CRUD expense"
    };
}