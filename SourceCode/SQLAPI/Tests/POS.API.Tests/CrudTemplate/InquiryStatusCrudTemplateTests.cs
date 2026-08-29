using System;
using System.Linq;
using System.Net;
using System.Net.Http;
using System.Net.Http.Json;
using System.Text.Json;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using POS.API.Tests.Infra;
using POS.Data.Entities;
using Xunit;

namespace POS.API.Tests.CrudTemplate;

/// <summary>
/// Wave-3 CRUD roll-out (Inquiry Statuses) — full Brand-template matrix. Duplicate name 409,
/// write routes INQ_MANAGE_INQ_STATUS-claimed, list route unclaimed.
/// </summary>
public sealed class InquiryStatusCrudTemplateTests : IClassFixture<TestWebApplicationFactory>
{
    private readonly TestWebApplicationFactory _factory;

    public InquiryStatusCrudTemplateTests(TestWebApplicationFactory factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task Should_CreateInquiryStatus_And_PersistIt()
    {
        await _factory.EnsureSeededAsync();
        var client = await _factory.CreateAuthorizedClientAsync(TestSeed.AdminEmail, TestSeed.AdminPassword);

        var response = await client.PostAsJsonAsync("/api/InquiryStatus", new { name = $"Status-{Guid.NewGuid():N}"[..16] });
        Assert.True(response.IsSuccessStatusCode, await response.Content.ReadAsStringAsync());
        var created = await response.Content.ReadFromJsonAsync<JsonElement>(new JsonSerializerOptions(JsonSerializerDefaults.Web));
        var statusId = created.GetProperty("id").GetGuid();

        await _factory.UsingDbAsync(async db =>
        {
            var status = await db.Set<InquiryStatus>().AsNoTracking().SingleAsync(s => s.Id == statusId);
            Assert.False(string.IsNullOrWhiteSpace(status.Name));
            Assert.False(status.IsDeleted);
        });
    }

    [Fact]
    public async Task Should_Return409_When_CreatingDuplicateInquiryStatusName()
    {
        await _factory.EnsureSeededAsync();
        var client = await _factory.CreateAuthorizedClientAsync(TestSeed.AdminEmail, TestSeed.AdminPassword);
        var name = $"Status-{Guid.NewGuid():N}"[..16];

        var first = await client.PostAsJsonAsync("/api/InquiryStatus", new { name });
        Assert.True(first.IsSuccessStatusCode, await first.Content.ReadAsStringAsync());

        var second = await client.PostAsJsonAsync("/api/InquiryStatus", new { name });
        Assert.Equal(HttpStatusCode.Conflict, second.StatusCode);
    }

    [Fact]
    public async Task Should_UpdateInquiryStatusName()
    {
        await _factory.EnsureSeededAsync();
        var client = await _factory.CreateAuthorizedClientAsync(TestSeed.AdminEmail, TestSeed.AdminPassword);
        var statusId = await CreateInquiryStatusAsync(client);

        var newName = $"Renamed-{Guid.NewGuid():N}"[..18];
        var response = await client.PutAsJsonAsync($"/api/InquiryStatus/{statusId}", new { id = statusId, name = newName });
        Assert.True(response.IsSuccessStatusCode, await response.Content.ReadAsStringAsync());

        await _factory.UsingDbAsync(async db =>
        {
            var status = await db.Set<InquiryStatus>().AsNoTracking().SingleAsync(s => s.Id == statusId);
            Assert.Equal(newName, status.Name);
        });
    }

    [Fact]
    public async Task Should_SoftDeleteInquiryStatus_And_ExcludeItFromList()
    {
        await _factory.EnsureSeededAsync();
        var client = await _factory.CreateAuthorizedClientAsync(TestSeed.AdminEmail, TestSeed.AdminPassword);
        var name = $"DeleteMe-{Guid.NewGuid():N}"[..19];
        var statusId = await CreateInquiryStatusAsync(client, name);

        var response = await client.DeleteAsync($"/api/InquiryStatus/{statusId}");
        Assert.True(response.IsSuccessStatusCode, await response.Content.ReadAsStringAsync());

        await _factory.UsingDbAsync(async db =>
        {
            var status = await db.Set<InquiryStatus>().IgnoreQueryFilters().AsNoTracking().SingleAsync(s => s.Id == statusId);
            Assert.True(status.IsDeleted);
        });

        var list = await client.GetAsync("/api/InquiryStatuses");
        var body = await list.Content.ReadAsStringAsync();
        Assert.DoesNotContain(name, body);
    }

    [Fact]
    public async Task Should_Return404_When_GettingDeletedInquiryStatus()
    {
        await _factory.EnsureSeededAsync();
        var client = await _factory.CreateAuthorizedClientAsync(TestSeed.AdminEmail, TestSeed.AdminPassword);
        var statusId = await CreateInquiryStatusAsync(client);
        (await client.DeleteAsync($"/api/InquiryStatus/{statusId}")).EnsureSuccessStatusCode();

        var response = await client.GetAsync($"/api/InquiryStatus/{statusId}");
        Assert.True(
            response.StatusCode == HttpStatusCode.NotFound || response.StatusCode == HttpStatusCode.NoContent,
            $"Deleted inquiry status fetch returned {(int)response.StatusCode}");
    }

    [Fact]
    public async Task Should_Return403_When_CreatingWithoutManageClaim()
    {
        await _factory.EnsureSeededAsync();
        var client = await _factory.CreateAuthorizedClientAsync(TestSeed.NoClaimsEmail, TestSeed.NoClaimsPassword);

        var response = await client.PostAsJsonAsync("/api/InquiryStatus", new { name = "NoClaimStatus" });

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task Should_HideInquiryStatusFromTenantB_When_QueriedCrossTenant()
    {
        await _factory.EnsureSeededAsync();
        var adminClient = await _factory.CreateAuthorizedClientAsync(TestSeed.AdminEmail, TestSeed.AdminPassword);
        var name = $"Isolated-{Guid.NewGuid():N}"[..20];
        var create = await adminClient.PostAsJsonAsync("/api/InquiryStatus", new { name });
        Assert.True(create.IsSuccessStatusCode, await create.Content.ReadAsStringAsync());

        var tenantBClient = await _factory.CreateAuthorizedClientAsync(TestSeed.TenantBAdminEmail, TestSeed.TenantBAdminPassword);
        var list = await tenantBClient.GetAsync("/api/InquiryStatuses");
        var body = await list.Content.ReadAsStringAsync();

        Assert.DoesNotContain(name, body);
    }

    private async Task<Guid> CreateInquiryStatusAsync(HttpClient client, string name = null)
    {
        var response = await client.PostAsJsonAsync("/api/InquiryStatus", new { name = name ?? $"Status-{Guid.NewGuid():N}"[..16] });
        var body = await response.Content.ReadAsStringAsync();
        Assert.True(response.IsSuccessStatusCode, body);
        return JsonDocument.Parse(body).RootElement.GetProperty("id").GetGuid();
    }
}