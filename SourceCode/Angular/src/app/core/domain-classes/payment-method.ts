export class PaymentMethod {
  id!: number;
  name!: string;
}

export const paymentMethods: PaymentMethod[] = [
  {
    id: 1,
    name: 'CASH'
  }, {
    id: 2,
    name: 'DEBIT_CARD'
  }, {
    id: 3,
    name: 'CREDIT_CARD'
  }, {
    id: 4,
    name: 'UPI'
  }, {
    id: 5,
    name: 'NET_BANKING'
  }, {
    id: 6,
    name: 'CHEQUE'
  }, {
    id: 7,
    name: 'CREDIT_PAY_LATER'
  }
];
