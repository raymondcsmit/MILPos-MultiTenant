using System.Net;
using System.Net.Http;
using System.Threading.Tasks;
using POS.API.Tests.Infra;
using Xunit;

namespace POS.API.Tests.D09ImportExport;

/// <summary>
/// D09 data exchange: ImportExportController carries NO [Authorize] and NO [ClaimCheck] on any
/// action (N-40) — exports, templates, imports and validation are reachable with zero auth.
/// Pin: an UNAUTHENTICATED client gets a full product CSV export (with seeded rows).
/// </summary>
public sealed class ImportExportTests : IClassFixture<TestWebApplicationFactory>
{
    private readonly TestWebApplicationFactory _factory;

    public ImportExportTests(TestWebApplicationFactory factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task Should_ExportProducts_Csv_Without_Authentication_GapCharacterization()
    {
        await _factory.EnsureSeededAsync();
        var client = _factory.CreateClient();

        var response = await client.GetAsync("/api/ImportExport/products/export?format=csv");

        Assert.True(response.IsSuccessStatusCode, $"{(int)response.StatusCode} {await response.Content.ReadAsStringAsync()}");
        Assert.Equal("text/csv", response.Content.Headers.ContentType?.MediaType);
        Assert.Contains("Product A", await response.Content.ReadAsStringAsync());
    }

    [Theory]
    [InlineData("customers/export?format=csv")]
    [InlineData("suppliers/export?format=csv")]
    [InlineData("products/template?format=csv")]
    [InlineData("customers/template?format=csv")]
    [InlineData("suppliers/template?format=csv")]
    public async Task Should_ReachExportsAndTemplates_Without_Authentication_GapCharacterization(string route)
    {
        await _factory.EnsureSeededAsync();
        var client = _factory.CreateClient();

        var response = await client.GetAsync($"/api/ImportExport/{route}");

        Assert.NotEqual(HttpStatusCode.Forbidden, response.StatusCode);
        Assert.NotEqual(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task Should_ReachImportRoute_Without_Authentication_GapCharacterization()
    {
        await _factory.EnsureSeededAsync();
        var client = _factory.CreateClient();

        var response = await client.PostAsync("/api/ImportExport/products/import", new ByteArrayContent(System.Array.Empty<byte>()));

        Assert.NotEqual(HttpStatusCode.Forbidden, response.StatusCode);
        Assert.NotEqual(HttpStatusCode.Unauthorized, response.StatusCode);
    }
}