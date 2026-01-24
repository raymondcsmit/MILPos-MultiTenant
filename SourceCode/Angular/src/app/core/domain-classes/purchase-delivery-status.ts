export interface PurchaseDeliveryStatus {
  id: number;
  name: string;
}

export enum PurchaseDeliveryStatusEnum {
  Pending = 0,
  Received = 1,
}

export const purchaseDeliveryStatuses: PurchaseDeliveryStatus[] = [
  {
    id: 0,
    name: 'PENDING',
  },
  {
    id: 1,
    name: 'RECEIVED',
  },
];
