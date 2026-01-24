import { AccountGroup } from "../../account-enum";

export interface BalanceSheetReport {
  totalAssets: number;
  totalLiabilities: number;
  totalEquity: number;
  assets: AccountBalance[];
  liabilities: AccountBalance[];
  equity: AccountBalance[];
}

export interface AccountBalance {
  accountCode: string;
  accountName: string;
  group: AccountGroup;
  balance: number;
}
