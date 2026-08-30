using System;
using System.Net;
using System.Net.Http;
using System.Net.Http.Json;
using System.Threading.Tasks;
using POS.API.Tests.Infra;
using Xunit;

namespace POS.API.Tests.D02Search;

/// <summary>
/// D02/D04/D05/D06 search + ops gates: customer/supplier search, inventory batches and
/// transaction items are [Authorize]-only (any authenticated user reaches them — Gap-Char),
/// dashboard aggregates are claimed per-endpoint, and loan/payroll management is claimed.
/// </summary>
public sealed class SearchDashboardGatesTests : IClassFixture<TestWebApplicationFactory>
{
    private readonly TestWebApplicationFactory _factory;

    public SearchDashboardGatesTests(TestWebApplicationFactory factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task Should_ServeSearchesAndBatches_Without_Claim_GapCharacterization()
    {
        await _factory.EnsureSeededAsync();
        var no = await _factory.CreateAuthorizedClientAsync(TestSeed.NoClaimsEmail, TestSeed.NoClaimsPassword);

        foreach (var route in new[]
                 {
                     $"/api/CustomerSearch?term=Product&pageNumber=1&pageSize=10",
                     $"/api/SupplierSearch?term=Supplier&pageNumber=1&pageSize=10",
                     $"/api/InventoryBatch/{TestIds.ProductPcMonitorId}",
                     $"/api/TransactionItem/{Guid.Empty}",
                     "/api/Dashboard/dailyreminder/6/2026"
                 })
        {
            var response = await no.GetAsync(route);
            Assert.True(response.IsSuccessStatusCode, $"{route} -> {(int)response.StatusCode} {await response.Content.ReadAsStringAsync()}");
        }
    }

    [Fact]
    public async Task Should_GateDashboardAggregates_By_Claim()
    {
        await _factory.EnsureSeededAsync();
        var no = await _factory.CreateAuthorizedClientAsync(TestSeed.NoClaimsEmail, TestSeed.NoClaimsPassword);
        var admin = await _factory.CreateAuthorizedClientAsync(TestSeed.AdminEmail, TestSeed.AdminPassword);

        Assert.Equal(HttpStatusCode.Forbidden, (await no.GetAsync("/api/Dashboard/statistics")).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await no.GetAsync("/api/Dashboard/bestsellingproduct")).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await no.GetAsync("/api/Dashboard/salesvspurchase")).StatusCode);

        foreach (var claimed in new[] { "/api/Dashboard/statistics", "/api/Dashboard/bestsellingproduct", "/api/Dashboard/salesvspurchase" })
        {
            Assert.True((await admin.GetAsync(claimed)).IsSuccessStatusCode);
        }
    }

    [Fact]
    public async Task Should_GateLoans_And_Payroll_By_Claim()
    {
        await _factory.EnsureSeededAsync();
        var no = await _factory.CreateAuthorizedClientAsync(TestSeed.NoClaimsEmail, TestSeed.NoClaimsPassword);

        Assert.Equal(HttpStatusCode.Forbidden, (await no.GetAsync("/api/Loan")).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await no.PostAsJsonAsync("/api/Loan", new
        {
            branchId = TestIds.LocationL1Id,
            loanAmount = 1000m,
            lenderName = "Bank",
            loanDate = DateTime.UtcNow,
            narration = "test",
            loanNumber = "LN-1"
        })).StatusCode);

        Assert.Equal(HttpStatusCode.Forbidden, (await no.GetAsync("/api/PayRoll")).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await no.PostAsJsonAsync("/api/PayRoll", new
        {
            employeeId = TestIds.NoClaimsUserId,
            branchId = TestIds.LocationL1Id,
            salaryMonth = 8
        })).StatusCode);
    }
}