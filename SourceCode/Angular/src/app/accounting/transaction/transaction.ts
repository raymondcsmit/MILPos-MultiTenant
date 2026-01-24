import { BusinessLocation } from "@core/domain-classes/business-location";
import { ACCPaymentStatus, TransactionStatus, TransactionType } from "../account-enum";

export interface Transaction {
  id?: string;
  transactionNumber: string;
  transactionType: TransactionType;
  branchId: string;
  branchName: string;
  transactionDate: Date;
  subTotal: number;
  discountAmount: number;
  taxAmount: number;
  roundOffAmount: number;
  totalAmount: number;
  narration: string;
  referenceNumber: string;
  status: TransactionStatus;
  paymentStatus: ACCPaymentStatus;
  paidAmount: number;
  balanceAmount: number;
  branch: BusinessLocation; 
}
