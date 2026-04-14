import { DailyProductPrice } from './daily-product-price';
import { DailyPriceSummary } from './daily-price-summary';

export interface DailyPriceList {
  priceDate: Date | string;
  prices: DailyProductPrice[];
  summary: DailyPriceSummary;
}
