import { ResourceParameter } from './resource-parameter';

export class DamagedStockResourceParameter extends ResourceParameter {
  id?: string = '';
  locationId?: string = '';
  damagedDate?: Date | null;
  productId?: string = '';
}
