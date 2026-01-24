import { DamagedStockItem } from './damaged-stock-item';

export interface DailyStock {
  id?: string;
  productId: string;
  locationId: string;
  dailyStockDate: Date;
  lastUpdatDate: Date;
  openingStock: number;
  closingStock: number;
  quantitySold: number;
  quantityPurchased: number;
  quantityDamaged: number;
  quantitySoldReturned: number;
  quantityPurchasedReturned: number;
  quantityAdjusted: number;
  quantityToTransfter: number;
  quantityFromTransfter: number;
}
