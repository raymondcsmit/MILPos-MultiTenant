using System;
using System.Net;
using System.Net.Http;
using System.Net.Http.Json;
using System.Text.Json;
using System.Threading.Tasks;
using POS.API.Tests.Infra;
using Xunit;

namespace POS.API.Tests.D05Settings;

/// <summary>
/// D01/D05/D09 parametric surface: variants are CRUD under PRO_MANAGE_VARIANTS with a
/// duplicate-name 409; countries/cities/languages are settings-gated; currency, pricing,
/// daily product price and the company profile read are unclaimed (Gap-Char).
/// </summary>
public sealed class SettingsLookupTests : IClassFixture<TestWebApplicationFactory>
{
    private readonly TestWebApplicationFactory _factory;

    public SettingsLookupTests(TestWebApplicationFactory factory)
    {
        _factory = factory;
    }

    private static Guid ExtractId(HttpResponseMessage response)
    {
        var json = response.Content.ReadFromJsonAsync<JsonElement>().GetAwaiter().GetResult();
        var id = json.TryGetProperty("data", out var data) && data.ValueKind == JsonValueKind.Object
            ? data.GetProperty("id")
            : json.GetProperty("id");
        return id.GetGuid();
    }

    [Fact]
    public async Task Should_AddVariant_RejectDuplicate_And_List_When_Claimed()
    {
        await _factory.EnsureSeededAsync();
        var client = await _factory.CreateAuthorizedClientAsync(TestSeed.AdminEmail, TestSeed.AdminPassword);
        var no = await _factory.CreateAuthorizedClientAsync(TestSeed.NoClaimsEmail, TestSeed.NoClaimsPassword);

        var add = await client.PostAsJsonAsync("/api/Variant", new
        {
            name = $"Size {Guid.NewGuid():N}",
            description = "Sizing set",
            variantItems = new object[] { new { name = "S" }, new { name = "M" } }
        });
        var addBody = await add.Content.ReadAsStringAsync();
        if (!add.IsSuccessStatusCode) { throw new Xunit.Sdk.XunitException($"variant add -> {(int)add.StatusCode} {addBody}"); }

        var named = $"Dup {Guid.NewGuid():N}";
        var firstDup = await client.PostAsJsonAsync("/api/Variant", new { name = named, description = "a", variantItems = new object[] { new { name = "L" } } });
        if (!firstDup.IsSuccessStatusCode) { throw new Xunit.Sdk.XunitException($"variant dup-create -> {(int)firstDup.StatusCode} {await firstDup.Content.ReadAsStringAsync()}"); }
        Assert.Equal(HttpStatusCode.Conflict, (await client.PostAsJsonAsync("/api/Variant", new { name = named, description = "b", variantItems = new object[] { new { name = "XL" } } })).StatusCode);

        Assert.True((await client.GetAsync("/api/Variant")).IsSuccessStatusCode);
        Assert.True((await no.GetAsync("/api/Variant")).IsSuccessStatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await no.PostAsJsonAsync("/api/Variant", new { name = "x", variantItems = new object[] { new { name = "M" } } })).StatusCode);
    }

    [Fact]
    public async Task Should_AddCountry_ThenCity_When_Claimed()
    {
        await _factory.EnsureSeededAsync();
        var client = await _factory.CreateAuthorizedClientAsync(TestSeed.AdminEmail, TestSeed.AdminPassword);

        var country = await client.PostAsJsonAsync("/api/Country", new { countryName = $"Country {Guid.NewGuid():N}" });
        Assert.True(country.IsSuccessStatusCode, $"country -> {(int)country.StatusCode} {await country.Content.ReadAsStringAsync()}");
        var countryId = ExtractId(country);

        var city = await client.PostAsJsonAsync("/api/City", new { cityName = $"City {Guid.NewGuid():N}", countryId });
        Assert.True(city.IsSuccessStatusCode, $"city -> {(int)city.StatusCode} {await city.Content.ReadAsStringAsync()}");
    }

    [Fact]
    public async Task Should_Return403_Without_SettingsClaims()
    {
        await _factory.EnsureSeededAsync();
        var no = await _factory.CreateAuthorizedClientAsync(TestSeed.NoClaimsEmail, TestSeed.NoClaimsPassword);

        Assert.Equal(HttpStatusCode.Forbidden, (await no.GetAsync($"/api/Country/{Guid.NewGuid()}")).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await no.GetAsync("/api/City")).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await no.GetAsync("/api/Language")).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await no.GetAsync("/api/PageHelper")).StatusCode);
    }

    [Fact]
    public async Task Should_ServeUnclaimedLookups_Without_Claim_GapCharacterization()
    {
        await _factory.EnsureSeededAsync();
        var no = await _factory.CreateAuthorizedClientAsync(TestSeed.NoClaimsEmail, TestSeed.NoClaimsPassword);

        foreach (var route in new[] { "/api/Currency/", "/api/Pricing", "/api/DailyProductPrice", "/api/CompanyProfile", "/api/ContactUs", "/api/Countries", "/api/Language/default" })
        {
            var response = await no.GetAsync(route);
            Assert.True(response.IsSuccessStatusCode, $"{route} -> {(int)response.StatusCode}");
        }
    }
}