export interface DailyPriceUpdateDto {
  productId: string;
  salesPrice: number;
  mrp?: number;
  isActive: boolean;
}

export interface UpdateDailyPriceListCommand {
  priceDate: Date | string;
  prices: DailyPriceUpdateDto[];
}
