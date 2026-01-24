import { AccountGroup, AccountType } from "../account-enum";

export interface LedgerAccount {
  id: string;
  accountCode: string;
  accountName: string;
  accountType: AccountType;
  accountGroup: AccountGroup;
  parentAccountId?: string;
  openingBalance?: number;
  isActive?: boolean;
  isSystem: boolean;
}

export type LedgerAccountsDictionary = {
  [key: string]: LedgerAccount[]; // key = AccountType
};

export interface LedgerAccountsWithAssetType {
  accountType: AccountType;
  items: LedgerAccount[];
}
