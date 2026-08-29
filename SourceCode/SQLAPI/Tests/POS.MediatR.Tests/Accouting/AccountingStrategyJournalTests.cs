using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Moq;
using POS.Data.Dto;
using POS.Data.Entities;
using POS.Data.Entities.Accounts;
using POS.MediatR;
using POS.MediatR.Accouting.Strategies;
using POS.Repository;
using POS.Repository.Accouting;
using Xunit;
using TaxAndLedger = POS.Data.Dto.TaxAndLedgerAccountDto;

namespace POS.MediatR.Tests.Accouting;

/// <summary>
/// WF-6.3 strategy journal-entry mappings — table-driven unit tests per the D06 catalog.
/// Gap-Char cases pin current behavior (ACC-01, ACC-02, ACC-03, ACC-07).
/// </summary>
public class AccountingStrategyJournalTests
{
    private static readonly Guid TxId = Guid.NewGuid();
    private static readonly Guid BranchId = Guid.NewGuid();
    private static readonly Guid FyId = Guid.NewGuid();

    private static readonly (string Code, Guid Id)[] Accounts =
    [
        ("1100", Guid.Parse("10000000-0000-0000-0000-000000001100")),
        ("4100", Guid.Parse("10000000-0000-0000-0000-000000004100")),
        ("2150-01", Guid.Parse("10000000-0000-0000-0000-000000215001")),
        ("1150-01", Guid.Parse("10000000-0000-0000-0000-000000115001")),
        ("1200", Guid.Parse("10000000-0000-0000-0000-000000001200")),
        ("5100", Guid.Parse("10000000-0000-0000-0000-000000005100")),
        ("5200", Guid.Parse("10000000-0000-0000-0000-000000005200")),
        ("5900", Guid.Parse("10000000-0000-0000-0000-000000005900")),
        ("1050", Guid.Parse("10000000-0000-0000-0000-000000001050")),
        ("1060", Guid.Parse("10000000-0000-0000-0000-000000001060")),
        ("2100", Guid.Parse("10000000-0000-0000-0000-000000002100")),
        ("4200", Guid.Parse("10000000-0000-0000-0000-000000004200")),
        ("5300", Guid.Parse("10000000-0000-0000-0000-000000005300")),
        ("5400", Guid.Parse("10000000-0000-0000-0000-000000005400")),
        ("6100", Guid.Parse("10000000-0000-0000-0000-000000006100")),
        ("6110", Guid.Parse("10000000-0000-0000-0000-000000006110")),
        ("2200", Guid.Parse("10000000-0000-0000-0000-000000002200")),
        ("6900", Guid.Parse("10000000-0000-0000-0000-000000006900"))
    ];

    private static Guid Id(string code) => Accounts.First(a => a.Code == code).Id;

    private static Mock<ILedgerAccountRepository> LedgerRepo()
    {
        var mock = new Mock<ILedgerAccountRepository>();
        foreach (var (code, id) in Accounts)
        {
            mock.Setup(r => r.GetByAccountCodeAsync(code))
                .ReturnsAsync(new LedgerAccount { Id = id, AccountCode = code });
        }
        return mock;
    }

    private static (Mock<IAccountingEntryRepository> Repo, List<AccountingEntry> Entries) EntrySink()
    {
        var entries = new List<AccountingEntry>();
        var mock = new Mock<IAccountingEntryRepository>();
        mock.Setup(r => r.Add(It.IsAny<AccountingEntry>()))
            .Callback<AccountingEntry>(entries.Add);
        return (mock, entries);
    }

    private static TaxAndLedger Gst(decimal percentage, string accountCode) => new()
    {
        TaxPercantage = percentage,
        LedgerAccount = new LedgerAccount { Id = Id(accountCode), AccountName = $"GST {accountCode}" }
    };

    private static Transaction Transaction(
        decimal subTotal,
        decimal discount = 0m,
        decimal roundOff = 0m,
        decimal total = 0m,
        string narration = "Sales Order",
        params TransactionItem[] items)
    {
        var transaction = new Transaction
        {
            Id = TxId,
            BranchId = BranchId,
            Narration = narration,
            ReferenceNumber = "SO-TEST-1",
            FinancialYearId = FyId,
            SubTotal = subTotal,
            DiscountAmount = discount,
            RoundOffAmount = roundOff,
            TotalAmount = total
        };
        foreach (var item in items)
        {
            transaction.TransactionItems.Add(item);
        }
        return transaction;
    }

