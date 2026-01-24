import { PurchaseOrderStatusEnum } from './purchase-order-status';
import { ResourceParameter } from './resource-parameter';

export class PurchaseOrderResourceParameter extends ResourceParameter {
  orderNumber?: string = '';
  supplierName?: string = '';
  poCreatedDate?: Date | null;
  supplierId?: string = '';
  isPurchaseOrderRequest: boolean = false;
  fromDate?: Date | null;
  toDate?: Date | null;
  productId?: string = '';
  productName?: string = '';
  status?: PurchaseOrderStatusEnum = PurchaseOrderStatusEnum.All;
  locationId?: string = '';
  paymentStatus?: string;
  deliveryStatus?: string;
}
