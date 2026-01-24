export interface OpeningBalanceModel {
    id: string;
    financialYearId: string;
    locationId: string;
    accountId: string;
    openingBalance: number;
    type: number; // 1=Debit, 2=Credi
}