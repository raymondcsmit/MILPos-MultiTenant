import { ResourceParameter } from "@core/domain-classes/resource-parameter";

export class TransactionResourceParameter extends ResourceParameter {
  fromDate?: Date | null;
  toDate?: Date | null;
  transactionNumber?: string = '';
  referenceNumber?: string = '';
  paymentStatus?: string;
  status?: string;
  transactionType?: string;
  branchId?: string = '';
}
