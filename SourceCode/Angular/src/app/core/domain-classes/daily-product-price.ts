export interface DailyProductPrice {
  id?: string;
  productId: string;
  productName?: string;
  productCode?: string;
  categoryName?: string;
  brandName?: string;
  priceDate: Date | string;
  salesPrice: number;
  mrp?: number;
  baseSalesPrice?: number;
  previousDayPrice?: number;
  isActive: boolean;
  status?: string; // 'Updated' | 'Pending' | 'Unchanged'
  imagePath?: string;
  unitName?: string;
}
