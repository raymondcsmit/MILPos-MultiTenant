using System;
using System.Linq;
using System.Net;
using System.Net.Http;
using System.Net.Http.Json;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using POS.API.Tests.Infra;
using POS.Data;
using Xunit;

namespace POS.API.Tests.D09SysAdmin;

/// <summary>
/// D09 sysadmin console: login audits are written on login and listed under
/// LOGS_VIEW_LOGIN_AUDITS; users/roles are created under USR_*/ROLES_* claims with
/// 409 on duplicate emails/roles; the management-console lists (Action, Page, Role,
/// RoleUsers) are unclaimed (Gap-Char).
/// </summary>
public sealed class AdminSecurityTests : IClassFixture<TestWebApplicationFactory>
{
    private readonly TestWebApplicationFactory _factory;

    public AdminSecurityTests(TestWebApplicationFactory factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task Should_WatchLoginAudit_When_Claimed()
    {
        await _factory.EnsureSeededAsync();

        var before = await _factory.UsingDbAsync(db =>
            db.Set<LoginAudit>().CountAsync());

        await _factory.GetTokenAsync(TestSeed.NoClaimsEmail, TestSeed.NoClaimsPassword);

        var after = await _factory.UsingDbAsync(db =>
            db.Set<LoginAudit>().CountAsync());
        Assert.True(after > before, $"expected a new login audit row ({before} -> {after})");

        var client = await _factory.CreateAuthorizedClientAsync(TestSeed.AdminEmail, TestSeed.AdminPassword);
        var response = await client.GetAsync("/api/LoginAudit");
        Assert.True(response.IsSuccessStatusCode, $"list -> {(int)response.StatusCode} {await response.Content.ReadAsStringAsync()}");

        var no = await _factory.CreateAuthorizedClientAsync(TestSeed.NoClaimsEmail, TestSeed.NoClaimsPassword);
        Assert.Equal(HttpStatusCode.Forbidden, (await no.GetAsync("/api/LoginAudit")).StatusCode);
    }

    [Fact]
    public async Task Should_AddUser_And_RejectDuplicateEmail()
    {
        await _factory.EnsureSeededAsync();
        var client = await _factory.CreateAuthorizedClientAsync(TestSeed.AdminEmail, TestSeed.AdminPassword);

        var email = $"ops_{Guid.NewGuid():N}@miltest.local";
        var add = await client.PostAsJsonAsync("/api/User", new
        {
            userName = email,
            email,
            firstName = "Ops",
            lastName = "Tester",
            password = "M!lPass123",
            phoneNumber = "03001112233",
            isActive = true,
            isAllLocations = true,
            roleIds = new[] { TestIds.AdminRoleId }
        });
        Assert.True(add.IsSuccessStatusCode, $"add -> {(int)add.StatusCode} {await add.Content.ReadAsStringAsync()}");

        var duplicate = await client.PostAsJsonAsync("/api/User", new
        {
            userName = email,
            email,
            firstName = "Ops",
            lastName = "Tester",
            password = "M!lPass123",
            isActive = true
        });
        Assert.Equal(HttpStatusCode.Conflict, duplicate.StatusCode);

        await _factory.UsingDbAsync(db =>
        {
            Assert.NotNull(db.Set<User>().IgnoreQueryFilters().FirstOrDefault(u => u.Email == email));
            return Task.CompletedTask;
        });
    }

    [Fact]
    public async Task Should_ListUsersAnd403_Without_Claim()
    {
        await _factory.EnsureSeededAsync();
        var no = await _factory.CreateAuthorizedClientAsync(TestSeed.NoClaimsEmail, TestSeed.NoClaimsPassword);

        Assert.Equal(HttpStatusCode.Forbidden, (await no.GetAsync("/api/User/GetUsers")).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await no.PostAsJsonAsync("/api/User", new { userName = "x", email = "x", password = "x", isActive = true })).StatusCode);

        var admin = await _factory.CreateAuthorizedClientAsync(TestSeed.AdminEmail, TestSeed.AdminPassword);
        Assert.True((await admin.GetAsync("/api/User/GetUsers")).IsSuccessStatusCode);
        Assert.True((await no.GetAsync("/api/User/GetAllUsers")).IsSuccessStatusCode);
    }

    [Fact]
    public async Task Should_AddRole_And_RejectDuplicateName()
    {
        await _factory.EnsureSeededAsync();
        var client = await _factory.CreateAuthorizedClientAsync(TestSeed.AdminEmail, TestSeed.AdminPassword);

        var add = await client.PostAsJsonAsync("/api/Role", new
        {
            name = "Auditor Test",
            tenantId = TestIds.TenantAId,
            isSuperRole = false,
            roleClaims = Array.Empty<object>()
        });
        Assert.True(add.IsSuccessStatusCode, $"add -> {(int)add.StatusCode} {await add.Content.ReadAsStringAsync()}");

        var duplicate = await client.PostAsJsonAsync("/api/Role", new
        {
            name = "Auditor Test",
            tenantId = TestIds.TenantAId,
            isSuperRole = false,
            roleClaims = Array.Empty<object>()
        });
        Assert.Equal(HttpStatusCode.Conflict, duplicate.StatusCode);
    }

    [Fact]
    public async Task Should_Return403_When_ManagingRolesWithoutClaim()
    {
        await _factory.EnsureSeededAsync();
        var no = await _factory.CreateAuthorizedClientAsync(TestSeed.NoClaimsEmail, TestSeed.NoClaimsPassword);

        Assert.Equal(HttpStatusCode.Forbidden, (await no.PostAsJsonAsync("/api/Role", new { name = "X" })).StatusCode);
    }

    [Fact]
    public async Task Should_ServeConsoleLists_Without_Claim_GapCharacterization()
    {
        await _factory.EnsureSeededAsync();
        var no = await _factory.CreateAuthorizedClientAsync(TestSeed.NoClaimsEmail, TestSeed.NoClaimsPassword);

        foreach (var route in new[] { "/api/Action", "/api/Pages" })
        {
            var response = await no.GetAsync(route);
            Assert.True(response.IsSuccessStatusCode, $"{route} -> {(int)response.StatusCode}");
        }

        Assert.Equal(HttpStatusCode.Forbidden, (await no.GetAsync("/api/PageHelper")).StatusCode);
        var admin = await _factory.CreateAuthorizedClientAsync(TestSeed.AdminEmail, TestSeed.AdminPassword);
        Assert.True((await admin.GetAsync("/api/PageHelper")).IsSuccessStatusCode);
    }
}