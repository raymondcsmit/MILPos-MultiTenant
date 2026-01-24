import { ResourceParameter } from '@core/domain-classes/resource-parameter';

export class CustomerLadgerResourceParameter extends ResourceParameter {
  accountDate?: Date | null;
  accountId!: string;
  customerId!: string;
  reference!: string;
  locationId!: string;
}
