export interface CustomerLadgerHistory {
    id: string;
    reference: string;
    accountId: string;
    customerId?: string;
    accountName: string;
    amount: number;
    note?: string;
    description: string;
    balance: number;
    overdue: number;
    date?: Date;
    isCustomer: boolean;
}


