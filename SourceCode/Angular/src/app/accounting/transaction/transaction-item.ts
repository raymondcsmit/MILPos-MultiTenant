export interface TransactionItem {
    id?: string;
    productName: string;
    transactionId: string;
    inventoryItemId: string;
    quantity: number;
    unitPrice: number;
    discountPercentage: number;
    discountAmount: number;
    taxPercentage: number;
    taxAmount: number;
    lineTotal: number;
    unitId: string;
}