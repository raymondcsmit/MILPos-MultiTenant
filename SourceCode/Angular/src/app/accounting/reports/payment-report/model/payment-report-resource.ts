import { ResourceParameter } from "@core/domain-classes/resource-parameter";
import { expand } from "rxjs";

export interface PaymentReportResource extends ResourceParameter {
    transactionNumber: string;
    amount: number | null;
    paymentFromDate: Date | null;
    paymentToDate: Date | null;
    financialYearId?: string | null;
    branchId?: string | null;
}