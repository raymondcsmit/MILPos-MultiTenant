using System.Net.Http;
using System.Text;
using System.Threading.Tasks;
using POS.API.Tests.Infra;
using Xunit;

namespace POS.API.Tests.D09ImportExport;

/// <summary>
/// D09 import/export pipeline: the CSV template and the validate endpoint round-trip a
/// ProductImportDto-shaped payload when called by an authorized client with proper claims.
/// </summary>
public sealed class ImportRoundTripTests : IClassFixture<TestWebApplicationFactory>
{
    private readonly TestWebApplicationFactory _factory;

    public ImportRoundTripTests(TestWebApplicationFactory factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task Should_ServeTemplate_And_ValidateProductCsv_When_Authorized()
    {
        await _factory.EnsureSeededAsync();
        var client = await _factory.CreateAuthorizedClientAsync(TestSeed.AdminEmail, TestSeed.AdminPassword);

        var template = await client.GetAsync("/api/ImportExport/products/template");
        Assert.True(template.IsSuccessStatusCode, $"template -> {(int)template.StatusCode}");
        var templateText = (await template.Content.ReadAsStringAsync()).Replace("\0", string.Empty);
        var firstLine = templateText.Split('\n')[0];
        foreach (var header in new[] { "SKU Code", "Purchase Price", "Alert Quantity", "Description", "Sales Price" })
        {
            Assert.Contains(header, firstLine, System.StringComparison.OrdinalIgnoreCase);
        }

        var csv = "Code,Name,Barcode,SKU Code,SKU Name,Description,Category,Brand,Unit,Purchase Price,Sales Price,MRP,Margin,Tax Amount,Alert Quantity\n" +
                  "IMPORT-01,Import Probe,6901234567890,,,kitchen sink,TestCat,TestBrand,EA,10,15,18,0.5,0,5\n";
        var form = new MultipartFormDataContent();
        form.Add(new StringContent(csv, Encoding.UTF8, "text/csv"), "file", "products.csv");

        var validated = await client.PostAsync("/api/ImportExport/products/validate", form);
        Assert.True(validated.IsSuccessStatusCode, $"validate -> {(int)validated.StatusCode}");
        Assert.NotEqual(string.Empty, await validated.Content.ReadAsStringAsync());
    }
}