import { Tax } from "./tax";

export interface PurchaseOrderItemTax {
  id?: string;
  purchaseOrderItemId?: string;
  taxId?: string;
  taxValue?: number;
  tax?: Tax;
  taxName?: string;
  taxPercentage?: number;
}
