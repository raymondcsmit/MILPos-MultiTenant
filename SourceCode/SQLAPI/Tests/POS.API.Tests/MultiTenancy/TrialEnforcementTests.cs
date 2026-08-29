using System;
using System.Linq;
using System.Net;
using System.Net.Http;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using POS.API.Tests.Infra;
using POS.Data;
using TenantEntity = POS.Data.Entities.Tenant;
using Xunit;

namespace POS.API.Tests.MultiTenancy;

/// <summary>
/// WF-2.4 trial &amp; license enforcement (TrialEnforcementMiddleware.cs). Tenant B is the canonical
/// TRIAL tenant (placeholder LicenseKey sentinel "AAABBB", fresh trial clock). Each test arranges its
/// own tenant B trial state directly (with IMemoryCache eviction — the middleware caches both the
/// CompanyProfile and the Tenant subscription for ~5–10 min), then restores the baseline in finally so
/// fixture state never depends on test ordering.
/// TC traceability: TC-D02.034 / 035 / 036 / 037 / 038 / 043 / 045.
/// </summary>
public sealed class TrialEnforcementTests : IClassFixture<TestWebApplicationFactory>
{
    private const string PlaceholderKey = "AAABBB";
    private const string TrialExpiredPayloadMessage = "Trial Period Expired. Please Purchase License.";

    private readonly TestWebApplicationFactory _factory;

    public TrialEnforcementTests(TestWebApplicationFactory factory)
    {
        _factory = factory;
    }

    // --- TC-D02.034 — active trial: writes allowed ---
    [Fact]
    public async Task Should_AllowWrites_When_TrialIsActive()
    {
        await _factory.EnsureSeededAsync();
        await SetTenantBAsync(expired: false);

        var client = await _factory.CreateAuthorizedClientAsync(TestSeed.TenantBAdminEmail, TestSeed.TenantBAdminPassword);
        var name = $"TrialActive-{Guid.NewGuid():N}"[..24];
        var response = await client.PostAsJsonAsync("/api/Brand", new { name });
        var body = await response.Content.ReadAsStringAsync();

        Assert.True(response.IsSuccessStatusCode, $"Active-trial write failed: {(int)response.StatusCode} {body}");
        var brandId = JsonDocument.Parse(body).RootElement.GetProperty("id").GetGuid();

        await _factory.UsingDbAsync(async db =>
        {
            var brand = await db.Set<Brand>().IgnoreQueryFilters().AsNoTracking().SingleAsync(b => b.Id == brandId);
            Assert.Equal(TestIds.TenantBId, brand.TenantId);
            Assert.False(brand.IsDeleted);
        });
    }

    // --- TC-D02.035 — expired trial: 403 on writes with exact payload, reads still pass ---
    [Fact]
    public async Task Should_BlockWritesButAllowReads_When_TrialIsExpired()
    {
        await _factory.EnsureSeededAsync();
        await SetTenantBAsync(expired: true);
        try
        {
            var client = await _factory.CreateAuthorizedClientAsync(TestSeed.TenantBAdminEmail, TestSeed.TenantBAdminPassword);
            var name = $"TrialExpired-{Guid.NewGuid():N}"[..26];

            var post = await client.PostAsJsonAsync("/api/Brand", new { name });
            var postBody = await post.Content.ReadAsStringAsync();
            Assert.Equal(HttpStatusCode.Forbidden, post.StatusCode);
            AssertTrialExpiredPayload(postBody);

            await _factory.UsingDbAsync(async db =>
            {
                var count = await db.Set<Brand>().IgnoreQueryFilters().AsNoTracking()
                    .CountAsync(b => b.Name == name);
                Assert.Equal(0, count);
            });

            var get = await client.GetAsync("/api/Brands");
            Assert.Equal(HttpStatusCode.OK, get.StatusCode);

            var put = await client.PutAsJsonAsync($"/api/Brand/{Guid.NewGuid()}", new { id = Guid.NewGuid(), name = "Nope" });
            Assert.Equal(HttpStatusCode.Forbidden, put.StatusCode);
            AssertTrialExpiredPayload(await put.Content.ReadAsStringAsync());

            var del = await client.DeleteAsync($"/api/Brand/{Guid.NewGuid()}");
            Assert.Equal(HttpStatusCode.Forbidden, del.StatusCode);
            AssertTrialExpiredPayload(await del.Content.ReadAsStringAsync());
        }
        finally
        {
            await SetTenantBAsync(expired: false);
        }
    }

