import { PaymentStatus } from "@core/domain-classes/paymentaStatus";

export interface CustomerSalesOrder{
    customerId: string,
    customerName: string,
    totalPendingAmount: number
    paymentStatus: PaymentStatus
}