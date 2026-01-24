export interface PurchaseSummary {
    transactionCount: number;
    grossPurchase: number;
    discounts: number;
    netPurchase: number;
    purchasedItemsCount: number;
    itemsReturn: number;
    averagePurchase: number;
    taxableAmount: number;
    totalTax: number;
}