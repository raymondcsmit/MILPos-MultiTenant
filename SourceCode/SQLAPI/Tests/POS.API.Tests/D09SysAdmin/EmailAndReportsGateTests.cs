using System;
using System.Net;
using System.Net.Http.Json;
using System.Threading.Tasks;
using POS.API.Tests.Infra;
using Xunit;

namespace POS.API.Tests.D09SysAdmin;

/// <summary>
/// Verifies security hardening and ClaimCheck authorization gates on Email, Reports,
/// and CustomerLedger controllers (BUG-17 / N-02 and BUG-18 / N-03 & N-07).
/// </summary>
public sealed class EmailAndReportsGateTests : IClassFixture<TestWebApplicationFactory>
{
    private readonly TestWebApplicationFactory _factory;

    public EmailAndReportsGateTests(TestWebApplicationFactory factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task Should_Return401_When_PaymentReportRequestedUnauthenticated_GapTargetFixed()
    {
        await _factory.EnsureSeededAsync();
        var client = _factory.CreateClient();

        var response = await client.GetAsync("/api/Reports/Paymentreport");

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task Should_Return403_When_PaymentReportRequestedWithoutClaim_GapTargetFixed()
    {
        await _factory.EnsureSeededAsync();
        var client = await _factory.CreateAuthorizedClientAsync(TestSeed.NoClaimsEmail, TestSeed.NoClaimsPassword);

        var response = await client.GetAsync("/api/Reports/Paymentreport");

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task Should_Return401_When_SendSalesOrPurchaseUnauthenticated_GapTargetFixed()
    {
        await _factory.EnsureSeededAsync();
        var client = _factory.CreateClient();

        var response = await client.PostAsJsonAsync("/api/Email/salesOrPurchase", new
        {
            subject = "Test Invoice",
            body = "Please find attached."
        });

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task Should_Return403_When_SendSalesOrPurchaseWithoutClaim_GapTargetFixed()
    {
        await _factory.EnsureSeededAsync();
        var client = await _factory.CreateAuthorizedClientAsync(TestSeed.NoClaimsEmail, TestSeed.NoClaimsPassword);

        var response = await client.PostAsJsonAsync("/api/Email/salesOrPurchase", new
        {
            subject = "Test Invoice",
            body = "Please find attached."
        });

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task Should_Return401_When_CustomerLedgerMutatedUnauthenticated_GapTargetFixed()
    {
        await _factory.EnsureSeededAsync();
        var client = _factory.CreateClient();

        var response = await client.DeleteAsync($"/api/CustomerLedger/{Guid.NewGuid()}");

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }
}
