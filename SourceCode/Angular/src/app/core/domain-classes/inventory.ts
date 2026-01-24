import { ProductTax } from "./product-tax";

export interface Inventory {
  id?: string;
  productId?: string;
  currentStock: number;
  pricePerUnit: number;
  productName: string;
  unitName: string;
  averagePurchasePrice: number;
  averageSalesPrice: number;
  unitId: string;
  locationId: string;
  type: string;
  productTaxes?: ProductTax[];
  taxIds?: string[];
}
