import { PaymentStatus } from '@core/domain-classes/paymentaStatus';

export interface CustomerSalesOrderPayment {
  id: string;
  orderNumber: string;
  soCreatedDate: Date;
  totalAmount: number;
  totalTax: number;
  totalDiscount: number;
  toalPaidAmount: number;
  remainingAmount: number;
  paymentStatus: PaymentStatus;
}
