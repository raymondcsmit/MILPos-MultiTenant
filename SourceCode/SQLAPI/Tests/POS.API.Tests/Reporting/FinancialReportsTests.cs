using System;
using System.Linq;
using System.Net.Http;
using System.Net.Http.Json;
using System.Text.Json;
using System.Threading.Tasks;
using POS.API.Tests.Infra;
using Xunit;

namespace POS.API.Tests.Reporting;

/// <summary>
/// WF-7.1 financial reports over a hand-computed journal scenario:
///   POS cash sale 2 × P-A @100 + GST-17 = 234 (Dr AR 200, Dr AR 34, Dr COGS 120, Cr Sales 200,
///   Cr GST 34, Cr Inventory 120, Dr Cash 234 / Cr AR 234)
///   PO 1 × P-B @30, no tax (Dr Inventory 30 / Cr AP 30), paid 30 (Dr AP 30 / Cr Cash 30).
/// Expected: ΣDr = ΣCr = 644 · Sales 200 Cr · COGS 120 Dr · Cash net Dr 204 · NetResult 80 "Profit".
/// </summary>
public sealed class FinancialReportsTests : IClassFixture<TestWebApplicationFactory>
{
    private readonly TestWebApplicationFactory _factory;

    public FinancialReportsTests(TestWebApplicationFactory factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task Should_BalanceAndReflectSeededJournals_When_ReportsAreQueried()
    {
        await _factory.EnsureSeededAsync();
        var client = await _factory.CreateAuthorizedClientAsync(TestSeed.AdminEmail, TestSeed.AdminPassword);

        // --- Seed scenario through the real API ---
        var sale = new
        {
            orderNumber = $"SO-RPT-{Guid.NewGuid():N}"[..21],
            isSalesOrderRequest = false,
            isPOSScreenOrder = true,
            customerId = TestIds.WalkInCustomerId,
            locationId = TestIds.LocationL1Id,
            paymentMethod = 1,
            totalAmount = 234.00m,
            totalTax = 34.00m,
            totalDiscount = 0m,
            totalRoundOff = 0m,
            flatDiscount = 0m,
            soCreatedDate = DateTime.UtcNow,
            deliveryDate = DateTime.UtcNow,
            salesOrderItems = new object[]
            {
                new
                {
                    productId = TestIds.ProductPcMonitorId,
                    quantity = 2m,
                    unitPrice = 100.00m,
                    unitId = TestIds.UnitPcId,
                    discountType = "fixed",
                    discountPercentage = 0m,
                    salesOrderItemTaxes = new object[] { new { taxId = TestIds.TaxGst17Id } }
                }
            }
        };
        var saleResponse = await client.PostAsJsonAsync("/api/salesOrder", sale);
        Assert.True(saleResponse.IsSuccessStatusCode, await saleResponse.Content.ReadAsStringAsync());

        var purchase = new
        {
            orderNumber = $"PO-RPT-{Guid.NewGuid():N}"[..21],
            isPurchaseOrderRequest = false,
            supplierId = TestIds.SupplierS1Id,
            locationId = TestIds.LocationL1Id,
            totalAmount = 30.00m,
            totalTax = 0m,
            totalDiscount = 0m,
            totalRoundOff = 0m,
            poCreatedDate = DateTime.UtcNow,
            deliveryDate = DateTime.UtcNow,
            purchaseOrderItems = new object[]
            {
                new
                {
                    productId = TestIds.ProductNoTaxId,
                    quantity = 1m,
                    unitPrice = 30.00m,
                    unitId = TestIds.UnitPcId,
                    discountType = "fixed",
                    discountPercentage = 0m,
                    purchaseOrderItemTaxes = Array.Empty<object>()
                }
            }
        };
        var poResponse = await client.PostAsJsonAsync("/api/purchaseOrder", purchase);
        Assert.True(poResponse.IsSuccessStatusCode, await poResponse.Content.ReadAsStringAsync());
        var poId = JsonDocument.Parse(await poResponse.Content.ReadAsStringAsync())
            .RootElement.GetProperty("id").GetGuid();

        var pay = await client.PostAsJsonAsync("/api/purchaseOrderPayment", new
        {
            purchaseOrderId = poId,
            amount = 30.00m,
            paymentMethod = 1,
            paymentDate = DateTime.UtcNow
        });
        Assert.True(pay.IsSuccessStatusCode, await pay.Content.ReadAsStringAsync());

        // --- Trial balance ---
        var tb = await client.GetFromJsonAsync<JsonElement>(
            $"/api/reports/trialbalancereport?FromDate={(DateTime.UtcNow.AddDays(-1)):O}&ToDate={(DateTime.UtcNow.AddDays(1)):O}");
        Assert.Equal(648.00m, tb.GetProperty("debitTotalAmount").GetDecimal());
        Assert.Equal(648.00m, tb.GetProperty("creditTotalAmount").GetDecimal());

        var accounts = tb.GetProperty("trialBalanceAccounts");
        AssertAccount(accounts, "Sales Revenue", credit: 200.00m);
        AssertAccount(accounts, "Cost of Goods Sold", debit: 120.00m);
        AssertAccount(accounts, "Cash", debit: 234.00m, credit: 30.00m);

        // --- P&L (REP-01 context: no 5300 expense rows in this scenario) ---
        var pl = await client.GetFromJsonAsync<JsonElement>(
            $"/api/reports/ProfitLoss?FinancialYearId={TestIds.FinancialYear2026Id}");
        Assert.Equal(200.00m, pl.GetProperty("salesRevenue").GetDecimal());
        Assert.Equal(120.00m, pl.GetProperty("cogs").GetDecimal());
        Assert.Equal(80.00m, pl.GetProperty("grossProfit").GetDecimal());
        Assert.Equal(80.00m, pl.GetProperty("netResult").GetDecimal());
        Assert.Equal("Profit", pl.GetProperty("profitOrLoss").GetString());

        // --- Balance sheet identity: Assets == Liabilities + Equity ---
        var bs = await client.GetFromJsonAsync<JsonElement>(
            $"/api/reports/balancesheetreport?FinancialYearId={TestIds.FinancialYear2026Id}");
        var assets = bs.GetProperty("totalAssets").GetDecimal();
        var liabilities = bs.GetProperty("totalLiabilities").GetDecimal();
        var equity = bs.GetProperty("totalEquity").GetDecimal();
        Assert.Equal(assets, liabilities + equity);

        // --- Cash & bank ---
        var cb = await client.GetFromJsonAsync<JsonElement>(
            $"/api/reports/cashbankreport?FinancialYearId={TestIds.FinancialYear2026Id}");
        Assert.Equal(204.00m, cb.GetProperty("cashTotal").GetDecimal());
        Assert.Equal(0.00m, cb.GetProperty("bankTotal").GetDecimal());
    }

    private static void AssertAccount(JsonElement accounts, string name, decimal debit = -1m, decimal credit = -1m)
    {
        var match = accounts.EnumerateArray()
            .FirstOrDefault(a => a.GetProperty("accountName").GetString() == name);
        Assert.False(match.ValueKind == JsonValueKind.Undefined, $"Account '{name}' missing from trial balance");

        if (debit >= 0)
        {
            Assert.Equal(debit, match.GetProperty("debitAmount").GetDecimal());
        }
        if (credit >= 0)
        {
            Assert.Equal(credit, match.GetProperty("creditAmount").GetDecimal());
        }
    }
}

