using System;
using System.Collections.Generic;
using System.Linq;
using System.Net;
using System.Net.Http;
using System.Net.Http.Json;
using System.Text.Json;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using POS.API.Tests.Infra;
using TenantEntity = POS.Data.Entities.Tenant;
using Xunit;

namespace POS.API.Tests.MultiTenancy;

/// <summary>
/// WF-2.1 registration Gap-Char characterization: the wide-open onboarding surface (SEC-06).
/// POST /api/Tenants/register is [AllowAnonymous] with no captcha, no email verification, and an
/// omitted adminPassword defaults to the seeded constant AppConstants.Seeding.DefaultPassword
/// ("admin@123") — characterized, not endorsed.
/// TC traceability: TC-D02.006 / 009.
/// </summary>
public sealed class RegistrationCharacterizationTests : IClassFixture<TestWebApplicationFactory>
{
    private const string DefaultPassword = "admin@123";

    private readonly TestWebApplicationFactory _factory;

    public RegistrationCharacterizationTests(TestWebApplicationFactory factory)
    {
        _factory = factory;
    }

    // --- TC-D02.006 — omitted admin password defaults to seed constant `admin@123` ---
    [Fact]
    public async Task Should_DefaultToSeededPassword_When_AdminPasswordOmitted()
    {
        await _factory.EnsureSeededAsync();

        var subdomain = $"t6{Guid.NewGuid():N}"[..10];
        var email = $"admin@{subdomain}.test";

        var anon = _factory.CreateClient().AddForwardedIpHeader();
        var register = await anon.PostAsJsonAsync("/api/Tenants/register", new { name = $"Theta {subdomain}", subdomain, adminEmail = email });
        var registerBody = await register.Content.ReadAsStringAsync();
        Assert.True(register.IsSuccessStatusCode, $"Register failed: {(int)register.StatusCode} {registerBody}");

        var loginDefault = await anon.PostAsJsonAsync("/api/authentication", new { userName = email, password = DefaultPassword });
        var loginDefaultBody = await loginDefault.Content.ReadAsStringAsync();
        Assert.True(loginDefault.IsSuccessStatusCode, $"Default password login failed: {(int)loginDefault.StatusCode} {loginDefaultBody}");
        var root = JsonDocument.Parse(loginDefaultBody).RootElement;
        Assert.False(string.IsNullOrWhiteSpace(root.GetProperty("bearerToken").GetString()));

        var loginWrong = await anon.PostAsJsonAsync("/api/authentication", new { userName = email, password = "wrong-password" });
        Assert.Equal(HttpStatusCode.Unauthorized, loginWrong.StatusCode);

        await _factory.UsingDbAsync(async db =>
        {
            var count = await db.Set<TenantEntity>().IgnoreQueryFilters().AsNoTracking()
                .CountAsync(t => t.Subdomain == subdomain);
            Assert.Equal(1, count);
        });
    }

    // --- TC-D02.009 — anonymous registration accepts requests with no captcha / no email verification ---
    [Fact]
    public async Task Should_AcceptFiveAnonymousRegistrations_WithoutCaptchaOrVerification()
    {
        await _factory.EnsureSeededAsync();

        var anon = _factory.CreateClient().AddForwardedIpHeader();
        var subdomains = new List<string>();
        for (var i = 0; i < 5; i++)
        {
            var subdomain = $"tc{Guid.NewGuid():N}"[..10];
            subdomains.Add(subdomain);
            var email = $"reg{i}@{subdomain}.test";

            var response = await anon.PostAsJsonAsync("/api/Tenants/register", new { name = $"Tenant {subdomain}", subdomain, adminEmail = email });
            var body = await response.Content.ReadAsStringAsync();
            Assert.True(response.IsSuccessStatusCode, $"Registration {i} failed: {(int)response.StatusCode} {body}");
        }

        await _factory.UsingDbAsync(async db =>
        {
            var count = await db.Set<TenantEntity>().IgnoreQueryFilters().AsNoTracking()
                .CountAsync(t => subdomains.Contains(t.Subdomain));
            Assert.Equal(5, count);
        });
    }
}