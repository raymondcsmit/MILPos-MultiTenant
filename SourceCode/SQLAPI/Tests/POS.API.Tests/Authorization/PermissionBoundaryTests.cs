using System;
using System.Net;
using System.Net.Http;
using System.Net.Http.Json;
using System.Threading.Tasks;
using POS.API.Tests.Infra;
using Xunit;

namespace POS.API.Tests.Authorization;

/// <summary>
/// WF-1.1 / Chain 2 — the [Authorize] + [ClaimCheck] permission boundary through real middleware.
/// TC-D01 permission cases.
/// </summary>
public sealed class PermissionBoundaryTests : IClassFixture<TestWebApplicationFactory>
{
    private readonly TestWebApplicationFactory _factory;

    public PermissionBoundaryTests(TestWebApplicationFactory factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task Should_Return401_When_NoTokenIsPresented()
    {
        await _factory.EnsureSeededAsync();
        var client = _factory.CreateClient();

        var response = await client.GetAsync("/api/salesOrder");
        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task Should_Return403_When_TokenLacksRequiredClaim()
    {
        await _factory.EnsureSeededAsync();
        // User with zero claims must be rejected by ClaimCheck("SO_VIEW_SALES_ORDERS", ...).
        var client = await _factory.CreateAuthorizedClientAsync(TestSeed.NoClaimsEmail, TestSeed.NoClaimsPassword);

        var response = await client.GetAsync("/api/salesOrder");
        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task Should_AllowAdmin_When_AllClaimsGranted()
    {
        await _factory.EnsureSeededAsync();
        var client = await _factory.CreateAuthorizedClientAsync(TestSeed.AdminEmail, TestSeed.AdminPassword);

        var response = await client.GetAsync("/api/salesOrder");
        Assert.True(response.IsSuccessStatusCode,
            $"Admin with claims should pass ClaimCheck but got {(int)response.StatusCode}");
    }
}
