import { AccountType, TransactionType } from "../../account-enum";

export interface GeneralEntry {
  transactionNumber: string;
  transactionType: TransactionType;
  accountCode: string;
  accountName: string;
  debitAmount: number;
  creditAmount: number;
  accountType: AccountType;
  createdDate: Date;
}

export interface GeneralEntryModel {
  branchId: string;
  transitionDate: Date;
  narration: string;
  debitLedgerAccountId: string;
  amount: number;
  creditLedgerAccountId: string;
  referenceNumber: string;
}