using System;
using System.Linq;
using System.Net;
using System.Net.Http;
using System.Net.Http.Json;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using POS.API.Tests.Infra;
using POS.Data.Entities.Accounts;
using Xunit;

namespace POS.API.Tests.D06Accounting;

/// <summary>
/// D06 financial year: a new fiscal year is created under ACCOUNTING_MANAGE_FINANCIAL_YEAR
/// and listed under ACCOUNTING_VIEW_FINANCIAL_YEARS; GET-by-id is unclaimed (Gap-Char).
/// </summary>
public sealed class FinancialYearTests : IClassFixture<TestWebApplicationFactory>
{
    private readonly TestWebApplicationFactory _factory;

    public FinancialYearTests(TestWebApplicationFactory factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task Should_AddFinancialYear_And_List_When_Claimed()
    {
        await _factory.EnsureSeededAsync();
        var client = await _factory.CreateAuthorizedClientAsync(TestSeed.AdminEmail, TestSeed.AdminPassword);

        var response = await client.PostAsJsonAsync("/api/FinancialYear", new
        {
            startDate = new DateTime(2027, 1, 1, 0, 0, 0, DateTimeKind.Utc),
            endDate = new DateTime(2027, 12, 31, 0, 0, 0, DateTimeKind.Utc),
            isClosed = false
        });
        Assert.True(response.IsSuccessStatusCode, $"add -> {(int)response.StatusCode} {await response.Content.ReadAsStringAsync()}");

        await _factory.UsingDbAsync(db =>
        {
            Assert.True(db.Set<FinancialYear>().Any(f => f.StartDate.Year == 2027 && !f.IsDeleted));
            return Task.CompletedTask;
        });

        var list = await client.GetAsync("/api/FinancialYear");
        Assert.True(list.IsSuccessStatusCode, $"list -> {(int)list.StatusCode} {await list.Content.ReadAsStringAsync()}");
        Assert.Contains("2027", await list.Content.ReadAsStringAsync());
    }

    [Fact]
    public async Task Should_Return403_When_ManagingFinancialYearWithoutClaim()
    {
        await _factory.EnsureSeededAsync();
        var client = await _factory.CreateAuthorizedClientAsync(TestSeed.NoClaimsEmail, TestSeed.NoClaimsPassword);

        Assert.Equal(HttpStatusCode.Forbidden, (await client.GetAsync("/api/FinancialYear")).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await client.PostAsJsonAsync("/api/FinancialYear", new { })).StatusCode);
    }
}