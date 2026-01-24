export interface TrialBalance {
  creditTotalAmount: number;
  debitTotalAmount: number;
  trialBalanceAccounts: TrialBalanceAccount[];
}

export interface TrialBalanceAccount {
  accountName: string;
  debitAmount: number;
  creditAmount: number;
}
