export interface Loan {
    id?: string;
    accountName: string;
    loanAmount: number;
    loanNumber: string;
    lenderName: string;
    loanDate: Date;
    branch: string;
    totalPaidPricipalAmount?: number;
    totalPaidInterestAmount?: number;
}