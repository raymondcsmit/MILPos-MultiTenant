using System.Net;
using System.Net.Http;
using System.Threading.Tasks;
using POS.API.Tests.Infra;
using Xunit;

namespace POS.API.Tests.D09ImportExport;

/// <summary>
/// D09 data exchange: ImportExportController is protected with [Authorize] and [ClaimCheck]
/// (BUG-19 / N-40 fixed) — anonymous callers receive HTTP 401 Unauthorized, users without claims
/// receive HTTP 403 Forbidden, and authorized users can successfully export and template.
/// </summary>
public sealed class ImportExportTests : IClassFixture<TestWebApplicationFactory>
{
    private readonly TestWebApplicationFactory _factory;

    public ImportExportTests(TestWebApplicationFactory factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task Should_Return401_When_ExportingProducts_Unauthenticated()
    {
        await _factory.EnsureSeededAsync();
        var client = _factory.CreateClient();

        var response = await client.GetAsync("/api/ImportExport/products/export?format=csv");

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Theory]
    [InlineData("customers/export?format=csv")]
    [InlineData("suppliers/export?format=csv")]
    [InlineData("products/template?format=csv")]
    [InlineData("customers/template?format=csv")]
    [InlineData("suppliers/template?format=csv")]
    public async Task Should_Return401_When_ReachingExportsAndTemplates_Unauthenticated(string route)
    {
        await _factory.EnsureSeededAsync();
        var client = _factory.CreateClient();

        var response = await client.GetAsync($"/api/ImportExport/{route}");

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task Should_Return401_When_ReachingImportRoute_Unauthenticated()
    {
        await _factory.EnsureSeededAsync();
        var client = _factory.CreateClient();

        var response = await client.PostAsync("/api/ImportExport/products/import", new ByteArrayContent(System.Array.Empty<byte>()));

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task Should_Return403_When_ReachingExport_WithoutClaims()
    {
        await _factory.EnsureSeededAsync();
        var client = await _factory.CreateAuthorizedClientAsync(TestSeed.NoClaimsEmail, TestSeed.NoClaimsPassword);

        var response = await client.GetAsync("/api/ImportExport/products/export?format=csv");

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task Should_ExportProducts_Csv_When_Authorized()
    {
        await _factory.EnsureSeededAsync();
        var client = await _factory.CreateAuthorizedClientAsync(TestSeed.AdminEmail, TestSeed.AdminPassword);

        var response = await client.GetAsync("/api/ImportExport/products/export?format=csv");

        Assert.True(response.IsSuccessStatusCode, $"{(int)response.StatusCode} {await response.Content.ReadAsStringAsync()}");
        Assert.Equal("text/csv", response.Content.Headers.ContentType?.MediaType);
        Assert.Contains("Product A", await response.Content.ReadAsStringAsync());
    }
}