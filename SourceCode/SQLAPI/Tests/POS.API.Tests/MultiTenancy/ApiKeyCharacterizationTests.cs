using System.Linq;
using System.Net;
using System.Net.Http;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using POS.API.Tests.Infra;
using TenantEntity = POS.Data.Entities.Tenant;
using Xunit;

namespace POS.API.Tests.MultiTenancy;

/// <summary>
/// WF-2.2 API-key middleware Gap-Char characterization (SEC-07).
/// ApiKeyAuthenticationMiddleware fetches the tenant WITHOUT .AsTracking() and the POSDbContext global
/// default is NoTracking (Startup.cs:176), so the SaveChangesAsync "last used" stamp is a silent
/// no-op: ApiKeyLastUsedDate never advances and no UPDATE statement runs. The catalog's TC-D02.023
/// assumed 3 UPDATEs via an interceptor — the observed behavior corrects that (write path is dead code).
/// TC traceability: TC-D02.023.
/// </summary>
public sealed class ApiKeyCharacterizationTests : IClassFixture<TestWebApplicationFactory>
{
    private const string TenantAKey = "test-api-key-a";

    private readonly TestWebApplicationFactory _factory;

    public ApiKeyCharacterizationTests(TestWebApplicationFactory factory)
    {
        _factory = factory;
    }

    // --- TC-D02.023 (characterization, corrected) — keyed requests do NOT persist ApiKeyLastUsedDate ---
    [Fact]
    public async Task Should_NotPersistApiKeyLastUsed_When_KeyedReadsSucceed()
    {
        await _factory.EnsureSeededAsync();

        await _factory.UsingDbAsync(async db =>
        {
            var tenant = await db.Set<TenantEntity>().IgnoreQueryFilters().AsTracking()
                .SingleAsync(t => t.Id == TestIds.TenantAId);
            tenant.ApiKeyLastUsedDate = null;
            await db.SaveChangesAsync();
        });

        var client = _factory.CreateClient().AddForwardedIpHeader();
        client.DefaultRequestHeaders.Add("X-API-Key", TenantAKey);

        for (var i = 0; i < 3; i++)
        {
            var response = await client.GetAsync("/api/CompanyProfile");
            var body = await response.Content.ReadAsStringAsync();
            Assert.True(response.IsSuccessStatusCode, $"Keyed GET {i} failed: {(int)response.StatusCode} {body}");
        }

        var lastUsed = await _factory.UsingDbAsync(async db =>
            await db.Set<TenantEntity>().IgnoreQueryFilters().AsNoTracking()
                .Where(t => t.Id == TestIds.TenantAId)
                .Select(t => t.ApiKeyLastUsedDate)
                .SingleAsync());
        Assert.Null(lastUsed);
    }

    // --- companion: middleware genuinely runs on keyed requests (invalid key short-circuits to 401) ---
    [Fact]
    public async Task Should_RejectInvalidApiKey_With_ExactPayload()
    {
        await _factory.EnsureSeededAsync();

        var client = _factory.CreateClient().AddForwardedIpHeader();
        client.DefaultRequestHeaders.Add("X-API-Key", "garbage-key");

        var response = await client.GetAsync("/api/CompanyProfile");
        var body = await response.Content.ReadAsStringAsync();

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
        Assert.Equal("Invalid API Key", body);
    }
}