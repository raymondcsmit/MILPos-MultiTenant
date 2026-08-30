using System;
using System.Net;
using System.Net.Http;
using System.Net.Http.Json;
using System.Threading.Tasks;
using POS.API.Tests.Infra;
using Xunit;

namespace POS.API.Tests.D09License;

/// <summary>
/// D09 license + role-console gates. WrLicenseController has no [Authorize] and no claim — an
/// UNAUTHENTICATED client can POST /api/WrLicense/validate and receive a license/auth payload
/// for an arbitrary purchase code (N-43 routine pin). RoleUsers list/assign and UserClaim
/// writes are claimed (USR_ASSIGN_*).
/// </summary>
public sealed class LicenseAndRoleGatesTests : IClassFixture<TestWebApplicationFactory>
{
    private readonly TestWebApplicationFactory _factory;

    public LicenseAndRoleGatesTests(TestWebApplicationFactory factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task Should_ValidateLicense_When_Unauthenticated_RoutineN43()
    {
        await _factory.EnsureSeededAsync();
        var anon = _factory.CreateClient();

        var response = await anon.PostAsJsonAsync("/api/WrLicense/validate", new { purchaseCode = "DIAG-0000-0000" });
        Assert.True(
            response.IsSuccessStatusCode,
            $"license validate -> {(int)response.StatusCode} {await response.Content.ReadAsStringAsync()}");
        var body = await response.Content.ReadAsStringAsync();
        Assert.True(
            body.Contains("isAuthenticated", System.StringComparison.OrdinalIgnoreCase) && body.Contains("licenseKey", System.StringComparison.OrdinalIgnoreCase),
            $"license body did not carry the auth envelope: {body}");
        Assert.Contains("true", body, System.StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task Should_GateRoleAssignments_And_UserPermissions_By_Claim()
    {
        await _factory.EnsureSeededAsync();
        var no = await _factory.CreateAuthorizedClientAsync(TestSeed.NoClaimsEmail, TestSeed.NoClaimsPassword);
        var admin = await _factory.CreateAuthorizedClientAsync(TestSeed.AdminEmail, TestSeed.AdminPassword);

        Assert.Equal(HttpStatusCode.Forbidden, (await no.GetAsync($"/api/RoleUsers/{TestIds.AdminRoleId}")).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await no.PutAsJsonAsync($"/api/RoleUsers/{TestIds.AdminRoleId}", new { })).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await no.PutAsJsonAsync($"/api/UserClaim/{TestIds.NoClaimsUserId}", new { })).StatusCode);

        Assert.True((await admin.GetAsync($"/api/RoleUsers/{TestIds.AdminRoleId}")).IsSuccessStatusCode, "admin RoleUsers list should be claim-gated 200");
    }
}