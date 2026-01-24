import { ResourceParameter } from './resource-parameter';

export class DailyStockReportResourceParameter extends ResourceParameter {
  id?: string = '';
  locationId?: string = '';
  dailyStockDate?: Date | null;
  productId?: string = '';
}
