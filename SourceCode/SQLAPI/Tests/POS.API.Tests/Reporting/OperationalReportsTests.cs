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
/// WF-7.2 operational reports over a hand-computed scenario (same fixture math as FinancialReportsTests):
/// POS cash sale 2 × P-A @100 + GST-17 = 234 (Output GST 34, TaxEntries Output) · PO 1 × P-B @30 no tax ·
/// PO payment 30 (+ sale auto-payment 234).
/// </summary>
public sealed class OperationalReportsTests : IClassFixture<TestWebApplicationFactory>
{
    private readonly TestWebApplicationFactory _factory;

    public OperationalReportsTests(TestWebApplicationFactory factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task Should_ReflectSeededDocuments_When_OperationalReportsAreQueried()
    {
        await _factory.EnsureSeededAsync();
        var client = await _factory.CreateAuthorizedClientAsync(TestSeed.AdminEmail, TestSeed.AdminPassword);

        // --- Seed: one POS sale (with GST) and one paid purchase (no tax) ---
        var sale = new
        {
            orderNumber = $"SO-OPR-{Guid.NewGuid():N}"[..21],
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

        var po = new
        {
            orderNumber = $"PO-OPR-{Guid.NewGuid():N}"[..21],
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
        var poResponse = await client.PostAsJsonAsync("/api/purchaseOrder", po);
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

        // --- Tax report: Output GST 34 from the sale's TaxEntries; no input GST (PO had no tax) ---
        var tax = await client.GetFromJsonAsync<JsonElement>(
            $"/api/reports/taxreport?FinancialYearId={TestIds.FinancialYear2026Id}");
        Assert.Equal(34.00m, tax.GetProperty("outputGstTotal").GetDecimal());
        Assert.Equal(0.00m, tax.GetProperty("inputGstTotal").GetDecimal());
        Assert.Equal(34.00m, tax.GetProperty("netTaxPayable").GetDecimal());

        // --- Daily sale report: one sale, 2 items sold ---
        // Handler semantics (verified): GrossSales = pre-tax subtotal (AR ledger net of tax entries).
        var dailySale = await client.GetFromJsonAsync<JsonElement>(
            $"/api/dailyReport/sale?TimeZone=UTC&DailyReportDate={(DateTime.UtcNow.Date):O}");
        Assert.Equal(1, dailySale.GetProperty("transactionCount").GetInt32());
        Assert.Equal(200.00m, dailySale.GetProperty("grossSales").GetDecimal());
        Assert.Equal(34.00m, dailySale.GetProperty("totalTax").GetDecimal());
        // Handler counts item ROWS, not sold units (2 units on one line = 1).
        Assert.Equal(1, dailySale.GetProperty("itemsSoldCount").GetInt32());
        // AverageSale is net-of-tax based (234 = TotalAmount / transaction count).
        Assert.Equal(234.00m, dailySale.GetProperty("averageSale").GetDecimal());

        // --- Payment report (GET, paged): 234 (sale auto-payment) + 30 (PO payment) = 264 ---
        var payments = await client.GetAsync("/api/reports/Paymentreport?pageSize=50");
        Assert.True(payments.IsSuccessStatusCode, await payments.Content.ReadAsStringAsync());
        var paymentsJson = JsonDocument.Parse(await payments.Content.ReadAsStringAsync());
        var paymentTotal = paymentsJson.RootElement.EnumerateArray()
            .Sum(p => p.GetProperty("amount").GetDecimal());
        Assert.Equal(264.00m, paymentTotal);
    }
}
