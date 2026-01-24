import { ExpenseCategory } from "./expense-category";
import { ExpenseTax } from "./expenseTax";
import { User } from "./user";

export class Expense {
  id!: string;
  reference!: string;
  expenseCategoryId!: string;
  amount!: number;
  expenseById!: string;
  description!: string;
  receiptName!: string;
  expenseDate?: Date;
  expenseBy?: User;
  expenseCategory!: ExpenseCategory;
  expenseTaxIds?: string[];
  expenseTaxes?: ExpenseTax[];
  totalTax?: number;
}
