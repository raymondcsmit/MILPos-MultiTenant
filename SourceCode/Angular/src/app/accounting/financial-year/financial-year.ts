export interface FinancialYear{
    id? : string;
    startDate: Date;
    endDate: Date;
    isClosed: boolean;
    closedDate?: Date;
    closedByName?: string;
}