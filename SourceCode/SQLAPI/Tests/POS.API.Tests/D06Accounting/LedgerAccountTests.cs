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
/// D06 chart of accounts: ledger accounts are created with a unique code (409 on conflict),
/// listed per branch and grouped by account type, and opening balances post into the seeded
/// financial year. The accountant claims gate each write; the dropdown is unclaimed (Gap-Char).
/// </summary>
public sealed class LedgerAccountTests : IClassFixture<TestWebApplicationFactory>
{
    private readonly TestWebApplicationFactory _factory;

    public LedgerAccountTests(TestWebApplicationFactory factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task Should_AddLedgerAccount_And_RejectDuplicateCode()
    {
        await _factory.EnsureSeededAsync();
        var client = await _factory.CreateAuthorizedClientAsync(TestSeed.AdminEmail, TestSeed.AdminPassword);

        var add = await client.PostAsJsonAsync("/api/LedgerAccount", new
        {
            accountCode = "5100-X",
            accountName = "Consultancy Income",
            accountType = 4,
            accountGroup = 6
        });
        Assert.True(add.IsSuccessStatusCode, $"add -> {(int)add.StatusCode} {await add.Content.ReadAsStringAsync()}");

        var duplicate = await client.PostAsJsonAsync("/api/LedgerAccount", new
        {
            accountCode = "5100-X",
            accountName = "Consultancy Income Clone",
            accountType = 4,
            accountGroup = 6
        });
        Assert.Equal(HttpStatusCode.Conflict, duplicate.StatusCode);

        await _factory.UsingDbAsync(db =>
        {
            Assert.True(db.Set<LedgerAccount>().Any(a => a.AccountName == "Consultancy Income" && !a.IsDeleted));
            return Task.CompletedTask;
        });
    }

    [Fact]
    public async Task Should_ListLedgerAccounts_ByBranch_And_GroupByType_When_Claimed()
    {
        await _factory.EnsureSeededAsync();
        var client = await _factory.CreateAuthorizedClientAsync(TestSeed.AdminEmail, TestSeed.AdminPassword);

        var list = await client.GetAsync($"/api/LedgerAccount/{TestIds.LocationL1Id}");
        Assert.True(list.IsSuccessStatusCode, $"list -> {(int)list.StatusCode} {await list.Content.ReadAsStringAsync()}");

        var grouped = await client.GetAsync($"/api/LedgerAccount/{TestIds.LocationL1Id}/groupby/accountType");
        Assert.True(grouped.IsSuccessStatusCode, $"groupby -> {(int)grouped.StatusCode} {await grouped.Content.ReadAsStringAsync()}");
    }

    [Fact]
    public async Task Should_AddOpeningBalance_When_Claimed()
    {
        await _factory.EnsureSeededAsync();
        var client = await _factory.CreateAuthorizedClientAsync(TestSeed.AdminEmail, TestSeed.AdminPassword);

        var response = await client.PostAsJsonAsync("/api/LedgerAccount/opening-balance", new
        {
            accountId = TestIds.LedgerBankId,
            locationId = TestIds.LocationL1Id,
            financialYearId = TestIds.FinancialYear2026Id,
            openingBalance = 5000.00m,
            type = 2
        });
        Assert.True(response.IsSuccessStatusCode, $"opening -> {(int)response.StatusCode} {await response.Content.ReadAsStringAsync()}");
    }

    [Fact]
    public async Task Should_Return403_When_ManagingLedgersWithoutClaim()
    {
        await _factory.EnsureSeededAsync();
        var client = await _factory.CreateAuthorizedClientAsync(TestSeed.NoClaimsEmail, TestSeed.NoClaimsPassword);

        Assert.Equal(HttpStatusCode.Forbidden, (await client.PostAsJsonAsync("/api/LedgerAccount", new { accountCode = "X" })).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await client.GetAsync($"/api/LedgerAccount/{TestIds.LocationL1Id}")).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await client.PostAsJsonAsync("/api/LedgerAccount/opening-balance", new { })).StatusCode);
    }

    [Fact]
    public async Task Should_ServeLedgerDropdown_Without_Claim_GapCharacterization()
    {
        await _factory.EnsureSeededAsync();
        var client = await _factory.CreateAuthorizedClientAsync(TestSeed.NoClaimsEmail, TestSeed.NoClaimsPassword);

        var response = await client.GetAsync("/api/LedgerAccount/dropdown");

        Assert.True(response.IsSuccessStatusCode, $"dropdown -> {(int)response.StatusCode} {await response.Content.ReadAsStringAsync()}");
    }
}