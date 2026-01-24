import { ResourceParameter } from './resource-parameter';
import { SalesOrderStatusEnum } from './sales-order-status';

export class SalesOrderResourceParameter extends ResourceParameter {
  orderNumber?: string = '';
  customerName?: string = '';
  soCreatedDate?: Date | null;
  customerId?: string = '';
  fromDate?: Date | null;
  toDate?: Date | null;
  productId?: string;
  isSalesOrderRequest: boolean = false;
  status?: SalesOrderStatusEnum = SalesOrderStatusEnum.All;
  productName?: string;
  locationId?: string = '';
  deliveryStatus?: string | null;
  paymentStatus?: string | null;

}
