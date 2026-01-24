import { ResourceParameter } from "@core/domain-classes/resource-parameter";

export class GeneralEntryResourceParameter extends ResourceParameter {
  transactionNumber?: string = '';
  branchId?: string;
  financialYearId?: string;
  fromDate?: Date | null;
  toDate?: Date | null;
}
