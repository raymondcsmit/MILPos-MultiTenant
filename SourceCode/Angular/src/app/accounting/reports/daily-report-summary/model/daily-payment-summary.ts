export interface PaymentSummary {
    cashReceived: number;
    bankReceived: number;
    totalCollected: number;
    cashGiven: number;
    bankGiven: number;
    totalGiven: number;
    netCash: number;
    netBank: number;
    netTotal: number;
}