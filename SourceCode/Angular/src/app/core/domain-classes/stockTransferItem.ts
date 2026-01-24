import { Product } from "./product";

export interface StockTransferItem {
  id?: string;
  productId: string;
  quantity: number;
  unitPrice: number;
  shippingCharge?: number;
  subTotal: number;
  stockTransferId?: string;
  product?: Product;
  productName?: string;
  unitId?: string;
  unitName?: string;
}