    private static TransactionItem Item(
        decimal qty,
        decimal price,
        decimal purchasePrice,
        string discountType = "fixed",
        decimal discountPercentage = 0m,
        params Guid[] taxIds)
    {
        var item = new TransactionItem
        {
            Quantity = qty,
            UnitPrice = price,
            PurchasePrice = purchasePrice,
            DiscountType = discountType,
            DiscountPercentage = discountPercentage
        };
        foreach (var taxId in taxIds)
        {
            item.TransactionItemTaxes.Add(new TransactionItemTax { TaxId = taxId });
        }
        return item;
    }

    private static Mock<ITaxRepository> TaxRepo(params (Guid taxId, TaxAndLedger dto)[] taxes)
    {
        var mock = new Mock<ITaxRepository>();
        foreach (var (taxId, dto) in taxes)
        {
            mock.Setup(r => r.GetOutPutGstAccountAsync(taxId)).ReturnsAsync(dto);
            mock.Setup(r => r.GetInputGstAccountCodeAsync(taxId)).ReturnsAsync(dto);
        }
        return mock;
    }

    private static void AssertEntry(List<AccountingEntry> entries, Guid debit, Guid credit, decimal amount, EntryType type)
    {
        Assert.Contains(entries, e =>
            e.DebitLedgerAccountId == debit &&
            e.CreditLedgerAccountId == credit &&
            e.Amount == amount &&
            e.EntryType == type);
    }

    // --- SaleStrategy (WF-3.2 / WF-6.3) ---

    [Fact]
    public async Task SaleStrategy_GivenSale_ScenarioS1_PostsMainGstAndCogsEntries()
    {
        var (repo, entries) = EntrySink();
        var taxId = Guid.NewGuid();
        var strategy = new SaleStrategy(new AccountingEntryFactory(), repo.Object,
            new Mock<IProductRepository>().Object, new Mock<IProductStockRepository>().Object,
            LedgerRepo().Object, TaxRepo((taxId, Gst(17m, "2150-01"))).Object);

        await strategy.ProcessTransactionAsync(Transaction(200m, total: 234m, items: Item(2m, 100m, 60m, taxIds: taxId)));

        AssertEntry(entries, Id("1100"), Id("4100"), 200m, EntryType.Regular);
        AssertEntry(entries, Id("1100"), Id("2150-01"), 34m, EntryType.Tax);
        AssertEntry(entries, Id("5100"), Id("1200"), 120m, EntryType.Inventory);
        Assert.Equal(3, entries.Count);
    }

    [Fact]
    public async Task SaleStrategy_GivenFixedDiscount_DiscountEntryCreditsSalesNotAr()
    {
        // Gap-Char [ACC-03]: discount booked Dr Discount/Cr Sales — AR stays gross of discount.
        var (repo, entries) = EntrySink();
        var strategy = new SaleStrategy(new AccountingEntryFactory(), repo.Object,
            new Mock<IProductRepository>().Object, new Mock<IProductStockRepository>().Object,
            LedgerRepo().Object, TaxRepo().Object);

        await strategy.ProcessTransactionAsync(Transaction(200m, discount: 10m, items: Item(2m, 100m, 60m)));

        AssertEntry(entries, Id("5200"), Id("4100"), 10m, EntryType.Discount);
        Assert.DoesNotContain(entries, e => e.CreditLedgerAccountId == Id("1100") && e.EntryType == EntryType.Discount);
    }

    [Fact]
    public async Task SaleStrategy_GivenPositiveRoundOff_RoundOffDebitsAr()
    {
        var (repo, entries) = EntrySink();
        var strategy = new SaleStrategy(new AccountingEntryFactory(), repo.Object,
            new Mock<IProductRepository>().Object, new Mock<IProductStockRepository>().Object,
            LedgerRepo().Object, TaxRepo().Object);

        await strategy.ProcessTransactionAsync(Transaction(200m, roundOff: 0.30m, items: Item(2m, 100m, 60m)));

        AssertEntry(entries, Id("1100"), Id("5900"), 0.30m, EntryType.RoundOff);
    }

    // --- SaleReturnStrategy (WF-3.6 / WF-6.3) ---

    [Fact]
    public async Task SaleReturnStrategy_MirrorsSaleEntries()
    {
        var (repo, entries) = EntrySink();
        var taxId = Guid.NewGuid();
        var strategy = new SaleReturnStrategy(new AccountingEntryFactory(), repo.Object,
            new Mock<IProductRepository>().Object, LedgerRepo().Object, TaxRepo((taxId, Gst(17m, "2150-01"))).Object);

        await strategy.ProcessTransactionAsync(Transaction(200m, total: 234m, narration: "Sales Order item Return", items: Item(2m, 100m, 60m, taxIds: taxId)));

        AssertEntry(entries, Id("4100"), Id("1100"), 200m, EntryType.Regular);
        AssertEntry(entries, Id("2150-01"), Id("1100"), 34m, EntryType.Tax);
        AssertEntry(entries, Id("1200"), Id("5100"), 120m, EntryType.Inventory);
        Assert.Equal(3, entries.Count);
    }

