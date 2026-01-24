import { ProductTax } from './product-tax';
import { Unit } from './unit';
import { UnitConversation } from './unit-conversation';

export interface Product {
  id?: string;
  name: string;
  categoryId: string;
  code?: string;
  barcode?: string;
  skuCode?: string;
  skuName?: string;
  description?: string;
  productUrl?: string;
  unitId: string;
  purchasePrice?: number;
  salesPrice?: number;
  mrp?: number;
  productUrlData?: string;
  isProductImageUpload?: boolean;
  productTaxes?: ProductTax[];
  unit?: UnitConversation;
  categoryName?: string;
  unitName?: string;
  hasVariant?: boolean;
  variantId?: string;
  variantItemId?: string;
  productVariants?: Product[];
  productTaxIds?: string[];
  alertQuantity?: number;
  margin?: number;
  isMarginIncludeTax?: boolean;
  taxAmount?: number;
  brandId?: string;
}
