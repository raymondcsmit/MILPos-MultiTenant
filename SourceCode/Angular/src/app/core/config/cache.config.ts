export const CACHE_CONFIG = {
  driver: 'indexedDB',
  ttl: {
    lookups: 24 * 60 * 60 * 1000, // 24 hours
    products: 60 * 60 * 1000,     // 1 hour
  },
  whitelist: [
    '/UnitConversation',
    '/Tax',
    '/Brand',
    '/ProductCategory',
    '/ExpenseCategory',
    '/InquiryStatus',
    '/InquirySource',
    '/Role',
    '/PurchaseOrderPayment/payment-method',
    '/Country',
    '/LedgerAccount'
  ],
  masterDataKeys: {
      products: 'ALL_PRODUCTS',
      suppliers: 'ALL_SUPPLIERS',
      customers: 'ALL_CUSTOMERS'
  }
};