    // --- PurchaseStrategy (WF-4.1 / WF-6.3) ---

    [Fact]
    public async Task PurchaseStrategy_PostsInventoryApAndInputGst()
    {
        var (repo, entries) = EntrySink();
        var taxId = Guid.NewGuid();
        var strategy = new PurchaseStrategy(new AccountingEntryFactory(), repo.Object, LedgerRepo().Object, TaxRepo((taxId, Gst(17m, "1150-01"))).Object);

        await strategy.ProcessTransactionAsync(Transaction(200m, total: 234m, narration: "Purchase Order", items: Item(2m, 100m, 60m, taxIds: taxId)));

        AssertEntry(entries, Id("1200"), Id("2100"), 200m, EntryType.Regular);
        AssertEntry(entries, Id("1150-01"), Id("2100"), 34m, EntryType.Tax);
        Assert.Equal(2, entries.Count);
    }

    [Fact]
    public async Task PurchaseStrategy_GivenDiscount_ReducesPayable()
    {
        var (repo, entries) = EntrySink();
        var strategy = new PurchaseStrategy(new AccountingEntryFactory(), repo.Object, LedgerRepo().Object, TaxRepo().Object);

        await strategy.ProcessTransactionAsync(Transaction(200m, discount: 10m, narration: "Purchase Order", items: Item(2m, 100m, 60m)));

        AssertEntry(entries, Id("2100"), Id("4200"), 10m, EntryType.Discount);
    }

    [Fact]
    public async Task PurchaseStrategy_GivenPositiveRoundOff_DebitsPayable()
    {
        var (repo, entries) = EntrySink();
        var strategy = new PurchaseStrategy(new AccountingEntryFactory(), repo.Object, LedgerRepo().Object, TaxRepo().Object);

        await strategy.ProcessTransactionAsync(Transaction(200m, roundOff: 0.50m, narration: "Purchase Order", items: Item(2m, 100m, 60m)));

        AssertEntry(entries, Id("2100"), Id("5900"), 0.50m, EntryType.RoundOff);
    }

    // --- PurchaseReturnStrategy (WF-4.5 / WF-6.3) ---

    [Fact]
    public async Task PurchaseReturnStrategy_MirrorsPurchaseEntries()
    {
        var (repo, entries) = EntrySink();
        var taxId = Guid.NewGuid();
        var strategy = new PurchaseReturnStrategy(new AccountingEntryFactory(), repo.Object, LedgerRepo().Object, TaxRepo((taxId, Gst(17m, "1150-01"))).Object);

        await strategy.ProcessTransactionAsync(Transaction(200m, total: 234m, narration: "Purchase Order item Return", items: Item(2m, 100m, 60m, taxIds: taxId)));

        AssertEntry(entries, Id("2100"), Id("1200"), 200m, EntryType.Regular);
        AssertEntry(entries, Id("2100"), Id("1150-01"), 34m, EntryType.Tax);
        Assert.Equal(2, entries.Count);
    }

    // --- StockAdjustmentStrategy (WF-5.1 / WF-6.3) ---

    [Fact]
    public async Task StockAdjustmentStrategy_Gain_DebitsInventoryCreditsAdjustment()
    {
        var (repo, entries) = EntrySink();
        var strategy = new StockAdjustmentStrategy(new AccountingEntryFactory(), repo.Object, LedgerRepo().Object, TaxRepo().Object);

        await strategy.ProcessTransactionAsync(Transaction(0m, total: 500m, narration: "Stock Adjustment - Gain on count"));

        AssertEntry(entries, Id("1200"), Id("5400"), 500m, EntryType.Regular);
        Assert.Single(entries);
    }

    [Fact]
    public async Task StockAdjustmentStrategy_Loss_DebitsAdjustmentCreditsInventory()
    {
        var (repo, entries) = EntrySink();
        var strategy = new StockAdjustmentStrategy(new AccountingEntryFactory(), repo.Object, LedgerRepo().Object, TaxRepo().Object);

        await strategy.ProcessTransactionAsync(Transaction(0m, total: 300m, narration: "Stock Adjustment - Loss on count"));

        AssertEntry(entries, Id("5400"), Id("1200"), 300m, EntryType.Regular);
        Assert.Single(entries);
    }

