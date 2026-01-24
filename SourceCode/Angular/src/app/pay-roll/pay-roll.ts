import { PaymentMode } from '../accounting/account-enum';

export interface PayRoll {
  id?: string;
  employeeId: string;
  branchId: string;
  salaryMonth: number;
  mobileBill: number;
  foodBill: number;
  bonus: number;
  commission: number;
  festivalBonus: number;
  travelAllowance: number;
  others: number;
  basicSalary: number;
  advance: number;
  totalSalary: number;
  paymentMode: PaymentMode;
  chequeNo: string;
  salaryDate: string | null;
  note: string;
  attachment: string;
  financialYearId: string;
}
