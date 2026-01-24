export interface CashFlow {
  totalCashRecived: number;
  totalCashPaid: number;
  netTotalMovement: number;
  cashFlowAccounts: CashFlowAccount[];
}

export interface CashFlowAccount {
  accountName: string;
  debitAmount: number;
  creditAmount: number;
  netTotalMovement: number;
}