    [Fact]
    public async Task StockAdjustmentStrategy_SubstringDetection_AnyNarrationContainingGain_IsTreatedAsGain()
    {
        // Gap-Char [ACC-07]: gain/loss detected by narration substring — "Bagain" contains "gain".
        var (repo, entries) = EntrySink();
        var strategy = new StockAdjustmentStrategy(new AccountingEntryFactory(), repo.Object, LedgerRepo().Object, TaxRepo().Object);

        await strategy.ProcessTransactionAsync(Transaction(0m, total: 100m, narration: "Customer Bagain order correction"));

        AssertEntry(entries, Id("1200"), Id("5400"), 100m, EntryType.Regular);
    }

    // --- ExpenseStrategy (WF-6.3) ---

    [Fact]
    public async Task ExpenseStrategy_DebitsExpenseCreditsCash()
    {
        var (repo, entries) = EntrySink();
        var strategy = new ExpenseStrategy(new AccountingEntryFactory(), LedgerRepo().Object, repo.Object, TaxRepo().Object);

        await strategy.ProcessTransactionAsync(Transaction(500m, total: 500m, narration: "Rent", items: Item(1m, 500m, 0m)));

        AssertEntry(entries, Id("5300"), Id("1050"), 500m, EntryType.Regular);
        Assert.Single(entries);
    }

    [Fact]
    public async Task ExpenseStrategy_GstComputedOnWholeTransactionTotal_NotLineBase()
    {
        // Gap-Char [ACC-02 part 1]: tax base is transaction.TotalAmount, not the line total after discount.
        var (repo, entries) = EntrySink();
        var taxId = Guid.NewGuid();
        var strategy = new ExpenseStrategy(new AccountingEntryFactory(), LedgerRepo().Object, repo.Object, TaxRepo((taxId, Gst(17m, "1150-01"))).Object);

        // Line 500 with total 585: GST entry = 585 × 17% = 99.45 (line-based would be 85).
        await strategy.ProcessTransactionAsync(Transaction(500m, total: 585m, narration: "Utilities", items: Item(1m, 500m, 0m, taxIds: taxId)));

        AssertEntry(entries, Id("1150-01"), Id("1050"), 99.45m, EntryType.Tax);
    }

    [Fact]
    public async Task ExpenseStrategy_TwoTaxesOnSameAccount_OverwritesInsteadOfSumming()
    {
        // Gap-Char [ACC-02 part 2]: dictionary assignment (not +=) collapses multiple taxes on one account.
        var (repo, entries) = EntrySink();
        var tax1 = Guid.NewGuid();
        var tax2 = Guid.NewGuid();
        var strategy = new ExpenseStrategy(new AccountingEntryFactory(), LedgerRepo().Object, repo.Object,
            TaxRepo((tax1, Gst(17m, "1150-01")), (tax2, Gst(5m, "1150-01"))).Object);

        var item = new TransactionItem { Quantity = 1m, UnitPrice = 500m, PurchasePrice = 0m, DiscountType = "fixed" };
        item.TransactionItemTaxes.Add(new TransactionItemTax { TaxId = tax1 });
        item.TransactionItemTaxes.Add(new TransactionItemTax { TaxId = tax2 });

        await strategy.ProcessTransactionAsync(Transaction(500m, total: 610m, narration: "Expense multi-tax", items: item));

        // 5% entry overwrote the 17% entry: only TotalAmount×5% = 30.50 posted; the 103.70 from GST-17 is lost.
        AssertEntry(entries, Id("1150-01"), Id("1050"), 30.50m, EntryType.Tax);
        Assert.DoesNotContain(entries, e => e.Amount == 103.70m);
    }

    // --- FullPaymentStrategy (WF-3.7 / WF-6.4) ---

    [Fact]
    public async Task FullPaymentStrategy_CashSalePayment_DebitsCashCreditsAr()
    {
        var (repo, entries) = EntrySink();
        var paymentEntries = new List<PaymentEntry>();
        var paymentRepo = new Mock<IPaymentEntryRepository>();
        paymentRepo.Setup(r => r.Add(It.IsAny<PaymentEntry>()))
            .Callback<PaymentEntry>(paymentEntries.Add);

        var strategy = new FullPaymentStrategy(new AccountingEntryFactory(), repo.Object, LedgerRepo().Object, paymentRepo.Object);

        var transaction = Transaction(200m, total: 234m, items: Item(2m, 100m, 60m));
        var payment = new PaymentDto { Amount = 234m, PaymentMethod = ACCPaymentMethod.Cash, OrderNumber = "SO-TEST-1", TransactionType = TransactionType.Sale };

        await strategy.ProcessPaymentAsync(transaction, payment);

        AssertEntry(entries, Id("1050"), Id("1100"), 234m, EntryType.Regular);
        Assert.Equal(234m, paymentEntries.Single().Amount);
    }

