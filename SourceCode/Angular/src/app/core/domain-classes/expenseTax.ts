import { Tax } from "./tax";

export interface ExpenseTax {
  id?: string;
  expenseId?: string;
  taxId: string;
  taxValue?: number;
  tax?: Tax
  taxName?: string;
}
