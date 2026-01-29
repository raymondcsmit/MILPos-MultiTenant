export interface InventoryBatch {
  id: string;
  batchNumber: string;
  expiryDate?: Date;
  quantity: number;
  purchasePrice: number;
  salesPrice: number;
  productId: string;
  locationId: string;
}
