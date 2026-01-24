import { ResourceParameter } from '@core/domain-classes/resource-parameter';

export class PayRollResourceParameter extends ResourceParameter {
  fromDate?: Date | null;
  toDate?: Date | null;
  employeeId?: string = '';
  branchId?: string = '';
  salaryMonth?: string = '';
  paymentMode?: string= '';
}
