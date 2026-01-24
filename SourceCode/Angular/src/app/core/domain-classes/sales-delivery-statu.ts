export interface SalesDeliveryStatus {
  id: number;
  name: string;
}

export enum SalesDeliveryStatusEnum {
  Delivered = 0,
  Pending = 1,
}


export const salesDeliveryStatuses: SalesDeliveryStatus[] = [
  {
    id: 0,
    name: 'DELIVERED',
  },
  {
    id: 1,
    name: 'PENDING',
  },
];
