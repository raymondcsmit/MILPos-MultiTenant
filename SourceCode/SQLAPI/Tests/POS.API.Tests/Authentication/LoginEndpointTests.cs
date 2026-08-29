using System;
using System.Net;
using System.Net.Http;
using System.Net.Http.Json;
using System.Text.Json;
using System.Threading.Tasks;
using POS.API.Tests.Infra;
using Xunit;

namespace POS.API.Tests.Authentication;

/// <summary>
/// WF-1.1 login pipeline — proves the test infrastructure can authenticate through the real endpoint.
/// TC-D01.001 (happy login), TC-D01.00x (wrong password 401).
/// </summary>
public sealed class LoginEndpointTests : IClassFixture<TestWebApplicationFactory>
{
    private readonly TestWebApplicationFactory _factory;

    public LoginEndpointTests(TestWebApplicationFactory factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task Should_ReturnTokenAndClaims_When_AdminCredentialsAreValid()
    {
        await _factory.EnsureSeededAsync();
        var client = _factory.CreateClient().AddForwardedIpHeader();

        var response = await client.PostAsJsonAsync("/api/authentication", new
        {
            userName = TestSeed.AdminEmail,
            password = TestSeed.AdminPassword
        });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var body = await response.Content.ReadFromJsonAsync<JsonElement>(new JsonSerializerOptions(JsonSerializerDefaults.Web));
        var token = body.GetProperty("bearerToken").GetString();
        Assert.False(string.IsNullOrWhiteSpace(token));

        // JWT must carry the tenant claim and admin claims (Chain 2 — permission chain).
        var claims = ParseClaims(token!);
        Assert.Equal(TestIds.TenantAId.ToString(), claims["tenantid"]);
        Assert.Equal("true", claims["so_add_so"]);
        Assert.Equal("true", claims["pos_pos"]);
    }

    [Fact]
    public async Task Should_Return401_When_PasswordIsWrong()
    {
        await _factory.EnsureSeededAsync();
        var client = _factory.CreateClient().AddForwardedIpHeader();

        var response = await client.PostAsJsonAsync("/api/authentication", new
        {
            userName = TestSeed.AdminEmail,
            password = "wrong-password"
        });

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task Should_Return401_When_UserIsUnknown()
    {
        await _factory.EnsureSeededAsync();
        var client = _factory.CreateClient().AddForwardedIpHeader();

        var response = await client.PostAsJsonAsync("/api/authentication", new
        {
            userName = "ghost@nowhere.local",
            password = "whatever"
        });

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    private static System.Collections.Generic.Dictionary<string, string> ParseClaims(string jwt)
    {
        var payload = jwt.Split('.')[1];
        var pad = payload.Length % 4 == 0 ? "" : new string('=', 4 - payload.Length % 4);
        var json = System.Text.Encoding.UTF8.GetString(Convert.FromBase64String(payload + pad));
        using var doc = JsonDocument.Parse(json);
        var result = new System.Collections.Generic.Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
        foreach (var claim in doc.RootElement.EnumerateObject())
        {
            result[claim.Name] = claim.Value.ToString();
        }
        return result;
    }
}

