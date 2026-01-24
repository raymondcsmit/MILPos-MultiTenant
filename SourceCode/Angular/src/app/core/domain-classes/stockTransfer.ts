import { BusinessLocation } from "./business-location";
import { StockTransferItem } from "./stockTransferItem";

export interface StockTransfer {
  id?: string;
  referenceNo: string;
  status?: number;
  fromLocation?: BusinessLocation;
  fromLocationId?: string;
  toLocation?: BusinessLocation;
  toLocationId?: string;
  totalShippingCharge?: number;
  totalAmount: number;
  notes?: string;
  transferDate: Date;
  stockTransferItems: StockTransferItem[];
}


