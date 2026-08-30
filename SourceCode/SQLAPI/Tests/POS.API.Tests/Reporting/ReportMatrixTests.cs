using System.Net;
using System.Net.Http;
using System.Net.Http.Json;
using System.Threading.Tasks;
using POS.API.Tests.Infra;
using Xunit;

namespace POS.API.Tests.Reporting;

/// <summary>
/// WF-7.1 report-endpoint matrix: every Accounting report route is claim-gated and serves 200 for a
/// claim-bearing admin over the balanced seed journals (FinancialReportsTests owns the golden numbers).
/// Also gates the D06 journal-entry surface (GeneralEntry POST / Transaction GET).
/// </summary>
public sealed class ReportMatrixTests : IClassFixture<TestWebApplicationFactory>
{
    private readonly TestWebApplicationFactory _factory;

    public ReportMatrixTests(TestWebApplicationFactory factory)
    {
        _factory = factory;
    }

    [Theory]
    [InlineData("/api/Reports/ProfitLoss?financialYearId=eeeeeeee-1111-1111-1111-111111111111")]
    [InlineData("/api/Reports/taxreport?financialYearId=eeeeeeee-1111-1111-1111-111111111111")]
    [InlineData("/api/Reports/cashbankreport?financialYearId=eeeeeeee-1111-1111-1111-111111111111")]
    [InlineData("/api/Reports/balancesheetreport?financialYearId=eeeeeeee-1111-1111-1111-111111111111")]
    [InlineData("/api/Reports/AccountBalancereport?financialYearId=eeeeeeee-1111-1111-1111-111111111111")]
    [InlineData("/api/Reports/trialbalancereport?financialYearId=eeeeeeee-1111-1111-1111-111111111111")]
    [InlineData("/api/Reports/cashflowreport?financialYearId=eeeeeeee-1111-1111-1111-111111111111")]
    [InlineData("/api/Reports?fromDate=2026-01-01&toDate=2026-12-31")]
    public async Task Should_ServeReport_When_HasReportClaim(string url)
    {
        await _factory.EnsureSeededAsync();
        var client = await _factory.CreateAuthorizedClientAsync(TestSeed.AdminEmail, TestSeed.AdminPassword);

        var response = await client.GetAsync(url);
        Assert.True(response.IsSuccessStatusCode, $"{url} -> {(int)response.StatusCode} {await response.Content.ReadAsStringAsync()}");
    }

    [Theory]
    [InlineData("/api/Reports/ProfitLoss?financialYearId=eeeeeeee-1111-1111-1111-111111111111")]
    [InlineData("/api/Reports/taxreport?financialYearId=eeeeeeee-1111-1111-1111-111111111111")]
    [InlineData("/api/Reports/cashbankreport?financialYearId=eeeeeeee-1111-1111-1111-111111111111")]
    [InlineData("/api/Reports/balancesheetreport?financialYearId=eeeeeeee-1111-1111-1111-111111111111")]
    [InlineData("/api/Reports/AccountBalancereport?financialYearId=eeeeeeee-1111-1111-1111-111111111111")]
    [InlineData("/api/Reports/trialbalancereport?financialYearId=eeeeeeee-1111-1111-1111-111111111111")]
    [InlineData("/api/Reports/cashflowreport?financialYearId=eeeeeeee-1111-1111-1111-111111111111")]
    [InlineData("/api/Reports?fromDate=2026-01-01&toDate=2026-12-31")]
    public async Task Should_BlockReport_When_NoClaim(string url)
    {
        await _factory.EnsureSeededAsync();
        var client = await _factory.CreateAuthorizedClientAsync(TestSeed.NoClaimsEmail, TestSeed.NoClaimsPassword);

        var response = await client.GetAsync(url);

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Theory]
    [InlineData("/api/Reports/Paymentreport")]
    [InlineData("/api/Reports/Salesreport")]
    public async Task Should_Characterize_Report_Route_Without_Claim_Badge(string url)
    {
        await _factory.EnsureSeededAsync();
        var client = await _factory.CreateAuthorizedClientAsync(TestSeed.NoClaimsEmail, TestSeed.NoClaimsPassword);

        var response = await client.GetAsync(url);
        Assert.NotEqual(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task Should_Return403_When_AddingGeneralEntryWithoutClaim()
    {
        await _factory.EnsureSeededAsync();
        var client = await _factory.CreateAuthorizedClientAsync(TestSeed.NoClaimsEmail, TestSeed.NoClaimsPassword);

        var response = await client.PostAsJsonAsync("/api/GeneralEntry", new { });

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task Should_Return403_When_ListingTransactionsWithoutClaim()
    {
        await _factory.EnsureSeededAsync();
        var client = await _factory.CreateAuthorizedClientAsync(TestSeed.NoClaimsEmail, TestSeed.NoClaimsPassword);

        var response = await client.GetAsync("/api/Transaction");

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }
}