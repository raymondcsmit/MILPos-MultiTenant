import { DamagedStockItem } from './damaged-stock-item';

export interface DamagedStock {
  id?: string;
  locationId: string;
  damagedDate: Date;
  reason: string;
  reportedId: string;
  damagedStockItems: DamagedStockItem[];   
}