    [Fact]
    public async Task FullPaymentStrategy_CardSalePayment_DebitsBank()
    {
        var (repo, entries) = EntrySink();
        var strategy = new FullPaymentStrategy(new AccountingEntryFactory(), repo.Object, LedgerRepo().Object, new Mock<IPaymentEntryRepository>().Object);

        var transaction = Transaction(200m, total: 234m, items: Item(2m, 100m, 60m));
        var payment = new PaymentDto { Amount = 234m, PaymentMethod = ACCPaymentMethod.CreditCard, OrderNumber = "SO-TEST-1", TransactionType = TransactionType.Sale };

        await strategy.ProcessPaymentAsync(transaction, payment);

        AssertEntry(entries, Id("1060"), Id("1100"), 234m, EntryType.Regular);
    }

    // --- PayrollStrategy (WF-6.3) ---

    [Fact]
    public async Task PayrollStrategy_SalaryAndBonus_PostExpenseEntriesAndNetPayment()
    {
        var (repo, entries) = EntrySink();
        var strategy = new PayrollStrategy(new AccountingEntryFactory(), repo.Object, LedgerRepo().Object);

        var payroll = new Payroll
        {
            Id = Guid.NewGuid(),
            BranchId = BranchId,
            FinancialYearId = FyId,
            BasicSalary = 1000m,
            Bonus = 100m,
            PaymentMode = PaymentMode.CASH
        };

        await strategy.ProcessPayrollAsync(payroll, TxId);

        AssertEntry(entries, Id("6100"), Id("2200"), 1000m, EntryType.Salary);
        AssertEntry(entries, Id("6110"), Id("2200"), 100m, EntryType.Salary);
        AssertEntry(entries, Id("2200"), Id("1050"), 1100m, EntryType.Salary);
        Assert.Equal(3, entries.Count);
    }

    // --- LoanStrategy (WF-6.3) ---

    [Fact]
    public async Task LoanStrategy_InterestRepayment_PostsLoanAmount_NotInterestAmount()
    {
        // Gap-Char [ACC-01]: interest leg uses loanDetail.LoanAmount instead of loanRepayment.InterestAmount.
        var (repo, entries) = EntrySink();
        var strategy = new LoanStrategy(new AccountingEntryFactory(), repo.Object, LedgerRepo().Object);

        var loanDetail = new LoanDetail
        {
            Id = Guid.NewGuid(),
            BranchId = BranchId,
            LoanAccountId = Id("2100"),
            LoanAccountInterestExpenseId = Id("6900"),
            LoanAmount = 10000m,
            Narration = "Loan repayment"
        };
        var transaction = Transaction(0m, narration: "Loan", items: Array.Empty<TransactionItem>());
        var repayment = new LoanRepayment { PricipalAmount = 0m, InterestAmount = 100m };

        await strategy.ProcessPaymentOfLoanAsync(loanDetail, transaction, repayment);

        // Current (buggy) behavior: amount = 10000 (LoanAmount). Post-fix target: 100 (InterestAmount).
        AssertEntry(entries, Id("6900"), Id("1060"), 10000m, EntryType.Loan);
    }

    [Fact]
    public async Task LoanStrategy_PrincipalRepayment_DebitsLoanAccountCreditsBank()
    {
        var (repo, entries) = EntrySink();
        var strategy = new LoanStrategy(new AccountingEntryFactory(), repo.Object, LedgerRepo().Object);

        var loanDetail = new LoanDetail
        {
            Id = Guid.NewGuid(),
            BranchId = BranchId,
            LoanAccountId = Id("2100"),
            LoanAccountInterestExpenseId = Id("6900"),
            LoanAmount = 10000m,
            Narration = "Loan repayment"
        };
        var transaction = Transaction(0m, narration: "Loan", items: Array.Empty<TransactionItem>());
        var repayment = new LoanRepayment { PricipalAmount = 2000m, InterestAmount = 0m };

        await strategy.ProcessPaymentOfLoanAsync(loanDetail, transaction, repayment);

        AssertEntry(entries, Id("2100"), Id("1060"), 2000m, EntryType.Loan);
        Assert.Single(entries);
    }
}

