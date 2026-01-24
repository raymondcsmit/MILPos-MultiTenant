import { PaymentStatus } from "./paymentaStatus";
import { PurchaseOrder } from "./purchase-order";

export class PurchaseOrderPayment {
  id?: string;
  purchaseOrderId?: number;
  orderNumber?: string;
  purchaseOrder?: PurchaseOrder;
  paymentDate?: Date;
  referenceNumber?: string;
  amount?: number;
  //PaymentMethod PaymentMethod { get; set; }
  note?: string;
  attachmentUrl?: string;
  attachmentData?: string;
  paymentMethod?: string;
  paymentType?: number;
}

export interface PaymentType {
  id: number;
  name: string;
}

export const paymentTypes: PaymentType[] = [
  {
    id: 0,
    name: 'Credit',
  },
  {
    id: 1,
    name: 'Refund',
  }
];
