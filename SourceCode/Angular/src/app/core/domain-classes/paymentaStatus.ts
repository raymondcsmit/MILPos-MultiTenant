export class PaymentStatus {
  id!: number;
  name!: string;
}

export enum PaymentStatusEnum {
  Paid = 0,
  Pending = 1,
  Partial = 2,
}

export const paymentStatuses: PaymentStatus[] = [
  {
    id: 0,
    name: 'Paid',
  },
  {
    id: 1,
    name: 'Pending',
  },
  {
    id: 2,
    name: 'Partial',
  },
];
