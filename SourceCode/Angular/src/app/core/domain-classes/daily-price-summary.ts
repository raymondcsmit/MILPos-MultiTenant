export interface DailyPriceSummary {
  totalProducts: number;
  updatedCount: number;
  pendingCount: number;
  unchangedCount: number;
  totalVariance?: number;
  maxPriceIncrease?: number;
  maxPriceDecrease?: number;
}
