namespace POS.Data.Entities.Accounts;
public enum TransactionStatus
{
    Pending = 1,
    Completed = 2,
    Cancelled = 3,
    Reversed = 4
}

public enum EntryType
{
    Regular = 1,
    Tax = 2,
    Discount = 3,
    RoundOff = 4,
    Inventory = 5,
    OpeningBalance = 6,
    YearEndClosing = 7,
    Salary = 8,
    Loan = 9
}

public enum TaxType
{
    Input = 1,
    Output = 2
}

public enum StockAdjustmentType
{
    Gain = 1,
    Loss = 2,
    Transfer = 3,
    Revaluation = 4
}
public enum TransactionType
{
    Purchase = 1,
    PurchaseReturn = 2,
    Sale = 3,
    SaleReturn = 4,
    Expense = 5,
    StockAdjustment = 6,
    Payment = 7,
    Receipt = 8,
    StockTransfer = 9,
    YearEndClosing = 10,
    OpeningBalance = 11,
    Payroll = 12,
    LoanPayable = 13,
    LoanRepayment = 14,
    DirectEntry = 15,
    StockTransferToBranch = 16,
    StockTransferFromBranch = 17
}

public enum AccountType
{
    Asset = 1,
    Liability = 2,
    Equity = 3,
    Income = 4,
    Expense = 5
}

public enum AccountGroup
{
    CurrentAsset = 1,
    FixedAsset = 2,
    CurrentLiability = 3,
    LongTermLiability = 4,
    Capital = 5,
    Revenue = 6,
    DirectExpense = 7,
    IndirectExpense = 8
}


public enum ACCPaymentMethod
{
    Cash = 1,
    DebitCard = 2,
    CreditCard = 3,
    UPI = 4,
    NetBanking = 5,
    Cheque = 6,
    Credit = 7
}
public enum ACCPaymentStatus
{
    Pending = 1,
    Partial = 2,
    Completed = 3,
    Overdue = 4,
    Cancelled = 5
}
public enum PaymentMode
{
    CASH = 1,
    BANK = 2
}