    // --- TC-D02.036 — allowlisted endpoints stay reachable for expired tenants ---
    [Fact]
    public async Task Should_KeepAllowlistedEndpointsReachable_When_TrialIsExpired()
    {
        await _factory.EnsureSeededAsync();
        await SetTenantBAsync(expired: true);
        try
        {
            var token = await _factory.GetTokenAsync(TestSeed.TenantBAdminEmail, TestSeed.TenantBAdminPassword);
            Assert.False(string.IsNullOrWhiteSpace(token));

            var client = _factory.CreateAuthorizedClientWithToken(token);

            var validate = await client.PostAsJsonAsync("/api/WrLicense/validate", new { purchaseCode = "" });
            var validateBody = await validate.Content.ReadAsStringAsync();
            Assert.Equal(HttpStatusCode.Conflict, validate.StatusCode);
            Assert.Contains("Purchase Code is required.", validateBody);

            var anon = _factory.CreateClient().AddForwardedIpHeader();
            var register = await anon.PostAsync("/api/Tenants/register", new StringContent("", Encoding.UTF8, "application/json"));
            var registerBody = await register.Content.ReadAsStringAsync();
            Assert.DoesNotContain(TrialExpiredPayloadMessage, registerBody);
        }
        finally
        {
            await SetTenantBAsync(expired: false);
        }
    }

    // --- TC-D02.037 — isSuperAdmin bypass works even against an expired impersonated tenant ---
    [Fact]
    public async Task Should_BypassTrialEnforcement_When_SuperAdminImpersonatesViaHeader()
    {
        await _factory.EnsureSeededAsync();
        await SetTenantBAsync(expired: true);
        try
        {
            var token = await _factory.GetTokenAsync(TestSeed.SuperAdminEmail, TestSeed.SuperAdminPassword);
            var client = _factory.CreateAuthorizedClientWithToken(token);
            client.DefaultRequestHeaders.Add("X-Tenant-ID", TestIds.TenantBId.ToString());

            var name = $"SuperBrand-{Guid.NewGuid():N}"[..26];
            var response = await client.PostAsJsonAsync("/api/Brand", new { name });
            var body = await response.Content.ReadAsStringAsync();

            Assert.True(response.IsSuccessStatusCode, $"SuperAdmin impersonated write failed: {(int)response.StatusCode} {body}");
            var brandId = JsonDocument.Parse(body).RootElement.GetProperty("id").GetGuid();

            await _factory.UsingDbAsync(async db =>
            {
                var brand = await db.Set<Brand>().IgnoreQueryFilters().AsNoTracking().SingleAsync(b => b.Id == brandId);
                Assert.Equal(TestIds.TenantBId, brand.TenantId);
            });
        }
        finally
        {
            await SetTenantBAsync(expired: false);
        }
    }

    // --- TC-D02.038 — placeholder LicenseKey does not unlock; real key does (OrdinalIgnoreCase sentinel) ---
    [Theory]
    [InlineData(PlaceholderKey, false)]   // (a) placeholder "AAABBB" == not activated
    [InlineData("REALKEY1", true)]        // (b) any non-placeholder key unlocks before the trial check
    [InlineData("", false)]               // (c) empty key == not activated
    [InlineData("aaabbb", false)]         // (d) lowercase placeholder cannot be smuggled (OrdinalIgnoreCase)
    public async Task Should_GateWritesOnActivatedLicense(string licenseKey, bool writeExpectedAllowed)
    {
        await _factory.EnsureSeededAsync();
        await SetTenantBAsync(expired: true, licenseKey: licenseKey);
        try
        {
            var client = await _factory.CreateAuthorizedClientAsync(TestSeed.TenantBAdminEmail, TestSeed.TenantBAdminPassword);
            var name = $"LicenseGate-{licenseKey}-{Guid.NewGuid():N}"[..24];
            var response = await client.PostAsJsonAsync("/api/Brand", new { name });
            var body = await response.Content.ReadAsStringAsync();

            if (writeExpectedAllowed)
            {
                Assert.True(response.IsSuccessStatusCode, $"Non-placeholder key '{licenseKey}' should unlock writes: {(int)response.StatusCode} {body}");
            }
            else
            {
                Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
                AssertTrialExpiredPayload(body);
                await _factory.UsingDbAsync(async db =>
                {
                    var count = await db.Set<Brand>().IgnoreQueryFilters().AsNoTracking()
                        .CountAsync(b => b.Name == name);
                    Assert.Equal(0, count);
                });
            }
        }
        finally
        {
            await SetTenantBAsync(expired: false);
        }
    }

    // --- TC-D02.043 (Gap-Char) — validate returns DUMMY_TOKEN and flips tenant to Paid ---
    [Fact]
    public async Task Should_ValidateLicense_And_ReturnDummyToken_When_PurchaseCodeProvided()
    {
        await _factory.EnsureSeededAsync();
        await SetTenantBAsync(expired: false);
        try
        {
            var client = await _factory.CreateAuthorizedClientAsync(TestSeed.TenantBAdminEmail, TestSeed.TenantBAdminPassword);
            var purchaseCode = new string('A', 40);
            var response = await client.PostAsJsonAsync("/api/WrLicense/validate", new { purchaseCode });
            var body = await response.Content.ReadAsStringAsync();

            Assert.True(response.IsSuccessStatusCode, $"Validate failed: {(int)response.StatusCode} {body}");
            var root = JsonDocument.Parse(body).RootElement;
            Assert.True(root.GetProperty("isAuthenticated").GetBoolean());
            Assert.Equal(purchaseCode, root.GetProperty("purchaseCode").GetString());
            var licenseKey = root.GetProperty("licenseKey").GetString()!;
            Assert.Matches("^[0-9A-F]{32}$", licenseKey);
            Assert.Equal("DUMMY_TOKEN_FOR_LICENSE_VALIDATION", root.GetProperty("bearerToken").GetString());

            await _factory.UsingDbAsync(async db =>
            {
                var profile = await db.Set<CompanyProfile>().IgnoreQueryFilters().AsNoTracking()
                    .SingleAsync(p => p.TenantId == TestIds.TenantBId);
                Assert.Equal(purchaseCode, profile.PurchaseCode);
                Assert.Equal(licenseKey, profile.LicenseKey);

                var tenant = await db.Set<TenantEntity>().IgnoreQueryFilters().AsNoTracking()
                    .SingleAsync(t => t.Id == TestIds.TenantBId);
                Assert.Equal("Paid", tenant.LicenseType);
                Assert.Null(tenant.TrialExpiryDate);
                Assert.Null(tenant.SubscriptionEndDate);
            });
        }
        finally
        {
            await SetTenantBAsync(expired: false);
        }
    }

