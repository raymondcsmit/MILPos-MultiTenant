using System;
using System.Net;
using System.Net.Http;
using System.Threading.Tasks;
using POS.API.Tests.Infra;
using Xunit;

namespace POS.API.Tests.Tenants;

/// <summary>
/// D10 sync backend gate: my-database is any-authenticated-user (TenantId claim, exported via the
/// self-service SQLite exporter) while export-sqlite is SuperAdmin-policy-only. The zip
/// download test also proves the exporter reconciles the stale shipped template against the
/// current EF model (finding N-33).
/// </summary>
public sealed class TenantSqliteExportTests : IClassFixture<TestWebApplicationFactory>
{
    private readonly TestWebApplicationFactory _factory;

    public TenantSqliteExportTests(TestWebApplicationFactory factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task Should_Return401_When_DownloadingMyDatabaseUnauthenticated()
    {
        await _factory.EnsureSeededAsync();
        var client = _factory.CreateClient();

        var response = await client.GetAsync("/api/tenants/my-database");

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task Should_Return403_When_TenantUserExportsSqlite()
    {
        await _factory.EnsureSeededAsync();
        var client = await _factory.CreateAuthorizedClientAsync(TestSeed.AdminEmail, TestSeed.AdminPassword);

        var response = await client.PostAsync($"/api/tenants/{TestIds.TenantAId}/export-sqlite", null);

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task Should_DownloadMyDatabase_AsZip_When_Authenticated()
    {
        await _factory.EnsureSeededAsync();
        var client = await _factory.CreateAuthorizedClientAsync(TestSeed.AdminEmail, TestSeed.AdminPassword);

        var response = await client.GetAsync("/api/tenants/my-database");

        Assert.True(response.IsSuccessStatusCode, $"my-database returned {(int)response.StatusCode}: {await response.Content.ReadAsStringAsync()}");
        Assert.Equal("application/zip", response.Content.Headers.ContentType?.MediaType);
        var bytes = await response.Content.ReadAsByteArrayAsync();
        Assert.True(bytes.Length > 4, "zip body too small");
        Assert.Equal((byte)'P', bytes[0]);
        Assert.Equal((byte)'K', bytes[1]);
    }
}