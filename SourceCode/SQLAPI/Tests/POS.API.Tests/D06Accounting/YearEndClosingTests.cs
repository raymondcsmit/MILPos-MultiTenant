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
/// D06 year-end closing: POST /api/YearEndClosing runs under the ACCOUNTING_VIEW_BOOK_CLOSE claim and
/// transitions the financial year to closed. Own fixture so closing 2026 cannot leak into the other
/// classes' report scenarios.
/// </summary>
public sealed class YearEndClosingTests : IClassFixture<TestWebApplicationFactory>
{
    private readonly TestWebApplicationFactory _factory;

    public YearEndClosingTests(TestWebApplicationFactory factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task Should_CloseFinancialYear_When_Claimed()
    {
        await _factory.EnsureSeededAsync();
        var client = await _factory.CreateAuthorizedClientAsync(TestSeed.AdminEmail, TestSeed.AdminPassword);

        var response = await client.PostAsJsonAsync("/api/YearEndClosing", new { });

        Assert.True(response.IsSuccessStatusCode, await response.Content.ReadAsStringAsync());

        await _factory.UsingDbAsync(async db =>
        {
            var fy = await db.Set<FinancialYear>().AsNoTracking().SingleAsync(f => f.Id == TestIds.FinancialYear2026Id);
            Assert.True(fy.IsClosed);
        });
    }

    [Fact]
    public async Task Should_Return403_When_ClosingYearWithoutClaim()
    {
        await _factory.EnsureSeededAsync();
        var client = await _factory.CreateAuthorizedClientAsync(TestSeed.NoClaimsEmail, TestSeed.NoClaimsPassword);

        var response = await client.PostAsJsonAsync("/api/YearEndClosing", new { });

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }
}