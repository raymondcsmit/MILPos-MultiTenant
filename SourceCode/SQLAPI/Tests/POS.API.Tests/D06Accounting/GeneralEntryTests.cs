using System;
using System.Linq;
using System.Net.Http;
using System.Net.Http.Json;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using POS.API.Tests.Infra;
using POS.Data.Entities;
using POS.Data.Entities.Accounts;
using Xunit;

namespace POS.API.Tests.D06Accounting;

/// <summary>
/// D06 general entry: a direct entry posts a Transaction (DirectEntry) with a balanced
/// AccountingEntry pair into the seeded 2026 financial year and shows up on the Transaction
/// AND general-entry report surfaces.
/// </summary>
public sealed class GeneralEntryTests : IClassFixture<TestWebApplicationFactory>
{
    private readonly TestWebApplicationFactory _factory;

    public GeneralEntryTests(TestWebApplicationFactory factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task Should_PostDirectEntry_And_CreateTransactionWithBalancedEntry()
    {
        await _factory.EnsureSeededAsync();
        var client = await _factory.CreateAuthorizedClientAsync(TestSeed.AdminEmail, TestSeed.AdminPassword);

        var reference = $"GE-{Guid.NewGuid():N}"[..16];
        var response = await client.PostAsJsonAsync("/api/GeneralEntry", new
        {
            branchId = TestIds.LocationL1Id,
            transitionDate = new DateTime(2026, 8, 1, 10, 0, 0, DateTimeKind.Utc),
            narration = "Capital injection",
            debitLedgerAccountId = TestIds.LedgerCashId,
            creditLedgerAccountId = TestIds.LedgerExpenseId,
            amount = 250.00m,
            referenceNumber = reference
        });
        Assert.True(response.IsSuccessStatusCode, await response.Content.ReadAsStringAsync());

        await _factory.UsingDbAsync(async db =>
        {
            var tx = await db.Set<Transaction>().AsNoTracking()
                .SingleAsync(t => t.TransactionNumber == reference);
            Assert.Equal(TransactionType.DirectEntry, tx.TransactionType);
            Assert.Equal(250.00m, tx.TotalAmount);
            Assert.Equal(TestIds.FinancialYear2026Id, tx.FinancialYearId);

var entries = await db.Set<AccountingEntry>().AsNoTracking()
                .Where(e => e.TransactionId == tx.Id).ToListAsync();
            Assert.True(entries.Count == 1,
                $"entry rows: {string.Join(", ", entries.Select(e => $"{e.DebitLedgerAccountId}|{e.CreditLedgerAccountId}|{e.Amount}"))}");
            Assert.True(entries.Any(e => e.DebitLedgerAccountId == TestIds.LedgerCashId && e.Amount == 250.00m));
            Assert.True(entries.Any(e => e.CreditLedgerAccountId == TestIds.LedgerExpenseId && e.Amount == 250.00m));
        });
    }

    [Fact]
    public async Task Should_ListTransaction_When_ViewClaim()
    {
        await _factory.EnsureSeededAsync();
        var client = await _factory.CreateAuthorizedClientAsync(TestSeed.AdminEmail, TestSeed.AdminPassword);

        var response = await client.GetAsync(
            "/api/Transaction?fromDate=2026-01-01&toDate=2026-12-31&pageSize=20");

        Assert.True(response.IsSuccessStatusCode, await response.Content.ReadAsStringAsync());
        Assert.Contains("transactionNumber", await response.Content.ReadAsStringAsync());
    }

    [Fact]
    public async Task Should_ServeGeneralEntryReport_When_Claimed()
    {
        await _factory.EnsureSeededAsync();
        var client = await _factory.CreateAuthorizedClientAsync(TestSeed.AdminEmail, TestSeed.AdminPassword);

        (await client.PostAsJsonAsync("/api/GeneralEntry", new
        {
            branchId = TestIds.LocationL1Id,
            transitionDate = new DateTime(2026, 8, 15, 0, 0, 0, DateTimeKind.Utc),
            narration = "Office rent adjustment",
            debitLedgerAccountId = TestIds.LedgerExpenseId,
            creditLedgerAccountId = TestIds.LedgerCashId,
            amount = 50.00m,
            referenceNumber = $"GE-RPT-{Guid.NewGuid():N}"[..15]
        })).EnsureSuccessStatusCode();

        var report = await client.GetAsync("/api/Reports?fromDate=2026-01-01&toDate=2026-12-31&pageSize=50");
        Assert.True(report.IsSuccessStatusCode, await report.Content.ReadAsStringAsync());
        Assert.Contains("GE-RPT", await report.Content.ReadAsStringAsync());
    }
}