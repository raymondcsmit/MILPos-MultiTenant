export interface LoanPayment {
    id?: string;
    loanDetailId: string;
    loanDetailName: string;
    principalAmount: number;
    interestAmount: number;
    paymentDate: Date;
    notes: string;
}