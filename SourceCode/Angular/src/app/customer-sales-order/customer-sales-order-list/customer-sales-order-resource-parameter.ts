import { ResourceParameter } from "@core/domain-classes/resource-parameter";

export class CustomerSalesOrderResourceParameter extends ResourceParameter {
  customerId?: string;
  orderNumber!: string;
  customerName!: string;
  soCreatedDate?: Date | null;
  fromDate?: Date | null;
  toDate?: Date | null;
  paymentStatus?: string;
}