    // --- TC-D02.045 (Gap-Char) — activation trusts ANY client-supplied purchase code (SEC-03 pin) ---
    [Fact]
    public async Task Should_AcceptArbitraryPurchaseCode_When_ValidateAsTrial()
    {
        await _factory.EnsureSeededAsync();
        await SetTenantBAsync(expired: false);
        try
        {
            var client = await _factory.CreateAuthorizedClientAsync(TestSeed.TenantBAdminEmail, TestSeed.TenantBAdminPassword);
            var response = await client.PostAsJsonAsync("/api/WrLicense/validate", new { purchaseCode = "X" });
            var body = await response.Content.ReadAsStringAsync();

            Assert.True(response.IsSuccessStatusCode, $"1-char purchase code rejected: {(int)response.StatusCode} {body}");
            var root = JsonDocument.Parse(body).RootElement;
            Assert.True(root.GetProperty("isAuthenticated").GetBoolean());
            Assert.Equal("X", root.GetProperty("purchaseCode").GetString());
            var licenseKey = root.GetProperty("licenseKey").GetString()!;
            Assert.Matches("^[0-9A-F]{32}$", licenseKey);
            Assert.Equal("DUMMY_TOKEN_FOR_LICENSE_VALIDATION", root.GetProperty("bearerToken").GetString());

            await _factory.UsingDbAsync(async db =>
            {
                var profile = await db.Set<CompanyProfile>().IgnoreQueryFilters().AsNoTracking()
                    .SingleAsync(p => p.TenantId == TestIds.TenantBId);
                Assert.Equal("X", profile.PurchaseCode);
                Assert.Equal(licenseKey, profile.LicenseKey);

                var tenant = await db.Set<TenantEntity>().IgnoreQueryFilters().AsNoTracking()
                    .SingleAsync(t => t.Id == TestIds.TenantBId);
                Assert.Equal("Paid", tenant.LicenseType);
                Assert.Null(tenant.TrialExpiryDate);
                Assert.Null(tenant.SubscriptionEndDate);
            });
        }
        finally
        {
            await SetTenantBAsync(expired: false);
        }
    }

    // --- helpers ---

    private static void AssertTrialExpiredPayload(string body)
    {
        var root = JsonDocument.Parse(body).RootElement;
        Assert.Equal(TrialExpiredPayloadMessage, root.GetProperty("message").GetString());
        Assert.True(root.GetProperty("isTrialExpired").GetBoolean());
    }

    /// <summary>
    /// Arranges tenant B's trial/license state (default: fresh trial, placeholder key) and evicts the
    /// middleware's per-tenant caches so the next request observes the new state.
    /// </summary>
    private async Task SetTenantBAsync(bool expired, string licenseKey = PlaceholderKey)
    {
        await _factory.UsingDbAsync(async db =>
        {
            var tenant = await db.Set<TenantEntity>().IgnoreQueryFilters().AsTracking()
                .SingleAsync(t => t.Id == TestIds.TenantBId);
            tenant.LicenseType = "Trial";
            tenant.SubscriptionPlan = "Trial";
            tenant.TrialExpiryDate = expired ? DateTime.UtcNow.AddDays(-1) : DateTime.UtcNow.AddDays(1);
            tenant.SubscriptionStartDate = null;
            tenant.SubscriptionEndDate = null;

            var profile = await db.Set<CompanyProfile>().IgnoreQueryFilters().AsTracking()
                .SingleAsync(p => p.Id == TestIds.TenantBProfileId);
            profile.LicenseKey = licenseKey;
            profile.PurchaseCode = "CCCCRR";
            await db.SaveChangesAsync();
        });

        ClearLicenseCache();
    }

    private void ClearLicenseCache()
    {
        var cache = _factory.GetRequiredService<IMemoryCache>();
        cache.Remove($"CompanyProfile_License:{TestIds.TenantBId}");
        cache.Remove($"Tenant_Subscription:{TestIds.TenantBId}");
        cache.Remove("CompanyProfile_License:global");
        cache.Remove("CompanyProfile_License");
    }
}