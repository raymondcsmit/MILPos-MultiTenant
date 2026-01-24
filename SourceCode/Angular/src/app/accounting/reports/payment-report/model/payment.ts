export interface PaymentReportModel {
    id?: string;
    transactionNumber: string;
    referenceNumber: string;
    paymentDate: Date;
    paymentMethod: string;
    amount: number;
    narration: string;
    branchName: string;
}