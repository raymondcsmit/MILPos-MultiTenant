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

namespace POS.API.Tests.D08Inquiry;

/// <summary>
/// D08 CRM workflow — inquiry create/get/list/soft-delete + activity post, all through the real
/// INQ_* claimed endpoints against the canonical seed (Web source + Open status).
/// </summary>
public sealed class InquiryFlowTests : IClassFixture<TestWebApplicationFactory>
{
    private readonly TestWebApplicationFactory _factory;

    public InquiryFlowTests(TestWebApplicationFactory factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task Should_CreateInquiry_And_PersistIt()
    {
        await _factory.EnsureSeededAsync();
        var client = await _factory.CreateAuthorizedClientAsync(TestSeed.AdminEmail, TestSeed.AdminPassword);

        var companyName = $"Acme-{Guid.NewGuid():N}"[..15];
        var response = await client.PostAsJsonAsync("/api/Inquiry", InquiryPayload(companyName));
        Assert.True(response.IsSuccessStatusCode, await response.Content.ReadAsStringAsync());
        var created = await response.Content.ReadFromJsonAsync<JsonElement>(new JsonSerializerOptions(JsonSerializerDefaults.Web));
        var inquiryId = created.GetProperty("id").GetGuid();

        await _factory.UsingDbAsync(async db =>
        {
            var inquiry = await db.Set<Inquiry>().AsNoTracking().SingleAsync(i => i.Id == inquiryId);
            Assert.Equal(companyName, inquiry.CompanyName);
            Assert.False(inquiry.IsDeleted);
        });
    }

    [Fact]
    public async Task Should_GetInquiryById()
    {
        await _factory.EnsureSeededAsync();
        var client = await _factory.CreateAuthorizedClientAsync(TestSeed.AdminEmail, TestSeed.AdminPassword);
        var inquiryId = await CreateInquiryAsync(client);

        var response = await client.GetAsync($"/api/Inquiry/{inquiryId}");
        Assert.True(response.IsSuccessStatusCode, await response.Content.ReadAsStringAsync());
    }

    [Fact]
    public async Task Should_AddActivity_ToInquiry()
    {
        await _factory.EnsureSeededAsync();
        var client = await _factory.CreateAuthorizedClientAsync(TestSeed.AdminEmail, TestSeed.AdminPassword);
        var inquiryId = await CreateInquiryAsync(client);

        var response = await client.PostAsJsonAsync("/api/InquiryActivity", new { inquiryId, subject = "Follow-up call", priority = "High" });
        Assert.True(response.IsSuccessStatusCode, await response.Content.ReadAsStringAsync());

        var activities = await client.GetAsync($"/api/InquiryActivity/{inquiryId}");
        Assert.True(activities.IsSuccessStatusCode, await activities.Content.ReadAsStringAsync());
        var body = await activities.Content.ReadAsStringAsync();
        Assert.Contains("Follow-up call", body);
    }

    [Fact]
    public async Task Should_SoftDeleteInquiry_And_ExcludeItFromList()
    {
        await _factory.EnsureSeededAsync();
        var client = await _factory.CreateAuthorizedClientAsync(TestSeed.AdminEmail, TestSeed.AdminPassword);
        var companyName = $"ShredCo-{Guid.NewGuid():N}"[..18];
        var inquiryId = await CreateInquiryAsync(client, companyName);

        var response = await client.DeleteAsync($"/api/Inquiry/{inquiryId}");
        Assert.True(response.IsSuccessStatusCode, await response.Content.ReadAsStringAsync());

        await _factory.UsingDbAsync(async db =>
        {
            var inquiry = await db.Set<Inquiry>().IgnoreQueryFilters().AsNoTracking().SingleAsync(i => i.Id == inquiryId);
            Assert.True(inquiry.IsDeleted);
        });

        var list = await client.GetAsync("/api/Inquiry");
        Assert.True(list.IsSuccessStatusCode, await list.Content.ReadAsStringAsync());
        var body = await list.Content.ReadAsStringAsync();
        Assert.DoesNotContain(companyName, body);
    }

    [Fact]
    public async Task Should_Return403_When_CreatingInquiryWithoutAddClaim()
    {
        await _factory.EnsureSeededAsync();
        var client = await _factory.CreateAuthorizedClientAsync(TestSeed.NoClaimsEmail, TestSeed.NoClaimsPassword);

        var response = await client.PostAsJsonAsync("/api/Inquiry", InquiryPayload("NoClaimInquiry"));

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task Should_HideInquiryFromTenantB_When_QueriedCrossTenant()
    {
        await _factory.EnsureSeededAsync();
        var adminClient = await _factory.CreateAuthorizedClientAsync(TestSeed.AdminEmail, TestSeed.AdminPassword);
        var companyName = $"SecretCo-{Guid.NewGuid():N}"[..18];
        var create = await adminClient.PostAsJsonAsync("/api/Inquiry", InquiryPayload(companyName));
        Assert.True(create.IsSuccessStatusCode, await create.Content.ReadAsStringAsync());

        var tenantBClient = await _factory.CreateAuthorizedClientAsync(TestSeed.TenantBAdminEmail, TestSeed.TenantBAdminPassword);
        var list = await tenantBClient.GetAsync("/api/Inquiry");
        Assert.True(list.IsSuccessStatusCode, await list.Content.ReadAsStringAsync());
        var body = await list.Content.ReadAsStringAsync();

        Assert.DoesNotContain(companyName, body);
    }

    private async Task<Guid> CreateInquiryAsync(HttpClient client, string companyName = null)
    {
        var response = await client.PostAsJsonAsync("/api/Inquiry", InquiryPayload(companyName ?? $"Acme-{Guid.NewGuid():N}"[..15]));
        var body = await response.Content.ReadAsStringAsync();
        Assert.True(response.IsSuccessStatusCode, body);
        return JsonDocument.Parse(body).RootElement.GetProperty("id").GetGuid();
    }

    private static object InquiryPayload(string companyName) => new
    {
        companyName,
        contactPerson = "CRM Contact",
        email = $"crm-{Guid.NewGuid():N}"[..30] + "@test.local",
        mobileNo = "0300-0000666",
        message = "Please quote for our next order.",
        inquirySourceId = TestIds.InquirySourceWebId,
        inquiryStatusId = TestIds.InquiryStatusOpenId
    };
}