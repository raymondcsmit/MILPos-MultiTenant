export interface CustomerLadger {
  id?: string;
  date: Date;
  accountId: string;
  accountName: string;
  customerId?: string;
  customerName: string;
  locationId: string;
  locationName: string;
  description: string;
  amount: number;
  balance: number;
  overdue: number;
  reference: string;
  note?: string;
}
