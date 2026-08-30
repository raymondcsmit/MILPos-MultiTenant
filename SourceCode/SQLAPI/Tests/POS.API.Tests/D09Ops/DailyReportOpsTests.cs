using System;
using System.Net;
using System.Net.Http;
using System.Net.Http.Json;
using System.Threading.Tasks;
using POS.API.Tests.Infra;
using Xunit;

namespace POS.API.Tests.D09Ops;

/// <summary>
/// D09 ops: the accounting transaction list is gated by ACCOUNTING_VIEW_TRANSACTIONS;
/// the D07 daily sale/purchase/payment reports are reachable by any authenticated user
/// (no [ClaimCheck] — Gap-Char); the NLog frontend-logger POST is unclaimed while reads
/// are gated by LOGS_VIEW_ERROR_LOGS.
/// </summary>
public sealed class DailyReportOpsTests : IClassFixture<TestWebApplicationFactory>
{
    private readonly TestWebApplicationFactory _factory;

    public DailyReportOpsTests(TestWebApplicationFactory factory)
    {
        _factory = factory;
    }

    private const string DateParam = "2026-08-30T00:00:00.000Z";

    [Fact]
    public async Task Should_ListTransactions_When_Claimed_And_403Without()
    {
        await _factory.EnsureSeededAsync();
        var admin = await _factory.CreateAuthorizedClientAsync(TestSeed.AdminEmail, TestSeed.AdminPassword);
        var no = await _factory.CreateAuthorizedClientAsync(TestSeed.NoClaimsEmail, TestSeed.NoClaimsPassword);

        var url = $"/api/Transaction?branchId={TestIds.LocationL1Id}&financialYearId={TestIds.FinancialYear2026Id}&pageNumber=1&pageSize=10";
        var listed = await admin.GetAsync(url);
        Assert.True(listed.IsSuccessStatusCode, $"admin -> {(int)listed.StatusCode} {await listed.Content.ReadAsStringAsync()}");

        Assert.Equal(HttpStatusCode.Forbidden, (await no.GetAsync(url)).StatusCode);
    }

    [Fact]
    public async Task Should_ServeDailyReports_Without_Claim_GapCharacterization()
    {
        await _factory.EnsureSeededAsync();
        var no = await _factory.CreateAuthorizedClientAsync(TestSeed.NoClaimsEmail, TestSeed.NoClaimsPassword);

        foreach (var route in new[] { "sale", "purchase", "payment" })
        {
            var response = await no.GetAsync($"/api/DailyReport/{route}?timeZone=Pakistan%20Standard%20Time&dailyReportDate={DateParam}");
            Assert.True(response.IsSuccessStatusCode, $"{route} -> {(int)response.StatusCode} {await response.Content.ReadAsStringAsync()}");
        }
    }

    [Fact]
    public async Task Should_LogFrontendError_Without_Claim_And_List_When_Claimed()
    {
        await _factory.EnsureSeededAsync();
        var no = await _factory.CreateAuthorizedClientAsync(TestSeed.NoClaimsEmail, TestSeed.NoClaimsPassword);
        var admin = await _factory.CreateAuthorizedClientAsync(TestSeed.AdminEmail, TestSeed.AdminPassword);

        var logged = await no.PostAsJsonAsync("/api/NLog", new { errorMessage = "client-side diag error", stack = "no stack" });
        Assert.True(logged.IsSuccessStatusCode, $"post -> {(int)logged.StatusCode} {await logged.Content.ReadAsStringAsync()}");

        Assert.Equal(HttpStatusCode.Forbidden, (await no.GetAsync("/api/NLog?pageNumber=1&pageSize=10")).StatusCode);
        Assert.True((await admin.GetAsync("/api/NLog?pageNumber=1&pageSize=10")).IsSuccessStatusCode);
    }
}