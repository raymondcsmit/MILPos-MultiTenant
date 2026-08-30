using System.Net;
using System.Net.Http;
using System.Net.Http.Json;
using System.Threading.Tasks;
using POS.API.Tests.Infra;
using Xunit;

namespace POS.API.Tests.D05Ops;

/// <summary>
/// D05/D09 edge surface: remaining dashboard comparisons are claimed (DB_STATISTICS /
/// DB_BEST_SELLING_PROS) and servable by admin; the menu tree is MENU_VIEW_MENUS-claimed; and
/// the storefront, offline-sync status probe and table-settings reads have no claim requirement
/// (authenticated or public — Gap-Char).
/// </summary>
public sealed class MenuStoreSyncGatesTests : IClassFixture<TestWebApplicationFactory>
{
    private readonly TestWebApplicationFactory _factory;

    public MenuStoreSyncGatesTests(TestWebApplicationFactory factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task Should_ServeRemainingDashboardComparisons_To_Admin()
    {
        await _factory.EnsureSeededAsync();
        var admin = await _factory.CreateAuthorizedClientAsync(TestSeed.AdminEmail, TestSeed.AdminPassword);

        foreach (var route in new[]
                 {
                     "/api/Dashboard/income-comparison",
                     "/api/Dashboard/sales-comparison",
                     "/api/Dashboard/product-sales-comparison"
                 })
        {
            var response = await admin.GetAsync(route);
            Assert.True(response.IsSuccessStatusCode, $"{route} -> {(int)response.StatusCode} {await response.Content.ReadAsStringAsync()}");
        }
    }

    [Fact]
    public async Task Should_GateMenuTree_By_MenuClaims()
    {
        await _factory.EnsureSeededAsync();
        var no = await _factory.CreateAuthorizedClientAsync(TestSeed.NoClaimsEmail, TestSeed.NoClaimsPassword);
        var admin = await _factory.CreateAuthorizedClientAsync(TestSeed.AdminEmail, TestSeed.AdminPassword);

        Assert.Equal(HttpStatusCode.Forbidden, (await no.GetAsync("/api/MenuItems/user-menu")).StatusCode);
        Assert.True((await admin.GetAsync("/api/MenuItems/user-menu")).IsSuccessStatusCode, "admin user-menu should be 200");
    }

    [Fact]
    public async Task Should_ReachStoreSyncAndTableSettings_Without_Claim()
    {
        await _factory.EnsureSeededAsync();
        var no = await _factory.CreateAuthorizedClientAsync(TestSeed.NoClaimsEmail, TestSeed.NoClaimsPassword);
        var anon = _factory.CreateClient();

        Assert.True((await no.GetAsync("/api/TableSettings/POS_Cashier_Screen")).IsSuccessStatusCode, "table settings read should be unclaimed");

        var syncStatus = await anon.GetAsync("/api/Sync/status");
        Assert.True(syncStatus.IsSuccessStatusCode || syncStatus.StatusCode == HttpStatusCode.NotFound, $"sync status -> {(int)syncStatus.StatusCode}");

        var store = await anon.GetAsync("/store");
        Assert.True(store.IsSuccessStatusCode, $"storefront -> {(int)store.StatusCode}");
    }
}