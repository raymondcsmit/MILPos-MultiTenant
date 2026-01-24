import { Tax } from "./tax";

export interface SalesOrderItemTax {
    id?: string;
    salesOrderItemId?: string;
    taxId: string;
    taxValue?: number;
    tax?: Tax;
    taxName?: string;
    taxPercentage?: number;
}
