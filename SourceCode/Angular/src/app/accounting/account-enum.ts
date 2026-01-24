export enum TransactionType {
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
  PayRoll = 12,
  LoanPayable = 13,
  LoanRepayment = 14,
  DirectEntry = 15,
  StockTransferToBranch = 16,
  StockTransferFromBranch = 17
}

export enum TransactionStatus {
  Pending = 1,
  Completed = 2,
  Cancelled = 3,
  Reversed = 4,
}

export enum ACCPaymentStatus {
  Pending = 1,
  Partial = 2,
  Completed = 3,
  Overdue = 4,
  Cancelled = 5,
}

export enum AccountType {
  Asset = 1,
  Liability = 2,
  Equity = 3,
  Income = 4,
  Expense = 5,
}

export enum AccountGroup {
  CurrentAsset = 1,
  FixedAsset = 2,
  CurrentLiability = 3,
  LongTermLiability = 4,
  Capital = 5,
  Revenue = 6,
  DirectExpense = 7,
  IndirectExpense = 8,
}

export enum PaymentMode {
  CASH = 1,
  BANK = 2,
}
