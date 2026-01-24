import { TableSettingJson } from "@core/domain-classes/table-setting-json";

export const PurchaseOrderTableSettings: TableSettingJson[] = [
  {
    key: 'action',
    header: 'ACTION',
    width: 100,
    type: 'text',
    isVisible: true,
    orderNumber: 1,
    allowSort: false
  },
  {
    key: 'poCreatedDate',
    header: 'ORDER_DATE',
    width: 100,
    type: 'datetime',
    isVisible: true,
    orderNumber: 2,
    allowSort: true
  },
  {
    key: 'orderNumber',
    header: 'ORDER_NUMBER',
    width: 200,
    type: 'text',
    isVisible: true,
    orderNumber: 3,
    allowSort: true
  }, {
    key: 'deliveryStatus',
    header: 'DELIVERY_STATUS',
    width: 150,
    type: 'text',
    isVisible: true,
    orderNumber: 4,
    allowSort: true
  }
  , {
    key: 'paymentStatus',
    header: 'PURCHASE_STATUS',
    width: 120,
    type: 'text',
    isVisible: true,
    orderNumber: 5,
    allowSort: true
  }, {
    key: 'businessLocation',
    header: 'BUSINESS_LOCATION',
    width: 120,
    type: 'text',
    isVisible: true,
    orderNumber: 6,
    allowSort: true
  }, {
    key: 'supplierName',
    header: 'SUPPLIER_NAME',
    width: 120,
    type: 'text',
    isVisible: true,
    orderNumber: 7,
    allowSort: true
  }, {
    key: 'totalDiscount',
    header: 'TOTAL_DISCOUNT',
    width: 120,
    type: 'currency',
    isVisible: true,
    orderNumber: 8,
    allowSort: true
  }, {
    key: 'totalTax',
    header: 'TOTAL_TAX',
    width: 120,
    type: 'currency',
    isVisible: true,
    orderNumber: 9,
    allowSort: true
  },
  {
    key: 'totalItemQuantities',
    header: 'TOTAL_QUANTITIES',
    width: 120,
    type: 'number',
    isVisible: true,
    orderNumber: 10,
    allowSort: false
  }
  , {
    key: 'totalAmount',
    header: 'TOTAL_AMOUNT',
    width: 120,
    type: 'currency',
    isVisible: true,
    orderNumber: 11,
    allowSort: true
  }, {
    key: 'totalPaidAmount',
    header: 'TOTAL_PAID_AMOUNT',
    width: 120,
    type: 'currency',
    isVisible: true,
    orderNumber: 12,
    allowSort: true
  }, {
    key: 'totalRefundAmount',
    header: 'TOTAL_REFUND',
    width: 120,
    type: 'currency',
    isVisible: true,
    orderNumber: 13,
    allowSort: true
  }, {
    key: 'deliveryDate',
    header: 'DELIVERY_DATE',
    width: 120,
    type: 'datetime',
    isVisible: true,
    orderNumber: 14,
    allowSort: true
  }, {
    key: 'modifiedDate',
    header: 'LAST_MODIFIED_AT',
    width: 120,
    type: 'datetime',
    isVisible: true,
    orderNumber: 15,
    allowSort: true
  }, {
    key: 'createdByName',
    header: 'CREATED_BY',
    width: 120,
    type: 'text',
    isVisible: true,
    orderNumber: 16,
    allowSort: true
  }, {
    key: 'returnItemCount',
    header: 'RETURN_ITEMS_COUNT',
    width: 120,
    type: 'number',
    isVisible: true,
    orderNumber: 17,
    allowSort: false
  }
  , {
    key: 'returnItemPrice',
    header: 'RETURN_ITEMS_PRICE',
    width: 120,
    type: 'currency',
    isVisible: true,
    orderNumber: 18,
    allowSort: false
  }
  , {
    key: 'status',
    header: 'IS_RETURN',
    width: 120,
    type: 'text',
    isVisible: true,
    orderNumber: 19,
    allowSort: true
  }
];
